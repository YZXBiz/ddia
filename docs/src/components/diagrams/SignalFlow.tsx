import React from 'react';

type SignalType = 'traces' | 'metrics' | 'logs' | 'all';

interface SignalFlowProps {
  from: string;
  to: string;
  signals?: SignalType[];
  showCollector?: boolean;
  collectorLabel?: string;
}

const signalColors = {
  traces: '#8b5cf6',
  metrics: '#10b981',
  logs: '#f59e0b',
  all: '#3b82f6'
};

export default function SignalFlow({
  from,
  to,
  signals = ['all'],
  showCollector = false,
  collectorLabel = 'Collector'
}: SignalFlowProps): JSX.Element {
  const width = showCollector ? 600 : 450;
  const height = signals.length > 1 ? 120 : 80;
  const boxWidth = 120;
  const boxHeight = 50;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', maxWidth: width, height: 'auto' }}
    >
      {/* From box */}
      <rect x={20} y={height/2 - boxHeight/2} width={boxWidth} height={boxHeight} rx={8} fill="#3b82f6" />
      <text x={20 + boxWidth/2} y={height/2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="14" fontWeight="500">
        {from}
      </text>

      {/* Collector box (optional) */}
      {showCollector && (
        <>
          <rect x={width/2 - boxWidth/2} y={height/2 - boxHeight/2} width={boxWidth} height={boxHeight} rx={8} fill="#64748b" />
          <text x={width/2} y={height/2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="14" fontWeight="500">
            {collectorLabel}
          </text>
        </>
      )}

      {/* To box */}
      <rect x={width - 20 - boxWidth} y={height/2 - boxHeight/2} width={boxWidth} height={boxHeight} rx={8} fill="#10b981" />
      <text x={width - 20 - boxWidth/2} y={height/2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="14" fontWeight="500">
        {to}
      </text>

      {/* Signal lines */}
      {signals.map((signal, index) => {
        const yOffset = signals.length > 1 ? (index - (signals.length - 1) / 2) * 20 : 0;
        const color = signalColors[signal];
        const startX = 20 + boxWidth + 10;
        const midX = showCollector ? width/2 - boxWidth/2 - 10 : 0;
        const midX2 = showCollector ? width/2 + boxWidth/2 + 10 : 0;
        const endX = width - 20 - boxWidth - 10;

        if (showCollector) {
          return (
            <g key={signal}>
              {/* Line to collector */}
              <line x1={startX} y1={height/2 + yOffset} x2={midX} y2={height/2 + yOffset} stroke={color} strokeWidth={2} />
              {/* Line from collector */}
              <line x1={midX2} y1={height/2 + yOffset} x2={endX} y2={height/2 + yOffset} stroke={color} strokeWidth={2} />
              <polygon points={`${endX},${height/2 + yOffset - 5} ${endX},${height/2 + yOffset + 5} ${endX + 8},${height/2 + yOffset}`} fill={color} />
              {/* Label */}
              <text x={(startX + midX) / 2} y={height/2 + yOffset - 8} textAnchor="middle" fill={color} fontSize="10" fontWeight="500">
                {signal}
              </text>
            </g>
          );
        } else {
          return (
            <g key={signal}>
              <line x1={startX} y1={height/2 + yOffset} x2={endX} y2={height/2 + yOffset} stroke={color} strokeWidth={2} />
              <polygon points={`${endX},${height/2 + yOffset - 5} ${endX},${height/2 + yOffset + 5} ${endX + 8},${height/2 + yOffset}`} fill={color} />
              <text x={(startX + endX) / 2} y={height/2 + yOffset - 8} textAnchor="middle" fill={color} fontSize="10" fontWeight="500">
                {signal}
              </text>
            </g>
          );
        }
      })}
    </svg>
  );
}
