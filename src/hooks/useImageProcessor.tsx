import { useRef, useState, useCallback, useEffect } from 'react';
import { decodeGB7ToImageData, encodeImageDataToGB7, downloadGB7, type ImageMeta, type LevelsChannelState } from '../core';

export function useImageProcessor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [meta, setMeta] = useState<ImageMeta>({
    width: 0,
    height: 0,
    colorDepth: '—',
    format: null,
    fileName: '—',
    channels: 0
  });
  const [status, setStatus] = useState<string>('Готово к работе');
  const [channelStates, setChannelStates] = useState<boolean[]>([]);
  const [channels, setChannels] = useState(0);
  const previewLevelsRef = useRef<LevelsChannelState | null>(null);
  const workBufferRef = useRef<Uint8ClampedArray<ArrayBuffer> | null>(null);
  const workImageDataRef = useRef<ImageData | null>(null);

  function getWorkImageData(width: number, height: number): ImageData {
    const size = width * height * 4;
    let buf = workBufferRef.current;
    if (!buf || buf.length !== size) {
      buf = new Uint8ClampedArray(size);
      workBufferRef.current = buf;
      workImageDataRef.current = new ImageData(buf, width, height);
    } else if (workImageDataRef.current?.width !== width || workImageDataRef.current?.height !== height) {
      workImageDataRef.current = new ImageData(buf, width, height);
    }
    return workImageDataRef.current!;
  }

  function applyChannels(pixels: Uint8ClampedArray, states: boolean[], chCount: number, hasAlpha: boolean): void {
    for (let i = 0; i < pixels.length; i += 4) {
      if (chCount <= 2) {
        if (!states[0]) {
          pixels[i] = 0;
          pixels[i + 1] = 0;
          pixels[i + 2] = 0;
        }
        if (hasAlpha && !states[1]) {
          pixels[i + 3] = 255;
        }
        if (chCount === 2 && !states[0] && states[1]) {
          const a = pixels[i + 3];
          pixels[i] = pixels[i + 1] = pixels[i + 2] = a;
          pixels[i + 3] = 255;
        }
      } else {
        if (!states[0]) pixels[i] = 0;
        if (!states[1]) pixels[i + 1] = 0;
        if (!states[2]) pixels[i + 2] = 0;
        if (hasAlpha && !states[3]) pixels[i + 3] = 255;

        if (chCount === 4 && !states[0] && !states[1] && !states[2] && states[3]) {
          const a = pixels[i + 3];
          pixels[i] = pixels[i + 1] = pixels[i + 2] = a;
          pixels[i + 3] = 255;
        }
      }
    }
  }

  function makeLevelsLUTs(lv: LevelsChannelState, chCount: number, hasAlpha: boolean): Record<string, Uint8Array> {
    const luts: Record<string, Uint8Array> = {};
    const keys = hasAlpha ? ['red', 'green', 'blue', 'alpha'] : ['red', 'green', 'blue'];
    if (chCount <= 2) {
      const p = lv.red;
      const lut = new Uint8Array(256);
      const range = p.whitePoint - p.blackPoint;
      if (range > 0) {
        for (let i = 0; i < 256; i++) {
          let t = (i - p.blackPoint) / range;
          t = Math.max(0, Math.min(1, t));
          lut[i] = Math.round(Math.pow(t, p.gamma) * 255);
        }
      }
      luts.red = luts.green = luts.blue = lut;
      if (hasAlpha) {
        const pa = lv.alpha;
        const luta = new Uint8Array(256);
        const rangeA = pa.whitePoint - pa.blackPoint;
        if (rangeA > 0) {
          for (let i = 0; i < 256; i++) {
            let t = (i - pa.blackPoint) / rangeA;
            t = Math.max(0, Math.min(1, t));
            luta[i] = Math.round(Math.pow(t, pa.gamma) * 255);
          }
        }
        luts.alpha = luta;
      }
    } else {
      keys.forEach(key => {
        const p = lv[key as keyof LevelsChannelState];
        const lut = new Uint8Array(256);
        const range = p.whitePoint - p.blackPoint;
        if (range > 0) {
          for (let i = 0; i < 256; i++) {
            let t = (i - p.blackPoint) / range;
            t = Math.max(0, Math.min(1, t));
            lut[i] = Math.round(Math.pow(t, p.gamma) * 255);
          }
        }
        luts[key] = lut;
      });
    }
    return luts;
  }

  function applyLUTs(pixels: Uint8ClampedArray, luts: Record<string, Uint8Array>, hasAlpha: boolean): void {
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = luts.red[pixels[i]];
      pixels[i + 1] = luts.green[pixels[i + 1]];
      pixels[i + 2] = luts.blue[pixels[i + 2]];
      if (hasAlpha && luts.alpha) {
        pixels[i + 3] = luts.alpha[pixels[i + 3]];
      }
    }
  }

  function getSourceImageData(): ImageData | null {
    const src = sourceCanvasRef.current;
    if (!src) return null;
    const ctx = src.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    return ctx.getImageData(0, 0, src.width, src.height);
  }

  const renderWithChannels = useCallback((states: boolean[], chCount: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const source = sourceCanvasRef.current;
    if (!canvas || !ctx || !source) return;

    const hasAlpha = chCount === 2 || chCount === 4;
    const allOn = chCount > 0 && states.length === chCount && states.every(s => s);
    const levelsActive = previewLevelsRef.current;

    if (allOn && !levelsActive) {
      ctx.drawImage(source, 0, 0);
      return;
    }

    const srcCtx = source.getContext('2d', { willReadFrequently: true });
    if (!srcCtx) return;
    const sourceData = srcCtx.getImageData(0, 0, source.width, source.height);
    const imgData = getWorkImageData(source.width, source.height);
    imgData.data.set(sourceData.data);

    if (!allOn) {
      applyChannels(imgData.data, states, chCount, hasAlpha);
    }

    if (levelsActive) {
      const luts = makeLevelsLUTs(levelsActive, chCount, hasAlpha);
      applyLUTs(imgData.data, luts, hasAlpha);
    }

    ctx.putImageData(imgData, 0, 0);
  }, []);

  useEffect(() => {
    if (!sourceCanvasRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderWithChannels(channelStates, channels);
  }, [channelStates, channels, renderWithChannels, meta.width, meta.height]);

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

      let w = 0, h = 0;
      const srcCanvas = document.createElement('canvas');
      const srcCtx = srcCanvas.getContext('2d')!;

      if (ext === 'gb7') {
        const arrayBuffer = await file.arrayBuffer();
        const imageData = decodeGB7ToImageData(arrayBuffer);
        w = imageData.width;
        h = imageData.height;
        srcCanvas.width = w;
        srcCanvas.height = h;
        const imgData = new ImageData(
          new Uint8ClampedArray(imageData.data),
          w, h
        );
        srcCtx.putImageData(imgData, 0, 0);
      } else {
        const img = new Image();
        const url = URL.createObjectURL(file);

        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error('Ошибка загрузки'));
          img.src = url;
        });

        w = img.naturalWidth;
        h = img.naturalHeight;
        srcCanvas.width = w;
        srcCanvas.height = h;
        srcCtx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
      }

      sourceCanvasRef.current = srcCanvas;

      setMeta({
        width: w,
        height: h,
        colorDepth: originalColorDepth,
        format: ext === 'jpg' || ext === 'jpeg' ? 'jpg' : ext === 'gb7' ? 'gb7' : 'png',
        fileName: file.name,
        channels: detectedChannels
      });
      setChannels(detectedChannels);
      setChannelStates(Array(detectedChannels).fill(true));
      setStatus('Изображение загружено');
    } catch (err) {
      setStatus(`Ошибка: ${err instanceof Error ? err.message : 'Неизвестно'}`);
      setMeta({ width: 0, height: 0, colorDepth: '—', format: null, fileName: '—', channels: 0 });
    } finally {
      e.target.value = '';
    }
  }, []);

  const onLevelsPreview = useCallback((state: LevelsChannelState) => {
    previewLevelsRef.current = { ...state };
    renderWithChannels(channelStates, channels);
  }, [channelStates, channels, renderWithChannels]);

  const clearLevelsPreview = useCallback(() => {
    previewLevelsRef.current = null;
    renderWithChannels(channelStates, channels);
  }, [channelStates, channels, renderWithChannels]);

  const applyLevels = useCallback((state: LevelsChannelState) => {
    const source = sourceCanvasRef.current;
    if (!source) return;

    previewLevelsRef.current = null;

    const hasAlpha = channels === 2 || channels === 4;
    const srcCtx = source.getContext('2d', { willReadFrequently: true });
    if (!srcCtx) return;

    const sourceData = srcCtx.getImageData(0, 0, source.width, source.height);
    const imgData = getWorkImageData(source.width, source.height);
    imgData.data.set(sourceData.data);

    const luts = makeLevelsLUTs(state, channels, hasAlpha);
    applyLUTs(imgData.data, luts, hasAlpha);

    srcCtx.putImageData(imgData, 0, 0);
    renderWithChannels(channelStates, channels);
  }, [channels, channelStates, renderWithChannels]);

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
    getSourceImageData,
    channelStates,
    toggleChannel,
    channels,
    onLevelsPreview,
    clearLevelsPreview,
    applyLevels,
  };
}
