import {
  COUNTER_INTERACT_RADIUS,
  COUNTER_POS,
  DUMPSTER_POS,
  LOT_BOUNDS,
  SHIFT_DURATION_SECONDS,
  TRUCK_BAY_CONFIGS,
  getTruckCabDoorPos,
  randomOpenLotPos,
  resolveWorldCollisions,
} from './layout';
import type {
  ActiveBrawl,
  BrawlEnemy,
  CastCharacterId,
  GameModifiers,
  GameState,
  JugKind,
  PlayableWorkerId,
  PlayerInput,
  ThreatKind,
  VoiceClipId,
} from './types';

const DEFAULT_MODIFIERS: GameModifiers = {
  carryCapBonus: 0,
  moveSpeedMult: 1.0,
  brawlPowerMult: 1.0,
  pickupRadiusMult: 1.0,
};

const BASE_CARRY_CAP = 10;
const BASE_MOVE_SPEED = 6.2;
const BASE_PICKUP_RADIUS = 1.38;

const BRAWL_ROTATION: ThreatKind[] = ['raccoon', 'vagrant', 'lot_lizard', 'trucker'];

const LIZARD_COLORS = [0xec4899, 0xd946ef, 0xf43f5e, 0xa855f7, 0x06b6d4];
const TRUCKER_SHIRTS = [0xb91c1c, 0x1d4ed8, 0x15803d, 0x92400e, 0x4b5563];

function dist2D(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(bx - ax, bz - az);
}

function addPop(
  state: GameState,
  x: number,
  y: number,
  z: number,
  text: string,
  color = '#fde047',
  duration = 1.4,
): void {
  state.pops.push({
    id: state.nextEntityId++,
    x,
    y,
    z,
    text,
    color,
    age: 0,
    duration,
  });
  if (state.pops.length > 26) {
    state.pops.shift();
  }
}

function setVoiceCallout(
  state: GameState,
  speaker: CastCharacterId,
  speakerName: string,
  speakerRole: string,
  text: string,
  clipId: VoiceClipId,
  ttl = 4.5,
): void {
  state.voiceCallout = {
    id: state.nextEntityId++,
    speaker,
    speakerName,
    speakerRole,
    text,
    clipId,
    ttl,
  };
}

function spawnJug(
  state: GameState,
  x: number,
  z: number,
  kind?: JugKind,
  vx = 0,
  vz = 0,
): void {
  if (state.jugs.length >= 28) return;
  let jugKind: JugKind = kind ?? 'standard';
  if (!kind) {
    const r = Math.random();
    if (r < 0.14) jugKind = 'golden_trucker';
    else if (r < 0.34) jugKind = 'mega_dew';
    else jugKind = 'standard';
  }

  const points =
    jugKind === 'radioactive'
      ? 160
      : jugKind === 'golden_trucker'
        ? 125
        : jugKind === 'mega_dew'
          ? 70
          : 40;

  const clamped = resolveWorldCollisions(x, z, 0.35);
  state.jugs.push({
    id: state.nextEntityId++,
    kind: jugKind,
    x: clamped.x,
    y: 0.75,
    z: clamped.z,
    vx,
    vy: 2.8 + Math.random() * 1.4,
    vz,
    rotation: Math.random() * Math.PI * 2,
    points,
    state: 'ground',
    age: 0,
    abductProgress: 0,
  });
}

export function createGame(worker: PlayableWorkerId = 'nevaeh'): GameState {
  const bays = TRUCK_BAY_CONFIGS.map((cfg) => ({
    ...cfg,
    rockTimer: 0,
    lizardInside: false,
    lizardTimer: 0,
    jugDropCooldown: 2 + Math.random() * 5,
  }));

  const state: GameState = {
    phase: 'title',
    workerChoice: worker,
    timeRemaining: SHIFT_DURATION_SECONDS,
    elapsed: 0,
    score: 0,
    totalJugsCollected: 0,
    totalJugsCashedIn: 0,
    brawlsWon: 0,
    aliensRepelled: 0,
    fightsBrokenUp: 0,
    lizardsSpotted: 0,
    jugsAbducted: 0,
    player: {
      x: 0,
      z: -3.5,
      prevX: 0,
      prevZ: -3.5,
      facing: 0,
      prevFacing: 0,
      speed: 0,
      carriedJugs: 0,
      carriedValue: 0,
      carryCap: BASE_CARRY_CAP,
      punchTimer: 0,
      punchCooldown: 0,
      stunTimer: 0,
      comboCount: 0,
      comboTimer: 0,
    },
    jugman: {
      x: -2.4,
      z: 1.5,
      prevX: -2.4,
      prevZ: 1.5,
      facing: 0.4,
      prevFacing: 0.4,
      targetX: 2.5,
      targetZ: 4.0,
      state: 'patrol',
      brawlId: null,
      stamina: 100,
      animPhase: 0,
      celebrateTimer: 0,
    },
    bays,
    jugs: [],
    lotLizards: [],
    activeBrawl: null,
    truckerFight: null,
    police: {
      active: false,
      state: 'arriving',
      x: 0,
      z: 22,
      prevX: 0,
      prevZ: 22,
      facing: Math.PI,
      targetX: 0,
      targetZ: 4,
      sirenPhase: 0,
      timer: 0,
      trooperOut: false,
      trooperX: 0,
      trooperZ: 4,
    },
    ufo: {
      active: false,
      state: 'entering',
      x: -24,
      y: 9,
      z: -6,
      prevX: -24,
      prevY: 9,
      prevZ: -6,
      hoverPhase: 0,
      beamActive: false,
      targetJugId: null,
      alienOut: false,
      alienX: 0,
      alienZ: 0,
      alienHp: 4,
      alienMaxHp: 4,
      alienHitFlash: 0,
      timer: 0,
      jugsStolen: 0,
    },
    forklift: {
      active: false,
      x: -18,
      z: -6.9,
      prevX: -18,
      prevZ: -6.9,
      facing: Math.PI / 2,
      speed: 4.5,
      honkTimer: 0,
      dir: 1,
    },
    helicopter: {
      active: false,
      x: -26,
      y: 12.5,
      z: -9,
      rotorAngle: 0,
      timer: 0,
    },
    pops: [],
    events: [],
    voiceCallout: null,
    nextEntityId: 1,
    nextBrawlCooldown: 16,
    nextLizardCooldown: 9,
    nextFightCooldown: 30,
    nextUfoCooldown: 46,
    nextForkliftCooldown: 20,
    nextHeliCooldown: 68,
    nextJugSpawnCooldown: 1.2,
    brawlRotationIndex: 0,
    alert30sPlayed: false,
    modifiers: { ...DEFAULT_MODIFIERS },
  };

  // Seed initial jugs on the title screen so the 3D truck stop looks lively right away!
  for (let i = 0; i < 8; i++) {
    const bay = bays[i % bays.length];
    const door = getTruckCabDoorPos(bay.id);
    spawnJug(
      state,
      door.x + (Math.random() - 0.5) * 3.0,
      door.z + (Math.random() - 0.5) * 2.4,
      i === 2 ? 'golden_trucker' : undefined,
    );
  }
  for (const j of state.jugs) {
    j.y = 0;
    j.vy = 0;
  }

  return state;
}

