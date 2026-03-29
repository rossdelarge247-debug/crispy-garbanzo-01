/**
 * WizardLogo — Retro arcade pixel art portrait of Gandalf the Grey.
 *
 * Styled like a character select screen from a classic arcade game:
 * strong black outlines, limited palette, chunky readable features.
 *
 * Gandalf's defining features:
 *  - Tall pointed grey hat, slightly bent at the top
 *  - Wide brim
 *  - Purple hat band (brand tie-in)
 *  - Thick bushy eyebrows
 *  - Piercing blue eyes
 *  - Prominent nose
 *  - Long flowing silver-white beard
 *
 * Renders as a crisp SVG that scales to any size.
 */

interface WizardLogoProps {
  size?: number;     // overall height in px
  className?: string;
}

// Retro arcade palette — limited colors, strong contrast
const C: Record<string, string> = {
  ".": "",            // transparent
  "O": "#111827",     // outline (near-black)
  "H": "#4b5563",     // hat dark
  "h": "#6b7280",     // hat mid
  "g": "#94a3b8",     // hat highlight
  "P": "#7c5bf0",     // purple band
  "p": "#5b3ec4",     // purple shadow
  "B": "#374151",     // brim
  "S": "#deb887",     // skin
  "s": "#c49a6c",     // skin shadow
  "n": "#f0d4a8",     // skin highlight
  "W": "#f1f5f9",     // eye white
  "E": "#60a5fa",     // eye blue
  "e": "#2563eb",     // eye pupil
  "R": "#4b5563",     // eyebrow
  "N": "#b8956a",     // nose
  "M": "#8b6e4e",     // mouth
  "b": "#e5e7eb",     // beard light
  "d": "#b8bcc8",     // beard mid
  "D": "#8b8f9a",     // beard shadow
  "k": "#6b7078",     // beard dark
};

// 20 columns × 30 rows — retro arcade Gandalf headshot
// Every visible feature has a black (O) outline for that classic arcade look
const GRID = [
  //  01234567890123456789
  "........OO..........", //  0  hat tip
  ".......OhgO.........", //  1
  "......OhhgOO........", //  2  hat leans slightly right
  ".....OhhhgOO........", //  3
  "....OhhhhgOO........", //  4
  "...OhhhhhgOO........", //  5
  "..OhhhhhhgOO........", //  6
  ".OhhhhhhhgOO........", //  7
  "OhhhhhghhhOO........", //  8  subtle fold highlight
  "OhhhhhhhhhhOO.......", //  9
  "OhhhhhhhhhhhOO......", // 10  hat widens
  "OPPPPPPPPPPPPpO.....", // 11  purple hat band
  "OBBBBBBBBBBBBBBBO...", // 12  brim (wide!)
  ".OBBBBBBBBBBBBBO....", // 13  brim underside
  "..OOOOOOOOOOOOOO....", // 14  brim edge
  "...OnSSSSSSSSSnO....", // 15  forehead (n = highlight)
  "..ORRnSSSSSSnnRRO...", // 16  bushy eyebrows
  "..OsWEeOssOeEWssO...", // 17  eyes: white, blue, pupil, outlined
  "..OsSSSSSSSSSSSsO...", // 18  cheeks
  "...OsSSSNNNSSssO....", // 19  prominent nose
  "...OsSSsNNsSSSsO....", // 20  nose bridge
  "....OSSsMMsSSO......", // 21  mouth
  "...OkSSSSSSSSkO.....", // 22  chin + beard shadow starts
  "..OkDdddddddddDkO..", // 23  beard top
  ".OkDddbbbbbbbddDkO..", // 24  beard widens
  ".OkDdbbbbbbbbddDkO..", // 25  beard full
  "..OkDdbbbbbbbdDkO...", // 26  beard
  "...OkDdbbbbddDkO....", // 27  beard narrows
  "....OkDddddDkO.....", // 28  beard tapers
  ".....OOOOOOO........", // 29  beard tip
];

const COLS = 20;
const ROWS = GRID.length;
const PX = 2; // each pixel = 2×2 units in the viewBox (sharper at small sizes)

export default function WizardLogo({ size = 48, className = "" }: WizardLogoProps) {
  const viewW = COLS * PX;
  const viewH = ROWS * PX;
  const aspect = viewW / viewH;

  return (
    <svg
      width={Math.round(size * aspect)}
      height={size}
      viewBox={`0 0 ${viewW} ${viewH}`}
      className={className}
      role="img"
      aria-label="Trade Wizard — Gandalf the Grey wizard"
      style={{ imageRendering: "pixelated" }}
    >
      {GRID.map((row, y) =>
        row.split("").map((char, x) => {
          const fill = C[char];
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
