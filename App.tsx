import React, { useState, useEffect, useCallback } from 'react';
import { Song } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import SongList from './components/SongList';
import EditorPanel from './components/EditorPanel';
import PerformanceView from './components/PerformanceView';
import { searchSongOnPreferredSites, extractSongFromHtml, transposeSong, parseSongFromFile } from './services/geminiService';
import { useChordBook } from './hooks/useChordBook';
import SettingsModal from './components/SettingsModal';

const App: React.FC = () => {
    const [songs, setSongs] = useLocalStorage<Song[]>('guitar-prompter-songs', []);
    const [activeSongId, setActiveSongId] = useLocalStorage<string | null>('guitar-prompter-active-song-id', null);
    const [isPerformanceMode, setIsPerformanceMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [pendingSongTitle, setPendingSongTitle] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const chordBookHook = useChordBook();
    const [isCheatsheetVisible, setIsCheatsheetVisible] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [preferredSites, setPreferredSites] = useLocalStorage<string[]>('guitar-prompter-preferred-sites', [
        'cifraclub.com.br',
        'ultimate-guitar.com',
        'e-chords.com',
        'chordie.com',
    ]);


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
    };
    
    const handleDeleteSong = (id: string) => {
        setSongs(songs => songs.filter(song => song.id !== id));
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

    const handleSearch = async (query: string, site: string) => {
        setIsLoading(true);
        setPendingSongTitle(query);
        setLoadingMessage(`Searching for "${query}" on ${site}...`);
        setError(null);
        try {
            const searchResult = await searchSongOnPreferredSites(query, site);
            
            if (searchResult.status === 'NOT_FOUND') {
                setError(`Could not find "${query}" on ${site}. Please try another website or search term.`);
                setIsLoading(false);
                setLoadingMessage('');
                setPendingSongTitle(null);
                return;
            }

            setLoadingMessage(`Parsing "${searchResult.pageTitle}"...`);

            const extractedData = await extractSongFromHtml(searchResult.pageTitle, searchResult.htmlContent, searchResult.sourceUrl);

            const newSong: Song = {
                id: `song-${Date.now()}`,
                title: extractedData.title || searchResult.pageTitle,
                content: extractedData.content,
                createdAt: Date.now(),
                sourceUrl: searchResult.sourceUrl,
            };
            setSongs(prev => [newSong, ...prev]);
            setActiveSongId(newSong.id);
        } catch (e) {
            console.error(e);
            setError('Failed to find and parse the song. The website may have blocked the request or the response was invalid.');
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
    
    const handleSelectSong = (id: string) => {
        setActiveSongId(id);
    };

    const handleShowWelcome = () => {
        setActiveSongId(null);
    };

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            if (activeSong) {
                setIsPerformanceMode(prev => !prev);
            }
        }
    }, [activeSong]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
    
    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans">
            <SongList
                songs={songs}
                activeSongId={activeSongId}
                onSelectSong={handleSelectSong}
                onNewSong={handleNewSong}
                onDeleteSong={handleDeleteSong}
                onShowWelcome={handleShowWelcome}
                onOpenSettings={() => setIsSettingsOpen(true)}
                isLoading={isLoading}
                pendingSongTitle={pendingSongTitle}
            />
            <main className="flex-1 flex flex-col h-full bg-gray-800">
                <EditorPanel
                    song={activeSong}
                    onUpdate={handleUpdateSong}
                    onImportFromFile={handleImportFromFile}
                    onSearch={handleSearch}
                    onTranspose={handleTranspose}
                    isLoading={isLoading}
                    loadingMessage={loadingMessage}
                    error={error}
                    clearError={() => setError(null)}
                    chordBookHook={chordBookHook}
                    isCheatsheetVisible={isCheatsheetVisible}
                    setIsCheatsheetVisible={setIsCheatsheetVisible}
                    preferredSites={preferredSites}
                />
            </main>

            {activeSong && isPerformanceMode && (
                <PerformanceView
                    song={activeSong}
                    onExit={() => setIsPerformanceMode(false)}
                    chordBookHook={chordBookHook}
                    isCheatsheetVisible={isCheatsheetVisible}
                    setIsCheatsheetVisible={setIsCheatsheetVisible}
                />
            )}

            <SettingsModal 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                preferredSites={preferredSites}
                setPreferredSites={setPreferredSites}
            />
        </div>
    );
};

export default App;