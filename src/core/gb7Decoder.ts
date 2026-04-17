// src/core/gb7Decoder.ts

import type { GB7Image, GB7Header, ImageDataRGBA } from "./types";

// Сигнатура GB7: "GB7" + разделитель групп (0x1D)
const GB7_SIGNATURE = new Uint8Array([0x47, 0x42, 0x37, 0x1D]);

export class GB7DecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GB7DecodeError';
  }
}

/**
 * Декодирует GB7 файл в ImageData (RGBA)
 * @param buffer - ArrayBuffer с данными GB7 файла
 * @returns ImageData для отрисовки на canvas
 */
export function decodeGB7(buffer: ArrayBuffer): GB7Image {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // 1. Проверка сигнатуры (4 байта)
  if (bytes.length < 12) {
    throw new GB7DecodeError('Файл слишком мал для заголовка GB7');
  }

  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== GB7_SIGNATURE[i]) {
      throw new GB7DecodeError(
        `Неверная сигнатура GB7. Ожидалось: ${Array.from(GB7_SIGNATURE).map(b => '0x' + b.toString(16).toUpperCase()).join(' ')}, ` +
        `получено: ${Array.from(bytes.slice(0, 4)).map(b => '0x' + b.toString(16).toUpperCase()).join(' ')}`
      );
    }
  }

  // 2. Чтение заголовка
  const header: GB7Header = {
    signature: bytes.slice(0, 4),
    version: view.getUint8(4),
    flags: view.getUint8(5),
    width: view.getUint16(6, false),  // false = big-endian
    height: view.getUint16(8, false),
    reserved: view.getUint16(10, false),
  };

  // 3. Валидация версии
  if (header.version !== 0x01) {
    throw new GB7DecodeError(`Неподдерживаемая версия GB7: 0x${header.version.toString(16).toUpperCase()}. Ожидается 0x01`);
  }

  // 4. Проверка флага маски (бит 0)
  const hasMask = (header.flags & 0x01) === 1;
  
  // Проверка зарезервированных битов (биты 1-7 должны быть 0)
  if ((header.flags & 0xFE) !== 0) {
    console.warn('GB7: Зарезервированные биты флага не равны 0');
  }

  // 5. Проверка размера данных
  const expectedDataSize = header.width * header.height;
  const actualDataSize = bytes.length - 12;

  if (actualDataSize < expectedDataSize) {
    throw new GB7DecodeError(
      `Недостаточно данных изображения. Ожидается: ${expectedDataSize} байт, получено: ${actualDataSize}`
    );
  }

  // 6. Чтение пикселей
  const pixels = new Uint8Array(buffer, 12, expectedDataSize);

  return {
    header,
    pixels,
    hasMask
  };
}

/**
 * Конвертирует GB7Image в ImageData (RGBA) для отрисовки на canvas
 */
export function gb7ToImageData(gb7Image: GB7Image): ImageDataRGBA {
  const { width, height } = gb7Image.header;
  const { pixels, hasMask } = gb7Image;
  
  const rgbaData = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < pixels.length; i++) {
    const byte = pixels[i];
    
    // Извлечение 7-битного значения оттенка серого (биты 0-6)
    const grayValue = byte & 0x7F;
    
    // Извлечение бита маски (бит 7)
    const maskBit = (byte >> 7) & 1;
    
    // Определение альфа-канала
    const alpha = hasMask ? (maskBit === 1 ? 255 : 0) : 255;

    const idx = i * 4;
    rgbaData[idx] = grayValue;     // R
    rgbaData[idx + 1] = grayValue; // G
    rgbaData[idx + 2] = grayValue; // B
    rgbaData[idx + 3] = alpha;     // A
  }

  return {
    data: rgbaData,
    width,
    height
  };
}

/**
 * Основная функция декодирования: ArrayBuffer → ImageData
 */
export function decodeGB7ToImageData(buffer: ArrayBuffer): ImageDataRGBA {
  const gb7Image = decodeGB7(buffer);
  return gb7ToImageData(gb7Image);
}