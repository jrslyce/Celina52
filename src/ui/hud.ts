import type { View3D } from '@pixi/3d';
import { Point } from 'pixi.js';
import type { SoundFx } from '../audio/soundFx';
import { CAST_GALLERY_ENTRIES, CastGalleryViewer } from '../render/castGallery';
import type { CastPortraitMap } from '../render/castPortraits';
import { getNearbyAction, getShiftGrade } from '../sim/gameSim';
import { COUNTER_POS } from '../sim/layout';
import {
  fetchGlobalLeaderboard,
  loadSavedInitials,
  sanitizeInitials,
  submitGlobalScore,
  type LeaderboardEntry,
} from '../sim/leaderboard';
import {
  UPGRADE_CATALOG,
  type PlayerProgression,
  type UpgradeId,
} from '../sim/progression';
import {
  computeTicketCount,
  generateScratcherTickets,
  type ScratcherTicket,
} from '../sim/scratcher';
import type { GameState, PlayableWorkerId, VoiceClipId } from '../sim/types';
import { ScratcherUiController } from './scratcherUi';

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
}

export interface HudCallbacks {
  onStartShift: (worker: PlayableWorkerId) => void;
  onBackToTitle: () => void;
  onToggleMute: () => boolean;
  onToggleMusic: () => boolean;
  onPreviewWorker: (worker: PlayableWorkerId) => void;
  onPlayVoiceClip: (clipId: VoiceClipId) => void;
  onBuyUpgrade: (id: UpgradeId) => void;
  onScratcherComplete: (cashWon: number) => void;
}

export class GameHud {
  private readonly studioIntro = document.getElementById('studio-intro');
  private readonly titleScreen = document.getElementById('title-screen')!;
  private readonly gameHud = document.getElementById('game-hud')!;
  private readonly scratcherScreen = document.getElementById('scratcher-screen')!;
  private readonly gameoverScreen = document.getElementById('gameover-screen')!;
  private readonly worldLabels = document.getElementById('world-labels')!;
  private readonly bigRunArrow = document.getElementById('big-run-arrow')!;
  private readonly bigRunArrowSvg = document.getElementById('big-run-arrow-svg')!;
  private readonly bigRunArrowIcon = document.getElementById('big-run-arrow-icon')!;
  private readonly bigRunArrowLabel = document.getElementById('big-run-arrow-label')!;

  private readonly titleBestScoreEl = document.getElementById('title-best-score')!;
  private readonly titleCashEl = document.getElementById('title-cash')!;

  private readonly shopDialog = document.getElementById('shop-dialog') as HTMLDialogElement;
  private readonly shopCashEl = document.getElementById('shop-cash-balance')!;
  private readonly shopListEl = document.getElementById('shop-upgrades-list')!;

  private readonly castDialog = document.getElementById('cast-dialog') as HTMLDialogElement;
  private readonly castStageHost = document.getElementById('cast-3d-stage')!;
  private readonly castNameEl = document.getElementById('cast-model-name')!;
  private readonly castRoleEl = document.getElementById('cast-model-role')!;
  private readonly castBioEl = document.getElementById('cast-model-bio')!;
  private readonly castPillsEl = document.getElementById('cast-pills')!;
  private readonly castVoiceBtn = document.getElementById('cast-voice-btn') as HTMLButtonElement;

  private readonly clockEl = document.getElementById('hud-clock')!;
  private readonly scoreEl = document.getElementById('hud-score')!;
  private readonly jugsEl = document.getElementById('hud-jugs')!;
  private readonly comboEl = document.getElementById('hud-combo')!;
  private readonly musicBtn = document.getElementById('music-btn') as HTMLButtonElement;
  private readonly muteBtn = document.getElementById('mute-btn') as HTMLButtonElement;

  private readonly eventBanner = document.getElementById('event-banner')!;
  private readonly voiceBanner = document.getElementById('voice-banner')!;
  private readonly voiceAvatar = document.getElementById('voice-avatar') as HTMLImageElement;
  private readonly voiceNameEl = document.getElementById('voice-name')!;
  private readonly voiceTextEl = document.getElementById('voice-text')!;

  private readonly actionBtn = document.getElementById('action-btn') as HTMLButtonElement;

