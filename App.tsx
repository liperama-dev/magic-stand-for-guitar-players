import React, { useState, useEffect } from 'react';
import { Song, Set } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import SongList from './components/SongList';
import EditorPanel from './components/EditorPanel';
import PerformanceView from './components/PerformanceView';
import { transposeSong, parseSongFromFile } from './services/geminiService';
import { useChordBook } from './hooks/useChordBook';

const App: React.FC = () => {
    const [songs, setSongs] = useLocalStorage<Song[]>('guitar-prompter-songs', []);
    const [sets, setSets] = useLocalStorage<Set[]>('guitar-prompter-sets', []);
    const [activeSongId, setActiveSongId] = useLocalStorage<string | null>('guitar-prompter-active-song-id', null);
    const [activeSetId, setActiveSetId] = useLocalStorage<string | null>('guitar-prompter-active-set-id', null);
    
    const [isPerformanceMode, setIsPerformanceMode] = useState(false);
    const [performanceContext, setPerformanceContext] = useState<{ setId: string; songIndex: number } | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [pendingSongTitle, setPendingSongTitle] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const chordBookHook = useChordBook();
    const [isCheatsheetVisible, setIsCheatsheetVisible] = useState(false);

    const activeSong = songs.find(song => song.id === activeSongId) || null;

    const handleNewSong = () => {
        const newSong: Song = {
            id: `song-${Date.now()}`,
            title: 'Untitled Song',
            content: '',
            createdAt: Date.now(),
        };
        setSongs(prevSongs => [newSong, ...prevSongs]);
        setActiveSongId(newSong.id);
        setActiveSetId(null);
    };
    
    const handleDeleteSong = (id: string) => {
        setSongs(songs => songs.filter(song => song.id !== id));
        // Also remove this song from any sets
        setSets(prevSets => prevSets.map(set => ({
            ...set,
            songIds: set.songIds.filter(songId => songId !== id)
        })));

        if (activeSongId === id) {
            setActiveSongId(null);
        }
    };
    
    const handleUpdateSong = (updatedSong: Partial<Song>) => {
        if (!activeSongId) return;
        setSongs(songs =>
            songs.map(song =>
                song.id === activeSongId ? { ...song, ...updatedSong } : song
            )
        );
    };

    const handleUpdateTitle = (id: string, title: string, type: 'song' | 'set') => {
        if (type === 'song') {
            setSongs(prev => prev.map(s => s.id === id ? {...s, title} : s));
        } else {
            setSets(prev => prev.map(s => s.id === id ? {...s, title} : s));
        }
    };
    
    const handlePasteAndCreateSong = async () => {
        setIsLoading(true);
        setPendingSongTitle('Pasting from clipboard...');
        setLoadingMessage('Reading clipboard...');
        setError(null);
        try {
            const text = await navigator.clipboard.readText();
            if (!text.trim()) {
                setIsLoading(false);
                setPendingSongTitle(null);
                return;
            };

            const newSong: Song = {
                id: `song-${Date.now()}`,
                title: 'Pasted Song',
                content: text,
                createdAt: Date.now(),
            };
            setSongs(prev => [newSong, ...prev]);
            setActiveSongId(newSong.id);
            setActiveSetId(null);
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            setError('Failed to paste from clipboard.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
            setPendingSongTitle(null);
        }
    };

    const handleImportFromFile = async (file: File) => {
        setIsLoading(true);
        setPendingSongTitle(file.name);
        setLoadingMessage(`Importing from ${file.name}...`);
        setError(null);
        try {
            const { title, content } = await parseSongFromFile(file);
            const newSong: Song = {
                id: `song-${Date.now()}`,
                title: title || 'Imported Song',
                content: content,
                createdAt: Date.now(),
            };
            setSongs(prev => [newSong, ...prev]);
            setActiveSongId(newSong.id);
            setActiveSetId(null);
        } catch (e) {
            console.error(e);
            setError('Failed to import from file. The file format may not be supported.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
            setPendingSongTitle(null);
        }
    };

    const handleTranspose = async (direction: 'up' | 'down') => {
        if (!activeSong) return;
        setIsLoading(true);
        setLoadingMessage(`Transposing ${direction}...`);
        setError(null);
        try {
            const transposedContent = await transposeSong(activeSong.content, direction);
            handleUpdateSong({ content: transposedContent });
        } catch (e) {
            console.error(e);
            setError('Failed to transpose the song.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleSelectSong = (id: string, contextSetId?: string) => {
        setActiveSongId(id);
        setActiveSetId(contextSetId || null);
    };

    const handleShowWelcome = () => {
        setActiveSongId(null);
        setActiveSetId(null);
    };

    // Set Management
    const handleNewSet = () => {
        let count = 1;
        let newTitle = "Untitled Set";
        while (sets.some(set => set.title === newTitle)) {
            newTitle = `Untitled Set ${count++}`;
        }
        const newSet: Set = {
            id: `set-${Date.now()}`,
            title: newTitle,
            songIds: [],
        };
        setSets(prev => [newSet, ...prev]);
    };

    const handleDeleteSet = (id: string) => {
        setSets(prev => prev.filter(set => set.id !== id));
        if (activeSetId === id) {
            setActiveSetId(null);
        }
    };
    
    const handleAddSongToSet = (songId: string, setId: string) => {
        setSets(prev => prev.map(set => {
            if (set.id === setId && !set.songIds.includes(songId)) {
                return { ...set, songIds: [...set.songIds, songId] };
            }
            return set;
        }));
    };
    
    const handleRemoveSongFromSet = (songId: string, setId: string) => {
        setSets(prev => prev.map(set => {
            if (set.id === setId) {
                return { ...set, songIds: set.songIds.filter(id => id !== songId) };
            }
            return set;
        }));
    };

    const handleReorderSongsInSet = (setId: string, songId: string, newIndex: number) => {
        setSets(prev => prev.map(set => {
            if (set.id === setId) {
                const newSongIds = [...set.songIds];
                const oldIndex = newSongIds.indexOf(songId);
                if (oldIndex > -1) {
                    const [item] = newSongIds.splice(oldIndex, 1);
                    newSongIds.splice(newIndex, 0, item);
                    return { ...set, songIds: newSongIds };
                }
            }
            return set;
        }));
    };


    const handleTogglePerformanceMode = () => {
        if (!activeSong) return;

        if (!isPerformanceMode) { // Entering performance mode
            if (activeSetId) {
                const set = sets.find(s => s.id === activeSetId);
                if (set) {
                    const songIndex = set.songIds.indexOf(activeSong.id);
                    if (songIndex !== -1) {
                        setPerformanceContext({ setId: activeSetId, songIndex });
                    }
                }
            }
            setIsPerformanceMode(true);
        } else { // Exiting
            setIsPerformanceMode(false);
            setPerformanceContext(null);
        }
    };
    
    const handlePerformanceNavigate = (direction: 'next' | 'prev') => {
        if (!performanceContext) return;
        const { setId, songIndex } = performanceContext;
        const set = sets.find(s => s.id === setId);
        if (!set) return;

        const newIndex = direction === 'next' ? songIndex + 1 : songIndex - 1;
        if (newIndex >= 0 && newIndex < set.songIds.length) {
            setActiveSongId(set.songIds[newIndex]);
            setPerformanceContext({ setId, songIndex: newIndex });
        }
    };

    let performanceProps = {};
    if (isPerformanceMode && performanceContext) {
        const set = sets.find(s => s.id === performanceContext.setId);
        if (set) {
            performanceProps = {
                onNext: () => handlePerformanceNavigate('next'),
                onPrev: () => handlePerformanceNavigate('prev'),
                isNextAvailable: performanceContext.songIndex < set.songIds.length - 1,
                isPrevAvailable: performanceContext.songIndex > 0,
            };
        }
    }
    
    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans">
            <SongList
                songs={songs}
                sets={sets}
                activeSongId={activeSongId}
                activeSetId={activeSetId}
                onSelectSong={handleSelectSong}
                onDeleteSong={handleDeleteSong}
                onShowWelcome={handleShowWelcome}
                onNewSet={handleNewSet}
                onDeleteSet={handleDeleteSet}
                onUpdateTitle={handleUpdateTitle}
                onAddSongToSet={handleAddSongToSet}
                onRemoveSongFromSet={handleRemoveSongFromSet}
                onReorderSongsInSet={handleReorderSongsInSet}
                isLoading={isLoading}
                pendingSongTitle={pendingSongTitle}
            />
            <main className="flex-1 flex flex-col h-full bg-gray-800">
                <EditorPanel
                    song={activeSong}
                    onUpdate={handleUpdateSong}
                    onImportFromFile={handleImportFromFile}
                    onPasteAndCreateSong={handlePasteAndCreateSong}
                    onNewSong={handleNewSong}
                    onTranspose={handleTranspose}
                    onTogglePerformanceMode={handleTogglePerformanceMode}
                    isLoading={isLoading}
                    loadingMessage={loadingMessage}
                    error={error}
                    clearError={() => setError(null)}
                    chordBookHook={chordBookHook}
                    isCheatsheetVisible={isCheatsheetVisible}
                    setIsCheatsheetVisible={setIsCheatsheetVisible}
                />
            </main>

            {activeSong && isPerformanceMode && (
                <PerformanceView
                    song={activeSong}
                    onExit={handleTogglePerformanceMode}
                    chordBookHook={chordBookHook}
                    isCheatsheetVisible={isCheatsheetVisible}
                    setIsCheatsheetVisible={setIsCheatsheetVisible}
                    {...performanceProps}
                />
            )}
        </div>
    );
};

export default App;
