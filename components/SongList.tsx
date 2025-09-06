import React, { useState } from 'react';
import { Song, Set } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import LoaderIcon from './icons/LoaderIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import CloseIcon from './icons/CloseIcon';


interface SongListProps {
  songs: Song[];
  sets: Set[];
  activeSongId: string | null;
  activeSetId: string | null;
  onSelectSong: (id: string, setId?: string) => void;
  onDeleteSong: (id: string) => void;
  onShowWelcome: () => void;
  onNewSet: () => void;
  onDeleteSet: (id: string) => void;
  onUpdateTitle: (id: string, title: string, type: 'song' | 'set') => void;
  onAddSongToSet: (songId: string, setId: string) => void;
  onRemoveSongFromSet: (songId: string, setId: string) => void;
  onReorderSongsInSet: (setId: string, songId: string, newIndex: number) => void;
  isLoading?: boolean;
  pendingSongTitle?: string | null;
}

const SongList: React.FC<SongListProps> = ({ 
    songs, sets, activeSongId, activeSetId, onSelectSong, onDeleteSong, onShowWelcome,
    onNewSet, onDeleteSet, onUpdateTitle, onAddSongToSet, onRemoveSongFromSet, onReorderSongsInSet,
    isLoading, pendingSongTitle 
}) => {
  const [editing, setEditing] = useState<{ id: string; type: 'song' | 'set' } | null>(null);
  const [editText, setEditText] = useState('');
  const [expandedSets, setExpandedSets] = useState<Record<string, boolean>>({});
  const dragItem = React.useRef<{ setId: string; songId: string; index: number} | null>(null);
  const dragOverItem = React.useRef<{ setId: string; index: number} | null>(null);

  const handleDoubleClick = (id: string, type: 'song' | 'set', currentTitle: string) => {
    setEditing({ id, type });
    setEditText(currentTitle);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditText(e.target.value);
  };

  const handleTitleBlur = () => {
    if (editing) {
      onUpdateTitle(editing.id, editText, editing.type);
    }
    setEditing(null);
    setEditText('');
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setEditing(null);
      setEditText('');
    }
  };

  const toggleSetExpansion = (setId: string) => {
    setExpandedSets(prev => ({ ...prev, [setId]: !prev[setId] }));
  };

  // Drag and drop for adding songs to a set
  const handleDragStartSong = (e: React.DragEvent<HTMLLIElement>, songId: string) => {
    e.dataTransfer.setData('songId', songId);
    e.dataTransfer.effectAllowed = 'copy';
  };
  const handleDragOverSet = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const handleDropOnSet = (e: React.DragEvent<HTMLDivElement>, setId: string) => {
    e.preventDefault();
    const songId = e.dataTransfer.getData('songId');
    if (songId) {
      onAddSongToSet(songId, setId);
      setExpandedSets(prev => ({ ...prev, [setId]: true }));
    }
  };

  // Drag and drop for reordering songs within a set
  const handleDragStartInSet = (e: React.DragEvent<HTMLLIElement>, setId: string, songId: string, index: number) => {
    dragItem.current = { setId, songId, index };
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragEnterInSet = (setId: string, index: number) => {
    dragOverItem.current = { setId, index };
  };
  const handleDragEndInSet = () => {
    if (dragItem.current && dragOverItem.current && dragItem.current.setId === dragOverItem.current.setId) {
        onReorderSongsInSet(dragItem.current.setId, dragItem.current.songId, dragOverItem.current.index);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const renderTitle = (item: Song | Set, type: 'song' | 'set', contextSetId?: string) => {
    if (editing?.id === item.id && editing?.type === type) {
      return (
        <input
          type="text"
          value={editText}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          onKeyDown={handleTitleKeyDown}
          className="bg-gray-700 text-white w-full px-1 py-0 text-sm border-indigo-500 border rounded-md"
          autoFocus
        />
      );
    }
    return (
        <span onDoubleClick={() => handleDoubleClick(item.id, type, item.title)} className="truncate">
            {item.title || `Untitled ${type}`}
        </span>
    );
  };
  
  return (
    <div className="w-80 bg-gray-900 text-white flex flex-col h-screen">
      <div className="p-4 border-b border-gray-800 flex items-center flex-shrink-0">
        <h1 className="text-xl font-bold">Guitar Prompter</h1>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        <div>
            <div className="flex justify-between items-center px-2 py-1">
                <h2 className="text-xs font-bold uppercase text-gray-500">My Sets</h2>
                <button onClick={onNewSet} className="p-1 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white" title="New Set"><PlusIcon/></button>
            </div>
            <ul>
                {sets.map(set => (
                    <li key={set.id} className="group/set">
                        <div 
                          onDragOver={handleDragOverSet} 
                          onDrop={(e) => handleDropOnSet(e, set.id)}
                          className={`w-full text-left px-2 py-2 text-sm rounded-md flex items-center transition-colors group-hover:bg-gray-800
                            ${activeSetId === set.id && !activeSongId ? 'bg-indigo-700' : ''}`}
                        >
                            <button onClick={() => toggleSetExpansion(set.id)} className="p-1 text-gray-400 hover:text-white">
                                {expandedSets[set.id] ? <ChevronDownIcon/> : <ChevronRightIcon/>}
                            </button>
                            <div className="flex-1 ml-1">{renderTitle(set, 'set')}</div>
                            <button onClick={() => { if(window.confirm(`Delete "${set.title}"?`)) onDeleteSet(set.id) }} className="p-1 rounded-md text-gray-400 hover:bg-red-500 hover:text-white opacity-0 group-hover/set:opacity-100 transition-opacity" title="Delete Set">
                                <TrashIcon />
                            </button>
                        </div>
                        {expandedSets[set.id] && (
                            <ul className="pl-6 border-l-2 border-gray-700 ml-3">
                                {set.songIds.map((songId, index) => {
                                    const song = songs.find(s => s.id === songId);
                                    if (!song) return null;
                                    return (
                                        <li 
                                          key={song.id} 
                                          className="group/songinset flex items-center"
                                          draggable
                                          onDragStart={(e) => handleDragStartInSet(e, set.id, song.id, index)}
                                          onDragEnter={() => handleDragEnterInSet(set.id, index)}
                                          onDragEnd={handleDragEndInSet}
                                          onDragOver={(e) => e.preventDefault()}
                                        >
                                            <button onClick={() => onSelectSong(song.id, set.id)} className={`w-full text-left px-2 py-2 text-sm rounded-md flex justify-between items-center transition-colors ${activeSongId === song.id ? 'bg-indigo-600 text-white' : 'hover:bg-gray-800'}`}>
                                                <span>{song.title}</span>
                                            </button>
                                            <button onClick={() => onRemoveSongFromSet(song.id, set.id)} className="p-1 rounded-md text-gray-400 hover:bg-red-500 hover:text-white opacity-0 group-hover/songinset:opacity-100 transition-opacity" title="Remove from Set">
                                                <CloseIcon />
                                            </button>
                                        </li>
                                    );
                                })}
                                {set.songIds.length === 0 && <li className="px-4 py-2 text-xs text-gray-500">Drag songs here</li>}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>
        </div>
        <div className="pt-4 border-t border-gray-800">
            <div className="flex justify-between items-center px-2 py-1">
                <h2 className="text-xs font-bold uppercase text-gray-500">My Songs</h2>
                <button onClick={onShowWelcome} className="p-1 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white" title="Import/Create Song"><PlusIcon/></button>
            </div>
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
                <li 
                  key={song.id} 
                  className="group/song"
                  draggable
                  onDragStart={(e) => handleDragStartSong(e, song.id)}
                >
                <div
                    onClick={() => onSelectSong(song.id)}
                    className={`w-full text-left px-4 py-2 text-sm rounded-md flex justify-between items-center transition-colors cursor-pointer ${
                    activeSongId === song.id ? 'bg-indigo-600 text-white' : 'hover:bg-gray-800'
                    }`}
                >
                    {renderTitle(song, 'song')}
                    <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete "${song.title || 'Untitled Song'}"?`)) {
                            onDeleteSong(song.id);
                        }
                    }}
                    className="p-1 rounded-md text-gray-400 hover:bg-red-500 hover:text-white opacity-0 group-hover/song:opacity-100 transition-opacity"
                    title="Delete Song"
                    >
                    <TrashIcon />
                    </button>
                </div>
                </li>
            ))}
            </ul>
        </div>
      </nav>
    </div>
  );
};

export default SongList;