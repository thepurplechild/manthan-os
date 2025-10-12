'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { validateFile, sanitizeFilename } from '@/lib/utils/fileValidation';
import { createAssetRecord } from '@/app/actions/uploadAsset';
import { detectAssetTypeFromFile } from '@/lib/types/assets';
import { toast } from 'sonner';
import {
  Upload,
  Loader2,
  FileText,
  ListTree,
  User,
  MessageSquare,
  Image,
  Palette,
  Mic,
  Video,
  Presentation
} from 'lucide-react';

interface UploadAssetProps {
  documentId: string;
  onUploadComplete?: () => void;
}

const ASSET_TYPE_CONFIG = {
  SCRIPT: {
    label: 'Script',
    description: 'Final Draft screenplay (.fdx) or PDF/Word script',
    icon: FileText,
    accept: '.fdx,.pdf,.docx,.doc',
    maxSize: 10 * 1024 * 1024,
    folder: 'scripts',
    metadataFields: [],
  },
  OUTLINE: {
    label: 'Outline',
    description: 'Story outline or beat sheet',
    icon: ListTree,
    accept: '.docx,.pdf,.txt,.doc',
    maxSize: 5 * 1024 * 1024,
    folder: 'outlines',
    metadataFields: [],
  },
  CHARACTER_SHEET: {
    label: 'Character Sheet',
    description: 'Character bio or description',
    icon: User,
    accept: '.docx,.pdf,.txt,.doc',
    maxSize: 5 * 1024 * 1024,
    folder: 'characters',
    metadataFields: ['characterName'],
  },
  DIALOGUE_SAMPLE: {
    label: 'Dialogue Sample',
    description: 'Scene or dialogue excerpt',
    icon: MessageSquare,
    accept: '.docx,.pdf,.txt,.doc',
    maxSize: 5 * 1024 * 1024,
    folder: 'dialogue',
    metadataFields: ['sceneNumber'],
  },
  IMAGE_REFERENCE: {
    label: 'Image Reference',
    description: 'Location or character photo',
    icon: Image,
    accept: 'image/jpeg,image/png,image/webp',
    maxSize: 20 * 1024 * 1024,
    folder: 'images/references',
    metadataFields: ['subject'],
  },
  IMAGE_CONCEPT: {
    label: 'Concept Art',
    description: 'Visual concept or illustration',
    icon: Palette,
    accept: 'image/jpeg,image/png,image/webp',
    maxSize: 20 * 1024 * 1024,
    folder: 'images/concepts',
    metadataFields: ['subject'],
  },
  VOICE_SAMPLE: {
    label: 'Voice Sample',
    description: 'Character voice recording',
    icon: Mic,
    accept: 'audio/mpeg,audio/wav,audio/mp4,.mp3,.wav,.m4a',
    maxSize: 50 * 1024 * 1024,
    folder: 'audio/voices',
    metadataFields: ['characterName', 'emotion'],
  },
  VIDEO_REFERENCE: {
    label: 'Video Reference',
    description: 'Visual style or mood reference',
    icon: Video,
    accept: 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm',
    maxSize: 200 * 1024 * 1024,
    folder: 'video',
    metadataFields: ['referenceType'],
  },
  MOOD_BOARD: {
    label: 'Mood Board',
    description: 'Visual style presentation',
    icon: Presentation,
    accept: '.pdf,.pptx,.ppt',
    maxSize: 30 * 1024 * 1024,
    folder: 'moodboards',
    metadataFields: [],
  },
} as const;

const METADATA_FIELD_LABELS: Record<string, string> = {
  characterName: 'Character Name',
  sceneNumber: 'Scene Number',
  subject: 'Subject/Description',
  emotion: 'Emotion/Context',
  referenceType: 'Reference Type (e.g., style, tone, cinematography)',
};