  private readonly scratcherColbyImg = document.getElementById('scratcher-colby-img') as HTMLImageElement;
  private readonly scratcherSummaryEl = document.getElementById('scratcher-summary-line')!;

  private readonly reportJugmanImg = document.getElementById('report-jugman-img') as HTMLImageElement;
  private readonly reportGradeEl = document.getElementById('report-grade')!;
  private readonly reportVerdictEl = document.getElementById('report-verdict')!;
  private readonly reportCashBadgeEl = document.getElementById('report-cash-badge')!;
  private readonly statScoreEl = document.getElementById('stat-score')!;
  private readonly statCashEl = document.getElementById('stat-cash')!;
  private readonly statJugsEl = document.getElementById('stat-jugs')!;
  private readonly statBrawlsEl = document.getElementById('stat-brawls')!;

  private readonly initialsForm = document.getElementById('initials-form') as HTMLFormElement;
  private readonly initialsInput = document.getElementById('player-initials') as HTMLInputElement;
  private readonly saveInitialsBtn = document.getElementById('save-initials-btn') as HTMLButtonElement;
  private readonly initialsStatusEl = document.getElementById('initials-status')!;
  private readonly leaderboardListEl = document.getElementById('leaderboard-list')!;
  private readonly leaderboardRankPillEl = document.getElementById('leaderboard-rank-pill')!;

  private readonly titleNevaehImg = document.getElementById('title-nevaeh-img') as HTMLImageElement;
  private readonly titleJanitorImg = document.getElementById('title-janitor-img') as HTMLImageElement;
  private readonly titleRodneyImg = document.getElementById('title-rodney-img') as HTMLImageElement;

  private portraits: Partial<CastPortraitMap> = {};
  private selectedWorker: PlayableWorkerId = 'nevaeh';
  private lastPhase = '';
  private lastCalloutId = -1;
  private castGallery: CastGalleryViewer;
  private activeCastIndex = 0;
  private scratcherUi: ScratcherUiController;

  // Global Hall of Fame Leaderboard state
  private latestShiftSnapshot: {
    score: number;
    cashWon: number;
    grade: string;
    jugsCollected: number;
    brawlsWon: number;
    worker: PlayableWorkerId;
  } | null = null;
  private leaderboardEntries: LeaderboardEntry[] = [];
  private submittedEntryId: number | null = null;
  private submittedRank: number | null = null;
  private isSubmittingScore = false;

  private readonly _screenPt = new Point();
  private readonly tagPool: HTMLDivElement[] = [];
  private readonly popPool: HTMLDivElement[] = [];

