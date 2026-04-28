import { LevelDef } from '../types/points';

const sortByOrder = (levels: LevelDef[]): LevelDef[] =>
  [...levels].sort((a, b) => a.order - b.order);

export function getLevelForPoints(levels: LevelDef[], points: number): LevelDef {
  const sorted = sortByOrder(levels);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (points >= sorted[i].minPoints) {
      return sorted[i];
    }
  }
  return sorted[0];
}

export function getNextLevel(
  levels: LevelDef[],
  currentLevel: LevelDef
): LevelDef | null {
  const sorted = sortByOrder(levels);
  const idx = sorted.findIndex(l => l.id === currentLevel.id);
  return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;
}

export function getLevelProgress(points: number, level: LevelDef): number {
  if (level.maxPoints === null) return 1;
  const range = level.maxPoints - level.minPoints + 1;
  const earned = points - level.minPoints;
  return Math.min(1, Math.max(0, earned / range));
}
