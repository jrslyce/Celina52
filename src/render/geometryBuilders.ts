import { Geometry3D } from '@pixi/3d';

/**
 * Computes area-weighted smooth vertex normals from positions & CCW triangle indices.
 */
function computeSmoothNormals(positions: Float32Array, indices: Uint16Array | Uint32Array): Float32Array {
  const normals = new Float32Array(positions.length);

  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3;
    const ib = indices[i + 1] * 3;
    const ic = indices[i + 2] * 3;

    const ax = positions[ia], ay = positions[ia + 1], az = positions[ia + 2];
    const bx = positions[ib], by = positions[ib + 1], bz = positions[ib + 2];
    const cx = positions[ic], cy = positions[ic + 1], cz = positions[ic + 2];

    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;

    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;

    normals[ia] += nx; normals[ia + 1] += ny; normals[ia + 2] += nz;
    normals[ib] += nx; normals[ib + 1] += ny; normals[ib + 2] += nz;
    normals[ic] += nx; normals[ic + 1] += ny; normals[ic + 2] += nz;
  }

  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]);
    if (len > 1e-8) {
      normals[i] /= len;
      normals[i + 1] /= len;
      normals[i + 2] /= len;
    } else {
      normals[i] = 0;
      normals[i + 1] = 1;
      normals[i + 2] = 0;
    }
  }

  return normals;
}

/**
 * Builds a smooth surface-of-revolution geometry from a 2D profile [radius, y]
 * ordered from bottom to top.
 */
export function createLatheGeometry(
  profile: Array<[number, number]>,
  radialSegments = 28,
  arcStart = 0,
  arcLength = Math.PI * 2,
): Geometry3D {
  const rings = profile.length;
  const cols = radialSegments + 1;
  const vertCount = rings * cols;
  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);

  const vCoords = new Float32Array(rings);
  let totalLen = 0;
  for (let j = 1; j < rings; j++) {
    totalLen += Math.hypot(profile[j][0] - profile[j - 1][0], profile[j][1] - profile[j - 1][1]);
    vCoords[j] = totalLen;
  }
  if (totalLen > 0) {
    for (let j = 0; j < rings; j++) vCoords[j] /= totalLen;
  }

  for (let j = 0; j < rings; j++) {
    const [r, y] = profile[j];
    for (let i = 0; i <= radialSegments; i++) {
      const u = i / radialSegments;
      const theta = arcStart + u * arcLength;
      const x = r * Math.sin(theta);
      const z = r * Math.cos(theta);
      const idx = j * cols + i;
      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;
      uvs[idx * 2] = u;
      uvs[idx * 2 + 1] = 1 - vCoords[j];
    }
  }

  const indices: number[] = [];
  for (let j = 0; j < rings - 1; j++) {
    for (let i = 0; i < radialSegments; i++) {
      const a = j * cols + i;
      const b = j * cols + i + 1;
      const c = (j + 1) * cols + i + 1;
      const d = (j + 1) * cols + i;
      indices.push(a, b, c, a, c, d);
    }
  }

  const indexArray = new Uint16Array(indices);
  const normals = computeSmoothNormals(positions, indexArray);

  if (Math.abs(arcLength - Math.PI * 2) < 1e-4) {
    for (let j = 0; j < rings; j++) {
      const a = j * cols * 3;
      const b = (j * cols + radialSegments) * 3;
      const nx = normals[a] + normals[b];
      const ny = normals[a + 1] + normals[b + 1];
      const nz = normals[a + 2] + normals[b + 2];
      const len = Math.hypot(nx, ny, nz) || 1;
      normals[a] = normals[b] = nx / len;
      normals[a + 1] = normals[b + 1] = ny / len;
      normals[a + 2] = normals[b + 2] = nz / len;
    }
  }

  return new Geometry3D({ positions, normals, uvs, indices: indexArray });
}

/**
 * Rounded 3D curved tube along a circular arc (smiles, eyebrows, jug handles, glasses frames).
 */
