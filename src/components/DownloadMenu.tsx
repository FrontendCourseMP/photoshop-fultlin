import { useRef, useEffect } from 'react';
import { DownloadIcon, ChevronDownIcon } from './icons';
import type { DownloadMenuProps } from '../core';


export function DownloadMenu({ onDownload, isOpen, onToggle }: DownloadMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onToggle]);

  return (
    <div className="dropdown" ref={menuRef}>
      <button className="icon-btn" title="Скачать" onClick={onToggle}>
        <DownloadIcon />
        <ChevronDownIcon />
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-item" onClick={() => onDownload('png')}>
            PNG <span className="format-badge">LOSSLESS</span>
          </div>
          <div className="dropdown-item" onClick={() => onDownload('jpg')}>
            JPG <span className="format-badge">LOSSY</span>
          </div>
          <div className="dropdown-item" onClick={() => onDownload('gb7')}>
            GB7 <span className="format-badge">CUSTOM</span>
          </div>
        </div>
      )}
    </div>
  );
}