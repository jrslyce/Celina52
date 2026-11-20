import type { PlayableWorkerId } from './types';

export type UpgradeId = 'mega_sack' | 'turbo_boots' | 'heavy_bonk' | 'jug_magnet';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  cost: number; // In Real Cash ($) won from scratcher lotto tickets!
  icon: string;
}

export const UPGRADE_CATALOG: UpgradeDef[] = [
  {
    id: 'mega_sack',
    name: 'XL Jug Haul Sack',
    desc: 'Carry +6 more piss jugs per trip before cashing in at Colby’s counter.',
    cost: 25,
    icon: '🎒',
  },
  {
    id: 'turbo_boots',
    name: 'Weaber Turbo Boots',
    desc: '+18% sprinting speed across the asphalt lot.',
    cost: 40,
    icon: '🥾',
  },
  {
    id: 'heavy_bonk',
    name: 'Rodney’s Tactical Taser',
    desc: 'Deal 2X brawl damage when helping Piss Jugman & smacking Aliens!',
    cost: 65,
    icon: '⚡',
  },
  {
    id: 'jug_magnet',
    name: 'Urine Jug Vacuum',
    desc: '+40% wider jug pickup reach so you scoop jugs at full sprint!',
    cost: 90,
    icon: '🧲',
  },
];

export interface PlayerProgression {
  bestScore: number;
  cashBalance: number;
  totalCashWon: number;
  totalJugsCollected: number;
  shiftsCompleted: number;
  selectedWorker: PlayableWorkerId;
  upgrades: Record<UpgradeId, boolean>;
}

const STORAGE_KEY = 'celina52_piss_jug_patrol_v1';

export function loadProgression(): PlayerProgression {
  const fallback: PlayerProgression = {
    bestScore: 0,
    cashBalance: 0,
    totalCashWon: 0,
    totalJugsCollected: 0,
    shiftsCompleted: 0,
    selectedWorker: 'nevaeh',
    upgrades: {
      mega_sack: false,
      turbo_boots: false,
      heavy_bonk: false,
      jug_magnet: false,
    },
  };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PlayerProgression>;
    return {
      bestScore: typeof parsed.bestScore === 'number' ? parsed.bestScore : 0,
      cashBalance: typeof parsed.cashBalance === 'number' ? parsed.cashBalance : 0,
      totalCashWon: typeof parsed.totalCashWon === 'number' ? parsed.totalCashWon : 0,
      totalJugsCollected: typeof parsed.totalJugsCollected === 'number' ? parsed.totalJugsCollected : 0,
      shiftsCompleted: typeof parsed.shiftsCompleted === 'number' ? parsed.shiftsCompleted : 0,
      selectedWorker:
        parsed.selectedWorker === 'nevaeh' ||
        parsed.selectedWorker === 'janitor' ||
        parsed.selectedWorker === 'rodney'
          ? parsed.selectedWorker
          : 'nevaeh',
      upgrades: {
        mega_sack: Boolean(parsed.upgrades?.mega_sack),
        turbo_boots: Boolean(parsed.upgrades?.turbo_boots),
        heavy_bonk: Boolean(parsed.upgrades?.heavy_bonk),
        jug_magnet: Boolean(parsed.upgrades?.jug_magnet),
      },
    };
  } catch {
    return fallback;
  }
}

export function saveProgression(prog: PlayerProgression): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prog));
  } catch {
    // Ignore private-mode storage errors
  }
}
