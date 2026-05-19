import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  type LevelsParams,
  type LevelsChannelState,
  type ChannelMode,
  createDefaultLevelsState,
  computeHistogram,
  generateLevelsLUT,
} from '../core/levels';

interface LevelsDialogProps {
  open: boolean;
  getSourceImageData: () => ImageData | null;
  channels: number;
  onPreview: (state: LevelsChannelState) => void;
  onApply: (state: LevelsChannelState) => void;
  onCancel: () => void;
  clearPreview: () => void;
  onReset: () => void;
}

const CHANNEL_OPTIONS: { value: ChannelMode; label: string }[] = [
  { value: 'master', label: 'Master (RGB)' },
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'alpha', label: 'Alpha' },
];

const HIST_HEIGHT = 150;
const HIST_WIDTH = 256;

export function LevelsDialog({
  open,
  getSourceImageData,
  channels,
  onPreview,
  onApply,
  onCancel,
  clearPreview,
  onReset,
}: LevelsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const histCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<boolean>(true);
  const animFrameRef = useRef<number>(0);
  const levelsStateRef = useRef<LevelsChannelState>(createDefaultLevelsState());
  const onPreviewRef = useRef(onPreview);
  const clearPreviewRef = useRef(clearPreview);

  const [levelsState, setLevelsState] = useState<LevelsChannelState>(createDefaultLevelsState());
  const [activeChannel, setActiveChannel] = useState<ChannelMode>('master');
  const [logScale, setLogScale] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(true);

  useEffect(() => {
    onPreviewRef.current = onPreview;
    clearPreviewRef.current = clearPreview;
    levelsStateRef.current = levelsState;
  });

  const currentParams = useMemo(() => {
    if (activeChannel === 'master') {
      return levelsState.red;
    }
    return levelsState[activeChannel];
  }, [activeChannel, levelsState]);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handler = () => {
      clearPreviewRef.current();
      onCancel();
    };
    dialog.addEventListener('close', handler);
    return () => dialog.removeEventListener('close', handler);
  }, [onCancel]);

  useEffect(() => {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      if (previewRef.current) {
        onPreviewRef.current(levelsState);
      }
    });
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [levelsState, previewEnabled]);

  const updateParams = useCallback((mode: ChannelMode, params: LevelsParams) => {
    setLevelsState(prev => {
      const next = { ...prev };
      if (mode === 'master') {
        next.red = { ...params };
        next.green = { ...params };
        next.blue = { ...params };
      } else {
        next[mode] = { ...params };
      }
      return next;
    });
  }, []);

  const handleBlackChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), currentParams.whitePoint - 1);
    updateParams(activeChannel, { ...currentParams, blackPoint: val });
  }, [activeChannel, currentParams, updateParams]);

  const handleWhiteChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), currentParams.blackPoint + 1);
    updateParams(activeChannel, { ...currentParams, whitePoint: val });
  }, [activeChannel, currentParams, updateParams]);

  const handleGammaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    updateParams(activeChannel, { ...currentParams, gamma: val });
  }, [activeChannel, currentParams, updateParams]);

  const handleReset = useCallback(() => {
    const def = createDefaultLevelsState();
    setLevelsState(def);
    onReset();
  }, [onReset]);

  const handleCancel = useCallback(() => {
    clearPreview();
    onCancel();
  }, [clearPreview, onCancel]);

  const handleApply = useCallback(() => {
    onApply(levelsState);
  }, [levelsState, onApply]);

  const togglePreview = useCallback(() => {
    setPreviewEnabled(prev => !prev);
  }, []);

  useEffect(() => {
    previewRef.current = previewEnabled;
    if (!previewEnabled) {
      clearPreview();
    }
  }, [previewEnabled, clearPreview]);

  const channel = activeChannel === 'master' && channels <= 2 ? 'red' : activeChannel;

  const histKey = useMemo(() => `${channel}_${logScale}`, [channel, logScale]);
  const histCacheRef = useRef<{ key: string; data: Uint32Array; maxVal: number } | null>(null);

  useEffect(() => {
    const canvas = histCanvasRef.current;
    if (!canvas) return;
    const sourceData = getSourceImageData();
    if (!sourceData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = HIST_WIDTH;
    const h = HIST_HEIGHT;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    if (!histCacheRef.current || histCacheRef.current.key !== histKey) {
      const hist = computeHistogram(sourceData, channel);
      let maxVal = 0;
      for (let i = 0; i < 256; i++) {
        if (hist[i] > maxVal) maxVal = hist[i];
      }
      histCacheRef.current = { key: histKey, data: hist, maxVal };
    }

    const { data: hist, maxVal } = histCacheRef.current;
    if (maxVal === 0) return;

    const barWidth = w / 256;
    for (let i = 0; i < 256; i++) {
      let val: number;
      if (logScale) {
        val = Math.log10(hist[i] + 1) / Math.log10(maxVal + 1);
      } else {
        val = hist[i] / maxVal;
      }
      const barH = val * (h - 2);
      const r = Math.round(i * 255 / 255);
      ctx.fillStyle = `rgb(${r},${r},${r})`;
      ctx.fillRect(i * barWidth, h - barH - 1, Math.ceil(barWidth), barH);
    }

    drawOverlay(ctx, w, h, currentParams);
  }, [getSourceImageData, histKey, currentParams, logScale, channel]);

  const gammaPos = useMemo(() => {
    const bp = currentParams.blackPoint;
    const wp = currentParams.whitePoint;
    return bp + (wp - bp) * Math.pow(0.5, 1 / currentParams.gamma);
  }, [currentParams]);

  if (!open) return null;

  const hasAlpha = channels === 2 || channels === 4;

  return (
    <dialog ref={dialogRef} className="levels-dialog">
      <div className="levels-dialog-content">
        <div className="levels-header">
          <h2>Уровни</h2>
          <div className="levels-channel-select">
            <select
              value={activeChannel}
              onChange={e => setActiveChannel(e.target.value as ChannelMode)}
            >
              {CHANNEL_OPTIONS.map(opt => {
                if (opt.value === 'alpha' && !hasAlpha) return null;
                if (opt.value !== 'master' && opt.value !== 'alpha' && channels <= 2) return null;
                return (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="levels-histogram-section">
          <div className="levels-histogram-wrapper">
            <canvas ref={histCanvasRef} className="levels-histogram" />
          </div>
          <div className="levels-histogram-axis">
            <span>0</span>
            <span>128</span>
            <span>255</span>
          </div>
        </div>

        <div className="levels-controls">
          <div className="levels-sliders">
            <div className="levels-slider-row">
              <label className="levels-slider-label">Чёрный:</label>
              <input
                type="range"
                min={0}
                max={255}
                step={1}
                value={currentParams.blackPoint}
                onChange={handleBlackChange}
                className="levels-slider"
              />
              <input
                type="number"
                min={0}
                max={currentParams.whitePoint - 1}
                value={currentParams.blackPoint}
                onChange={e => {
                  const v = Math.min(Number(e.target.value), currentParams.whitePoint - 1);
                  updateParams(activeChannel, { ...currentParams, blackPoint: Math.max(0, v) });
                }}
                className="levels-input"
              />
            </div>

            <div className="levels-slider-row">
              <label className="levels-slider-label">Гамма:</label>
              <input
                type="range"
                min={0.1}
                max={9.9}
                step={0.01}
                value={currentParams.gamma}
                onChange={handleGammaChange}
                className="levels-slider"
              />
              <input
                type="number"
                min={0.1}
                max={9.9}
                step={0.01}
                value={currentParams.gamma}
                onChange={e => {
                  const v = Math.max(0.1, Math.min(9.9, Number(e.target.value)));
                  updateParams(activeChannel, { ...currentParams, gamma: v });
                }}
                className="levels-input"
              />
            </div>

            <div className="levels-slider-row">
              <label className="levels-slider-label">Белый:</label>
              <input
                type="range"
                min={0}
                max={255}
                step={1}
                value={currentParams.whitePoint}
                onChange={handleWhiteChange}
                className="levels-slider"
              />
              <input
                type="number"
                min={currentParams.blackPoint + 1}
                max={255}
                value={currentParams.whitePoint}
                onChange={e => {
                  const v = Math.max(Number(e.target.value), currentParams.blackPoint + 1);
                  updateParams(activeChannel, { ...currentParams, whitePoint: Math.min(255, v) });
                }}
                className="levels-input"
              />
            </div>
          </div>

          <div className="levels-slider-markers">
            <div className="levels-gradient-bar">
              <div
                className="levels-marker levels-marker-black"
                style={{ left: `${(currentParams.blackPoint / 255) * 100}%` }}
              />
              <div
                className="levels-marker levels-marker-gamma"
                style={{ left: `${(gammaPos / 255) * 100}%` }}
              />
              <div
                className="levels-marker levels-marker-white"
                style={{ left: `${(currentParams.whitePoint / 255) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="levels-options">
          <label className="levels-checkbox">
            <input
              type="checkbox"
              checked={logScale}
              onChange={e => setLogScale(e.target.checked)}
            />
            Логарифмическая шкала
          </label>
          <label className="levels-checkbox">
            <input
              type="checkbox"
              checked={previewEnabled}
              onChange={togglePreview}
            />
            Предпросмотр
          </label>
        </div>

        <div className="levels-actions">
          <button className="levels-btn" onClick={handleReset}>Сброс</button>
          <button className="levels-btn" onClick={handleCancel}>Отмена</button>
          <button className="levels-btn levels-btn-primary" onClick={handleApply}>Применить</button>
        </div>
      </div>
    </dialog>
  );
}

function drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, params: LevelsParams): void {
  const lut = generateLevelsLUT(params);
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 256; i++) {
    const x = i;
    const y = h - 1 - (lut[i] / 255) * (h - 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const bp = params.blackPoint;
  const wp = params.whitePoint;
  const gp = bp + (wp - bp) * Math.pow(0.5, 1 / params.gamma);

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  [bp, gp, wp].forEach(px => {
    const x = (px / 255) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  });
}
