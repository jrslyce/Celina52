import {
  CapsuleGeometry,
  Container3D,
  CubeGeometry,
  CylinderGeometry,
  FlatMaterial,
  Material3D,
  Mesh3D,
  SphereGeometry,
  TorusGeometry,
} from '@pixi/3d';
import {
  createArcTubeGeometry,
  createJugmanBodyGeometry,
  createLatheGeometry,
  createPlasticJugGeometry,
  createTractorBeamGeometry,
  createUfoDiscGeometry,
} from './geometryBuilders';
import {
  createFlannelTexture,
  createHiVisVestTexture,
  createJugmanLabelTexture,
} from './textures';

export interface AnimatedCharacterRig {
  root: Container3D;
  leftLeg?: Container3D;
  rightLeg?: Container3D;
  leftArm?: Container3D;
  rightArm?: Container3D;
  head?: Container3D;
  torso?: Container3D;
  extra?: Container3D;
}

const SHARED_EYE_WHITE = new Material3D({ baseColor: 0xffffff, roughness: 0.14 });
const SHARED_PUPIL = new Material3D({ baseColor: 0x161210, roughness: 0.08, clearcoat: { roughness: 0.05 } });
const SHARED_CATCHLIGHT = new FlatMaterial({ baseColor: 0xffffff });
const SHARED_GOLD = new Material3D({ baseColor: 0xfacc15, roughness: 0.22, metallic: 0.9 });
const SHARED_BLACK = new Material3D({ baseColor: 0x18181b, roughness: 0.45 });
const SHARED_CHROME = new Material3D({ baseColor: 0xe2e8f0, roughness: 0.16, metallic: 0.94 });

function addExpressiveEyes(
  head: Container3D,
  eyeY = 0.24,
  eyeZ = 0.175,
  eyeSpacing = 0.072,
  eyeScale = 1.0,
  angryBrows = false,
  browColor = 0x3b2314,
): void {
  const browMat = new Material3D({ baseColor: browColor, roughness: 0.65 });
  for (const side of [-1, 1]) {
    const eye = new Container3D({
      position: { x: side * eyeSpacing, y: eyeY, z: eyeZ },
      rotation: { x: 0, y: side * 0.2, z: 0 },
      scale: { x: eyeScale, y: eyeScale, z: eyeScale },
      parent: head,
    });
    new Mesh3D({
      geometry: new SphereGeometry({ radius: 0.038, widthSegments: 14, heightSegments: 10 }),
      material: SHARED_EYE_WHITE,
      scale: { x: 0.95, y: 1.08, z: 0.58 },
      castShadow: false,
      parent: eye,
    });
    new Mesh3D({
      geometry: new SphereGeometry({ radius: 0.024, widthSegments: 12, heightSegments: 10 }),
      material: SHARED_PUPIL,
      position: { x: 0, y: 0, z: 0.017 },
      scale: { x: 0.92, y: 1.04, z: 0.52 },
      castShadow: false,
      parent: eye,
    });
    new Mesh3D({
      geometry: new SphereGeometry({ radius: 0.008, widthSegments: 8, heightSegments: 6 }),
      material: SHARED_CATCHLIGHT,
      position: { x: -0.008, y: 0.01, z: 0.029 },
      castShadow: false,
      parent: eye,
    });

    new Mesh3D({
      geometry: createArcTubeGeometry(0.05, 0.011, Math.PI * 0.2, Math.PI * 0.8, 10, 6, true),
      material: browMat,
      position: { x: side * eyeSpacing, y: eyeY + 0.036, z: eyeZ + 0.014 },
      rotation: { x: 0.06, y: side * 0.22, z: angryBrows ? side * 0.32 : -side * 0.06 },
      parent: head,
    });
  }
}

function addSunglasses(head: Container3D, y = 0.24, z = 0.195, tint = 0x09090b): void {
  const frameMat = new Material3D({ baseColor: 0x18181b, roughness: 0.3, metallic: 0.4 });
  const lensMat = new Material3D({ baseColor: tint, roughness: 0.08, metallic: 0.35, clearcoat: { roughness: 0.05 } });
  for (const side of [-1, 1]) {
    new Mesh3D({
      geometry: new CubeGeometry({ width: 0.105, height: 0.064, depth: 0.025 }),
      material: lensMat,
      position: { x: side * 0.068, y, z },
      rotation: { x: 0, y: side * 0.16, z: 0 },
      parent: head,
    });
  }
  new Mesh3D({
    geometry: new CubeGeometry({ width: 0.25, height: 0.016, depth: 0.022 }),
    material: frameMat,
    position: { x: 0, y: y + 0.022, z: z - 0.004 },
    parent: head,
  });
}

function buildHumanoidBase(opts: {
  label: string;
  skinColor: number;
  shirtMat: Material3D;
  pantsColor: number;
  shoeColor: number;
  scale?: number;
  slim?: boolean;
}): AnimatedCharacterRig {
  const root = new Container3D({
    label: opts.label,
    scale: opts.scale ? { x: opts.scale, y: opts.scale, z: opts.scale } : undefined,
  });

  const skinMat = new Material3D({ baseColor: opts.skinColor, roughness: 0.58 });
  const pantsMat = new Material3D({ baseColor: opts.pantsColor, roughness: 0.85 });
  const shoeMat = new Material3D({ baseColor: opts.shoeColor, roughness: 0.5 });

  const hips = new Container3D({ position: { x: 0, y: 0.62, z: 0 }, parent: root });
  new Mesh3D({
    geometry: new SphereGeometry({ radius: opts.slim ? 0.175 : 0.20, widthSegments: 16, heightSegments: 12 }),
    material: pantsMat,
    scale: { x: 1.06, y: 0.72, z: 0.92 },
    parent: hips,
  });

  const buildLeg = (x: number) => {
    const leg = new Container3D({ position: { x, y: -0.02, z: 0 }, parent: hips });
    new Mesh3D({
      geometry: new CapsuleGeometry({ radius: opts.slim ? 0.072 : 0.085, height: 0.44, radialSegments: 12, heightSegments: 4 }),
      material: pantsMat,
      position: { x: 0, y: -0.24, z: 0 },
      parent: leg,
    });
    new Mesh3D({
      geometry: new CapsuleGeometry({ radius: 0.075, height: 0.14, radialSegments: 10, heightSegments: 4 }),
      material: shoeMat,
      position: { x: 0, y: -0.53, z: 0.045 },
      rotation: { x: Math.PI / 2, y: 0, z: 0 },
      parent: leg,
    });
    return leg;
  };
  const leftLeg = buildLeg(-0.095);
  const rightLeg = buildLeg(0.095);

  const torso = new Container3D({ position: { x: 0, y: 0.06, z: 0 }, parent: hips });
  const torsoWidth = opts.slim ? 0.88 : 1.05;
  const torsoProfile: Array<[number, number]> = [
    [0.02, -0.02],
    [0.17, 0.0],
    [0.21, 0.12],
    [0.23, 0.28],
    [0.21, 0.40],
    [0.14, 0.45],
    [0.01, 0.46],
  ];
  new Mesh3D({
    geometry: createLatheGeometry(torsoProfile, 22),
    material: opts.shirtMat,
    scale: { x: torsoWidth, y: 1.0, z: 0.88 },
    parent: torso,
  });

  const buildArm = (side: number) => {
    const arm = new Container3D({
      position: { x: side * (opts.slim ? 0.23 : 0.27), y: 0.38, z: 0 },
      parent: torso,
    });
    new Mesh3D({
      geometry: new CapsuleGeometry({ radius: opts.slim ? 0.056 : 0.066, height: 0.34, radialSegments: 10, heightSegments: 4 }),
      material: opts.shirtMat,
      position: { x: 0, y: -0.17, z: 0 },
      parent: arm,
    });
    new Mesh3D({
      geometry: new SphereGeometry({ radius: 0.062, widthSegments: 10, heightSegments: 8 }),
      material: skinMat,
      position: { x: 0, y: -0.37, z: 0.02 },
      parent: arm,
    });
    return arm;
  };
  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  const head = new Container3D({ position: { x: 0, y: 0.48, z: 0.01 }, parent: torso });
  new Mesh3D({
    geometry: new CylinderGeometry({ radiusTop: 0.068, radiusBottom: 0.082, height: 0.11, radialSegments: 14 }),
    material: skinMat,
    position: { x: 0, y: 0.03, z: 0 },
    parent: head,
  });
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.205, widthSegments: 22, heightSegments: 18 }),
    material: skinMat,
    position: { x: 0, y: 0.235, z: 0 },
    scale: { x: 0.96, y: 1.05, z: 0.98 },
    parent: head,
  });
  // Nose
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.03, widthSegments: 10, heightSegments: 8 }),
    material: skinMat,
    position: { x: 0, y: 0.215, z: 0.205 },
    parent: head,
  });

  return { root, leftLeg, rightLeg, leftArm, rightArm, head, torso };
}

