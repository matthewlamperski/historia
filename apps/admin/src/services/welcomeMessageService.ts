import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { type WelcomeMessageConfig } from '@historia/shared';

const WELCOME_DOC = 'config/welcomeMessage';

export async function getWelcomeMessage(): Promise<WelcomeMessageConfig | null> {
  const snap = await getDoc(doc(db, WELCOME_DOC));
  if (!snap.exists()) return null;
  return snap.data() as WelcomeMessageConfig;
}

/**
 * Per spec §6.8: simple set with merge, no version bump, no transaction.
 * The Cloud Function reads this doc fresh on every onUserCreate trigger.
 *
 * `text` is written verbatim — whitespace and line breaks preserved.
 */
export async function saveWelcomeMessage(
  next: Pick<WelcomeMessageConfig, 'senderId' | 'text' | 'enabled'>
): Promise<void> {
  await setDoc(
    doc(db, WELCOME_DOC),
    {
      senderId: next.senderId.trim(),
      text: next.text, // verbatim, do NOT trim
      enabled: next.enabled,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** Optional sanity check — verify a `users/{senderId}` doc exists. */
export async function verifySenderExists(senderId: string): Promise<{ exists: boolean; name?: string }> {
  const trimmed = senderId.trim();
  if (!trimmed) return { exists: false };
  const snap = await getDoc(doc(db, 'users', trimmed));
  if (!snap.exists()) return { exists: false };
  const data = snap.data() as { name?: string; displayName?: string };
  return { exists: true, name: data.name || data.displayName };
}
