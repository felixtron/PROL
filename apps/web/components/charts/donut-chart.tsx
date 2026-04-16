"use client";

import { useState } from "react";

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({
  data,
  size = 200,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-text-tertiary"
        style={{ width: size, height: size }}
      >
        No hay datos
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 20;
  const strokeWidth = 30;

  // Calculate segments
  let currentAngle = -90; // Start at top
  const segments = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle += angle;

    return {
      ...item,
      percentage,
      startAngle,
      endAngle,
    };
  });

  // Helper to convert polar to cartesian coordinates
  const polarToCartesian = (angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY + radius * Math.sin(rad),
    };
  };

  // Create SVG arc path
  const createArc = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(startAngle);
    const end = polarToCartesian(endAngle);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Chart */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
          />

          {/* Segments */}
          {segments.map((segment, index) => {
            const isHovered = hoveredIndex === index;
            return (
              <path
                key={index}
                d={createArc(segment.startAngle, segment.endAngle)}
                fill="none"
                stroke={segment.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeLinecap="round"
                className="transition-all duration-200 cursor-pointer"
                opacity={isHovered ? 0.8 : 1}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </svg>

        {/* Center text */}
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && (
              <div className="text-2xl font-bold text-text-primary">
                {centerValue}
              </div>
            )}
            {centerLabel && (
              <div className="text-sm text-text-tertiary">{centerLabel}</div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4">
        {segments.map((segment, index) => {
          const isHovered = hoveredIndex === index;
          return (
            <div
              key={index}
              className="flex items-center gap-2 cursor-pointer transition-opacity"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ opacity: isHovered ? 1 : 0.8 }}
            >
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: segment.color }}
              />
              <div className="flex items-center gap-1 text-sm">
                <span className="text-text-secondary">{segment.label}</span>
                <span className="font-semibold text-text-primary">
                  {segment.value}
                </span>
                <span className="text-text-tertiary">
                  ({segment.percentage.toFixed(0)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
