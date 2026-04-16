"use client";

import { useState } from "react";

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  showDots?: boolean;
  fillArea?: boolean;
}

export function LineChart({
  data,
  height = 300,
  color = "#6366f1",
  showDots = true,
  fillArea = true,
}: LineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-text-tertiary"
        style={{ height }}
      >
        No hay datos disponibles
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const chartHeight = height - 60;
  const chartWidth = 100;
  const padding = 5;

  // Calculate points for the line
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * (chartWidth - padding * 2) + padding;
    const y = chartHeight - (item.value / maxValue) * (chartHeight - 40);
    return { x, y, value: item.value, label: item.label };
  });

  const pathData = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Area fill path
  const areaPath = fillArea
    ? `${pathData} L ${points[points.length - 1]!.x} ${chartHeight} L ${points[0]!.x} ${chartHeight} Z`
    : "";

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${chartWidth} ${height}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {/* Define gradient for area fill */}
        {fillArea && (
          <defs>
            <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
        )}

        {/* Horizontal grid lines */}
        {[0, 25, 50, 75, 100].map((percent) => (
          <g key={percent}>
            <line
              x1={padding}
              y1={chartHeight - ((percent / 100) * (chartHeight - 40))}
              x2={chartWidth - padding}
              y2={chartHeight - ((percent / 100) * (chartHeight - 40))}
              stroke="#e5e7eb"
              strokeWidth="0.5"
              strokeDasharray="2"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x="0"
              y={chartHeight - ((percent / 100) * (chartHeight - 40))}
              fontSize="3"
              fill="#9ca3af"
              dominantBaseline="middle"
            >
              {Math.round((maxValue * percent) / 100)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        {fillArea && (
          <path
            d={areaPath}
            fill="url(#areaGradient)"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Dots and labels */}
        {points.map((point, index) => {
          const isHovered = hoveredIndex === index;
          return (
            <g key={index}>
              {/* Dot */}
              {showDots && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isHovered ? "1.2" : "0.8"}
                  fill="white"
                  stroke={color}
                  strokeWidth="0.5"
                  className="transition-all duration-200"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* X-axis label */}
              <text
                x={point.x}
                y={chartHeight + 10}
                textAnchor="middle"
                fontSize="3"
                fill="#6b7280"
              >
                {point.label}
              </text>

              {/* Hover tooltip */}
              {isHovered && (
                <g>
                  <rect
                    x={point.x - 10}
                    y={point.y - 12}
                    width="20"
                    height="8"
                    fill="#1f2937"
                    rx="1"
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={point.x}
                    y={point.y - 6}
                    textAnchor="middle"
                    fontSize="3"
                    fontWeight="600"
                    fill="white"
                  >
                    {point.value.toLocaleString("es-MX")}
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
