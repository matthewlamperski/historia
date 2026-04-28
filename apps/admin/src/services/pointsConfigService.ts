import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  PointsConfigSchema,
  type PointsConfig,
} from '@historia/shared';

const POINTS_DOC = 'config/points';

export async function getPointsConfig(): Promise<PointsConfig | null> {
  const snap = await getDoc(doc(db, POINTS_DOC));
  if (!snap.exists()) return null;
  return snap.data() as PointsConfig;
}

/**
 * Write `config/points` per spec §7:
 *   1. Validate with zod (caller is expected to have already done it, but
 *      we re-run inside the transaction for safety).
 *   2. Read current `version` and write current+1.
 *   3. Use a transaction so two concurrent admins can't clobber each other.
 *   4. Set `updatedAt: serverTimestamp()`.
 */
export async function savePointsConfig(
  next: Omit<PointsConfig, 'version' | 'updatedAt'>
): Promise<{ version: number }> {
  // Pre-validate so we surface nice errors before opening a transaction.
  const dryRun = PointsConfigSchema.safeParse({ ...next, version: 0 });
  if (!dryRun.success) {
    throw new Error(
      'Validation failed: ' +
        dryRun.error.issues
          .map((i) => `${i.path.join('.')} ${i.message}`)
          .join('; ')
    );
  }

  const ref = doc(db, POINTS_DOC);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const currentVersion = snap.exists()
      ? (snap.data() as PointsConfig).version ?? 0
      : 0;
    const newVersion = currentVersion + 1;

    const payload = {
      ...next,
      version: newVersion,
      updatedAt: serverTimestamp(),
    };

    // Re-run validation now that version is fixed.
    const recheck = PointsConfigSchema.safeParse({ ...next, version: newVersion });
    if (!recheck.success) {
      throw new Error('Post-version validation failed');
    }

    tx.set(ref, payload, { merge: false });
    return { version: newVersion };
  });
}
