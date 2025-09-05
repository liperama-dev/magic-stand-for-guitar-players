import React from 'react';
import { Song } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import HomeIcon from './icons/HomeIcon';
import SettingsIcon from './icons/SettingsIcon';
import LoaderIcon from './icons/LoaderIcon';

interface SongListProps {
  songs: Song[];
  activeSongId: string | null;
  onSelectSong: (id: string) => void;
  onNewSong: () => void;
  onDeleteSong: (id: string) => void;
  onShowWelcome: () => void;
  onOpenSettings: () => void;
  isLoading?: boolean;
  pendingSongTitle?: string | null;
}

const SongList: React.FC<SongListProps> = ({ 
    songs, activeSongId, onSelectSong, onNewSong, onDeleteSong, onShowWelcome, onOpenSettings, isLoading, pendingSongTitle 
}) => {
  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-screen">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center flex-shrink-0">
        <h1 className="text-xl font-bold">Guitar Prompter</h1>
        <button onClick={onOpenSettings} className="p-2 rounded-md hover:bg-gray-700 transition-colors" title="Settings">
            <SettingsIcon />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <button
            onClick={onShowWelcome}
            className={`w-full text-left px-4 py-3 my-1 text-sm rounded-md flex items-center gap-3 transition-colors ${!activeSongId ? 'bg-indigo-600 text-white' : 'hover:bg-gray-800'}`}
        >
            <HomeIcon />
            <span>Home / Search</span>
        </button>
        <button
          onClick={onNewSong}
          className="w-full text-left px-4 py-3 my-1 text-sm rounded-md flex items-center gap-3 transition-colors hover:bg-gray-800"
          title="New Blank Song"
        >
          <PlusIcon />
          <span>New Song</span>
        </button>
        <div className="mt-4 pt-4 border-t border-gray-800">
            <h2 className="px-4 text-xs font-bold uppercase text-gray-500 mb-2">My Songs</h2>
            <ul>
            {isLoading && pendingSongTitle && (
                <li className="group">
                    <div className="w-full text-left px-4 py-3 text-sm rounded-md flex justify-between items-center text-gray-500 cursor-wait">
                        <span className="truncate">{pendingSongTitle}</span>
                        <LoaderIcon />
                    </div>
                </li>
            )}
            {songs.map(song => (
                <li key={song.id} className="group">
                <button
                    onClick={() => onSelectSong(song.id)}
                    className={`w-full text-left px-4 py-3 text-sm rounded-md flex justify-between items-center transition-colors ${
                    activeSongId === song.id ? 'bg-indigo-600 text-white' : 'hover:bg-gray-800'
                    }`}
                >
                    <span className="truncate">{song.title || 'Untitled Song'}</span>
                    <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete "${song.title || 'Untitled Song'}"?`)) {
                            onDeleteSong(song.id);
                        }
                    }}
                    className="p-1 rounded-md text-gray-400 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Song"
                    >
                    <TrashIcon />
                    </button>
                </button>
                </li>
            ))}
            </ul>
        </div>
      </nav>
    </div>
  );
};

export default SongList;