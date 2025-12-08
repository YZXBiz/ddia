import React from 'react';

interface Box {
  id: string;
  label: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  subItems?: string[];
}

interface Connection {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

interface ArchitectureDiagramProps {
  boxes: Box[];
  connections?: Connection[];
  width?: number;
  height?: number;
}

export default function ArchitectureDiagram({
  boxes,
  connections = [],
  width = 600,
  height = 400
}: ArchitectureDiagramProps): JSX.Element {
  const defaultWidth = 140;
  const defaultHeight = 60;
  const defaultColor = '#3b82f6';

  const getBoxCenter = (box: Box) => ({
    x: box.x + (box.width || defaultWidth) / 2,
    y: box.y + (box.height || defaultHeight) / 2
  });

  const getConnectionPoints = (fromBox: Box, toBox: Box) => {
    const from = getBoxCenter(fromBox);
    const to = getBoxCenter(toBox);
    const fromW = (fromBox.width || defaultWidth) / 2;
    const fromH = (fromBox.height || defaultHeight) / 2;
    const toW = (toBox.width || defaultWidth) / 2;
    const toH = (toBox.height || defaultHeight) / 2;

    const dx = to.x - from.x;
    const dy = to.y - from.y;

    let startX = from.x, startY = from.y, endX = to.x, endY = to.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      startX = from.x + (dx > 0 ? fromW : -fromW);
      endX = to.x + (dx > 0 ? -toW : toW);
    } else {
      startY = from.y + (dy > 0 ? fromH : -fromH);
      endY = to.y + (dy > 0 ? -toH : toH);
    }

    return { startX, startY, endX, endY };
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', maxWidth: width, height: 'auto' }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
        </marker>
      </defs>

      {/* Connections */}
      {connections.map((conn, index) => {
        const fromBox = boxes.find(b => b.id === conn.from);
        const toBox = boxes.find(b => b.id === conn.to);
        if (!fromBox || !toBox) return null;

        const { startX, startY, endX, endY } = getConnectionPoints(fromBox, toBox);

        return (
          <g key={index}>
            <line
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke="#64748b"
              strokeWidth={2}
              strokeDasharray={conn.dashed ? '5,5' : 'none'}
              markerEnd="url(#arrowhead)"
            />
            {conn.label && (
              <text
                x={(startX + endX) / 2}
                y={(startY + endY) / 2 - 8}
                textAnchor="middle"
                fill="#64748b"
                fontSize="11"
              >
                {conn.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Boxes */}
      {boxes.map((box) => {
        const w = box.width || defaultWidth;
        const h = box.height || defaultHeight;
        const c = box.color || defaultColor;
        const hasSubItems = box.subItems && box.subItems.length > 0;
        const actualHeight = hasSubItems ? h + box.subItems!.length * 18 + 10 : h;

        return (
          <g key={box.id}>
            <rect
              x={box.x}
              y={box.y}
              width={w}
              height={actualHeight}
              rx={8}
              fill={c}
              opacity={0.9}
            />
            <text
              x={box.x + w / 2}
              y={box.y + (hasSubItems ? 25 : h / 2)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="14"
              fontWeight="600"
            >
              {box.label}
            </text>
            {hasSubItems && box.subItems!.map((item, i) => (
              <text
                key={i}
                x={box.x + w / 2}
                y={box.y + 45 + i * 18}
                textAnchor="middle"
                fill="white"
                fontSize="11"
                opacity={0.9}
              >
                {item}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
