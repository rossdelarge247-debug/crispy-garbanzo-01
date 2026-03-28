"use client";

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export default function MiniSparkline({
  data,
  width = 80,
  height = 32,
  color = "#1a1a2e",
}: MiniSparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return `${x},${y}`;
  });

  const polylinePoints = points.join(" ");

  // Polygon: same points plus bottom-right and bottom-left corners to close the fill
  const lastX = padding + chartWidth;
  const firstX = padding;
  const bottom = padding + chartHeight;
  const polygonPoints = `${polylinePoints} ${lastX},${bottom} ${firstX},${bottom}`;

  return (
    <span className="inline-flex">
      <svg width={width} height={height}>
        <polygon
          points={polygonPoints}
          fill={color}
          fillOpacity={0.1}
          stroke="none"
        />
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
        />
      </svg>
    </span>
  );
}
