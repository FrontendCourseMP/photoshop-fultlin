import { useRef, useState, useCallback, useEffect } from 'react';
import {
  type ConvolutionParams,
  type Kernel,
  type EdgeHandling,
  CONVOLUTION_PRESETS,
  KERNEL_IDENTITY,
} from '../core/convolution';

interface ConvolutionDialogProps {
  open: boolean;
  onPreview: (params: ConvolutionParams) => void;
  onApply: (params: ConvolutionParams) => void;
  onCancel: () => void;
  clearPreview: () => void;
  onReset: () => void;
}

function cloneKernel(k: Kernel): Kernel {
  return [
    [k[0][0], k[0][1], k[0][2]],
    [k[1][0], k[1][1], k[1][2]],
    [k[2][0], k[2][1], k[2][2]],
  ];
}

function kernelsEqual(a: Kernel, b: Kernel): boolean {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (a[i][j] !== b[i][j]) return false;
    }
  }
  return true;
}

const CHANNELS_ALL: ('r' | 'g' | 'b' | 'a')[] = ['r', 'g', 'b', 'a'];
const CHANNELS_RGB: ('r' | 'g' | 'b' | 'a')[] = ['r', 'g', 'b'];

interface InternalState {
  presetIndex: number;
  kernel: Kernel;
  channels: ('r' | 'g' | 'b' | 'a')[];
  edgeHandling: EdgeHandling;
}

function createDefaultState(): InternalState {
  return {
    presetIndex: 0,
    kernel: cloneKernel(KERNEL_IDENTITY),
    channels: [...CHANNELS_RGB],
    edgeHandling: 'copy',
  };
}

const EDGE_OPTIONS: { value: EdgeHandling; label: string }[] = [
  { value: 'black', label: 'Чёрный' },
  { value: 'white', label: 'Белый' },
  { value: 'copy', label: 'Копирование' },
];

