import type { EyedropperProps } from '../core/types';
import { rgbToLab } from '../core/color';

export function EyedropperPopup({ info, position, onClose }: EyedropperProps) {
  if (!info) return null;

  const popupX = Math.min(position.x + 15, window.innerWidth - 220);
  const popupY = Math.min(position.y + 15, window.innerHeight - 180);

  const lab = rgbToLab(info.r, info.g, info.b);

  return (
    <>
      <div className="eyedropper-overlay" onClick={onClose} />
      <div
        className="eyedropper-popup"
        style={{ left: popupX, top: popupY }}
      >
        <div className="eyedropper-color-swatch" style={{ background: `rgb(${info.r},${info.g},${info.b})` }} />
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
