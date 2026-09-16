"use client";

// Hand-placed pixel sprites, theme-colored. shape-rendering keeps edges crisp.

function px(x: number, y: number, fill: string, key: string) {
  return <rect key={key} x={x} y={y} width={1} height={1} fill={fill} />;
}

// The colony, canonically: KEVIN is the tabby, JOJO is the tuxedo,
// and "void" is cat_process_02 — the unidentified third process.
export type CatVariant = "void" | "tabby" | "tuxedo";

const PALETTES: Record<
  CatVariant,
  {
    body: string;
    edge: string;
    eye: string;
    nose: string;
    stripe: string | null;
    patch: string | null;
  }
> = {
  // cat_process_02: a void cat edged in violet
  void: {
    body: "#241640",
    edge: "#a06bff",
    eye: "#c8ff4f",
    nose: "#ff5cd6",
    stripe: null,
    patch: null,
  },
  // KEVIN, the orange tabby
  tabby: {
    body: "#c96a1e",
    edge: "#ffa14f",
    eye: "#c8ff4f",
    nose: "#ff5cd6",
    stripe: "#7e3c0e",
    patch: null,
  },
  // JOJO, the tuxedo: black coat, white bib / muzzle / paws
  tuxedo: {
    body: "#14121c",
    edge: "#3d3856",
    eye: "#c8ff4f",
    nose: "#ff5cd6",
    stripe: null,
    patch: "#e8e6f0",
  },
};

/** Small pixel cat, ~14x10 grid. `sitting` tucks the tail. */
export function PixelCat({
  size = 42,
  sitting = false,
  variant = "void",
  className,
}: {
  size?: number;
  sitting?: boolean;
  variant?: CatVariant;
  className?: string;
}) {
  const pal = PALETTES[variant];
  const cells: React.ReactNode[] = [];
  const body = (x: number, y: number) => cells.push(px(x, y, pal.body, `b${x},${y}`));
  const edge = (x: number, y: number) => cells.push(px(x, y, pal.edge, `e${x},${y}`));
  const stripe = (x: number, y: number) =>
    pal.stripe && cells.push(px(x, y, pal.stripe, `s${x},${y}`));

  // ears
  edge(1, 0);
  edge(4, 0);
  // head
  for (let x = 1; x <= 4; x++) for (let y = 1; y <= 3; y++) body(x, y);
  body(2, 0);
  body(3, 0);
  // eyes + nose
  cells.push(px(1, 2, pal.eye, "eye1"), px(4, 2, pal.eye, "eye2"), px(2, 3, pal.nose, "nose"));
  // body
  for (let x = 2; x <= 9; x++) for (let y = 4; y <= 7; y++) body(x, y);
  edge(2, 4);
  edge(9, 4);
  // tail
  if (sitting) {
    body(10, 7);
    body(11, 7);
    edge(11, 6);
  } else {
    body(10, 5);
    body(11, 4);
    edge(11, 3);
    edge(12, 2);
  }
  // legs
  body(2, 8);
  body(4, 8);
  body(6, 8);
  body(8, 8);
  body(2, 9);
  body(8, 9);
  // tuxedo formalwear, painted last so it sits on top of the coat
  if (pal.patch) {
    const p = (x: number, y: number) => cells.push(px(x, y, pal.patch!, `p${x},${y}`));
    // white muzzle beside the nose
    p(1, 3);
    // bib under the chin
    p(2, 4);
    p(3, 4);
    p(2, 5);
    // white front paw + one white rear sock
    p(2, 9);
    p(8, 9);
  }
  // tabby markings, painted last so they sit on top of the coat
  if (pal.stripe) {
    // forehead M
    stripe(2, 1);
    stripe(3, 1);
    // back stripes, uneven on purpose
    stripe(4, 4);
    stripe(4, 5);
    stripe(6, 4);
    stripe(6, 5);
    stripe(6, 6);
    stripe(8, 5);
    stripe(8, 6);
    // ringed tail
    if (sitting) stripe(10, 7);
    else stripe(10, 5);
  }

  return (
    <svg
      viewBox="0 0 14 10"
      width={size}
      height={(size * 10) / 14}
      className={className}
      aria-hidden="true"
      style={{ shapeRendering: "crispEdges" }}
    >
      {cells}
    </svg>
  );
}

