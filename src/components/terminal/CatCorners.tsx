"use client";

import { PixelCat } from "./PixelSprites";

/**
 * Small cats perched on the terminal frame (they replaced the greenhouse —
 * the colony expanded). Pure decoration: pointer-events off, hidden from AT,
 * breathing stilled by the global reduced-motion rules.
 */
export function CatCorners() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden="true">
      {/* KEVIN keeps watch over the top edge */}
      <div className="absolute -top-4 right-6">
        <div className="cat-breathe">
          <PixelCat sitting size={30} variant="tabby" />
        </div>
      </div>
      {/* JOJO holds the bottom border; cat_process_02 observes from behind */}
      <div className="absolute -bottom-2 left-3 flex items-end gap-2">
        <div className="cat-breathe" style={{ animationDelay: "1.4s" }}>
          <PixelCat sitting size={24} variant="tuxedo" />
        </div>
        <div style={{ transform: "scaleX(-1)" }}>
          <div className="cat-breathe" style={{ animationDelay: "2.6s" }}>
            <PixelCat sitting size={18} variant="void" />
          </div>
        </div>
      </div>
    </div>
  );
}
