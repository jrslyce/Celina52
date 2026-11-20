export interface RectCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface TruckBayConfig {
  id: number;
  x: number;
  z: number;
  facing: number;
  cabColor: number;
  trailerColor: number;
  trailerLabel: string;
}

export const SHIFT_DURATION_SECONDS = 180; // Exact 3:00 shift!

// Outdoor Celina 52 Truck Stop parking lot bounds
export const LOT_BOUNDS = {
  minX: -16.5,
  maxX: 16.5,
  minZ: -15.5,
  maxZ: 15.5,
};

// Gas Station Building (North wall, Z from -15.5 to -10.5)
export const STORE_BUILDING: RectCollider = {
  minX: -8.6,
  maxX: 8.6,
  minZ: -15.5,
  maxZ: -10.2,
};

// Colby's Urine Jug Exchange & Scratcher Counter (glowing storefront entrance zone!)
export const COUNTER_POS = { x: 0, z: -9.0 };
export const COUNTER_INTERACT_RADIUS = 2.65;

// Fuel Island Canopy (two slim pump island colliders in front-left/front-right of store)
export const FUEL_ISLANDS: RectCollider[] = [
  { minX: -6.8, maxX: -2.2, minZ: -5.4, maxZ: -4.1 },
  { minX: 2.2, maxX: 6.8, minZ: -5.4, maxZ: -4.1 },
];

// Dumpster Alley (Northeast corner — raccoon hotspot!)
export const DUMPSTER_POS = { x: 13.2, z: -11.5 };
export const DUMPSTER_COLLIDER: RectCollider = {
  minX: 11.4,
  maxX: 15.6,
  minZ: -13.6,
  maxZ: -10.4,
};

// Towering Highway 52 Neon Sign post (Northwest corner)
export const SIGN_POST_COLLIDER: RectCollider = {
  minX: -14.8,
  maxX: -12.2,
  minZ: -13.6,
  maxZ: -11.2,
};

// 6 Parked 18-Wheeler Semi Truck Bays flanking the East & West sides of the lot!
// Facing inward toward the center drive lane so cabs & doors face the player!
export const TRUCK_BAY_CONFIGS: TruckBayConfig[] = [
  {
    id: 0,
    x: -11.8,
    z: -1.8,
    facing: Math.PI / 2,
    cabColor: 0xb91c1c,
    trailerColor: 0xe5e7eb,
    trailerLabel: 'WEABER FREIGHT',
  },
  {
    id: 1,
    x: -11.8,
    z: 4.8,
    facing: Math.PI / 2,
    cabColor: 0x1d4ed8,
    trailerColor: 0xfef3c7,
    trailerLabel: 'TENNESSEE HAUL',
  },
  {
    id: 2,
    x: -11.8,
    z: 11.4,
    facing: Math.PI / 2,
    cabColor: 0x15803d,
    trailerColor: 0xe2e8f0,
    trailerLabel: 'HOG CRANK EXPRESS',
  },
  {
    id: 3,
    x: 11.8,
    z: -1.8,
    facing: -Math.PI / 2,
    cabColor: 0xd97706,
    trailerColor: 0xf8fafc,
    trailerLabel: 'CELINA LOGISTICS',
  },
  {
    id: 4,
    x: 11.8,
    z: 4.8,
    facing: -Math.PI / 2,
    cabColor: 0x6d28d9,
    trailerColor: 0xf1f5f9,
    trailerLabel: 'DIXIE DIESEL',
  },
  {
    id: 5,
    x: 11.8,
    z: 11.4,
    facing: -Math.PI / 2,
    cabColor: 0x0f766e,
    trailerColor: 0xfef9c3,
    trailerLabel: 'I-40 BANDIT',
  },
];

// Collision boxes for the 6 parked semi trucks (trailer + cab footprint)
export const TRUCK_COLLIDERS: RectCollider[] = TRUCK_BAY_CONFIGS.map((bay) => {
  const isLeft = bay.x < 0;
  return {
    minX: isLeft ? bay.x - 4.4 : bay.x - 2.6,
    maxX: isLeft ? bay.x + 2.6 : bay.x + 4.4,
    minZ: bay.z - 1.45,
    maxZ: bay.z + 1.45,
  };
});

export const STATIC_COLLIDERS: RectCollider[] = [
  STORE_BUILDING,
  ...FUEL_ISLANDS,
  DUMPSTER_COLLIDER,
  SIGN_POST_COLLIDER,
  ...TRUCK_COLLIDERS,
];

/**
 * Resolves a circle (x, z, radius) against all static truck-stop colliders & lot bounds.
 */
export function resolveWorldCollisions(
  x: number,
  z: number,
  radius: number,
): { x: number; z: number } {
  let rx = Math.max(LOT_BOUNDS.minX + radius, Math.min(LOT_BOUNDS.maxX - radius, x));
  let rz = Math.max(LOT_BOUNDS.minZ + radius, Math.min(LOT_BOUNDS.maxZ - radius, z));

  for (const box of STATIC_COLLIDERS) {
    const closestX = Math.max(box.minX, Math.min(rx, box.maxX));
    const closestZ = Math.max(box.minZ, Math.min(rz, box.maxZ));
    const dx = rx - closestX;
    const dz = rz - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      if (distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        const push = radius - dist;
        rx += (dx / dist) * push;
        rz += (dz / dist) * push;
      } else {
        // Inside box — push out nearest axis
        const penL = Math.abs(rx - box.minX);
        const penR = Math.abs(box.maxX - rx);
        const penT = Math.abs(rz - box.minZ);
        const penB = Math.abs(box.maxZ - rz);
        const minPen = Math.min(penL, penR, penT, penB);
        if (minPen === penL) rx = box.minX - radius;
        else if (minPen === penR) rx = box.maxX + radius;
        else if (minPen === penT) rz = box.minZ - radius;
        else rz = box.maxZ + radius;
      }
    }
  }

  rx = Math.max(LOT_BOUNDS.minX + radius, Math.min(LOT_BOUNDS.maxX - radius, rx));
  rz = Math.max(LOT_BOUNDS.minZ + radius, Math.min(LOT_BOUNDS.maxZ - radius, rz));
  return { x: rx, z: rz };
}

/**
 * Returns the cab door position next to a parked semi truck (where lot lizards jump in & jugs drop!).
 */
export function getTruckCabDoorPos(bayId: number): { x: number; z: number } {
  const bay = TRUCK_BAY_CONFIGS[bayId] ?? TRUCK_BAY_CONFIGS[0];
  const isLeft = bay.x < 0;
  return {
    x: isLeft ? bay.x + 2.85 : bay.x - 2.85,
    z: bay.z + 1.55,
  };
}

/**
 * Picks a clean open asphalt coordinate inside the truck stop lot (never inside trucks or buildings).
 */
export function randomOpenLotPos(margin = 1.2): { x: number; z: number } {
  for (let attempt = 0; attempt < 30; attempt++) {
    const x = (Math.random() * 2 - 1) * 10.5;
    const z = -7.8 + Math.random() * 21.0;
    let blocked = false;
    for (const box of STATIC_COLLIDERS) {
      if (
        x >= box.minX - margin &&
        x <= box.maxX + margin &&
        z >= box.minZ - margin &&
        z <= box.maxZ + margin
      ) {
        blocked = true;
        break;
      }
    }
    if (!blocked) return { x, z };
  }
  return { x: 0, z: 2.5 };
}
