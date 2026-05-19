import { useState, useCallback, useEffect } from 'react';
import { useImageProcessor } from './hooks/useImageProcessor';
import { TopBar } from './components/TopBar';
import { ToolPanel } from './components/ToolPanel';
import { Sidebar } from './components/Sidebar';
import { CanvasArea } from './components/CanvasArea';
import { StatusBar } from './components/StatusBar';
import { EyedropperPopup } from './components/Eyedropper';
import { LevelsDialog } from './components/LevelsDialog';
import { rgbToLab } from './core/color';
import type { EyedropperInfo } from './core/types';
import type { LevelsChannelState } from './core/levels';
import './styles/global.less';

function App() {
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const {
    canvasRef,
    meta,
    status,
    handleFileChange,
    handleDownload,
    getSourceImageData,
    channelStates,
    toggleChannel,
    channels,
    onLevelsPreview,
    clearLevelsPreview,
    applyLevels,
  } = useImageProcessor();

  const [eyedropperActive, setEyedropperActive] = useState(false);
  const [eyedropperInfo, setEyedropperInfo] = useState<EyedropperInfo | null>(null);
  const [eyedropperPos, setEyedropperPos] = useState({ x: 0, y: 0 });

  const handleToggleEyedropper = useCallback(() => {
    setEyedropperActive(prev => {
      if (prev) {
        setEyedropperInfo(null);
      }
      return !prev;
    });
  }, []);

  const handleEyedropperPick = useCallback((e: React.MouseEvent, px: number, py: number) => {
    const data = getSourceImageData();
    if (!data) return;

    const idx = (py * data.width + px) * 4;
    const r = data.data[idx];
    const g = data.data[idx + 1];
    const b = data.data[idx + 2];
    const lab = rgbToLab(r, g, b);

    setEyedropperInfo({ x: px, y: py, r, g, b, L: lab.L, a: lab.a, labB: lab.b });
    setEyedropperPos({ x: e.clientX, y: e.clientY });
  }, [getSourceImageData]);

  const closeEyedropper = useCallback(() => {
    setEyedropperInfo(null);
    setEyedropperActive(false);
  }, []);

  const handleOpenLevels = useCallback(() => {
    setEyedropperActive(false);
    setLevelsOpen(true);
  }, []);

  const handleLevelsApply = useCallback((state: LevelsChannelState) => {
    applyLevels(state);
    setLevelsOpen(false);
  }, [applyLevels]);

  const handleLevelsCancel = useCallback(() => {
    clearLevelsPreview();
    setLevelsOpen(false);
  }, [clearLevelsPreview]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (eyedropperInfo) {
          setEyedropperInfo(null);
        }
        if (eyedropperActive) {
          setEyedropperActive(false);
        }
      }
      if (e.key === 'i' || e.key === 'I') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          setEyedropperActive(prev => {
            if (prev) setEyedropperInfo(null);
            return !prev;
          });
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [eyedropperActive, eyedropperInfo]);

  return (
    <div className="app-container">
      <TopBar
        meta={meta}
        onFileChange={handleFileChange}
        onDownload={handleDownload}
        downloadMenuOpen={downloadMenuOpen}
        onToggleMenu={() => setDownloadMenuOpen(!downloadMenuOpen)}
      />

      <div className="app-body">
        <Sidebar
          getSourceImageData={getSourceImageData}
          channels={channels}
          channelStates={channelStates}
          onToggleChannel={toggleChannel}
        />
        <ToolPanel
          onFileChange={handleFileChange}
          eyedropperActive={eyedropperActive}
          onToggleEyedropper={handleToggleEyedropper}
          onOpenLevels={handleOpenLevels}
        />
        <CanvasArea
          ref={canvasRef}
          width={meta.width}
          height={meta.height}
          eyedropperActive={eyedropperActive}
          onEyedropperPick={handleEyedropperPick}
        />
      </div>

      <StatusBar status={status} />

      {eyedropperInfo && (
        <EyedropperPopup
          info={eyedropperInfo}
          position={eyedropperPos}
          onClose={closeEyedropper}
        />
      )}

      {levelsOpen && (
        <LevelsDialog
          open={levelsOpen}
          getSourceImageData={getSourceImageData}
          channels={channels}
          onPreview={onLevelsPreview}
          onApply={handleLevelsApply}
          onCancel={handleLevelsCancel}
          clearPreview={clearLevelsPreview}
        />
      )}
    </div>
  );
}

export default App;
