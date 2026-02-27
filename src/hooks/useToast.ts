import { useCallback } from 'react';
import Toast from 'react-native-toast-message';

export interface UseToastReturn {
  showToast: (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info',
  ) => void;
  hideToast: () => void;
}

export const useToast = (): UseToastReturn => {
  const showToast = useCallback(
    (
      message: string,
      type: 'success' | 'error' | 'warning' | 'info' = 'info',
    ) => {
      Toast.show({
        type,
        text1: type === 'success' ? 'Success' : type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Info',
        text2: message,
        position: 'top',
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 60,
      });
    },
    [],
  );

  const hideToast = useCallback(() => {
    Toast.hide();
  }, []);

  return {
    showToast,
    hideToast,
  };
};