export function startShift(
  state: GameState,
  worker: PlayableWorkerId,
  modifiers: GameModifiers = DEFAULT_MODIFIERS,
): void {
  const fresh = createGame(worker);
  Object.assign(state, fresh);
  state.phase = 'playing';
  state.workerChoice = worker;
  state.modifiers = { ...modifiers };
  state.player.carryCap = BASE_CARRY_CAP + modifiers.carryCapBonus;
  state.player.x = 0;
  state.player.z = -5.8;
  state.player.prevX = 0;
  state.player.prevZ = -5.8;
  state.player.facing = 0;
  state.player.prevFacing = 0;

  setVoiceCallout(
    state,
    'piss_jugman',
    'Piss Jugman',
    'Official 8-Ft Mascot',
    '"I am Piss Jugman! Grab those jugs & cash \'em in at Colby\'s counter before URINE TROUBLE!"',
    'jugman_intro',
    5.2,
  );
}

export interface NearbyAction {
  kind: 'cashin' | 'brawl' | 'alien' | 'breakup';
  label: string;
  icon: string;
  x: number;
  z: number;
}

export function getNearbyAction(state: GameState): NearbyAction | null {
  if (state.phase !== 'playing') return null;

  // 1. Help Piss Jugman brawl!
  if (state.activeBrawl) {
    const d = dist2D(state.player.x, state.player.z, state.activeBrawl.x, state.activeBrawl.z);
    if (d < 4.2) {
      return {
        kind: 'brawl',
        label: 'WHACK TROUBLEMAKER!',
        icon: '👊',
        x: state.activeBrawl.x,
        z: state.activeBrawl.z,
      };
    }
  }

  // 2. Smack the Alien under the UFO!
  if (state.ufo.active && state.ufo.alienOut && state.ufo.state !== 'fleeing') {
    const d = dist2D(state.player.x, state.player.z, state.ufo.alienX, state.ufo.alienZ);
    if (d < 4.0) {
      return {
        kind: 'alien',
        label: 'BONK ALIEN!',
        icon: '🛸',
        x: state.ufo.alienX,
        z: state.ufo.alienZ,
      };
    }
  }

  // 3. Help break up a Trucker Fight!
  if (state.truckerFight && !state.truckerFight.brokenUp) {
    const d = dist2D(state.player.x, state.player.z, state.truckerFight.x, state.truckerFight.z);
    if (d < 3.6) {
      return {
        kind: 'breakup',
        label: 'BREAK UP FIGHT!',
        icon: '🚨',
        x: state.truckerFight.x,
        z: state.truckerFight.z,
      };
    }
  }

  // 4. Cash in carried jugs at Colby's Counter!
  if (state.player.carriedJugs > 0) {
    const d = dist2D(state.player.x, state.player.z, COUNTER_POS.x, COUNTER_POS.z);
    if (d < COUNTER_INTERACT_RADIUS + 0.8) {
      return {
        kind: 'cashin',
        label: `CASH IN ${state.player.carriedJugs} JUGS!`,
        icon: '🎟️',
        x: COUNTER_POS.x,
        z: COUNTER_POS.z,
      };
    }
  }

  return null;
}

function cashInCarriedJugs(state: GameState): void {
  if (state.player.carriedJugs <= 0) return;
  const count = state.player.carriedJugs;
  const baseVal = state.player.carriedValue;
  const bulkMult = count >= 8 ? 1.5 : count >= 5 ? 1.25 : 1.0;
  const totalPts = Math.round(baseVal * bulkMult);

  state.score += totalPts;
  state.totalJugsCashedIn += count;
  state.player.carriedJugs = 0;
  state.player.carriedValue = 0;

  state.events.push({
    type: 'jug_cashin',
    x: COUNTER_POS.x,
    z: COUNTER_POS.z,
    value: count,
  });

  addPop(
    state,
    COUNTER_POS.x,
    2.4,
    COUNTER_POS.z,
    `+${totalPts} PTS (${count} JUGS CASHED!)`,
    '#4ade80',
    1.8,
  );

  if (count >= 4) {
    setVoiceCallout(
      state,
      'colby',
      'Colby Kappleman',
      '2nd Shift Lead Cashier',
      `"${count} jugs logged into the Urine Jug Exchange! Keep 'em coming for scratcher tickets!"`,
      'colby_cashin',
      3.8,
    );
  }
}

