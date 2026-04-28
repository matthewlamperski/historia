import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import storage, { StringFormat } from '@react-native-firebase/storage';
import { COLLECTIONS } from './firebaseConfig';
import { User } from '../types';
import { logClientError } from './errorLogService';

/**
 * Returns true if `value` looks like a remote https URL safe to persist as a
 * user's avatar. Firebase Auth's `photoURL` and Firestore `avatar` fields
 * must NEVER hold local file URIs — local URIs become invalid the moment
 * the file is deleted (every app upgrade, every iOS photo-cache eviction)
 * and crash any consumer that tries to render them.
 */
export function isRemoteAvatarUrl(value: string | null | undefined): boolean {
  if (typeof value !== 'string' || value.length === 0) return false;
  return value.startsWith('http://') || value.startsWith('https://');
}

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

    try {
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
    } catch (err) {
      logClientError({
        code: 'avatar.upload.storageFailed',
        message: 'Storage upload threw — avatar was NOT persisted.',
        cause: err,
        userId,
        context: {
          method: base64 ? 'putString' : 'putFile',
          base64Length: base64?.length ?? 0,
          localUriPrefix: localUri.slice(0, 40),
        },
      });
      throw err;
    }

    const downloadUrl = await reference.getDownloadURL();

    // Defense in depth: getDownloadURL should always return https://, but if
    // some future SDK regression returns something else, refuse to propagate
    // a bad value. Local URIs in Firebase Auth photoURL / Firestore avatar
    // are catastrophic — they get rewritten on every auth state change.
    if (!isRemoteAvatarUrl(downloadUrl)) {
      logClientError({
        code: 'avatar.upload.nonHttpsResult',
        message: `getDownloadURL returned a non-https value — refusing to persist.`,
        userId,
        context: { returned: String(downloadUrl).slice(0, 200) },
      });
      throw new Error('Avatar upload completed but the returned URL was invalid.');
    }

    return downloadUrl;
  }

  // Update profile fields for the currently signed-in user
  async updateUserProfile(
    userId: string,
    updates: Pick<Partial<User>, 'name' | 'bio' | 'location' | 'website' | 'avatar' | 'username'>
  ): Promise<void> {
    const now = new Date().toISOString();

    // ─── Avatar guard: never persist a local file URI ───
    // If a caller passes a local URI as `updates.avatar`, drop it from the
    // update and log so we can find the offending call site. The previous
    // behaviour silently propagated bad URIs to both Firestore AND Firebase
    // Auth, where they got re-applied on every auth state change.
    const sanitized: typeof updates = { ...updates };
    if (sanitized.avatar !== undefined && !isRemoteAvatarUrl(sanitized.avatar)) {
      logClientError({
        code: 'avatar.update.localUriRejected',
        message: 'updateUserProfile called with a non-https avatar — dropped.',
        userId,
        context: { rejectedAvatar: String(sanitized.avatar).slice(0, 200) },
      });
      delete sanitized.avatar;
    }

    // Update Firestore
    await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .set({ ...sanitized, updatedAt: now }, { merge: true });

    // Keep Firebase Auth displayName / photoURL in sync — but only with
    // values that are safe to persist. A local URI as photoURL would re-leak
    // into Firestore on every auth state change via useAuth.
    const currentUser = auth().currentUser;
    if (currentUser) {
      const authUpdates: { displayName?: string; photoURL?: string } = {};
      if (sanitized.name !== undefined) authUpdates.displayName = sanitized.name;
      if (sanitized.avatar !== undefined && isRemoteAvatarUrl(sanitized.avatar)) {
        authUpdates.photoURL = sanitized.avatar;
      }
      if (Object.keys(authUpdates).length > 0) {
        try {
          await currentUser.updateProfile(authUpdates);
        } catch (err) {
          logClientError({
            code: 'avatar.update.authUpdateFailed',
            message: 'Firebase Auth updateProfile failed.',
            cause: err,
            userId,
          });
          // Do not rethrow — Firestore is the source of truth. An out-of-sync
          // Firebase Auth photoURL is not user-visible.
        }
      }
    }
  }
}

export const userService = new UserService();