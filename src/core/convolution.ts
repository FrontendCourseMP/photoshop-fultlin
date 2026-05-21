export type Kernel = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

export type EdgeHandling = 'black' | 'white' | 'copy';

export interface ConvolutionParams {
  kernel: Kernel;
  edgeHandling: EdgeHandling;
  channels: ('r' | 'g' | 'b' | 'a')[];
}

export interface ConvolutionPreset {
  name: string;
  kernel: Kernel;
}

export const KERNEL_IDENTITY: Kernel = [
  [0, 0, 0],
  [0, 1, 0],
  [0, 0, 0],
];

export const KERNEL_SHARPEN: Kernel = [
  [0, -1, 0],
  [-1, 5, -1],
  [0, -1, 0],
];

export const KERNEL_GAUSSIAN_BLUR_3: Kernel = [
  [1, 2, 1],
  [2, 4, 2],
  [1, 2, 1],
];

export const KERNEL_BOX_BLUR: Kernel = [
  [1, 1, 1],
  [1, 1, 1],
  [1, 1, 1],
];

export const KERNEL_PREWITT_X: Kernel = [
  [-1, 0, 1],
  [-1, 0, 1],
  [-1, 0, 1],
];

export const KERNEL_PREWITT_Y: Kernel = [
  [-1, -1, -1],
  [0, 0, 0],
  [1, 1, 1],
];

export const CONVOLUTION_PRESETS: ConvolutionPreset[] = [
  { name: 'Тождественное отображение', kernel: KERNEL_IDENTITY },
  { name: 'Повышение резкости', kernel: KERNEL_SHARPEN },
  { name: 'Фильтр Гаусса (3×3)', kernel: KERNEL_GAUSSIAN_BLUR_3 },
  { name: 'Прямоугольное размытие', kernel: KERNEL_BOX_BLUR },
  { name: 'Оператор Прюитта (X)', kernel: KERNEL_PREWITT_X },
  { name: 'Оператор Прюитта (Y)', kernel: KERNEL_PREWITT_Y },
];

function padImage(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  edgeHandling: EdgeHandling
): Uint8ClampedArray {
  const pw = width + 2;
  const ph = height + 2;
  const padded = new Uint8ClampedArray(pw * ph * 4);

  let fillR: number, fillG: number, fillB: number, fillA: number;
  if (edgeHandling === 'black') {
    fillR = fillG = fillB = fillA = 0;
  } else if (edgeHandling === 'white') {
    fillR = fillG = fillB = fillA = 255;
  } else {
    fillR = fillG = fillB = fillA = 0;
  }

  for (let py = 0; py < ph; py++) {
    for (let px = 0; px < pw; px++) {
      const pIdx = (py * pw + px) * 4;

      if (edgeHandling === 'copy') {
        const sx = Math.max(0, Math.min(width - 1, px - 1));
        const sy = Math.max(0, Math.min(height - 1, py - 1));
        const sIdx = (sy * width + sx) * 4;
        padded[pIdx] = data[sIdx];
        padded[pIdx + 1] = data[sIdx + 1];
        padded[pIdx + 2] = data[sIdx + 2];
        padded[pIdx + 3] = data[sIdx + 3];
      } else {
        const sx = px - 1;
        const sy = py - 1;
        if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
          const sIdx = (sy * width + sx) * 4;
          padded[pIdx] = data[sIdx];
          padded[pIdx + 1] = data[sIdx + 1];
          padded[pIdx + 2] = data[sIdx + 2];
          padded[pIdx + 3] = data[sIdx + 3];
        } else {
          padded[pIdx] = fillR;
          padded[pIdx + 1] = fillG;
          padded[pIdx + 2] = fillB;
          padded[pIdx + 3] = fillA;
        }
      }
    }
  }

  return padded;
}

function makeImageData(data: Uint8ClampedArray, width: number, height: number): ImageData {
  return new (ImageData as unknown as new (data: Uint8ClampedArray, sw: number, sh: number) => ImageData)(data, width, height);
}

export function applyConvolution(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  kernel: Kernel,
  edgeHandling: EdgeHandling,
  channels: ('r' | 'g' | 'b' | 'a')[]
): ImageData {
  const padded = padImage(data, width, height, edgeHandling);
  const pw = width + 2;

  const sum = kernel[0][0] + kernel[0][1] + kernel[0][2]
            + kernel[1][0] + kernel[1][1] + kernel[1][2]
            + kernel[2][0] + kernel[2][1] + kernel[2][2];
  const norm = sum === 0 ? 1 : sum;

  const result = new Uint8ClampedArray(data);
  const chMap: Record<string, number> = { r: 0, g: 1, b: 2, a: 3 };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      for (const ch of channels) {
        const c = chMap[ch];
        let val = 0;
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const px = ((y + ky) * pw + (x + kx)) * 4 + c;
            val += padded[px] * kernel[ky][kx];
          }
        }
        result[idx + c] = Math.max(0, Math.min(255, Math.round(val / norm)));
      }
    }
  }

  return makeImageData(result, width, height);
}

export async function applyConvolutionAsync(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  kernel: Kernel,
  edgeHandling: EdgeHandling,
  channels: ('r' | 'g' | 'b' | 'a')[],
  onProgress?: (progress: number) => void
): Promise<ImageData> {
  const padded = padImage(data, width, height, edgeHandling);
  const pw = width + 2;

  const sum = kernel[0][0] + kernel[0][1] + kernel[0][2]
            + kernel[1][0] + kernel[1][1] + kernel[1][2]
            + kernel[2][0] + kernel[2][1] + kernel[2][2];
  const norm = sum === 0 ? 1 : sum;

  const result = new Uint8ClampedArray(data);
  const chMap: Record<string, number> = { r: 0, g: 1, b: 2, a: 3 };

  const chunkSize = Math.max(1, Math.floor(height / 20));
  let processedRows = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      for (const ch of channels) {
        const c = chMap[ch];
        let val = 0;
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const px = ((y + ky) * pw + (x + kx)) * 4 + c;
            val += padded[px] * kernel[ky][kx];
          }
        }
        result[idx + c] = Math.max(0, Math.min(255, Math.round(val / norm)));
      }
    }

    processedRows++;
    if (processedRows % chunkSize === 0 && y < height - 1) {
      if (onProgress) {
        onProgress((y + 1) / height);
      }
      await new Promise<void>(r => requestAnimationFrame(() => r()));
    }
  }

  if (onProgress) {
    onProgress(1);
  }

  return makeImageData(result, width, height);
}
