"use client";

import { useState } from "react";

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  showValues?: boolean;
}

export function BarChart({
  data,
  height = 300,
  showValues = true,
}: BarChartProps) {
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

  const maxValue = Math.max(...data.map((d) => d.value));
  const chartHeight = height - 60; // Reserve space for labels
  const barWidth = 100 / data.length;

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Chart area */}
      <svg
        width="100%"
        height={height}
        className="overflow-visible"
        style={{ minWidth: "100%" }}
      >
        {/* Horizontal grid lines */}
        {[0, 25, 50, 75, 100].map((percent) => (
          <g key={percent}>
            <line
              x1="0"
              y1={((100 - percent) / 100) * chartHeight}
              x2="100%"
              y2={((100 - percent) / 100) * chartHeight}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="4"
            />
            <text
              x="-5"
              y={((100 - percent) / 100) * chartHeight}
              textAnchor="end"
              fontSize="11"
              fill="#9ca3af"
              dominantBaseline="middle"
            >
              {Math.round((maxValue * percent) / 100)}
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * chartHeight;
          const x = `${index * barWidth}%`;
          const y = chartHeight - barHeight;
          const isHovered = hoveredIndex === index;

          return (
            <g key={index}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={`${barWidth * 0.7}%`}
                height={barHeight}
                fill={item.color || "#6366f1"}
                className="transition-opacity duration-200"
                opacity={isHovered ? 0.8 : 1}
                rx="4"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />

              {/* Value label on top of bar */}
              {showValues && (
                <text
                  x={`${index * barWidth + (barWidth * 0.7) / 2}%`}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="600"
                  fill="#374151"
                >
                  {item.value.toLocaleString("es-MX")}
                </text>
              )}

              {/* X-axis label */}
              <text
                x={`${index * barWidth + (barWidth * 0.7) / 2}%`}
                y={chartHeight + 20}
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
              >
                {item.label}
              </text>

              {/* Hover tooltip */}
              {isHovered && (
                <g>
                  <rect
                    x={`${index * barWidth + (barWidth * 0.7) / 2}%`}
                    y={y - 40}
                    width="80"
                    height="30"
                    fill="#1f2937"
                    rx="4"
                    transform="translate(-40, 0)"
                  />
                  <text
                    x={`${index * barWidth + (barWidth * 0.7) / 2}%`}
                    y={y - 20}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="600"
                    fill="white"
                  >
                    {item.value.toLocaleString("es-MX")}
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
