'use client';

import { useRef } from 'react';
import { useAppStore } from '@/store';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

export function ImageUploadPanel() {
  const { addImageAttachment, removeImageAttachment, imageAttachments } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        console.warn(`Skipped non-image file: ${file.name}`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        addImageAttachment({
          dataUrl: reader.result as string,
          name: file.name,
          type: file.type,
          size: file.size,
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.add('border-[#0078d4]', 'bg-[#0078d4]/10');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('border-[#0078d4]', 'bg-[#0078d4]/10');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('border-[#0078d4]', 'bg-[#0078d4]/10');
    }
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="w-full p-4 space-y-4">
      <h3 className="text-sm font-semibold text-white">图片附件</h3>

      {/* 上传区域 */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-[#3c3c3c] rounded-lg p-6 cursor-pointer transition-colors hover:border-[#0078d4] hover:bg-[#0078d4]/5"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2 text-center">
          <Upload size={32} className="text-[#858585]" />
          <div className="text-xs text-[#858585]">
            <p className="font-medium">拖拽图片或点击上传</p>
            <p className="text-[#6a6a6a]">支持 PNG, JPG, GIF 等格式</p>
          </div>
        </div>
      </div>

      {/* 已上传的附件列表 */}
      {imageAttachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-[#858585] uppercase">已添加 ({imageAttachments.length})</h4>
          <div className="grid grid-cols-2 gap-2">
            {imageAttachments.map((img) => (
              <div
                key={img.id}
                className="relative group rounded overflow-hidden bg-[#1e1e1e] border border-[#3c3c3c] hover:border-[#0078d4]"
              >
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="w-full h-24 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <ImageIcon size={16} className="text-white" />
                    <span className="text-xs text-white font-medium truncate max-w-full px-1">
                      {img.name}
                    </span>
                  </div>
                  <button
                    onClick={() => removeImageAttachment(img.id)}
                    className="absolute top-1 right-1 p-1 bg-red-600 rounded hover:bg-red-700 transition-colors"
                    title="删除"
                  >
                    <X size={12} className="text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
