import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { Image } from 'react-native';
import {
  fetchPointsConfig,
  loadCachedPointsConfig,
  cachePointsConfig,
} from '../services/pointsConfigService';
import { setEarningCache } from '../services/pointsConfigCache';
import { PointsConfig, LevelDef } from '../types/points';
import {
  getLevelForPoints as getLevelForPointsFn,
  getNextLevel as getNextLevelFn,
  getLevelProgress as getLevelProgressFn,
} from '../utils/levelHelpers';

type Status = 'loading' | 'ready' | 'unavailable';

interface PointsConfigContextValue {
  status: Status;
  config: PointsConfig | null;
  refresh: () => Promise<void>;
  getLevelForPoints: (points: number) => LevelDef | null;
  getNextLevel: (current: LevelDef) => LevelDef | null;
  getLevelProgress: (points: number, level: LevelDef) => number;
}

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

const PointsConfigContext = createContext<PointsConfigContextValue | undefined>(
  undefined
);

interface PointsConfigProviderProps {
  children: ReactNode;
}

export const PointsConfigProvider: React.FC<PointsConfigProviderProps> = ({
  children,
}) => {
  const [status, setStatus] = useState<Status>('loading');
  const [config, setConfig] = useState<PointsConfig | null>(null);
  const prefetchedUrlsRef = useRef<Set<string>>(new Set());

  const applyConfig = useCallback((next: PointsConfig) => {
    setConfig(next);
    setStatus('ready');
    setEarningCache(next.earning);

    for (const level of next.levels) {
      if (!prefetchedUrlsRef.current.has(level.imageUrl)) {
        prefetchedUrlsRef.current.add(level.imageUrl);
        Image.prefetch(level.imageUrl).catch(() => {
          prefetchedUrlsRef.current.delete(level.imageUrl);
        });
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const remote = await fetchPointsConfig();
      applyConfig(remote);
      cachePointsConfig(remote).catch(err =>
        console.warn('[PointsConfig] cache write failed', err)
      );
    } catch (err) {
      console.warn('[PointsConfig] remote fetch failed', err);
      setStatus(prev => (prev === 'ready' ? prev : 'unavailable'));
    }
  }, [applyConfig]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const cached = await loadCachedPointsConfig();
      if (cancelled) return;

      const isStale = !cached || Date.now() - cached.cachedAt > STALE_AFTER_MS;

      if (cached) {
        applyConfig(cached.config);
      }

      try {
        const remote = await fetchPointsConfig();
        if (cancelled) return;
        const cachedVersion = cached?.config.version ?? -1;
        if (remote.version > cachedVersion || isStale) {
          applyConfig(remote);
          cachePointsConfig(remote).catch(err =>
            console.warn('[PointsConfig] cache write failed', err)
          );
        }
      } catch (err) {
        if (!cached) {
          console.warn('[PointsConfig] no cache and remote fetch failed', err);
          setStatus('unavailable');
        } else {
          console.warn('[PointsConfig] remote refresh failed, using cache', err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyConfig]);

  const getLevelForPoints = useCallback(
    (points: number): LevelDef | null => {
      if (!config) return null;
      return getLevelForPointsFn(config.levels, points);
    },
    [config]
  );

  const getNextLevel = useCallback(
    (current: LevelDef): LevelDef | null => {
      if (!config) return null;
      return getNextLevelFn(config.levels, current);
    },
    [config]
  );

  const getLevelProgress = useCallback(
    (points: number, level: LevelDef): number => getLevelProgressFn(points, level),
    []
  );

  const value: PointsConfigContextValue = {
    status,
    config,
    refresh,
    getLevelForPoints,
    getNextLevel,
    getLevelProgress,
  };

  return (
    <PointsConfigContext.Provider value={value}>
      {children}
    </PointsConfigContext.Provider>
  );
};

export const usePointsConfig = (): PointsConfigContextValue => {
  const ctx = useContext(PointsConfigContext);
  if (!ctx) {
    throw new Error(
      'usePointsConfig must be used within a PointsConfigProvider'
    );
  }
  return ctx;
};

export default PointsConfigContext;
