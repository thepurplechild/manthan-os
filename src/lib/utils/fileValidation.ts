import {
  MIME_TYPE_TO_ASSET_TYPE,
  MAX_FILE_SIZES,
  detectAssetTypeFromFile,
  getFileExtension,
  type AssetType
} from '@/lib/types/assets';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  suggestedTypes?: AssetType[];
  category?: string;
}

export function validateFile(
  file: File,
  expectedType?: AssetType
): FileValidationResult {
  // Detect possible types for this file
  const detectedTypes = detectAssetTypeFromFile(file);

  if (detectedTypes.length === 0) {
    // Check MIME type as fallback
    const mimeTypes = MIME_TYPE_TO_ASSET_TYPE[file.type];
    if (!mimeTypes || mimeTypes.length === 0) {
      return {
        valid: false,
        error: `Unsupported file type: ${file.type || 'unknown'}`,
      };
    }
  }

  // Determine category
  let category: string = 'document';
  const ext = getFileExtension(file.name);

  if (file.type.startsWith('image/')) category = 'image';
  else if (file.type.startsWith('audio/')) category = 'audio';
  else if (file.type.startsWith('video/')) category = 'video';
  else if (file.type.startsWith('text/')) category = 'text';
  else if (ext === 'fdx') category = 'text';

  // Check file size against category limit
  const maxSize = MAX_FILE_SIZES[category] || MAX_FILE_SIZES.document;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size for ${category}: ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
    };
  }

  // If expected type provided, validate it matches
  if (expectedType) {
    const allPossibleTypes = [...detectedTypes, ...(MIME_TYPE_TO_ASSET_TYPE[file.type] || [])];
    if (!allPossibleTypes.includes(expectedType)) {
      return {
        valid: false,
        error: `File type ${file.type} is not valid for ${expectedType}`,
      };
    }
  }

  return {
    valid: true,
    suggestedTypes: detectedTypes,
    category,
  };
}


export function sanitizeFilename(filename: string): string {
  // Remove special characters, keep alphanumeric, dash, underscore, dot
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}