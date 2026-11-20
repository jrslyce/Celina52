import {
  Container3D,
  FlatMaterial,
  Mesh3D,
  SphereGeometry,
} from '@pixi/3d';
import type { GameState, PlayableWorkerId } from '../sim/types';
import {
  type AnimatedCharacterRig,
  buildBlindDonnyForkliftModel,
  buildCeoHelicopterModel,
  buildJanitorModel,
  buildLotLizardModel,
  buildNevaehModel,
  buildPissJugProp,
  buildPissJugmanModel,
  buildPoliceCruiserModel,
  buildRaccoonModel,
  buildRodneyModel,
  buildTrooperModel,
  buildTruckerModel,
  buildUfoModel,
  buildVagrantModel,
  buildWeirdAlienModel,
} from './castModels';

interface Particle {
  mesh: Mesh3D;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function animateHumanoidWalk(
  rig: AnimatedCharacterRig,
  phase: number,
  moveWeight: number,
  punchAmt = 0,
): void {
  const swing = Math.sin(phase) * 0.72 * moveWeight;
  if (rig.leftLeg) rig.leftLeg.rotation.x = swing;
  if (rig.rightLeg) rig.rightLeg.rotation.x = -swing;
  if (rig.leftArm) {
    rig.leftArm.rotation.x = -swing * 0.85;
  }
  if (rig.rightArm) {
    rig.rightArm.rotation.x = punchAmt > 0 ? -1.55 - Math.sin(punchAmt * Math.PI) * 0.9 : swing * 0.85;
  }
  if (rig.torso) {
    rig.torso.rotation.y = punchAmt > 0 ? -Math.sin(punchAmt * Math.PI) * 0.5 : 0;
  }
  rig.root.position.y = Math.abs(Math.sin(phase)) * 0.09 * moveWeight;
}

export class EntitiesRenderer {
  public readonly root: Container3D;

  // Player rigs (Nevaeh, Janitor, Rodney) + carried jug stack visual!
  private readonly playerWrap: Container3D;
  private readonly workerRigs: Record<PlayableWorkerId, AnimatedCharacterRig>;
  private activeWorker: PlayableWorkerId = 'nevaeh';
  private readonly carriedStackRoot: Container3D;
  private readonly carriedStackJugs: Container3D[] = [];
  private playerWalkPhase = 0;

  // Piss Jugman (8-ft mascot!)
  private readonly jugmanRig: AnimatedCharacterRig;

  // Dynamic pools / maps
  private readonly jugMeshes = new Map<number, Container3D>();
  private readonly lizardRigs = new Map<number, AnimatedCharacterRig>();
  private readonly brawlEnemyRigs = new Map<number, AnimatedCharacterRig>();
  private readonly brawlDustGroup: Container3D;

  // Trucker Fight + Police Cruiser + State Trooper
  private readonly fightGroup: Container3D;
  private readonly fighterARig: AnimatedCharacterRig;
  private readonly fighterBRig: AnimatedCharacterRig;
  private readonly fightDustGroup: Container3D;
  private readonly policeCruiser: { root: Container3D; redLight: Mesh3D; blueLight: Mesh3D };
  private readonly trooperRig: AnimatedCharacterRig;

  // UFO + Weird Alien
  private readonly ufoVisual: { root: Container3D; saucerSpin: Container3D; beamMesh: Mesh3D };
  private readonly alienRig: AnimatedCharacterRig;

  // Blind Donny Forklift + Dennis Herniple Helicopter
  private readonly forkliftRig: AnimatedCharacterRig;
  private readonly helicopterVisual: { root: Container3D; rotor: Container3D };

  // Juicy 3D Particles
  private readonly particles: Particle[] = [];
  private readonly particleGeo = new SphereGeometry({ radius: 0.14, widthSegments: 8, heightSegments: 6 });
  private readonly particleMats = {
    gold: new FlatMaterial({ baseColor: 0xfde047 }),
    green: new FlatMaterial({ baseColor: 0x4ade80 }),
    pink: new FlatMaterial({ baseColor: 0xf472b6 }),
    red: new FlatMaterial({ baseColor: 0xfb7185 }),
    cyan: new FlatMaterial({ baseColor: 0x38bdf8 }),
    white: new FlatMaterial({ baseColor: 0xfefce8 }),
  };

