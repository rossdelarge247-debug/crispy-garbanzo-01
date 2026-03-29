/**
 * WizardLogo — High-fidelity pixel art of a wise old wizard.
 *
 * Symmetric pointed hat, flowing beard, piercing eyes.
 * Styled as a retro arcade character portrait.
 */

interface WizardLogoProps {
  size?: number;
  className?: string;
}

const C: Record<string, string> = {
  ".": "",
  "O": "#111827",     // outline
  "H": "#4b5563",     // hat dark
  "h": "#6b7280",     // hat mid
  "g": "#94a3b8",     // hat light
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
  "d": "#c8ccd4",     // beard mid
  "D": "#9ca3af",     // beard shadow
  "k": "#6b7078",     // beard dark
};

// 24 wide × 32 tall — symmetric, higher fidelity
const GRID = [
  "...........OO............",  //  0  hat tip (symmetric)
  "..........OhHO...........",  //  1
  ".........OhhHHO..........",  //  2
  "........OhhhHHO..........",  //  3
  ".......OhhhhHHO..........",  //  4
  "......OhhhhhHHO..........",  //  5
  ".....OhhhhhhHHO..........",  //  6
  "....OhhhhhhhHHO..........",  //  7
  "...OhhhhghhhhHO..........",  //  8  fold highlight
  "..OhhhhhghhhhhO..........",  //  9
  ".OhhhhhhghhhhhhO.........",  // 10
  "OhhhhhhhhhhhhhhhO........",  // 11  hat base
  "OPPPPPPPPPPPPPPPpO......",  // 12  purple band
  "OBBBBBBBBBBBBBBBBBBO.....",  // 13  brim
  ".OBBBBBBBBBBBBBBBBBO.....",  // 14  brim underside
  "...OOnnnSSSSSSSSnnOO.....",  // 15  forehead
  "..OORRnnSSSSSSnnRROO.....",  // 16  eyebrows (bushy)
  "..OOSWEeOSSSSOeEWSOO.....",  // 17  eyes
  "...OOSSSSSSSSSSSSsOO.....",  // 18  cheeks
  "....OOSSSSNNSSSSsOO......",  // 19  nose
  "....OOSSSsNNsSSSsOO......",  // 20  nose bridge
  ".....OOSSsMMsSSSOO.......",  // 21  mouth
  "....OOkSSSSSSSSSSkOO.....",  // 22  chin
  "...OOkDdddddddddDkOO....",  // 23  beard top
  "..OOkDddbbbbbbddDkOO....",  // 24  beard
  ".OOkDddbBBBBBBbddDkOO...",  // 25  beard full
  ".OOkDddbBBBBBBbddDkOO...",  // 26  beard full
  "..OOkDddbbbbbbddDkOO....",  // 27  beard
  "...OOkDdddddddDkOO......",  // 28  beard narrows
  "....OOkDddddDkOO........",  // 29  beard tapers
  ".....OOkDDDkOO...........",  // 30  beard tip
  "......OOOOOOO............",  // 31  tip
];

const COLS = GRID[0].length;
const ROWS = GRID.length;
const PX = 2;

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
      aria-label="Trade Wizard"
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
