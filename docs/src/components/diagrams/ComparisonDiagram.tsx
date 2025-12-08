import React from 'react';

interface Side {
  title: string;
  items: string[];
  color?: string;
}

interface ComparisonDiagramProps {
  left: Side;
  right: Side;
  centerLabel?: string;
}

export default function ComparisonDiagram({
  left,
  right,
  centerLabel
}: ComparisonDiagramProps): JSX.Element {
  const sideWidth = 200;
  const padding = 20;
  const centerWidth = centerLabel ? 80 : 40;
  const itemHeight = 28;

  const maxItems = Math.max(left.items.length, right.items.length);
  const boxHeight = 40 + maxItems * itemHeight + 20;
  const width = sideWidth * 2 + centerWidth + padding * 2;
  const height = boxHeight + padding * 2;

  const leftColor = left.color || '#ef4444';
  const rightColor = right.color || '#10b981';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', maxWidth: width, height: 'auto' }}
    >
      {/* Left side */}
      <rect
        x={padding}
        y={padding}
        width={sideWidth}
        height={boxHeight}
        rx={8}
        fill={leftColor}
        opacity={0.1}
        stroke={leftColor}
        strokeWidth={2}
      />
      <text
        x={padding + sideWidth / 2}
        y={padding + 25}
        textAnchor="middle"
        fill={leftColor}
        fontSize="14"
        fontWeight="600"
      >
        {left.title}
      </text>
      {left.items.map((item, i) => (
        <text
          key={i}
          x={padding + sideWidth / 2}
          y={padding + 55 + i * itemHeight}
          textAnchor="middle"
          fill="#374151"
          fontSize="12"
        >
          {item}
        </text>
      ))}

      {/* Center arrow/label */}
      <g>
        <line
          x1={padding + sideWidth + 10}
          y1={height / 2}
          x2={padding + sideWidth + centerWidth - 15}
          y2={height / 2}
          stroke="#64748b"
          strokeWidth={2}
        />
        <polygon
          points={`
            ${padding + sideWidth + centerWidth - 15},${height / 2 - 6}
            ${padding + sideWidth + centerWidth - 15},${height / 2 + 6}
            ${padding + sideWidth + centerWidth - 5},${height / 2}
          `}
          fill="#64748b"
        />
        {centerLabel && (
          <text
            x={padding + sideWidth + centerWidth / 2}
            y={height / 2 - 15}
            textAnchor="middle"
            fill="#64748b"
            fontSize="11"
            fontWeight="500"
          >
            {centerLabel}
          </text>
        )}
      </g>

      {/* Right side */}
      <rect
        x={padding + sideWidth + centerWidth}
        y={padding}
        width={sideWidth}
        height={boxHeight}
        rx={8}
        fill={rightColor}
        opacity={0.1}
        stroke={rightColor}
        strokeWidth={2}
      />
      <text
        x={padding + sideWidth + centerWidth + sideWidth / 2}
        y={padding + 25}
        textAnchor="middle"
        fill={rightColor}
        fontSize="14"
        fontWeight="600"
      >
        {right.title}
      </text>
      {right.items.map((item, i) => (
        <text
          key={i}
          x={padding + sideWidth + centerWidth + sideWidth / 2}
          y={padding + 55 + i * itemHeight}
          textAnchor="middle"
          fill="#374151"
          fontSize="12"
        >
          {item}
        </text>
      ))}
    </svg>
  );
}
