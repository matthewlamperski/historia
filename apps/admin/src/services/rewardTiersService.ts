import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { RewardTierSchema, type RewardTier } from '@historia/shared';

const TIERS_COLLECTION = 'rewardTiers';

export interface RewardTierDoc {
  id: string;
  data: RewardTier;
}

export async function listRewardTiers(): Promise<RewardTierDoc[]> {
  const q = query(collection(db, TIERS_COLLECTION), orderBy('pointsRequired', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as RewardTier }));
}

export async function getRewardTier(id: string): Promise<RewardTierDoc | null> {
  const snap = await getDoc(doc(db, TIERS_COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, data: snap.data() as RewardTier };
}

export async function saveRewardTier(id: string, data: RewardTier): Promise<void> {
  const parsed = RewardTierSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      'Validation failed: ' +
        parsed.error.issues.map((i) => i.message).join('; ')
    );
  }
  await setDoc(doc(db, TIERS_COLLECTION, id), parsed.data, { merge: false });
}

export async function deleteRewardTier(id: string): Promise<void> {
  await deleteDoc(doc(db, TIERS_COLLECTION, id));
}
