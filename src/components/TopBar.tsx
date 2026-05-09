import { UploadIcon, EyedropperIcon } from './icons';
import { DownloadMenu } from './DownloadMenu';
import type { TopBarProps } from '../core/types';

interface ExtendedTopBarProps extends TopBarProps {
  eyedropperActive: boolean;
  onToggleEyedropper: () => void;
}

export function TopBar({
  meta,
  onFileChange,
  onDownload,
  downloadMenuOpen,
  onToggleMenu,
  eyedropperActive,
  onToggleEyedropper,
}: ExtendedTopBarProps) {
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

        <button
          className={`icon-btn${eyedropperActive ? ' active' : ''}`}
          title="Пипетка"
          onClick={onToggleEyedropper}
        >
          <EyedropperIcon />
        </button>

        <DownloadMenu
          onDownload={onDownload}
          isOpen={downloadMenuOpen}
          onToggle={onToggleMenu}
        />
      </div>
    </header>
  );
}