/**
 * 1. PISS JUGMAN — The Towering 8-Foot Official Mascot of Celina 52!
 * Faithfully sculpted from the official Celina 52 design:
 * - Massive rounded-squircle translucent golden-yellow jug body with bold 3-line "PISS / JUG / MAN" chest lettering
 * - Iconic furious furrowed V-brows, menacing glaring eyes, and angry downward scowl right below the bottle neck
 * - Molded bottle neck collar + 24-ridge black glossy screw-on bottle cap headpiece
 * - Burly wrinkled yellow costume sleeves ending in sculpted clenched yellow fists (thumbs + knuckles!)
 * - Wrinkled yellow mascot pants & chunky black lace-up sneakers/boots with crisp white soles
 */
export function buildPissJugmanModel(): AnimatedCharacterRig {
  const root = new Container3D({
    label: 'PissJugman',
    scale: { x: 1.16, y: 1.16, z: 1.16 }, // Towering 8-ft presence over all regular humans!
  });
  const labelTex = createJugmanLabelTexture();

  const jugBodyMat = new Material3D({
    baseColorTexture: labelTex,
    roughness: 0.2,
    metallic: 0.04,
    clearcoat: { roughness: 0.1 },
    emissive: { color: 0xfacc15, strength: 0.12 },
  });
  const yellowSuitMat = new Material3D({
    baseColor: 0xf5c818,
    roughness: 0.56,
    sheen: { color: 0xfef08a, roughness: 0.65 },
  });
  const yellowFoldMat = new Material3D({
    baseColor: 0xe3b10d,
    roughness: 0.62,
  });
  const yellowGloveMat = new Material3D({
    baseColor: 0xfde047,
    roughness: 0.42,
    clearcoat: { roughness: 0.25 },
  });
  const capMat = new Material3D({
    baseColor: 0x141417,
    roughness: 0.26,
    metallic: 0.16,
    clearcoat: { roughness: 0.18 },
  });
  const capRidgeMat = new Material3D({
    baseColor: 0x27272a,
    roughness: 0.34,
    metallic: 0.12,
  });
  const bootMat = new Material3D({
    baseColor: 0x18181b,
    roughness: 0.42,
    metallic: 0.08,
  });
  const soleMat = new Material3D({
    baseColor: 0xf1f5f9,
    roughness: 0.65,
  });
  const angryBlackMat = new Material3D({
    baseColor: 0x09090b,
    roughness: 0.35,
  });

  // --- 1. WRINKLED YELLOW COSTUME PANTS & CHUNKY BLACK LACE-UP BOOTS/SNEAKERS ---
  const buildLeg = (side: number) => {
    const leg = new Container3D({
      position: { x: side * 0.25, y: 0.66, z: 0 },
      rotation: { x: 0, y: side * 0.12, z: -side * 0.05 }, // confident tough-guy stance!
      parent: root,
    });

    // Segmented soft-wrinkled yellow costume trousers (3 stacked horizontal fabric puffs!)
    new Mesh3D({
      geometry: new CapsuleGeometry({ radius: 0.145, height: 0.18, radialSegments: 16, heightSegments: 4 }),
      material: yellowSuitMat,
      position: { x: 0, y: -0.10, z: 0 },
      scale: { x: 1.06, y: 1.0, z: 0.96 },
      parent: leg,
    });
    new Mesh3D({
      geometry: new TorusGeometry({ radius: 0.128, tube: 0.032, radialSegments: 10, tubularSegments: 20 }),
      material: yellowFoldMat,
      position: { x: 0, y: -0.22, z: 0 },
      parent: leg,
    });
    new Mesh3D({
      geometry: new CapsuleGeometry({ radius: 0.132, height: 0.20, radialSegments: 16, heightSegments: 4 }),
      material: yellowSuitMat,
      position: { x: 0, y: -0.34, z: 0 },
      scale: { x: 1.04, y: 1.0, z: 0.96 },
      parent: leg,
    });
    // Wrinkled ankle cuff resting horizontally on boot collar
    new Mesh3D({
      geometry: new TorusGeometry({ radius: 0.122, tube: 0.034, radialSegments: 10, tubularSegments: 20 }),
      material: yellowFoldMat,
      position: { x: 0, y: -0.45, z: 0 },
      parent: leg,
    });

    // Chunky Black Lace-Up High-Top Sneaker / Work Boot
    const boot = new Container3D({ position: { x: 0, y: -0.55, z: 0.04 }, parent: leg });
    // Ankle shaft
    new Mesh3D({
      geometry: new CylinderGeometry({ radiusTop: 0.105, radiusBottom: 0.115, height: 0.16, radialSegments: 16 }),
      material: bootMat,
      position: { x: 0, y: 0.04, z: -0.02 },
      parent: boot,
    });
    // Rounded shoe body + chunky toe box
    new Mesh3D({
      geometry: new CapsuleGeometry({ radius: 0.108, height: 0.19, radialSegments: 14, heightSegments: 4 }),
      material: bootMat,
      position: { x: 0, y: -0.02, z: 0.06 },
      rotation: { x: Math.PI / 2, y: 0, z: 0 },
      scale: { x: 1.08, y: 1.0, z: 0.85 },
      parent: boot,
    });
    // Crisp white rubber outsole + toe bumper
    new Mesh3D({
      geometry: new CapsuleGeometry({ radius: 0.112, height: 0.20, radialSegments: 14, heightSegments: 4 }),
      material: soleMat,
      position: { x: 0, y: -0.085, z: 0.06 },
      rotation: { x: Math.PI / 2, y: 0, z: 0 },
      scale: { x: 1.1, y: 1.02, z: 0.36 },
      parent: boot,
    });
    // Crisp white laces across top of boot!
    for (let l = 0; l < 3; l++) {
      new Mesh3D({
        geometry: new CubeGeometry({ width: 0.11, height: 0.014, depth: 0.018 }),
        material: soleMat,
        position: { x: 0, y: 0.06 - l * 0.032, z: 0.085 + l * 0.024 },
        rotation: { x: 0.35, y: 0, z: 0 },
        castShadow: false,
        parent: boot,
      });
    }

    return leg;
  };
  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  // --- 2. MASSIVE SCULPTED GOLDEN-YELLOW PLASTIC JUG TORSO ---
  const torso = new Container3D({ position: { x: 0, y: 0.56, z: 0 }, parent: root });
  new Mesh3D({
    geometry: createJugmanBodyGeometry(44),
    material: jugBodyMat,
    parent: torso,
  });

  // --- 3. ICONIC FURIOUS "PISSED" MASCOT FACE RIGHT BELOW THE NECK! ---
  const head = new Container3D({ position: { x: 0, y: 1.24, z: 0.355 }, parent: torso });

  // Sharp, menacing scowling eyes + thick black V-angled angry eyebrows!
  for (const side of [-1, 1]) {
    // Angry eye socket / half-closed glare
    const eye = new Container3D({
      position: { x: side * 0.118, y: 0.01, z: 0.02 },
      rotation: { x: -0.22, y: side * 0.18, z: side * 0.22 },
      parent: head,
    });
    // Crisp white sclera half-almond
    new Mesh3D({
      geometry: new SphereGeometry({ radius: 0.052, widthSegments: 14, heightSegments: 10 }),
      material: SHARED_EYE_WHITE,
      scale: { x: 1.15, y: 0.72, z: 0.45 },
      castShadow: false,
      parent: eye,
    });
    // Intense locked-on black pupil
    new Mesh3D({
      geometry: new SphereGeometry({ radius: 0.032, widthSegments: 12, heightSegments: 10 }),
      material: angryBlackMat,
      position: { x: -side * 0.008, y: -0.005, z: 0.02 },
      scale: { x: 0.95, y: 0.95, z: 0.48 },
      castShadow: false,
      parent: eye,
    });
    // Tiny fierce white glint
    new Mesh3D({
      geometry: new SphereGeometry({ radius: 0.009, widthSegments: 8, heightSegments: 6 }),
      material: SHARED_CATCHLIGHT,
      position: { x: -0.012, y: 0.008, z: 0.036 },
      castShadow: false,
      parent: eye,
    });

    // Heavy iconic black angry V-eyebrow hugging the tapered bottle shoulder cleanly!
    new Mesh3D({
      geometry: new CapsuleGeometry({ radius: 0.026, height: 0.14, radialSegments: 10, heightSegments: 4 }),
      material: angryBlackMat,
      position: { x: side * 0.106, y: 0.066, z: 0.018 },
      rotation: { x: -0.26, y: side * 0.34, z: Math.PI / 2 + side * 0.42 },
      scale: { x: 1.0, y: 1.0, z: 0.6 },
      parent: head,
    });
  }

  // Iconic furious downward-curved scowl mouth ("URINE TROUBLE!")
  new Mesh3D({
    geometry: createArcTubeGeometry(0.115, 0.028, Math.PI * 0.22, Math.PI * 0.78, 16, 10, true),
    material: angryBlackMat,
    position: { x: 0, y: -0.155, z: 0.068 },
    rotation: { x: -0.14, y: 0, z: 0 },
    castShadow: false,
    parent: head,
  });

  // --- 4. DETAILED 24-RIDGE BLACK SCREW-ON BOTTLE CAP HEADPIECE ---
  const screwCap = new Container3D({ position: { x: 0, y: 1.69, z: 0 }, parent: torso });
  // Main black cap cylinder
  new Mesh3D({
    geometry: new CylinderGeometry({ radiusTop: 0.282, radiusBottom: 0.292, height: 0.21, radialSegments: 28 }),
    material: capMat,
    parent: screwCap,
  });
  // Top beveled cap rim lip (TorusGeometry is horizontal in XZ plane by default in @pixi/3d!)
  new Mesh3D({
    geometry: new TorusGeometry({ radius: 0.266, tube: 0.022, radialSegments: 10, tubularSegments: 28 }),
    material: capMat,
    position: { x: 0, y: 0.098, z: 0 },
    parent: screwCap,
  });
  // Bottom tamper-ring rim
  new Mesh3D({
    geometry: new TorusGeometry({ radius: 0.284, tube: 0.02, radialSegments: 10, tubularSegments: 28 }),
    material: capRidgeMat,
    position: { x: 0, y: -0.095, z: 0 },
    parent: screwCap,
  });
  // 24 crisp molded screw-cap grip ridges around the circumference!
  const ridgeGeo = new CubeGeometry({ width: 0.022, height: 0.175, depth: 0.026 });
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2;
    new Mesh3D({
      geometry: ridgeGeo,
      material: capRidgeMat,
      position: { x: Math.cos(ang) * 0.288, y: 0, z: Math.sin(ang) * 0.288 },
      rotation: { x: 0, y: -ang, z: 0 },
      parent: screwCap,
    });
  }

  // --- 5. BURLY WRINKLED YELLOW SLEEVES & SCULPTED CLENCHED YELLOW FISTS ---
  const buildArm = (side: number) => {
    const arm = new Container3D({
      position: { x: side * 0.62, y: 1.02, z: 0.02 },
      rotation: { x: 0, y: 0, z: side * 0.22 }, // powerful bowed arms-out brawler posture!
      parent: torso,
    });
    // Shoulder cap puff
    new Mesh3D({
      geometry: new SphereGeometry({ radius: 0.145, widthSegments: 14, heightSegments: 10 }),
      material: yellowSuitMat,
      position: { x: 0, y: -0.02, z: 0 },
      parent: arm,
    });
    // Upper sleeve
    new Mesh3D({
      geometry: new CapsuleGeometry({ radius: 0.118, height: 0.24, radialSegments: 14, heightSegments: 4 }),
      material: yellowSuitMat,
      position: { x: side * 0.03, y: -0.18, z: 0.01 },
      rotation: { x: 0.08, y: 0, z: -side * 0.1 },
      parent: arm,
    });
    // Elbow fabric fold crease (horizontal ring wrapping around sleeve!)
    new Mesh3D({
      geometry: new TorusGeometry({ radius: 0.104, tube: 0.026, radialSegments: 10, tubularSegments: 18 }),
      material: yellowFoldMat,
      position: { x: side * 0.04, y: -0.31, z: 0.03 },
      rotation: { x: -0.14, y: 0, z: -side * 0.15 },
      parent: arm,
    });
    // Muscular forearm sleeve angled slightly inward toward fist
    new Mesh3D({
      geometry: new CapsuleGeometry({ radius: 0.108, height: 0.22, radialSegments: 14, heightSegments: 4 }),
      material: yellowSuitMat,
      position: { x: side * 0.01, y: -0.44, z: 0.06 },
      rotation: { x: -0.22, y: 0, z: -side * 0.22 },
      parent: arm,
    });
    // Wrist glove cuff (horizontal ring wrapping around wrist!)
    new Mesh3D({
      geometry: new TorusGeometry({ radius: 0.094, tube: 0.024, radialSegments: 10, tubularSegments: 18 }),
      material: yellowFoldMat,
      position: { x: -side * 0.02, y: -0.56, z: 0.09 },
      rotation: { x: -0.22, y: 0, z: -side * 0.22 },
      parent: arm,
    });

    // Sculpted Clenched Yellow Mascot Fist (palm + curled finger knuckles + wrapped thumb!)
    const fist = new Container3D({
      position: { x: -side * 0.03, y: -0.66, z: 0.11 },
      rotation: { x: 0.15, y: -side * 0.2, z: -side * 0.18 },
      parent: arm,
    });
    // Fist main mass
    new Mesh3D({
      geometry: new SphereGeometry({ radius: 0.142, widthSegments: 14, heightSegments: 12 }),
      material: yellowGloveMat,
      scale: { x: 0.96, y: 1.02, z: 1.08 },
      parent: fist,
    });
    // 4 sculpted curled knuckle bumps across the front/bottom of the fist
    const knuckleGeo = new SphereGeometry({ radius: 0.044, widthSegments: 10, heightSegments: 8 });
    for (let k = 0; k < 4; k++) {
      new Mesh3D({
        geometry: knuckleGeo,
        material: yellowGloveMat,
        position: { x: -side * 0.055, y: -0.055, z: -0.075 + k * 0.05 },
        parent: fist,
      });
    }
    // Wrapped thumb tucked fiercely across front of fist!
    new Mesh3D({
      geometry: new CapsuleGeometry({ radius: 0.042, height: 0.095, radialSegments: 10, heightSegments: 4 }),
      material: yellowGloveMat,
      position: { x: -side * 0.07, y: 0.01, z: 0.095 },
      rotation: { x: 0.55, y: 0, z: side * 0.85 },
      parent: fist,
    });

    return arm;
  };
  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  return { root, leftLeg, rightLeg, leftArm, rightArm, head, torso };
}

