import React, { useMemo, useEffect, useState } from 'react';
import { useChordBook } from '../hooks/useChordBook';
import { getAllChordsInSong } from '../utils/chords';
import ChordDiagram from './ChordDiagram';
import { ChordDiagramData } from '../types';
import ChevronDownIcon from './icons/ChevronDownIcon';

interface ChordCheatsheetProps {
    songContent: string;
    chordBookHook: ReturnType<typeof useChordBook>;
}

const ChordCheatsheet: React.FC<ChordCheatsheetProps> = ({ songContent, chordBookHook }) => {
    const { chordBook, getDiagram } = chordBookHook;
    const [diagrams, setDiagrams] = useState<Record<string, ChordDiagramData | null>>({});

    const relevantChords = useMemo(() => {
        const songChords = getAllChordsInSong(songContent);
        return songChords.filter(chord => chordBook.includes(chord));
    }, [songContent, chordBook]);

    useEffect(() => {
        relevantChords.forEach(chord => {
            if (!diagrams[chord]) {
                getDiagram(chord).then(data => {
                    setDiagrams(prev => ({...prev, [chord]: data}));
                });
            }
        });
    }, [relevantChords, getDiagram, diagrams]);

    if (relevantChords.length === 0) {
        return null;
    }

    return (
        <div className="bg-gray-800 border-t border-gray-700 p-2 flex-shrink-0 z-10">
            <div className="flex items-center gap-4 overflow-x-auto">
                {relevantChords.map(chord => (
                    <div key={chord} className="flex-shrink-0">
                       <ChordDiagram chordName={chord} data={diagrams[chord]} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChordCheatsheet;