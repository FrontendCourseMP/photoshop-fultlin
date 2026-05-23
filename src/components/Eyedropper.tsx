import type { EyedropperProps } from '../core/types';
import { rgbToLab } from '../core/color';

export function EyedropperPopup({ info, position, onClose }: EyedropperProps) {
  if (!info) return null;

  const popupX = Math.min(position.x + 15, window.innerWidth - 220);
  const popupY = Math.min(position.y + 15, window.innerHeight - 180);

  const lab = rgbToLab(info.r, info.g, info.b);
  const isTransparent = info.alpha < 255;

  return (
    <>
      <div className="eyedropper-overlay" onClick={onClose} />
      <div
        className="eyedropper-popup"
        style={{ left: popupX, top: popupY }}
      >
        <div
          className="eyedropper-color-swatch"
          style={{
            background: isTransparent
              ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='8' height='8' fill='%23ccc'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23ccc'/%3E%3Crect x='8' width='8' height='8' fill='%23fff'/%3E%3Crect y='8' width='8' height='8' fill='%23fff'/%3E%3C/svg%3E")`
              : undefined,
            backgroundBlendMode: isTransparent ? 'normal' : undefined,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `rgba(${info.r},${info.g},${info.b},${info.alpha / 255})`,
            }}
          />
        </div>
        <table className="eyedropper-info">
          <tbody>
            <tr>
              <td className="info-label">X:</td>
              <td className="info-value">{info.x} px</td>
              <td className="info-label">Y:</td>
              <td className="info-value">{info.y} px</td>
            </tr>
            <tr>
              <td className="info-label">R:</td>
              <td className="info-value">{info.r}</td>
              <td className="info-label">G:</td>
              <td className="info-value">{info.g}</td>
              <td className="info-label">B:</td>
              <td className="info-value">{info.b}</td>
              <td className="info-label">A:</td>
              <td className="info-value">{info.alpha}</td>
            </tr>
            <tr>
              <td className="info-label">L:</td>
              <td className="info-value">{lab.L.toFixed(2)}</td>
              <td className="info-label">a:</td>
              <td className="info-value">{lab.a.toFixed(2)}</td>
              <td className="info-label">b:</td>
              <td className="info-value">{lab.b.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        <button className="eyedropper-close" onClick={onClose}>✕</button>
      </div>
    </>
  );
}