function spawnPissJugmanBrawl(state: GameState): void {
  if (state.activeBrawl) return;
  const kind = BRAWL_ROTATION[state.brawlRotationIndex % BRAWL_ROTATION.length];
  state.brawlRotationIndex++;

  // Pick a thematic brawl location near Jugman or Dumpster for raccoons
  let bx = state.jugman.x;
  let bz = state.jugman.z;
  if (kind === 'raccoon') {
    bx = Math.max(-8, Math.min(9.5, DUMPSTER_POS.x - 4.0));
    bz = Math.max(-7, Math.min(8, DUMPSTER_POS.z + 3.2));
  } else {
    const spot = randomOpenLotPos(2.0);
    bx = spot.x * 0.7;
    bz = Math.max(-4.5, Math.min(10.5, spot.z));
  }
  const safe = resolveWorldCollisions(bx, bz, 1.2);
  bx = safe.x;
  bz = safe.z;

  state.jugman.x = bx;
  state.jugman.z = bz;
  state.jugman.prevX = bx;
  state.jugman.prevZ = bz;
  state.jugman.state = 'brawling';

  const enemyCount = kind === 'raccoon' ? 3 : 2;
  const enemies: BrawlEnemy[] = [];
  for (let i = 0; i < enemyCount; i++) {
    const ang = (i / enemyCount) * Math.PI * 2 + 0.5;
    const ex = bx + Math.cos(ang) * 1.45;
    const ez = bz + Math.sin(ang) * 1.45;
    const hp = kind === 'raccoon' ? 2 : kind === 'trucker' ? 4 : 3;
    enemies.push({
      id: state.nextEntityId++,
      kind,
      x: ex,
      z: ez,
      prevX: ex,
      prevZ: ez,
      facing: Math.atan2(bx - ex, bz - ez),
      hp,
      maxHp: hp,
      hitFlash: 0,
      state: 'fighting',
      fleeVx: 0,
      fleeVz: 0,
      fleeTimer: 0,
      variantColor:
        kind === 'lot_lizard'
          ? LIZARD_COLORS[i % LIZARD_COLORS.length]
          : TRUCKER_SHIRTS[i % TRUCKER_SHIRTS.length],
    });
  }

  const brawl: ActiveBrawl = {
    id: state.nextEntityId++,
    kind,
    x: bx,
    z: bz,
    enemies,
    timeRemaining: 22,
    maxTime: 22,
    dustPhase: 0,
    jugmanHp: 100,
  };
  state.activeBrawl = brawl;
  state.jugman.brawlId = brawl.id;
  state.events.push({ type: 'brawl_start', x: bx, z: bz });

  const voiceMap: Record<ThreatKind, { clip: VoiceClipId; line: string }> = {
    raccoon: {
      clip: 'jugman_help_raccoon',
      line: '"WHOA! Trash pandas are jumpin\' me! Sprint over and help Piss Jugman!"',
    },
    vagrant: {
      clip: 'jugman_help_vagrant',
      line: '"HEY! This vagrant is trying to steal my screw-cap! Get over here and throw hands!"',
    },
    lot_lizard: {
      clip: 'jugman_help_lizard',
      line: '"A feisty lot lizard is swinging her purse at me! Backup needed ASAP!"',
    },
    trucker: {
      clip: 'jugman_help_trucker',
      line: '"JERRY PETTY is back trying to wrestle me over Nevaeh! Help me out!"',
    },
  };
  const v = voiceMap[kind];
  setVoiceCallout(state, 'piss_jugman', 'Piss Jugman', 'BRAWL ALERT!', v.line, v.clip, 4.8);
}

function spawnLotLizard(state: GameState): void {
  if (state.lotLizards.length >= 2) return;
  const availableBays = state.bays.filter((b) => !b.lizardInside);
  if (availableBays.length === 0) return;
  const bay = availableBays[Math.floor(Math.random() * availableBays.length)];
  const spawnX = bay.x < 0 ? -1.5 : 1.5;
  const spawnZ = 14.2;

  state.lotLizards.push({
    id: state.nextEntityId++,
    x: spawnX,
    z: spawnZ,
    prevX: spawnX,
    prevZ: spawnZ,
    facing: Math.PI,
    state: 'walking_to_truck',
    targetBayId: bay.id,
    jumpProgress: 0,
    timer: 0,
    outfitColor: LIZARD_COLORS[Math.floor(Math.random() * LIZARD_COLORS.length)],
    hp: 2,
    maxHp: 2,
    hitFlash: 0,
  });
}

function spawnTruckerFight(state: GameState): void {
  if (state.truckerFight || state.police.active) return;
  const spot = randomOpenLotPos(2.4);
  const fx = spot.x * 0.5;
  const fz = Math.max(-1.0, Math.min(9.5, spot.z));
  const safe = resolveWorldCollisions(fx, fz, 1.4);

  state.truckerFight = {
    id: state.nextEntityId++,
    x: safe.x,
    z: safe.z,
    timer: 18,
    policeDispatched: false,
    brokenUp: false,
    dustPhase: 0,
    fighterA: {
      x: safe.x - 0.7,
      z: safe.z,
      facing: Math.PI / 2,
      shirtColor: 0xb91c1c,
    },
    fighterB: {
      x: safe.x + 0.7,
      z: safe.z,
      facing: -Math.PI / 2,
      shirtColor: 0x1d4ed8,
    },
  };

  state.events.push({ type: 'trucker_fight', x: safe.x, z: safe.z });
  setVoiceCallout(
    state,
    'rodney',
    'Rodney Bartow',
    'Security · Cold War Vet',
    '"Trucker fight in the lot! State Troopers are rolling in — break it up for bonus points!"',
    'rodney_fight',
    4.5,
  );
}

function spawnUfoEvent(state: GameState): void {
  if (state.ufo.active) return;
  const startX = Math.random() < 0.5 ? -22 : 22;
  state.ufo = {
    active: true,
    state: 'entering',
    x: startX,
    y: 8.5,
    z: 2.0,
    prevX: startX,
    prevY: 8.5,
    prevZ: 2.0,
    hoverPhase: 0,
    beamActive: false,
    targetJugId: null,
    alienOut: false,
    alienX: 0,
    alienZ: 2.0,
    alienHp: 4,
    alienMaxHp: 4,
    alienHitFlash: 0,
    timer: 20,
    jugsStolen: 0,
  };

  // Ensure there are jugs for the UFO to target!
  if (state.jugs.length < 4) {
    for (let i = 0; i < 4; i++) {
      const p = randomOpenLotPos(1.5);
      spawnJug(state, p.x, p.z, i === 0 ? 'golden_trucker' : 'standard');
    }
  }

  state.events.push({ type: 'ufo_arrive', x: 0, z: 2.0 });
  setVoiceCallout(
    state,
    'alien',
    'Zorg of Sector 52',
    'Piss Jug Abductor',
    '"EARTHLINGS! Your golden trucker nectar belongs to the mothership!"',
    'alien_steal',
    4.6,
  );
}

