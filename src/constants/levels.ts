export interface LevelDef {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number | null; // null = no cap (highest level)
  color: string;
  icon: string; // FontAwesome6 icon name (kept for fallback use)
  image: ReturnType<typeof require>; // PNG asset for the coin
  rewards: string[];
}

export const LEVELS: LevelDef[] = [
  {
    id: 'historia_initiate',
    name: 'Historia Initiate',
    minPoints: 0,
    maxPoints: 99,
    color: '#9ca3af',
    icon: 'seedling',
    image: require('../assets/achievements/1.png'),
    rewards: [
      'Get 15% off your order at shophistoria.com',
      'Digital Challenge Coin',
    ],
  },
  {
    id: 'history_keeper',
    name: 'History Keeper',
    minPoints: 100,
    maxPoints: 249,
    color: '#92400e',
    icon: 'book',
    image: require('../assets/achievements/2.png'),
    rewards: [
      'Get 20% off your order at shophistoria.com',
      'Digital Challenge Coin',
    ],
  },
  {
    id: 'patriotic_chronicler',
    name: 'Patriotic Chronicler',
    minPoints: 250,
    maxPoints: 499,
    color: '#b45309',
    icon: 'feather',
    image: require('../assets/achievements/3.png'),
    rewards: [
      'Get 25% off your order at shophistoria.com',
      'Digital Challenge Coin',
    ],
  },
  {
    id: 'heritage_ambassador',
    name: 'Heritage Ambassador',
    minPoints: 500,
    maxPoints: 999,
    color: '#6b7280',
    icon: 'scroll',
    image: require('../assets/achievements/4.png'),
    rewards: [
      'Historia branded Made in USA 16oz Tervis tumbler',
      'Exclusive access to limited-edition items & pre-sale drops',
      'Digital Challenge Coin',
    ],
  },
  {
    id: 'gratitude_guardian',
    name: 'Gratitude Guardian',
    minPoints: 1000,
    maxPoints: 2499,
    color: '#d97706',
    icon: 'shield-heart',
    image: require('../assets/achievements/5.png'),
    rewards: [
      '$50 gift card at shophistoria.com',
      'Exclusive access to limited-edition items & pre-sale drops',
      'Digital Challenge Coin',
    ],
  },
  {
    id: 'liberty_sentinel',
    name: 'Liberty Sentinel',
    minPoints: 2500,
    maxPoints: 3499,
    color: '#2563eb',
    icon: 'shield',
    image: require('../assets/achievements/6.png'),
    rewards: [
      '$100 gift card at shophistoria.com',
      'Complimentary members gift of the year',
      'Exclusive access to limited-edition items & pre-sale drops',
      'Digital Challenge Coin',
    ],
  },
  {
    id: 'legacy_defender',
    name: 'Legacy Defender',
    minPoints: 3500,
    maxPoints: 4999,
    color: '#7c3aed',
    icon: 'shield-halved',
    image: require('../assets/achievements/7.png'),
    rewards: [
      'Complimentary tour at any available museum, historic site, or manufacturer for yourself and/or family',
      'Invitation to exclusive member-only events',
      'Complimentary members gift of the year',
      'Exclusive access to limited-edition items & pre-sale drops',
      'Digital Challenge Coin',
    ],
  },
  {
    id: 'legendary_historian',
    name: 'Legendary Historian',
    minPoints: 5000,
    maxPoints: 9999,
    color: '#b91c1c',
    icon: 'star',
    image: require('../assets/achievements/8.png'),
    rewards: [
      'Premium Historia branded Made in USA T-shirt or Sweatshirt',
      'Invitation to exclusive member-only events',
      'Complimentary members gift of the year',
      'Exclusive access to limited-edition items & pre-sale drops',
      'Digital Challenge Coin',
    ],
  },
  {
    id: 'eternal_steward',
    name: 'Eternal Steward',
    minPoints: 10000,
    maxPoints: null,
    color: '#92400e',
    icon: 'crown',
    image: require('../assets/achievements/9.png'),
    rewards: [
      'Lifetime 15% off all future purchases at shophistoria.com',
      'Eternal Steward Certificate & Physical Historia Challenge Coin',
      'Permanent top-tier status',
      'Invitations to exclusive "Eternal Steward Circle" events and advisory input opportunities',
      'Personalized legacy name recognition on the Historia Eternal Steward Cup',
      'Complimentary members gift of the year',
      'Exclusive access to limited-edition items & pre-sale drops',
      'Digital Challenge Coin',
    ],
  },
];

/** Returns the LevelDef the user currently occupies. */
export function getLevelForPoints(points: number): LevelDef {
  // Walk backwards so we find the highest qualifying level
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

/** Returns the next level, or null if at max. */
export function getNextLevel(currentLevel: LevelDef): LevelDef | null {
  const idx = LEVELS.findIndex(l => l.id === currentLevel.id);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

/** 0–1 progress fraction within the current level's point range. */
export function getLevelProgress(points: number, level: LevelDef): number {
  if (level.maxPoints === null) return 1; // Eternal Steward — maxed out
  const range = level.maxPoints - level.minPoints + 1;
  const earned = points - level.minPoints;
  return Math.min(1, Math.max(0, earned / range));
}
