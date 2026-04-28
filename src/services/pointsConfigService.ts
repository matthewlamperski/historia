import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { PointsConfig, PointsConfigSchema } from '../types/points';

const CONFIG_DOC_PATH = 'config/points';
const CACHE_KEY = 'pointsConfig:v1';

export interface CachedPointsConfig {
  config: PointsConfig;
  cachedAt: number;
}

export async function fetchPointsConfig(): Promise<PointsConfig> {
  const snap = await firestore().doc(CONFIG_DOC_PATH).get();
  if (!snap.exists()) {
    throw new Error('Points config document not found in Firestore');
  }
  const raw = snap.data();
  const parsed = PointsConfigSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Points config failed validation: ${JSON.stringify(parsed.error.issues)}`
    );
  }
  return parsed.data;
}

export async function loadCachedPointsConfig(): Promise<CachedPointsConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const validated = PointsConfigSchema.safeParse(parsed.config);
    if (!validated.success) {
      await AsyncStorage.removeItem(CACHE_KEY);
      return null;
    }
    return {
      config: validated.data,
      cachedAt: typeof parsed.cachedAt === 'number' ? parsed.cachedAt : 0,
    };
  } catch {
    return null;
  }
}

export async function cachePointsConfig(config: PointsConfig): Promise<void> {
  const payload: CachedPointsConfig = { config, cachedAt: Date.now() };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

export async function clearPointsConfigCache(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
}
