import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from './firebaseConfig';
import {
  Report,
  Block,
  UserBan,
  CreateReportData,
  ReportStatus,
} from '../types';

class ModerationService {
  // ==================== REPORTS ====================

  async createReport(
    reporterId: string,
    data: CreateReportData
  ): Promise<Report> {
    const now = new Date();
    const reportRef = firestore().collection(COLLECTIONS.REPORTS).doc();

    const report: Omit<Report, 'id'> = {
      reporterId,
      reportedId: data.reportedId,
      reportedType: data.reportedType,
      reportedUserId: data.reportedUserId,
      reason: data.reason,
      description: data.description,
      status: 'pending',
      contentSnapshot: data.contentSnapshot,
      createdAt: now,
      updatedAt: now,
    };

    await reportRef.set(report);

    return {
      id: reportRef.id,
      ...report,
    };
  }

  async getReportsByUser(userId: string): Promise<Report[]> {
    const snapshot = await firestore()
      .collection(COLLECTIONS.REPORTS)
      .where('reporterId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Report[];
  }

  async getReportsByStatus(status: ReportStatus): Promise<Report[]> {
    const snapshot = await firestore()
      .collection(COLLECTIONS.REPORTS)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Report[];
  }

  // ==================== BLOCKS ====================

  async blockUser(blockerId: string, blockedId: string): Promise<Block> {
    const blockId = `${blockerId}_${blockedId}`;
    const blockRef = firestore().collection(COLLECTIONS.BLOCKS).doc(blockId);

    // Check if already blocked
    const existingBlock = await blockRef.get();
    if (existingBlock.exists) {
      return {
        id: blockId,
        ...existingBlock.data(),
        createdAt: existingBlock.data()?.createdAt?.toDate() || new Date(),
      } as Block;
    }

    const block: Omit<Block, 'id'> = {
      blockerId,
      blockedId,
      createdAt: new Date(),
    };

    await blockRef.set(block);

    return {
      id: blockId,
      ...block,
    };
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const blockId = `${blockerId}_${blockedId}`;
    await firestore().collection(COLLECTIONS.BLOCKS).doc(blockId).delete();
  }

  async getBlockedUsers(userId: string): Promise<Block[]> {
    const snapshot = await firestore()
      .collection(COLLECTIONS.BLOCKS)
      .where('blockerId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Block[];
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    const blocks = await this.getBlockedUsers(userId);
    return blocks.map(block => block.blockedId);
  }

  async isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const blockId = `${blockerId}_${blockedId}`;
    const doc = await firestore()
      .collection(COLLECTIONS.BLOCKS)
      .doc(blockId)
      .get();
    return doc.exists;
  }

  // Subscribe to blocked users for real-time updates
  subscribeToBlockedUsers(
    userId: string,
    callback: (blockedIds: string[]) => void
  ): () => void {
    return firestore()
      .collection(COLLECTIONS.BLOCKS)
      .where('blockerId', '==', userId)
      .onSnapshot(snapshot => {
        const blockedIds = snapshot.docs.map(doc => doc.data().blockedId);
        callback(blockedIds);
      });
  }

  // ==================== USER BANS ====================

  async getUserBanStatus(userId: string): Promise<UserBan | null> {
    const doc = await firestore()
      .collection(COLLECTIONS.USER_BANS)
      .doc(userId)
      .get();

    if (!doc.exists) return null;

    const data = doc.data();
    const ban: UserBan = {
      id: doc.id,
      userId: data?.userId,
      isBanned: data?.isBanned,
      banType: data?.banType,
      banExpiresAt: data?.banExpiresAt?.toDate(),
      banReason: data?.banReason,
      bannedBy: data?.bannedBy,
      bannedAt: data?.bannedAt?.toDate(),
    };

    // Check if temporary ban has expired
    if (ban.isBanned && ban.banType === 'temporary' && ban.banExpiresAt) {
      if (new Date() > ban.banExpiresAt) {
        // Ban has expired, update the record
        await firestore()
          .collection(COLLECTIONS.USER_BANS)
          .doc(userId)
          .update({ isBanned: false });
        return { ...ban, isBanned: false };
      }
    }

    return ban;
  }

  async isUserBanned(userId: string): Promise<boolean> {
    const ban = await this.getUserBanStatus(userId);
    return ban?.isBanned ?? false;
  }

  // ==================== POST DELETION ====================

  async deletePost(postId: string, userId: string): Promise<void> {
    const postRef = firestore().collection(COLLECTIONS.POSTS).doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      throw new Error('Post not found');
    }

    const postData = postDoc.data();
    if (postData?.userId !== userId) {
      throw new Error('You can only delete your own posts');
    }

    // Use a batch to delete post and all its comments
    const batch = firestore().batch();

    // Delete all comments for this post
    const commentsSnapshot = await firestore()
      .collection(COLLECTIONS.COMMENTS)
      .where('postId', '==', postId)
      .get();

    commentsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete the post
    batch.delete(postRef);

    // Decrement user's post count
    const userRef = firestore().collection(COLLECTIONS.USERS).doc(userId);
    batch.update(userRef, {
      postCount: firestore.FieldValue.increment(-1),
    });

    await batch.commit();
  }

  // ==================== COMMENT DELETION ====================

  async deleteComment(
    commentId: string,
    postId: string,
    userId: string
  ): Promise<void> {
    const commentRef = firestore()
      .collection(COLLECTIONS.COMMENTS)
      .doc(commentId);
    const commentDoc = await commentRef.get();

    if (!commentDoc.exists) {
      throw new Error('Comment not found');
    }

    const commentData = commentDoc.data();
    if (commentData?.userId !== userId) {
      throw new Error('You can only delete your own comments');
    }

    // Use a batch to delete comment and update post comment count
    const batch = firestore().batch();

    // Delete the comment
    batch.delete(commentRef);

    // Decrement post's comment count
    const postRef = firestore().collection(COLLECTIONS.POSTS).doc(postId);
    batch.update(postRef, {
      commentCount: firestore.FieldValue.increment(-1),
    });

    await batch.commit();
  }
}

export const moderationService = new ModerationService();