function performPlayerStrike(state: GameState): void {
  if (state.player.punchCooldown > 0) return;
  state.player.punchTimer = 0.28;
  state.player.punchCooldown = 0.26;
  state.events.push({ type: 'player_punch', x: state.player.x, z: state.player.z });

  const power = Math.round(1 * state.modifiers.brawlPowerMult);
  let landed = false;

  // 1. Check Active Piss Jugman Brawl enemies
  if (state.activeBrawl) {
    for (const enemy of state.activeBrawl.enemies) {
      if (enemy.state !== 'fighting') continue;
      const d = dist2D(state.player.x, state.player.z, enemy.x, enemy.z);
      if (d < 3.6) {
        enemy.hp -= power;
        enemy.hitFlash = 0.22;
        landed = true;
        state.events.push({ type: 'brawl_hit', x: enemy.x, z: enemy.z });
        addPop(state, enemy.x, 1.8, enemy.z, power > 1 ? 'ZAP! POW!' : 'WHAM!', '#fb7185', 0.9);

        if (enemy.hp <= 0) {
          enemy.state = 'knocked_out';
          const awayAng = Math.atan2(enemy.x - state.player.x, enemy.z - state.player.z);
          enemy.fleeVx = Math.sin(awayAng) * 9.5;
          enemy.fleeVz = Math.cos(awayAng) * 9.5;
          enemy.fleeTimer = 1.6;
          spawnJug(state, enemy.x, enemy.z, 'golden_trucker', Math.cos(awayAng) * 2, Math.sin(awayAng) * 2);
        }
        break;
      }
    }

    // Check if all enemies in brawl are defeated!
    if (state.activeBrawl.enemies.every((e) => e.state === 'knocked_out')) {
      const bx = state.activeBrawl.x;
      const bz = state.activeBrawl.z;
      state.activeBrawl = null;
      state.jugman.state = 'celebrating';
      state.jugman.brawlId = null;
      state.jugman.celebrateTimer = 3.2;
      state.brawlsWon++;
      state.score += 350;
      state.events.push({ type: 'brawl_win', x: bx, z: bz });
      addPop(state, bx, 2.5, bz, 'BRAWL WON! +350 PTS', '#fde047', 2.0);
      // Bonus jug shower!
      for (let k = 0; k < 2; k++) {
        spawnJug(
          state,
          bx + (k === 0 ? -1.1 : 1.1),
          bz + 0.6,
          k === 0 ? 'golden_trucker' : 'mega_dew',
        );
      }
      setVoiceCallout(
        state,
        'piss_jugman',
        'Piss Jugman',
        'Official 8-Ft Mascot',
        '"BOOM! Urine trouble if you mess with Celina 52! Thanks partner!"',
        'jugman_win',
        4.0,
      );
      return;
    }
  }

  // 2. Check UFO Alien!
  if (!landed && state.ufo.active && state.ufo.alienOut && state.ufo.state !== 'fleeing') {
    const d = dist2D(state.player.x, state.player.z, state.ufo.alienX, state.ufo.alienZ);
    if (d < 3.6) {
      state.ufo.alienHp -= power;
      state.ufo.alienHitFlash = 0.24;
      landed = true;
      state.events.push({ type: 'alien_hit', x: state.ufo.alienX, z: state.ufo.alienZ });
      addPop(state, state.ufo.alienX, 2.0, state.ufo.alienZ, 'BONK THE ALIEN!', '#4ade80', 1.0);

      // Drop any jug being abducted!
      if (state.ufo.targetJugId !== null) {
        const j = state.jugs.find((jg) => jg.id === state.ufo.targetJugId);
        if (j && j.state === 'abducting') {
          j.state = 'ground';
          j.vy = -1.5;
        }
        state.ufo.targetJugId = null;
      }

      if (state.ufo.alienHp <= 0) {
        const ax = state.ufo.alienX;
        const az = state.ufo.alienZ;
        state.ufo.state = 'fleeing';
        state.ufo.beamActive = false;
        state.ufo.alienOut = false;
        state.aliensRepelled++;
        state.score += 500;
        state.events.push({ type: 'alien_defeat', x: ax, z: az });
        addPop(state, ax, 2.7, az, 'UFO REPELLED! +500 PTS', '#a3e635', 2.2);
        // Drop 3 Radioactive Bonus Jugs!
        for (let k = 0; k < 3; k++) {
          const ang = (k / 3) * Math.PI * 2;
          spawnJug(state, ax + Math.cos(ang) * 1.4, az + Math.sin(ang) * 1.4, 'radioactive');
        }
        setVoiceCallout(
          state,
          'piss_jugman',
          'Piss Jugman',
          'Alien Defense Force',
          '"YEAH! Sent that weird alien packing! Grab those radioactive bonus jugs!"',
          'jugman_win',
          4.2,
        );
      }
      return;
    }
  }

  // 3. Check Trucker Fight Breakup!
  if (!landed && state.truckerFight && !state.truckerFight.brokenUp) {
    const d = dist2D(state.player.x, state.player.z, state.truckerFight.x, state.truckerFight.z);
    if (d < 3.5) {
      state.truckerFight.brokenUp = true;
      state.truckerFight.timer = 1.6;
      state.fightsBrokenUp++;
      state.score += 275;
      state.events.push({ type: 'police_breakup', x: state.truckerFight.x, z: state.truckerFight.z });
      addPop(state, state.truckerFight.x, 2.4, state.truckerFight.z, 'FIGHT BROKEN UP! +275 PTS', '#38bdf8', 1.9);
      spawnJug(state, state.truckerFight.x + 0.8, state.truckerFight.z, 'golden_trucker');
      return;
    }
  }

  // 4. Cash in at counter if standing right by Colby!
  if (!landed && state.player.carriedJugs > 0) {
    const d = dist2D(state.player.x, state.player.z, COUNTER_POS.x, COUNTER_POS.z);
    if (d < COUNTER_INTERACT_RADIUS + 0.8) {
      cashInCarriedJugs(state);
    }
  }
}

