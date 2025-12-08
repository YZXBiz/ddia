import React from 'react';

interface Layer {
  label: string;
  description?: string;
  color?: string;
}

interface LayerDiagramProps {
  layers: Layer[];
  title?: string;
  direction?: 'up' | 'down';
}

export default function LayerDiagram({
  layers,
  title,
  direction = 'down'
}: LayerDiagramProps): JSX.Element {
  const layerWidth = 300;
  const layerHeight = 50;
  const layerGap = 8;
  const padding = 30;

  const orderedLayers = direction === 'up' ? [...layers].reverse() : layers;
  const width = layerWidth + padding * 2;
  const height = layers.length * (layerHeight + layerGap) - layerGap + padding * 2 + (title ? 30 : 0);

  const defaultColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

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

      {orderedLayers.map((layer, index) => {
        const x = padding;
        const y = padding + (title ? 30 : 0) + index * (layerHeight + layerGap);
        const color = layer.color || defaultColors[index % defaultColors.length];

        return (
          <g key={index}>
            <rect
              x={x}
              y={y}
              width={layerWidth}
              height={layerHeight}
              rx={6}
              fill={color}
              opacity={0.9}
            />
            <text
              x={x + layerWidth / 2}
              y={y + (layer.description ? layerHeight / 2 - 8 : layerHeight / 2)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="14"
              fontWeight="600"
            >
              {layer.label}
            </text>
            {layer.description && (
              <text
                x={x + layerWidth / 2}
                y={y + layerHeight / 2 + 10}
                textAnchor="middle"
                fill="white"
                fontSize="11"
                opacity={0.8}
              >
                {layer.description}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
