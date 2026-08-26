"use client";

import { PixelFlower } from "./PixelSprites";

/**
 * The digital greenhouse (spec §10): flowers frame the terminal without ever
 * obstructing content. Pure decoration, pointer-events off, hidden from AT.
 * The sway animation is disabled by the global reduced-motion rules.
 */
export function FloraCorners() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
      {/* bottom-left cluster, growing up over the border */}
      <div className="absolute -bottom-2 -left-1 flex items-end">
        <PixelFlower size={26} className="flora-sway" petal="#ff5cd6" />
        <PixelFlower
          size={34}
          className="flora-sway"
          petal="#a06bff"
          center="#5df3ff"
          style={{ animationDelay: "0.9s", marginLeft: -8 }}
        />
        <PixelFlower
          size={20}
          className="flora-sway"
          petal="#c8ff4f"
          center="#ff5cd6"
          style={{ animationDelay: "1.7s", marginLeft: -6 }}
        />
      </div>
      {/* top-right sprig, peeking over the frame */}
      <div className="absolute -top-3 right-4 rotate-180">
        <PixelFlower size={22} className="flora-sway" petal="#ff2ea6" center="#c8ff4f" />
      </div>
    </div>
  );
}
