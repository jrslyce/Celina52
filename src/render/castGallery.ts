import {
  Container3D,
  DirectionalLight,
  PointLight,
  View3D,
} from '@pixi/3d';
import { Application } from 'pixi.js';
import type { VoiceClipId } from '../sim/types';
import {
  buildBlindDonnyForkliftModel,
  buildColbyModel,
  buildDennisModel,
  buildJanitorModel,
  buildLotLizardModel,
  buildNevaehModel,
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

export interface CastGalleryEntry {
  id: string;
  name: string;
  role: string;
  bio: string;
  voiceClip?: VoiceClipId;
  camDist: number;
  camY: number;
  lookY: number;
  build: () => Container3D;
}

export const CAST_GALLERY_ENTRIES: CastGalleryEntry[] = [
  {
    id: 'piss_jugman',
    name: 'Piss Jugman',
    role: 'Official 8-Ft Mascot ("Fill It Up Guy")',
    bio: 'Towers 8 feet tall over Celina 52! Teaches "Urine Trouble If You Litter," won a steel cage match against Smokey the Bear, and patrols the lot with you.',
    voiceClip: 'jugman_intro',
    camDist: 4.95,
    camY: 1.75,
    lookY: 1.42,
    build: () => buildPissJugmanModel().root,
  },
  {
    id: 'nevaeh',
    name: 'Nevaeh Petty',
    role: 'Lot Attendant & Urine Jug Specialist',
    bio: 'Runs the unauthorized jug recovery program & Nevaeh’s Bonus Hole quarter pusher. Fastest jug collector on Highway 52!',
    voiceClip: 'nevaeh_preview',
    camDist: 3.1,
    camY: 1.45,
    lookY: 0.92,
    build: () => buildNevaehModel().root,
  },
  {
    id: 'colby',
    name: 'Colby Kappleman',
    role: '2nd Shift LEAD Cashier',
    bio: 'Served 3 semesters in JROTC & survived a direct meteorite strike! Runs the Urine Jug Exchange & Scratcher Lotto Counter.',
    voiceClip: 'colby_welcome',
    camDist: 3.1,
    camY: 1.45,
    lookY: 0.92,
    build: () => buildColbyModel().root,
  },
  {
    id: 'donny',
    name: 'Blind Donny Day',
    role: 'Certified Blind Forklift Operator',
    bio: 'Completely blind, certified mystic, hunter, aspiring chef, and can smell the difference between a $1 and $20 bill. Watch your toes!',
    voiceClip: 'donny_forklift',
    camDist: 4.8,
    camY: 2.15,
    lookY: 1.15,
    build: () => buildBlindDonnyForkliftModel().root,
  },
  {
    id: 'rodney',
    name: 'Rodney Bartow',
    role: 'Head of Security',
    bio: 'Two tours in the Cold War and Waffle House Security. Trigger-happy with his yellow tactical taser!',
    voiceClip: 'rodney_preview',
    camDist: 3.2,
    camY: 1.48,
    lookY: 0.95,
    build: () => buildRodneyModel().root,
  },
  {
    id: 'janitor',
    name: 'Janitor',
    role: 'Stock-Room Custodian & Jetpack Pioneer',
    bio: 'Works 1st & 2nd shift 7 days a week and lives in the stock room. Reached 12 inches of altitude on his homemade jetpack before an O-ring blew!',
    voiceClip: 'janitor_preview',
    camDist: 3.2,
    camY: 1.45,
    lookY: 0.92,
    build: () => buildJanitorModel().root,
  },
  {
    id: 'dennis',
    name: 'Dennis Herniple',
    role: 'Elusive Helicopter CEO',
    bio: 'Two simple goals: Stay in business and Make Record Profits. Reduced on-site worker fatalities by nearly 30% since 2019!',
    voiceClip: 'dennis_profits',
    camDist: 3.1,
    camY: 1.45,
    lookY: 0.92,
    build: () => buildDennisModel().root,
  },
  {
    id: 'jerry',
    name: 'Jerry Petty',
    role: 'Fired Transportation Director',
    bio: 'Terminated after 22 years following a legendary parking-lot brawl with Piss Jugman. Still shows up to start trucker fights!',
    voiceClip: 'jugman_help_trucker',
    camDist: 3.2,
    camY: 1.48,
    lookY: 0.95,
    build: () => buildTruckerModel(0xb91c1c).root,
  },
  {
    id: 'alien_ufo',
    name: 'Zorg & The Piss Jug UFO',
    role: 'Extraterrestrial Nectar Thief',
    bio: 'Swoops over Celina 52 with a neon-green tractor beam to abduct trucker jugs. Smack him to drop Radioactive Bonus Jugs!',
    voiceClip: 'alien_steal',
    camDist: 5.5,
    camY: 2.6,
    lookY: 1.6,
    build: () => {
      const g = new Container3D();
      const u = buildUfoModel();
      u.root.position.set(0, 2.35, 0);
      u.root.scale.set(0.68, 0.68, 0.68);
      const a = buildWeirdAlienModel();
      a.root.position.set(0, 0.1, 0);
      g.addChild(u.root, a.root);
      return g;
    },
  },
  {
    id: 'lot_lizard',
    name: 'Lot Lizard',
    role: 'Semi-Cab Hopper',
    bio: 'Struts across the lot and hops right into parked 18-wheeler cabs! Sometimes swings her gold clutch purse at Piss Jugman.',
    voiceClip: 'nevaeh_lizard',
    camDist: 3.1,
    camY: 1.45,
    lookY: 0.92,
    build: () => buildLotLizardModel(0xec4899).root,
  },
  {
    id: 'raccoon',
    name: 'Dumpster Raccoon',
    role: 'Trash-Panda Ambush Gang',
    bio: 'Lurks behind the Celina 52 dumpster and jumps Piss Jugman in packs of three!',
    voiceClip: 'jugman_help_raccoon',
    camDist: 2.3,
    camY: 0.95,
    lookY: 0.45,
    build: () => buildRaccoonModel().root,
  },
  {
    id: 'trooper',
    name: 'TN State Trooper',
    role: 'Highway 52 Patrol',
    bio: 'Speeds into the lot with sirens blazing to break up trucker fights—and still keeps a suspicious eye on Piss Jugman.',
    voiceClip: 'trooper_siren',
    camDist: 5.8,
    camY: 2.0,
    lookY: 0.95,
    build: () => {
      const g = new Container3D();
      const car = buildPoliceCruiserModel();
      car.root.position.set(-0.6, 0, -0.3);
      car.root.scale.set(0.75, 0.75, 0.75);
      const tr = buildTrooperModel();
      tr.root.position.set(1.15, 0, 0.65);
      g.addChild(car.root, tr.root);
      return g;
    },
  },
  {
    id: 'vagrant',
    name: 'Lot Vagrant',
    role: 'Midnight Jug Scavenger',
    bio: 'Tries to swipe Piss Jugman’s iconic black screw-cap when nobody is looking!',
    voiceClip: 'jugman_help_vagrant',
    camDist: 3.1,
    camY: 1.45,
    lookY: 0.92,
    build: () => buildVagrantModel().root,
  },
];

/**
 * Dedicated interactive 3D Turntable Viewer for the "Meet the Celina 52 Cast" modal!
 */
export class CastGalleryViewer {
  private app: Application | null = null;
  private view3d: View3D | null = null;
  private turntable: Container3D | null = null;
  private currentModel: Container3D | null = null;
  private angle = 0;
  private dragging = false;
  private lastPointerX = 0;
  private initialized = false;

  constructor(private readonly host: HTMLElement) {}

  public async ensureInit(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const app = new Application();
    await app.init({
      width: 340,
      height: 240,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      backgroundColor: 0x0b1120,
    });
    this.host.innerHTML = '';
    this.host.appendChild(app.canvas);
    this.app = app;

    const view3d = new View3D({
      width: 340,
      height: 240,
      autoResize: false,
      toneMapping: 'aces',
      exposure: 1.15,
      environment: {
        skyColor: 0xffe4b5,
        groundColor: 0x1e293b,
        intensity: 0.95,
      },
      background: {
        skyColor: 0x1e293b,
        groundColor: 0x060913,
        intensity: 1.0,
      },
    });
    app.stage.addChild(view3d);
    this.view3d = view3d;

    const key = new DirectionalLight({
      color: 0xfff3d6,
      intensity: 2.7,
      position: { x: 2.5, y: 4.5, z: 3.8 },
      parent: view3d.root,
    });
    key.lookAt({ x: 0, y: 1.0, z: 0 });

    new PointLight({
      color: 0xfacc15,
      intensity: 12,
      range: 10,
      position: { x: -2.4, y: 2.6, z: 1.2 },
      parent: view3d.root,
    });

    this.turntable = new Container3D({ parent: view3d.root });
    view3d.camera.fov = 38;

    // Drag to spin 3D character models!
    app.canvas.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.lastPointerX = e.clientX;
      app.canvas.setPointerCapture(e.pointerId);
    });
    app.canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastPointerX;
      this.lastPointerX = e.clientX;
      this.angle += dx * 0.015;
    });
    const stopDrag = () => {
      this.dragging = false;
    };
    app.canvas.addEventListener('pointerup', stopDrag);
    app.canvas.addEventListener('pointercancel', stopDrag);

    app.ticker.add((ticker) => {
      if (!this.turntable) return;
      if (!this.dragging) {
        this.angle += (ticker.deltaMS / 1000) * 0.72;
      }
      this.turntable.rotation.y = this.angle;
    });
  }

  public showEntry(entry: CastGalleryEntry): void {
    if (!this.turntable || !this.view3d) return;
    if (this.currentModel) {
      this.turntable.removeChild(this.currentModel);
      this.currentModel.destroy({ children: true });
      this.currentModel = null;
    }
    this.currentModel = entry.build();
    this.turntable.addChild(this.currentModel);
    this.angle = -0.35;
    this.view3d.camera.position.set(0, entry.camY, entry.camDist);
    this.view3d.camera.lookAt({ x: 0, y: entry.lookY, z: 0 });
  }
}
