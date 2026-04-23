"use client";

import { useState } from "react";

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  showDots?: boolean;
  fillArea?: boolean;
  formatValue?: (n: number) => string;
}

const CHART_W = 600;
const CHART_H_DEFAULT = 280;
const PAD_LEFT = 56;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 32;

function defaultFormat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return n.toLocaleString("es-MX");
}

/** Round a number up to a "nice" axis ceiling (1, 2, 5, 10 × 10^n) */
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

export function LineChart({
  data,
  height = CHART_H_DEFAULT,
  color = "#6366f1",
  showDots = true,
  fillArea = true,
  formatValue = defaultFormat,
}: LineChartProps) {
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

  const pointFor = (i: number, v: number) => {
    const x =
      data.length === 1
        ? PAD_LEFT + innerW / 2
        : PAD_LEFT + (i / (data.length - 1)) * innerW;
    const y = PAD_TOP + innerH - (v / niceMax) * innerH;
    return { x, y };
  };

  const points = data.map((d, i) => ({ ...pointFor(i, d.value), ...d }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const areaPath = fillArea
    ? `${linePath} L ${points[points.length - 1]!.x.toFixed(2)} ${(PAD_TOP + innerH).toFixed(2)} L ${points[0]!.x.toFixed(2)} ${(PAD_TOP + innerH).toFixed(2)} Z`
    : "";

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
        {fillArea && (
          <defs>
            <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
        )}

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

        {/* Area */}
        {fillArea && <path d={areaPath} fill="url(#areaGradient)" />}

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots + x labels */}
        {points.map((p, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <g key={i}>
              {showDots && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5 : 3.5}
                  fill="#fff"
                  stroke={color}
                  strokeWidth="2"
                  className="transition-all"
                />
              )}
              <text
                x={p.x}
                y={chartH - PAD_BOTTOM + 16}
                textAnchor="middle"
                fontSize="11"
                fill="#6b7280"
              >
                {p.label}
              </text>

              {/* Hover hit area */}
              <rect
                x={p.x - innerW / Math.max(data.length, 1) / 2}
                y={PAD_TOP}
                width={innerW / Math.max(data.length, 1)}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />

              {isHovered && (
                <g pointerEvents="none">
                  <rect
                    x={p.x - 36}
                    y={p.y - 28}
                    width={72}
                    height={20}
                    rx={4}
                    fill="#1f2937"
                  />
                  <text
                    x={p.x}
                    y={p.y - 14}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill="#fff"
                  >
                    {formatValue(p.value)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
