import { DownloadMenu } from './DownloadMenu';
import { INTERPOLATION_DESCRIPTIONS } from '../core/interpolation';
import type { TopBarProps } from '../core/types';

export function TopBar({
  meta,
  onDownload,
  downloadMenuOpen,
  onToggleMenu,
  displayScale,
  onDisplayScaleChange,
  interpolationMethod,
  onInterpolationMethodChange
}: TopBarProps) {
  const scalePercent = Math.round(displayScale * 100);

  return (
    <header className="top-bar">
      <div className="file-info">
        {meta.format
          ? `${meta.fileName} | ${meta.width} \u00d7 ${meta.height} | ${meta.colorDepth}`
          : 'Файл не выбран'}
      </div>

      <div className="toolbar-actions">
        {meta.format && (
          <>
            <div className="scale-control">
              <span className="scale-label">{scalePercent}%</span>
              <input
                type="range"
                className="scale-slider"
                min={12}
                max={300}
                step={1}
                value={scalePercent}
                onChange={e => onDisplayScaleChange(Number(e.target.value) / 100)}
                title="Масштаб отображения"
              />
            </div>
            <select
              className="interpolation-select"
              value={interpolationMethod}
              onChange={e => onInterpolationMethodChange(e.target.value)}
              title="Метод фильтрации при масштабировании"
            >
              {INTERPOLATION_DESCRIPTIONS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </>
        )}
        <DownloadMenu
          onDownload={onDownload}
          isOpen={downloadMenuOpen}
          onToggle={onToggleMenu}
        />
      </div>
    </header>
  );
}
