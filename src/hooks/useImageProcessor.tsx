import { useRef, useState, useCallback} from 'react';
import { decodeGB7ToImageData, encodeImageDataToGB7, downloadGB7, type ImageMeta } from '../core';

export function useImageProcessor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [meta, setMeta] = useState<ImageMeta>({ 
    width: 0, 
    height: 0, 
    colorDepth: '—', 
    format: null, 
    fileName: '—' 
  });
  const [status, setStatus] = useState<string>('Готово к работе');

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    setStatus(`Загрузка: ${file.name}...`);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let originalColorDepth = '—';
      
      if (ext === 'jpg' || ext === 'jpeg') {
        originalColorDepth = 'RGB 24-bit';
        
      } else if (ext === 'png') {
        const header = await file.slice(0, 32).arrayBuffer();
        const bytes = new Uint8Array(header);
        
        const colorType = bytes[25];
        const bitDepth = bytes[24];
        
        // Color Type: 0=Gray, 2=RGB, 3=Indexed, 4=Gray+Alpha, 6=RGBA
        if (colorType === 0) originalColorDepth = `Grayscale ${bitDepth}-bit`;
        else if (colorType === 2) originalColorDepth = `RGB ${bitDepth * 3}-bit`;
        else if (colorType === 3) originalColorDepth = `Indexed ${bitDepth}-bit`;
        else if (colorType === 4) originalColorDepth = `Grayscale ${bitDepth}-bit + Alpha`;
        else if (colorType === 6) originalColorDepth = `RGBA ${bitDepth * 4}-bit`;
        else originalColorDepth = `${bitDepth}-bit (type ${colorType})`;
        
      } else if (ext === 'gb7') {
        // Читаем флаг маски из заголовка GB7 (смещение 5)
        const header = await file.slice(0, 6).arrayBuffer();
        const flags = new Uint8Array(header)[5];
        const hasMask = (flags & 0x01) === 1;
        originalColorDepth = `Grayscale 7-bit${hasMask ? ' + mask' : ''}`;
      }
      
      if (ext === 'gb7') {
        const arrayBuffer = await file.arrayBuffer();
        const imageData = decodeGB7ToImageData(arrayBuffer);
        
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        
        const imgData = ctx.createImageData(imageData.width, imageData.height);
        imgData.data.set(imageData.data);
        ctx.putImageData(imgData, 0, 0);

        setMeta({
          width: imageData.width,
          height: imageData.height,
          colorDepth: originalColorDepth,
          format: 'gb7',
          fileName: file.name
        });
        setStatus('GB7 изображение загружено');
      } else {
        const img = new Image();
        const url = URL.createObjectURL(file);
        
        await new Promise((res, rej) => { 
          img.onload = res; 
          img.onerror = () => rej(new Error('Ошибка загрузки')); 
          img.src = url; 
        });

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        setMeta({
          width: img.naturalWidth,
          height: img.naturalHeight,
          colorDepth: originalColorDepth,  
          format: ext === 'jpg' || ext === 'jpeg' ? 'jpg' : 'png',
          fileName: file.name
        });
        setStatus('Изображение загружено');
      }
    } catch (err) {
      setStatus(`Ошибка: ${err instanceof Error ? err.message : 'Неизвестно'}`);
      setMeta({ width: 0, height: 0, colorDepth: '—', format: null, fileName: '—' });
    } finally {
      e.target.value = '';
    }
  }, []);

  const handleDownload = useCallback((fmt: 'png' | 'jpg' | 'gb7') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setStatus(`Сохранение в ${fmt.toUpperCase()}...`);

    try {
      if (fmt === 'gb7') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const gb7Buffer = encodeImageDataToGB7(imageData, { useMask: true, threshold: 128 });
        const outputName = meta.fileName.replace(/\.(png|jpg|jpeg)$/i, '') + '.gb7';
        downloadGB7(gb7Buffer, outputName);
        setStatus(`GB7 файл сохранён: ${outputName}`);
      } else if (fmt === 'jpg') {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const link = document.createElement('a');
        link.download = meta.fileName.replace(/\.(png|gb7)$/i, '') + '.jpg';
        link.href = dataUrl;
        link.click();
        setStatus('JPG файл сохранён');
      } else {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = meta.fileName.replace(/\.(jpg|gb7)$/i, '') + '.png';
        link.href = dataUrl;
        link.click();
        setStatus('PNG файл сохранён');
      }
    } catch (err) {
      setStatus(`Ошибка сохранения: ${err instanceof Error ? err.message : 'Неизвестно'}`);
    }
  }, [meta.fileName]);

  return {
    canvasRef,
    meta,
    status,
    setStatus,
    handleFileChange,
    handleDownload
  };
}