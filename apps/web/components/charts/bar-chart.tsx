"use client";

import { useState } from "react";

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  showValues?: boolean;
  formatValue?: (n: number) => string;
}

const CHART_W = 600;
const CHART_H_DEFAULT = 280;
const PAD_LEFT = 56;
const PAD_RIGHT = 16;
const PAD_TOP = 24;
const PAD_BOTTOM = 32;

function defaultFormat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return n.toLocaleString("es-MX");
}

function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const f = value / Math.pow(10, exp);
  let nice: number;
  if (f <= 1) nice = 1;
  else if (f <= 2) nice = 2;
  else if (f <= 5) nice = 5;
  else nice = 10;
  return nice * Math.pow(10, exp);
}

export function BarChart({
  data,
  height = CHART_H_DEFAULT,
  showValues = true,
  formatValue = defaultFormat,
}: BarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-sm text-text-tertiary"
        style={{ height }}
      >
        No hay datos disponibles
      </div>
    );
  }

  const chartW = CHART_W;
  const chartH = height;
  const innerW = chartW - PAD_LEFT - PAD_RIGHT;
  const innerH = chartH - PAD_TOP - PAD_BOTTOM;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const niceMax = niceCeiling(maxValue);

  const slotW = innerW / data.length;
  const barW = slotW * 0.6;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    value: niceMax * p,
    y: PAD_TOP + innerH - p * innerH,
  }));

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${chartW} ${chartH}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
      >
        {/* Y-axis grid + labels */}
        {yTicks.map((t) => (
          <g key={t.y}>
            <line
              x1={PAD_LEFT}
              y1={t.y}
              x2={chartW - PAD_RIGHT}
              y2={t.y}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <text
              x={PAD_LEFT - 8}
              y={t.y}
              fontSize="11"
              fill="#9ca3af"
              textAnchor="end"
              dominantBaseline="middle"
            >
              {formatValue(t.value)}
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((item, i) => {
          const slotX = PAD_LEFT + i * slotW;
          const barX = slotX + (slotW - barW) / 2;
          const barH = (item.value / niceMax) * innerH;
          const barY = PAD_TOP + innerH - barH;
          const isHovered = hoveredIndex === i;

          return (
            <g key={i}>
              <rect
                x={barX}
                y={barY}
                width={barW}
                height={Math.max(barH, 0)}
                fill={item.color ?? "#6366f1"}
                rx={4}
                opacity={isHovered ? 0.85 : 1}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="transition-opacity"
              />

              {showValues && barH > 18 && (
                <text
                  x={slotX + slotW / 2}
                  y={barY - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="#374151"
                >
                  {formatValue(item.value)}
                </text>
              )}

              <text
                x={slotX + slotW / 2}
                y={chartH - PAD_BOTTOM + 16}
                textAnchor="middle"
                fontSize="11"
                fill="#6b7280"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
