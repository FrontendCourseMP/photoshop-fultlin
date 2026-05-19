export interface LevelsParams {
  blackPoint: number;
  whitePoint: number;
  gamma: number;
}

export type ChannelMode = 'master' | 'red' | 'green' | 'blue' | 'alpha';

export const defaultLevelsParams: LevelsParams = { blackPoint: 0, whitePoint: 255, gamma: 1.0 };

export function generateLevelsLUT(params: LevelsParams): Uint8Array {
  const lut = new Uint8Array(256);
  const range = params.whitePoint - params.blackPoint;
  if (range <= 0) {
    return lut;
  }
  for (let i = 0; i < 256; i++) {
    let t = (i - params.blackPoint) / range;
    t = Math.max(0, Math.min(1, t));
    t = Math.pow(t, params.gamma);
    lut[i] = Math.round(t * 255);
  }
  return lut;
}

export function computeHistogram(data: ImageData, channel: ChannelMode): Uint32Array {
  const hist = new Uint32Array(256);
  const pixels = data.data;
  const len = pixels.length;
  for (let i = 0; i < len; i += 4) {
    let v: number;
    switch (channel) {
      case 'red':
        v = pixels[i];
        break;
      case 'green':
        v = pixels[i + 1];
        break;
      case 'blue':
        v = pixels[i + 2];
        break;
      case 'alpha':
        v = pixels[i + 3];
        break;
      case 'master':
        v = Math.round(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
        break;
    }
    hist[v]++;
  }
  return hist;
}

export function applyLevelsToData(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  params: LevelsParams,
  channel: ChannelMode
): ImageData {
  const result = new Uint8ClampedArray(pixels);
  const lut = generateLevelsLUT(params);

  if (channel === 'master') {
    for (let i = 0; i < result.length; i += 4) {
      result[i] = lut[result[i]];
      result[i + 1] = lut[result[i + 1]];
      result[i + 2] = lut[result[i + 2]];
    }
  } else if (channel === 'red') {
    for (let i = 0; i < result.length; i += 4) {
      result[i] = lut[result[i]];
    }
  } else if (channel === 'green') {
    for (let i = 0; i < result.length; i += 4) {
      result[i + 1] = lut[result[i + 1]];
    }
  } else if (channel === 'blue') {
    for (let i = 0; i < result.length; i += 4) {
      result[i + 2] = lut[result[i + 2]];
    }
  } else if (channel === 'alpha') {
    for (let i = 0; i < result.length; i += 4) {
      result[i + 3] = lut[result[i + 3]];
    }
  }

  return new ImageData(result, width, height);
}

export type LevelsChannelState = Record<'red' | 'green' | 'blue' | 'alpha', LevelsParams>;

export function createDefaultLevelsState(): LevelsChannelState {
  return {
    red: { ...defaultLevelsParams },
    green: { ...defaultLevelsParams },
    blue: { ...defaultLevelsParams },
    alpha: { ...defaultLevelsParams },
  };
}