  constructor(
    soundFx: SoundFx,
    private readonly callbacks: HudCallbacks,
  ) {
    this.initStudioIntro();
    this.initDialogLightDismissFallback(this.shopDialog);
    this.initDialogLightDismissFallback(this.castDialog);

    this.castGallery = new CastGalleryViewer(this.castStageHost);
    this.initCastGalleryUi();
    this.initLeaderboardForm();

    this.scratcherUi = new ScratcherUiController(soundFx, {
      onTicketRevealed: (tk: ScratcherTicket) => {
        if (tk.winAmount >= 50) {
          this.callbacks.onPlayVoiceClip('colby_jackpot');
        }
      },
      onAllFinished: (totalCashWon: number) => {
        this.callbacks.onScratcherComplete(totalCashWon);
      },
    });

    // Worker picker buttons
    const workerBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('.worker-option'));
    for (const btn of workerBtns) {
      btn.addEventListener('click', () => {
        this.selectedWorker = btn.dataset.worker as PlayableWorkerId;
        for (const b of workerBtns) {
          const active = b === btn;
          b.classList.toggle('is-selected', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
        callbacks.onPreviewWorker(this.selectedWorker);
      });
    }

    document.getElementById('start-shift-btn')!.addEventListener('click', () => {
      callbacks.onStartShift(this.selectedWorker);
    });
    document.getElementById('replay-btn')!.addEventListener('click', () => {
      callbacks.onStartShift(this.selectedWorker);
    });
    document.getElementById('back-title-btn')!.addEventListener('click', () => {
      callbacks.onBackToTitle();
    });
    document.getElementById('open-shop-btn')!.addEventListener('click', () => {
      this.shopDialog.showModal();
    });
    document.getElementById('report-shop-btn')!.addEventListener('click', () => {
      this.shopDialog.showModal();
    });
    document.getElementById('open-cast-btn')!.addEventListener('click', async () => {
      this.castDialog.showModal();
      await this.castGallery.ensureInit();
      this.selectCastEntry(this.activeCastIndex);
    });

    this.musicBtn.addEventListener('click', () => {
      const muted = callbacks.onToggleMusic();
      this.musicBtn.classList.toggle('is-muted', muted);
      this.musicBtn.innerHTML = `<span aria-hidden="true">${muted ? '🔕' : '🎵'}</span>`;
    });
    this.muteBtn.addEventListener('click', () => {
      const muted = callbacks.onToggleMute();
      this.muteBtn.classList.toggle('is-muted', muted);
      this.muteBtn.innerHTML = `<span aria-hidden="true">${muted ? '🔇' : '🔊'}</span>`;
    });
  }

  private initStudioIntro(): void {
    const intro = this.studioIntro;
    if (!intro) return;

    let melting = false;
    let holdTimer: number | null = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const triggerMelt = () => {
      if (melting) return;
      melting = true;
      if (holdTimer !== null) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
      intro.classList.add('is-melting');
      window.setTimeout(() => {
        intro.classList.add('hidden');
      }, reducedMotion ? 360 : 960);
    };

    holdTimer = window.setTimeout(triggerMelt, reducedMotion ? 1100 : 2200);
    intro.addEventListener('click', triggerMelt);
    window.addEventListener(
      'keydown',
      (e) => {
        if (!melting && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')) {
          triggerMelt();
        }
      },
      { once: true },
    );
  }

  private initDialogLightDismissFallback(dialog: HTMLDialogElement): void {
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const isOutside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      dialog.addEventListener('pointerdown', (e) => {
        pressedOutside = isOutside(e);
      });
      dialog.addEventListener('pointerup', (e) => {
        if (pressedOutside && isOutside(e)) dialog.close();
      });
    }
    dialog.addEventListener('close', () => {
      dialog.returnValue = '';
    });
  }

  private initCastGalleryUi(): void {
    this.castPillsEl.innerHTML = '';
    CAST_GALLERY_ENTRIES.forEach((entry, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cast-pill';
      btn.textContent = entry.name;
      btn.addEventListener('click', () => this.selectCastEntry(idx));
      this.castPillsEl.appendChild(btn);
    });

    this.castVoiceBtn.addEventListener('click', () => {
      const entry = CAST_GALLERY_ENTRIES[this.activeCastIndex];
      if (entry?.voiceClip) {
        this.callbacks.onPlayVoiceClip(entry.voiceClip);
      }
    });
  }

  private selectCastEntry(idx: number): void {
    this.activeCastIndex = idx;
    const entry = CAST_GALLERY_ENTRIES[idx];
    if (!entry) return;
    this.castNameEl.textContent = entry.name;
    this.castRoleEl.textContent = entry.role;
    this.castBioEl.textContent = entry.bio;
    this.castVoiceBtn.disabled = !entry.voiceClip;
    this.castGallery.showEntry(entry);

    const pills = Array.from(this.castPillsEl.querySelectorAll<HTMLButtonElement>('.cast-pill'));
    pills.forEach((p, i) => p.classList.toggle('is-active', i === idx));
  }

  public setPortraits(map: CastPortraitMap): void {
    this.portraits = map;
    this.titleNevaehImg.src = map.nevaeh;
    this.titleJanitorImg.src = map.janitor;
    this.titleRodneyImg.src = map.rodney;
    this.scratcherColbyImg.src = map.colby;
    this.reportJugmanImg.src = map.piss_jugman;
  }

  public setVoiceSpeaking(speaking: boolean): void {
    this.voiceBanner.classList.toggle('is-speaking', speaking);
  }

