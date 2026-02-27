import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { PremiumFeature, RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const useSubscription = () => {
  const store = useSubscriptionStore();
  const navigation = useNavigation<NavigationProp>();

  const requirePremium = useCallback(
    (feature: PremiumFeature, onGranted: () => void) => {
      if (store.isPremium) {
        onGranted();
      } else {
        navigation.navigate('Subscription');
      }
    },
    [store.isPremium, navigation]
  );

  const showSubscriptionScreen = useCallback(() => {
    navigation.navigate('Subscription');
  }, [navigation]);

  return {
    ...store,
    requirePremium,
    showSubscriptionScreen,
  };
};
