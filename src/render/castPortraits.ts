import {
  Container3D,
  CubeGeometry,
  DirectionalLight,
  FlatMaterial,
  Material3D,
  Mesh3D,
  PointLight,
  SphereGeometry,
  View3D,
} from '@pixi/3d';
import { type Application, RenderTexture } from 'pixi.js';
import type { CastCharacterId } from '../sim/types';
import {
  buildBlindDonnyForkliftModel,
  buildColbyModel,
  buildDennisModel,
  buildJanitorModel,
  buildNevaehModel,
  buildPissJugmanModel,
  buildRodneyModel,
  buildTrooperModel,
  buildTruckerModel,
  buildWeirdAlienModel,
} from './castModels';

export type CastPortraitMap = Record<CastCharacterId, string>;

/**
 * Renders crisp 200x200 live 3D bust snapshots of all 10 Celina 52 speaking characters
 * using PixiJS 3D View3D + RenderTexture.
 */
export async function renderCastPortraits(app: Application): Promise<CastPortraitMap> {
  const size = 200;
  const rt = RenderTexture.create({ width: size, height: size, antialias: true });

  const studio = new View3D({
    width: size,
    height: size,
    autoResize: false,
    toneMapping: 'aces',
    exposure: 1.15,
    shadowQuality: 'low',
    environment: {
      skyColor: 0xffe4b5,
      groundColor: 0x1e293b,
      intensity: 0.9,
    },
    background: {
      skyColor: 0x1e293b,
      groundColor: 0x090d16,
      intensity: 1.0,
    },
  });

  const stageRoot = new Container3D({ parent: studio.root });

  // Neon highway backdrop wall with glowing amber/cyan bokeh orbs
  new Mesh3D({
    geometry: new CubeGeometry({ width: 5, height: 5, depth: 0.1 }),
    material: new Material3D({ baseColor: 0x172554, roughness: 0.9 }),
    position: { x: 0, y: 1.5, z: -1.1 },
    castShadow: false,
    parent: stageRoot,
  });
  const orbGeo = new SphereGeometry({ radius: 0.08, widthSegments: 10, heightSegments: 8 });
  const orbGold = new FlatMaterial({ baseColor: 0xfacc15 });
  const orbRed = new FlatMaterial({ baseColor: 0xef4444 });
  const orbCyan = new FlatMaterial({ baseColor: 0x38bdf8 });
  for (const [x, y, mat] of [
    [-0.55, 1.85, orbGold],
    [0.52, 1.82, orbCyan],
    [-0.4, 1.25, orbRed],
    [0.48, 1.32, orbGold],
  ] as Array<[number, number, FlatMaterial]>) {
    new Mesh3D({
      geometry: orbGeo,
      material: mat,
      position: { x, y, z: -0.9 },
      castShadow: false,
      parent: stageRoot,
    });
  }

  const key = new DirectionalLight({
    color: 0xfff3d6,
    intensity: 2.7,
    position: { x: 1.6, y: 2.8, z: 2.6 },
    parent: stageRoot,
  });
  key.lookAt({ x: 0, y: 1.3, z: 0 });

  new PointLight({
    color: 0xfacc15,
    intensity: 8,
    range: 6,
    position: { x: -1.4, y: 1.9, z: 0.6 },
    parent: stageRoot,
  });

  studio.camera.fov = 34;

  const snap = async (
    model: Container3D,
    camY: number,
    camZ: number,
    lookY: number,
    rotY = -0.22,
  ): Promise<string> => {
    model.rotation.y = rotY;
    stageRoot.addChild(model);
    studio.camera.position.set(0, camY, camZ);
    studio.camera.lookAt({ x: 0, y: lookY, z: 0 });
    app.renderer.render({ container: studio, target: rt, clear: true });
    const url = await app.renderer.extract.base64(rt);
    stageRoot.removeChild(model);
    model.destroy({ children: true });
    return url;
  };

  const results: Partial<CastPortraitMap> = {};

  results.piss_jugman = await snap(buildPissJugmanModel().root, 1.92, 3.2, 1.78, -0.14);
  results.nevaeh = await snap(buildNevaehModel().root, 1.42, 1.55, 1.38, 0.2);
  results.colby = await snap(buildColbyModel().root, 1.42, 1.55, 1.38, -0.2);
  results.donny = await snap(buildBlindDonnyForkliftModel().root, 1.92, 2.35, 1.72, -0.26);
  results.rodney = await snap(buildRodneyModel().root, 1.46, 1.60, 1.42, -0.2);
  results.janitor = await snap(buildJanitorModel().root, 1.42, 1.55, 1.38, 0.22);
  results.dennis = await snap(buildDennisModel().root, 1.42, 1.55, 1.38, -0.22);
  results.jerry = await snap(buildTruckerModel(0xb91c1c).root, 1.48, 1.65, 1.44, -0.22);
  results.alien = await snap(buildWeirdAlienModel().root, 1.42, 1.75, 1.36, 0.18);
  results.trooper = await snap(buildTrooperModel().root, 1.48, 1.65, 1.42, -0.22);

  studio.destroy({ children: true });
  rt.destroy(true);

  return results as CastPortraitMap;
}
