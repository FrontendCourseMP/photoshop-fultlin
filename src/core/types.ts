export interface GB7Header {
  signature: Uint8Array; // 4 bytes: 0x47, 0x42, 0x37, 0x1D
  version: number;        // 1 byte: 0x01
  flags: number;          // 1 byte: bit 0 = mask flag
  width: number;          // 2 bytes: big-endian uint16
  height: number;         // 2 bytes: big-endian uint16
  reserved: number;       // 2 bytes: 0x0000
}

export interface GB7Image {
  header: GB7Header;
  pixels: Uint8Array;
  hasMask: boolean;
}

export interface ImageDataRGBA {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export type ImageFormat = 'png' | 'jpg' | 'gb7';

export interface ImageMeta {
  width: number;
  height: number;
  colorDepth: string;
  format: 'png' | 'jpg' | 'gb7' | null;
  fileName: string;
}

export interface NavigationState {
  scale: number;
  translateX: number;
  translateY: number;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  containerWidth: number;
  containerHeight: number;
  imageWidth: number;
  imageHeight: number;
}

export interface CanvasAreaProps {
  width?: number;
  height?: number;
  onScaleChange?: (scale: number) => void;
}

export interface DownloadMenuProps {
  onDownload: (format: 'png' | 'jpg' | 'gb7') => void;
  isOpen: boolean;
  onToggle: () => void;
}

export interface TopBarProps {
  meta: ImageMeta;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownload: (format: 'png' | 'jpg' | 'gb7') => void;
  downloadMenuOpen: boolean;
  onToggleMenu: () => void;
}

export interface StatusBarProps {
  status: string;
}