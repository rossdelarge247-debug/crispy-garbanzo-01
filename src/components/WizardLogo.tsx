/**
 * WizardLogo — Pixel art headshot of the Trade Daddy wizard.
 *
 * A wise old wizard in pixel art style. Pointed hat (slightly crooked),
 * piercing blue eyes, flowing silver beard. The hat band uses the app's
 * accent purple to tie it to the brand.
 *
 * Renders as a crisp SVG that scales to any size.
 */

interface WizardLogoProps {
  size?: number;   // overall height in px (width auto-calculated)
  className?: string;
}

// Each character maps to a fill colour
const PALETTE: Record<string, string> = {
  ".": "",            // transparent
  "H": "#374151",     // hat dark
  "h": "#6b7280",     // hat mid-grey
  "g": "#9ca3af",     // hat light/edge highlight
  "P": "#7c5bf0",     // accent purple hat band
  "p": "#6949d6",     // accent purple shadow
  "B": "#4b5563",     // hat brim
  "S": "#d4a574",     // skin
  "s": "#c4956a",     // skin shadow
  "E": "#60a5fa",     // eye blue
  "e": "#3b82f6",     // eye blue deep
  "W": "#f1f5f9",     // eye white
  "R": "#4b5563",     // brow / dark detail
  "b": "#e5e7eb",     // beard highlight
  "d": "#d1d5db",     // beard light
  "D": "#9ca3af",     // beard mid
  "k": "#6b7280",     // beard shadow
  "N": "#b8956a",     // nose shadow
  "M": "#a3785c",     // mouth
};

// 16 columns × 24 rows — pixel art Gandalf headshot
// Hat leans slightly right (iconic Gandalf silhouette)
const GRID = [
  "......hH........",  //  0  hat tip
  ".....hhHH.......",  //  1
  "....hhhgH.......",  //  2
  "...hhhhgH.......",  //  3
  "..hhhhhgH.......",  //  4
  ".hhhhhhgH.......",  //  5
  "hhhhhhhgH.......",  //  6
  "hhhhhhhhH.......",  //  7
  "PPPPPPPPPpP.....",  //  8  purple hat band
  "BBBBBBBBBBBBB...",  //  9  brim
  ".BBBBBBBBBBB....",  // 10  brim bottom
  "...SSSSSSSS.....",  // 11  forehead
  "..RSSWWSSWR.....",  // 12  brows
  "..SWWeeSWeeS....",  // 13  eyes (blue)
  "...SSSSSSSS.....",  // 14
  "...SSSNNSS......",  // 15  nose
  "....SSMMS.......",  // 16  mouth
  "...DSSSSSSD.....",  // 17  chin + beard edges
  "..DdddddddddD...",  // 18  beard
  ".DdbbbbbbbbdD...",  // 19  beard fuller
  ".DdbbbbbbbddD...",  // 20  beard
  "..DdbbbbbbdD....",  // 21
  "...DddbbddD.....",  // 22
  "....DdddD.......",  // 23  beard tip
];

const COLS = 16;
const ROWS = GRID.length;
const PX = 3; // each pixel = 3×3 units in the SVG viewBox

export default function WizardLogo({ size = 48, className = "" }: WizardLogoProps) {
  const viewW = COLS * PX;
  const viewH = ROWS * PX;
  const aspect = viewW / viewH;

  return (
    <svg
      width={size * aspect}
      height={size}
      viewBox={`0 0 ${viewW} ${viewH}`}
      className={className}
      role="img"
      aria-label="Trade Daddy wizard logo"
      style={{ imageRendering: "pixelated" }}
    >
      {GRID.map((row, y) =>
        row.split("").map((char, x) => {
          const fill = PALETTE[char];
          if (!fill) return null;
          return (
            <rect
              key={`${x}-${y}`}
              x={x * PX}
              y={y * PX}
              width={PX}
              height={PX}
              fill={fill}
            />
          );
        })
      )}
    </svg>
  );
}