export function ConvolutionDialog({
  open,
  onPreview,
  onApply,
  onCancel,
  clearPreview,
  onReset,
}: ConvolutionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewRef = useRef<boolean>(true);
  const animFrameRef = useRef<number>(0);
  const debounceRef = useRef<number>(0);
  const stateRef = useRef<InternalState>(createDefaultState());
  const onPreviewRef = useRef(onPreview);
  const clearPreviewRef = useRef(clearPreview);

  const [state, setState] = useState<InternalState>(createDefaultState);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [kernelKey, setKernelKey] = useState(0);

  useEffect(() => {
    onPreviewRef.current = onPreview;
    clearPreviewRef.current = clearPreview;
    stateRef.current = state;
  });

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
      setKernelKey(k => k + 1);
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
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      animFrameRef.current = requestAnimationFrame(() => {
        if (previewRef.current) {
          onPreviewRef.current({
            kernel: state.kernel,
            edgeHandling: state.edgeHandling,
            channels: state.channels,
          });
        }
      });
    }, 150);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      clearTimeout(debounceRef.current);
    };
  }, [state, previewEnabled]);

  useEffect(() => {
    previewRef.current = previewEnabled;
    if (!previewEnabled) {
      clearPreview();
    }
  }, [previewEnabled, clearPreview]);

  const updateKernel = useCallback((row: number, col: number, value: number) => {
    setState(prev => {
      const newKernel = cloneKernel(prev.kernel);
      newKernel[row][col] = value;

      let newPreset = -1;
      for (let i = 0; i < CONVOLUTION_PRESETS.length; i++) {
        if (kernelsEqual(CONVOLUTION_PRESETS[i].kernel, newKernel)) {
          newPreset = i;
          break;
        }
      }

      return { ...prev, kernel: newKernel, presetIndex: newPreset };
    });
  }, []);

  const handlePresetChange = useCallback((index: number) => {
    if (index < 0 || index >= CONVOLUTION_PRESETS.length) return;
    setKernelKey(k => k + 1);
    setState(prev => ({
      ...prev,
      presetIndex: index,
      kernel: cloneKernel(CONVOLUTION_PRESETS[index].kernel),
    }));
  }, []);

  const toggleChannel = useCallback((ch: 'r' | 'g' | 'b' | 'a') => {
    setState(prev => {
      const set = new Set(prev.channels);
      if (set.has(ch)) {
        set.delete(ch);
      } else {
        set.add(ch);
      }
      const arr = CHANNELS_ALL.filter(c => set.has(c));
      return { ...prev, channels: arr.length > 0 ? arr : prev.channels };
    });
  }, []);

  const setAllChannels = useCallback(() => {
    setState(prev => ({ ...prev, channels: [...CHANNELS_ALL] }));
  }, []);

  const setEdgeHandling = useCallback((eh: EdgeHandling) => {
    setState(prev => ({ ...prev, edgeHandling: eh }));
  }, []);

  const handleReset = useCallback(() => {
    setKernelKey(k => k + 1);
    setState(createDefaultState());
    onReset();
  }, [onReset]);

  const handleCancel = useCallback(() => {
    clearPreview();
    onCancel();
  }, [clearPreview, onCancel]);

  const handleApply = useCallback(() => {
    onApply({
      kernel: state.kernel,
      edgeHandling: state.edgeHandling,
      channels: state.channels,
    });
  }, [state, onApply]);

  const togglePreview = useCallback(() => {
    setPreviewEnabled(prev => !prev);
  }, []);

  if (!open) return null;

  const chR = state.channels.includes('r');
  const chG = state.channels.includes('g');
  const chB = state.channels.includes('b');
  const chA = state.channels.includes('a');
  const allSelected = chR && chG && chB && chA;

  return (
    <dialog ref={dialogRef} className="conv-dialog">
      <div className="conv-dialog-content">
        <div className="conv-header">
          <h2>Фильтр (Custom)</h2>
        </div>

        <div className="conv-preset-row">
          <label className="conv-label">Предустановка:</label>
          <select
            className="conv-select"
            value={state.presetIndex}
            onChange={e => handlePresetChange(Number(e.target.value))}
          >
            {CONVOLUTION_PRESETS.map((p, i) => (
              <option key={i} value={i}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="conv-kernel-section">
          <label className="conv-label">Ядро свертки:</label>
          <div className="conv-kernel-grid">
            {[0, 1, 2].map(row => (
              [0, 1, 2].map(col => {
                const kIdx = row * 3 + col;
                return (
                  <input
                    key={`k${kIdx}_${kernelKey}`}
                    type="number"
                    className="conv-kernel-input"
                    defaultValue={state.kernel[row][col]}
                    onChange={e => {
                      const raw = e.target.value;
                      if (raw === '' || raw === '-') return;
                      const num = e.target.valueAsNumber;
                      if (!isNaN(num)) updateKernel(row, col, num);
                    }}
                  />
                );
              })
            ))}
          </div>
        </div>

        <div className="conv-channels-section">
          <span className="conv-label">Каналы:</span>
          <div className="conv-channels-row">
            <label className="conv-checkbox">
              <input type="checkbox" checked={chR} onChange={() => toggleChannel('r')} />
              R
            </label>
            <label className="conv-checkbox">
              <input type="checkbox" checked={chG} onChange={() => toggleChannel('g')} />
              G
            </label>
            <label className="conv-checkbox">
              <input type="checkbox" checked={chB} onChange={() => toggleChannel('b')} />
              B
            </label>
            <label className="conv-checkbox">
              <input type="checkbox" checked={chA} onChange={() => toggleChannel('a')} />
              A
            </label>
            <label className="conv-checkbox conv-checkbox-all">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={setAllChannels}
              />
              Все
            </label>
          </div>
        </div>

        <div className="conv-edge-row">
          <label className="conv-label">Обработка краёв:</label>
          <select
            className="conv-select"
            value={state.edgeHandling}
            onChange={e => setEdgeHandling(e.target.value as EdgeHandling)}
          >
            {EDGE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="conv-options">
          <label className="conv-checkbox">
            <input
              type="checkbox"
              checked={previewEnabled}
              onChange={togglePreview}
            />
            Предпросмотр
          </label>
        </div>

        <div className="conv-actions">
          <button className="conv-btn" onClick={handleReset}>Сброс</button>
          <button className="conv-btn" onClick={handleCancel}>Отмена</button>
          <button className="conv-btn conv-btn-primary" onClick={handleApply}>Применить</button>
        </div>
      </div>
    </dialog>
  );
}