  constructor() {
    this.root = new Container3D({ label: 'DynamicEntities' });

    // 1. Player Wrap & All 3 Playable Celina 52 Workers
    this.playerWrap = new Container3D({ label: 'PlayerWrap', parent: this.root });
    this.workerRigs = {
      nevaeh: buildNevaehModel(),
      janitor: buildJanitorModel(),
      rodney: buildRodneyModel(),
    };
    for (const [id, rig] of Object.entries(this.workerRigs)) {
      rig.root.visible = id === this.activeWorker;
      this.playerWrap.addChild(rig.root);
    }

    // Visual stack of carried piss jugs hovering neatly in front of player!
    this.carriedStackRoot = new Container3D({
      position: { x: 0, y: 0.72, z: 0.42 },
      parent: this.playerWrap,
    });
    for (let i = 0; i < 8; i++) {
      const mini = buildPissJugProp(i % 4 === 3 ? 'golden_trucker' : 'standard');
      mini.scale.set(0.62, 0.62, 0.62);
      const col = i % 2 === 0 ? -0.15 : 0.15;
      const row = Math.floor(i / 2);
      mini.position.set(col, row * 0.28, (row % 2) * 0.08);
      mini.visible = false;
      this.carriedStackRoot.addChild(mini);
      this.carriedStackJugs.push(mini);
    }

    // 2. Piss Jugman!
    this.jugmanRig = buildPissJugmanModel();
    this.root.addChild(this.jugmanRig.root);

    // 3. Cartoon Brawl Dust Cloud (for Piss Jugman Brawls!)
    this.brawlDustGroup = this.createCartoonDustCloud();
    this.brawlDustGroup.visible = false;
    this.root.addChild(this.brawlDustGroup);

    // 4. Trucker Fight + Police Cruiser + State Trooper
    this.fightGroup = new Container3D({ visible: false, parent: this.root });
    this.fighterARig = buildTruckerModel(0xb91c1c);
    this.fighterBRig = buildTruckerModel(0x1d4ed8);
    this.fightDustGroup = this.createCartoonDustCloud();
    this.fightGroup.addChild(this.fighterARig.root, this.fighterBRig.root, this.fightDustGroup);

    this.policeCruiser = buildPoliceCruiserModel();
    this.policeCruiser.root.visible = false;
    this.root.addChild(this.policeCruiser.root);

    this.trooperRig = buildTrooperModel();
    this.trooperRig.root.visible = false;
    this.root.addChild(this.trooperRig.root);

    // 5. UFO + Weird Alien
    this.ufoVisual = buildUfoModel();
    this.ufoVisual.root.visible = false;
    this.root.addChild(this.ufoVisual.root);

    this.alienRig = buildWeirdAlienModel();
    this.alienRig.root.visible = false;
    this.root.addChild(this.alienRig.root);

    // 6. Blind Donny Forklift + Dennis Herniple Helicopter
    this.forkliftRig = buildBlindDonnyForkliftModel();
    this.forkliftRig.root.visible = false;
    this.root.addChild(this.forkliftRig.root);

    this.helicopterVisual = buildCeoHelicopterModel();
    this.helicopterVisual.root.visible = false;
    this.root.addChild(this.helicopterVisual.root);
  }

  private createCartoonDustCloud(): Container3D {
    const g = new Container3D();
    const puffGeo = new SphereGeometry({ radius: 0.42, widthSegments: 10, heightSegments: 8 });
    const puffMat = new FlatMaterial({ baseColor: 0xfef3c7 });
    const starMat = new FlatMaterial({ baseColor: 0xfacc15 });
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      new Mesh3D({
        geometry: puffGeo,
        material: i % 2 === 0 ? puffMat : starMat,
        position: { x: Math.cos(ang) * 0.72, y: 0.75 + (i % 2) * 0.35, z: Math.sin(ang) * 0.72 },
        scale: { x: 0.8 + (i % 3) * 0.22, y: 0.8, z: 0.8 },
        castShadow: false,
        parent: g,
      });
    }
    return g;
  }

  public setWorker(worker: PlayableWorkerId): void {
    if (this.activeWorker === worker) return;
    this.activeWorker = worker;
    for (const [id, rig] of Object.entries(this.workerRigs)) {
      rig.root.visible = id === worker;
    }
  }

