import { useState, useCallback } from 'react';

export interface UseToastReturn {
  showToast: (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info',
  ) => void;
  hideToast: () => void;
  toastVisible: boolean;
  toastMessage: string;
  toastType: 'success' | 'error' | 'warning' | 'info';
}

export const useToast = (): UseToastReturn => {
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<
    'success' | 'error' | 'warning' | 'info'
  >('info');

  const showToast = useCallback(
    (
      message: string,
      type: 'success' | 'error' | 'warning' | 'info' = 'info',
    ) => {
      setToastMessage(message);
      setToastType(type);
      setToastVisible(true);
    },
    [],
  );

  const hideToast = useCallback(() => {
    setToastVisible(false);
  }, []);

  return {
    showToast,
    hideToast,
    toastVisible,
    toastMessage,
    toastType,
  };
};