/**
 * 2. NEVAEH PETTY — Lot Attendant & Urine Jug Specialist!
 * Blonde ponytail, neon hi-vis Celina 52 safety vest, jeans, glam lashes & pink lipstick.
 */
export function buildNevaehModel(): AnimatedCharacterRig {
  const vestMat = new Material3D({ baseColorTexture: createHiVisVestTexture(), roughness: 0.72 });
  const rig = buildHumanoidBase({
    label: 'NevaehPetty',
    skinColor: 0xf6c39e,
    shirtMat: vestMat,
    pantsColor: 0x2563eb,
    shoeColor: 0xf43f5e,
    slim: true,
  });

  const hairMat = new Material3D({ baseColor: 0xfde047, roughness: 0.48, sheen: { color: 0xfef9c3, roughness: 0.6 } });
  const lipMat = new Material3D({ baseColor: 0xec4899, roughness: 0.25, clearcoat: { roughness: 0.1 } });

  addExpressiveEyes(rig.head!, 0.24, 0.175, 0.068, 1.08, false, 0x92400e);
  new Mesh3D({
    geometry: createArcTubeGeometry(0.06, 0.014, -Math.PI * 0.8, -Math.PI * 0.2, 12, 8, true),
    material: lipMat,
    position: { x: 0, y: 0.185, z: 0.188 },
    castShadow: false,
    parent: rig.head!,
  });

  // Blonde hair dome + bouncy high ponytail!
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.215, widthSegments: 18, heightSegments: 14 }),
    material: hairMat,
    position: { x: 0, y: 0.27, z: -0.025 },
    parent: rig.head!,
  });
  new Mesh3D({
    geometry: new CapsuleGeometry({ radius: 0.085, height: 0.28, radialSegments: 12, heightSegments: 4 }),
    material: hairMat,
    position: { x: 0, y: 0.24, z: -0.24 },
    rotation: { x: 0.55, y: 0, z: 0 },
    parent: rig.head!,
  });
  // Pink scrunchie
  new Mesh3D({
    geometry: new TorusGeometry({ radius: 0.065, tube: 0.022, radialSegments: 8, tubularSegments: 16 }),
    material: lipMat,
    position: { x: 0, y: 0.34, z: -0.18 },
    rotation: { x: 0.9, y: 0, z: 0 },
    parent: rig.head!,
  });

  return rig;
}

