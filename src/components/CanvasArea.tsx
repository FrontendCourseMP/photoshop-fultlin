import { type ForwardedRef, forwardRef, useCallback, useEffect } from 'react';
import { useCanvasNavigation } from '../hooks/useCanvasNavigation';
import type { CanvasAreaProps } from '../core';

export const CanvasArea = forwardRef<HTMLCanvasElement, CanvasAreaProps>(
  ({ displayWidth = 0, displayHeight = 0, eyedropperActive, onEyedropperPick }, ref: ForwardedRef<HTMLCanvasElement>) => {
    const {
      containerRef,
      transform,
      isDragging,
      setImageSize,
      onMouseDown: navOnMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave
    } = useCanvasNavigation();

    useEffect(() => {
      if (displayWidth > 0 && displayHeight > 0) {
        setImageSize(displayWidth, displayHeight);
      }
    }, [displayWidth, displayHeight, setImageSize]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      if (eyedropperActive && e.button === 0 && !e.ctrlKey && !e.metaKey) {
        const canvas = (ref as React.RefObject<HTMLCanvasElement | null>).current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const px = Math.floor((e.clientX - rect.left) * canvas.width / rect.width);
        const py = Math.floor((e.clientY - rect.top) * canvas.height / rect.height);
        if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
          onEyedropperPick?.(e, px, py);
        }
      } else {
        navOnMouseDown(e);
      }
    }, [eyedropperActive, onEyedropperPick, navOnMouseDown, ref]);

    return (
      <main
        className={`canvas-area${eyedropperActive ? ' eyedropper-active' : ''}`}
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        style={{
          cursor: eyedropperActive ? 'crosshair' : isDragging ? 'grabbing' : 'default'
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
            width={displayWidth}
            height={displayHeight}
            style={{
              display: 'block',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
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
