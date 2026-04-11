import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from './firebaseConfig';
import { User } from '../types';

class FollowService {
  // Follow a user
  async followUser(currentUserId: string, targetId: string): Promise<void> {
    const batch = firestore().batch();
    const ts = { followedAt: firestore.FieldValue.serverTimestamp() };

    // users/{currentUser}/following/{target}
    batch.set(
      firestore()
        .collection(COLLECTIONS.USERS).doc(currentUserId)
        .collection(COLLECTIONS.FOLLOWING).doc(targetId),
      ts
    );

    // users/{target}/followers/{currentUser}  ← makes getFollowersList a simple query
    batch.set(
      firestore()
        .collection(COLLECTIONS.USERS).doc(targetId)
        .collection(COLLECTIONS.FOLLOWERS).doc(currentUserId),
      ts
    );

    // Increment counts
    batch.update(firestore().collection(COLLECTIONS.USERS).doc(currentUserId), {
      followingCount: firestore.FieldValue.increment(1),
    });
    batch.update(firestore().collection(COLLECTIONS.USERS).doc(targetId), {
      followerCount: firestore.FieldValue.increment(1),
    });

    await batch.commit();
  }

  // Unfollow a user
  async unfollowUser(currentUserId: string, targetId: string): Promise<void> {
    const batch = firestore().batch();

    batch.delete(
      firestore()
        .collection(COLLECTIONS.USERS).doc(currentUserId)
        .collection(COLLECTIONS.FOLLOWING).doc(targetId)
    );

    batch.delete(
      firestore()
        .collection(COLLECTIONS.USERS).doc(targetId)
        .collection(COLLECTIONS.FOLLOWERS).doc(currentUserId)
    );

    batch.update(firestore().collection(COLLECTIONS.USERS).doc(currentUserId), {
      followingCount: firestore.FieldValue.increment(-1),
    });
    batch.update(firestore().collection(COLLECTIONS.USERS).doc(targetId), {
      followerCount: firestore.FieldValue.increment(-1),
    });

    await batch.commit();
  }

  // Check if current user follows a target
  async isFollowing(currentUserId: string, targetId: string): Promise<boolean> {
    try {
      const doc = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(currentUserId)
        .collection(COLLECTIONS.FOLLOWING)
        .doc(targetId)
        .get();
      return doc.exists;
    } catch {
      return false;
    }
  }

  // Get list of user IDs that this user is following
  async getFollowingIds(userId: string): Promise<string[]> {
    try {
      const snapshot = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userId)
        .collection(COLLECTIONS.FOLLOWING)
        .get();
      return snapshot.docs.map(doc => doc.id);
    } catch {
      return [];
    }
  }

  // Get full user profiles of people this user follows
  async getFollowingList(userId: string): Promise<User[]> {
    try {
      const ids = await this.getFollowingIds(userId);
      if (ids.length === 0) return [];

      // Firestore 'in' query supports up to 30 items; chunk if needed
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += 30) {
        chunks.push(ids.slice(i, i + 30));
      }

      const results = await Promise.all(
        chunks.map(chunk =>
          firestore()
            .collection(COLLECTIONS.USERS)
            .where(firestore.FieldPath.documentId(), 'in', chunk)
            .get()
        )
      );

      return results.flatMap(snap =>
        snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User))
      );
    } catch {
      return [];
    }
  }

  // Get full user profiles of people who follow this user
  async getFollowersList(userId: string): Promise<User[]> {
    try {
      // Simple subcollection query — no collection group needed
      const snapshot = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userId)
        .collection(COLLECTIONS.FOLLOWERS)
        .get();

      const followerIds = snapshot.docs.map(doc => doc.id);
      if (followerIds.length === 0) return [];

      const chunks: string[][] = [];
      for (let i = 0; i < followerIds.length; i += 30) {
        chunks.push(followerIds.slice(i, i + 30));
      }

      const results = await Promise.all(
        chunks.map(chunk =>
          firestore()
            .collection(COLLECTIONS.USERS)
            .where(firestore.FieldPath.documentId(), 'in', chunk)
            .get()
        )
      );

      return results.flatMap(snap =>
        snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User))
      );
    } catch {
      return [];
    }
  }
}

export const followService = new FollowService();
