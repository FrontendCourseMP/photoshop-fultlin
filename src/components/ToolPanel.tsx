import { UploadIcon, EyedropperIcon } from './icons';

interface ToolPanelProps {
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  eyedropperActive: boolean;
  onToggleEyedropper: () => void;
}

export function ToolPanel({ onFileChange, eyedropperActive, onToggleEyedropper }: ToolPanelProps) {
  return (
    <div className="tool-panel">
      <div className="tool-panel-group">
        <label className={`tool-btn${eyedropperActive ? '' : ''}`} title="Загрузить изображение">
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
      </div>
    </div>
  );
}
