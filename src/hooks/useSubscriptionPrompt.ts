import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@subscription_prompt_last_shown';
const PROMPT_INTERVAL_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

export const useSubscriptionPrompt = () => {
  const [shouldPrompt, setShouldPrompt] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) {
        setShouldPrompt(true);
      } else {
        const lastShown = parseInt(raw, 10);
        if (Date.now() - lastShown >= PROMPT_INTERVAL_MS) {
          setShouldPrompt(true);
        }
      }
      setChecked(true);
    });
  }, []);

  const markShown = () => {
    AsyncStorage.setItem(STORAGE_KEY, String(Date.now()));
    setShouldPrompt(false);
  };

  return { shouldPrompt, checked, markShown };
};
