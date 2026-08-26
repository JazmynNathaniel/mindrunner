"use client";

// Hand-placed pixel sprites, theme-colored. shape-rendering keeps edges crisp.

function px(x: number, y: number, fill: string, key: string) {
  return <rect key={key} x={x} y={y} width={1} height={1} fill={fill} />;
}

export type CatVariant = "void" | "tabby";

const PALETTES: Record<
  CatVariant,
  { body: string; edge: string; eye: string; nose: string; stripe: string | null }
> = {
  // the house style: a void cat edged in violet
  void: { body: "#241640", edge: "#a06bff", eye: "#c8ff4f", nose: "#ff5cd6", stripe: null },
  // the mandatory orange tabby
  tabby: { body: "#c96a1e", edge: "#ffa14f", eye: "#c8ff4f", nose: "#ff5cd6", stripe: "#7e3c0e" },
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

