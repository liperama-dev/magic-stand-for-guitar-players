import React from 'react';
import { ChordDiagramData } from '../types';
import LoaderIcon from './icons/LoaderIcon';

interface ChordDiagramProps {
  chordName: string;
  data: ChordDiagramData | null | undefined;
}

const ChordDiagram: React.FC<ChordDiagramProps> = ({ chordName, data }) => {
  if (data === undefined) {
    return (
      <div className="w-24 h-32 flex flex-col items-center justify-center text-xs text-gray-400 bg-gray-700 rounded-md">
        <LoaderIcon />
        <span>{chordName}</span>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="w-24 h-32 flex flex-col items-center justify-center text-xs text-red-400 bg-gray-700 rounded-md">
        <span>Error</span>
        <span>{chordName}</span>
      </div>
    );
  }

  const { frets, fingers, baseFret } = data;
  const numStrings = 6;
  const numFrets = 4;
  const stringSpacing = 16;
  const fretSpacing = 18;
  const dotRadius = 6;
  const fingerOffsetY = 22;

  return (
    <div className="text-center font-mono text-xs">
      <span className="font-bold text-sm text-white">{chordName}</span>
      <svg
        width={stringSpacing * (numStrings - 1) + 20}
        height={fretSpacing * numFrets + 30}
        xmlns="http://www.w3.org/2000/svg"
        className="mt-1"
      >
        {/* Base Fret Number */}
        {baseFret > 1 && (
          <text x="-2" y={fretSpacing / 2 + 5} fontSize="10" fill="#9ca3af" textAnchor="end">
            {baseFret}
          </text>
        )}
        
        {/* Nut */}
        <rect x="9" y="5" width={stringSpacing * (numStrings - 1) + 2} height={baseFret > 1 ? 1 : 4} fill="#e5e7eb" />

        {/* Strings */}
        {Array.from({ length: numStrings }).map((_, i) => (
          <line
            key={`string-${i}`}
            x1={10 + i * stringSpacing}
            y1="5"
            x2={10 + i * stringSpacing}
            y2={10 + fretSpacing * numFrets}
            stroke="#4b5563"
            strokeWidth="1"
          />
        ))}

        {/* Frets */}
        {Array.from({ length: numFrets + 1 }).map((_, i) => (
          <line
            key={`fret-${i}`}
            x1="10"
            y1={10 + i * fretSpacing}
            x2={10 + stringSpacing * (numStrings - 1)}
            y2={10 + i * fretSpacing}
            stroke="#6b7280"
            strokeWidth="1"
          />
        ))}

        {/* Dots (Fingers) & Open/Muted Strings */}
        {frets.map((fret, i) => {
          const stringX = 10 + i * stringSpacing;
          if (fret === 'x') {
            return <text key={`x-${i}`} x={stringX} y="3" fontSize="10" fill="#9ca3af" textAnchor="middle">x</text>;
          }
          if (fret === 'o') {
            return <circle key={`o-${i}`} cx={stringX} cy="0" r="3" stroke="#9ca3af" strokeWidth="1" fill="none" />;
          }
          if (typeof fret === 'number') {
            const fretY = 10 + (fret - baseFret + 0.5) * fretSpacing;
            const finger = fingers[i];
            const isBarre = typeof finger === 'number' && fingers.indexOf(finger) < i;

            if (isBarre) return null; // Render barre chords separately if needed, for now just place dots

            return (
              <g key={`dot-${i}`}>
                <circle cx={stringX} cy={fretY} r={dotRadius} fill="#e5e7eb" />
                <text x={stringX} y={fretY + 4} fontSize="10" fill="#111827" textAnchor="middle" fontWeight="bold">
                  {finger}
                </text>
              </g>
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
};

export default ChordDiagram;