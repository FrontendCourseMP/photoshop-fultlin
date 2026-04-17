// src/hooks/useCanvasNavigation.ts
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

  const zoomAtCenter = useCallback((newScale: number) => {
    setNav(prev => {
      const oldScale = prev.scale;
      const scaleRatio = newScale / oldScale;

      const centerX = prev.containerWidth / 2;
      const centerY = prev.containerHeight / 2;

      const dx = centerX - prev.translateX;
      const dy = centerY - prev.translateY;

      const newTranslateX = centerX - dx * scaleRatio;
      const newTranslateY = centerY - dy * scaleRatio;

      return {
        ...prev,
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY
      };
    });
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();

    const zoomSensitivity = 0.0015;
    const delta = -e.deltaY * zoomSensitivity;
    const newScale = Math.min(Math.max(0.1, nav.scale + delta));

    zoomAtCenter(newScale);
  }, [nav.scale, zoomAtCenter]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;

    let newScale = nav.scale;
    const zoomStep = 0.1;

    if (e.key === '+' || e.key === '=') {
      newScale = Math.min(10, nav.scale + zoomStep);
    } else if (e.key === '-' || e.key === '_') {
      newScale = Math.max(0.1, nav.scale - zoomStep);
    } else if (e.key === '0') {
      setNav(prev => ({
        ...prev,
        scale: 1,
        translateX: (prev.containerWidth - prev.imageWidth) / 2,
        translateY: (prev.containerHeight - prev.imageHeight) / 2
      }));
      return;
    } else {
      return;
    }

    e.preventDefault();
    zoomAtCenter(newScale);
  }, [nav.scale, zoomAtCenter]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const isCtrlPan = e.button === 0 && (e.ctrlKey || e.metaKey);
    const isMiddlePan = e.button === 1;

    if (isCtrlPan || isMiddlePan) {
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

    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleWheel, handleKeyDown, handleMouseUp, updateContainerSize]);

  const transform = `translate(${nav.translateX}px, ${nav.translateY}px) scale(${nav.scale})`;

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