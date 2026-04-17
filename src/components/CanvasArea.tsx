import { type ForwardedRef, forwardRef, useEffect } from 'react';
import { useCanvasNavigation } from '../hooks/useCanvasNavigation';
import type { CanvasAreaProps } from '../core';

export const CanvasArea = forwardRef<HTMLCanvasElement, CanvasAreaProps>(
  ({ width = 0, height = 0, onScaleChange }, ref: ForwardedRef<HTMLCanvasElement>) => {
    const {
      containerRef,
      transform,
      scale,
      isDragging,
      setImageSize,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave
    } = useCanvasNavigation();

    useEffect(() => {
      if (width > 0 && height > 0) {
        setImageSize(width, height);
      }
    }, [width, height, setImageSize]);

    useEffect(() => {
      if (onScaleChange) {
        onScaleChange(scale);
      }
    }, [scale, onScaleChange]);

    return (
      <main 
        className="canvas-area"
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        style={{ 
          cursor: isDragging ? 'grabbing' : scale !== 1 ? 'grab' : 'default',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            transform,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.05s ease-out',
            willChange: 'transform'
          }}
        >
          <canvas 
            ref={ref}
            width={width}
            height={height}
            style={{
              display: 'block',
              background: '#000',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              imageRendering: 'pixelated',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          />
        </div>
      </main>
    );
  }
);

CanvasArea.displayName = 'CanvasArea';