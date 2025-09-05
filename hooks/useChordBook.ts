import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { ChordDiagramData } from '../types';
import { fetchChordDiagram } from '../services/geminiService';

export const useChordBook = () => {
  const [chordBook, setChordBook] = useLocalStorage<string[]>('guitar-prompter-chord-book', []);
  const [diagramCache, setDiagramCache] = useLocalStorage<Record<string, ChordDiagramData>>('guitar-prompter-diagram-cache', {});
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, string | null>>({});

  const addChord = useCallback((chordName: string) => {
    setChordBook(prev => {
      if (prev.includes(chordName)) {
        // Remove chord if it already exists (toggle behavior)
        return prev.filter(c => c !== chordName);
      }
      return [...prev, chordName].sort();
    });
  }, [setChordBook]);

  const getDiagram = useCallback(async (chordName: string) => {
    if (diagramCache[chordName]) {
      return diagramCache[chordName];
    }

    setIsLoading(prev => ({ ...prev, [chordName]: true }));
    setError(prev => ({ ...prev, [chordName]: null }));

    try {
      const diagramData = await fetchChordDiagram(chordName);
      setDiagramCache(prev => ({ ...prev, [chordName]: diagramData }));
      return diagramData;
    } catch (e) {
      console.error(`Failed to fetch diagram for ${chordName}:`, e);
      setError(prev => ({ ...prev, [chordName]: 'Failed to load diagram.' }));
      return null;
    } finally {
      setIsLoading(prev => ({ ...prev, [chordName]: false }));
    }
  }, [diagramCache, setDiagramCache]);

  return {
    chordBook,
    addChord,
    getDiagram,
    isLoading,
    error,
  };
};