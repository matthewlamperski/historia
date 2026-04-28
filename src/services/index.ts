export { apiService } from './apiService';
export { postsService } from './postsService';
export { userService, isRemoteAvatarUrl } from './userService';
export { logClientError } from './errorLogService';
export type { ClientErrorContext } from './errorLogService';
export { messagingService } from './messagingService';
export { landmarksService } from './landmarksService';
export { visitsService } from './visitsService';
export { companionsService } from './companionsService';
export { moderationService } from './moderationService';
export { subscriptionService } from './subscriptionService';
export { notificationService } from './notificationService';
export { referralService } from './referralService';
export { muteService } from './muteService';
export { pointsService } from './pointsService';
export {
  fetchPointsConfig,
  loadCachedPointsConfig,
  cachePointsConfig,
  clearPointsConfigCache,
} from './pointsConfigService';
export { followService } from './followService';
export { bedeService, BedeLimitError } from './bedeService';
export { firestore, storage, auth, COLLECTIONS } from './firebaseConfig';

// Add more services as they are created
