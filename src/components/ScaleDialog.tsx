import { useRef, useState, useCallback, useEffect } from 'react';
import {
  InterpolationMethod,
  INTERPOLATION_DESCRIPTIONS,
} from '../core/interpolation';

type ScaleUnit = 'percent' | 'pixels';

interface ScaleDialogProps {
  open: boolean;
  sourceWidth: number;
  sourceHeight: number;
  interpolationMethod: InterpolationMethod;
  onApply: (width: number, height: number, method: InterpolationMethod) => void;
  onCancel: () => void;
}

function formatMegapixels(w: number, h: number): string {
  const mp = (w * h) / 1_000_000;
  return mp >= 0.001 ? mp.toFixed(3) : '< 0.001';
}

function validateDimensions(w: number, h: number, unit: ScaleUnit): string | null {
  if (!Number.isFinite(w) || !Number.isFinite(h)) return 'Введите числа';
  if (unit === 'percent') {
    if (w < 1 || w > 1000) return 'Процент должен быть от 1 до 1000';
    if (h < 1 || h > 1000) return 'Процент должен быть от 1 до 1000';
  } else {
    if (w < 1 || w > 10000) return 'Ширина должна быть от 1 до 10000 px';
    if (h < 1 || h > 10000) return 'Высота должна быть от 1 до 10000 px';
    if (!Number.isInteger(w)) return 'Ширина должна быть целым числом';
    if (!Number.isInteger(h)) return 'Высота должна быть целым числом';
  }
  return null;
}

