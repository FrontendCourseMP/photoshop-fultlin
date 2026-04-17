// src/App.tsx
import { useState } from 'react';
import { useImageProcessor } from './hooks/useImageProcessor';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { CanvasArea } from './components/CanvasArea';
import { StatusBar } from './components/StatusBar';
import './styles/global.less';

function App() {
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const { 
    canvasRef, 
    meta, 
    status, 
    handleFileChange, 
    handleDownload 
  } = useImageProcessor();

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
        <Sidebar />
        <CanvasArea ref={canvasRef} />
      </div>

      <StatusBar status={status} />
    </div>
  );
}

export default App;