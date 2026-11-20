import {
  Box,
  Container3D,
  DirectionalLight,
  View3D,
} from '@pixi/3d';
import { Application } from 'pixi.js';
import { SoundFx } from './audio/soundFx';
import { TruckStopMusic } from './audio/truckStopMusic';
import { VoiceSystem } from './audio/voiceSystem';
import { InputController } from './input/controls';
import { renderCastPortraits } from './render/castPortraits';
import { EntitiesRenderer } from './render/entitiesRenderer';
import { createTruckStopScene } from './render/truckStopScene';
import { createGame, startShift, stepGame } from './sim/gameSim';
import { LOT_BOUNDS } from './sim/layout';
import {
  UPGRADE_CATALOG,
  loadProgression,
  saveProgression,
  type PlayerProgression,
} from './sim/progression';
import type { GameModifiers, GameState, PlayableWorkerId } from './sim/types';
import { GameHud } from './ui/hud';

const SIM_FIXED_DT = 1 / 60;

function getModifiers(prog: PlayerProgression): GameModifiers {
  return {
    carryCapBonus: prog.upgrades.mega_sack ? 6 : 0,
    moveSpeedMult: prog.upgrades.turbo_boots ? 1.18 : 1.0,
    brawlPowerMult: prog.upgrades.heavy_bonk ? 2.0 : 1.0,
    pickupRadiusMult: prog.upgrades.jug_magnet ? 1.4 : 1.0,
  };
}

