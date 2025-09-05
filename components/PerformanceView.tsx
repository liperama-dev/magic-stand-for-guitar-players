import React, { useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react';
import { Song } from '../types';
import { useChordBook } from '../hooks/useChordBook';
import { usePitchDetector } from '../hooks/usePitchDetector';
import { parseChordsInLine, getRootNote } from '../utils/chords';
import CloseIcon from './icons/CloseIcon';
import MusicNoteIcon from './icons/MusicNoteIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import ChordCheatsheet from './ChordCheatsheet';

interface PerformanceViewProps {
  song: Song;
  onExit: () => void;
  chordBookHook: ReturnType<typeof useChordBook>;
  isCheatsheetVisible: boolean;
  setIsCheatsheetVisible: (visible: boolean) => void;
}

const PerformanceView: React.FC<PerformanceViewProps> = ({ song, onExit, chordBookHook, isCheatsheetVisible, setIsCheatsheetVisible }) => {
  const [highlightedSectionIndex, setHighlightedSectionIndex] = useState(0);
  const { isListening, detectedNote, toggleListening, error: micError } = usePitchDetector();
  const [fontSize, setFontSize] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const songSections = useMemo(() => {
    return song.content.split(/\n\s*\n/).map(section => section.trim()).filter(Boolean);
  }, [song.content]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onExit();
      if (event.key === 'ArrowDown') setHighlightedSectionIndex(prev => Math.min(prev + 1, songSections.length - 1));
      if (event.key === 'ArrowUp') setHighlightedSectionIndex(prev => Math.max(prev - 1, 0));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit, songSections.length]);

  useLayoutEffect(() => {
    const calculateFontSize = () => {
      const container = containerRef.current;
      if (!container || !sectionRefs.current.some(ref => ref !== null)) {
        return;
      }

      container.style.fontSize = '';
      const initialFontSize = parseFloat(window.getComputedStyle(container).fontSize);

      const columnCount = parseInt(window.getComputedStyle(container).columnCount, 10) || 1;
      const columnGap = columnCount > 1 ? parseInt(window.getComputedStyle(container).columnGap, 10) || 0 : 0;
      const columnWidth = (container.clientWidth - (columnGap * (columnCount - 1))) / columnCount;

      let maxScrollWidth = 0;
      sectionRefs.current.forEach(sectionEl => {
        if (sectionEl) {
          const originalWhiteSpace = sectionEl.style.whiteSpace;
          sectionEl.style.whiteSpace = 'pre';
          if (sectionEl.scrollWidth > maxScrollWidth) {
            maxScrollWidth = sectionEl.scrollWidth;
          }
          sectionEl.style.whiteSpace = originalWhiteSpace;
        }
      });
      
      const buffer = 2;
      if (maxScrollWidth > (columnWidth - buffer)) {
        const scale = (columnWidth - buffer) / maxScrollWidth;
        const newSize = initialFontSize * scale;
        setFontSize(Math.max(newSize, 10));
      } else {
        setFontSize(null);
      }
    };
    
    sectionRefs.current = sectionRefs.current.slice(0, songSections.length);
    calculateFontSize();
    
    const resizeObserver = new ResizeObserver(calculateFontSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [song.content, songSections.length]);

  useEffect(() => {
    if (isListening && detectedNote && songSections.length > 0) {
      const nextSectionIndex = (highlightedSectionIndex + 1) % songSections.length;
      const nextSection = songSections[nextSectionIndex];
      const nextSectionChords = parseChordsInLine(nextSection.split('\n')[0]);
      
      if (nextSectionChords.length > 0) {
        const nextSectionRoots = nextSectionChords.map(getRootNote).filter(Boolean) as string[];
        if (nextSectionRoots.includes(detectedNote)) {
          const timer = setTimeout(() => {
            setHighlightedSectionIndex(nextSectionIndex);
          }, 300);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [isListening, detectedNote, highlightedSectionIndex, songSections]);

  const renderSection = (section: string) => {
    return section.split('\n').map((line, lineIndex) => {
      const chords = parseChordsInLine(line);
      if (chords.length > 0 && chords.length <= line.replace(/\s+/g, ' ').split(' ').length) {
        let lastIndex = 0;
        const parts = [];
        line.match(/\S+/g)?.forEach((token, tokenIndex) => {
            const isChord = chords.includes(token);
            const startIndex = line.indexOf(token, lastIndex);
            if (startIndex > lastIndex) {
                parts.push(<span key={`space-${tokenIndex}`}>{line.substring(lastIndex, startIndex)}</span>);
            }
            if (isChord) {
                const isSaved = chordBookHook.chordBook.includes(token);
                parts.push(
                    <button 
                        key={`${token}-${tokenIndex}`}
                        onClick={() => chordBookHook.addChord(token)}
                        className={`font-bold transition-colors rounded px-1 ${isSaved ? 'text-indigo-400' : 'text-cyan-400 hover:bg-cyan-800'}`}
                    >
                        {token}
                    </button>
                );
            } else {
                parts.push(<span key={`${token}-${tokenIndex}`}>{token}</span>);
            }
            lastIndex = startIndex + token.length;
        });
        return <div key={lineIndex} className="whitespace-pre">{parts}</div>;
      }
      return <div key={lineIndex} className="whitespace-pre">{line}</div>;
    });
  };

  return (
    <div className="fixed inset-0 bg-black text-white z-50 flex flex-col">
      <div className="p-4 md:p-6 lg:p-8 flex-shrink-0">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center">{song.title}</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto px-8 md:px-12 lg:px-16" onDoubleClick={onExit}>
        <div 
          ref={containerRef}
          style={{ fontSize: fontSize ? `${fontSize}px` : undefined }}
          className="font-roboto-mono text-lg md:text-xl lg:text-2xl h-full leading-relaxed md:leading-loose 
                        columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5
                        gap-x-8 md:gap-x-12 lg:gap-x-16">
          {songSections.map((section, index) => (
            <div 
              key={index} 
              // FIX: A ref callback should not return a value. The assignment `sectionRefs.current[index] = el` implicitly returns `el`.
              // By wrapping the assignment in curly braces, the arrow function body becomes a block and implicitly returns `undefined`.
              ref={el => { sectionRefs.current[index] = el; }}
              className={`break-inside-avoid mb-6 whitespace-pre-wrap p-2 rounded-md transition-colors duration-500 ${index === highlightedSectionIndex ? 'bg-gray-800 ring-2 ring-indigo-500' : ''}`}
            >
              {renderSection(section)}
            </div>
          ))}
        </div>
      </div>

      {isCheatsheetVisible && (
        <ChordCheatsheet 
            songContent={song.content}
            chordBookHook={chordBookHook}
        />
      )}

      <div className="fixed top-4 right-4 flex flex-col gap-2 z-50">
        <button
            onClick={onExit}
            className="p-3 bg-gray-700 rounded-full hover:bg-red-500 transition-all duration-200"
            aria-label="Exit Performance Mode"
        >
            <CloseIcon />
        </button>
         <button 
            onClick={() => setIsCheatsheetVisible(!isCheatsheetVisible)} 
            className={`p-3 rounded-full transition-colors duration-200 ${isCheatsheetVisible ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            title="Toggle Chord Cheatsheet"
        >
            <MusicNoteIcon />
        </button>
        <button
            onClick={toggleListening}
            className={`p-3 rounded-full transition-all duration-200 ${isListening ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            aria-label={isListening ? 'Stop Listening' : 'Start Listening'}
        >
            <MicrophoneIcon />
        </button>
      </div>
      {micError && <div className="fixed bottom-4 left-4 bg-red-500 text-white p-3 rounded-lg text-sm">{micError}</div>}
    </div>
  );
};

export default PerformanceView;
