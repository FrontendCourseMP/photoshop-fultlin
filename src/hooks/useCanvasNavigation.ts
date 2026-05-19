import { useRef, useState, useCallback, useEffect } from 'react';
import type { NavigationState } from '../core';

export function useCanvasNavigation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nav, setNav] = useState<NavigationState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    containerWidth: 0,
    containerHeight: 0,
    imageWidth: 0,
    imageHeight: 0
  });

  const updateContainerSize = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      setNav(prev => ({
        ...prev,
        containerWidth: container.clientWidth,
        containerHeight: container.clientHeight
      }));
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      e.preventDefault();
      e.stopPropagation();

      setNav(prev => ({
        ...prev,
        isDragging: true,
        dragStartX: e.clientX - prev.translateX,
        dragStartY: e.clientY - prev.translateY
      }));
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!nav.isDragging) return;

    setNav(prev => ({
      ...prev,
      translateX: e.clientX - prev.dragStartX,
      translateY: e.clientY - prev.dragStartY
    }));
  }, [nav.isDragging]);

  const handleMouseUp = useCallback(() => {
    setNav(prev => ({ ...prev, isDragging: false }));
  }, []);

  const setImageSize = useCallback((width: number, height: number) => {
    setNav(prev => {
      const containerW = prev.containerWidth || 800;
      const containerH = prev.containerHeight || 600;

      return {
        ...prev,
        imageWidth: width,
        imageHeight: height,
        scale: 1,
        translateX: (containerW - width) / 2,
        translateY: (containerH - height) / 2,
        isDragging: false
      };
    });
  }, []);

  const resetNavigation = useCallback(() => {
    setNav(prev => ({
      ...prev,
      scale: 1,
      translateX: (prev.containerWidth - prev.imageWidth) / 2,
      translateY: (prev.containerHeight - prev.imageHeight) / 2,
      isDragging: false
    }));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    updateContainerSize();
    const resizeObserver = new ResizeObserver(updateContainerSize);
    resizeObserver.observe(container);

    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseUp, updateContainerSize]);

  const transform = `translate(${nav.translateX}px, ${nav.translateY}px)`;

  return {
    containerRef,
    transform,
    scale: nav.scale,
    translateX: nav.translateX,
    translateY: nav.translateY,
    isDragging: nav.isDragging,
    setImageSize,
    resetNavigation,
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseUp
  };
}