/**
 * 3. JANITOR — Stock-Room Custodian with Homemade Tin-Can Jetpack!
 * Blue coveralls, trucker cap, beard stubble, and twin-thruster soda-can jetpack!
 */
export function buildJanitorModel(): AnimatedCharacterRig {
  const coverallMat = new Material3D({ baseColor: 0x1e40af, roughness: 0.86 });
  const rig = buildHumanoidBase({
    label: 'Janitor',
    skinColor: 0xebb48d,
    shirtMat: coverallMat,
    pantsColor: 0x1e3a8a,
    shoeColor: 0x292524,
  });

  const capMat = new Material3D({ baseColor: 0x1e293b, roughness: 0.78 });
  const beardMat = new Material3D({ baseColor: 0x57534e, roughness: 0.8 });

  addExpressiveEyes(rig.head!, 0.24, 0.175, 0.072, 1.0, false, 0x44403c);
  // Goatee/beard
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.095, widthSegments: 12, heightSegments: 10 }),
    material: beardMat,
    position: { x: 0, y: 0.12, z: 0.12 },
    scale: { x: 1.15, y: 0.75, z: 0.85 },
    parent: rig.head!,
  });
  // Janitor Cap
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.215, widthSegments: 16, heightSegments: 12 }),
    material: capMat,
    position: { x: 0, y: 0.30, z: -0.01 },
    scale: { x: 1.02, y: 0.78, z: 1.04 },
    parent: rig.head!,
  });
  new Mesh3D({
    geometry: new CubeGeometry({ width: 0.28, height: 0.03, depth: 0.20 }),
    material: capMat,
    position: { x: 0, y: 0.31, z: 0.19 },
    parent: rig.head!,
  });

  // Homemade Twin-Thruster Jetpack on his back! (Peak altitude: 12 inches before O-ring blew!)
  const jetpack = new Container3D({ position: { x: 0, y: 0.24, z: -0.27 }, parent: rig.torso! });
  const nozzleGlow = new FlatMaterial({ baseColor: 0xf97316 });
  for (const side of [-1, 1]) {
    new Mesh3D({
      geometry: new CylinderGeometry({ radiusTop: 0.08, radiusBottom: 0.08, height: 0.42, radialSegments: 14 }),
      material: SHARED_CHROME,
      position: { x: side * 0.105, y: 0, z: 0 },
      parent: jetpack,
    });
    new Mesh3D({
      geometry: new CylinderGeometry({ radiusTop: 0.055, radiusBottom: 0.085, height: 0.10, radialSegments: 12 }),
      material: SHARED_BLACK,
      position: { x: side * 0.105, y: -0.24, z: 0 },
      parent: jetpack,
    });
    new Mesh3D({
      geometry: new SphereGeometry({ radius: 0.06, widthSegments: 10, heightSegments: 8 }),
      material: nozzleGlow,
      position: { x: side * 0.105, y: -0.31, z: 0 },
      scale: { x: 0.8, y: 1.5, z: 0.8 },
      castShadow: false,
      parent: jetpack,
    });
  }
  rig.extra = jetpack;
  return rig;
}

/**
 * 4. RODNEY BARTOW — Cold War & Waffle House Security Vet!
 * Dark tactical uniform, gold badge, aviator shades, buzzcut, and yellow crackling Taser!
 */
export function buildRodneyModel(): AnimatedCharacterRig {
  const tacMat = new Material3D({ baseColor: 0x1e293b, roughness: 0.72 });
  const rig = buildHumanoidBase({
    label: 'RodneyBartow',
    skinColor: 0xe8b08a,
    shirtMat: tacMat,
    pantsColor: 0x0f172a,
    shoeColor: 0x09090b,
    scale: 1.04,
  });

  addSunglasses(rig.head!, 0.25, 0.19, 0x020617);
  // Stern mustache
  const stacheMat = new Material3D({ baseColor: 0x78716c, roughness: 0.75 });
  new Mesh3D({
    geometry: new CapsuleGeometry({ radius: 0.025, height: 0.14, radialSegments: 8, heightSegments: 4 }),
    material: stacheMat,
    position: { x: 0, y: 0.175, z: 0.205 },
    rotation: { x: 0, y: 0, z: Math.PI / 2 },
    parent: rig.head!,
  });
  // Silver buzzcut
  new Mesh3D({
    geometry: new CylinderGeometry({ radiusTop: 0.185, radiusBottom: 0.205, height: 0.11, radialSegments: 16 }),
    material: stacheMat,
    position: { x: 0, y: 0.38, z: -0.01 },
    parent: rig.head!,
  });
  // Gold Security Badge on chest
  new Mesh3D({
    geometry: new CylinderGeometry({ radiusTop: 0.042, radiusBottom: 0.042, height: 0.018, radialSegments: 8 }),
    material: SHARED_GOLD,
    position: { x: 0.11, y: 0.30, z: 0.20 },
    rotation: { x: Math.PI / 2, y: 0, z: 0 },
    parent: rig.torso!,
  });
  // Yellow Taser in right hand!
  const taserMat = new Material3D({ baseColor: 0xfacc15, roughness: 0.35 });
  const sparkMat = new FlatMaterial({ baseColor: 0x38bdf8 });
  new Mesh3D({
    geometry: new CubeGeometry({ width: 0.06, height: 0.11, depth: 0.20 }),
    material: taserMat,
    position: { x: 0, y: -0.37, z: 0.12 },
    parent: rig.rightArm!,
  });
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.04, widthSegments: 8, heightSegments: 6 }),
    material: sparkMat,
    position: { x: 0, y: -0.37, z: 0.24 },
    castShadow: false,
    parent: rig.rightArm!,
  });

  return rig;
}

/**
 * 5. COLBY KAPPLEMAN — 2nd Shift LEAD Cashier (JROTC Vet, Meteorite Survivor!)
 * Red Celina 52 polo, intense eyebrows, buzzcut, and cashier lanyard!
 */
