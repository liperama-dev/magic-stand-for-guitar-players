import React, { useState, useEffect, useRef } from 'react';
import { Song } from '../types';
import { useChordBook } from '../hooks/useChordBook';
import UploadIcon from './icons/UploadIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import CloseIcon from './icons/CloseIcon';
import SearchIcon from './icons/SearchIcon';
import TransposeUpIcon from './icons/TransposeUpIcon';
import TransposeDownIcon from './icons/TransposeDownIcon';
import MusicNoteIcon from './icons/MusicNoteIcon';
import ChordCheatsheet from './ChordCheatsheet';
import ExternalLinkIcon from './icons/ExternalLinkIcon';


interface EditorPanelProps {
  song: Song | null;
  onUpdate: (updatedSong: Partial<Song>) => void;
  onImportFromFile: (file: File) => void;
  onSearch: (query: string, site: string) => void;
  onTranspose: (direction: 'up' | 'down') => void;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  clearError: () => void;
  chordBookHook: ReturnType<typeof useChordBook>;
  isCheatsheetVisible: boolean;
  setIsCheatsheetVisible: (visible: boolean) => void;
  preferredSites: string[];
}

const EditorPanel: React.FC<EditorPanelProps> = ({ 
  song, onUpdate, onImportFromFile, onSearch, onTranspose, 
  isLoading, loadingMessage, error, clearError,
  chordBookHook, isCheatsheetVisible, setIsCheatsheetVisible,
  preferredSites
}) => {
  const [title, setTitle] = useState(song?.title || '');
  const [content, setContent] = useState(song?.content || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSite, setSelectedSite] = useState(preferredSites[0] || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(song?.title || '');
    setContent(song?.content || '');
  }, [song]);
  
  useEffect(() => {
    if (!preferredSites.includes(selectedSite)) {
        setSelectedSite(preferredSites[0] || '');
    }
  }, [preferredSites, selectedSite]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };
  
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const handleBlur = () => {
    if (song && (title !== song.title || content !== song.content)) {
      onUpdate({ title, content });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportFromFile(file);
    }
    e.target.value = '';
  };
  
  const handlePasteFromClipboard = async () => {
    try {
        const text = await navigator.clipboard.readText();
        setContent(text);
        if (song) {
            onUpdate({ content: text });
        }
    } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
        alert('Failed to paste from clipboard.');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && selectedSite) {
        onSearch(searchQuery, selectedSite);
    }
  };

  if (!song) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-900 text-gray-400">
        <div className="w-full max-w-2xl text-center">
            <h2 className="text-2xl font-bold mb-4">Welcome to Guitar Prompter</h2>
            <p className="mb-6">Select a website and search for a song to get started.</p>
            
            <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-grow bg-gray-800 border border-gray-700 text-white rounded-l-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-500"
                    placeholder="Search for a song or artist..."
                />
                <select 
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-white px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    {preferredSites.map(site => <option key={site} value={site}>{site}</option>)}
                </select>
                <button type="submit" className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-r-md hover:bg-indigo-500 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed" disabled={!searchQuery.trim() || !selectedSite}>
                    <SearchIcon /> Search
                </button>
            </form>

            <div className="flex items-center my-6">
                <div className="flex-grow border-t border-gray-700"></div>
                <span className="flex-shrink mx-4 text-gray-500">OR</span>
                <div className="flex-grow border-t border-gray-700"></div>
            </div>

            <button onClick={() => fileInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors">
                <UploadIcon /> Import from File (.txt, .pdf, .png, .jpg)
            </button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".txt,.pdf,image/*"
            />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {(isLoading || error) && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-20">
           {isLoading && (
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-4 text-lg">{loadingMessage}</p>
            </div>
           )}
           {error && !isLoading && (
            <div className="bg-red-500 text-white p-4 rounded-lg shadow-lg flex items-center gap-4 max-w-sm text-center">
                <p>{error}</p>
                <button onClick={clearError} className="p-1 rounded-full hover:bg-red-400 self-start">
                    <CloseIcon />
                </button>
            </div>
          )}
        </div>
      )}
      
      <div className="p-4 border-b border-gray-700 flex items-center gap-2">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          onBlur={handleBlur}
          className="text-2xl font-bold bg-transparent border-none focus:ring-0 w-full text-white placeholder-gray-500"
          placeholder="Song Title"
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          {song.sourceUrl && (
            <a href={song.sourceUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-md hover:bg-gray-600 transition-colors text-sm" title="View Source">
              <ExternalLinkIcon />
            </a>
          )}
          <button onClick={() => onTranspose('down')} className="p-2 rounded-md hover:bg-gray-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed" title="Transpose Down" disabled={isLoading}>
              <TransposeDownIcon />
          </button>
          <button onClick={() => onTranspose('up')} className="p-2 rounded-md hover:bg-gray-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed" title="Transpose Up" disabled={isLoading}>
              <TransposeUpIcon />
          </button>
          <button onClick={handlePasteFromClipboard} className="p-2 rounded-md hover:bg-gray-600 transition-colors text-sm" title="Paste from Clipboard">
              <ClipboardIcon />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-md hover:bg-gray-600 transition-colors text-sm" title="Import from File">
              <UploadIcon />
          </button>
          <button onClick={() => setIsCheatsheetVisible(!isCheatsheetVisible)} className={`p-2 rounded-md hover:bg-gray-600 transition-colors text-sm ${isCheatsheetVisible ? 'bg-indigo-600 text-white' : ''}`} title="Toggle Chord Cheatsheet">
              <MusicNoteIcon />
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".txt,.pdf,image/*" />
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <textarea
            value={content}
            onChange={handleContentChange}
            onBlur={handleBlur}
            className="flex-1 p-4 bg-gray-900 text-gray-300 font-roboto-mono text-sm w-full border-none focus:ring-0 resize-none"
            placeholder="Song content, chords, and tabs..."
            spellCheck="false"
        />
        {isCheatsheetVisible && (
            <ChordCheatsheet 
                songContent={song.content}
                chordBookHook={chordBookHook}
            />
        )}
      </div>
    </div>
  );
};

export default EditorPanel;