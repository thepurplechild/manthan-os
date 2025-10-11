import { MIME_TYPE_TO_ASSET_TYPE, MAX_FILE_SIZES, ASSET_TYPE_CATEGORIES, AssetType } from '../types/assets';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  suggestedType?: AssetType;
  category?: string;
}

export function validateFile(
  file: File,
  expectedType?: AssetType
): FileValidationResult {
  // Check if file type is supported
  const mimeType = file.type;
  const possibleTypes = MIME_TYPE_TO_ASSET_TYPE[mimeType];

  if (!possibleTypes) {
    return {
      valid: false,
      error: `Unsupported file type: ${mimeType}`,
    };
  }

  // Determine category
  let category: string = 'document';
  if (mimeType.startsWith('image/')) category = 'image';
  else if (mimeType.startsWith('audio/')) category = 'audio';
  else if (mimeType.startsWith('video/')) category = 'video';
  else if (mimeType.startsWith('text/')) category = 'text';

  // Check file size
  const maxSize = MAX_FILE_SIZES[category];
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size for ${category}: ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
    };
  }

  // If expected type provided, validate it
  if (expectedType && !possibleTypes.includes(expectedType)) {
    return {
      valid: false,
      error: `File type ${mimeType} is not valid for ${expectedType}`,
    };
  }

  return {
    valid: true,
    suggestedType: possibleTypes[0], // Suggest first matching type
    category,
  };
}

export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
}

export function sanitizeFilename(filename: string): string {
  // Remove special characters, keep alphanumeric, dash, underscore, dot
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}