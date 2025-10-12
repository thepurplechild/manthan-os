'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { validateFile, sanitizeFilename } from '@/lib/utils/fileValidation';
import { createAssetRecord } from '@/app/actions/uploadAsset';
import { toast } from 'sonner';
import { Loader2, Image as ImageIcon } from 'lucide-react';

interface UploadImageAssetProps {
  documentId: string;
  onUploadComplete?: () => void;
}

export function UploadImageAsset({ documentId, onUploadComplete }: UploadImageAssetProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      return;
    }

    // Check if it's an image
    if (validation.category !== 'image') {
      toast.error('Please select an image file (JPEG, PNG, or WebP)');
      return;
    }

    setIsUploading(true);
    toast.info('Uploading image...');

    try {
      const supabase = createClient();

      // Generate unique filename
      const timestamp = Date.now();
      const sanitized = sanitizeFilename(file.name);
      const filename = `${timestamp}_${sanitized}`;
      const storagePath = `${documentId}/references/${filename}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('creator-assets')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('creator-assets')
        .getPublicUrl(storagePath);

      // Create database record
      const result = await createAssetRecord({
        title: file.name,
        assetType: 'IMAGE_REFERENCE',
        storageUrl: publicUrl,
        storagePath: storagePath,
        mimeType: file.type,
        fileSize: file.size,
        parentDocumentId: documentId,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create asset record');
      }

      toast.success('Reference image uploaded successfully!');

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Trigger callback
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        variant="outline"
        className="w-full sm:w-auto"
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <ImageIcon className="mr-2 h-4 w-4" />
            Upload Reference Image
          </>
        )}
      </Button>
    </div>
  );
}