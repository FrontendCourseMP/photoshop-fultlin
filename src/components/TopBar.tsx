import { UploadIcon } from './icons';
import { DownloadMenu } from './DownloadMenu';
import type { TopBarProps } from '../core/types';

export function TopBar({ 
  meta, 
  onFileChange, 
  onDownload, 
  downloadMenuOpen, 
  onToggleMenu 
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="file-info">
        {meta.format 
          ? `${meta.fileName} | ${meta.width} × ${meta.height} | ${meta.colorDepth}` 
          : 'Файл не выбран'}
      </div>
      
      <div className="toolbar-actions">
        <label className="icon-btn" title="Загрузить изображение">
          <input 
            type="file" 
            accept=".png,.jpg,.jpeg,.gb7" 
            onChange={onFileChange} 
            style={{ display: 'none' }} 
          />
          <UploadIcon />
        </label>

        <DownloadMenu 
          onDownload={onDownload}
          isOpen={downloadMenuOpen}
          onToggle={onToggleMenu}
        />
      </div>
    </header>
  );
}