export function stepGame(state: GameState, input: PlayerInput, dt: number): void {
  state.events.length = 0;
  if (state.phase !== 'playing') return;

  state.elapsed += dt;
  state.timeRemaining = Math.max(0, state.timeRemaining - dt);

  // Voice callout timer
  if (state.voiceCallout) {
    state.voiceCallout.ttl -= dt;
    if (state.voiceCallout.ttl <= 0) state.voiceCallout = null;
  }

  // Floating popups
  for (let i = state.pops.length - 1; i >= 0; i--) {
    state.pops[i].age += dt;
    state.pops[i].y += dt * 0.9;
    if (state.pops[i].age >= state.pops[i].duration) {
      state.pops.splice(i, 1);
    }
  }

  // Check shift end -> transition to Colby's Scratcher Lotto Counter!
  if (state.timeRemaining <= 0) {
    // Auto-deposit any jugs still in player's arms!
    if (state.player.carriedJugs > 0) {
      cashInCarriedJugs(state);
    }
    state.phase = 'scratcher';
    state.events.push({ type: 'round_end' });
    setVoiceCallout(
      state,
      'colby',
      'Colby Kappleman',
      'Urine Jug Exchange Counter',
      '"SHIFT OVER! Step right up and scratch off your Celina 52 Lotto Tickets for REAL MONEY!"',
      'colby_scratcher',
      6.0,
    );
    return;
  }

  // 30-second overdrive warning!
  if (!state.alert30sPlayed && state.timeRemaining <= 30) {
    state.alert30sPlayed = true;
    addPop(state, state.player.x, 2.5, state.player.z, 'FINAL 30 SECONDS! 2X JUG RUSH!', '#f97316', 2.4);
  }

  // --- PLAYER MOVEMENT ---
  const p = state.player;
  p.prevX = p.x;
  p.prevZ = p.z;
  p.prevFacing = p.facing;
  if (p.punchTimer > 0) p.punchTimer = Math.max(0, p.punchTimer - dt);
  if (p.punchCooldown > 0) p.punchCooldown = Math.max(0, p.punchCooldown - dt);
  if (p.stunTimer > 0) p.stunTimer = Math.max(0, p.stunTimer - dt);
  if (p.comboTimer > 0) {
    p.comboTimer -= dt;
    if (p.comboTimer <= 0) p.comboCount = 0;
  }

  let mx = input.moveX;
  let mz = input.moveZ;
  const mag = Math.hypot(mx, mz);
  if (mag > 1) {
    mx /= mag;
    mz /= mag;
  }

  const speedScale = p.stunTimer > 0 ? 0.35 : 1.0;
  const overdriveBonus = state.timeRemaining <= 30 ? 1.12 : 1.0;
  const maxSpeed = BASE_MOVE_SPEED * state.modifiers.moveSpeedMult * speedScale * overdriveBonus;

  if (mag > 0.06) {
    const nextX = p.x + mx * maxSpeed * dt;
    const nextZ = p.z + mz * maxSpeed * dt;
    const resolved = resolveWorldCollisions(nextX, nextZ, 0.45);
    p.x = resolved.x;
    p.z = resolved.z;
    p.speed = Math.hypot(p.x - p.prevX, p.z - p.prevZ) / Math.max(dt, 1e-4);
    p.facing = Math.atan2(mx, mz);
  } else {
    p.speed = 0;
  }

  // Action tap (Punch / Help Jugman / Bonk Alien / Break Up Fight / Cash In)
  if (input.actionTapQueued) {
    performPlayerStrike(state);
  }

  // Auto-cash-in when stepping right onto Colby's glowing counter mat!
  if (p.carriedJugs > 0 && dist2D(p.x, p.z, COUNTER_POS.x, COUNTER_POS.z) <= COUNTER_INTERACT_RADIUS) {
    cashInCarriedJugs(state);
  }

  // --- SEMI TRUCKS & JUG SPAWNING ---
  const isOverdrive = state.timeRemaining <= 30;
  for (const bay of state.bays) {
    if (bay.rockTimer > 0) bay.rockTimer = Math.max(0, bay.rockTimer - dt);
    if (bay.lizardInside) {
      bay.lizardTimer -= dt;
      bay.rockTimer = 0.25;
      if (bay.lizardTimer <= 0) {
        bay.lizardInside = false;
        // Truck cab drops a golden jug after a lot lizard visit!
        const door = getTruckCabDoorPos(bay.id);
        spawnJug(state, door.x, door.z, 'golden_trucker', (Math.random() - 0.5) * 1.5, 1.5);
        addPop(state, door.x, 2.2, door.z, 'FRESH CAB JUG!', '#f472b6', 1.4);
      }
    }

    bay.jugDropCooldown -= dt * (isOverdrive ? 1.8 : 1.0);
    if (bay.jugDropCooldown <= 0) {
      bay.jugDropCooldown = 5.5 + Math.random() * 6.5;
      const door = getTruckCabDoorPos(bay.id);
      const tossDir = bay.x < 0 ? 1 : -1;
      spawnJug(
        state,
        door.x + tossDir * 0.4,
        door.z + (Math.random() - 0.5) * 1.8,
        undefined,
        tossDir * (1.2 + Math.random() * 1.5),
        (Math.random() - 0.5) * 1.4,
      );
    }
  }

  // Ambient lot visitor jug drops
  state.nextJugSpawnCooldown -= dt * (isOverdrive ? 1.7 : 1.0);
  if (state.nextJugSpawnCooldown <= 0) {
    state.nextJugSpawnCooldown = 3.2 + Math.random() * 2.4;
    if (state.jugs.length < 18) {
      const spot = randomOpenLotPos(1.3);
      spawnJug(state, spot.x, spot.z);
    }
  }

  // --- JUG PHYSICS & COLLECTION ---
  const pickupRadius = BASE_PICKUP_RADIUS * state.modifiers.pickupRadiusMult;
  for (let i = state.jugs.length - 1; i >= 0; i--) {
    const j = state.jugs[i];
    j.age += dt;

    if (j.state === 'ground') {
      if (j.y > 0 || j.vy !== 0) {
        j.vy -= 14 * dt;
        j.x += j.vx * dt;
        j.z += j.vz * dt;
        j.y += j.vy * dt;
        if (j.y <= 0) {
          j.y = 0;
          j.vy = 0;
          j.vx *= 0.2;
          j.vz *= 0.2;
        }
        const c = resolveWorldCollisions(j.x, j.z, 0.35);
        j.x = c.x;
        j.z = c.z;
      }

      // Check player pickup!
      const d = dist2D(p.x, p.z, j.x, j.z);
      if (d <= pickupRadius) {
        if (p.carriedJugs < p.carryCap) {
          p.carriedJugs++;
          p.comboCount++;
          p.comboTimer = 3.2;
          const comboMult = Math.min(2.5, 1 + (p.comboCount - 1) * 0.15);
          const earned = Math.round(j.points * comboMult);
          p.carriedValue += earned;
          state.score += Math.round(earned * 0.4); // Immediate pickup points + remaining on cash-in!
          state.totalJugsCollected++;
          state.events.push({
            type: j.kind === 'golden_trucker' || j.kind === 'radioactive' ? 'jug_golden' : 'jug_pickup',
            x: j.x,
            z: j.z,
            value: p.comboCount,
          });
          const label =
            j.kind === 'radioactive'
              ? `☢️ ALIEN JUG! +${earned}`
              : j.kind === 'golden_trucker'
                ? `✨ GOLDEN JUG! +${earned}`
                : `+1 JUG (${p.carriedJugs}/${p.carryCap})`;
          addPop(
            state,
            j.x,
            1.35,
            j.z,
            label,
            j.kind === 'radioactive' ? '#a3e635' : j.kind === 'golden_trucker' ? '#fde047' : '#fbbf24',
            1.1,
          );
          state.jugs.splice(i, 1);
          continue;
        } else if (j.age > 0.4 && Math.floor(state.elapsed * 2) !== Math.floor((state.elapsed - dt) * 2)) {
          addPop(state, p.x, 2.2, p.z, 'ARMS FULL! CASH IN AT COLBY!', '#38bdf8', 1.1);
        }
      }
    } else if (j.state === 'abducting') {
      // Lifted by UFO tractor beam!
      j.abductProgress += dt * 0.24;
      j.y = j.abductProgress * 6.5;
      j.x += (state.ufo.x - j.x) * Math.min(1, dt * 3);
      j.z += (state.ufo.z - j.z) * Math.min(1, dt * 3);
      j.rotation += dt * 7;

      // Player can still rescue a low-flying jug!
      if (j.y < 2.2 && dist2D(p.x, p.z, j.x, j.z) <= pickupRadius + 0.5 && p.carriedJugs < p.carryCap) {
        j.state = 'ground';
        state.ufo.targetJugId = null;
        addPop(state, j.x, 1.8, j.z, 'JUG SAVED FROM UFO! +120', '#a3e635', 1.4);
        state.score += 120;
      } else if (j.abductProgress >= 1) {
        state.jugsAbducted++;
        state.ufo.jugsStolen++;
        state.ufo.targetJugId = null;
        state.events.push({ type: 'ufo_steal', x: state.ufo.x, z: state.ufo.z });
        addPop(state, state.ufo.x, 3.0, state.ufo.z, 'ALIEN STOLE A JUG!', '#4ade80', 1.5);
        state.jugs.splice(i, 1);
      }
    }
  }

  // --- PISS JUGMAN AI PATROL & BRAWLS ---
  const jm = state.jugman;
  jm.prevX = jm.x;
  jm.prevZ = jm.z;
  jm.prevFacing = jm.facing;
  jm.animPhase += dt * (jm.state === 'brawling' ? 12 : 6);

  if (jm.state === 'patrol') {
    const dx = jm.targetX - jm.x;
    const dz = jm.targetZ - jm.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.8) {
      const next = randomOpenLotPos(1.8);
      jm.targetX = next.x * 0.78;
      jm.targetZ = Math.max(-4.5, Math.min(11.0, next.z));
    } else {
      const spd = 2.6;
      const step = resolveWorldCollisions(jm.x + (dx / d) * spd * dt, jm.z + (dz / d) * spd * dt, 0.75);
      jm.x = step.x;
      jm.z = step.z;
      jm.facing = Math.atan2(dx, dz);
    }

    state.nextBrawlCooldown -= dt;
    if (state.nextBrawlCooldown <= 0 && !state.activeBrawl) {
      spawnPissJugmanBrawl(state);
      state.nextBrawlCooldown = 26 + Math.random() * 10;
    }
  } else if (jm.state === 'celebrating') {
    jm.celebrateTimer -= dt;
    jm.facing += dt * 4.5;
    if (jm.celebrateTimer <= 0) {
      jm.state = 'patrol';
    }
  } else if (jm.state === 'brawling' && state.activeBrawl) {
    const brawl = state.activeBrawl;
    brawl.timeRemaining -= dt;
    brawl.dustPhase += dt * 10;
    jm.facing = Math.sin(brawl.dustPhase * 0.8) * Math.PI;

    for (const enemy of brawl.enemies) {
      enemy.prevX = enemy.x;
      enemy.prevZ = enemy.z;
      if (enemy.hitFlash > 0) enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);

      if (enemy.state === 'fighting') {
        const orbit = brawl.dustPhase * 0.35 + enemy.id * 2.1;
        const tx = brawl.x + Math.cos(orbit) * 1.35;
        const tz = brawl.z + Math.sin(orbit) * 1.35;
        enemy.x += (tx - enemy.x) * Math.min(1, dt * 5);
        enemy.z += (tz - enemy.z) * Math.min(1, dt * 5);
        enemy.facing = Math.atan2(brawl.x - enemy.x, brawl.z - enemy.z);
      } else {
        enemy.x += enemy.fleeVx * dt;
        enemy.z += enemy.fleeVz * dt;
        enemy.fleeTimer -= dt;
      }
    }

    if (brawl.timeRemaining <= 0) {
      // Troublemakers scatter on their own, Jugman survives but no bonus
      addPop(state, brawl.x, 2.5, brawl.z, 'TROUBLEMAKERS SCATTERED!', '#fb923c', 1.6);
      state.activeBrawl = null;
      jm.state = 'patrol';
      jm.brawlId = null;
    }
  }

  // --- LOT LIZARDS JUMPING INTO TRUCKS ---
  state.nextLizardCooldown -= dt;
  if (state.nextLizardCooldown <= 0) {
    spawnLotLizard(state);
    state.nextLizardCooldown = 14 + Math.random() * 10;
  }

  for (let i = state.lotLizards.length - 1; i >= 0; i--) {
    const liz = state.lotLizards[i];
    liz.prevX = liz.x;
    liz.prevZ = liz.z;
    if (liz.hitFlash > 0) liz.hitFlash = Math.max(0, liz.hitFlash - dt);

    const bay = state.bays[liz.targetBayId];
    const door = getTruckCabDoorPos(liz.targetBayId);

    if (liz.state === 'walking_to_truck') {
      const dx = door.x - liz.x;
      const dz = door.z - liz.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.75) {
        liz.state = 'jumping_in';
        liz.jumpProgress = 0;
        state.lizardsSpotted++;
        state.events.push({ type: 'lizard_jump', x: door.x, z: door.z });
        addPop(state, door.x, 2.3, door.z, '💋 LOT LIZARD HOPPED IN CAB!', '#f472b6', 1.9);
        if (!state.voiceCallout) {
          setVoiceCallout(
            state,
            'nevaeh',
            'Nevaeh Petty',
            'Lot Attendant',
            `"Oh lord, another lot lizard just jumped right into ${bay.trailerLabel}!"`,
            'nevaeh_lizard',
            3.6,
          );
        }
      } else {
        const spd = 2.9;
        const step = resolveWorldCollisions(liz.x + (dx / d) * spd * dt, liz.z + (dz / d) * spd * dt, 0.35);
        liz.x = step.x;
        liz.z = step.z;
        liz.facing = Math.atan2(dx, dz);
      }
    } else if (liz.state === 'jumping_in') {
      liz.jumpProgress += dt * 1.9;
      liz.x += (bay.x - liz.x) * Math.min(1, dt * 4);
      liz.z += (bay.z - liz.z) * Math.min(1, dt * 4);
      if (liz.jumpProgress >= 1) {
        liz.state = 'inside_truck';
        bay.lizardInside = true;
        bay.lizardTimer = 7.5;
        liz.timer = 7.5;
      }
    } else if (liz.state === 'inside_truck') {
      liz.timer -= dt;
      if (liz.timer <= 0) {
        liz.state = 'leaving';
        liz.x = door.x;
        liz.z = door.z;
      }
    } else if (liz.state === 'leaving') {
      const dx = 0 - liz.x;
      const dz = 17.5 - liz.z;
      const d = Math.hypot(dx, dz);
      liz.x += (dx / Math.max(0.1, d)) * 3.2 * dt;
      liz.z += (dz / Math.max(0.1, d)) * 3.2 * dt;
      liz.facing = Math.atan2(dx, dz);
      if (liz.z > 15.2) {
        state.lotLizards.splice(i, 1);
      }
    }
  }

  // --- TRUCKER FIGHTS & TENNESSEE STATE TROOPER POLICE CRUISER ---
  state.nextFightCooldown -= dt;
  if (state.nextFightCooldown <= 0 && !state.truckerFight && !state.police.active) {
    spawnTruckerFight(state);
    state.nextFightCooldown = 38 + Math.random() * 14;
  }

  if (state.truckerFight) {
    const tf = state.truckerFight;
    tf.timer -= dt;
    tf.dustPhase += dt * 11;

    if (!tf.policeDispatched && tf.timer < 15.5) {
      tf.policeDispatched = true;
      state.police = {
        active: true,
        state: 'arriving',
        x: 0,
        z: 20,
        prevX: 0,
        prevZ: 20,
        facing: Math.PI,
        targetX: Math.max(-4.5, Math.min(4.5, tf.x)),
        targetZ: Math.min(12.2, tf.z + 3.6),
        sirenPhase: 0,
        timer: 7.5,
        trooperOut: false,
        trooperX: tf.x,
        trooperZ: tf.z + 2.2,
      };
      state.events.push({ type: 'police_arrive', x: tf.x, z: tf.z });
      setVoiceCallout(
        state,
        'trooper',
        'TN State Trooper',
        'Highway 52 Patrol',
        '"TENNESSEE STATE POLICE! Break up that trucker fight! And Piss Jugman, hands where I can see \'em!"',
        'trooper_siren',
        4.6,
      );
    }

    if (tf.timer <= 0) {
      state.truckerFight = null;
    }
  }

  if (state.police.active) {
    const cop = state.police;
    cop.prevX = cop.x;
    cop.prevZ = cop.z;
    cop.sirenPhase += dt * 12;

    if (cop.state === 'arriving') {
      const dx = cop.targetX - cop.x;
      const dz = cop.targetZ - cop.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.7) {
        cop.state = 'breaking_up';
        cop.trooperOut = true;
        cop.trooperX = cop.x - 1.3;
        cop.trooperZ = cop.z - 0.8;
        cop.timer = 6.5;
        if (state.truckerFight && !state.truckerFight.brokenUp) {
          state.truckerFight.brokenUp = true;
          state.truckerFight.timer = 2.8;
          state.events.push({ type: 'police_breakup', x: cop.x, z: cop.z });
          addPop(state, cop.x, 2.5, cop.z, '🚔 TROOPER BROKE UP FIGHT!', '#60a5fa', 1.8);
        }
      } else {
        const spd = 8.2;
        cop.x += (dx / d) * spd * dt;
        cop.z += (dz / d) * spd * dt;
        cop.facing = Math.atan2(dx, dz);
      }
    } else if (cop.state === 'breaking_up') {
      cop.timer -= dt;
      if (cop.timer <= 0) {
        cop.trooperOut = false;
        cop.state = 'departing';
      }
    } else if (cop.state === 'departing') {
      const dx = 0 - cop.x;
      const dz = 22 - cop.z;
      const d = Math.hypot(dx, dz);
      cop.x += (dx / Math.max(0.1, d)) * 9.0 * dt;
      cop.z += (dz / Math.max(0.1, d)) * 9.0 * dt;
      cop.facing = Math.atan2(dx, dz);
      if (cop.z > 20.5) {
        cop.active = false;
      }
    }
  }

  // --- WEIRD ALIEN & UFO ABDUCTING PISS JUGS ---
  state.nextUfoCooldown -= dt;
  if (state.nextUfoCooldown <= 0 && !state.ufo.active) {
    spawnUfoEvent(state);
    state.nextUfoCooldown = 50 + Math.random() * 14;
  }

  if (state.ufo.active) {
    const ufo = state.ufo;
    ufo.prevX = ufo.x;
    ufo.prevY = ufo.y;
    ufo.prevZ = ufo.z;
    ufo.hoverPhase += dt * 4.5;
    if (ufo.alienHitFlash > 0) ufo.alienHitFlash = Math.max(0, ufo.alienHitFlash - dt);

    if (ufo.state === 'entering') {
      const tx = 0;
      const tz = 1.5;
      ufo.x += (tx - ufo.x) * Math.min(1, dt * 1.9);
      ufo.y += (5.8 - ufo.y) * Math.min(1, dt * 2.2);
      ufo.z += (tz - ufo.z) * Math.min(1, dt * 1.9);
      if (dist2D(ufo.x, ufo.z, tx, tz) < 1.4) {
        ufo.state = 'abducting';
        ufo.beamActive = true;
        ufo.alienOut = true;
        ufo.alienX = ufo.x;
        ufo.alienZ = ufo.z;
      }
    } else if (ufo.state === 'abducting') {
      ufo.timer -= dt;
      // Pick closest ground jug to abduct!
      let target = state.jugs.find((j) => j.id === ufo.targetJugId && j.state === 'abducting');
      if (!target) {
        const groundJugs = state.jugs.filter((j) => j.state === 'ground');
        if (groundJugs.length > 0) {
          groundJugs.sort((a, b) => dist2D(ufo.x, ufo.z, a.x, a.z) - dist2D(ufo.x, ufo.z, b.x, b.z));
          target = groundJugs[0];
          ufo.targetJugId = target.id;
        }
      }

      if (target) {
        const dx = target.x - ufo.x;
        const dz = target.z - ufo.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.65) {
          const spd = 4.2;
          ufo.x += (dx / d) * spd * dt;
          ufo.z += (dz / d) * spd * dt;
        } else {
          target.state = 'abducting';
        }
      } else {
        // Orbit center looking for jugs
        ufo.x = Math.cos(ufo.hoverPhase * 0.4) * 5.2;
        ufo.z = 2 + Math.sin(ufo.hoverPhase * 0.4) * 5.2;
      }

      ufo.y = 5.6 + Math.sin(ufo.hoverPhase) * 0.35;
      // Alien hovers right beneath the tractor beam so player can sprint in and BONK him!
      ufo.alienX += (ufo.x - ufo.alienX) * Math.min(1, dt * 5);
      ufo.alienZ += (ufo.z - ufo.alienZ) * Math.min(1, dt * 5);

      if (ufo.timer <= 0 || ufo.jugsStolen >= 4) {
        ufo.state = 'fleeing';
        ufo.beamActive = false;
        ufo.alienOut = false;
      }
    } else if (ufo.state === 'fleeing') {
      ufo.x += 16 * dt;
      ufo.y += 9 * dt;
      if (ufo.x > 28 || ufo.y > 18) {
        ufo.active = false;
      }
    }
  }

  // --- BLIND DONNY'S ROVING FORKLIFT CAMEO ---
  state.nextForkliftCooldown -= dt;
  if (state.nextForkliftCooldown <= 0 && !state.forklift.active) {
    const goRight = Math.random() < 0.5;
    state.forklift = {
      active: true,
      x: goRight ? -17.5 : 17.5,
      z: -6.9,
      prevX: goRight ? -17.5 : 17.5,
      prevZ: -6.9,
      facing: goRight ? Math.PI / 2 : -Math.PI / 2,
      speed: 4.8,
      honkTimer: 0.4,
      dir: goRight ? 1 : -1,
    };
    state.nextForkliftCooldown = 28 + Math.random() * 14;
    if (!state.voiceCallout) {
      setVoiceCallout(
        state,
        'donny',
        'Blind Donny Day',
        'Certified Blind Forklift Operator',
        '"Beep beep! Blind Donny comin\' through on the forklift! Watch your toes!"',
        'donny_forklift',
        3.8,
      );
    }
  }

  if (state.forklift.active) {
    const fl = state.forklift;
    fl.prevX = fl.x;
    fl.prevZ = fl.z;
    fl.x += fl.dir * fl.speed * dt;
    fl.honkTimer -= dt;
    if (fl.honkTimer <= 0) fl.honkTimer = 0.85;

    // Comedic bump if player steps right in front of Blind Donny!
    if (p.stunTimer <= 0 && dist2D(p.x, p.z, fl.x, fl.z) < 1.55) {
      p.stunTimer = 0.85;
      p.z += p.z >= fl.z ? 1.4 : -1.4;
      const safe = resolveWorldCollisions(p.x, p.z, 0.45);
      p.x = safe.x;
      p.z = safe.z;
      state.events.push({ type: 'forklift_bump', x: fl.x, z: fl.z });
      addPop(state, fl.x, 2.2, fl.z, 'BEEP! BLIND DONNY CLIPPED YA!', '#facc15', 1.6);
    }

    if (Math.abs(fl.x) > 19.5) {
      fl.active = false;
    }
  }

  // --- CEO DENNIS HERNIPLE HELICOPTER FLYOVER ---
  state.nextHeliCooldown -= dt;
  if (state.nextHeliCooldown <= 0 && !state.helicopter.active) {
    state.helicopter = {
      active: true,
      x: -24,
      y: 11.2,
      z: -6.5,
      rotorAngle: 0,
      timer: 9,
    };
    state.nextHeliCooldown = 65;
    state.events.push({ type: 'heli_flyover' });
    setVoiceCallout(
      state,
      'dennis',
      'Dennis Herniple',
      'CEO · Celina 52',
      '"Flying over in my helicopter! Remember: Stay in business and Make Record Profits!"',
      'dennis_profits',
      4.5,
    );
    // CEO drops a golden jug from the chopper!
    spawnJug(state, 0, -2.0, 'golden_trucker');
  }

  if (state.helicopter.active) {
    state.helicopter.x += 6.2 * dt;
    state.helicopter.rotorAngle += dt * 28;
    if (state.helicopter.x > 26) {
      state.helicopter.active = false;
    }
  }
}

export function getShiftGrade(score: number, cashWon: number): {
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  verdict: string;
} {
  if (score >= 4200 || cashWon >= 200) {
    return {
      grade: 'S',
      verdict: 'LEGEND OF WEABER VALLEY! Dennis Herniple chose NOT to fire you today!',
    };
  }
  if (score >= 2800 || cashWon >= 80) {
    return {
      grade: 'A',
      verdict: 'EMPLOYEE OF THE MONTH! Piss Jugman salutes your heroic urine jug hustle!',
    };
  }
  if (score >= 1600 || cashWon >= 30) {
    return {
      grade: 'B',
      verdict: 'SOLID TRUCK STOP SHIFT! Colby upgraded you to Senior Jug Specialist!',
    };
  }
  if (score >= 750) {
    return {
      grade: 'C',
      verdict: 'SURVIVED THE LOT! Blind Donny only clipped you once and the aliens barely got any jugs!',
    };
  }
  return {
    grade: 'D',
    verdict: 'URINE TROUBLE! Grab more jugs, smack those aliens, and cash in at Colby’s counter!',
  };
}