  public syncProgression(prog: PlayerProgression): void {
    this.titleBestScoreEl.textContent = String(prog.bestScore);
    this.titleCashEl.textContent = `$${prog.cashBalance}`;
    this.shopCashEl.textContent = `$${prog.cashBalance}`;

    this.shopListEl.innerHTML = '';
    for (const def of UPGRADE_CATALOG) {
      const owned = prog.upgrades[def.id];
      const canBuy = !owned && prog.cashBalance >= def.cost;
      const card = document.createElement('div');
      card.className = `shop-item ${owned ? 'is-owned' : ''}`;
      card.innerHTML = `
        <div class="shop-item-icon" aria-hidden="true">${def.icon}</div>
        <div class="shop-item-info">
          <strong>${def.name}</strong>
          <small>${def.desc}</small>
        </div>
        <button type="button" class="shop-buy-btn" ${owned || !canBuy ? 'disabled' : ''}>
          ${owned ? 'OWNED' : `$${def.cost}`}
        </button>
      `;
      const btn = card.querySelector('button')!;
      if (!owned) {
        btn.addEventListener('click', () => this.callbacks.onBuyUpgrade(def.id));
      }
      this.shopListEl.appendChild(card);
    }
  }

  public enterScratcherPhase(state: GameState): void {
    const ticketCount = computeTicketCount(state.totalJugsCollected, state.score);
    const tickets = generateScratcherTickets(ticketCount, state.score);
    this.scratcherSummaryEl.textContent =
      `You collected ${state.totalJugsCollected} piss jugs (${state.score} pts) → Colby hands you ${ticketCount} Scratch-Off Lotto Tickets!`;
    this.scratcherUi.startSession(tickets);
  }

  public showGameOverReport(state: GameState, cashWon: number): void {
    const { grade, verdict } = getShiftGrade(state.score, cashWon);
    const totalBrawls = state.brawlsWon + state.aliensRepelled;
    this.reportGradeEl.textContent = grade;
    this.reportVerdictEl.textContent = verdict;
    this.reportCashBadgeEl.textContent = `💵 +$${cashWon} REAL MONEY WON!`;
    this.statScoreEl.textContent = String(state.score);
    this.statCashEl.textContent = `$${cashWon}`;
    this.statJugsEl.textContent = String(state.totalJugsCollected);
    this.statBrawlsEl.textContent = String(totalBrawls);

    // Prepare 3-letter initials form & load Global Hall of Fame!
    this.latestShiftSnapshot = {
      score: state.score,
      cashWon,
      grade,
      jugsCollected: state.totalJugsCollected,
      brawlsWon: totalBrawls,
      worker: state.workerChoice,
    };
    this.submittedEntryId = null;
    this.submittedRank = null;
    this.isSubmittingScore = false;
    this.initialsInput.disabled = false;
    this.initialsInput.value = loadSavedInitials();
    this.initialsInput.removeAttribute('aria-invalid');
    this.saveInitialsBtn.disabled = false;
    this.saveInitialsBtn.classList.remove('is-saved');
    this.saveInitialsBtn.textContent = 'POST SCORE';
    this.initialsStatusEl.textContent = '';
    this.initialsStatusEl.classList.remove('is-error');

    void this.loadGlobalLeaderboard();
  }