export function UploadAsset({ documentId, onUploadComplete }: UploadAssetProps) {
  const [selectedType, setSelectedType] = useState<keyof typeof ASSET_TYPE_CONFIG>('IMAGE_REFERENCE');
  const [isUploading, setIsUploading] = useState(false);
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = ASSET_TYPE_CONFIG[selectedType];
  const Icon = config.icon;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file, selectedType);
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Check file size
    if (file.size > config.maxSize) {
      toast.error(`File too large. Maximum size: ${(config.maxSize / 1024 / 1024).toFixed(0)}MB`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Auto-suggest type based on file
    const suggestedTypes = detectAssetTypeFromFile(file);
    if (suggestedTypes.length > 0 && suggestedTypes[0] !== selectedType) {
      const suggested = suggestedTypes[0];
      if (ASSET_TYPE_CONFIG[suggested as keyof typeof ASSET_TYPE_CONFIG]) {
        toast.info(`This looks like a ${ASSET_TYPE_CONFIG[suggested as keyof typeof ASSET_TYPE_CONFIG].label}. Type updated.`);
        setSelectedType(suggested as keyof typeof ASSET_TYPE_CONFIG);
      }
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setIsUploading(true);
    toast.info(`Uploading ${config.label.toLowerCase()}...`);

    try {
      const supabase = createClient();

      // Generate storage path
      const timestamp = Date.now();
      const sanitized = sanitizeFilename(selectedFile.name);
      const filename = `${timestamp}_${sanitized}`;
      const storagePath = `${documentId}/${config.folder}/${filename}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('creator-assets')
        .upload(storagePath, selectedFile, {
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

      // Prepare asset metadata
      const assetMetadata: Record<string, unknown> = {};

      // Add user-provided metadata
      Object.keys(metadata).forEach(key => {
        if (metadata[key]) {
          assetMetadata[key] = metadata[key];
        }
      });

      // Add file-specific metadata
      if (selectedFile.type.startsWith('image/')) {
        // For images, we could add dimensions later via Image.onLoad
        assetMetadata.mimeType = selectedFile.type;
      }

      // Create database record
      const result = await createAssetRecord({
        title: selectedFile.name,
        assetType: selectedType,
        storageUrl: publicUrl,
        storagePath: storagePath,
        mimeType: selectedFile.type,
        fileSize: selectedFile.size,
        parentDocumentId: documentId,
        metadata: assetMetadata,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create asset record');
      }

      toast.success(`${config.label} uploaded successfully!`);

      // Reset form
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);
      setMetadata({});

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

  const hasMetadataFields = config.metadataFields.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Reference Asset</CardTitle>
        <CardDescription>
          Add scripts, outlines, character sheets, images, audio, or video references
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Asset Type Selector */}
        <div className="space-y-2">
          <Label htmlFor="asset-type">Asset Type</Label>
          <Select
            value={selectedType}
            onValueChange={(value) => {
              setSelectedType(value as keyof typeof ASSET_TYPE_CONFIG);
              setMetadata({});
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            disabled={isUploading}
          >
            <SelectTrigger id="asset-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ASSET_TYPE_CONFIG).map(([key, typeConfig]) => {
                const TypeIcon = typeConfig.icon;
                return (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-start gap-3 py-1">
                      <TypeIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-medium">{typeConfig.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {typeConfig.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* File Input */}
        <div className="space-y-2">
          <Label htmlFor="file-upload">Select File</Label>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              accept={config.accept}
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full"
            >
              <Icon className="mr-2 h-4 w-4" />
              {selectedFile ? selectedFile.name : `Choose ${config.label}`}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Max size: {(config.maxSize / 1024 / 1024).toFixed(0)}MB
          </p>
        </div>

        {/* Metadata Fields */}
        {hasMetadataFields && selectedFile && (
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-sm font-medium">Additional Information (Optional)</Label>
            {config.metadataFields.map((field) => (
              <div key={field} className="space-y-1">
                <Label htmlFor={field} className="text-sm">
                  {METADATA_FIELD_LABELS[field]}
                </Label>
                <Input
                  id={field}
                  value={metadata[field] || ''}
                  onChange={(e) => setMetadata({ ...metadata, [field]: e.target.value })}
                  placeholder={`Enter ${METADATA_FIELD_LABELS[field].toLowerCase()}`}
                  disabled={isUploading}
                />
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload {config.label}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}