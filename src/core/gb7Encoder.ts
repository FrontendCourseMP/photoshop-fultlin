import type { ImageDataRGBA } from "./types";

const GB7_SIGNATURE = new Uint8Array([0x47, 0x42, 0x37, 0x1D]);
const GB7_VERSION = 0x01;

export interface EncodeOptions {
  useMask?: boolean;  // если true, будет использоваться альфа-канал для маски
  threshold?: number; // порог прозрачности (0-255), по умолчанию 128
}

export class GB7EncodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GB7EncodeError';
  }
}

/**
 * Кодирует ImageData в GB7 формат
 * @param imageData - исходные данные изображения (RGBA)
 * @param options - опции кодирования
 * @returns ArrayBuffer с данными GB7 файла
 */
export function encodeImageDataToGB7(
  imageData: ImageDataRGBA,
  options: EncodeOptions = {}
): ArrayBuffer {
  const { useMask = false, threshold = 128 } = options;
  const { width, height, data } = imageData;

  // Проверка размеров (uint16 max = 65535)
  if (width > 65535 || height > 65535) {
    throw new GB7EncodeError(
      `Изображение слишком большое для GB7. Максимум: 65535×65535, получено: ${width}×${height}`
    );
  }

  // 1. Создание заголовка (12 байт)
  const headerSize = 12;
  const dataSize = width * height;
  const totalSize = headerSize + dataSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Запись сигнатуры
  bytes.set(GB7_SIGNATURE, 0);

  // Запись версии
  view.setUint8(4, GB7_VERSION);

  // Запись флага (бит 0 = useMask, биты 1-7 = 0)
  const flags = useMask ? 0x01 : 0x00;
  view.setUint8(5, flags);

  // Запись ширины и высоты (big-endian)
  view.setUint16(6, width, false);
  view.setUint16(8, height, false);

  // Запись зарезервированных байтов (0x0000)
  view.setUint16(10, 0x0000, false);

  // 2. Кодирование пикселей
  const pixelData = new Uint8Array(buffer, headerSize, dataSize);
  
  for (let i = 0; i < dataSize; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    // Конвертация RGB в оттенки серого (стандартная формула ITU-R BT.601)
    // Y = 0.299R + 0.587G + 0.114B
    const grayValue = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    // Ограничение 7 битами (0-127)
    const gray7bit = Math.min(127, Math.max(0, grayValue));

    let byte = gray7bit;

    // Установка бита маски если нужно
    if (useMask) {
      const maskBit = a > threshold ? 1 : 0;
      byte |= (maskBit << 7);
    }
    // Если useMask = false, бит 7 остаётся 0

    pixelData[i] = byte;
  }

  return buffer;
}

/**
 * Создаёт Blob из GB7 ArrayBuffer для скачивания
 */
export function createGB7Blob(buffer: ArrayBuffer): Blob {
  return new Blob([buffer], { type: 'application/octet-stream' });
}

/**
 * Вспомогательная функция для скачивания файла
 */
export function downloadGB7(buffer: ArrayBuffer, fileName: string = 'image.gb7'): void {
  const blob = createGB7Blob(buffer);
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Освобождение памяти
  setTimeout(() => URL.revokeObjectURL(url), 100);
}