'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { formatFileSize } from '@/lib/types/assets';
import {
  FileText,
  ListTree,
  User,
  MessageSquare,
  Image as ImageIcon,
  Palette,
  Mic,
  Video,
  Presentation,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Asset {
  id: string;
  title: string;
  asset_type: string;
  storage_url: string;
  mime_type: string;
  file_size_bytes: number;
  asset_metadata: Record<string, unknown>;
  created_at: string;
}

interface AssetGalleryProps {
  assets: Asset[];
}

const ASSET_TYPE_INFO = {
  SCRIPT: { icon: FileText, label: 'Scripts', color: 'bg-blue-500' },
  OUTLINE: { icon: ListTree, label: 'Outlines', color: 'bg-green-500' },
  CHARACTER_SHEET: { icon: User, label: 'Characters', color: 'bg-purple-500' },
  DIALOGUE_SAMPLE: { icon: MessageSquare, label: 'Dialogue', color: 'bg-yellow-500' },
  IMAGE_REFERENCE: { icon: ImageIcon, label: 'Images', color: 'bg-pink-500' },
  IMAGE_CONCEPT: { icon: Palette, label: 'Concept Art', color: 'bg-indigo-500' },
  VOICE_SAMPLE: { icon: Mic, label: 'Voice Samples', color: 'bg-red-500' },
  VIDEO_REFERENCE: { icon: Video, label: 'Videos', color: 'bg-orange-500' },
  MOOD_BOARD: { icon: Presentation, label: 'Mood Boards', color: 'bg-teal-500' },
};

export function AssetGallery({ assets }: AssetGalleryProps) {
  if (assets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reference Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No reference materials uploaded yet. Upload scripts, images, audio, or video to use as references for the packaging agent.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group assets by type
  const groupedAssets = assets.reduce((acc, asset) => {
    const type = asset.asset_type as keyof typeof ASSET_TYPE_INFO;
    if (!acc[type]) acc[type] = [];
    acc[type].push(asset);
    return acc;
  }, {} as Record<string, Asset[]>);

  const assetTypes = Object.keys(groupedAssets) as (keyof typeof ASSET_TYPE_INFO)[];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Reference Assets</CardTitle>
          <Badge variant="secondary">{assets.length} file{assets.length !== 1 ? 's' : ''}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={assetTypes[0]} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${assetTypes.length}, 1fr)` }}>
            {assetTypes.map((type) => {
              const info = ASSET_TYPE_INFO[type];
              const Icon = info.icon;
              const count = groupedAssets[type].length;
              return (
                <TabsTrigger key={type} value={type} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{info.label}</span>
                  <Badge variant="secondary" className="ml-1">{count}</Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {assetTypes.map((type) => (
            <TabsContent key={type} value={type} className="mt-4">
              <AssetTypeSection assets={groupedAssets[type]} type={type} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function AssetTypeSection({ assets, type }: { assets: Asset[]; type: keyof typeof ASSET_TYPE_INFO }) {
  const isImage = type === 'IMAGE_REFERENCE' || type === 'IMAGE_CONCEPT';
  const isAudio = type === 'VOICE_SAMPLE';
  const isVideo = type === 'VIDEO_REFERENCE';

  if (isImage) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {assets.map((asset) => (
          <div key={asset.id} className="space-y-2">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              <Image
                src={asset.storage_url}
                alt={asset.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              />
            </div>
            <AssetInfo asset={asset} />
          </div>
        ))}
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className="space-y-3">
        {assets.map((asset) => (
          <div key={asset.id} className="border rounded-lg p-4 space-y-3">
            <AssetInfo asset={asset} showMetadata />
            <audio controls className="w-full" preload="metadata">
              <source src={asset.storage_url} type={asset.mime_type} />
              Your browser does not support the audio element.
            </audio>
          </div>
        ))}
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="space-y-4">
        {assets.map((asset) => (
          <div key={asset.id} className="border rounded-lg p-4 space-y-3">
            <AssetInfo asset={asset} showMetadata />
            <video controls className="w-full rounded-lg" preload="metadata">
              <source src={asset.storage_url} type={asset.mime_type} />
              Your browser does not support the video element.
            </video>
          </div>
        ))}
      </div>
    );
  }

  // Document assets (scripts, outlines, etc.)
  return (
    <div className="grid gap-3">
      {assets.map((asset) => (
        <div key={asset.id} className="border rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <AssetInfo asset={asset} showMetadata />
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={asset.storage_url} download target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AssetInfo({ asset, showMetadata = false }: { asset: Asset; showMetadata?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium truncate" title={asset.title}>
        {asset.title}
      </p>
      {showMetadata && asset.asset_metadata && Object.keys(asset.asset_metadata).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(asset.asset_metadata).map(([key, value]) => {
            if (!value || key === 'mimeType') return null;
            return (
              <Badge key={key} variant="outline" className="text-xs">
                {String(value)}
              </Badge>
            );
          })}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatFileSize(asset.file_size_bytes)}</span>
        <span>{formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })}</span>
      </div>
    </div>
  );
}