import { UploadIcon, EyedropperIcon, LevelsIcon, ScaleIcon, ConvolutionIcon } from './icons';

interface ToolPanelProps {
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  eyedropperActive: boolean;
  onToggleEyedropper: () => void;
  onOpenLevels: () => void;
  onOpenScale: () => void;
  onOpenConvolution: () => void;
}

export function ToolPanel({ onFileChange, eyedropperActive, onToggleEyedropper, onOpenLevels, onOpenScale, onOpenConvolution }: ToolPanelProps) {
  return (
    <div className="tool-panel">
      <div className="tool-panel-group">
        <label className="tool-btn" title="Загрузить изображение">
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.gb7"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
          <UploadIcon />
        </label>
      </div>

      <div className="tool-panel-separator" />

      <div className="tool-panel-group">
        <button
          className={`tool-btn${eyedropperActive ? ' active' : ''}`}
          title="Пипетка (I)"
          onClick={onToggleEyedropper}
        >
          <EyedropperIcon />
        </button>
        <button
          className="tool-btn"
          title="Уровни (Levels)"
          onClick={onOpenLevels}
        >
          <LevelsIcon />
        </button>
        <button
          className="tool-btn"
          title="Фильтр (Custom)"
          onClick={onOpenConvolution}
        >
          <ConvolutionIcon />
        </button>
        <button
          className="tool-btn"
          title="Масштабирование"
          onClick={onOpenScale}
        >
          <ScaleIcon />
        </button>
      </div>
    </div>
  );
}
