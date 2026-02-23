'use client';

import { useAppStore } from '@/store';

export function DockPreview() {
  const { previewDock } = useAppStore();
  
  if (!previewDock) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {previewDock.type === 'dock' && (
        <div 
          className="absolute border-2 border-dashed border-blue-500"
          style={{
            left: previewDock.bounds.x,
            top: previewDock.bounds.y,
            width: previewDock.bounds.width,
            height: previewDock.bounds.height,
            boxSizing: 'border-box'
          }}
        />
      )}
      
      {previewDock.type === 'squeeze' && (
        <div 
          className="absolute"
          style={{
            left: previewDock.bounds.x,
            top: previewDock.bounds.y,
            width: previewDock.bounds.width,
            height: previewDock.bounds.height,
            background: `repeating-linear-gradient(
              45deg, 
              transparent, 
              transparent 10px, 
              rgba(0, 120, 212, 0.2) 10px, 
              rgba(0, 120, 212, 0.2) 20px
            )`,
            boxSizing: 'border-box'
          }}
        />
      )}
    </div>
  );
}
