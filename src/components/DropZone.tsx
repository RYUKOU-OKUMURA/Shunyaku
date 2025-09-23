import React, { useCallback, useState } from 'react';
import { DropZoneProps, ImageInput } from '../types';

export const DropZone: React.FC<DropZoneProps> = ({
  onImageDrop,
  acceptedFormats = ['png', 'jpg', 'jpeg', 'pdf'],
  disabled = false,
  className = '',
  children,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): boolean => {
    setError(null);

    // ファイル形式チェック
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !acceptedFormats.includes(extension as any)) {
      setError(`対応していないファイル形式です。${acceptedFormats.join(', ')} のファイルを選択してください。`);
      return false;
    }

    // ファイルサイズチェック（10MB以下）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。');
      return false;
    }

    return true;
  }, [acceptedFormats]);

  const processFile = useCallback(async (file: File) => {
    if (!validateFile(file)) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const imageData: ImageInput = {
        data: arrayBuffer,
        format: file.name.split('.').pop()?.toLowerCase() as any,
        width: 0, // 実際のアプリでは画像を読み込んで取得
        height: 0, // 実際のアプリでは画像を読み込んで取得
        size: file.size,
      };

      // 画像の場合は実際のサイズを取得
      if (['png', 'jpg', 'jpeg'].includes(imageData.format)) {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
          imageData.width = img.naturalWidth;
          imageData.height = img.naturalHeight;
          URL.revokeObjectURL(url);
          onImageDrop(imageData);
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          setError('画像ファイルの読み込みに失敗しました。');
        };

        img.src = url;
      } else {
        // PDFの場合はダミー値
        imageData.width = 2000;
        imageData.height = 1200;
        onImageDrop(imageData);
      }
    } catch (err) {
      setError('ファイルの処理中にエラーが発生しました。');
    }
  }, [validateFile, onImageDrop]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [disabled, processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const baseClasses = 'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200';
  const stateClasses = disabled
    ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
    : isDragOver
    ? 'border-blue-400 bg-blue-50'
    : 'border-gray-300 hover:border-gray-400';

  const dropZoneClasses = `${baseClasses} ${stateClasses} ${className}`;

  return (
    <div className="w-full">
      <div
        className={dropZoneClasses}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          accept={acceptedFormats.map(f => `.${f}`).join(',')}
          onChange={handleFileSelect}
          disabled={disabled}
        />

        {children || (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="text-4xl text-gray-400">
              📸
            </div>
            <div className="text-lg font-medium text-gray-700">
              画像ファイルをドラッグ＆ドロップ
            </div>
            <div className="text-sm text-gray-500">
              または クリックしてファイルを選択
            </div>
            <div className="text-xs text-gray-400">
              対応形式: {acceptedFormats.join(', ').toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-700">
            ⚠️ {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default DropZone;