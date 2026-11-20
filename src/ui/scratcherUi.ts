import type { SoundFx } from '../audio/soundFx';
import type { ScratcherTicket } from '../sim/scratcher';

export interface ScratcherCallbacks {
  onTicketRevealed: (ticket: ScratcherTicket) => void;
  onAllFinished: (totalCashWon: number) => void;
}

/**
 * Interactive Metallic Foil Scratch-Off Lotto Ticket controller!
 * Players rub the canvas with mouse or finger to scrape off shiny foil over the 3x3 prize grid!
 */
export class ScratcherUiController {
  private readonly titleEl = document.getElementById('scratcher-ticket-title')!;
  private readonly subtitleEl = document.getElementById('scratcher-ticket-sub')!;
  private readonly counterEl = document.getElementById('scratcher-ticket-counter')!;
  private readonly cashTotalEl = document.getElementById('scratcher-cash-total')!;
  private readonly resultBannerEl = document.getElementById('scratcher-result-banner')!;
  private readonly gridEl = document.getElementById('scratcher-symbols-grid')!;
  private readonly canvas = document.getElementById('scratcher-foil-canvas') as HTMLCanvasElement;
  private readonly ctx = this.canvas.getContext('2d')!;
  private readonly revealBtn = document.getElementById('scratcher-reveal-btn') as HTMLButtonElement;
  private readonly nextBtn = document.getElementById('scratcher-next-btn') as HTMLButtonElement;

  private tickets: ScratcherTicket[] = [];
  private currentIndex = 0;
  private totalCashWon = 0;
  private scratching = false;
  private lastPt: { x: number; y: number } | null = null;
  private strokeCount = 0;
  private revealedCurrent = false;

  constructor(
    private readonly soundFx: SoundFx,
    private readonly callbacks: ScratcherCallbacks,
  ) {
    this.bindEvents();
  }

  private bindEvents(): void {
    const getPos = (e: PointerEvent) => {
      const r = this.canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / Math.max(1, r.width)) * this.canvas.width,
        y: ((e.clientY - r.top) / Math.max(1, r.height)) * this.canvas.height,
      };
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.revealedCurrent) return;
      e.preventDefault();
      this.canvas.setPointerCapture(e.pointerId);
      this.scratching = true;
      const pt = getPos(e);
      this.lastPt = pt;
      this.scrape(pt.x, pt.y, pt.x, pt.y);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.scratching || this.revealedCurrent) return;
      e.preventDefault();
      const pt = getPos(e);
      if (this.lastPt) {
        this.scrape(this.lastPt.x, this.lastPt.y, pt.x, pt.y);
      }
      this.lastPt = pt;
    });

    const end = () => {
      this.scratching = false;
      this.lastPt = null;
    };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);

    this.revealBtn.addEventListener('click', () => {
      this.revealCurrentTicket();
    });

    this.nextBtn.addEventListener('click', () => {
      if (this.currentIndex + 1 < this.tickets.length) {
        this.currentIndex++;
        this.renderCurrentTicket();
      } else {
        this.callbacks.onAllFinished(this.totalCashWon);
      }
    });
  }

  public startSession(tickets: ScratcherTicket[]): void {
    this.tickets = tickets;
    this.currentIndex = 0;
    this.totalCashWon = 0;
    this.cashTotalEl.textContent = '$0';
    this.renderCurrentTicket();
  }

  private renderCurrentTicket(): void {
    const tk = this.tickets[this.currentIndex];
    if (!tk) return;

    this.revealedCurrent = false;
    this.strokeCount = 0;

    this.titleEl.textContent = tk.themeTitle;
    this.titleEl.style.color = tk.accentColor;
    this.subtitleEl.textContent = tk.themeSubtitle;
    this.counterEl.textContent = `TICKET ${this.currentIndex + 1} OF ${this.tickets.length}`;
    this.resultBannerEl.textContent = 'Rub with your finger or mouse to scratch off the foil!';
    this.resultBannerEl.className = 'scratcher-result-banner';

    this.revealBtn.classList.remove('hidden');
    this.nextBtn.classList.add('hidden');
    this.nextBtn.textContent =
      this.currentIndex + 1 < this.tickets.length ? 'NEXT TICKET →' : 'COLLECT REAL CASH & REPORT →';

    // Populate underlying 3x3 prize symbols
    this.gridEl.innerHTML = '';
    for (const cell of tk.cells) {
      const div = document.createElement('div');
      div.className = 'scratch-cell';
      div.innerHTML = `
        <span class="scratch-sym" aria-hidden="true">${cell.symbol}</span>
        <span class="scratch-lbl">${cell.label}</span>
        <strong class="scratch-val">$${cell.prize}</strong>
      `;
      this.gridEl.appendChild(div);
    }

    // Paint shiny metallic scratch-off foil layer over canvas!
    this.paintMetallicFoil(tk.foilColor);
  }

  private paintMetallicFoil(foilColor: string): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);

    // Metallic diagonal sheen gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#e2e8f0');
    grad.addColorStop(0.28, foilColor);
    grad.addColorStop(0.55, '#f8fafc');
    grad.addColorStop(0.8, foilColor);
    grad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle coin-foil sparkle pattern
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let y = 12; y < h; y += 22) {
      for (let x = 12; x < w; x += 28) {
        ctx.fillText('★', x + ((y / 22) % 2) * 14, y);
      }
    }

    // Printed instruction stamped right onto the foil!
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.font = '900 22px Impact, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCRATCH HERE WITH COIN', w / 2, h / 2 - 6);
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.fillText('CELINA 52 OFFICIAL LOTTERY', w / 2, h / 2 + 18);
  }

  private scrape(x0: number, y0: number, x1: number, y1: number): void {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 38;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    this.soundFx.playScratchScrape();
    this.strokeCount++;

    if (this.strokeCount % 7 === 0) {
      this.checkScratchProgress();
    }
  }

  private checkScratchProgress(): void {
    const img = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
    let cleared = 0;
    let total = 0;
    // Sample every 16th pixel for blazing fast 60fps progress check
    for (let i = 3; i < img.length; i += 64) {
      total++;
      if (img[i] < 100) cleared++;
    }
    if (cleared / Math.max(1, total) >= 0.56) {
      this.revealCurrentTicket();
    }
  }

  private revealCurrentTicket(): void {
    if (this.revealedCurrent) return;
    this.revealedCurrent = true;
    const tk = this.tickets[this.currentIndex];
    tk.scratched = true;

    // Wipe remaining foil cleanly!
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (tk.winAmount > 0) {
      this.totalCashWon += tk.winAmount;
      this.cashTotalEl.textContent = `$${this.totalCashWon}`;
      this.resultBannerEl.textContent = `🎉 ${tk.winReason}`;
      this.resultBannerEl.className = 'scratcher-result-banner is-win';
      this.soundFx.playJackpotWin(tk.winAmount >= 100);
    } else {
      this.resultBannerEl.textContent = `😬 ${tk.winReason}`;
      this.resultBannerEl.className = 'scratcher-result-banner is-loss';
      this.soundFx.playDudBuzzer();
    }

    this.revealBtn.classList.add('hidden');
    this.nextBtn.classList.remove('hidden');
    this.callbacks.onTicketRevealed(tk);
  }
}
