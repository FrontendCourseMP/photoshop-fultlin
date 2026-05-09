function rgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function linearRgbToXyz(r: number, g: number, b: number): [number, number, number] {
  return [
    0.4124564 * r + 0.3575761 * g + 0.1804375 * b,
    0.2126729 * r + 0.7151522 * g + 0.0721750 * b,
    0.0193339 * r + 0.1191920 * g + 0.9503041 * b,
  ];
}

const REF_X = 0.95047;
const REF_Y = 1.0;
const REF_Z = 1.08883;

function labF(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
}

function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const fx = labF(x / REF_X);
  const fy = labF(y / REF_Y);
  const fz = labF(z / REF_Z);
  return [
    116 * fy - 16,
    500 * (fx - fy),
    200 * (fy - fz),
  ];
}

export function rgbToLab(r: number, g: number, b: number): { L: number; a: number; b: number } {
  const [lr, lg, lb] = [rgbToLinear(r), rgbToLinear(g), rgbToLinear(b)];
  const [x, y, z] = linearRgbToXyz(lr, lg, lb);
  const [L, a, bVal] = xyzToLab(x, y, z);
  return { L: Math.round(L * 100) / 100, a: Math.round(a * 100) / 100, b: Math.round(bVal * 100) / 100 };
}
