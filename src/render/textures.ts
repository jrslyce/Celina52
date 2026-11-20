import { Texture } from 'pixi.js';

export interface PbrTextureSet {
  baseColor: Texture;
  normal: Texture;
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(canvas: HTMLCanvasElement, repeat = true): Texture {
  const tex = Texture.from(canvas);
  tex.source.style.addressMode = repeat ? 'repeat' : 'clamp-to-edge';
  tex.source.style.scaleMode = 'linear';
  tex.source.style.update();
  return tex;
}

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function heightToNormalCanvas(heights: Float32Array, size: number, strength: number): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const sample = (x: number, y: number) => heights[(((y % size) + size) % size) * size + (((x % size) + size) % size)];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (sample(x - 1, y) - sample(x + 1, y)) * strength;
      const dy = (sample(x, y + 1) - sample(x, y - 1)) * strength;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const idx = (y * size + x) * 4;
      d[idx] = Math.round((dx * inv * 0.5 + 0.5) * 255);
      d[idx + 1] = Math.round((dy * inv * 0.5 + 0.5) * 255);
      d[idx + 2] = Math.round((inv * 0.5 + 0.5) * 255);
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * Gritty Southern truck-stop asphalt texture with aggregate speckle & tire wear.
 */
export function createAsphaltTextures(size = 256): PbrTextureSet {
  const [c, ctx] = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const heights = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n1 = hash2(x, y);
      const n2 = hash2(Math.floor(x / 3), Math.floor(y / 3));
      const grain = n1 * 0.55 + n2 * 0.45;
      heights[y * size + x] = grain;
      const v = Math.round(44 + grain * 26);
      const idx = (y * size + x) * 4;
      img.data[idx] = v;
      img.data[idx + 1] = v + 1;
      img.data[idx + 2] = v + 4;
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Subtle oil stain & cracks
  ctx.strokeStyle = 'rgba(18, 20, 24, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(20, 12);
  ctx.lineTo(68, 52);
  ctx.lineTo(110, 44);
  ctx.lineTo(165, 92);
  ctx.stroke();

  const normalCanvas = heightToNormalCanvas(heights, size, 1.3);
  return {
    baseColor: finalizeTexture(c, true),
    normal: finalizeTexture(normalCanvas, true),
  };
}

/**
 * Illuminated storefront fascia sign: "CELINA 52 TRUCK STOP · URINE JUG EXCHANGE · CROSSVILLE, TN"
 * Flipped vertically to match @pixi/3d CubeGeometry V-coordinates.
 */
export function createStoreSignTexture(): Texture {
  const [c, ctx] = makeCanvas(1024, 256);
  ctx.save();
  ctx.translate(0, 256);
  ctx.scale(1, -1);

  // Deep interstate blue-red signboard gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#991b1b');
  grad.addColorStop(0.5, '#b91c1c');
  grad.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 256);

  // Neon yellow border
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 12;
  ctx.strokeRect(12, 12, 1000, 232);

  // Interstate 52 shield badge on left
  ctx.fillStyle = '#1d4ed8';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(42, 42, 140, 168, 28);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(45, 45, 134, 42);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HWY', 112, 74);
  ctx.font = '900 78px system-ui, sans-serif';
  ctx.fillText('52', 112, 174);

  // Main Title
  ctx.fillStyle = '#fef08a';
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 10;
  ctx.font = '900 74px Impact, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CELINA 52 TRUCK STOP', 210, 122);

  // Subtitle banner
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#111827';
  ctx.fillRect(210, 148, 765, 62);
  ctx.fillStyle = '#4ade80';
  ctx.font = '900 32px system-ui, sans-serif';
  ctx.fillText('★ URINE JUG EXCHANGE & LOTTO COUNTER ★', 230, 190);
  ctx.restore();

  return finalizeTexture(c, false);
}

/**
 * Giant Highway Pole Marquee Sign Texture!
 * Flipped vertically to match @pixi/3d CubeGeometry V-coordinates.
 */
