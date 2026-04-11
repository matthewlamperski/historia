import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import storage, { StringFormat } from '@react-native-firebase/storage';
import { COLLECTIONS } from './firebaseConfig';
import { User } from '../types';

class UserService {
  // Create or update user
  async createOrUpdateUser(userData: Partial<User> & { id: string }): Promise<User> {
    try {
      const { id: userId } = userData;
      const now = new Date().toISOString();
      
      const userRef = firestore().collection(COLLECTIONS.USERS).doc(userId);
      const userDoc = await userRef.get();
      
      if (userDoc.exists()) {
        // Update existing user
        await userRef.update({
          ...userData,
          updatedAt: now,
        });
        
        const updatedDoc = await userRef.get();
        return updatedDoc.data() as User;
      } else {
        // Create new user
        const newUser = {
          ...userData,
          id: userId,
          createdAt: now,
          updatedAt: now,
        };
        
        await userRef.set(newUser);
        return newUser as User;
      }
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  }

  // Update the user's hometown (location they call home on the map)
  async updateHometown(
    userId: string,
    hometown: { latitude: number; longitude: number; city: string }
  ): Promise<void> {
    const now = new Date().toISOString();
    await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .set({ hometown, updatedAt: now }, { merge: true });
  }

  // Upload avatar image to Firebase Storage, returns remote download URL.
  // Always writes to avatars/{userId}.jpg so old avatars are automatically replaced.
  // Accepts an optional base64 string (preferred — avoids iOS temp-file issues).
  async uploadAvatar(userId: string, localUri: string, base64?: string | null): Promise<string> {
    const reference = storage().ref(`avatars/${userId}.jpg`);

    if (base64) {
      // Upload via base64 string — most reliable on iOS (no temp-file path issues)
      await reference.putString(base64, StringFormat.BASE64, {
        contentType: 'image/jpeg',
      });
    } else {
      // Fallback: upload directly from file URI
      const filePath = localUri.replace(/^file:\/\//, '');
      await reference.putFile(filePath);
    }

    return reference.getDownloadURL();
  }

  // Update profile fields for the currently signed-in user
  async updateUserProfile(
    userId: string,
    updates: Pick<Partial<User>, 'name' | 'bio' | 'location' | 'website' | 'avatar' | 'username'>
  ): Promise<void> {
    const now = new Date().toISOString();

    // Update Firestore
    await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .set({ ...updates, updatedAt: now }, { merge: true });

    // Keep Firebase Auth displayName in sync
    const currentUser = auth().currentUser;
    if (currentUser) {
      const authUpdates: { displayName?: string; photoURL?: string } = {};
      if (updates.name !== undefined) authUpdates.displayName = updates.name;
      if (updates.avatar !== undefined) authUpdates.photoURL = updates.avatar;
      if (Object.keys(authUpdates).length > 0) {
        await currentUser.updateProfile(authUpdates);
      }
    }
  }
}

export const userService = new UserService();