import { useRef, useState, useCallback, useEffect } from 'react';
import { decodeGB7ToImageData, encodeImageDataToGB7, downloadGB7, type ImageMeta, type LevelsChannelState } from '../core';
import { InterpolationMethod, scaleImageData } from '../core/interpolation';

const MIN_SCALE = 0.12;
const MAX_SCALE = 3.0;
const CANVAS_PADDING = 50;

function makeImageData(data: Uint8ClampedArray, width: number, height: number): ImageData {
  return new (ImageData as unknown as new (data: Uint8ClampedArray, sw: number, sh: number) => ImageData)(data, width, height);
}

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
  const committedLevelsRef = useRef<LevelsChannelState | null>(null);
  const workBufferRef = useRef<Uint8ClampedArray | null>(null);
  const workImageDataRef = useRef<ImageData | null>(null);

  const [displayScale, setDisplayScaleState] = useState<number>(1);
  const [interpolationMethod, setInterpolationMethodState] = useState<InterpolationMethod>(InterpolationMethod.Bilinear);

  const displayWidth = Math.round(meta.width * displayScale);
  const displayHeight = Math.round(meta.height * displayScale);

  function getWorkImageData(width: number, height: number): ImageData {
    const size = width * height * 4;
    let buf = workBufferRef.current;
    if (!buf || buf.length !== size) {
      buf = new Uint8ClampedArray(size);
      workBufferRef.current = buf;
      workImageDataRef.current = makeImageData(buf, width, height);
    } else if (workImageDataRef.current?.width !== width || workImageDataRef.current?.height !== height) {
      workImageDataRef.current = makeImageData(buf, width, height);
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

  function getProcessedSourceImageData(): ImageData | null {
    const source = sourceCanvasRef.current;
    if (!source) return null;
    const srcCtx = source.getContext('2d', { willReadFrequently: true });
    if (!srcCtx) return null;

    const hasAlpha = channels === 2 || channels === 4;
    const allOn = channels > 0 && channelStates.length === channels && channelStates.every(s => s);
    const hasLevels = previewLevelsRef.current || committedLevelsRef.current;
    const sourceData = srcCtx.getImageData(0, 0, source.width, source.height);

    if (allOn && !hasLevels) {
      return sourceData;
    }

    const imgData = getWorkImageData(source.width, source.height);
    imgData.data.set(sourceData.data);

    if (!allOn) {
      applyChannels(imgData.data, channelStates, channels, hasAlpha);
    }

    if (committedLevelsRef.current) {
      const luts = makeLevelsLUTs(committedLevelsRef.current, channels, hasAlpha);
      applyLUTs(imgData.data, luts, hasAlpha);
    }

    if (previewLevelsRef.current) {
      const luts = makeLevelsLUTs(previewLevelsRef.current, channels, hasAlpha);
      applyLUTs(imgData.data, luts, hasAlpha);
    }

    return imgData;
  }

  const renderWithChannels = useCallback((states: boolean[], chCount: number, scale: number, interp: InterpolationMethod) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const source = sourceCanvasRef.current;
    if (!canvas || !ctx || !source) return;

    const srcW = source.width;
    const srcH = source.height;
    const dstW = Math.round(srcW * scale);
    const dstH = Math.round(srcH * scale);

    if (dstW <= 0 || dstH <= 0) return;

    if (canvas.width !== dstW || canvas.height !== dstH) {
      canvas.width = dstW;
      canvas.height = dstH;
    }

    const hasAlpha = chCount === 2 || chCount === 4;
    const allOn = chCount > 0 && states.length === chCount && states.every(s => s);
    const hasLevels = previewLevelsRef.current || committedLevelsRef.current;

    if (scale === 1 && allOn && !hasLevels) {
      ctx.drawImage(source, 0, 0);
      return;
    }

    const srcCtx = source.getContext('2d', { willReadFrequently: true });
    if (!srcCtx) return;
    const sourceData = srcCtx.getImageData(0, 0, srcW, srcH);

    let processForInterp: ImageData;

    if (allOn && !hasLevels) {
      processForInterp = sourceData;
    } else {
      const imgData = getWorkImageData(srcW, srcH);
      imgData.data.set(sourceData.data);

      if (!allOn) {
        applyChannels(imgData.data, states, chCount, hasAlpha);
      }

      if (committedLevelsRef.current) {
        const luts = makeLevelsLUTs(committedLevelsRef.current, chCount, hasAlpha);
        applyLUTs(imgData.data, luts, hasAlpha);
      }

      if (previewLevelsRef.current) {
        const luts = makeLevelsLUTs(previewLevelsRef.current, chCount, hasAlpha);
        applyLUTs(imgData.data, luts, hasAlpha);
      }

      processForInterp = imgData;
    }

    const scaled = scaleImageData(processForInterp, dstW, dstH, interp);
    ctx.putImageData(scaled, 0, 0);
  }, []);

  useEffect(() => {
    if (!sourceCanvasRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderWithChannels(channelStates, channels, displayScale, interpolationMethod);
  }, [channelStates, channels, renderWithChannels, meta.width, meta.height, displayScale, interpolationMethod]);

  function getDisplayCanvasSize(srcW: number, srcH: number, containerW: number, containerH: number): number {
    const maxW = containerW - CANVAS_PADDING * 2;
    const maxH = containerH - CANVAS_PADDING * 2;
    if (maxW <= 0 || maxH <= 0 || srcW <= 0 || srcH <= 0) return 1;

    const scaleX = maxW / srcW;
    const scaleY = maxH / srcH;
    const fitScale = Math.min(scaleX, scaleY);
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, fitScale));
  }

  function calcFitScale(srcW: number, srcH: number): number {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return 1;
    const parent = canvas.parentElement;
    const container = parent.parentElement;
    if (!container) return 1;
    const contW = container.clientWidth;
    const contH = container.clientHeight;
    return getDisplayCanvasSize(srcW, srcH, contW, contH);
  }

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
        const imgData = makeImageData(
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

      requestAnimationFrame(() => {
        const fitScale = calcFitScale(w, h);
        setDisplayScaleState(fitScale);
      });
    } catch (err) {
      setStatus(`Ошибка: ${err instanceof Error ? err.message : 'Неизвестно'}`);
      setMeta({ width: 0, height: 0, colorDepth: '—', format: null, fileName: '—', channels: 0 });
    } finally {
      e.target.value = '';
    }
  }, []);

  const setDisplayScale = useCallback((scale: number) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    setDisplayScaleState(clamped);
  }, []);

  const setInterpolationMethod = useCallback((method: InterpolationMethod) => {
    setInterpolationMethodState(method);
  }, []);

  const onLevelsPreview = useCallback((state: LevelsChannelState) => {
    previewLevelsRef.current = { ...state };
    renderWithChannels(channelStates, channels, displayScale, interpolationMethod);
  }, [channelStates, channels, renderWithChannels, displayScale, interpolationMethod]);

  const clearLevelsPreview = useCallback(() => {
    previewLevelsRef.current = null;
    renderWithChannels(channelStates, channels, displayScale, interpolationMethod);
  }, [channelStates, channels, renderWithChannels, displayScale, interpolationMethod]);

  const applyLevels = useCallback((state: LevelsChannelState) => {
    previewLevelsRef.current = null;
    committedLevelsRef.current = state;
    renderWithChannels(channelStates, channels, displayScale, interpolationMethod);
  }, [channelStates, channels, renderWithChannels, displayScale, interpolationMethod]);

  const resetLevels = useCallback(() => {
    committedLevelsRef.current = null;
    previewLevelsRef.current = null;
    renderWithChannels(channelStates, channels, displayScale, interpolationMethod);
  }, [channelStates, channels, renderWithChannels, displayScale, interpolationMethod]);

  const resizeImage = useCallback((newWidth: number, newHeight: number, method: InterpolationMethod) => {
    const source = sourceCanvasRef.current;
    if (!source) return;
    if (newWidth <= 0 || newHeight <= 0) return;

    const srcCtx = source.getContext('2d', { willReadFrequently: true });
    if (!srcCtx) return;

    const sourceData = srcCtx.getImageData(0, 0, source.width, source.height);
    const scaledData = scaleImageData(sourceData, newWidth, newHeight, method);

    source.width = newWidth;
    source.height = newHeight;
    const dstCtx = source.getContext('2d')!;
    dstCtx.putImageData(scaledData, 0, 0);

    setMeta(prev => ({
      ...prev,
      width: newWidth,
      height: newHeight,
    }));

    const fitScale = calcFitScale(newWidth, newHeight);
    setDisplayScaleState(fitScale);

    renderWithChannels(channelStates, channels, displayScale, interpolationMethod);
  }, [channelStates, channels, renderWithChannels, displayScale, interpolationMethod]);

  const handleDownload = useCallback((fmt: 'png' | 'jpg' | 'gb7') => {
    const source = sourceCanvasRef.current;
    if (!source) return;

    setStatus(`Сохранение в ${fmt.toUpperCase()}...`);

    try {
      const cleanName = meta.fileName.replace(/\.(png|jpe?g|gb7)$/i, '');

      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = source.width;
      tmpCanvas.height = source.height;
      const tmpCtx = tmpCanvas.getContext('2d')!;

      if (channels > 0 && channelStates.length === channels && channelStates.every(s => s) && !previewLevelsRef.current) {
        tmpCtx.drawImage(source, 0, 0);
      } else {
        const hasAlpha = channels === 2 || channels === 4;
        const srcCtx = source.getContext('2d', { willReadFrequently: true });
        if (!srcCtx) return;
        const srcData = srcCtx.getImageData(0, 0, source.width, source.height);
        const imgData = makeImageData(
          new Uint8ClampedArray(srcData.data),
          source.width, source.height
        );

        if (!(channels > 0 && channelStates.length === channels && channelStates.every(s => s))) {
          applyChannels(imgData.data, channelStates, channels, hasAlpha);
        }
        if (previewLevelsRef.current) {
          const luts = makeLevelsLUTs(previewLevelsRef.current, channels, hasAlpha);
          applyLUTs(imgData.data, luts, hasAlpha);
        }

        tmpCtx.putImageData(imgData, 0, 0);
      }

      if (fmt === 'gb7') {
        const imageData = tmpCtx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
        const gb7Buffer = encodeImageDataToGB7(imageData, { useMask: true, threshold: 128 });

        const outputName = `${cleanName}.gb7`;
        downloadGB7(gb7Buffer, outputName);
        setStatus(`GB7 файл сохранён: ${outputName}`);

      } else if (fmt === 'jpg') {
        const dataUrl = tmpCanvas.toDataURL('image/jpeg', 0.9);
        const link = document.createElement('a');

        link.download = `${cleanName}.jpg`;
        link.href = dataUrl;
        link.click();
        setStatus('JPG файл сохранён');

      } else {
        const dataUrl = tmpCanvas.toDataURL('image/png');
        const link = document.createElement('a');

        link.download = `${cleanName}.png`;
        link.href = dataUrl;
        link.click();
        setStatus('PNG файл сохранён');
      }
    } catch (err) {
      setStatus(`Ошибка сохранения: ${err instanceof Error ? err.message : 'Неизвестно'}`);
    }
  }, [meta.fileName, meta.width, meta.height, channels, channelStates]);

  return {
    canvasRef,
    meta,
    status,
    setStatus,
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
    displayScale,
    displayWidth,
    displayHeight,
    setDisplayScale,
    interpolationMethod,
    setInterpolationMethod,
    resizeImage,
  };
}
