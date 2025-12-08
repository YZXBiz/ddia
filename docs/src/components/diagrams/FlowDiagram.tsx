import React from 'react';

interface FlowDiagramProps {
  steps: string[];
  direction?: 'horizontal' | 'vertical';
  color?: string;
}

export default function FlowDiagram({
  steps,
  direction = 'horizontal',
  color = '#3b82f6'
}: FlowDiagramProps): JSX.Element {
  const isHorizontal = direction === 'horizontal';
  const boxWidth = 120;
  const boxHeight = 50;
  const arrowLength = 40;
  const padding = 20;

  const totalWidth = isHorizontal
    ? steps.length * boxWidth + (steps.length - 1) * arrowLength + padding * 2
    : boxWidth + padding * 2;
  const totalHeight = isHorizontal
    ? boxHeight + padding * 2
    : steps.length * boxHeight + (steps.length - 1) * arrowLength + padding * 2;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      style={{ width: '100%', maxWidth: totalWidth, height: 'auto' }}
    >
      {steps.map((step, index) => {
        const x = isHorizontal
          ? padding + index * (boxWidth + arrowLength)
          : padding;
        const y = isHorizontal
          ? padding
          : padding + index * (boxHeight + arrowLength);

        return (
          <g key={index}>
            {/* Box */}
            <rect
              x={x}
              y={y}
              width={boxWidth}
              height={boxHeight}
              rx={8}
              fill={color}
              opacity={0.9}
            />
            {/* Text */}
            <text
              x={x + boxWidth / 2}
              y={y + boxHeight / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="14"
              fontWeight="500"
            >
              {step}
            </text>
            {/* Arrow to next step */}
            {index < steps.length - 1 && (
              isHorizontal ? (
                <g>
                  <line
                    x1={x + boxWidth + 5}
                    y1={y + boxHeight / 2}
                    x2={x + boxWidth + arrowLength - 10}
                    y2={y + boxHeight / 2}
                    stroke={color}
                    strokeWidth={2}
                  />
                  <polygon
                    points={`${x + boxWidth + arrowLength - 10},${y + boxHeight / 2 - 6} ${x + boxWidth + arrowLength - 10},${y + boxHeight / 2 + 6} ${x + boxWidth + arrowLength},${y + boxHeight / 2}`}
                    fill={color}
                  />
                </g>
              ) : (
                <g>
                  <line
                    x1={x + boxWidth / 2}
                    y1={y + boxHeight + 5}
                    x2={x + boxWidth / 2}
                    y2={y + boxHeight + arrowLength - 10}
                    stroke={color}
                    strokeWidth={2}
                  />
                  <polygon
                    points={`${x + boxWidth / 2 - 6},${y + boxHeight + arrowLength - 10} ${x + boxWidth / 2 + 6},${y + boxHeight + arrowLength - 10} ${x + boxWidth / 2},${y + boxHeight + arrowLength}`}
                    fill={color}
                  />
                </g>
              )
            )}
          </g>
        );
      })}
    </svg>
  );
}