export function createArcTubeGeometry(
  arcRadius: number,
  tubeRadius: number,
  arcStart: number,
  arcEnd: number,
  pathSegments = 14,
  tubeSegments = 10,
  taperEnds = true,
): Geometry3D {
  const rows = pathSegments + 1;
  const cols = tubeSegments + 1;
  const positions = new Float32Array(rows * cols * 3);
  const uvs = new Float32Array(rows * cols * 2);

  for (let j = 0; j <= pathSegments; j++) {
    const t = j / pathSegments;
    const angle = arcStart + (arcEnd - arcStart) * t;
    const cx = Math.cos(angle) * arcRadius;
    const cy = Math.sin(angle) * arcRadius;

    const radX = Math.cos(angle);
    const radY = Math.sin(angle);
    const taper = taperEnds ? Math.sin(t * Math.PI) * 0.65 + 0.35 : 1;
    const r = tubeRadius * taper;

    for (let i = 0; i <= tubeSegments; i++) {
      const u = i / tubeSegments;
      const phi = u * Math.PI * 2;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);

      const x = cx + radX * cosP * r;
      const y = cy + radY * cosP * r;
      const z = sinP * r;

      const idx = j * cols + i;
      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;
      uvs[idx * 2] = t;
      uvs[idx * 2 + 1] = u;
    }
  }

  const indices: number[] = [];
  for (let j = 0; j < pathSegments; j++) {
    for (let i = 0; i < tubeSegments; i++) {
      const a = j * cols + i;
      const b = j * cols + i + 1;
      const c = (j + 1) * cols + i + 1;
      const d = (j + 1) * cols + i;
      indices.push(a, c, b, a, d, c);
    }
  }

  const indexArray = new Uint16Array(indices);
  const normals = computeSmoothNormals(positions, indexArray);
  return new Geometry3D({ positions, normals, uvs, indices: indexArray });
}

/**
 * Iconic rounded-square 1-gallon trucker plastic jug geometry (smooth beveled silhouette with neck).
 */
export function createPlasticJugGeometry(scale = 1.0): Geometry3D {
  const profile: Array<[number, number]> = [
    [0.01, 0.0],
    [0.18 * scale, 0.0],
    [0.21 * scale, 0.04 * scale],
    [0.215 * scale, 0.28 * scale],
    [0.205 * scale, 0.38 * scale],
    [0.145 * scale, 0.45 * scale],
    [0.08 * scale, 0.50 * scale],
    [0.075 * scale, 0.56 * scale],
    [0.01, 0.56 * scale],
  ];
  return createLatheGeometry(profile, 20);
}

/**
 * Classic flying saucer UFO dome + beveled disc geometry.
 */
export function createUfoDiscGeometry(): Geometry3D {
  const profile: Array<[number, number]> = [
    [0.02, -0.45],
    [0.85, -0.42],
    [1.65, -0.22],
    [2.35, -0.02],
    [2.42, 0.08],
    [2.15, 0.22],
    [1.35, 0.42],
    [0.85, 0.52],
    [0.02, 0.55],
  ];
  return createLatheGeometry(profile, 36);
}

/**
 * Open tapered translucent tractor beam cone (wider at bottom, narrow at UFO emitter).
 */
export function createTractorBeamGeometry(): Geometry3D {
  const profile: Array<[number, number]> = [
    [2.25, 0.0],
    [1.45, 2.5],
    [0.65, 5.4],
  ];
  return createLatheGeometry(profile, 28);
}

/**
 * Iconic Piss Jugman Mascot Torso:
 * Sculpted rounded-squircle (broad front/back, softly beveled sides) giant yellow plastic jug suit
 * with broad sloping bottle shoulders, molded neck collar ring, and clean front-facing UVs
 * (u = 0.5 centered cleanly on +Z front so "PISS / JUG / MAN" renders razor-sharp with zero seam!).
 */
