export interface ScratcherCell {
  symbol: string;
  label: string;
  prize: number;
  isInstant: boolean;
}

export interface ScratcherTicket {
  id: number;
  themeTitle: string;
  themeSubtitle: string;
  accentColor: string;
  foilColor: string;
  cells: ScratcherCell[]; // 9 cells in a 3x3 grid
  winAmount: number;
  winReason: string;
  scratched: boolean;
}

interface TicketTheme {
  title: string;
  subtitle: string;
  accent: string;
  foil: string;
}

const THEMES: TicketTheme[] = [
  {
    title: 'WEABER VALLEY MILLIONS',
    subtitle: 'Match 3 Symbols or Uncover 👑 Jugman!',
    accent: '#f59e0b',
    foil: '#d4af37',
  },
  {
    title: 'GOLDEN JUG JACKPOT',
    subtitle: 'Official Celina 52 Urine Exchange Ticket',
    accent: '#eab308',
    foil: '#c0c7d1',
  },
  {
    title: "BLIND DONNY'S LUCKY FORKLIFT",
    subtitle: 'He Can Smell a $20 Bill From 50 Feet!',
    accent: '#22c55e',
    foil: '#a8b5c2',
  },
  {
    title: "NEVAEH'S BONUS HOLE $500",
    subtitle: 'Crossville TN · Est. 1952 · No Refunds!',
    accent: '#ec4899',
    foil: '#e2b857',
  },
  {
    title: 'I-40 LOT LIZARD LOOT',
    subtitle: 'Cash In At Colby’s Counter Immediately!',
    accent: '#38bdf8',
    foil: '#b8c4d0',
  },
];

const SYMBOLS: Array<{ symbol: string; label: string; prize: number }> = [
  { symbol: '🥤', label: 'PISS JUG', prize: 5 },
  { symbol: '🦝', label: 'RACCOON', prize: 10 },
  { symbol: '🚛', label: '18-WHEELER', prize: 20 },
  { symbol: '🛸', label: 'UFO BEAM', prize: 50 },
  { symbol: '💵', label: 'CASH STACK', prize: 100 },
  { symbol: '👑', label: 'JUGMAN!', prize: 500 },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Calculates how many scratcher tickets Colby hands you at the gas station counter
 * based on jugs collected and final shift score.
 */
export function computeTicketCount(totalJugs: number, score: number): number {
  const fromJugs = Math.floor(totalJugs / 6);
  const fromScore = Math.floor(score / 450);
  return Math.max(2, Math.min(8, Math.max(fromJugs, fromScore) + 1));
}

/**
 * Generates a stack of comedic Celina 52 scratch-off lotto tickets.
 * Higher scores gently boost odds of juicy wins so playing well pays off in real cash!
 */
export function generateScratcherTickets(count: number, score: number): ScratcherTicket[] {
  const luckBoost = Math.min(0.22, score / 12000);
  const tickets: ScratcherTicket[] = [];

  for (let t = 0; t < count; t++) {
    const theme = THEMES[t % THEMES.length];
    const roll = Math.random();
    const winThreshold = 0.52 + luckBoost; // ~52%–74% chance each ticket wins something fun!

    const cells: ScratcherCell[] = [];
    let winAmount = 0;
    let winReason = 'DUD TICKET — Better luck next shift!';

    if (roll < winThreshold) {
      // Pick winning tier (higher score boosts big prizes!)
      const tierRoll = Math.random() - luckBoost * 0.45;
      let winSym = SYMBOLS[0];
      if (tierRoll < 0.04) {
        winSym = SYMBOLS[5]; // $500 Piss Jugman Jackpot!
      } else if (tierRoll < 0.14) {
        winSym = SYMBOLS[4]; // $100 Cash Stack
      } else if (tierRoll < 0.30) {
        winSym = SYMBOLS[3]; // $50 UFO Beam
      } else if (tierRoll < 0.54) {
        winSym = SYMBOLS[2]; // $20 18-Wheeler
      } else if (tierRoll < 0.78) {
        winSym = SYMBOLS[1]; // $10 Raccoon
      } else {
        winSym = SYMBOLS[0]; // $5 Piss Jug
      }

      // Place 3 matching winning symbols
      for (let k = 0; k < 3; k++) {
        cells.push({
          symbol: winSym.symbol,
          label: winSym.label,
          prize: winSym.prize,
          isInstant: false,
        });
      }

      // Fill remaining 6 slots with non-3-of-a-kind decoys (at most 2 of any other symbol)
      const others = SYMBOLS.filter((s) => s.symbol !== winSym.symbol);
      const counts = new Map<string, number>();
      while (cells.length < 9) {
        const pick = others[Math.floor(Math.random() * others.length)];
        const c = counts.get(pick.symbol) ?? 0;
        if (c < 2) {
          counts.set(pick.symbol, c + 1);
          cells.push({
            symbol: pick.symbol,
            label: pick.label,
            prize: pick.prize,
            isInstant: false,
          });
        }
      }

      winAmount = winSym.prize;
      winReason = `3x ${winSym.symbol} ${winSym.label} — YOU WON $${winAmount}!`;
    } else {
      // Losing ticket — ensure no symbol appears 3 times (max 2 of each)
      const counts = new Map<string, number>();
      while (cells.length < 9) {
        const pick = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        const c = counts.get(pick.symbol) ?? 0;
        if (c < 2) {
          counts.set(pick.symbol, c + 1);
          cells.push({
            symbol: pick.symbol,
            label: pick.label,
            prize: pick.prize,
            isInstant: false,
          });
        }
      }
    }

    tickets.push({
      id: t + 1,
      themeTitle: theme.title,
      themeSubtitle: theme.subtitle,
      accentColor: theme.accent,
      foilColor: theme.foil,
      cells: shuffle(cells),
      winAmount,
      winReason,
      scratched: false,
    });
  }

  // Guarantee at least one winning ticket if player earned 3+ tickets so scratching always feels rewarding!
  if (count >= 3 && tickets.every((tk) => tk.winAmount === 0)) {
    const lucky = tickets[tickets.length - 1];
    const winSym = SYMBOLS[1]; // $10 Raccoon
    lucky.cells[0] = { symbol: winSym.symbol, label: winSym.label, prize: winSym.prize, isInstant: false };
    lucky.cells[4] = { symbol: winSym.symbol, label: winSym.label, prize: winSym.prize, isInstant: false };
    lucky.cells[8] = { symbol: winSym.symbol, label: winSym.label, prize: winSym.prize, isInstant: false };
    lucky.winAmount = winSym.prize;
    lucky.winReason = `3x ${winSym.symbol} ${winSym.label} — YOU WON $${winSym.prize}!`;
  }

  return tickets;
}
