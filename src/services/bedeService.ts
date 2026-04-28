import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { COLLECTIONS } from './firebaseConfig';
import { BedeMessage, BedeSource } from '../types';

const ASK_BEDE_URL =
  'https://us-central1-historia-application.cloudfunctions.net/askBede';

export interface SendBedeResult {
  reply: string;
  sources?: BedeSource[];
  remainingToday: number | null;
  dailyLimit: number | null;
  isPremium: boolean;
}

export class BedeLimitError extends Error {
  constructor(
    message: string,
    public readonly dailyLimit: number,
    public readonly isPremium: boolean,
  ) {
    super(message);
    this.name = 'BedeLimitError';
  }
}

class BedeService {
  /**
   * Sends a message to the Ask Bede Cloud Function. Persistence and Gemini
   * call happen server-side; the Firestore listener in `useBedeChat` picks up
   * both the user and assistant messages once they land.
   */
  async sendMessage(landmarkId: string, message: string): Promise<SendBedeResult> {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('You must be signed in to ask Bede.');
    }
    const idToken = await currentUser.getIdToken();

    const res = await fetch(ASK_BEDE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ landmarkId, message }),
    });

    const body = await res.json().catch(() => ({}));

    if (res.status === 429) {
      throw new BedeLimitError(
        body.error ?? "You've reached today's message limit.",
        body.dailyLimit ?? 0,
        body.isPremium ?? false,
      );
    }

    if (!res.ok) {
      throw new Error(body.error ?? `Bede is unavailable (HTTP ${res.status}).`);
    }

    return body as SendBedeResult;
  }

  /**
   * Real-time listener over a single landmark's Bede conversation. Ordered
   * ascending (oldest first) so new messages naturally append at the bottom.
   */
  subscribeToConversation(
    userId: string,
    landmarkId: string,
    callback: (messages: BedeMessage[]) => void,
  ): () => void {
    try {
      const unsubscribe = firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userId)
        .collection('bedeChats')
        .doc(landmarkId)
        .collection('messages')
        .orderBy('createdAt', 'asc')
        .limit(500)
        .onSnapshot(
          snapshot => {
            const messages: BedeMessage[] = snapshot.docs.map(doc => {
              const data = doc.data();
              const rawSources = Array.isArray(data.sources) ? data.sources : null;
              const sources: BedeSource[] | undefined = rawSources
                ? rawSources
                    .filter(
                      (s: any): s is BedeSource =>
                        s && typeof s.url === 'string' && typeof s.title === 'string'
                    )
                    .map((s: BedeSource) => ({ url: s.url, title: s.title }))
                : undefined;
              return {
                id: doc.id,
                role: data.role as 'user' | 'assistant',
                text: data.text ?? '',
                createdAt: data.createdAt?.toDate?.() ?? new Date(),
                ...(sources && sources.length > 0 ? { sources } : {}),
              };
            });
            callback(messages);
          },
          err => {
            console.warn('bedeService.subscribeToConversation error:', err);
            callback([]);
          },
        );
      return unsubscribe;
    } catch (err) {
      console.warn('bedeService.subscribeToConversation threw:', err);
      return () => {};
    }
  }
}

export const bedeService = new BedeService();
