import {
  Container3D,
  CubeGeometry,
  CylinderGeometry,
  FlatMaterial,
  Material3D,
  Mesh3D,
  PlaneGeometry,
  PointLight,
  SphereGeometry,
} from '@pixi/3d';
import { Matrix } from 'pixi.js';
import {
  COUNTER_POS,
  DUMPSTER_POS,
  FUEL_ISLANDS,
  TRUCK_BAY_CONFIGS,
} from '../sim/layout';
import type { TruckBay } from '../sim/types';
import { buildColbyModel } from './castModels';
import {
  createAsphaltTextures,
  createBrickTexture,
  createCounterMatTexture,
  createHighwaySignTexture,
  createStoreSignTexture,
  createStoreWindowTexture,
  createTrailerTexture,
} from './textures';

export interface TruckStopSceneHandle {
  root: Container3D;
  updateDynamicEnv: (bays: TruckBay[], visualTime: number, highlightCounter: boolean) => void;
}

interface SemiTruckVisual {
  bayId: number;
  cabGroup: Container3D;
  baseY: number;
  heartGlow: Mesh3D;
}

export function createTruckStopScene(): TruckStopSceneHandle {
  const root = new Container3D({ label: 'Celina52TruckStop' });

  // --- 1. ASPHALT PARKING LOT FLOOR & SURROUNDING GRASS ---
  const asphalt = createAsphaltTextures(256);
  const asphaltMat = new Material3D({
    baseColorTexture: asphalt.baseColor,
    normalTexture: asphalt.normal,
    normalScale: 0.75,
    roughness: 0.9,
    uvTransform: new Matrix().scale(12, 12),
  });

  // Main asphalt pad
  new Mesh3D({
    geometry: new PlaneGeometry({ width: 38, height: 38 }),
    material: asphaltMat,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: -Math.PI / 2, y: 0, z: 0 },
    castShadow: false,
    receiveShadow: true,
    parent: root,
  });

  // Surrounding Tennessee grass verge
  const grassMat = new Material3D({ baseColor: 0x1c3a22, roughness: 0.96 });
  new Mesh3D({
    geometry: new PlaneGeometry({ width: 110, height: 110 }),
    material: grassMat,
    position: { x: 0, y: -0.05, z: 0 },
    rotation: { x: -Math.PI / 2, y: 0, z: 0 },
    castShadow: false,
    parent: root,
  });

  // Yellow asphalt parking stripes & drive lane lines
  const stripeMat = new Material3D({ baseColor: 0xfacc15, roughness: 0.8 });
  for (const lz of [-5.2, 1.5, 8.1, 14.6]) {
    for (const side of [-1, 1]) {
      new Mesh3D({
        geometry: new PlaneGeometry({ width: 7.5, height: 0.16 }),
        material: stripeMat,
        position: { x: side * 12.2, y: 0.015, z: lz },
        rotation: { x: -Math.PI / 2, y: 0, z: 0 },
        castShadow: false,
        parent: root,
      });
    }
  }
  // Center dashed road markings
  for (let z = -2.5; z <= 14.5; z += 3.2) {
    new Mesh3D({
      geometry: new PlaneGeometry({ width: 0.18, height: 1.5 }),
      material: stripeMat,
      position: { x: 0, y: 0.015, z },
      rotation: { x: -Math.PI / 2, y: 0, z: 0 },
      castShadow: false,
      parent: root,
    });
  }

  // Concrete sidewalk apron in front of Celina 52 Gas Station
  const concreteMat = new Material3D({ baseColor: 0x9ca3af, roughness: 0.88 });
  new Mesh3D({
    geometry: new CubeGeometry({ width: 20, height: 0.14, depth: 2.2 }),
    material: concreteMat,
    position: { x: 0, y: 0.07, z: -9.4 },
    castShadow: false,
    parent: root,
  });

  // --- 2. CELINA 52 GAS STATION BUILDING & COLBY'S CASH-IN COUNTER ---
  const brickMat = new Material3D({
    baseColorTexture: createBrickTexture(),
    roughness: 0.88,
    uvTransform: new Matrix().scale(5, 2),
  });
  const roofMat = new Material3D({ baseColor: 0x1e293b, roughness: 0.8 });
  const fasciaRed = new Material3D({ baseColor: 0xb91c1c, roughness: 0.55 });
  const glassWindowMat = new Material3D({
    baseColor: 0xfef3c7,
    emissive: { color: 0xfde68a, strength: 0.55 },
    roughness: 0.15,
    alpha: 0.65,
  });

  // Store main walls
  new Mesh3D({
    geometry: new CubeGeometry({ width: 17.2, height: 4.6, depth: 5.2 }),
    material: brickMat,
    position: { x: 0, y: 2.3, z: -13.1 },
    parent: root,
  });
  // Overhanging red roof trim
  new Mesh3D({
    geometry: new CubeGeometry({ width: 18.2, height: 0.9, depth: 6.4 }),
    material: fasciaRed,
    position: { x: 0, y: 4.85, z: -12.7 },
    parent: root,
  });
  new Mesh3D({
    geometry: new CubeGeometry({ width: 18.4, height: 0.25, depth: 6.6 }),
    material: roofMat,
    position: { x: 0, y: 5.35, z: -12.7 },
    parent: root,
  });

  // Big Illuminated Storefront Sign: "CELINA 52 TRUCK STOP · URINE JUG EXCHANGE"
  const storeSignMat = new Material3D({
    baseColorTexture: createStoreSignTexture(),
    emissive: { color: 0xffe8a3, strength: 0.48 },
    roughness: 0.35,
  });
  new Mesh3D({
    geometry: new CubeGeometry({ width: 14.5, height: 1.85, depth: 0.26 }),
    material: storeSignMat,
    position: { x: 0, y: 5.75, z: -9.55 },
    parent: root,
  });

  // Warm glowing storefront windows with authentic Celina 52 neon posters!
  const leftWinMat = new Material3D({
    baseColorTexture: createStoreWindowTexture('left'),
    emissive: { color: 0xfef3c7, strength: 0.45 },
    roughness: 0.2,
  });
  const rightWinMat = new Material3D({
    baseColorTexture: createStoreWindowTexture('right'),
    emissive: { color: 0xfef3c7, strength: 0.45 },
    roughness: 0.2,
  });
  new Mesh3D({
    geometry: new CubeGeometry({ width: 4.6, height: 2.35, depth: 0.16 }),
    material: leftWinMat,
    position: { x: -5.2, y: 2.15, z: -10.48 },
    castShadow: false,
    parent: root,
  });
  new Mesh3D({
    geometry: new CubeGeometry({ width: 4.6, height: 2.35, depth: 0.16 }),
    material: rightWinMat,
    position: { x: 5.2, y: 2.15, z: -10.48 },
    castShadow: false,
    parent: root,
  });

  // Open Cash-In Window Alcove in Center + Colby Kappleman behind the Counter!
  new Mesh3D({
    geometry: new CubeGeometry({ width: 4.2, height: 2.8, depth: 0.4 }),
    material: new Material3D({ baseColor: 0x0f172a, emissive: { color: 0xfde68a, strength: 0.28 }, roughness: 0.7 }),
    position: { x: 0, y: 1.6, z: -10.45 },
    castShadow: false,
    parent: root,
  });
  // Counter desk
  new Mesh3D({
    geometry: new CubeGeometry({ width: 3.6, height: 1.05, depth: 0.9 }),
    material: new Material3D({ baseColor: 0x78350f, roughness: 0.65 }),
    position: { x: 0, y: 0.55, z: -10.05 },
    parent: root,
  });
  // Cash register & scratcher display case on counter!
  new Mesh3D({
    geometry: new CubeGeometry({ width: 0.7, height: 0.42, depth: 0.5 }),
    material: new Material3D({ baseColor: 0x334155, roughness: 0.35, metallic: 0.4 }),
    position: { x: 0.95, y: 1.28, z: -9.95 },
    parent: root,
  });
  new Mesh3D({
    geometry: new CubeGeometry({ width: 1.0, height: 0.48, depth: 0.35 }),
    material: new Material3D({ baseColor: 0xfacc15, emissive: { color: 0xf59e0b, strength: 0.35 }, roughness: 0.25 }),
    position: { x: -0.95, y: 1.32, z: -9.95 },
    parent: root,
  });

  // Physically place 3D Colby Kappleman clearly visible behind the Gas Station Counter!
  const colby = buildColbyModel();
  colby.root.position.set(0, 0.35, -10.18);
  colby.root.rotation.y = 0; // facing out toward the parking lot!
  root.addChild(colby.root);

  // Glowing Cash-In Floor Mat right in front of Colby!
  const counterMatMaterial = new Material3D({
    baseColorTexture: createCounterMatTexture(),
    emissive: { color: 0x4ade80, strength: 0.38 },
    roughness: 0.6,
  });
  const counterMatMesh = new Mesh3D({
    geometry: new PlaneGeometry({ width: 4.4, height: 2.1, flipV: true }),
    material: counterMatMaterial,
    position: { x: COUNTER_POS.x, y: 0.16, z: COUNTER_POS.z },
    rotation: { x: -Math.PI / 2, y: 0, z: 0 },
    castShadow: false,
    parent: root,
  });

  // Pulsing beacon ring around the Cash-In Zone
  const counterRing = new Mesh3D({
    geometry: new CylinderGeometry({ radiusTop: 2.2, radiusBottom: 2.2, height: 0.06, radialSegments: 28 }),
    material: new FlatMaterial({ baseColor: 0x4ade80 }),
    position: { x: COUNTER_POS.x, y: 0.17, z: COUNTER_POS.z },
    scale: { x: 1, y: 1, z: 0.7 },
    castShadow: false,
    visible: false,
    parent: root,
  });

  // --- 3. SPLIT FUEL ISLAND CANOPIES & 4 GAS PUMPS (OPEN CENTER SIGHTLINE TO COLBY!) ---
  const canopyWhite = new Material3D({ baseColor: 0xf1f5f9, roughness: 0.45 });
  const pumpRed = new Material3D({ baseColor: 0xdc2626, roughness: 0.35, metallic: 0.2 });
  const pumpScreen = new FlatMaterial({ baseColor: 0x38bdf8 });

  // Support pillars, twin side canopies (leaving center cash-in corridor completely open!), & pumps
  for (const island of FUEL_ISLANDS) {
    const cx = (island.minX + island.maxX) * 0.5;
    const cz = (island.minZ + island.maxZ) * 0.5;
    // Compact side canopy roof directly above each fuel island
    new Mesh3D({
      geometry: new CubeGeometry({ width: 4.9, height: 0.42, depth: 2.6 }),
      material: canopyWhite,
      position: { x: cx, y: 4.1, z: cz },
      parent: root,
    });
    new Mesh3D({
      geometry: new CubeGeometry({ width: 5.0, height: 0.16, depth: 2.7 }),
      material: new FlatMaterial({ baseColor: 0xfacc15 }),
      position: { x: cx, y: 4.1, z: cz },
      castShadow: false,
      parent: root,
    });
    // Concrete curb
    new Mesh3D({
      geometry: new CubeGeometry({ width: 4.4, height: 0.22, depth: 1.25 }),
      material: concreteMat,
      position: { x: cx, y: 0.11, z: cz },
      parent: root,
    });
    // Support steel column
    new Mesh3D({
      geometry: new CubeGeometry({ width: 0.38, height: 3.95, depth: 0.38 }),
      material: canopyWhite,
      position: { x: cx, y: 2.08, z: cz },
      parent: root,
    });
    // Two glowing diesel pumps flanking each pillar
    for (const dx of [-1.25, 1.25]) {
      new Mesh3D({
        geometry: new CubeGeometry({ width: 0.72, height: 1.65, depth: 0.56 }),
        material: pumpRed,
        position: { x: cx + dx, y: 0.95, z: cz },
        parent: root,
      });
      new Mesh3D({
        geometry: new CubeGeometry({ width: 0.46, height: 0.34, depth: 0.60 }),
        material: pumpScreen,
        position: { x: cx + dx, y: 1.28, z: cz },
        castShadow: false,
        parent: root,
      });
    }
  }

  // --- 4. TOWERING CELINA 52 INTERSTATE POLE SIGN (Northwest Corner) ---
  const poleMat = new Material3D({ baseColor: 0x475569, roughness: 0.45, metallic: 0.7 });
  new Mesh3D({
    geometry: new CylinderGeometry({ radiusTop: 0.32, radiusBottom: 0.42, height: 11.5, radialSegments: 14 }),
    material: poleMat,
    position: { x: -13.5, y: 5.75, z: -12.4 },
    parent: root,
  });
  const hwSignMat = new Material3D({
    baseColorTexture: createHighwaySignTexture(),
    emissive: { color: 0xfef3c7, strength: 0.5 },
    roughness: 0.3,
  });
  new Mesh3D({
    geometry: new CubeGeometry({ width: 5.2, height: 5.2, depth: 0.55 }),
    material: hwSignMat,
    position: { x: -13.5, y: 9.8, z: -12.4 },
    rotation: { x: 0, y: 0.42, z: 0 },
    parent: root,
  });

  // --- 5. DUMPSTER ALLEY (Northeast Corner — Raccoon HQ!) ---
  const dumpsterMat = new Material3D({ baseColor: 0x166534, roughness: 0.65, metallic: 0.25 });
  const lidMat = new Material3D({ baseColor: 0x18181b, roughness: 0.75 });
  new Mesh3D({
    geometry: new CubeGeometry({ width: 3.4, height: 1.65, depth: 2.1 }),
    material: dumpsterMat,
    position: { x: DUMPSTER_POS.x, y: 0.84, z: DUMPSTER_POS.z },
    parent: root,
  });
  new Mesh3D({
    geometry: new CubeGeometry({ width: 3.55, height: 0.18, depth: 2.2 }),
    material: lidMat,
    position: { x: DUMPSTER_POS.x, y: 1.72, z: DUMPSTER_POS.z },
    rotation: { x: 0.14, y: 0, z: 0 },
    parent: root,
  });

  // --- 6. 6 DETAILED 3D 18-WHEELER SEMI TRUCKS ---
  const semiTrucks: SemiTruckVisual[] = [];
  const chromeMat = new Material3D({ baseColor: 0xe2e8f0, roughness: 0.15, metallic: 0.95 });
  const tireMat = new Material3D({ baseColor: 0x111827, roughness: 0.88 });
  const headlightMat = new FlatMaterial({ baseColor: 0xfef9c3 });
  const windowDark = new Material3D({ baseColor: 0x0f172a, roughness: 0.12, metallic: 0.45 });
  const wheelGeo = new CylinderGeometry({ radiusTop: 0.46, radiusBottom: 0.46, height: 0.34, radialSegments: 16 });
  const heartMat = new FlatMaterial({ baseColor: 0xf472b6 });

  for (const cfg of TRUCK_BAY_CONFIGS) {
    const truckRoot = new Container3D({
      label: `SemiTruck_${cfg.id}`,
      position: { x: cfg.x, y: 0, z: cfg.z },
      rotation: { x: 0, y: cfg.facing, z: 0 },
      parent: root,
    });

    // Long Semi Trailer behind the cab (-Z in local truck space, cab faces +Z!)
    const trailerMat = new Material3D({
      baseColorTexture: createTrailerTexture(cfg.trailerColor, cfg.trailerLabel),
      roughness: 0.45,
      metallic: 0.25,
    });
    new Mesh3D({
      geometry: new CubeGeometry({ width: 2.45, height: 3.15, depth: 5.4 }),
      material: trailerMat,
      position: { x: 0, y: 2.25, z: -1.65 },
      parent: truckRoot,
    });

    // Semi Cab (rocks hilariously when a Lot Lizard jumps inside!)
    const cabGroup = new Container3D({ position: { x: 0, y: 0, z: 1.55 }, parent: truckRoot });
    const cabMat = new Material3D({
      baseColor: cfg.cabColor,
      roughness: 0.28,
      metallic: 0.38,
      clearcoat: { roughness: 0.12 },
    });
    // Sleeper cab + hood nose
    new Mesh3D({
      geometry: new CubeGeometry({ width: 2.35, height: 2.45, depth: 1.75 }),
      material: cabMat,
      position: { x: 0, y: 1.85, z: 0 },
      parent: cabGroup,
    });
    new Mesh3D({
      geometry: new CubeGeometry({ width: 1.95, height: 1.35, depth: 1.35 }),
      material: cabMat,
      position: { x: 0, y: 1.28, z: 1.4 },
      parent: cabGroup,
    });
    // Windshield
    new Mesh3D({
      geometry: new CubeGeometry({ width: 2.1, height: 0.82, depth: 0.14 }),
      material: windowDark,
      position: { x: 0, y: 2.32, z: 0.88 },
      parent: cabGroup,
    });
    // Shiny Chrome Grille & Bumper!
    new Mesh3D({
      geometry: new CubeGeometry({ width: 1.45, height: 1.05, depth: 0.15 }),
      material: chromeMat,
      position: { x: 0, y: 1.25, z: 2.1 },
      parent: cabGroup,
    });
    new Mesh3D({
      geometry: new CubeGeometry({ width: 2.35, height: 0.32, depth: 0.28 }),
      material: chromeMat,
      position: { x: 0, y: 0.62, z: 2.15 },
      parent: cabGroup,
    });
    // Twin Tall Chrome Smokestacks!
    for (const sx of [-1.22, 1.22]) {
      new Mesh3D({
        geometry: new CylinderGeometry({ radiusTop: 0.10, radiusBottom: 0.10, height: 3.1, radialSegments: 12 }),
        material: chromeMat,
        position: { x: sx, y: 2.45, z: -0.68 },
        parent: cabGroup,
      });
      // Glowing Headlights
      new Mesh3D({
        geometry: new CubeGeometry({ width: 0.34, height: 0.22, depth: 0.1 }),
        material: headlightMat,
        position: { x: sx * 0.65, y: 0.95, z: 2.1 },
        castShadow: false,
        parent: cabGroup,
      });
    }

    // Floating pink neon glow orb above cab when Lot Lizard is inside!
    const heartGlow = new Mesh3D({
      geometry: new SphereGeometry({ radius: 0.35, widthSegments: 12, heightSegments: 10 }),
      material: heartMat,
      position: { x: 0, y: 3.65, z: 0.4 },
      castShadow: false,
      visible: false,
      parent: cabGroup,
    });

    // 18-Wheeler Tires
    for (const wz of [-3.4, -2.3, 0.2, 2.75]) {
      for (const sx of [-1.18, 1.18]) {
        new Mesh3D({
          geometry: wheelGeo,
          material: tireMat,
          position: { x: sx, y: 0.46, z: wz },
          rotation: { x: 0, y: 0, z: Math.PI / 2 },
          parent: truckRoot,
        });
      }
    }

    semiTrucks.push({ bayId: cfg.id, cabGroup, baseY: 0, heartGlow });
  }

  // --- 7. PARKING LOT STREETLAMPS & TENNESSEE PINE TREES ---
  const lampHeadMat = new FlatMaterial({ baseColor: 0xfef08a });
  for (const [lx, lz] of [[-15.2, 8.2], [15.2, 8.2], [15.2, -5.0]]) {
    new Mesh3D({
      geometry: new CylinderGeometry({ radiusTop: 0.10, radiusBottom: 0.14, height: 7.5, radialSegments: 10 }),
      material: poleMat,
      position: { x: lx, y: 3.75, z: lz },
      parent: root,
    });
    new Mesh3D({
      geometry: new CubeGeometry({ width: 0.9, height: 0.2, depth: 0.45 }),
      material: lampHeadMat,
      position: { x: lx + (lx < 0 ? 0.5 : -0.5), y: 7.45, z: lz },
      castShadow: false,
      parent: root,
    });
  }

  // Warm overhead fill lights for the lot & gas station canopy
  new PointLight({
    color: 0xffd59e,
    intensity: 35,
    range: 20,
    position: { x: 0, y: 4.1, z: -6.8 },
    parent: root,
  });
  new PointLight({
    color: 0xfde68a,
    intensity: 28,
    range: 22,
    position: { x: 0, y: 6.5, z: 4.5 },
    parent: root,
  });

  // Perimeter Pine Trees (giving Crossville TN highway feel)
  const trunkMat = new Material3D({ baseColor: 0x451a03, roughness: 0.9 });
  const pineMat = new Material3D({ baseColor: 0x14532d, roughness: 0.88 });
  const treeSpots: Array<[number, number]> = [
    [-20, -14], [-20, -6], [-20, 4], [-20, 14],
    [20, -14], [20, -6], [20, 4], [20, 14],
    [-12, -19], [-4, -19], [4, -19], [12, -19],
  ];
  for (const [tx, tz] of treeSpots) {
    new Mesh3D({
      geometry: new CylinderGeometry({ radiusTop: 0.25, radiusBottom: 0.35, height: 2.2, radialSegments: 8 }),
      material: trunkMat,
      position: { x: tx, y: 1.1, z: tz },
      castShadow: false,
      parent: root,
    });
    new Mesh3D({
      geometry: new CylinderGeometry({ radiusTop: 0.1, radiusBottom: 1.85, height: 4.5, radialSegments: 10 }),
      material: pineMat,
      position: { x: tx, y: 4.0, z: tz },
      castShadow: false,
      parent: root,
    });
  }

  return {
    root,
    updateDynamicEnv(bays, visualTime, highlightCounter) {
      // Pulse Colby's Cash-In Counter mat & ring whenever player is hauling jugs!
      counterRing.visible = highlightCounter;
      if (highlightCounter) {
        const pulse = 1 + Math.sin(visualTime * 7) * 0.08;
        counterRing.scale.set(pulse, 1, pulse * 0.7);
      }
      void counterMatMesh;

      // Animate Colby bobbing enthusiastically behind the counter!
      colby.root.position.y = 0.35 + Math.sin(visualTime * 3.2) * 0.03;
      if (colby.rightArm) {
        colby.rightArm.rotation.x = highlightCounter ? -2.2 + Math.sin(visualTime * 9) * 0.35 : -0.2;
      }

      // Rock semi-truck cabs hilariously whenever a Lot Lizard jumps in!
      for (const st of semiTrucks) {
        const bay = bays[st.bayId];
        if (bay && (bay.lizardInside || bay.rockTimer > 0)) {
          st.cabGroup.rotation.z = Math.sin(visualTime * 18) * 0.085;
          st.cabGroup.position.y = st.baseY + Math.abs(Math.sin(visualTime * 18)) * 0.12;
          st.heartGlow.visible = true;
          st.heartGlow.position.y = 3.6 + Math.sin(visualTime * 7) * 0.25;
        } else {
          st.cabGroup.rotation.z *= 0.85;
          st.cabGroup.position.y = st.baseY;
          st.heartGlow.visible = false;
        }
      }
    },
  };
}