  private initLeaderboardForm(): void {
    this.initialsInput.addEventListener('input', () => {
      const cleaned = sanitizeInitials(this.initialsInput.value);
      if (this.initialsInput.value !== cleaned) {
        this.initialsInput.value = cleaned;
      }
      this.initialsInput.setCustomValidity('');
      this.initialsInput.removeAttribute('aria-invalid');
      if (this.initialsStatusEl.classList.contains('is-error')) {
        this.initialsStatusEl.textContent = '';
        this.initialsStatusEl.classList.remove('is-error');
      }
    });

    this.initialsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (this.isSubmittingScore || this.submittedEntryId !== null || !this.latestShiftSnapshot) return;

      const initials = sanitizeInitials(this.initialsInput.value);
      this.initialsInput.value = initials;
      if (initials.length !== 3) {
        this.initialsInput.setAttribute('aria-invalid', 'true');
        this.initialsStatusEl.classList.add('is-error');
        this.initialsStatusEl.textContent = 'Please enter 3 letters or numbers (e.g. PJM).';
        this.initialsInput.focus();
        return;
      }

      this.isSubmittingScore = true;
      this.saveInitialsBtn.disabled = true;
      this.saveInitialsBtn.textContent = 'POSTING…';
      this.initialsStatusEl.classList.remove('is-error');
      this.initialsStatusEl.textContent = 'Posting to Celina 52 Global Hall of Fame…';

      try {
        const snap = this.latestShiftSnapshot;
        const res = await submitGlobalScore({
          initials,
          score: snap.score,
          cashWon: snap.cashWon,
          grade: snap.grade,
          jugsCollected: snap.jugsCollected,
          brawlsWon: snap.brawlsWon,
          worker: snap.worker,
        });
        this.submittedEntryId = res.entry.id;
        this.submittedRank = res.rank;
        this.leaderboardEntries = res.entries;
        this.renderLeaderboard();

        this.initialsInput.disabled = true;
        this.saveInitialsBtn.classList.add('is-saved');
        this.saveInitialsBtn.textContent = 'POSTED!';
        this.initialsStatusEl.textContent = `🏆 Posted! ${initials} is #${res.rank} globally!`;
      } catch (err) {
        this.saveInitialsBtn.disabled = false;
        this.saveInitialsBtn.textContent = 'POST SCORE';
        this.initialsStatusEl.classList.add('is-error');
        this.initialsStatusEl.textContent =
          err instanceof Error ? err.message : 'Could not post score — try again.';
      } finally {
        this.isSubmittingScore = false;
      }
    });
  }

  private async loadGlobalLeaderboard(): Promise<void> {
    this.leaderboardListEl.innerHTML = '<li class="lb-empty">Loading global scores…</li>';
    this.leaderboardRankPillEl.classList.add('hidden');
    try {
      this.leaderboardEntries = await fetchGlobalLeaderboard();
      this.renderLeaderboard();
    } catch {
      this.leaderboardListEl.innerHTML =
        '<li class="lb-empty">Could not reach global leaderboard right now.</li>';
    }
  }

  private renderLeaderboard(): void {
    this.leaderboardListEl.innerHTML = '';
    if (this.submittedRank !== null) {
      this.leaderboardRankPillEl.classList.remove('hidden');
      this.leaderboardRankPillEl.textContent = `YOU: #${this.submittedRank}`;
    } else {
      this.leaderboardRankPillEl.classList.add('hidden');
    }

    if (this.leaderboardEntries.length === 0) {
      this.leaderboardListEl.innerHTML = '<li class="lb-empty">No scores posted yet — claim #1!</li>';
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    let highlightedLi: HTMLLIElement | null = null;

    this.leaderboardEntries.forEach((entry, idx) => {
      const li = document.createElement('li');
      const isMe = this.submittedEntryId !== null && entry.id === this.submittedEntryId;
      li.className = `lb-row${isMe ? ' is-current' : ''}`;

      const rankSpan = document.createElement('span');
      rankSpan.className = 'lb-rank';
      rankSpan.textContent = medals[idx] ?? `#${idx + 1}`;

      const initialsSpan = document.createElement('span');
      initialsSpan.className = 'lb-initials';
      initialsSpan.textContent = entry.initials;

      const metaSpan = document.createElement('span');
      metaSpan.className = 'lb-meta';
      metaSpan.textContent = `Grade ${entry.grade} · $${entry.cashWon}`;

      const scoreSpan = document.createElement('span');
      scoreSpan.className = 'lb-score';
      scoreSpan.textContent = String(entry.score);

      li.append(rankSpan, initialsSpan, metaSpan, scoreSpan);
      this.leaderboardListEl.appendChild(li);
      if (isMe) highlightedLi = li;
    });

    if (highlightedLi) {
      (highlightedLi as HTMLLIElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  private getPoolEl(pool: HTMLDivElement[], idx: number, className: string): HTMLDivElement {
    while (pool.length <= idx) {
      const el = document.createElement('div');
      el.className = className;
      this.worldLabels.appendChild(el);
      pool.push(el);
    }
    const el = pool[idx];
    el.className = className;
    el.style.display = 'block';
    return el;
  }

  public sync(state: GameState, view3d: View3D, w: number, h: number): void {
    if (state.phase !== this.lastPhase) {
      this.lastPhase = state.phase;
      this.titleScreen.classList.toggle('hidden', state.phase !== 'title');
      this.gameHud.classList.toggle('hidden', state.phase !== 'playing');
      this.scratcherScreen.classList.toggle('hidden', state.phase !== 'scratcher');
      this.gameoverScreen.classList.toggle('hidden', state.phase !== 'gameover');

      if (state.phase !== 'playing') {
        this.worldLabels.innerHTML = '';
        this.tagPool.length = 0;
        this.popPool.length = 0;
        this.bigRunArrow.classList.add('hidden');
      }
    }

    if (state.phase !== 'playing') return;

    // Top bar stats
    this.clockEl.textContent = formatClock(state.timeRemaining);
    this.clockEl.classList.toggle('is-urgent', state.timeRemaining <= 30);
    this.scoreEl.textContent = String(state.score);
    this.jugsEl.textContent = `${state.player.carriedJugs}/${state.player.carryCap}`;
    this.jugsEl.parentElement!.classList.toggle(
      'is-full',
      state.player.carriedJugs >= state.player.carryCap,
    );

    if (state.player.comboCount >= 2) {
      this.comboEl.textContent = `x${state.player.comboCount}`;
      this.comboEl.classList.remove('hidden');
    } else {
      this.comboEl.classList.add('hidden');
    }

    // Priority Event Banner + Big Directional Run Arrow target!
    let arrowTarget: { x: number; z: number; icon: string; label: string; color: string } | null = null;
    if (state.activeBrawl) {
      const enemyName = {
        raccoon: 'RACCOONS',
        vagrant: 'VAGRANT',
        lot_lizard: 'LOT LIZARD',
        trucker: 'JERRY PETTY',
      }[state.activeBrawl.kind];
      this.eventBanner.textContent = `👊 HELP PISS JUGMAN FIGHT ${enemyName}! (${Math.ceil(state.activeBrawl.timeRemaining)}s)`;
      this.eventBanner.className = 'event-banner is-brawl';
      arrowTarget = {
        x: state.activeBrawl.x,
        z: state.activeBrawl.z,
        icon: '👊',
        label: 'HELP JUGMAN!',
        color: '#fb7185',
      };
    } else if (state.ufo.active && state.ufo.state !== 'fleeing') {
      this.eventBanner.textContent = '🛸 ALIEN UFO STEALING PISS JUGS! RUN IN & BONK HIM!';
      this.eventBanner.className = 'event-banner is-ufo';
      arrowTarget = {
        x: state.ufo.alienOut ? state.ufo.alienX : state.ufo.x,
        z: state.ufo.alienOut ? state.ufo.alienZ : state.ufo.z,
        icon: '🛸',
        label: 'BONK ALIEN!',
        color: '#4ade80',
      };
    } else if (state.truckerFight && !state.truckerFight.brokenUp) {
      this.eventBanner.textContent = '🚔 TRUCKER FIGHT! STATE TROOPERS ROLLING IN!';
      this.eventBanner.className = 'event-banner is-police';
      arrowTarget = {
        x: state.truckerFight.x,
        z: state.truckerFight.z,
        icon: '🚨',
        label: 'TRUCKER FIGHT!',
        color: '#38bdf8',
      };
    } else if (state.player.carriedJugs >= state.player.carryCap) {
      this.eventBanner.textContent = '🎟️ ARMS FULL! RUN TO COLBY’S COUNTER TO CASH IN!';
      this.eventBanner.className = 'event-banner is-cashin';
      arrowTarget = {
        x: COUNTER_POS.x,
        z: COUNTER_POS.z,
        icon: '🎟️',
        label: 'CASH IN JUGS!',
        color: '#4ade80',
      };
    } else if (state.timeRemaining <= 30) {
      this.eventBanner.textContent = '🔥 FINAL 30 SECONDS! 2X PISS JUG RUSH!';
      this.eventBanner.className = 'event-banner is-brawl';
    } else {
      this.eventBanner.className = 'event-banner hidden';
    }

    // Update Big Run Arrow pointing toward urgent action!
    if (arrowTarget) {
      const dx = arrowTarget.x - state.player.x;
      const dz = arrowTarget.z - state.player.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 3.2) {
        this.bigRunArrow.classList.remove('hidden');
        this.bigRunArrowIcon.textContent = arrowTarget.icon;
        this.bigRunArrowLabel.textContent = arrowTarget.label;
        const angDeg = (Math.atan2(dz, dx) * 180) / Math.PI;
        this.bigRunArrowSvg.style.transform = `rotate(${angDeg.toFixed(1)}deg)`;
        this.bigRunArrowSvg.style.color = arrowTarget.color;
      } else {
        this.bigRunArrow.classList.add('hidden');
      }
    } else {
      this.bigRunArrow.classList.add('hidden');
    }

    // Cast Voice Callout Pop-In
    if (state.voiceCallout) {
      this.voiceBanner.classList.remove('hidden');
      if (state.voiceCallout.id !== this.lastCalloutId) {
        this.lastCalloutId = state.voiceCallout.id;
        this.voiceNameEl.textContent = `${state.voiceCallout.speakerName} · ${state.voiceCallout.speakerRole}`;
        this.voiceTextEl.textContent = state.voiceCallout.text;
        const src = this.portraits[state.voiceCallout.speaker];
        if (src) this.voiceAvatar.src = src;
      }
    } else {
      this.voiceBanner.classList.add('hidden');
    }

    // Contextual Big Action Button (Punch / Bonk Alien / Break Up Fight / Cash In)
    const nearby = getNearbyAction(state);
    if (nearby) {
      this.actionBtn.classList.remove('hidden');
      this.actionBtn.textContent = `${nearby.icon} ${nearby.label}`;
      this.actionBtn.dataset.kind = nearby.kind;
    } else {
      this.actionBtn.classList.add('hidden');
    }

    // Project 3D -> 2D World Tags (Colby Counter, Piss Jugman, Active Brawl, Alien, Police)
    let tagIdx = 0;
    const projectTag = (wx: number, wy: number, wz: number, text: string, cls: string) => {
      const pt = view3d.worldToScreen({ x: wx, y: wy, z: wz }, this._screenPt);
      if (!pt || pt.x < -60 || pt.x > w + 60 || pt.y < -40 || pt.y > h + 40) return;
      const el = this.getPoolEl(this.tagPool, tagIdx++, `world-tag ${cls}`);
      el.textContent = text;
      el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    };

    if (state.player.carriedJugs > 0) {
      projectTag(COUNTER_POS.x, 2.8, COUNTER_POS.z - 0.8, `🎟️ CASH IN (${state.player.carriedJugs})`, 'is-cashin');
    }
    if (state.activeBrawl) {
      const remaining = state.activeBrawl.enemies.filter((e) => e.state === 'fighting').length;
      projectTag(state.activeBrawl.x, 3.1, state.activeBrawl.z, `👊 HELP JUGMAN! (${remaining} LEFT)`, 'is-brawl');
    } else {
      projectTag(state.jugman.x, 2.95, state.jugman.z, '👑 PISS JUGMAN', 'is-jugman');
    }
    if (state.ufo.active && state.ufo.alienOut) {
      projectTag(state.ufo.alienX, 2.2, state.ufo.alienZ, `🛸 BONK ALIEN! (HP ${state.ufo.alienHp})`, 'is-ufo');
    }
    if (state.truckerFight && !state.truckerFight.brokenUp) {
      projectTag(state.truckerFight.x, 2.4, state.truckerFight.z, '🥊 TRUCKER FIGHT!', 'is-police');
    }
    if (state.forklift.active) {
      projectTag(state.forklift.x, 2.8, state.forklift.z, '🚜 BLIND DONNY!', 'is-jugman');
    }
    for (let i = tagIdx; i < this.tagPool.length; i++) {
      this.tagPool[i].style.display = 'none';
    }

    // Floating score / comedy popups
    let popIdx = 0;
    for (const pop of state.pops) {
      const pt = view3d.worldToScreen({ x: pop.x, y: pop.y, z: pop.z }, this._screenPt);
      if (!pt) continue;
      const el = this.getPoolEl(this.popPool, popIdx++, 'world-pop');
      el.textContent = pop.text;
      el.style.color = pop.color;
      el.style.opacity = String(Math.max(0, 1 - pop.age / pop.duration));
      el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    }
    for (let i = popIdx; i < this.popPool.length; i++) {
      this.popPool[i].style.display = 'none';
    }
  }
}
