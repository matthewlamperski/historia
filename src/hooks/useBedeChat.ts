import { useCallback, useEffect, useRef, useState } from 'react';
import { BedeMessage } from '../types';
import { bedeService, BedeLimitError } from '../services/bedeService';
import { useAuthStore } from '../store/authStore';

export interface UseBedeChatReturn {
  messages: BedeMessage[];
  isSending: boolean;
  /** Most recent server-reported remaining message count, or null if unknown. */
  remainingToday: number | null;
  dailyLimit: number | null;
  isPremium: boolean | null;
  limitReached: boolean;
  limitMessage: string | null;
  send: (text: string) => Promise<void>;
}

/**
 * Manages a single landmark's Bede conversation. Subscribes to Firestore for
 * real-time updates and routes sends through `bedeService.sendMessage` (which
 * hits the Cloud Function and persists both sides server-side).
 *
 * The hook does NOT optimistically render the user's own message — the server
 * writes it to Firestore before calling Gemini, so the listener echoes it
 * back almost immediately. That avoids local/remote dedup complexity.
 */
export const useBedeChat = (landmarkId: string | null | undefined): UseBedeChatReturn => {
  const { user } = useAuthStore();
  const userId = user?.id ?? '';

  const [messages, setMessages] = useState<BedeMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [remainingToday, setRemainingToday] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  const landmarkIdRef = useRef(landmarkId);
  landmarkIdRef.current = landmarkId;

  // Live subscription to the conversation doc
  useEffect(() => {
    if (!userId || !landmarkId) {
      setMessages([]);
      return;
    }
    const unsubscribe = bedeService.subscribeToConversation(userId, landmarkId, setMessages);
    return unsubscribe;
  }, [userId, landmarkId]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !landmarkIdRef.current || isSending) return;
      setIsSending(true);
      setLimitMessage(null);
      try {
        const res = await bedeService.sendMessage(landmarkIdRef.current, trimmed);
        setRemainingToday(res.remainingToday);
        setDailyLimit(res.dailyLimit);
        setIsPremium(res.isPremium);
        setLimitReached(res.remainingToday !== null && res.remainingToday <= 0);
      } catch (err) {
        console.log("ERROR: ", err);
        if (err instanceof BedeLimitError) {
          setDailyLimit(err.dailyLimit);
          setIsPremium(err.isPremium);
          setRemainingToday(0);
          setLimitReached(true);
          setLimitMessage(err.message);
        } else {
          const msg = err instanceof Error ? err.message : 'Bede is unavailable right now.';
          setLimitMessage(msg);
        }
      } finally {
        setIsSending(false);
      }
    },
    [isSending],
  );

  return {
    messages,
    isSending,
    remainingToday,
    dailyLimit,
    isPremium,
    limitReached,
    limitMessage,
    send,
  };
};
