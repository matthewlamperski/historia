import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@subscription_prompt_state';
const MAX_PER_DAY = 1;
const SESSION_DELAY_MS = 2 * 60 * 1000; // 2 minutes of active app time before prompting

interface PromptState {
  day: string;          // YYYY-MM-DD
  count: number;        // times shown on `day`
  lastShownAt: number;  // epoch ms of the most recent show
}

function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function loadState(): Promise<PromptState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PromptState;
      if (parsed.day === todayKey()) return parsed;
    }
  } catch {
    // fall through to fresh state
  }
  return { day: todayKey(), count: 0, lastShownAt: 0 };
}

function canShowNow(state: PromptState): boolean {
  if (state.day !== todayKey()) return true; // new day → quota resets
  return state.count < MAX_PER_DAY;
}

/**
 * Controls when the Historia Pro upsell sheet is offered.
 *
 * Rules:
 *   • Never in the first 2 minutes of active app time.
 *   • Max 1 show per calendar day (quota resets at midnight local time).
 *   • Active time only — foregrounding from background doesn't reset the timer,
 *     but backgrounding pauses it so a user who barely opened the app can't
 *     get prompted on the next launch.
 */
export const useSubscriptionPrompt = () => {
  const [shouldPrompt, setShouldPrompt] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let fireTimer: ReturnType<typeof setTimeout> | null = null;
    let activeMs = 0;
    let segmentStart = AppState.currentState === 'active' ? Date.now() : 0;

    const clearFireTimer = () => {
      if (fireTimer) {
        clearTimeout(fireTimer);
        fireTimer = null;
      }
    };

    const scheduleFire = () => {
      clearFireTimer();
      const remaining = Math.max(0, SESSION_DELAY_MS - activeMs);
      fireTimer = setTimeout(async () => {
        if (cancelled) return;
        const fresh = await loadState();
        if (canShowNow(fresh)) setShouldPrompt(true);
      }, remaining);
    };

    const handleAppStateChange = (next: string) => {
      const wasActive = segmentStart > 0;
      if (next === 'active') {
        segmentStart = Date.now();
        scheduleFire();
      } else if (wasActive) {
        activeMs += Date.now() - segmentStart;
        segmentStart = 0;
        clearFireTimer();
      }
    };

    loadState().then(state => {
      if (cancelled) return;
      setChecked(true);
      if (!canShowNow(state)) return;
      if (AppState.currentState === 'active') scheduleFire();
    });

    const sub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      cancelled = true;
      clearFireTimer();
      sub.remove();
    };
  }, []);

  const markShown = async () => {
    setShouldPrompt(false);
    const current = await loadState();
    const next: PromptState = {
      day: todayKey(),
      count: current.day === todayKey() ? current.count + 1 : 1,
      lastShownAt: Date.now(),
    };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // non-fatal
    }
  };

  return { shouldPrompt, checked, markShown };
};
