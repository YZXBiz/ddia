import React from 'react';

interface PipelineStage {
  label: string;
  items?: string[];
  color?: string;
}

interface PipelineDiagramProps {
  stages: PipelineStage[];
  title?: string;
}

export default function PipelineDiagram({
  stages,
  title
}: PipelineDiagramProps): JSX.Element {
  const stageWidth = 140;
  const stageHeight = 80;
  const arrowWidth = 50;
  const padding = 30;

  const width = stages.length * stageWidth + (stages.length - 1) * arrowWidth + padding * 2;
  const height = stageHeight + padding * 2 + (title ? 30 : 0);

  const defaultColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', maxWidth: width, height: 'auto' }}
    >
      {/* Title */}
      {title && (
        <text x={width / 2} y={20} textAnchor="middle" fill="#1e293b" fontSize="16" fontWeight="600">
          {title}
        </text>
      )}

      {stages.map((stage, index) => {
        const x = padding + index * (stageWidth + arrowWidth);
        const y = padding + (title ? 30 : 0);
        const color = stage.color || defaultColors[index % defaultColors.length];
        const hasItems = stage.items && stage.items.length > 0;
        const actualHeight = hasItems ? stageHeight + stage.items!.length * 16 : stageHeight;

        return (
          <g key={index}>
            {/* Stage box */}
            <rect
              x={x}
              y={y}
              width={stageWidth}
              height={actualHeight}
              rx={8}
              fill={color}
              opacity={0.9}
            />

            {/* Stage label */}
            <text
              x={x + stageWidth / 2}
              y={y + (hasItems ? 25 : stageHeight / 2)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="14"
              fontWeight="600"
            >
              {stage.label}
            </text>

            {/* Items */}
            {hasItems && stage.items!.map((item, i) => (
              <text
                key={i}
                x={x + stageWidth / 2}
                y={y + 45 + i * 16}
                textAnchor="middle"
                fill="white"
                fontSize="11"
                opacity={0.9}
              >
                • {item}
              </text>
            ))}

            {/* Arrow to next stage */}
            {index < stages.length - 1 && (
              <g>
                <line
                  x1={x + stageWidth + 10}
                  y1={y + stageHeight / 2}
                  x2={x + stageWidth + arrowWidth - 15}
                  y2={y + stageHeight / 2}
                  stroke="#64748b"
                  strokeWidth={2}
                />
                <polygon
                  points={`
                    ${x + stageWidth + arrowWidth - 15},${y + stageHeight / 2 - 6}
                    ${x + stageWidth + arrowWidth - 15},${y + stageHeight / 2 + 6}
                    ${x + stageWidth + arrowWidth - 5},${y + stageHeight / 2}
                  `}
                  fill="#64748b"
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
