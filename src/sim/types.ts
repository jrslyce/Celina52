export type GamePhase = 'title' | 'playing' | 'scratcher' | 'gameover';

export type PlayableWorkerId = 'nevaeh' | 'janitor' | 'rodney';

export type CastCharacterId =
  | 'piss_jugman'
  | 'nevaeh'
  | 'colby'
  | 'donny'
  | 'rodney'
  | 'janitor'
  | 'dennis'
  | 'jerry'
  | 'alien'
  | 'trooper';

export type VoiceClipId =
  | 'jugman_intro'
  | 'jugman_help_raccoon'
  | 'jugman_help_vagrant'
  | 'jugman_help_lizard'
  | 'jugman_help_trucker'
  | 'jugman_win'
  | 'jugman_ufo'
  | 'colby_welcome'
  | 'colby_cashin'
  | 'colby_scratcher'
  | 'colby_jackpot'
  | 'colby_bust'
  | 'nevaeh_preview'
  | 'nevaeh_lizard'
  | 'janitor_preview'
  | 'rodney_preview'
  | 'rodney_fight'
  | 'donny_forklift'
  | 'dennis_profits'
  | 'trooper_siren'
  | 'alien_steal';

export interface VoiceCallout {
  id: number;
  speaker: CastCharacterId;
  speakerName: string;
  speakerRole: string;
  text: string;
  clipId: VoiceClipId;
  ttl: number;
}

export interface PlayerInput {
  moveX: number;
  moveZ: number;
  actionTapQueued: boolean;
  actionHeld: boolean;
}

export interface GameModifiers {
  carryCapBonus: number;
  moveSpeedMult: number;
  brawlPowerMult: number;
  pickupRadiusMult: number;
}

export type JugKind = 'standard' | 'mega_dew' | 'golden_trucker' | 'radioactive';

export interface PissJug {
  id: number;
  kind: JugKind;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotation: number;
  points: number;
  state: 'ground' | 'abducting' | 'collected';
  age: number;
  abductProgress: number;
}

export interface TruckBay {
  id: number;
  x: number;
  z: number;
  facing: number;
  cabColor: number;
  trailerColor: number;
  trailerLabel: string;
  rockTimer: number;
  lizardInside: boolean;
  lizardTimer: number;
  jugDropCooldown: number;
}

export type ThreatKind = 'raccoon' | 'vagrant' | 'lot_lizard' | 'trucker';

export interface LotLizard {
  id: number;
  x: number;
  z: number;
  prevX: number;
  prevZ: number;
  facing: number;
  state: 'walking_to_truck' | 'jumping_in' | 'inside_truck' | 'leaving' | 'brawling' | 'fleeing';
  targetBayId: number;
  jumpProgress: number;
  timer: number;
  outfitColor: number;
  hp: number;
  maxHp: number;
  hitFlash: number;
}

export interface PissJugmanState {
  x: number;
  z: number;
  prevX: number;
  prevZ: number;
  facing: number;
  prevFacing: number;
  targetX: number;
  targetZ: number;
  state: 'patrol' | 'brawling' | 'celebrating';
  brawlId: number | null;
  stamina: number;
  animPhase: number;
  celebrateTimer: number;
}

export interface BrawlEnemy {
  id: number;
  kind: ThreatKind;
  x: number;
  z: number;
  prevX: number;
  prevZ: number;
  facing: number;
  hp: number;
  maxHp: number;
  hitFlash: number;
  state: 'fighting' | 'knocked_out';
  fleeVx: number;
  fleeVz: number;
  fleeTimer: number;
  variantColor: number;
}

export interface ActiveBrawl {
  id: number;
  kind: ThreatKind;
  x: number;
  z: number;
  enemies: BrawlEnemy[];
  timeRemaining: number;
  maxTime: number;
  dustPhase: number;
  jugmanHp: number;
}

