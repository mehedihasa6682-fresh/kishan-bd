import React, { useRef } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';

interface ImageUploadProps {
  onUpload: (base64: string) => void;
  currentImage?: string;
  label?: string;
  className?: string;
}

export default function ImageUpload({ onUpload, currentImage, label, className = "" }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
          }

          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          onUpload(dataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest ml-1">{label}</label>}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`relative aspect-video rounded-2xl border-2 border-dashed border-slate-200 bg-[#F5F5F7] flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-all overflow-hidden group`}
      >
        {currentImage ? (
          <>
            <img src={currentImage} className="w-full h-full object-cover" alt="Preview" />
            <div className="absolute inset-0 bg-[#FFFFFF] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="text-white" size={24} />
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onUpload('');
              }}
              className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-red-500 shadow-sm"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#6B7280] mb-2 shadow-sm">
              <ImageIcon size={20} />
            </div>
            <p className="text-[10px] font-bold text-[#6B7280]">Click to upload image</p>
          </>
        )}
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
}
