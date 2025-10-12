'use client';

import { useState } from 'react';
import { Edit, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { editAsset } from '@/app/actions/editAsset';
import { useRouter } from 'next/navigation';
import type { AssetType } from '@/lib/types/assets';

// Asset type configuration with metadata fields (copied from UploadAsset.tsx)
const ASSET_TYPE_CONFIG = {
  SCRIPT: {
    label: 'Script',
    metadataFields: [],
  },
  OUTLINE: {
    label: 'Outline',
    metadataFields: [],
  },
  CHARACTER_SHEET: {
    label: 'Character Sheet',
    metadataFields: ['characterName'],
  },
  DIALOGUE_SAMPLE: {
    label: 'Dialogue Sample',
    metadataFields: ['sceneNumber'],
  },
  TREATMENT: {
    label: 'Treatment',
    metadataFields: [],
  },
  IMAGE_REFERENCE: {
    label: 'Image Reference',
    metadataFields: ['subject'],
  },
  IMAGE_CONCEPT: {
    label: 'Concept Art',
    metadataFields: ['subject'],
  },
  VOICE_SAMPLE: {
    label: 'Voice Sample',
    metadataFields: ['characterName', 'emotion'],
  },
  AUDIO_PILOT: {
    label: 'Audio Pilot',
    metadataFields: [],
  },
  VIDEO_REFERENCE: {
    label: 'Video Reference',
    metadataFields: ['referenceType'],
  },
  MOOD_BOARD: {
    label: 'Mood Board',
    metadataFields: [],
  },
  PITCH_DECK: {
    label: 'Pitch Deck',
    metadataFields: [],
  },
} as const;

const METADATA_FIELD_LABELS: Record<string, string> = {
  characterName: 'Character Name',
  sceneNumber: 'Scene Number',
  subject: 'Subject/Description',
  emotion: 'Emotion/Context',
  referenceType: 'Reference Type (e.g., style, tone, cinematography)',
  draftVersion: 'Draft Version',
};

interface EditAssetDialogProps {
  assetId: string;
  currentTitle: string;
  currentType: AssetType;
  currentMetadata?: Record<string, string | number | boolean>;
}

export function EditAssetDialog({
  assetId,
  currentTitle,
  currentType,
  currentMetadata = {},
}: EditAssetDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [assetType, setAssetType] = useState<AssetType>(currentType);
  const [metadata, setMetadata] = useState(currentMetadata);
  const router = useRouter();

  const config = ASSET_TYPE_CONFIG[assetType];
  const metadataFields = config?.metadataFields || [];

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title cannot be empty');
      return;
    }

    setIsSaving(true);
    toast.info('Saving changes...');

    try {
      const result = await editAsset({
        assetId,
        title: title.trim(),
        assetType,
        metadata,
      });

      if (result.success) {
        toast.success(`Updated "${result.assetTitle}"`);
        setIsOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to update asset');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('An error occurred while saving');
    } finally {
      setIsSaving(false);
    }
  };

  const updateMetadata = (field: string, value: string) => {
    setMetadata(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAssetTypeChange = (newType: AssetType) => {
    setAssetType(newType);
    // Clear metadata when changing types since fields may be different
    setMetadata({});
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Asset</DialogTitle>
          <DialogDescription>
            Update the asset details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Asset title"
            />
          </div>

          {/* Asset Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Asset Type</Label>
            <Select value={assetType} onValueChange={handleAssetTypeChange}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ASSET_TYPE_CONFIG).map(([key, conf]) => (
                  <SelectItem key={key} value={key}>
                    {conf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Metadata Fields */}
          {metadataFields.length > 0 && (
            <div className="space-y-2">
              <Label>Additional Information</Label>
              {metadataFields.map((field) => (
                <div key={field} className="space-y-1">
                  <Label htmlFor={field} className="text-sm text-muted-foreground">
                    {METADATA_FIELD_LABELS[field] || field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </Label>
                  <Input
                    id={field}
                    value={String(metadata[field] || '')}
                    onChange={(e) => updateMetadata(field, e.target.value)}
                    placeholder={`Enter ${METADATA_FIELD_LABELS[field]?.toLowerCase() || field.toLowerCase()}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}