export function ScaleDialog({
  open,
  sourceWidth,
  sourceHeight,
  interpolationMethod,
  onApply,
  onCancel,
}: ScaleDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [unit, setUnit] = useState<ScaleUnit>('percent');
  const [widthVal, setWidthVal] = useState<string>('100');
  const [heightVal, setHeightVal] = useState<string>('100');
  const [lockRatio, setLockRatio] = useState(true);
  const [method, setMethod] = useState<InterpolationMethod>(interpolationMethod);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentW = Math.round(sourceWidth * Number(widthVal) / 100);
  const currentH = Math.round(sourceHeight * Number(heightVal) / 100);
  const w = unit === 'pixels' ? Number(widthVal) : currentW;
  const h = unit === 'pixels' ? Number(heightVal) : currentH;

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
      setUnit('percent');
      setWidthVal('100');
      setHeightVal('100');
      setLockRatio(true);
      setMethod(interpolationMethod);
      setError(null);
    } else {
      dialogRef.current?.close();
    }
  }, [open, interpolationMethod]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handler = () => onCancel();
    dialog.addEventListener('close', handler);
    return () => dialog.removeEventListener('close', handler);
  }, [onCancel]);

  const updateWidth = useCallback((val: string) => {
    setWidthVal(val);
    if (lockRatio && sourceWidth > 0) {
      const numVal = Number(val);
      if (Number.isFinite(numVal) && numVal > 0) {
        const ratio = sourceHeight / sourceWidth;
        if (unit === 'percent') {
          setHeightVal(val);
        } else {
          setHeightVal(String(Math.round(numVal * ratio)));
        }
      }
    }
  }, [lockRatio, sourceWidth, sourceHeight, unit]);

  const updateHeight = useCallback((val: string) => {
    setHeightVal(val);
    if (lockRatio && sourceHeight > 0) {
      const numVal = Number(val);
      if (Number.isFinite(numVal) && numVal > 0) {
        const ratio = sourceWidth / sourceHeight;
        if (unit === 'percent') {
          setWidthVal(val);
        } else {
          setWidthVal(String(Math.round(numVal * ratio)));
        }
      }
    }
  }, [lockRatio, sourceWidth, sourceHeight, unit]);

  const handleApply = useCallback(() => {
    const numW = Number(widthVal);
    const numH = Number(heightVal);

    const validationError = validateDimensions(numW, numH, unit);
    if (validationError) {
      setError(validationError);
      return;
    }

    let finalW: number;
    let finalH: number;

    if (unit === 'percent') {
      finalW = Math.round(sourceWidth * numW / 100);
      finalH = Math.round(sourceHeight * numH / 100);
    } else {
      finalW = Math.round(numW);
      finalH = Math.round(numH);
    }

    if (finalW < 1) finalW = 1;
    if (finalH < 1) finalH = 1;

    onApply(finalW, finalH, method);
  }, [widthVal, heightVal, unit, sourceWidth, sourceHeight, method, onApply]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const currentDesc = INTERPOLATION_DESCRIPTIONS.find(d => d.value === method);
  const sourceMP = formatMegapixels(sourceWidth, sourceHeight);

  if (!open) return null;

  return (
    <dialog ref={dialogRef} className="scale-dialog">
      <div className="scale-dialog-content">
        <h2>Масштабирование изображения</h2>

        <div className="scale-info-row">
          <span className="scale-info-label">Исходный размер:</span>
          <span className="scale-info-value">{sourceWidth} × {sourceHeight} ({sourceMP} Мп)</span>
        </div>
        <div className="scale-info-row">
          <span className="scale-info-label">Новый размер:</span>
          <span className="scale-info-value">
            {open && w > 0 && h > 0 ? `${w} × ${h} (${formatMegapixels(w, h)} Мп)` : '—'}
          </span>
        </div>

        <div className="scale-unit-row">
          <label className="scale-label">Единицы:</label>
          <select
            className="scale-select"
            value={unit}
            onChange={e => {
              const newUnit = e.target.value as ScaleUnit;
              setUnit(newUnit);
              if (newUnit === 'pixels' && unit === 'percent') {
                setWidthVal(String(currentW));
                setHeightVal(String(currentH));
              } else if (newUnit === 'percent' && unit === 'pixels') {
                const wp = Math.round(Number(widthVal) / sourceWidth * 100);
                const hp = Math.round(Number(heightVal) / sourceHeight * 100);
                setWidthVal(String(wp));
                setHeightVal(String(hp));
              }
            }}
          >
            <option value="percent">Проценты (%)</option>
            <option value="pixels">Пиксели (px)</option>
          </select>
        </div>

        <div className="scale-dim-row">
          <label className="scale-label">Ширина:</label>
          <div className="scale-dim-input-group">
            <input
              type="number"
              className="scale-input"
              min={1}
              max={unit === 'percent' ? 1000 : 10000}
              value={widthVal}
              onChange={e => updateWidth(e.target.value)}
              onBlur={() => {
                const num = Number(widthVal);
                if (!Number.isFinite(num) || num < 1) setWidthVal('1');
                if (unit === 'percent' && num > 1000) setWidthVal('1000');
                if (unit === 'pixels' && num > 10000) setWidthVal('10000');
              }}
            />
            <span className="scale-unit-label">{unit === 'percent' ? '%' : 'px'}</span>
          </div>
        </div>

        <div className="scale-dim-row">
          <label className="scale-label">Высота:</label>
          <div className="scale-dim-input-group">
            <input
              type="number"
              className="scale-input"
              min={1}
              max={unit === 'percent' ? 1000 : 10000}
              value={heightVal}
              onChange={e => updateHeight(e.target.value)}
              onBlur={() => {
                const num = Number(heightVal);
                if (!Number.isFinite(num) || num < 1) setHeightVal('1');
                if (unit === 'percent' && num > 1000) setHeightVal('1000');
                if (unit === 'pixels' && num > 10000) setHeightVal('10000');
              }}
            />
            <span className="scale-unit-label">{unit === 'percent' ? '%' : 'px'}</span>
          </div>
        </div>

        <label className="scale-checkbox">
          <input
            type="checkbox"
            checked={lockRatio}
            onChange={e => setLockRatio(e.target.checked)}
          />
          Сохранять пропорции
        </label>

        <div className="scale-method-row">
          <label className="scale-label">Алгоритм:</label>
          <div className="scale-method-with-tooltip">
            <select
              className="scale-select scale-select-method"
              value={method}
              onChange={e => setMethod(e.target.value as InterpolationMethod)}
              onMouseEnter={() => setTooltipVisible(true)}
              onMouseLeave={() => setTooltipVisible(false)}
              onFocus={() => setTooltipVisible(true)}
              onBlur={() => setTooltipVisible(false)}
            >
              {INTERPOLATION_DESCRIPTIONS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            {tooltipVisible && currentDesc && (
              <div className="scale-tooltip">
                {currentDesc.description}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="scale-error">{error}</div>
        )}

        <div className="scale-actions">
          <button className="scale-btn" onClick={handleCancel}>Отмена</button>
          <button className="scale-btn scale-btn-primary" onClick={handleApply}>Применить</button>
        </div>
      </div>
    </dialog>
  );
}
