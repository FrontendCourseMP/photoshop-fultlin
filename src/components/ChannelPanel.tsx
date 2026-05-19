import { useRef, useEffect, useCallback } from 'react';

const CHANNEL_LABELS: Record<number, { name: string; short: string }[]> = {
  1: [{ name: 'Серый', short: 'K' }],
  2: [{ name: 'Серый', short: 'K' }, { name: 'Альфа', short: 'A' }],
  3: [{ name: 'Красный', short: 'R' }, { name: 'Зелёный', short: 'G' }, { name: 'Синий', short: 'B' }],
  4: [{ name: 'Красный', short: 'R' }, { name: 'Зелёный', short: 'G' }, { name: 'Синий', short: 'B' }, { name: 'Альфа', short: 'A' }],
};

interface ChannelPanelProps {
  getSourceImageData: () => ImageData | null;
  channels: number;
  channelStates: boolean[];
  onToggleChannel: (index: number) => void;
}

export function ChannelPanel({ getSourceImageData, channels, channelStates, onToggleChannel }: ChannelPanelProps) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  const setCanvasRef = useCallback((index: number) => (el: HTMLCanvasElement | null) => {
    canvasRefs.current[index] = el;
  }, []);

  useEffect(() => {
    const originalData = getSourceImageData();
    if (!originalData || channels === 0) return;

    const { data, width, height } = originalData;
    const maxThumbW = 230;
    const maxThumbH = 55;

    for (let ch = 0; ch < channels; ch++) {
      const canvas = canvasRefs.current[ch];
      if (!canvas) continue;

      let tw = maxThumbW;
      let th = Math.floor(height * tw / width);
      if (th > maxThumbH) {
        th = maxThumbH;
        tw = Math.floor(width * th / height);
      }
      if (tw < 50) tw = 50;
      if (th < 10) th = 10;

      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.imageSmoothingEnabled = false;
      const outData = ctx.createImageData(tw, th);
      const out = outData.data;

      const isGray = channels <= 2;

      for (let y = 0; y < th; y++) {
        for (let x = 0; x < tw; x++) {
          const srcX = Math.floor(x * width / tw);
          const srcY = Math.floor(y * height / th);
          const srcIdx = (srcY * width + srcX) * 4;
          const outIdx = (y * tw + x) * 4;

          const r = data[srcIdx];
          const g = data[srcIdx + 1];
          const b = data[srcIdx + 2];
          const a = data[srcIdx + 3];

          if (isGray) {
            if (ch === 0) {
              out[outIdx] = r;
              out[outIdx + 1] = r;
              out[outIdx + 2] = r;
            } else {
              out[outIdx] = a;
              out[outIdx + 1] = a;
              out[outIdx + 2] = a;
            }
          } else {
            if (ch === 0) {
              out[outIdx] = r;
              out[outIdx + 1] = 0;
              out[outIdx + 2] = 0;
            } else if (ch === 1) {
              out[outIdx] = 0;
              out[outIdx + 1] = g;
              out[outIdx + 2] = 0;
            } else if (ch === 2) {
              out[outIdx] = 0;
              out[outIdx + 1] = 0;
              out[outIdx + 2] = b;
            } else {
              out[outIdx] = a;
              out[outIdx + 1] = a;
              out[outIdx + 2] = a;
            }
          }
          out[outIdx + 3] = 255;
        }
      }

      ctx.putImageData(outData, 0, 0);
    }
  }, [getSourceImageData, channels]);

  const hasData = getSourceImageData() !== null;

  if (!hasData || channels === 0) {
    return (
      <div className="channel-panel">
        <div className="channel-empty">Нет изображения</div>
      </div>
    );
  }

  const labels = CHANNEL_LABELS[channels] || [];

  return (
    <div className="channel-panel">
      {labels.map((label, i) => (
        <div
          key={i}
          className={`channel-item ${channelStates[i] ? 'active' : 'inactive'}`}
          onClick={() => onToggleChannel(i)}
          title={`${label.name} канал — ${channelStates[i] ? 'включён' : 'выключен'}`}
        >
          <canvas ref={setCanvasRef(i)} className="channel-thumb" />
          <div className="channel-info">
            <span className="channel-name">{label.name}</span>
            <span className="channel-short">{label.short}</span>
          </div>
          <span className={`channel-eye ${channelStates[i] ? 'visible' : 'hidden'}`}>
            {channelStates[i] ? '👁' : '👁‍🗨'}
          </span>
        </div>
      ))}
    </div>
  );
}
