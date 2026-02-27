import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  addDoc,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Report,
  ReportStatus,
  User,
  UserBan,
  ModerationAction,
  ModerationActionType,
  COLLECTIONS,
  DashboardStats,
} from '../types';

// Helper to convert Firestore timestamp to Date
const toDate = (timestamp: Timestamp | Date | undefined): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return timestamp;
};

// ==================== REPORTS ====================

export async function getReports(status?: ReportStatus): Promise<Report[]> {
  const reportsRef = collection(db, COLLECTIONS.REPORTS);
  const q = status
    ? query(reportsRef, where('status', '==', status), orderBy('createdAt', 'desc'))
    : query(reportsRef, orderBy('createdAt', 'desc'));

  const snapshot = await getDocs(q);
  const reports = await Promise.all(
    snapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data();

      // Fetch reporter name
      let reporterName: string | undefined;
      try {
        const reporterDoc = await getDoc(doc(db, COLLECTIONS.USERS, data.reporterId));
        if (reporterDoc.exists()) {
          reporterName = reporterDoc.data().name;
        }
      } catch (e) {
        console.error('Error fetching reporter:', e);
      }

      // Fetch reported user name
      let reportedUserName: string | undefined;
      try {
        const reportedUserDoc = await getDoc(doc(db, COLLECTIONS.USERS, data.reportedUserId));
        if (reportedUserDoc.exists()) {
          reportedUserName = reportedUserDoc.data().name;
        }
      } catch (e) {
        console.error('Error fetching reported user:', e);
      }

      return {
        id: docSnapshot.id,
        ...data,
        reporterName,
        reportedUserName,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as Report;
    })
  );

  return reports;
}

export async function getReport(reportId: string): Promise<Report | null> {
  const reportDoc = await getDoc(doc(db, COLLECTIONS.REPORTS, reportId));
  if (!reportDoc.exists()) return null;

  const data = reportDoc.data();
  return {
    id: reportDoc.id,
    ...data,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  } as Report;
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  resolution?: { action: string; adminId: string; adminNotes?: string }
): Promise<void> {
  const reportRef = doc(db, COLLECTIONS.REPORTS, reportId);
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: Timestamp.now(),
  };

  if (resolution) {
    updateData.resolution = {
      ...resolution,
      resolvedAt: Timestamp.now(),
    };
  }

  await updateDoc(reportRef, updateData);
}

// ==================== USERS ====================

export async function getUsers(searchTerm?: string): Promise<User[]> {
  const usersRef = collection(db, COLLECTIONS.USERS);
  const q = query(usersRef, orderBy('createdAt', 'desc'), limit(100));

  const snapshot = await getDocs(q);
  let users = snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  })) as User[];

  // Filter by search term if provided
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    users = users.filter(
      (user) =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.username.toLowerCase().includes(term)
    );
  }

  return users;
}

export async function getUser(userId: string): Promise<User | null> {
  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
  if (!userDoc.exists()) return null;

  return {
    id: userDoc.id,
    ...userDoc.data(),
  } as User;
}

// ==================== USER BANS ====================

export async function getUserBan(userId: string): Promise<UserBan | null> {
  const banDoc = await getDoc(doc(db, COLLECTIONS.USER_BANS, userId));
  if (!banDoc.exists()) return null;

  const data = banDoc.data();
  return {
    id: banDoc.id,
    ...data,
    banExpiresAt: data.banExpiresAt ? toDate(data.banExpiresAt) : undefined,
    bannedAt: toDate(data.bannedAt),
  } as UserBan;
}

export async function banUser(
  userId: string,
  adminId: string,
  reason: string,
  banType: 'temporary' | 'permanent',
  expiresInDays?: number
): Promise<void> {
  const banRef = doc(db, COLLECTIONS.USER_BANS, userId);
  const banData: Omit<UserBan, 'id' | 'userName'> = {
    userId,
    isBanned: true,
    banType,
    banReason: reason,
    bannedBy: adminId,
    bannedAt: new Date(),
  };

  if (banType === 'temporary' && expiresInDays) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    banData.banExpiresAt = expiresAt;
  }

  await setDoc(banRef, banData);

  // Log moderation action
  await addModerationAction({
    targetUserId: userId,
    action: banType === 'permanent' ? 'permanent_ban' : 'temporary_ban',
    adminId,
    reason,
  });
}

export async function unbanUser(userId: string): Promise<void> {
  const banRef = doc(db, COLLECTIONS.USER_BANS, userId);
  await updateDoc(banRef, { isBanned: false });
}

export async function getBannedUsers(): Promise<UserBan[]> {
  const bansRef = collection(db, COLLECTIONS.USER_BANS);
  const q = query(bansRef, where('isBanned', '==', true));

  const snapshot = await getDocs(q);
  const bans = await Promise.all(
    snapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data();

      // Fetch user name
      let userName: string | undefined;
      try {
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, data.userId));
        if (userDoc.exists()) {
          userName = userDoc.data().name;
        }
      } catch (e) {
        console.error('Error fetching user:', e);
      }

      return {
        id: docSnapshot.id,
        ...data,
        userName,
        banExpiresAt: data.banExpiresAt ? toDate(data.banExpiresAt) : undefined,
        bannedAt: toDate(data.bannedAt),
      } as UserBan;
    })
  );

  return bans;
}

// ==================== MODERATION ACTIONS ====================

export async function addModerationAction(action: {
  reportId?: string;
  targetUserId: string;
  action: ModerationActionType;
  adminId: string;
  reason: string;
}): Promise<void> {
  await addDoc(collection(db, COLLECTIONS.MODERATION_ACTIONS), {
    ...action,
    createdAt: Timestamp.now(),
  });
}

export async function getModerationActions(
  targetUserId?: string
): Promise<ModerationAction[]> {
  const actionsRef = collection(db, COLLECTIONS.MODERATION_ACTIONS);
  const q = targetUserId
    ? query(actionsRef, where('targetUserId', '==', targetUserId), orderBy('createdAt', 'desc'))
    : query(actionsRef, orderBy('createdAt', 'desc'), limit(100));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      ...data,
      createdAt: toDate(data.createdAt),
    } as ModerationAction;
  });
}

// ==================== DASHBOARD STATS ====================

export async function getDashboardStats(): Promise<DashboardStats> {
  // Get pending reports count
  const pendingReportsQuery = query(
    collection(db, COLLECTIONS.REPORTS),
    where('status', '==', 'pending')
  );
  const pendingReportsSnapshot = await getDocs(pendingReportsQuery);
  const pendingReports = pendingReportsSnapshot.size;

  // Get reports today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const reportsTodayQuery = query(
    collection(db, COLLECTIONS.REPORTS),
    where('createdAt', '>=', Timestamp.fromDate(today))
  );
  const reportsTodaySnapshot = await getDocs(reportsTodayQuery);
  const reportsToday = reportsTodaySnapshot.size;

  // Get active bans count
  const activeBansQuery = query(
    collection(db, COLLECTIONS.USER_BANS),
    where('isBanned', '==', true)
  );
  const activeBansSnapshot = await getDocs(activeBansQuery);
  const activeBans = activeBansSnapshot.size;

  // Get total users count
  const usersSnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
  const totalUsers = usersSnapshot.size;

  return {
    pendingReports,
    reportsToday,
    activeBans,
    totalUsers,
  };
}