export function buildColbyModel(): AnimatedCharacterRig {
  const poloMat = new Material3D({ baseColor: 0xb91c1c, roughness: 0.78 });
  const rig = buildHumanoidBase({
    label: 'ColbyKappleman',
    skinColor: 0xf2bf98,
    shirtMat: poloMat,
    pantsColor: 0x44403c,
    shoeColor: 0x18181b,
  });

  addExpressiveEyes(rig.head!, 0.245, 0.175, 0.072, 1.05, true, 0x3b2314);
  // Serious JROTC flat-top hair
  const hairMat = new Material3D({ baseColor: 0x451a03, roughness: 0.75 });
  new Mesh3D({
    geometry: new CylinderGeometry({ radiusTop: 0.19, radiusBottom: 0.205, height: 0.13, radialSegments: 16 }),
    material: hairMat,
    position: { x: 0, y: 0.37, z: -0.01 },
    parent: rig.head!,
  });
  // Name lanyard
  new Mesh3D({
    geometry: new CubeGeometry({ width: 0.095, height: 0.12, depth: 0.018 }),
    material: SHARED_EYE_WHITE,
    position: { x: 0, y: 0.22, z: 0.22 },
    parent: rig.torso!,
  });
  return rig;
}

/**
 * 6. BLIND DONNY DAY + 3D FORKLIFT — Certified Blind Forklift Operator!
 */
export function buildBlindDonnyForkliftModel(): AnimatedCharacterRig {
  const root = new Container3D({ label: 'BlindDonnyForklift' });

  const yellowMetal = new Material3D({ baseColor: 0xeab308, roughness: 0.36, metallic: 0.28 });
  const darkMetal = new Material3D({ baseColor: 0x1f2937, roughness: 0.45, metallic: 0.45 });
  const tireMat = new Material3D({ baseColor: 0x111827, roughness: 0.85 });

  // Forklift body chassis
  new Mesh3D({
    geometry: new CubeGeometry({ width: 1.25, height: 0.72, depth: 1.85 }),
    material: yellowMetal,
    position: { x: 0, y: 0.56, z: -0.15 },
    parent: root,
  });
  // Counterweight rear bumper
  new Mesh3D({
    geometry: new CubeGeometry({ width: 1.28, height: 0.62, depth: 0.45 }),
    material: darkMetal,
    position: { x: 0, y: 0.58, z: -1.1 },
    parent: root,
  });
  // Roll cage posts & roof
  for (const sx of [-0.54, 0.54]) {
    for (const sz of [-0.85, 0.52]) {
      new Mesh3D({
        geometry: new CylinderGeometry({ radiusTop: 0.04, radiusBottom: 0.04, height: 1.35, radialSegments: 8 }),
        material: darkMetal,
        position: { x: sx, y: 1.52, z: sz },
        parent: root,
      });
    }
  }
  new Mesh3D({
    geometry: new CubeGeometry({ width: 1.18, height: 0.07, depth: 1.48 }),
    material: darkMetal,
    position: { x: 0, y: 2.2, z: -0.16 },
    parent: root,
  });
  // Flashing amber warning beacon on top!
  new Mesh3D({
    geometry: new CylinderGeometry({ radiusTop: 0.11, radiusBottom: 0.13, height: 0.18, radialSegments: 12 }),
    material: new FlatMaterial({ baseColor: 0xf97316 }),
    position: { x: 0, y: 2.32, z: -0.6 },
    castShadow: false,
    parent: root,
  });

  // Front Mast & Twin Steel Forks!
  for (const sx of [-0.42, 0.42]) {
    new Mesh3D({
      geometry: new CubeGeometry({ width: 0.11, height: 2.0, depth: 0.12 }),
      material: darkMetal,
      position: { x: sx, y: 1.25, z: 0.85 },
      parent: root,
    });
    new Mesh3D({
      geometry: new CubeGeometry({ width: 0.12, height: 0.06, depth: 1.15 }),
      material: SHARED_CHROME,
      position: { x: sx * 0.85, y: 0.24, z: 1.42 },
      parent: root,
    });
  }
  // Wheels
  const wheelGeo = new CylinderGeometry({ radiusTop: 0.30, radiusBottom: 0.30, height: 0.24, radialSegments: 16 });
  for (const [wx, wz] of [[-0.68, 0.52], [0.68, 0.52], [-0.66, -0.78], [0.66, -0.78]]) {
    new Mesh3D({
      geometry: wheelGeo,
      material: tireMat,
      position: { x: wx, y: 0.30, z: wz },
      rotation: { x: 0, y: 0, z: Math.PI / 2 },
      parent: root,
    });
  }

  // Blind Donny seated in the driver's seat!
  const overallMat = new Material3D({ baseColor: 0x2563eb, roughness: 0.85 });
  const donny = buildHumanoidBase({
    label: 'BlindDonny',
    skinColor: 0xedb892,
    shirtMat: overallMat,
    pantsColor: 0x1d4ed8,
    shoeColor: 0x451a03,
    scale: 0.92,
  });
  donny.root.position.set(0, 0.58, -0.18);
  // Pitch-black blind wraparound sunglasses!
  addSunglasses(donny.head!, 0.245, 0.195, 0x000000);
  // White beard
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.11, widthSegments: 12, heightSegments: 10 }),
    material: SHARED_EYE_WHITE,
    position: { x: 0, y: 0.12, z: 0.12 },
    scale: { x: 1.15, y: 0.85, z: 0.85 },
    parent: donny.head!,
  });
  // Yellow safety hard hat!
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.23, widthSegments: 16, heightSegments: 12 }),
    material: yellowMetal,
    position: { x: 0, y: 0.33, z: 0 },
    scale: { x: 1.04, y: 0.78, z: 1.08 },
    parent: donny.head!,
  });
  root.addChild(donny.root);

  return { root, head: donny.head, torso: donny.torso };
}

/**
 * 7. DENNIS HERNIPLE (CEO) + CELINA 52 HELICOPTER!
 */
export function buildDennisModel(): AnimatedCharacterRig {
  const suitMat = new Material3D({ baseColor: 0x1e293b, roughness: 0.55 });
  const rig = buildHumanoidBase({
    label: 'DennisHerniple',
    skinColor: 0xf4c29c,
    shirtMat: suitMat,
    pantsColor: 0x0f172a,
    shoeColor: 0x111827,
  });
  addSunglasses(rig.head!, 0.25, 0.19, 0x1e293b);
  // Red CEO Power Tie
  new Mesh3D({
    geometry: new CubeGeometry({ width: 0.06, height: 0.28, depth: 0.025 }),
    material: new Material3D({ baseColor: 0xdc2626, roughness: 0.45 }),
    position: { x: 0, y: 0.24, z: 0.215 },
    parent: rig.torso!,
  });
  // Slick silver CEO hair
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.215, widthSegments: 16, heightSegments: 12 }),
    material: new Material3D({ baseColor: 0xd1d5db, roughness: 0.35 }),
    position: { x: 0, y: 0.31, z: -0.02 },
    scale: { x: 1.04, y: 0.84, z: 1.06 },
    parent: rig.head!,
  });
  return rig;
}

