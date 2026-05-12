import { DownloadMenu } from './DownloadMenu';
import type { TopBarProps } from '../core/types';

export function TopBar({
  meta,
  onDownload,
  downloadMenuOpen,
  onToggleMenu
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="file-info">
        {meta.format
          ? `${meta.fileName} | ${meta.width} \u00d7 ${meta.height} | ${meta.colorDepth}`
          : 'Файл не выбран'}
      </div>

      <div className="toolbar-actions">
        <DownloadMenu
          onDownload={onDownload}
          isOpen={downloadMenuOpen}
          onToggle={onToggleMenu}
        />
      </div>
    </header>
  );
}
