export const InterpolationMethod = {
  NearestNeighbor: 'nearest-neighbor',
  Bilinear: 'bilinear',
} as const;

export type InterpolationMethod = (typeof InterpolationMethod)[keyof typeof InterpolationMethod];

export interface InterpolationDescription {
  value: InterpolationMethod;
  label: string;
  description: string;
}

export const INTERPOLATION_DESCRIPTIONS: InterpolationDescription[] = [
  {
    value: InterpolationMethod.NearestNeighbor,
    label: 'Ближайший сосед',
    description:
      'Каждый пиксель целевого изображения принимает значение ближайшего пикселя исходного. ' +
      'Минимальные вычислительные затраты, но результат может выглядеть "пикселизированным". ' +
      'Подходит для увеличения изображений с чёткими краями (пиксель-арт).',
  },
  {
    value: InterpolationMethod.Bilinear,
    label: 'Билинейная',
    description:
      'Значение каждого пикселя вычисляется как взвешенное среднее четырёх ближайших пикселей ' +
      'исходного изображения. Обеспечивает плавные переходы цвета и хорошее качество ' +
      'при увеличении. Рекомендуется для фотографий и изображений с градиентами.',
  },
];

function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number): [number, number, number, number] {
  const idx = (y * width + x) * 4;
  return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
}

function setPixel(data: Uint8ClampedArray, width: number, x: number, y: number, r: number, g: number, b: number, a: number): void {
  const idx = (y * width + x) * 4;
  data[idx] = r;
  data[idx + 1] = g;
  data[idx + 2] = b;
  data[idx + 3] = a;
}

function scaleNearestNeighbor(
  src: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(dstW * dstH * 4);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    const srcY = Math.min(Math.floor(y * yRatio), srcH - 1);
    for (let x = 0; x < dstW; x++) {
      const srcX = Math.min(Math.floor(x * xRatio), srcW - 1);
      const [r, g, b, a] = getPixel(src, srcW, srcX, srcY);
      setPixel(dst, dstW, x, y, r, g, b, a);
    }
  }

  return dst;
}

function scaleBilinear(
  src: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(dstW * dstH * 4);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    const srcYf = y * yRatio;
    const srcY0 = clamp(Math.floor(srcYf), 0, srcH - 1);
    const srcY1 = clamp(srcY0 + 1, 0, srcH - 1);
    const yFrac = srcYf - srcY0;

    for (let x = 0; x < dstW; x++) {
      const srcXf = x * xRatio;
      const srcX0 = clamp(Math.floor(srcXf), 0, srcW - 1);
      const srcX1 = clamp(srcX0 + 1, 0, srcW - 1);
      const xFrac = srcXf - srcX0;

      const p00 = getPixel(src, srcW, srcX0, srcY0);
      const p10 = getPixel(src, srcW, srcX1, srcY0);
      const p01 = getPixel(src, srcW, srcX0, srcY1);
      const p11 = getPixel(src, srcW, srcX1, srcY1);

      const r = (p00[0] * (1 - xFrac) + p10[0] * xFrac) * (1 - yFrac) + (p01[0] * (1 - xFrac) + p11[0] * xFrac) * yFrac;
      const g = (p00[1] * (1 - xFrac) + p10[1] * xFrac) * (1 - yFrac) + (p01[1] * (1 - xFrac) + p11[1] * xFrac) * yFrac;
      const b = (p00[2] * (1 - xFrac) + p10[2] * xFrac) * (1 - yFrac) + (p01[2] * (1 - xFrac) + p11[2] * xFrac) * yFrac;
      const a = (p00[3] * (1 - xFrac) + p10[3] * xFrac) * (1 - yFrac) + (p01[3] * (1 - xFrac) + p11[3] * xFrac) * yFrac;

      setPixel(dst, dstW, x, y, Math.round(r), Math.round(g), Math.round(b), Math.round(a));
    }
  }

  return dst;
}

export function scaleImageData(
  source: ImageData,
  newWidth: number,
  newHeight: number,
  method: InterpolationMethod,
): ImageData {
  if (newWidth <= 0 || newHeight <= 0) {
    return makeImageData(new Uint8ClampedArray(4), 1, 1);
  }

  if (source.width === newWidth && source.height === newHeight) {
    const buf = source.data.slice();
    return makeImageData(buf, newWidth, newHeight);
  }

  let dstData: Uint8ClampedArray;

  if (method === InterpolationMethod.NearestNeighbor) {
    dstData = scaleNearestNeighbor(source.data, source.width, source.height, newWidth, newHeight);
  } else {
    dstData = scaleBilinear(source.data, source.width, source.height, newWidth, newHeight);
  }

  return makeImageData(dstData, newWidth, newHeight);
}

function makeImageData(data: Uint8ClampedArray, width: number, height: number): ImageData {
  return new (ImageData as unknown as new (data: Uint8ClampedArray, sw: number, sh: number) => ImageData)(data, width, height);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