export function buildCeoHelicopterModel(): { root: Container3D; rotor: Container3D } {
  const root = new Container3D({ label: 'DennisHelicopter' });
  const bodyMat = new Material3D({ baseColor: 0x0f172a, roughness: 0.25, metallic: 0.5 });
  const goldTrim = SHARED_GOLD;
  const glassMat = new Material3D({ baseColor: 0x38bdf8, roughness: 0.1, metallic: 0.3, alpha: 0.75 });

  // Fuselage pod
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 1.2, widthSegments: 20, heightSegments: 14 }),
    material: bodyMat,
    scale: { x: 1.75, y: 0.9, z: 0.88 },
    parent: root,
  });
  // Gold CEO stripe
  new Mesh3D({
    geometry: new CubeGeometry({ width: 3.1, height: 0.22, depth: 1.82 }),
    material: goldTrim,
    position: { x: 0, y: -0.1, z: 0 },
    parent: root,
  });
  // Windshield bubble
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.95, widthSegments: 16, heightSegments: 12 }),
    material: glassMat,
    position: { x: 1.15, y: 0.18, z: 0 },
    scale: { x: 1.0, y: 0.82, z: 0.84 },
    parent: root,
  });
  // Tail boom
  new Mesh3D({
    geometry: new CylinderGeometry({ radiusTop: 0.16, radiusBottom: 0.32, height: 3.4, radialSegments: 12 }),
    material: bodyMat,
    position: { x: -2.6, y: 0.22, z: 0 },
    rotation: { x: 0, y: 0, z: Math.PI / 2 },
    parent: root,
  });
  // Landing skids
  for (const sz of [-0.75, 0.75]) {
    new Mesh3D({
      geometry: new CylinderGeometry({ radiusTop: 0.06, radiusBottom: 0.06, height: 2.8, radialSegments: 10 }),
      material: SHARED_CHROME,
      position: { x: 0.1, y: -1.18, z: sz },
      rotation: { x: 0, y: 0, z: Math.PI / 2 },
      parent: root,
    });
  }
  // Spinning top rotor
  const rotor = new Container3D({ position: { x: 0, y: 1.25, z: 0 }, parent: root });
  new Mesh3D({
    geometry: new CubeGeometry({ width: 6.4, height: 0.06, depth: 0.24 }),
    material: SHARED_BLACK,
    parent: rotor,
  });
  new Mesh3D({
    geometry: new CubeGeometry({ width: 0.24, height: 0.06, depth: 6.4 }),
    material: SHARED_BLACK,
    parent: rotor,
  });
  return { root, rotor };
}

/**
 * 8. JERRY PETTY / ANGRY TRUCKER BRAWLER
 */
export function buildTruckerModel(shirtHex = 0xb91c1c): AnimatedCharacterRig {
  const hex = '#' + shirtHex.toString(16).padStart(6, '0');
  const flannelMat = new Material3D({
    baseColorTexture: createFlannelTexture(hex, '#111827'),
    roughness: 0.85,
  });
  const rig = buildHumanoidBase({
    label: 'Trucker',
    skinColor: 0xeba982,
    shirtMat: flannelMat,
    pantsColor: 0x1e3a8a,
    shoeColor: 0x5c3114,
    scale: 1.06,
  });

  addExpressiveEyes(rig.head!, 0.24, 0.175, 0.072, 1.0, true, 0x3f2310);
  // Bushy trucker beard
  const beardMat = new Material3D({ baseColor: 0x451a03, roughness: 0.82 });
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.125, widthSegments: 12, heightSegments: 10 }),
    material: beardMat,
    position: { x: 0, y: 0.12, z: 0.11 },
    scale: { x: 1.22, y: 0.92, z: 0.9 },
    parent: rig.head!,
  });
  // Trucker Cap
  const capMat = new Material3D({ baseColor: shirtHex, roughness: 0.72 });
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.215, widthSegments: 16, heightSegments: 12 }),
    material: capMat,
    position: { x: 0, y: 0.30, z: -0.01 },
    scale: { x: 1.04, y: 0.8, z: 1.05 },
    parent: rig.head!,
  });
  new Mesh3D({
    geometry: new CubeGeometry({ width: 0.28, height: 0.032, depth: 0.20 }),
    material: capMat,
    position: { x: 0, y: 0.30, z: 0.19 },
    parent: rig.head!,
  });

  return rig;
}

/**
 * 9. LOT LIZARD — Neon glamorous truck-stop troublemaker with big teased hair & purse!
 */
export function buildLotLizardModel(outfitColor = 0xec4899): AnimatedCharacterRig {
  const dressMat = new Material3D({
    baseColor: outfitColor,
    roughness: 0.35,
    sheen: { color: 0xfbcfe8, roughness: 0.5 },
  });
  const rig = buildHumanoidBase({
    label: 'LotLizard',
    skinColor: 0xf3ba94,
    shirtMat: dressMat,
    pantsColor: 0xf3ba94,
    shoeColor: outfitColor,
    slim: true,
    scale: 0.98,
  });

  const hairMat = new Material3D({ baseColor: 0xf59e0b, roughness: 0.55 });
  const lipMat = new Material3D({ baseColor: 0xe11d48, roughness: 0.2 });

  addExpressiveEyes(rig.head!, 0.245, 0.175, 0.068, 1.15, false, 0x451a03);
  new Mesh3D({
    geometry: createArcTubeGeometry(0.062, 0.018, -Math.PI * 0.8, -Math.PI * 0.2, 12, 8, true),
    material: lipMat,
    position: { x: 0, y: 0.18, z: 0.19 },
    castShadow: false,
    parent: rig.head!,
  });

  // Big teased 80s hair volume!
  for (const [hx, hy, hz, r] of [
    [0, 0.33, -0.04, 0.25],
    [-0.18, 0.26, -0.05, 0.15],
    [0.18, 0.26, -0.05, 0.15],
  ]) {
    new Mesh3D({
      geometry: new SphereGeometry({ radius: r, widthSegments: 14, heightSegments: 10 }),
      material: hairMat,
      position: { x: hx, y: hy, z: hz },
      parent: rig.head!,
    });
  }
  // Sparkling clutch purse on right hand!
  new Mesh3D({
    geometry: new CubeGeometry({ width: 0.12, height: 0.18, depth: 0.22 }),
    material: SHARED_GOLD,
    position: { x: 0.04, y: -0.44, z: 0.08 },
    parent: rig.rightArm!,
  });

  return rig;
}

/**
 * 10. VAGRANT — Tattered coat, slouchy beanie, wild beard!
 */
export function buildVagrantModel(): AnimatedCharacterRig {
  const coatMat = new Material3D({ baseColor: 0x57534e, roughness: 0.92 });
  const rig = buildHumanoidBase({
    label: 'Vagrant',
    skinColor: 0xdca580,
    shirtMat: coatMat,
    pantsColor: 0x292524,
    shoeColor: 0x1c1917,
  });

  addExpressiveEyes(rig.head!, 0.24, 0.175, 0.072, 1.05, true, 0x292524);
  const beanieMat = new Material3D({ baseColor: 0x7c2d12, roughness: 0.9 });
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.215, widthSegments: 14, heightSegments: 10 }),
    material: beanieMat,
    position: { x: 0, y: 0.32, z: -0.02 },
    scale: { x: 1.02, y: 0.95, z: 1.05 },
    parent: rig.head!,
  });
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.13, widthSegments: 12, heightSegments: 10 }),
    material: new Material3D({ baseColor: 0x44403c, roughness: 0.88 }),
    position: { x: 0, y: 0.11, z: 0.12 },
    scale: { x: 1.25, y: 0.95, z: 0.88 },
    parent: rig.head!,
  });

  return rig;
}

/**
 * 11. TRASH-PANDA RACCOON — Bandit mask, bushy ringed tail, feisty claws!
 */