export function createHighwaySignTexture(): Texture {
  const [c, ctx] = makeCanvas(512, 512);
  ctx.save();
  ctx.translate(0, 512);
  ctx.scale(1, -1);

  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, 512, 512);

  // Top red/yellow Celina 52 badge
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(16, 16, 480, 210);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 10;
  ctx.strokeRect(16, 16, 480, 210);

  ctx.fillStyle = '#fde047';
  ctx.textAlign = 'center';
  ctx.font = '900 78px Impact, system-ui, sans-serif';
  ctx.fillText('CELINA 52', 256, 114);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 38px system-ui, sans-serif';
  ctx.fillText('TRUCK STOP · EST. 1952', 256, 176);

  // White backlit changeable-letter marquee!
  ctx.fillStyle = '#fefce8';
  ctx.fillRect(24, 246, 464, 242);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 8;
  ctx.strokeRect(24, 246, 464, 242);

  ctx.fillStyle = '#111827';
  ctx.font = '900 36px Impact, system-ui, sans-serif';
  ctx.fillText('DIESEL $3.52  •  SHOWERS', 256, 304);
  ctx.fillStyle = '#dc2626';
  ctx.fillText('CASH IN PISS JUGS FOR', 256, 362);
  ctx.fillStyle = '#15803d';
  ctx.fillText('SCRATCHER LOTTO $$$', 256, 414);
  ctx.fillStyle = '#1e293b';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText('"FREEDOM DOESN\'T COST ANYTHING"', 256, 464);
  ctx.restore();

  return finalizeTexture(c, false);
}

/**
 * Illuminated convenience store window with hilarious Celina 52 neon decals & lotto posters!
 */
export function createStoreWindowTexture(side: 'left' | 'right'): Texture {
  const [c, ctx] = makeCanvas(512, 256);
  ctx.save();
  ctx.translate(0, 256);
  ctx.scale(1, -1);

  // Warm illuminated interior glow
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#fef08a');
  g.addColorStop(0.55, '#fde68a');
  g.addColorStop(1, '#d97706');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);

  // Window mullions
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 498, 242);
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 256);
  ctx.stroke();

  if (side === 'left') {
    // Poster 1: Neon Open + Lotto
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(28, 36, 200, 118);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 6;
    ctx.strokeRect(28, 36, 200, 118);
    ctx.fillStyle = '#4ade80';
    ctx.textAlign = 'center';
    ctx.font = '900 44px Impact, sans-serif';
    ctx.fillText('OPEN 24/7', 128, 94);
    ctx.fillStyle = '#fde047';
    ctx.font = '900 24px system-ui, sans-serif';
    ctx.fillText('SCRATCH-OFFS!', 128, 134);

    // Poster 2: Roller Grill
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(284, 48, 198, 152);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 5;
    ctx.strokeRect(284, 48, 198, 152);
    ctx.fillStyle = '#fef08a';
    ctx.font = '900 32px Impact, sans-serif';
    ctx.fillText('HOT ROLLER', 383, 102);
    ctx.fillText('DOGS 2/$3', 383, 144);
    ctx.fillStyle = '#fff';
    ctx.font = '800 18px system-ui, sans-serif';
    ctx.fillText('ASK BELINDA!', 383, 180);
  } else {
    // Poster 1: Nevaeh's Bonus Hole Quarter Pusher
    ctx.fillStyle = '#831843';
    ctx.fillRect(28, 38, 200, 162);
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 6;
    ctx.strokeRect(28, 38, 200, 162);
    ctx.fillStyle = '#fbcfe8';
    ctx.textAlign = 'center';
    ctx.font = '900 28px Impact, sans-serif';
    ctx.fillText("NEVAEH'S", 128, 84);
    ctx.fillStyle = '#fde047';
    ctx.font = '900 30px Impact, sans-serif';
    ctx.fillText('BONUS HOLE', 128, 126);
    ctx.fillStyle = '#fff';
    ctx.font = '800 18px system-ui, sans-serif';
    ctx.fillText('QUARTER PUSHER!', 128, 168);

    // Poster 2: Cranking the Hog Rewards
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(284, 48, 198, 152);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 5;
    ctx.strokeRect(284, 48, 198, 152);
    ctx.fillStyle = '#fde047';
    ctx.font = '900 26px Impact, sans-serif';
    ctx.fillText('CRANKING THE', 383, 98);
    ctx.fillText('HOG REWARDS', 383, 136);
    ctx.fillStyle = '#86efac';
    ctx.font = '800 18px system-ui, sans-serif';
    ctx.fillText('NO LIVING WAGE!', 383, 176);
  }
  ctx.restore();
  return finalizeTexture(c, false);
}

