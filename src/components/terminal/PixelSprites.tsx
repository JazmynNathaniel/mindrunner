"use client";

// Hand-placed pixel sprites, theme-colored. shape-rendering keeps edges crisp.

function px(x: number, y: number, fill: string, key: string) {
  return <rect key={key} x={x} y={y} width={1} height={1} fill={fill} />;
}

const CAT_BODY = "#241640";
const CAT_EDGE = "#a06bff";
const CAT_EYE = "#c8ff4f";
const CAT_NOSE = "#ff5cd6";

/** Small pixel cat, ~14x10 grid. `sitting` tucks the tail. */
export function PixelCat({
  size = 42,
  sitting = false,
  className,
}: {
  size?: number;
  sitting?: boolean;
  className?: string;
}) {
  const cells: React.ReactNode[] = [];
  const body = (x: number, y: number) => cells.push(px(x, y, CAT_BODY, `b${x},${y}`));
  const edge = (x: number, y: number) => cells.push(px(x, y, CAT_EDGE, `e${x},${y}`));

  // ears
  edge(1, 0);
  edge(4, 0);
  // head
  for (let x = 1; x <= 4; x++) for (let y = 1; y <= 3; y++) body(x, y);
  body(2, 0);
  body(3, 0);
  // eyes + nose
  cells.push(px(1, 2, CAT_EYE, "eye1"), px(4, 2, CAT_EYE, "eye2"), px(2, 3, CAT_NOSE, "nose"));
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

/** 9x11 pixel flower on a stem. */
export function PixelFlower({
  size = 30,
  petal = "#ff5cd6",
  center = "#c8ff4f",
  className,
  style,
}: {
  size?: number;
  petal?: string;
  center?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const STEM = "#37b077";
  const LEAF = "#52ff9e";
  const cells: React.ReactNode[] = [];
  const p = (x: number, y: number, c: string) => cells.push(px(x, y, c, `${x},${y}`));

  // petals (plus shape around center at 4,2)
  [
    [4, 0],
    [4, 1],
    [2, 2],
    [3, 2],
    [5, 2],
    [6, 2],
    [4, 3],
    [4, 4],
    [3, 1],
    [5, 1],
    [3, 3],
    [5, 3],
  ].forEach(([x, y]) => p(x, y, petal));
  p(4, 2, center);
  // stem
  p(4, 5, STEM);
  p(4, 6, STEM);
  p(4, 7, STEM);
  p(4, 8, STEM);
  p(4, 9, STEM);
  p(4, 10, STEM);
  // leaves
  p(3, 7, LEAF);
  p(2, 7, LEAF);
  p(5, 8, LEAF);
  p(6, 8, LEAF);

  return (
    <svg
      viewBox="0 0 9 11"
      width={size}
      height={(size * 11) / 9}
      className={className}
      style={{ shapeRendering: "crispEdges", ...style }}
      aria-hidden="true"
    >
      {cells}
    </svg>
  );
}