export function buildRaccoonModel(): AnimatedCharacterRig {
  const root = new Container3D({ label: 'Raccoon' });
  const furMat = new Material3D({ baseColor: 0x6b7280, roughness: 0.88 });
  const darkFur = new Material3D({ baseColor: 0x18181b, roughness: 0.85 });
  const lightFur = new Material3D({ baseColor: 0xd1d5db, roughness: 0.88 });

  // Chubby body
  const torso = new Container3D({ position: { x: 0, y: 0.34, z: 0 }, parent: root });
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.28, widthSegments: 16, heightSegments: 12 }),
    material: furMat,
    scale: { x: 0.95, y: 0.86, z: 1.25 },
    parent: torso,
  });

  // Head + pointed snout + bandit eye mask!
  const head = new Container3D({ position: { x: 0, y: 0.16, z: 0.32 }, parent: torso });
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.19, widthSegments: 16, heightSegments: 12 }),
    material: furMat,
    scale: { x: 1.06, y: 0.9, z: 1.05 },
    parent: head,
  });
  // Bandit black mask band
  new Mesh3D({
    geometry: new CubeGeometry({ width: 0.34, height: 0.095, depth: 0.12 }),
    material: darkFur,
    position: { x: 0, y: 0.03, z: 0.14 },
    parent: head,
  });
  // Glowing feisty eyes
  for (const side of [-1, 1]) {
    new Mesh3D({
      geometry: new SphereGeometry({ radius: 0.028, widthSegments: 8, heightSegments: 6 }),
      material: new FlatMaterial({ baseColor: 0xfef08a }),
      position: { x: side * 0.08, y: 0.04, z: 0.20 },
      castShadow: false,
      parent: head,
    });
    // Pointed ears
    new Mesh3D({
      geometry: new SphereGeometry({ radius: 0.06, widthSegments: 8, heightSegments: 6 }),
      material: darkFur,
      position: { x: side * 0.12, y: 0.16, z: -0.02 },
      scale: { x: 0.7, y: 1.25, z: 0.55 },
      parent: head,
    });
  }
  // White snout + black nose
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.09, widthSegments: 10, heightSegments: 8 }),
    material: lightFur,
    position: { x: 0, y: -0.04, z: 0.18 },
    scale: { x: 0.9, y: 0.72, z: 1.1 },
    parent: head,
  });
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.035, widthSegments: 8, heightSegments: 6 }),
    material: darkFur,
    position: { x: 0, y: -0.03, z: 0.27 },
    parent: head,
  });

  // Ringed bushy tail!
  const tail = new Container3D({ position: { x: 0, y: 0.08, z: -0.32 }, rotation: { x: 0.5, y: 0, z: 0 }, parent: torso });
  for (let i = 0; i < 5; i++) {
    new Mesh3D({
      geometry: new SphereGeometry({ radius: 0.095 - i * 0.008, widthSegments: 10, heightSegments: 8 }),
      material: i % 2 === 0 ? darkFur : lightFur,
      position: { x: 0, y: 0, z: -i * 0.11 },
      parent: tail,
    });
  }

  return { root, torso, head, extra: tail };
}

/**
 * 12. TENNESSEE STATE TROOPER & 3D POLICE CRUISER WITH SPINNING RED/BLUE LIGHTBAR!
 */
export function buildTrooperModel(): AnimatedCharacterRig {
  const uniformMat = new Material3D({ baseColor: 0x1e3a8a, roughness: 0.68 });
  const rig = buildHumanoidBase({
    label: 'StateTrooper',
    skinColor: 0xf0bc94,
    shirtMat: uniformMat,
    pantsColor: 0x172554,
    shoeColor: 0x09090b,
    scale: 1.04,
  });
  addSunglasses(rig.head!, 0.245, 0.19, 0x020617);
  // Iconic wide-brim State Trooper campaign hat!
  const hatMat = new Material3D({ baseColor: 0x78716c, roughness: 0.75 });
  new Mesh3D({
    geometry: new CylinderGeometry({ radiusTop: 0.34, radiusBottom: 0.34, height: 0.028, radialSegments: 22 }),
    material: hatMat,
    position: { x: 0, y: 0.36, z: 0 },
    parent: rig.head!,
  });
  new Mesh3D({
    geometry: new CylinderGeometry({ radiusTop: 0.12, radiusBottom: 0.21, height: 0.20, radialSegments: 16 }),
    material: hatMat,
    position: { x: 0, y: 0.46, z: 0 },
    parent: rig.head!,
  });
  new Mesh3D({
    geometry: new CylinderGeometry({ radiusTop: 0.042, radiusBottom: 0.042, height: 0.018, radialSegments: 8 }),
    material: SHARED_GOLD,
    position: { x: 0.11, y: 0.30, z: 0.20 },
    rotation: { x: Math.PI / 2, y: 0, z: 0 },
    parent: rig.torso!,
  });
  return rig;
}

export function buildPoliceCruiserModel(): {
  root: Container3D;
  redLight: Mesh3D;
  blueLight: Mesh3D;
} {
  const root = new Container3D({ label: 'PoliceCruiser' });
  const blackPaint = new Material3D({ baseColor: 0x111827, roughness: 0.24, metallic: 0.45, clearcoat: { roughness: 0.1 } });
  const whitePaint = new Material3D({ baseColor: 0xf8fafc, roughness: 0.28, clearcoat: { roughness: 0.12 } });
  const glassMat = new Material3D({ baseColor: 0x0f172a, roughness: 0.12, metallic: 0.5 });
  const tireMat = new Material3D({ baseColor: 0x18181b, roughness: 0.85 });

  // Lower chassis
  new Mesh3D({
    geometry: new CubeGeometry({ width: 1.95, height: 0.72, depth: 4.4 }),
    material: blackPaint,
    position: { x: 0, y: 0.62, z: 0 },
    parent: root,
  });
  // Classic white patrol doors!
  new Mesh3D({
    geometry: new CubeGeometry({ width: 2.0, height: 0.68, depth: 1.9 }),
    material: whitePaint,
    position: { x: 0, y: 0.63, z: 0.05 },
    parent: root,
  });
  // Cabin + windshield
  new Mesh3D({
    geometry: new CubeGeometry({ width: 1.72, height: 0.58, depth: 2.05 }),
    material: whitePaint,
    position: { x: 0, y: 1.24, z: -0.15 },
    parent: root,
  });
  new Mesh3D({
    geometry: new CubeGeometry({ width: 1.76, height: 0.44, depth: 1.9 }),
    material: glassMat,
    position: { x: 0, y: 1.24, z: -0.15 },
    parent: root,
  });

  // Push bumper & headlights
  new Mesh3D({
    geometry: new CubeGeometry({ width: 1.4, height: 0.42, depth: 0.18 }),
    material: SHARED_BLACK,
    position: { x: 0, y: 0.56, z: 2.26 },
    parent: root,
  });
  const headMat = new FlatMaterial({ baseColor: 0xfef9c3 });
  for (const sx of [-0.68, 0.68]) {
    new Mesh3D({
      geometry: new CubeGeometry({ width: 0.34, height: 0.18, depth: 0.08 }),
      material: headMat,
      position: { x: sx, y: 0.68, z: 2.2 },
      castShadow: false,
      parent: root,
    });
  }

  // Roof Lightbar (Flashing Red & Blue!)
  const redLight = new Mesh3D({
    geometry: new CubeGeometry({ width: 0.55, height: 0.18, depth: 0.28 }),
    material: new FlatMaterial({ baseColor: 0xef4444 }),
    position: { x: -0.34, y: 1.62, z: -0.1 },
    castShadow: false,
    parent: root,
  });
  const blueLight = new Mesh3D({
    geometry: new CubeGeometry({ width: 0.55, height: 0.18, depth: 0.28 }),
    material: new FlatMaterial({ baseColor: 0x3b82f6 }),
    position: { x: 0.34, y: 1.62, z: -0.1 },
    castShadow: false,
    parent: root,
  });

  // Wheels
  const wheelGeo = new CylinderGeometry({ radiusTop: 0.34, radiusBottom: 0.34, height: 0.26, radialSegments: 16 });
  for (const [wx, wz] of [[-0.98, 1.35], [0.98, 1.35], [-0.98, -1.35], [0.98, -1.35]]) {
    new Mesh3D({
      geometry: wheelGeo,
      material: tireMat,
      position: { x: wx, y: 0.34, z: wz },
      rotation: { x: 0, y: 0, z: Math.PI / 2 },
      parent: root,
    });
  }

  return { root, redLight, blueLight };
}

/**
 * 13. WEIRD ALIEN & FLYING SAUCER UFO WITH GLOWING TRACTOR BEAM!
 */
