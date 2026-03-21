import { useState, useCallback } from 'react';
import { journalService } from '../services/journalService';

export const useJournal = (userId: string) => {
  const [entry, setEntry] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadEntry = useCallback(
    async (landmarkId: string) => {
      if (!userId || !landmarkId) return;
      setLoading(true);
      try {
        const text = await journalService.getEntry(userId, landmarkId);
        setEntry(text ?? '');
      } catch {
        setEntry('');
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  const saveEntry = useCallback(
    async (landmarkId: string, landmarkName: string, text: string) => {
      if (!userId) return;
      setSaving(true);
      try {
        await journalService.saveEntry(userId, landmarkId, landmarkName, text);
        setEntry(text);
      } finally {
        setSaving(false);
      }
    },
    [userId]
  );

  return { entry, loading, saving, loadEntry, saveEntry };
};
