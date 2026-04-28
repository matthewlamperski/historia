import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../types';

/**
 * Global navigation ref used by non-screen contexts (FCM tap handlers, push
 * notification deep links, etc.) to navigate without being inside a Screen.
 * Pass to `<NavigationContainer ref={navigationRef}>`.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
