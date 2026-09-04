/*
  Geometry for the architecture diagrams. Nodes are placed by hand - there are
  three diagrams, and a layout engine general enough to draw all three would be
  more code than the coordinates it replaces.

  What this does buy is names: `caddy.bottom` instead of `136 + 60`, so moving a
  node never means re-deriving the arithmetic of every edge touching it.
*/

/** A point in the diagram's viewBox coordinates. */
export type Point = readonly [x: number, y: number];

export type Box = {
    x: number;
    y: number;
    w: number;
    h: number;
    /** Centre. */
    cx: number;
    cy: number;
    /** Edge midpoints, which is what edges actually attach to. */
    top: Point;
    right: Point;
    bottom: Point;
    left: Point;
};

export function box(x: number, y: number, w: number, h: number): Box {
    return {
        x,
        y,
        w,
        h,
        cx: x + w / 2,
        cy: y + h / 2,
        top: [x + w / 2, y],
        right: [x + w, y + h / 2],
        bottom: [x + w / 2, y + h],
        left: [x, y + h / 2],
    };
}
