import React, { useState, useRef } from 'react';
import CloseIcon from './icons/CloseIcon';
import MenuIcon from './icons/MenuIcon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferredSites: string[];
  setPreferredSites: (sites: string[]) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, preferredSites, setPreferredSites }) => {
  const [sites, setSites] = useState(preferredSites);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  if (!isOpen) return null;

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };
  
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
        dragItem.current = null;
        dragOverItem.current = null;
        return;
    }

    const newSites = [...sites];
    const draggedItemContent = newSites.splice(dragItem.current, 1)[0];
    newSites.splice(dragOverItem.current, 0, draggedItemContent);
    
    dragItem.current = null;
    dragOverItem.current = null;
    setSites(newSites);
    setPreferredSites(newSites);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4">Search Priority</h2>
        <p className="text-gray-400 mb-4 text-sm">Drag to reorder your preferred websites for song searches. The app will check them from top to bottom.</p>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-700"
          aria-label="Close Settings"
        >
          <CloseIcon />
        </button>
        <ul className="space-y-2">
          {sites.map((site, index) => (
            <li
              key={site}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className="flex items-center justify-between p-3 bg-gray-700 rounded-md cursor-grab active:cursor-grabbing"
            >
              <span className="font-medium">{site}</span>
              <div className="text-gray-400">
                <MenuIcon />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SettingsModal;