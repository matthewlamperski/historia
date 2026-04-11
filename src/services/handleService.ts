import firestore from '@react-native-firebase/firestore';

const HANDLES_COLLECTION = 'handles';

export const HANDLE_REGEX = /^[a-z][a-z0-9_]{2,19}$/;

export const handleService = {
  checkHandleAvailable: async (handle: string): Promise<boolean> => {
    const doc = await firestore()
      .collection(HANDLES_COLLECTION)
      .doc(handle)
      .get();
    return !doc.data();
  },

  reserveHandle: async (handle: string, userId: string): Promise<void> => {
    await firestore()
      .collection(HANDLES_COLLECTION)
      .doc(handle)
      .set({
        userId,
        createdAt: new Date().toISOString(),
      });
  },
};
