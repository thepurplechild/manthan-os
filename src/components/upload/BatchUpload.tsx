'use client';

import { useState, useRef } from 'react';
import { Upload, X, FileText, Image, Music, Video, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { detectAssetTypeFromFile, ASSET_TYPE_CONFIG, sanitizeFilename } from '@/lib/types/assets';
import { ASSET_TYPE_COLORS, ASSET_TYPE_LABELS } from '@/lib/types/projects';
import type { AssetType } from '@/lib/types/assets';

interface FileUpload {
  id: string;
  file: File;
  suggestedType: AssetType;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface BatchUploadProps {
  projectId: string;
}

export function BatchUpload({ projectId }: BatchUploadProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;

    const uploadFiles: FileUpload[] = Array.from(newFiles).map(file => {
      const suggestedTypes = detectAssetTypeFromFile(file);
      return {
        id: `${Date.now()}-${Math.random()}`,
        file,
        suggestedType: suggestedTypes[0] || 'SCRIPT',
        progress: 0,
        status: 'pending' as const,
      };
    });

    setFiles(prev => [...prev, ...uploadFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const uploadFile = async (fileUpload: FileUpload): Promise<boolean> => {
    const supabase = createClient();

    try {
      // Get current user first - CRITICAL FIX
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      // Update status
      setFiles(prev => prev.map(f =>
        f.id === fileUpload.id ? { ...f, status: 'uploading' as const, progress: 0 } : f
      ));

      // Generate storage path
      const timestamp = Date.now();
      const sanitized = sanitizeFilename(fileUpload.file.name);
      const filename = `${timestamp}_${sanitized}`;
      const config = ASSET_TYPE_CONFIG[fileUpload.suggestedType];
      const storagePath = `${projectId}/${config.folder}/${filename}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('creator-assets')
        .upload(storagePath, fileUpload.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: fileUpload.file.type,
        });

      if (uploadError) throw uploadError;

      // Update progress
      setFiles(prev => prev.map(f =>
        f.id === fileUpload.id ? { ...f, progress: 50 } : f
      ));

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('creator-assets')
        .getPublicUrl(storagePath);

      // Create database record - FIXED: Added owner_id
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          owner_id: user.id,  // ✅ CRITICAL FIX - Added owner_id
          project_id: projectId,
          title: fileUpload.file.name,
          asset_type: fileUpload.suggestedType,
          storage_url: publicUrl,
          storage_path: storagePath,
          mime_type: fileUpload.file.type,
          file_size_bytes: fileUpload.file.size,
          processing_status: 'COMPLETED',
          is_primary: false,
        });

      if (dbError) throw dbError;

      // Success
      setFiles(prev => prev.map(f =>
        f.id === fileUpload.id ? { ...f, status: 'success' as const, progress: 100 } : f
      ));

      return true;
    } catch (error) {
      console.error('Upload error:', error);
      setFiles(prev => prev.map(f =>
        f.id === fileUpload.id
          ? { ...f, status: 'error' as const, error: error instanceof Error ? error.message : 'Upload failed' }
          : f
      ));
      return false;
    }
  };

  const handleUploadAll = async () => {
    if (files.length === 0) {
      toast.error('No files selected');
      return;
    }

    setIsUploading(true);
    toast.info(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}...`);

    const pendingFiles = files.filter(f => f.status === 'pending');

    // Upload files sequentially (or in parallel if you prefer)
    for (const file of pendingFiles) {
      await uploadFile(file);
    }

    const successCount = files.filter(f => f.status === 'success').length;
    const errorCount = files.filter(f => f.status === 'error').length;

    setIsUploading(false);

    if (errorCount === 0) {
      toast.success(`Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}!`);
      setTimeout(() => {
        router.push(`/dashboard/projects/${projectId}`);
      }, 1000);
    } else {
      toast.warning(`Uploaded ${successCount} files, ${errorCount} failed`);
    }
  };

  const getFileIcon = (type: AssetType) => {
    if (type.includes('IMAGE')) return Image;
    if (type.includes('AUDIO') || type.includes('VOICE')) return Music;
    if (type.includes('VIDEO')) return Video;
    return FileText;
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
        `}
      >
        <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">
          Drop files here or click to browse
        </p>
        <p className="text-sm text-muted-foreground">
          Upload multiple assets at once. Files will be auto-detected.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Selected Files ({files.length})
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setFiles([])}
                disabled={isUploading}
              >
                Clear All
              </Button>
              <Button
                onClick={handleUploadAll}
                disabled={isUploading || files.every(f => f.status !== 'pending')}
              >
                {isUploading ? 'Uploading...' : 'Upload All'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {files.map((fileUpload) => {
              const Icon = getFileIcon(fileUpload.suggestedType);

              return (
                <Card key={fileUpload.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Icon className="h-8 w-8 text-muted-foreground flex-shrink-0 mt-1" />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="font-medium truncate">{fileUpload.file.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={`${ASSET_TYPE_COLORS[fileUpload.suggestedType]} text-white whitespace-nowrap`}
                            >
                              {ASSET_TYPE_LABELS[fileUpload.suggestedType]}
                            </Badge>
                            {fileUpload.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFile(fileUpload.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                            {fileUpload.status === 'success' && (
                              <FileCheck className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                          {(fileUpload.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>

                        {fileUpload.status === 'uploading' && (
                          <Progress value={fileUpload.progress} className="h-2" />
                        )}

                        {fileUpload.status === 'error' && (
                          <p className="text-sm text-destructive">{fileUpload.error}</p>
                        )}

                        {fileUpload.status === 'success' && (
                          <p className="text-sm text-green-600">Uploaded successfully</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}