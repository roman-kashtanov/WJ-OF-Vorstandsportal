import React, { useState } from 'react';

interface DropzoneFileInputProps {
  accept?: string;
  onFile: (file: File) => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper um ein natives Datei-Feld: zusätzlich per Drag&Drop bedienbar.
 * Ruft für beide Wege (Klick, Drop) denselben onFile-Handler auf, damit die
 * Validierung/Komprimierung (prepareFileForStorage) an einer Stelle bleibt.
 */
export const DropzoneFileInput: React.FC<DropzoneFileInputProps> = ({
  accept,
  onFile,
  disabled,
  children,
  className,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (disabled) return;
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={`block cursor-pointer rounded-xl border-2 border-dashed p-3 text-center transition-colors ${
        isDragOver ? 'border-[#003594] bg-blue-50' : 'border-slate-200 bg-slate-50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className || ''}`}
    >
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
        className="hidden"
      />
      {children}
    </label>
  );
};