  public spawnBurst(
    x: number,
    y: number,
    z: number,
    color: keyof EntitiesRenderer['particleMats'],
    count = 10,
  ): void {
    const mat = this.particleMats[color];
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.8 + Math.random() * 3.8;
      const mesh = new Mesh3D({
        geometry: this.particleGeo,
        material: mat,
        position: { x, y, z },
        castShadow: false,
        parent: this.root,
      });
      this.particles.push({
        mesh,
        vx: Math.cos(ang) * spd,
        vy: 2.5 + Math.random() * 3.8,
        vz: Math.sin(ang) * spd,
        age: 0,
        life: 0.45 + Math.random() * 0.35,
      });
    }
  }

  public sync(state: GameState, dt: number, alpha: number, visualTime: number): void {
    this.setWorker(state.workerChoice);

    // --- 1. PLAYER CHARACTER ---
    const px = lerp(state.player.prevX, state.player.x, alpha);
    const pz = lerp(state.player.prevZ, state.player.z, alpha);
    const pFacing = lerpAngle(state.player.prevFacing, state.player.facing, alpha);

    this.playerWrap.position.set(px, 0, pz);
    this.playerWrap.rotation.y = state.phase === 'title' ? 0.25 : pFacing;

    const moveRatio = state.phase === 'playing' ? Math.min(1.2, state.player.speed / 5.5) : 0;
    this.playerWalkPhase += dt * (4 + moveRatio * 10);
    const punchAmt = state.player.punchTimer > 0 ? state.player.punchTimer / 0.28 : 0;
    const activeRig = this.workerRigs[this.activeWorker];
    animateHumanoidWalk(activeRig, this.playerWalkPhase, moveRatio, punchAmt);

    // Stun wobble if clipped by Blind Donny!
    if (state.player.stunTimer > 0) {
      activeRig.root.rotation.z = Math.sin(visualTime * 30) * 0.35;
    } else {
      activeRig.root.rotation.z = 0;
    }

    // Carried Jug Stack in arms!
    const visStack = Math.min(this.carriedStackJugs.length, state.player.carriedJugs);
    for (let i = 0; i < this.carriedStackJugs.length; i++) {
      this.carriedStackJugs[i].visible = i < visStack;
    }
    this.carriedStackRoot.position.y = 0.72 + Math.sin(this.playerWalkPhase * 2) * 0.04 * moveRatio;

    // --- 2. PISS JUGMAN ---
    const jx = lerp(state.jugman.prevX, state.jugman.x, alpha);
    const jz = lerp(state.jugman.prevZ, state.jugman.z, alpha);
    this.jugmanRig.root.position.set(jx, 0, jz);
    this.jugmanRig.root.rotation.y = lerpAngle(state.jugman.prevFacing, state.jugman.facing, alpha);
    const jmMove = state.jugman.state === 'brawling' ? 1.25 : 0.78;
    const jmPunchR = state.jugman.state === 'brawling' ? Math.max(0, Math.sin(visualTime * 16)) : 0;
    const jmPunchL = state.jugman.state === 'brawling' ? Math.max(0, Math.sin(visualTime * 16 + Math.PI)) : 0;
    animateHumanoidWalk(this.jugmanRig, state.jugman.animPhase, jmMove, jmPunchR);
    if (this.jugmanRig.leftArm && jmPunchL > 0) {
      this.jugmanRig.leftArm.rotation.x = -1.55 - Math.sin(jmPunchL * Math.PI) * 0.85;
    }
    if (this.jugmanRig.torso) {
      // Heavy menacing shoulder swagger on patrol, or triumphant pump!
      this.jugmanRig.torso.rotation.z = Math.sin(state.jugman.animPhase) * 0.065 * jmMove;
    }
    if (state.jugman.state === 'celebrating') {
      this.jugmanRig.root.position.y = Math.abs(Math.sin(visualTime * 10)) * 0.45;
      if (this.jugmanRig.leftArm) this.jugmanRig.leftArm.rotation.x = -2.4 + Math.sin(visualTime * 14) * 0.35;
      if (this.jugmanRig.rightArm) this.jugmanRig.rightArm.rotation.x = -2.4 + Math.cos(visualTime * 14) * 0.35;
    }

    // --- 3. PISS JUGS ON LOT ---
    const activeJugIds = new Set<number>();
    for (const jug of state.jugs) {
      activeJugIds.add(jug.id);
      let mesh = this.jugMeshes.get(jug.id);
      if (!mesh) {
        mesh = buildPissJugProp(jug.kind);
        this.root.addChild(mesh);
        this.jugMeshes.set(jug.id, mesh);
      }
      const bob = jug.state === 'ground' && jug.y === 0 ? Math.sin(visualTime * 4 + jug.id) * 0.06 : 0;
      mesh.position.set(jug.x, jug.y + bob, jug.z);
      mesh.rotation.y = jug.rotation + (jug.kind === 'golden_trucker' || jug.kind === 'radioactive' ? visualTime * 2.2 : 0);
      mesh.rotation.z = jug.state === 'abducting' ? Math.sin(visualTime * 12) * 0.45 : 0;
    }
    for (const [id, mesh] of this.jugMeshes.entries()) {
      if (!activeJugIds.has(id)) {
        this.root.removeChild(mesh);
        mesh.destroy({ children: true });
        this.jugMeshes.delete(id);
      }
    }

    // --- 4. ACTIVE BRAWL ENEMIES & DUST ---
    const activeEnemyIds = new Set<number>();
    if (state.activeBrawl) {
      this.brawlDustGroup.visible = true;
      this.brawlDustGroup.position.set(state.activeBrawl.x, 0, state.activeBrawl.z);
      this.brawlDustGroup.rotation.y = visualTime * 5.2;

      for (const enemy of state.activeBrawl.enemies) {
        activeEnemyIds.add(enemy.id);
        let rig = this.brawlEnemyRigs.get(enemy.id);
        if (!rig) {
          if (enemy.kind === 'raccoon') rig = buildRaccoonModel();
          else if (enemy.kind === 'vagrant') rig = buildVagrantModel();
          else if (enemy.kind === 'lot_lizard') rig = buildLotLizardModel(enemy.variantColor);
          else rig = buildTruckerModel(enemy.variantColor);
          this.root.addChild(rig.root);
          this.brawlEnemyRigs.set(enemy.id, rig);
        }
        rig.root.position.set(lerp(enemy.prevX, enemy.x, alpha), 0, lerp(enemy.prevZ, enemy.z, alpha));
        rig.root.rotation.y = enemy.facing;
        const hop = enemy.hitFlash > 0 ? 0.35 : Math.abs(Math.sin(visualTime * 12 + enemy.id)) * 0.18;
        rig.root.position.y = hop;
        rig.root.rotation.z = enemy.state === 'knocked_out' ? 1.1 : enemy.hitFlash > 0 ? -0.35 : 0;
        if (rig.rightArm) {
          rig.rightArm.rotation.x = -1.2 + Math.sin(visualTime * 16 + enemy.id) * 0.7;
        }
      }
    } else {
      this.brawlDustGroup.visible = false;
    }
    for (const [id, rig] of this.brawlEnemyRigs.entries()) {
      if (!activeEnemyIds.has(id)) {
        this.root.removeChild(rig.root);
        rig.root.destroy({ children: true });
        this.brawlEnemyRigs.delete(id);
      }
    }

    // --- 5. LOT LIZARDS WALKING & JUMPING INTO TRUCKS ---
    const activeLizardIds = new Set<number>();
    for (const liz of state.lotLizards) {
      activeLizardIds.add(liz.id);
      let rig = this.lizardRigs.get(liz.id);
      if (!rig) {
        rig = buildLotLizardModel(liz.outfitColor);
        this.root.addChild(rig.root);
        this.lizardRigs.set(liz.id, rig);
      }
      if (liz.state === 'inside_truck') {
        rig.root.visible = false;
      } else {
        rig.root.visible = true;
        const lx = lerp(liz.prevX, liz.x, alpha);
        const lz = lerp(liz.prevZ, liz.z, alpha);
        const jumpY = liz.state === 'jumping_in' ? Math.sin(liz.jumpProgress * Math.PI) * 1.9 + liz.jumpProgress * 1.1 : 0;
        rig.root.position.set(lx, jumpY, lz);
        rig.root.rotation.y = liz.facing;
        animateHumanoidWalk(rig, visualTime * 10 + liz.id, liz.state === 'jumping_in' ? 0.2 : 1.0);
      }
    }
    for (const [id, rig] of this.lizardRigs.entries()) {
      if (!activeLizardIds.has(id)) {
        this.root.removeChild(rig.root);
        rig.root.destroy({ children: true });
        this.lizardRigs.delete(id);
      }
    }

    // --- 6. TRUCKER FIGHT & STATE TROOPER POLICE CRUISER ---
    if (state.truckerFight) {
      const tf = state.truckerFight;
      this.fightGroup.visible = true;
      this.fighterARig.root.position.set(tf.fighterA.x, 0, tf.fighterA.z);
      this.fighterARig.root.rotation.y = tf.fighterA.facing;
      this.fighterBRig.root.position.set(tf.fighterB.x, 0, tf.fighterB.z);
      this.fighterBRig.root.rotation.y = tf.fighterB.facing;
      const fighting = !tf.brokenUp;
      this.fightDustGroup.visible = fighting;
      this.fightDustGroup.position.set(tf.x, 0, tf.z);
      this.fightDustGroup.rotation.y = -visualTime * 6;
      animateHumanoidWalk(this.fighterARig, visualTime * 12, fighting ? 1 : 0, fighting ? (Math.sin(visualTime * 14) * 0.5 + 0.5) : 0);
      animateHumanoidWalk(this.fighterBRig, visualTime * 12 + 1.5, fighting ? 1 : 0, fighting ? (Math.cos(visualTime * 14) * 0.5 + 0.5) : 0);
    } else {
      this.fightGroup.visible = false;
    }

    if (state.police.active) {
      const cop = state.police;
      this.policeCruiser.root.visible = true;
      this.policeCruiser.root.position.set(lerp(cop.prevX, cop.x, alpha), 0, lerp(cop.prevZ, cop.z, alpha));
      this.policeCruiser.root.rotation.y = cop.facing;
      // Flashing red/blue siren lightbars!
      const flash = Math.sin(cop.sirenPhase) > 0;
      this.policeCruiser.redLight.scale.set(flash ? 1.25 : 0.75, flash ? 1.35 : 0.8, 1);
      this.policeCruiser.blueLight.scale.set(!flash ? 1.25 : 0.75, !flash ? 1.35 : 0.8, 1);

      this.trooperRig.root.visible = cop.trooperOut;
      if (cop.trooperOut) {
        this.trooperRig.root.position.set(cop.trooperX, 0, cop.trooperZ);
        this.trooperRig.root.rotation.y = Math.atan2(state.jugman.x - cop.trooperX, state.jugman.z - cop.trooperZ);
        animateHumanoidWalk(this.trooperRig, visualTime * 7, 0.35);
      }
    } else {
      this.policeCruiser.root.visible = false;
      this.trooperRig.root.visible = false;
    }

    // --- 7. UFO & WEIRD ALIEN ---
    if (state.ufo.active) {
      const u = state.ufo;
      this.ufoVisual.root.visible = true;
      this.ufoVisual.root.position.set(lerp(u.prevX, u.x, alpha), lerp(u.prevY, u.y, alpha), lerp(u.prevZ, u.z, alpha));
      this.ufoVisual.saucerSpin.rotation.y = visualTime * 3.4;
      this.ufoVisual.beamMesh.visible = u.beamActive;
      if (u.beamActive) {
        const s = 1 + Math.sin(visualTime * 11) * 0.08;
        this.ufoVisual.beamMesh.scale.set(s, 1, s);
      }

      this.alienRig.root.visible = u.alienOut;
      if (u.alienOut) {
        this.alienRig.root.position.set(u.alienX, 0.35 + Math.sin(visualTime * 7) * 0.25, u.alienZ);
        this.alienRig.root.rotation.y = visualTime * 2.1;
        this.alienRig.root.rotation.z = u.alienHitFlash > 0 ? 0.55 : Math.sin(visualTime * 5) * 0.14;
      }
    } else {
      this.ufoVisual.root.visible = false;
      this.alienRig.root.visible = false;
    }

    // --- 8. BLIND DONNY'S FORKLIFT & DENNIS HERNIPLE'S HELICOPTER ---
    if (state.forklift.active) {
      const fl = state.forklift;
      this.forkliftRig.root.visible = true;
      this.forkliftRig.root.position.set(lerp(fl.prevX, fl.x, alpha), 0, lerp(fl.prevZ, fl.z, alpha));
      this.forkliftRig.root.rotation.y = fl.facing;
    } else {
      this.forkliftRig.root.visible = false;
    }

    if (state.helicopter.active) {
      const h = state.helicopter;
      this.helicopterVisual.root.visible = true;
      this.helicopterVisual.root.position.set(h.x, h.y + Math.sin(visualTime * 4) * 0.25, h.z);
      this.helicopterVisual.rotor.rotation.y = h.rotorAngle;
    } else {
      this.helicopterVisual.root.visible = false;
    }

    // --- 9. PARTICLES ---
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.age += dt;
      if (pt.age >= pt.life) {
        this.root.removeChild(pt.mesh);
        pt.mesh.destroy();
        this.particles.splice(i, 1);
        continue;
      }
      pt.vy -= 11 * dt;
      pt.mesh.position.x += pt.vx * dt;
      pt.mesh.position.y = Math.max(0.05, pt.mesh.position.y + pt.vy * dt);
      pt.mesh.position.z += pt.vz * dt;
      const sc = Math.max(0.05, 1 - pt.age / pt.life);
      pt.mesh.scale.set(sc, sc, sc);
    }
  }
}