/**
 * Authentic high-res Celina 52 Piss Jugman Suit Texture (1024x512):
 * Rich translucent golden-yellow plastic jug shading with liquid level line, molded measurement ticks,
 * crisp bold black 3-line "PISS / JUG / MAN" chest lettering + "@CELINATRUCKSTOP" directly on yellow,
 * and a Celina 52 badge on the back!
 * Mapped so u = 0.5 lands directly on the front (+Z) of createJugmanBodyGeometry()!
 */
export function createJugmanLabelTexture(): Texture {
  const [c, ctx] = makeCanvas(1024, 512);

  // Rich glowing translucent golden-yellow plastic jug base with realistic amber liquid fill gradient!
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.0, '#fef08a'); // lighter hollow upper jug shoulder
  g.addColorStop(0.24, '#fde047');
  g.addColorStop(0.28, '#facc15'); // subtle liquid surface meniscus
  g.addColorStop(0.55, '#eab308'); // rich golden amber body
  g.addColorStop(0.86, '#d97706'); // deeper bottom amber depth
  g.addColorStop(1.0, '#b45309');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);

  // Subtle translucent plastic vertical sheen streaks (gives lifelike blow-molded HDPE jug feel!)
  const sheenSpots = [160, 390, 640, 860];
  for (const sx of sheenSpots) {
    const sg = ctx.createLinearGradient(sx - 28, 0, sx + 28, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, 'rgba(255,255,240,0.18)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sx - 28, 70, 56, 380);
  }

  // Subtle horizontal molded plastic rib shadow lines
  ctx.fillStyle = 'rgba(120, 53, 15, 0.16)';
  ctx.fillRect(0, 368, 1024, 8);
  ctx.fillStyle = 'rgba(255, 255, 224, 0.24)';
  ctx.fillRect(0, 376, 1024, 5);

  // Side measurement graduation ticks (left side u~0.25 -> x=256, right side u~0.75 -> x=768)
  ctx.fillStyle = 'rgba(113, 63, 18, 0.35)';
  for (let y = 165; y <= 390; y += 34) {
    const major = ((y - 165) / 34) % 2 === 0;
    const tw = major ? 28 : 16;
    ctx.fillRect(256 - tw / 2, y, tw, 4);
    ctx.fillRect(768 - tw / 2, y, tw, 4);
  }

  // Authentic bold black 3-line chest lettering centered at x = 512 (u = 0.5 -> +Z front!)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Soft golden halo behind black letters for ultra-crisp arcade readability at any camera distance
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(254, 249, 195, 0.45)';
  ctx.fillStyle = '#0f172a';

  ctx.font = '900 76px Impact, "Arial Black", system-ui, sans-serif';
  ctx.strokeText('PISS', 512, 208);
  ctx.fillText('PISS', 512, 208);

  ctx.font = '900 76px Impact, "Arial Black", system-ui, sans-serif';
  ctx.strokeText('JUG', 512, 276);
  ctx.fillText('JUG', 512, 276);

  ctx.font = '900 70px Impact, "Arial Black", system-ui, sans-serif';
  ctx.strokeText('MAN', 512, 342);
  ctx.fillText('MAN', 512, 342);

  // Authentic handle/brand footer line
  ctx.font = '900 18px system-ui, sans-serif';
  ctx.fillStyle = '#111827';
  ctx.fillText('@CELINATRUCKSTOP', 512, 386);

  // Back side subtle Celina 52 emblem (wraps around u = 0 / u = 1 seam, draw neatly at x = 80 and x = 944 or subtle label)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.font = '900 28px Impact, system-ui, sans-serif';
  ctx.fillText('CELINA 52', 0, 290);
  ctx.fillText('CELINA 52', 1024, 290);

  return finalizeTexture(c, false);
}

