import { WRAPPINGS, RIBBON_COLORS, FLOWERS } from "@/lib/bouquet-catalog";

type BouquetCardPreviewProps = {
  wrapping: string;
  ribbon_color: string;
  flowers: { id: string; qty: number }[];
  className?: string;
};

export function BouquetCardPreview({
  wrapping,
  ribbon_color,
  flowers = [],
  className = "aspect-[4/5]",
}: BouquetCardPreviewProps) {
  const wrapObj = WRAPPINGS.find((w) => w.id === wrapping);
  const wrap = wrapObj?.swatch ?? "var(--ivory)";
  const ribbon = RIBBON_COLORS.find((r) => r.id === ribbon_color)?.swatch ?? "var(--forest)";

  const stems = (flowers || []).flatMap((f) => {
    const flower = FLOWERS.find((x) => x.id === f.id);
    return Array.from({ length: Math.min(f.qty, 16) }, (_, i) => ({
      id: `${f.id}-${i}`,
      name: flower?.name ?? f.id,
      icon: flower?.icon ?? "🌹",
      image: flower?.image,
    }));
  });

  return (
    <div
      className={`relative w-full overflow-hidden flex items-center justify-center select-none ${className}`}
      style={{
        background:
          "radial-gradient(circle at 50% 45%, oklch(0.985 0.008 85), oklch(0.93 0.025 82))",
      }}
    >
      {/* Soft Shadow Base */}
      <div className="absolute bottom-[4%] w-[55%] h-[8%] bg-black/15 rounded-full blur-lg z-0" />

      {/* Bouquet Container */}
      <div className="relative w-[90%] h-[92%] flex flex-col items-center justify-end z-10">
        {/* SVG V-Cone Backdrop & Stem Handle */}
        <svg
          viewBox="0 0 400 500"
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Stem Bundle at base */}
          <g transform="translate(200, 410)">
            <line
              x1="-16"
              y1="0"
              x2="-24"
              y2="65"
              stroke="#2d5a27"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <line
              x1="-7"
              y1="0"
              x2="-10"
              y2="70"
              stroke="#1b3818"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="75"
              stroke="#2d5a27"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <line
              x1="7"
              y1="0"
              x2="12"
              y2="70"
              stroke="#1b3818"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <line
              x1="16"
              y1="0"
              x2="22"
              y2="64"
              stroke="#2d5a27"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>

          {/* Back Flared V-Cone Paper Wrap */}
          <path
            d="M 45,150 Q 200,85 355,150 L 245,410 Q 200,422 155,410 Z"
            fill={wrap}
            style={{ filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.18))" }}
          />

          {/* Crease Depth Shadow */}
          <path
            d="M 65,168 Q 200,110 335,168 L 235,400 Q 200,410 165,400 Z"
            fill="rgba(0,0,0,0.12)"
          />
        </svg>

        {/* Blooming Flowers Crown */}
        <div className="absolute top-[12%] w-[82%] h-[56%] z-20">
          <div className="relative w-full h-full">
            {stems.map((s, i) => {
              const total = stems.length || 1;
              const row = i % 3; // 0 = Back, 1 = Middle, 2 = Front Focal
              const col = Math.floor(i / 3);
              const maxCols = Math.ceil(total / 3);

              const xOffset = maxCols > 1 ? (col / (maxCols - 1) - 0.5) * 58 : 0;
              const x = 50 + xOffset;
              const y = row === 0 ? 25 + (col % 2) * 6 : row === 1 ? 44 + (col % 2) * 6 : 64;
              const size = row === 0 ? 46 : row === 1 ? 54 : 62;
              const rot = xOffset * 0.35 + (i % 2 === 0 ? 10 : -10);

              return (
                <div
                  key={s.id}
                  className="absolute flex items-center justify-center select-none"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: size,
                    height: size,
                    transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                    filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.22))",
                  }}
                >
                  {s.image ? (
                    <img
                      src={s.image}
                      alt={s.name}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : (
                    <span style={{ fontSize: `${size * 0.9}px` }}>{s.icon}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SVG Front Overlapping Folds & Silk Ribbon Bow */}
        <svg
          viewBox="0 0 400 500"
          className="absolute inset-0 w-full h-full pointer-events-none z-30"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Left Paper Overlap Fold */}
          <path
            d="M 50,210 Q 145,240 215,405 L 155,410 Z"
            fill={wrap}
            stroke="rgba(0,0,0,0.08)"
            strokeWidth="1"
            style={{ filter: "drop-shadow(-3px 5px 10px rgba(0,0,0,0.15))" }}
          />

          {/* Right Paper Overlap Fold */}
          <path
            d="M 350,210 Q 255,240 185,405 L 245,410 Z"
            fill={wrap}
            stroke="rgba(0,0,0,0.08)"
            strokeWidth="1"
            style={{ filter: "drop-shadow(3px 5px 10px rgba(0,0,0,0.2))" }}
          />

          {/* Satin Ribbon Tied Bow at Waist */}
          <g transform="translate(200, 405)">
            {/* Left Ribbon Tail */}
            <path
              d="M -6,6 Q -22,35 -30,68"
              stroke={ribbon}
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
              style={{ filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.25))" }}
            />
            {/* Right Ribbon Tail */}
            <path
              d="M 6,6 Q 22,35 30,65"
              stroke={ribbon}
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
              style={{ filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.25))" }}
            />
            {/* Left Satin Loop */}
            <ellipse
              cx="-20"
              cy="-8"
              rx="22"
              ry="13"
              fill={ribbon}
              transform="rotate(-18 -20 -8)"
              style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.28))" }}
            />
            {/* Right Satin Loop */}
            <ellipse
              cx="20"
              cy="-8"
              rx="22"
              ry="13"
              fill={ribbon}
              transform="rotate(18 20 -8)"
              style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.28))" }}
            />
            {/* Ribbon Knot Center */}
            <circle
              cx="0"
              cy="0"
              r="8"
              fill={ribbon}
              style={{ filter: "brightness(0.85) drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