// The one payload the node actually wants. Canonical food colors, hard-coded
// like the cats' coats — honey chicken stays amber in every theme.
const PLATE_PAL = {
  steam: "#9a93bb",
  rice: "#f2e7c4",
  egg: "#ffd24d",
  veg: "#4fae52",
  carrot: "#ff8c42",
  glaze: "#b3550f",
  glazeHi: "#ff9e3d",
  glazeDark: "#6e3608",
  sesame: "#ffefd2",
  rim: "#eae7f5",
  plate: "#cfcae6",
  foot: "#8d87ad",
};

/** Pixel plate of chinese honey chicken + fried rice, 14x10 grid. */
export function PixelPlate({ size = 40, className }: { size?: number; className?: string }) {
  const cells: React.ReactNode[] = [];
  // key by paint order, not coordinate: scatter/shine pixels overpaint base
  // pixels at the same (x,y), and duplicate keys make React drop children
  const put = (x: number, y: number, fill: string) =>
    cells.push(px(x, y, fill, `${cells.length}:${x},${y}`));

  // steam rising off both mounds
  for (const [x, y] of [
    [4, 0],
    [3, 1],
    [9, 0],
    [10, 1],
  ]) {
    put(x, y, PLATE_PAL.steam);
  }
  // fried rice mound (left)
  for (let x = 3; x <= 4; x++) put(x, 3, PLATE_PAL.rice);
  for (let x = 2; x <= 5; x++) put(x, 4, PLATE_PAL.rice);
  for (let x = 1; x <= 6; x++) put(x, 5, PLATE_PAL.rice);
  for (let x = 1; x <= 6; x++) put(x, 6, PLATE_PAL.rice);
  // egg / scallion / carrot scattered through the rice
  put(3, 4, PLATE_PAL.egg);
  put(5, 5, PLATE_PAL.egg);
  put(2, 5, PLATE_PAL.veg);
  put(4, 6, PLATE_PAL.veg);
  put(3, 6, PLATE_PAL.carrot);
  // honey chicken chunks (right), glazed
  for (let x = 9; x <= 10; x++) put(x, 3, PLATE_PAL.glaze);
  for (let x = 8; x <= 11; x++) put(x, 4, PLATE_PAL.glaze);
  for (let x = 7; x <= 12; x++) put(x, 5, PLATE_PAL.glaze);
  for (let x = 7; x <= 12; x++) put(x, 6, PLATE_PAL.glaze);
  // crevices between chunks, then honey shine, then sesame on top
  put(9, 5, PLATE_PAL.glazeDark);
  put(8, 6, PLATE_PAL.glazeDark);
  put(11, 6, PLATE_PAL.glazeDark);
  put(9, 3, PLATE_PAL.glazeHi);
  put(8, 4, PLATE_PAL.glazeHi);
  put(10, 5, PLATE_PAL.glazeHi);
  put(12, 5, PLATE_PAL.glazeHi);
  put(10, 4, PLATE_PAL.sesame);
  put(8, 5, PLATE_PAL.sesame);
  // the plate: rim, body, foot
  for (let x = 0; x <= 13; x++) put(x, 7, PLATE_PAL.rim);
  for (let x = 1; x <= 12; x++) put(x, 8, PLATE_PAL.plate);
  for (let x = 4; x <= 9; x++) put(x, 9, PLATE_PAL.foot);

  return (
    <svg
      viewBox="0 0 14 10"
      width={size}
      height={(size * 10) / 14}
      className={className}
      aria-hidden="true"
      style={{ shapeRendering: "crispEdges" }}
    >
      {cells}
    </svg>
  );
}

