export interface Project {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  asset_counts: Record<string, number> | null;
  total_size_bytes: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export const ASSET_TYPE_COLORS: Record<string, string> = {
  SCRIPT: 'bg-blue-500',
  OUTLINE: 'bg-green-500',
  CHARACTER_SHEET: 'bg-purple-500',
  DIALOGUE_SAMPLE: 'bg-yellow-500',
  TREATMENT: 'bg-cyan-500',
  VOICE_SAMPLE: 'bg-red-500',
  AUDIO_PILOT: 'bg-pink-500',
  IMAGE_REFERENCE: 'bg-orange-500',
  IMAGE_CONCEPT: 'bg-indigo-500',
  VIDEO_REFERENCE: 'bg-teal-500',
  MOOD_BOARD: 'bg-violet-500',
  PITCH_DECK: 'bg-rose-500',
};

export const ASSET_TYPE_LABELS: Record<string, string> = {
  SCRIPT: 'Scripts',
  OUTLINE: 'Outlines',
  CHARACTER_SHEET: 'Characters',
  DIALOGUE_SAMPLE: 'Dialogue',
  TREATMENT: 'Treatments',
  VOICE_SAMPLE: 'Voice',
  AUDIO_PILOT: 'Audio',
  IMAGE_REFERENCE: 'Images',
  IMAGE_CONCEPT: 'Concepts',
  VIDEO_REFERENCE: 'Videos',
  MOOD_BOARD: 'Mood Boards',
  PITCH_DECK: 'Pitch Decks',
};

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getTotalAssetCount(asset_counts: Record<string, number> | null): number {
  if (!asset_counts) return 0;
  return Object.values(asset_counts).reduce((sum, count) => sum + count, 0);
}