/**
 * Semi-truck trailer side decal texture with custom trucking company name!
 * Flipped vertically to match @pixi/3d CubeGeometry V-coordinates.
 */
export function createTrailerTexture(bgHex: number, label: string): Texture {
  const [c, ctx] = makeCanvas(512, 256);
  ctx.save();
  ctx.translate(0, 256);
  ctx.scale(1, -1);

  const hexStr = '#' + bgHex.toString(16).padStart(6, '0');
  ctx.fillStyle = hexStr;
  ctx.fillRect(0, 0, 512, 256);

  // Corrugated metal ribs
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let x = 0; x < 512; x += 18) {
    ctx.fillRect(x, 0, 6, 256);
  }

  // Red & white DOT reflective hazard strip along bottom edge
  for (let x = 0; x < 512; x += 32) {
    ctx.fillStyle = (x / 32) % 2 === 0 ? '#dc2626' : '#f8fafc';
    ctx.fillRect(x, 224, 32, 16);
  }

  // Company stripe & bold name
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(28, 68, 456, 98);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 6;
  ctx.strokeRect(28, 68, 456, 98);

  ctx.fillStyle = '#fef08a';
  ctx.textAlign = 'center';
  ctx.font = '900 44px Impact, system-ui, sans-serif';
  ctx.fillText(label, 256, 128);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 18px system-ui, sans-serif';
  ctx.fillText('CELINA 52 CERTIFIED HAULER · TENNESSEE', 256, 155);
  ctx.restore();

  return finalizeTexture(c, false);
}

/**
 * Glowing floor mat texture right in front of Colby's Gas Station Cash-In Counter!
 */
export function createCounterMatTexture(): Texture {
  const [c, ctx] = makeCanvas(512, 256);
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 14;
  ctx.strokeRect(14, 14, 484, 228);

  ctx.fillStyle = '#fef08a';
  ctx.textAlign = 'center';
  ctx.font = '900 54px Impact, system-ui, sans-serif';
  ctx.fillText('CASH IN JUGS HERE', 256, 118);
  ctx.fillStyle = '#86efac';
  ctx.font = '900 32px system-ui, sans-serif';
  ctx.fillText('COLBY’S LOTTO COUNTER', 256, 182);

  return finalizeTexture(c, false);
}

/**
 * Neon hi-vis Celina 52 Lot Attendant vest texture for Nevaeh Petty!
 */
export function createHiVisVestTexture(): Texture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#a3e635';
  ctx.fillRect(0, 0, 256, 256);

  // Silver reflective safety stripes
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 150, 256, 26);
  ctx.fillRect(0, 195, 256, 20);
  ctx.fillRect(54, 0, 22, 150);
  ctx.fillRect(180, 0, 22, 150);

  // Dark vest trim
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(122, 0, 12, 256);
  return finalizeTexture(c, false);
}

/**
 * Plaid flannel shirt texture for Truckers & Jerry Petty.
 */
export function createFlannelTexture(baseHex: string, stripeHex: string): Texture {
  const [c, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = stripeHex;
  for (let i = 0; i < 128; i += 32) {
    ctx.globalAlpha = 0.45;
    ctx.fillRect(i, 0, 12, 128);
    ctx.fillRect(0, i, 128, 12);
    ctx.globalAlpha = 0.85;
    ctx.fillRect(i + 18, 0, 4, 128);
    ctx.fillRect(0, i + 18, 128, 4);
  }
  ctx.globalAlpha = 1;
  return finalizeTexture(c, true);
}

/**
 * Gas Station exterior brick texture.
 */
export function createBrickTexture(): Texture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 256, 256);

  const rows = 8;
  const cols = 4;
  const bh = 256 / rows;
  const bw = 256 / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (bw * 0.5);
    for (let col = -1; col <= cols; col++) {
      const shade = Math.floor(hash2(col + r * 7, r * 3) * 28);
      ctx.fillStyle = `rgb(${156 + shade}, ${72 + Math.floor(shade * 0.5)}, ${56 + Math.floor(shade * 0.4)})`;
      ctx.fillRect(col * bw + offset + 3, r * bh + 3, bw - 6, bh - 6);
    }
  }
  return finalizeTexture(c, true);
}
