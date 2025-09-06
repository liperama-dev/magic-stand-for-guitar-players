import React, { useState, useEffect, useRef } from 'react';
import { Song } from '../types';
import { useChordBook } from '../hooks/useChordBook';
import UploadIcon from './icons/UploadIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import CloseIcon from './icons/CloseIcon';
import TransposeUpIcon from './icons/TransposeUpIcon';
import TransposeDownIcon from './icons/TransposeDownIcon';
import MusicNoteIcon from './icons/MusicNoteIcon';
import ChordCheatsheet from './ChordCheatsheet';
import PlusIcon from './icons/PlusIcon';
import PlayIcon from './icons/PlayIcon';


interface EditorPanelProps {
  song: Song | null;
  onUpdate: (updatedSong: Partial<Song>) => void;
  onImportFromFile: (file: File) => void;
  onPasteAndCreateSong: () => void;
  onNewSong: () => void;
  onTranspose: (direction: 'up' | 'down') => void;
  onTogglePerformanceMode: () => void;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  clearError: () => void;
  chordBookHook: ReturnType<typeof useChordBook>;
  isCheatsheetVisible: boolean;
  setIsCheatsheetVisible: (visible: boolean) => void;
}

const EditorPanel: React.FC<EditorPanelProps> = ({ 
  song, onUpdate, onImportFromFile, onPasteAndCreateSong, onNewSong, onTranspose, onTogglePerformanceMode,
  isLoading, loadingMessage, error, clearError,
  chordBookHook, isCheatsheetVisible, setIsCheatsheetVisible
}) => {
  const [title, setTitle] = useState(song?.title || '');
  const [content, setContent] = useState(song?.content || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(song?.title || '');
    setContent(song?.content || '');
  }, [song]);

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

  if (!song) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-800 text-gray-400">
        <div className="w-full max-w-lg text-center">
            <MusicNoteIcon classNameProp="h-16 w-16 mx-auto mb-4 text-gray-600" />
            <h2 className="text-3xl font-bold mb-2 text-white">Your Digital Songbook</h2>
            <p className="mb-8">Create songs from scratch, paste from your clipboard, or import files to begin.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                    onClick={onNewSong} 
                    className="flex flex-col items-center justify-center gap-2 bg-gray-900 text-white p-6 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700"
                >
                    <PlusIcon />
                    <span>New Blank Song</span>
                </button>
                <button 
                    onClick={onPasteAndCreateSong} 
                    className="flex flex-col items-center justify-center gap-2 bg-gray-900 text-white p-6 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700"
                >
                    <ClipboardIcon />
                    <span>Paste & Create</span>
                </button>
                <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="flex flex-col items-center justify-center gap-2 bg-gray-900 text-white p-6 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700"
                >
                    <UploadIcon />
                    <span>Import from File</span>
                </button>
            </div>
            
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".txt,.pdf,image/*"
            />
            <p className="text-xs text-gray-500 mt-4">Supported file types: .txt, .pdf, .png, .jpg</p>
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
          <button onClick={() => onTranspose('down')} className="p-2 rounded-md hover:bg-gray-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed" title="Transpose Down" disabled={isLoading}>
              <TransposeDownIcon />
          </button>
          <button onClick={() => onTranspose('up')} className="p-2 rounded-md hover:bg-gray-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed" title="Transpose Up" disabled={isLoading}>
              <TransposeUpIcon />
          </button>
          <button onClick={() => setIsCheatsheetVisible(!isCheatsheetVisible)} className={`p-2 rounded-md hover:bg-gray-600 transition-colors text-sm ${isCheatsheetVisible ? 'bg-indigo-600 text-white' : ''}`} title="Toggle Chord Cheatsheet">
              <MusicNoteIcon />
          </button>
          <button onClick={onTogglePerformanceMode} className="p-2 rounded-md hover:bg-gray-600 transition-colors text-sm" title="Performance View">
              <PlayIcon />
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