async function boot(): Promise<void> {
  const host = document.getElementById('stage-host');
  if (!host) throw new Error('Missing #stage-host');

  const app = new Application();
  const isWide = window.innerWidth > 900;
  await app.init({
    resizeTo: host,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, isWide ? 1.25 : 1.5),
    autoDensity: true,
    backgroundColor: 0x0b1120,
  });
  host.appendChild(app.canvas);

  // Vibrant Sunset-Neon Highway View3D with ACES tone mapping & crisp shadows
  const view3d = new View3D({
    autoResize: true,
    toneMapping: 'aces',
    exposure: 1.24,
    shadowQuality: 'low',
    shadowFilter: 'pcf',
    environment: {
      skyColor: 0x93c5fd,
      groundColor: 0x3b2c24,
      intensity: 1.22,
    },
    background: {
      skyColor: 0x263c5e,
      groundColor: 0x111827,
      intensity: 1.0,
    },
  });
  app.stage.addChild(view3d);

  const worldRoot = new Container3D({ label: 'Celina52World', parent: view3d.root });

  // Bright warm golden-hour sunlight covering the entire Celina 52 truck stop lot
  const sun = new DirectionalLight({
    color: 0xffebc6,
    intensity: 2.75,
    castShadow: true,
    position: { x: 8, y: 16, z: 10 },
    shadow: {
      bounds: Box.fromCenterSize({ x: 0, y: 1.5, z: 0 }, 40),
      bias: 0.0016,
      normalBias: 0.025,
    },
    parent: worldRoot,
  });
  sun.lookAt({ x: 0, y: 0, z: 0 });

  // Build 3D Celina 52 Truck Stop world & live 3D Cast Portraits!
  const truckStop = createTruckStopScene();
  worldRoot.addChild(truckStop.root);

  const entities = new EntitiesRenderer();
  worldRoot.addChild(entities.root);

  const portraits = await renderCastPortraits(app);

  const progression = loadProgression();
  const state: GameState = createGame(progression.selectedWorker);

  // Audio, Honky-Tonk Diesel Music & Pre-Generated Celina 52 Cast Voices!
  const soundFx = new SoundFx();
  const music = new TruckStopMusic();
  let hudRef: GameHud | null = null;
  const voices = new VoiceSystem((speaking) => {
    hudRef?.setVoiceSpeaking(speaking);
    music.setDucked(speaking);
  });

  const controls = new InputController(
    {
      joystickZone: document.getElementById('joystick-zone')!,
      joystickBase: document.getElementById('joystick-base')!,
      joystickKnob: document.getElementById('joystick-knob')!,
      actionBtn: document.getElementById('action-btn') as HTMLButtonElement,
    },
    () => soundFx.unlock(),
  );

  let lastSpokenCalloutId = -1;
  const speakIfNew = (force = false) => {
    const c = state.voiceCallout;
    if (c && c.id !== lastSpokenCalloutId) {
      if (voices.play(c.clipId, { force })) {
        lastSpokenCalloutId = c.id;
      }
    }
  };

  const hud = new GameHud(soundFx, {
    onStartShift: (worker) => {
      soundFx.unlock();
      voices.stop();
      lastSpokenCalloutId = -1;
      progression.selectedWorker = worker;
      saveProgression(progression);

      startShift(state, worker, getModifiers(progression));
      music.start();
      voices.preload([
        'jugman_help_raccoon',
        'jugman_help_vagrant',
        'jugman_help_lizard',
        'jugman_help_trucker',
        'jugman_win',
        'colby_cashin',
        'colby_scratcher',
        'colby_jackpot',
        'alien_steal',
        'trooper_siren',
        'donny_forklift',
        'dennis_profits',
      ]);
      speakIfNew(true);

      camPos.x = state.player.x;
      camPos.y = 7.2;
      camPos.z = state.player.z + 7.6;
    },
    onBackToTitle: () => {
      voices.stop();
      music.stop();
      const fresh = createGame(state.workerChoice);
      Object.assign(state, fresh);
      state.phase = 'title';
      hud.syncProgression(progression);
    },
    onToggleMute: () => {
      const next = !soundFx.muted;
      soundFx.setMuted(next);
      voices.setMuted(next);
      return next;
    },
    onToggleMusic: () => {
      const next = !music.muted;
      music.setMuted(next);
      return next;
    },
    onPreviewWorker: (worker) => {
      soundFx.unlock();
      state.workerChoice = worker;
      const clipMap: Record<PlayableWorkerId, 'nevaeh_preview' | 'janitor_preview' | 'rodney_preview'> = {
        nevaeh: 'nevaeh_preview',
        janitor: 'janitor_preview',
        rodney: 'rodney_preview',
      };
      voices.play(clipMap[worker], { force: true });
    },
    onPlayVoiceClip: (clipId) => {
      soundFx.unlock();
      voices.play(clipId, { force: true });
    },
    onBuyUpgrade: (id) => {
      const def = UPGRADE_CATALOG.find((u) => u.id === id);
      if (!def || progression.upgrades[id] || progression.cashBalance < def.cost) return;
      progression.cashBalance -= def.cost;
      progression.upgrades[id] = true;
      saveProgression(progression);
      hud.syncProgression(progression);
      soundFx.playJackpotWin(false);
    },
    onScratcherComplete: (cashWon) => {
      progression.cashBalance += cashWon;
      progression.totalCashWon += cashWon;
      progression.totalJugsCollected += state.totalJugsCollected;
      progression.shiftsCompleted += 1;
      if (state.score > progression.bestScore) {
        progression.bestScore = state.score;
      }
      saveProgression(progression);
      hud.syncProgression(progression);
      hud.showGameOverReport(state, cashWon);
      state.phase = 'gameover';
      voices.play(cashWon > 0 ? 'colby_jackpot' : 'colby_bust', { force: true });
    },
  });
  hudRef = hud;
  hud.setPortraits(portraits);
  hud.syncProgression(progression);

  // Camera state
  view3d.camera.fov = 52;
  const camPos = { x: 0, y: 4.2, z: 4.5 };
  const camTarget = { x: 0, y: 1.1, z: -2.0 };

  // Debug / QA handle for live inspection & automated verification
  (window as unknown as Record<string, unknown>).__game = {
    getState: () => state,
    start: (w: PlayableWorkerId = 'nevaeh') => startShift(state, w, getModifiers(progression)),
    triggerBrawl: () => {
      state.nextBrawlCooldown = 0;
    },
    triggerUfo: () => {
      state.nextUfoCooldown = 0;
    },
    triggerFight: () => {
      state.nextFightCooldown = 0;
    },
    triggerLizard: () => {
      state.nextLizardCooldown = 0;
    },
    triggerForklift: () => {
      state.nextForkliftCooldown = 0;
    },
    finishNow: () => {
      state.totalJugsCollected = Math.max(state.totalJugsCollected, 18);
      state.score = Math.max(state.score, 1950);
      state.timeRemaining = 0.05;
    },
  };

  let accumulator = 0;
  let visualTime = 0;

  entities.sync(state, 0, 1, 0);

  app.ticker.add((ticker) => {
    const rawDt = Math.min(ticker.deltaMS / 1000, 0.05);
    visualTime += rawDt;

    if (state.phase === 'playing') {
      accumulator += rawDt;
      let steps = 0;
      while (accumulator >= SIM_FIXED_DT && steps < 4) {
        steps++;
        const input = controls.readInput();
        stepGame(state, input, SIM_FIXED_DT);
        controls.consumeQueuedTaps();

        music.setOverdrive(state.timeRemaining <= 30);
        music.setUfoMode(state.ufo.active);

        soundFx.handleEvents(state.events);
        speakIfNew();

        for (const ev of state.events) {
          if (ev.type === 'jug_pickup' && ev.x !== undefined && ev.z !== undefined) {
            entities.spawnBurst(ev.x, 0.7, ev.z, 'gold', 7);
          } else if (ev.type === 'jug_golden' && ev.x !== undefined && ev.z !== undefined) {
            entities.spawnBurst(ev.x, 0.9, ev.z, 'gold', 15);
          } else if (ev.type === 'jug_cashin' && ev.x !== undefined && ev.z !== undefined) {
            entities.spawnBurst(ev.x, 1.4, ev.z, 'green', 18);
          } else if (ev.type === 'brawl_hit' && ev.x !== undefined && ev.z !== undefined) {
            entities.spawnBurst(ev.x, 1.2, ev.z, 'red', 10);
          } else if (ev.type === 'brawl_win' && ev.x !== undefined && ev.z !== undefined) {
            entities.spawnBurst(ev.x, 1.6, ev.z, 'gold', 24);
          } else if (ev.type === 'alien_hit' && ev.x !== undefined && ev.z !== undefined) {
            entities.spawnBurst(ev.x, 1.2, ev.z, 'green', 12);
          } else if (ev.type === 'alien_defeat' && ev.x !== undefined && ev.z !== undefined) {
            entities.spawnBurst(ev.x, 1.8, ev.z, 'green', 26);
          } else if (ev.type === 'lizard_jump' && ev.x !== undefined && ev.z !== undefined) {
            entities.spawnBurst(ev.x, 1.5, ev.z, 'pink', 12);
          } else if (ev.type === 'round_end') {
            music.stop();
            hud.enterScratcherPhase(state);
            speakIfNew(true);
          }
        }

        accumulator -= SIM_FIXED_DT;
      }
      if (steps >= 4) accumulator = 0;
    }

    const alpha = state.phase === 'playing' ? Math.max(0, Math.min(1, accumulator / SIM_FIXED_DT)) : 1;
    const renderX = state.player.prevX + (state.player.x - state.player.prevX) * alpha;
    const renderZ = state.player.prevZ + (state.player.z - state.player.prevZ) * alpha;

    truckStop.updateDynamicEnv(state.bays, visualTime, state.player.carriedJugs > 0);
    entities.sync(state, rawDt, alpha, visualTime);

    // Camera framing
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    const aspect = w / Math.max(1, h);

    if (state.phase === 'title' || state.phase === 'gameover' || state.phase === 'scratcher') {
      const orbit = Math.sin(visualTime * 0.25) * 0.55;
      const dist = aspect < 0.78 ? 8.2 : 7.0;
      const gx = Math.sin(orbit) * dist;
      const gy = 3.8;
      const gz = 2.8 + Math.cos(orbit) * dist * 0.65;
      camPos.x += (gx - camPos.x) * Math.min(1, rawDt * 3.5);
      camPos.y += (gy - camPos.y) * Math.min(1, rawDt * 3.5);
      camPos.z += (gz - camPos.z) * Math.min(1, rawDt * 3.5);
      camTarget.x = 0;
      camTarget.y = 1.65;
      camTarget.z = -5.5;
    } else {
      const isPortrait = aspect < 0.78;
      view3d.camera.fov = isPortrait ? 60 : 52;
      const extra = isPortrait ? (0.78 - aspect) * 5.0 : 0;
      const gx = renderX * 0.68;
      const gy = 6.9 + extra;
      const gz = Math.min(LOT_BOUNDS.maxZ + 6.5, renderZ + 7.6 + extra);

      const lx = renderX * 0.85;
      const ly = 0.85;
      const lz = renderZ - 2.6;

      const lerpT = 1 - Math.exp(-7.5 * rawDt);
      camPos.x += (gx - camPos.x) * lerpT;
      camPos.y += (gy - camPos.y) * lerpT;
      camPos.z += (gz - camPos.z) * lerpT;

      camTarget.x += (lx - camTarget.x) * lerpT;
      camTarget.y += (ly - camTarget.y) * lerpT;
      camTarget.z += (lz - camTarget.z) * lerpT;
    }

    view3d.camera.position.set(camPos.x, camPos.y, camPos.z);
    view3d.camera.lookAt(camTarget);

    hud.sync(state, view3d, w, h);
  });
}

boot().catch((err) => {
  console.error('Failed to boot Celina 52: Piss Jug Patrol:', err);
});
