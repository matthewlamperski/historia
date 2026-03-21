import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { COLLECTIONS } from './firebaseConfig';
import { User } from '../types';

class UserService {
  // Get or create a mock user for demonstration
  async getMockUser(): Promise<User> {
    const mockUserId = 'mock-user-id';
    
    try {
      const userDoc = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(mockUserId)
        .get();

      if (userDoc.exists()) {
        return userDoc.data() as User;
      } else {
        // Create a mock user
        const mockUser: Omit<User, 'id'> = {
          name: 'Demo User',
          username: 'demo_user',
          email: 'demo@historia.app',
          avatar: undefined,
          followerCount: 0,
          followingCount: 0,
          postCount: 0,
          isVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await firestore()
          .collection(COLLECTIONS.USERS)
          .doc(mockUserId)
          .set(mockUser);

        return {
          id: mockUserId,
          ...mockUser,
        };
      }
    } catch (error) {
      console.error('Error getting mock user:', error);
      // Return a fallback user if Firebase fails
      return {
        id: mockUserId,
        name: 'Demo User',
        username: 'demo_user',
        email: 'demo@historia.app',
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  // Create or update user
  async createOrUpdateUser(userData: Partial<User>): Promise<User> {
    try {
      const userId = userData.id || 'mock-user-id';
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
          name: 'Demo User',
          email: 'demo@historia.app',
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

  // Update profile fields for the currently signed-in user
  async updateUserProfile(
    userId: string,
    updates: Pick<Partial<User>, 'name' | 'bio' | 'location' | 'website' | 'avatar'>
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