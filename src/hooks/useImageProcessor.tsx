import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { decodeGB7ToImageData, encodeImageDataToGB7, downloadGB7, type ImageMeta } from '../core';

export function useImageProcessor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalDataRef = useRef<ImageData | null>(null);
  const [meta, setMeta] = useState<ImageMeta>({
    width: 0,
    height: 0,
    colorDepth: '—',
    format: null,
    fileName: '—',
    channels: 0
  });
  const [status, setStatus] = useState<string>('Готово к работе');
  const [originalData, setOriginalData] = useState<ImageData | null>(null);
  const [channelStates, setChannelStates] = useState<boolean[]>([]);
  const [channels, setChannels] = useState(0);

  const renderWithChannels = useCallback((states: boolean[], chCount: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const original = originalDataRef.current;
    if (!canvas || !ctx || !original) return;

    const hasAlpha = chCount === 2 || chCount === 4;
    const allOn = chCount > 0 && states.length === chCount && states.every(s => s);

    if (allOn) {
      ctx.putImageData(original, 0, 0);
      return;
    }

    const data = new Uint8ClampedArray(original.data);
    const modified = new ImageData(data, original.width, original.height);
    const d = modified.data;

    for (let i = 0; i < d.length; i += 4) {
      if (chCount <= 2) {
        if (!states[0]) {
          d[i] = 0;
          d[i + 1] = 0;
          d[i + 2] = 0;
        }
        if (hasAlpha && !states[1]) {
          d[i + 3] = 255;
        }
        if (chCount === 2 && !states[0] && states[1]) {
          const a = d[i + 3];
          d[i] = d[i + 1] = d[i + 2] = a;
          d[i + 3] = 255;
        }
      } else {
        if (!states[0]) d[i] = 0;
        if (!states[1]) d[i + 1] = 0;
        if (!states[2]) d[i + 2] = 0;
        if (hasAlpha && !states[3]) d[i + 3] = 255;

        if (chCount === 4 && !states[0] && !states[1] && !states[2] && states[3]) {
          const a = d[i + 3];
          d[i] = d[i + 1] = d[i + 2] = a;
          d[i + 3] = 255;
        }
      }
    }

    ctx.putImageData(modified, 0, 0);
  }, []);

  useLayoutEffect(() => {
    if (!originalDataRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.width !== originalDataRef.current.width ||
        canvas.height !== originalDataRef.current.height) {
      return;
    }

    renderWithChannels(channelStates, channels);
  }, [meta.width, meta.height, channelStates, channels, renderWithChannels]);

  useEffect(() => {
    if (!originalDataRef.current) return;
    renderWithChannels(channelStates, channels);
  }, [channelStates, channels, renderWithChannels]);

  const toggleChannel = useCallback((index: number) => {
    setChannelStates(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus(`Загрузка: ${file.name}...`);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let originalColorDepth = '—';
      let detectedChannels = 0;

      if (ext === 'jpg' || ext === 'jpeg') {
        originalColorDepth = 'RGB 24-bit';
        detectedChannels = 3;
      } else if (ext === 'png') {
        const header = await file.slice(0, 32).arrayBuffer();
        const bytes = new Uint8Array(header);
        const colorType = bytes[25];
        const bitDepth = bytes[24];

        if (colorType === 0) {
          originalColorDepth = `Grayscale ${bitDepth}-bit`;
          detectedChannels = 1;
        } else if (colorType === 2) {
          originalColorDepth = `RGB ${bitDepth * 3}-bit`;
          detectedChannels = 3;
        } else if (colorType === 3) {
          originalColorDepth = `Indexed ${bitDepth}-bit`;
          detectedChannels = 3;
        } else if (colorType === 4) {
          originalColorDepth = `Grayscale ${bitDepth}-bit + Alpha`;
          detectedChannels = 2;
        } else if (colorType === 6) {
          originalColorDepth = `RGBA ${bitDepth * 4}-bit`;
          detectedChannels = 4;
        } else {
          originalColorDepth = `${bitDepth}-bit (type ${colorType})`;
          detectedChannels = 4;
        }
      } else if (ext === 'gb7') {
        const header = await file.slice(0, 6).arrayBuffer();
        const flags = new Uint8Array(header)[5];
        const hasMask = (flags & 0x01) === 1;
        originalColorDepth = `Grayscale 7-bit${hasMask ? ' + mask' : ''}`;
        detectedChannels = hasMask ? 2 : 1;
      }

      if (ext === 'gb7') {
        const arrayBuffer = await file.arrayBuffer();
        const imageData = decodeGB7ToImageData(arrayBuffer);

        const imgData = new ImageData(
          new Uint8ClampedArray(imageData.data),
          imageData.width,
          imageData.height
        );
        originalDataRef.current = imgData;
        setOriginalData(imgData);

        setMeta({
          width: imageData.width,
          height: imageData.height,
          colorDepth: originalColorDepth,
          format: 'gb7',
          fileName: file.name,
          channels: detectedChannels
        });
        setChannels(detectedChannels);
        setChannelStates(Array(detectedChannels).fill(true));
        setStatus('GB7 изображение загружено');
      } else {
        const img = new Image();
        const url = URL.createObjectURL(file);

        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = () => rej(new Error('Ошибка загрузки'));
          img.src = url;
        });

        const offscreen = document.createElement('canvas');
        offscreen.width = img.naturalWidth;
        offscreen.height = img.naturalHeight;
        const offCtx = offscreen.getContext('2d');
        if (offCtx) {
          offCtx.drawImage(img, 0, 0);
        }
        URL.revokeObjectURL(url);

        const imageData = offCtx!.getImageData(0, 0, offscreen.width, offscreen.height);
        originalDataRef.current = imageData;
        setOriginalData(imageData);

        setMeta({
          width: img.naturalWidth,
          height: img.naturalHeight,
          colorDepth: originalColorDepth,
          format: ext === 'jpg' || ext === 'jpeg' ? 'jpg' : 'png',
          fileName: file.name,
          channels: detectedChannels
        });
        setChannels(detectedChannels);
        setChannelStates(Array(detectedChannels).fill(true));
        setStatus('Изображение загружено');
      }
    } catch (err) {
      setStatus(`Ошибка: ${err instanceof Error ? err.message : 'Неизвестно'}`);
      setMeta({ width: 0, height: 0, colorDepth: '—', format: null, fileName: '—', channels: 0 });
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
      const cleanName = meta.fileName.replace(/\.(png|jpe?g|gb7)$/i, '');

      if (fmt === 'gb7') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const gb7Buffer = encodeImageDataToGB7(imageData, { useMask: true, threshold: 128 });

        const outputName = `${cleanName}.gb7`;
        downloadGB7(gb7Buffer, outputName);
        setStatus(`GB7 файл сохранён: ${outputName}`);

      } else if (fmt === 'jpg') {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const link = document.createElement('a');

        link.download = `${cleanName}.jpg`;
        link.href = dataUrl;
        link.click();
        setStatus('JPG файл сохранён');

      } else {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');

        link.download = `${cleanName}.png`;
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
    handleDownload,
    originalData,
    channelStates,
    toggleChannel,
    channels,
  };
}