export function buildWeirdAlienModel(): AnimatedCharacterRig {
  const root = new Container3D({ label: 'WeirdAlien' });
  const alienGreen = new Material3D({
    baseColor: 0x4ade80,
    roughness: 0.35,
    clearcoat: { roughness: 0.15 },
    emissive: { color: 0x22c55e, strength: 0.22 },
  });
  const suitMat = new Material3D({ baseColor: 0x7e22ce, roughness: 0.4, metallic: 0.35 });
  const bugEyeMat = new Material3D({ baseColor: 0x050505, roughness: 0.04, clearcoat: { roughness: 0.02 } });

  // Scrawny alien legs & torso
  const torso = new Container3D({ position: { x: 0, y: 0.62, z: 0 }, parent: root });
  new Mesh3D({
    geometry: new CapsuleGeometry({ radius: 0.15, height: 0.42, radialSegments: 14, heightSegments: 4 }),
    material: suitMat,
    position: { x: 0, y: 0.22, z: 0 },
    parent: torso,
  });

  const buildArm = (side: number) => {
    const arm = new Container3D({ position: { x: side * 0.20, y: 0.36, z: 0 }, parent: torso });
    new Mesh3D({
      geometry: new CapsuleGeometry({ radius: 0.042, height: 0.44, radialSegments: 8, heightSegments: 4 }),
      material: alienGreen,
      position: { x: 0, y: -0.2, z: 0 },
      parent: arm,
    });
    return arm;
  };
  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  const buildLeg = (x: number) => {
    const leg = new Container3D({ position: { x, y: 0, z: 0 }, parent: torso });
    new Mesh3D({
      geometry: new CapsuleGeometry({ radius: 0.052, height: 0.48, radialSegments: 8, heightSegments: 4 }),
      material: alienGreen,
      position: { x: 0, y: -0.26, z: 0 },
      parent: leg,
    });
    return leg;
  };
  const leftLeg = buildLeg(-0.085);
  const rightLeg = buildLeg(0.085);

  // Giant bulbous weird alien cranium + huge glossy almond bug eyes + bobbling antennae!
  const head = new Container3D({ position: { x: 0, y: 0.56, z: 0.02 }, parent: torso });
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 0.28, widthSegments: 22, heightSegments: 18 }),
    material: alienGreen,
    position: { x: 0, y: 0.22, z: 0 },
    scale: { x: 1.05, y: 1.28, z: 1.02 },
    parent: head,
  });
  for (const side of [-1, 1]) {
    new Mesh3D({
      geometry: new SphereGeometry({ radius: 0.105, widthSegments: 14, heightSegments: 10 }),
      material: bugEyeMat,
      position: { x: side * 0.115, y: 0.22, z: 0.22 },
      rotation: { x: 0, y: side * 0.25, z: -side * 0.35 },
      scale: { x: 0.85, y: 1.35, z: 0.55 },
      parent: head,
    });
    // Glowing antenna stalk + neon bulb
    new Mesh3D({
      geometry: new CylinderGeometry({ radiusTop: 0.015, radiusBottom: 0.02, height: 0.26, radialSegments: 8 }),
      material: alienGreen,
      position: { x: side * 0.14, y: 0.58, z: 0 },
      rotation: { x: 0, y: 0, z: -side * 0.38 },
      parent: head,
    });
    new Mesh3D({
      geometry: new SphereGeometry({ radius: 0.045, widthSegments: 10, heightSegments: 8 }),
      material: new FlatMaterial({ baseColor: 0xa3e635 }),
      position: { x: side * 0.21, y: 0.70, z: 0 },
      castShadow: false,
      parent: head,
    });
  }

  return { root, leftLeg, rightLeg, leftArm, rightArm, head, torso };
}

export function buildUfoModel(): {
  root: Container3D;
  saucerSpin: Container3D;
  beamMesh: Mesh3D;
} {
  const root = new Container3D({ label: 'AlienUFO' });
  const saucerSpin = new Container3D({ parent: root });

  const hullMat = new Material3D({
    baseColor: 0x94a3b8,
    roughness: 0.18,
    metallic: 0.92,
  });
  const domeMat = new Material3D({
    baseColor: 0x4ade80,
    roughness: 0.12,
    metallic: 0.2,
    alpha: 0.72,
    emissive: { color: 0x22c55e, strength: 0.45 },
  });

  // Metallic saucer hull
  new Mesh3D({
    geometry: createUfoDiscGeometry(),
    material: hullMat,
    parent: saucerSpin,
  });
  // Glowing cockpit dome
  new Mesh3D({
    geometry: new SphereGeometry({ radius: 1.05, widthSegments: 22, heightSegments: 14 }),
    material: domeMat,
    position: { x: 0, y: 0.45, z: 0 },
    scale: { x: 1.0, y: 0.78, z: 1.0 },
    parent: saucerSpin,
  });
  // Ring of 10 neon rim lights
  const lightMatA = new FlatMaterial({ baseColor: 0xa3e635 });
  const lightMatB = new FlatMaterial({ baseColor: 0x38bdf8 });
  const orbGeo = new SphereGeometry({ radius: 0.15, widthSegments: 10, heightSegments: 8 });
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    new Mesh3D({
      geometry: orbGeo,
      material: i % 2 === 0 ? lightMatA : lightMatB,
      position: { x: Math.cos(ang) * 2.25, y: 0.04, z: Math.sin(ang) * 2.25 },
      castShadow: false,
      parent: saucerSpin,
    });
  }

  // Translucent neon-green Tractor Beam Cone reaching down to the parking lot!
  const beamMat = new Material3D({
    baseColor: 0x4ade80,
    emissive: { color: 0x4ade80, strength: 0.85 },
    alpha: 0.28,
    doubleSided: true,
    roughness: 0.4,
  });
  const beamMesh = new Mesh3D({
    geometry: createTractorBeamGeometry(),
    material: beamMat,
    position: { x: 0, y: -5.65, z: 0 },
    castShadow: false,
    visible: false,
    parent: root,
  });

  return { root, saucerSpin, beamMesh };
}

/**
 * Collectible 3D Piss Jug Prop (used on ground & stacked in player's haul!)
 */
export function buildPissJugProp(kind: 'standard' | 'mega_dew' | 'golden_trucker' | 'radioactive'): Container3D {
  const root = new Container3D({ label: `Jug_${kind}` });

  const colorMap = {
    standard: { body: 0xfacc15, cap: 0xef4444, glow: 0xeab308, strength: 0.16, scale: 1.0 },
    mega_dew: { body: 0x84cc16, cap: 0x16a34a, glow: 0x84cc16, strength: 0.26, scale: 1.22 },
    golden_trucker: { body: 0xfde047, cap: 0x111827, glow: 0xf59e0b, strength: 0.58, scale: 1.25 },
    radioactive: { body: 0x4ade80, cap: 0x7e22ce, glow: 0x22c55e, strength: 0.75, scale: 1.28 },
  }[kind];

  const jugMat = new Material3D({
    baseColor: colorMap.body,
    roughness: 0.18,
    clearcoat: { roughness: 0.1 },
    emissive: { color: colorMap.glow, strength: colorMap.strength },
  });
  const capMat = new Material3D({ baseColor: colorMap.cap, roughness: 0.35 });

  new Mesh3D({
    geometry: createPlasticJugGeometry(colorMap.scale),
    material: jugMat,
    parent: root,
  });
  // Screw cap
  new Mesh3D({
    geometry: new CylinderGeometry({
      radiusTop: 0.08 * colorMap.scale,
      radiusBottom: 0.08 * colorMap.scale,
      height: 0.09 * colorMap.scale,
      radialSegments: 12,
    }),
    material: capMat,
    position: { x: 0, y: 0.57 * colorMap.scale, z: 0 },
    parent: root,
  });
  // Handle ring on side
  new Mesh3D({
    geometry: new TorusGeometry({
      radius: 0.095 * colorMap.scale,
      tube: 0.025 * colorMap.scale,
      radialSegments: 8,
      tubularSegments: 14,
    }),
    material: jugMat,
    position: { x: 0.16 * colorMap.scale, y: 0.36 * colorMap.scale, z: 0 },
    scale: { x: 0.85, y: 1.3, z: 0.7 },
    parent: root,
  });

  // Glowing ground ring for rare jugs!
  if (kind === 'golden_trucker' || kind === 'radioactive') {
    new Mesh3D({
      geometry: new TorusGeometry({ radius: 0.42, tube: 0.035, radialSegments: 8, tubularSegments: 20 }),
      material: new FlatMaterial({ baseColor: kind === 'radioactive' ? 0x4ade80 : 0xfde047 }),
      position: { x: 0, y: 0.04, z: 0 },
      rotation: { x: Math.PI / 2, y: 0, z: 0 },
      castShadow: false,
      parent: root,
    });
  }

  return root;
}