export function createJugmanBodyGeometry(radialSegments = 44): Geometry3D {
  // [rx, rz, y, squirclePower] from bottom pelvis edge (y=0) up to bottle neck top (y=1.62)
  const ringsDef: Array<[number, number, number, number]> = [
    [0.02, 0.02, 0.0, 2.0],
    [0.44, 0.30, 0.03, 2.6],
    [0.56, 0.38, 0.12, 2.8],
    [0.60, 0.42, 0.28, 2.9],
    [0.585, 0.405, 0.34, 2.9], // subtle molded plastic seam indentation
    [0.615, 0.43, 0.42, 2.9],
    [0.625, 0.435, 0.68, 2.9],
    [0.625, 0.435, 0.94, 2.85],
    [0.605, 0.42, 1.12, 2.7],
    [0.54, 0.38, 1.25, 2.45], // broad sloping bottle shoulder
    [0.44, 0.33, 1.36, 2.25],
    [0.33, 0.28, 1.44, 2.1],
    [0.255, 0.245, 1.50, 2.0], // neck base
    [0.282, 0.275, 1.535, 2.0], // molded plastic tamper collar ring!
    [0.255, 0.248, 1.565, 2.0],
    [0.252, 0.246, 1.63, 2.0],
    [0.02, 0.02, 1.64, 2.0],
  ];

  const rings = ringsDef.length;
  const cols = radialSegments + 1;
  const vertCount = rings * cols;
  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);

  // Arc-length V coordinate (0 at bottom -> 1 at top)
  const vCoords = new Float32Array(rings);
  let totalLen = 0;
  for (let j = 1; j < rings; j++) {
    totalLen += Math.hypot(
      ringsDef[j][0] - ringsDef[j - 1][0],
      ringsDef[j][2] - ringsDef[j - 1][2],
    );
    vCoords[j] = totalLen;
  }
  if (totalLen > 0) {
    for (let j = 0; j < rings; j++) vCoords[j] /= totalLen;
  }

  for (let j = 0; j < rings; j++) {
    const [rx, rz, y, p] = ringsDef[j];
    const exp = 2 / p;
    for (let i = 0; i <= radialSegments; i++) {
      const u = i / radialSegments;
      // Start at -PI (back -Z) so u = 0.5 lands directly on +Z front!
      const theta = -Math.PI + u * Math.PI * 2;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      // Superellipse squircle profile for authentic plastic gallon-jug silhouette
      const sx = Math.sign(sinT) * Math.pow(Math.abs(sinT), exp);
      const sz = Math.sign(cosT) * Math.pow(Math.abs(cosT), exp);

      const idx = j * cols + i;
      positions[idx * 3] = rx * sx;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = rz * sz;
      uvs[idx * 2] = u;
      uvs[idx * 2 + 1] = 1 - vCoords[j];
    }
  }

  const indices: number[] = [];
  for (let j = 0; j < rings - 1; j++) {
    for (let i = 0; i < radialSegments; i++) {
      const a = j * cols + i;
      const b = j * cols + i + 1;
      const c = (j + 1) * cols + i + 1;
      const d = (j + 1) * cols + i;
      indices.push(a, b, c, a, c, d);
    }
  }

  const indexArray = new Uint16Array(indices);
  const normals = computeSmoothNormals(positions, indexArray);

  // Weld seam normals cleanly along back (-Z) seam
  for (let j = 0; j < rings; j++) {
    const a = j * cols * 3;
    const b = (j * cols + radialSegments) * 3;
    const nx = normals[a] + normals[b];
    const ny = normals[a + 1] + normals[b + 1];
    const nz = normals[a + 2] + normals[b + 2];
    const len = Math.hypot(nx, ny, nz) || 1;
    normals[a] = normals[b] = nx / len;
    normals[a + 1] = normals[b + 1] = ny / len;
    normals[a + 2] = normals[b + 2] = nz / len;
  }

  return new Geometry3D({ positions, normals, uvs, indices: indexArray });
}
