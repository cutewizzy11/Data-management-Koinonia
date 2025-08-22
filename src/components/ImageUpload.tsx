import React, { useState, useRef } from 'react';
import { Upload, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  onImageUploaded?: (imageUrl: string) => void;
  currentImageUrl?: string;
  personId?: string;
  personName?: string;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUploaded,
  currentImageUrl,
  personId,
  personName,
  maxSizeMB = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  disabled = false
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} not supported. Please use: ${acceptedTypes.join(', ')}`;
    }
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds limit of ${maxSizeMB}MB`;
    }
    
    return null;
  };

  const uploadToGCS = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('personId', personId || '');
    formData.append('personName', personName || '');
    
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.imageUrl;
  };

  const handleFileUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast.error('Invalid file', { description: validationError });
      return;
    }

    setIsUploading(true);
    
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      toast('Uploading image...', { 
        description: 'Saving to Google Cloud Storage...' 
      });
      
      const imageUrl = await uploadToGCS(file);
      
      toast.success('Image uploaded successfully', {
        description: 'Image saved to Google Cloud Storage'
      });
      
      setPreviewUrl(imageUrl);
      onImageUploaded?.(imageUrl);
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      
      // Revert preview on error
      setPreviewUrl(currentImageUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (disabled || isUploading) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onImageUploaded?.('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isUploading ? 'bg-gray-50' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-32 h-32 object-cover rounded-lg mx-auto mb-3"
            />
            {!isUploading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X size={16} />
              </button>
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={24} />
              </div>
            )}
          </div>
        ) : (
          <div className="py-8">
            {isUploading ? (
              <Loader2 className="animate-spin mx-auto mb-3 text-gray-400" size={48} />
            ) : (
              <Upload className="mx-auto mb-3 text-gray-400" size={48} />
            )}
            <p className="text-gray-600 mb-2">
              {isUploading ? 'Uploading...' : 'Drop an image here or click to browse'}
            </p>
            <p className="text-sm text-gray-500">
              {acceptedTypes.map(type => type.split('/')[1]).join(', ')} • Max {maxSizeMB}MB
            </p>
          </div>
        )}

        {currentImageUrl && currentImageUrl !== previewUrl && (
          <div className="absolute top-2 right-2">
            <Check className="text-green-500 bg-white rounded-full p-1" size={20} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;