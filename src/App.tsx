import { useState, useCallback, useEffect } from 'react';
import { useImageProcessor } from './hooks/useImageProcessor';
import { TopBar } from './components/TopBar';
import { ToolPanel } from './components/ToolPanel';
import { Sidebar } from './components/Sidebar';
import { CanvasArea } from './components/CanvasArea';
import { StatusBar } from './components/StatusBar';
import { EyedropperPopup } from './components/Eyedropper';
import { LevelsDialog } from './components/LevelsDialog';
import { ScaleDialog } from './components/ScaleDialog';
import { ConvolutionDialog } from './components/ConvolutionDialog';
import { rgbToLab } from './core/color';
import type { EyedropperInfo } from './core/types';
import type { LevelsChannelState } from './core/levels';
import type { ConvolutionParams } from './core/convolution';

import './styles/global.less';

function App() {
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [scaleOpen, setScaleOpen] = useState(false);
  const [convolutionOpen, setConvolutionOpen] = useState(false);
  const {
    canvasRef,
    meta,
    status,
    handleFileChange,
    handleDownload,
    getSourceImageData,
    getProcessedSourceImageData,
    channelStates,
    toggleChannel,
    channels,
    onLevelsPreview,
    clearLevelsPreview,
    applyLevels,
    resetLevels,
    onConvolutionPreview,
    clearConvolutionPreview,
    applyConvolutionFilter,
    resetConvolution,
    displayScale,
    displayWidth,
    displayHeight,
    setDisplayScale,
    interpolationMethod,
    resizeImage,
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
    const data = getProcessedSourceImageData();
    if (!data) return;

    const idx = (py * data.width + px) * 4;
    const r = data.data[idx];
    const g = data.data[idx + 1];
    const b = data.data[idx + 2];
    const lab = rgbToLab(r, g, b);

    setEyedropperInfo({ x: px, y: py, r, g, b, L: lab.L, a: lab.a, labB: lab.b });
    setEyedropperPos({ x: e.clientX, y: e.clientY });
  }, [getProcessedSourceImageData]);

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

  const handleLevelsReset = useCallback(() => {
    resetLevels();
  }, [resetLevels]);

  const handleLevelsCancel = useCallback(() => {
    clearLevelsPreview();
    setLevelsOpen(false);
  }, [clearLevelsPreview]);

  const handleOpenScale = useCallback(() => {
    setScaleOpen(true);
  }, []);

  const handleScaleApply = useCallback((width: number, height: number, method: import('./core/interpolation').InterpolationMethod) => {
    resizeImage(width, height, method);
    setScaleOpen(false);
  }, [resizeImage]);

  const handleScaleCancel = useCallback(() => {
    setScaleOpen(false);
  }, []);

  const handleOpenConvolution = useCallback(() => {
    setConvolutionOpen(true);
  }, []);

  const handleConvolutionApply = useCallback((params: ConvolutionParams) => {
    applyConvolutionFilter(params);
    setConvolutionOpen(false);
  }, [applyConvolutionFilter]);

  const handleConvolutionReset = useCallback(() => {
    resetConvolution();
  }, [resetConvolution]);

  const handleConvolutionCancel = useCallback(() => {
    clearConvolutionPreview();
    setConvolutionOpen(false);
  }, [clearConvolutionPreview]);

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
        displayScale={displayScale}
        onDisplayScaleChange={setDisplayScale}
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
          onOpenScale={handleOpenScale}
          onOpenConvolution={handleOpenConvolution}
        />
        <CanvasArea
          ref={canvasRef}
          displayWidth={displayWidth}
          displayHeight={displayHeight}
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
          onReset={handleLevelsReset}
        />
      )}

      {scaleOpen && (
        <ScaleDialog
          open={scaleOpen}
          sourceWidth={meta.width}
          sourceHeight={meta.height}
          interpolationMethod={interpolationMethod}
          onApply={handleScaleApply}
          onCancel={handleScaleCancel}
        />
      )}

      {convolutionOpen && (
        <ConvolutionDialog
          open={convolutionOpen}
          onPreview={onConvolutionPreview}
          onApply={handleConvolutionApply}
          onCancel={handleConvolutionCancel}
          clearPreview={clearConvolutionPreview}
          onReset={handleConvolutionReset}
        />
      )}
    </div>
  );
}

export default App;
