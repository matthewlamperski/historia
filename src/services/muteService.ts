import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from './firebaseConfig';
import { Mute } from '../types';

class MuteService {
  async muteUser(muterId: string, mutedId: string): Promise<Mute> {
    const muteId = `${muterId}_${mutedId}`;
    const muteRef = firestore().collection(COLLECTIONS.MUTES).doc(muteId);

    const existing = await muteRef.get();
    if (existing.exists) {
      return {
        id: muteId,
        ...existing.data(),
        createdAt: existing.data()?.createdAt?.toDate() || new Date(),
      } as Mute;
    }

    const mute: Omit<Mute, 'id'> = {
      muterId,
      mutedId,
      createdAt: new Date(),
    };

    await muteRef.set(mute);
    return { id: muteId, ...mute };
  }

  async unmuteUser(muterId: string, mutedId: string): Promise<void> {
    const muteId = `${muterId}_${mutedId}`;
    await firestore().collection(COLLECTIONS.MUTES).doc(muteId).delete();
  }

  async getMutedUsers(userId: string): Promise<Mute[]> {
    const snapshot = await firestore()
      .collection(COLLECTIONS.MUTES)
      .where('muterId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Mute[];
  }

  async isUserMuted(muterId: string, mutedId: string): Promise<boolean> {
    const muteId = `${muterId}_${mutedId}`;
    const doc = await firestore()
      .collection(COLLECTIONS.MUTES)
      .doc(muteId)
      .get();
    return doc.exists;
  }

  subscribeToMutedUsers(
    userId: string,
    callback: (mutedIds: string[]) => void
  ): () => void {
    return firestore()
      .collection(COLLECTIONS.MUTES)
      .where('muterId', '==', userId)
      .onSnapshot(snapshot => {
        const mutedIds = snapshot.docs.map(doc => doc.data().mutedId);
        callback(mutedIds);
      });
  }
}

export const muteService = new MuteService();