export interface TruckerFight {
  id: number;
  x: number;
  z: number;
  timer: number;
  policeDispatched: boolean;
  brokenUp: boolean;
  dustPhase: number;
  fighterA: { x: number; z: number; facing: number; shirtColor: number };
  fighterB: { x: number; z: number; facing: number; shirtColor: number };
}

export interface PoliceCruiserState {
  active: boolean;
  state: 'arriving' | 'breaking_up' | 'departing';
  x: number;
  z: number;
  prevX: number;
  prevZ: number;
  facing: number;
  targetX: number;
  targetZ: number;
  sirenPhase: number;
  timer: number;
  trooperOut: boolean;
  trooperX: number;
  trooperZ: number;
}

export interface UfoAlienState {
  active: boolean;
  state: 'entering' | 'abducting' | 'stunned' | 'fleeing';
  x: number;
  y: number;
  z: number;
  prevX: number;
  prevY: number;
  prevZ: number;
  hoverPhase: number;
  beamActive: boolean;
  targetJugId: number | null;
  alienOut: boolean;
  alienX: number;
  alienZ: number;
  alienHp: number;
  alienMaxHp: number;
  alienHitFlash: number;
  timer: number;
  jugsStolen: number;
}

export interface ForkliftState {
  active: boolean;
  x: number;
  z: number;
  prevX: number;
  prevZ: number;
  facing: number;
  speed: number;
  honkTimer: number;
  dir: number;
}

export interface HelicopterState {
  active: boolean;
  x: number;
  y: number;
  z: number;
  rotorAngle: number;
  timer: number;
}

export interface FloatingPop {
  id: number;
  x: number;
  y: number;
  z: number;
  text: string;
  color: string;
  age: number;
  duration: number;
}

export type SimEventType =
  | 'jug_pickup'
  | 'jug_golden'
  | 'jug_cashin'
  | 'brawl_start'
  | 'brawl_hit'
  | 'brawl_win'
  | 'lizard_jump'
  | 'trucker_fight'
  | 'police_arrive'
  | 'police_breakup'
  | 'ufo_arrive'
  | 'ufo_steal'
  | 'alien_hit'
  | 'alien_defeat'
  | 'forklift_bump'
  | 'heli_flyover'
  | 'player_punch'
  | 'round_end';

export interface SimEvent {
  type: SimEventType;
  x?: number;
  y?: number;
  z?: number;
  value?: number;
}

export interface PlayerState {
  x: number;
  z: number;
  prevX: number;
  prevZ: number;
  facing: number;
  prevFacing: number;
  speed: number;
  carriedJugs: number;
  carriedValue: number;
  carryCap: number;
  punchTimer: number;
  punchCooldown: number;
  stunTimer: number;
  comboCount: number;
  comboTimer: number;
}

export interface GameState {
  phase: GamePhase;
  workerChoice: PlayableWorkerId;
  timeRemaining: number;
  elapsed: number;
  score: number;
  totalJugsCollected: number;
  totalJugsCashedIn: number;
  brawlsWon: number;
  aliensRepelled: number;
  fightsBrokenUp: number;
  lizardsSpotted: number;
  jugsAbducted: number;
  player: PlayerState;
  jugman: PissJugmanState;
  bays: TruckBay[];
  jugs: PissJug[];
  lotLizards: LotLizard[];
  activeBrawl: ActiveBrawl | null;
  truckerFight: TruckerFight | null;
  police: PoliceCruiserState;
  ufo: UfoAlienState;
  forklift: ForkliftState;
  helicopter: HelicopterState;
  pops: FloatingPop[];
  events: SimEvent[];
  voiceCallout: VoiceCallout | null;
  nextEntityId: number;
  nextBrawlCooldown: number;
  nextLizardCooldown: number;
  nextFightCooldown: number;
  nextUfoCooldown: number;
  nextForkliftCooldown: number;
  nextHeliCooldown: number;
  nextJugSpawnCooldown: number;
  brawlRotationIndex: number;
  alert30sPlayed: boolean;
  modifiers: GameModifiers;
}
