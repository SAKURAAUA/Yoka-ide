'use client';

import { useState, useRef, useCallback, useEffect, ReactNode } from 'react';

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  direction: 'horizontal' | 'vertical';
  initialSplit?: number; // 0-1, 默认 0.5
  minSize?: number; // 最小尺寸百分比，默认 20
  onSplitChange?: (split: number) => void;
}

export function SplitPane({ 
  left, 
  right, 
  direction, 
  initialSplit = 0.5, 
  minSize = 0.15,
  onSplitChange 
}: SplitPaneProps) {
  const [split, setSplit] = useState(initialSplit);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef(0);
  const startSplitRef = useRef(split);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    if (direction === 'horizontal') {
      startPosRef.current = e.clientX;
    } else {
      startPosRef.current = e.clientY;
    }
    startSplitRef.current = split;
  }, [direction, split]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      let delta: number;
      let totalSize: number;
      
      if (direction === 'horizontal') {
        delta = e.clientX - startPosRef.current;
        totalSize = rect.width;
      } else {
        delta = e.clientY - startPosRef.current;
        totalSize = rect.height;
      }
      
      const deltaPercent = delta / totalSize;
      let newSplit = startSplitRef.current + deltaPercent;
      
      // 限制范围
      newSplit = Math.max(minSize, Math.min(1 - minSize, newSplit));
      
      setSplit(newSplit);
      onSplitChange?.(newSplit);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, direction, minSize, onSplitChange]);

  const isHorizontal = direction === 'horizontal';
  
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    height: '100%',
    flexDirection: isHorizontal ? 'row' : 'column',
    overflow: 'hidden',
  };

  const leftStyle: React.CSSProperties = {
    flex: '0 0 auto',
    width: isHorizontal ? `${split * 100}%` : '100%',
    height: isHorizontal ? '100%' : `${split * 100}%`,
    overflow: 'hidden',
  };

  const rightStyle: React.CSSProperties = {
    flex: '1 1 auto',
    width: isHorizontal ? `${(1 - split) * 100}%` : '100%',
    height: isHorizontal ? '100%' : `${(1 - split) * 100}%`,
    overflow: 'hidden',
  };

  const dividerStyle: React.CSSProperties = {
    flex: '0 0 auto',
    width: isHorizontal ? '4px' : '100%',
    height: isHorizontal ? '100%' : '4px',
    backgroundColor: isDragging ? '#3b82f6' : '#e5e7eb',
    cursor: isHorizontal ? 'col-resize' : 'row-resize',
    transition: isDragging ? 'none' : 'background-color 0.15s',
    zIndex: 10,
  };

  return (
    <div ref={containerRef} style={containerStyle}>
      <div style={leftStyle}>{left}</div>
      <div 
        style={dividerStyle}
        onMouseDown={handleMouseDown}
      />
      <div style={rightStyle}>{right}</div>
    </div>
  );
}
