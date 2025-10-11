'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { AssetType } from '@/lib/types/assets';

interface Asset {
  id: string;
  title: string;
  asset_type: AssetType;
  storage_url: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
}

interface AssetGalleryProps {
  assets: Asset[];
}

export function AssetGallery({ assets }: AssetGalleryProps) {
  if (assets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reference Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No reference images uploaded yet. Upload images to use as visual references for the packaging agent.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Reference Assets</CardTitle>
          <Badge variant="secondary">{assets.length} image{assets.length !== 1 ? 's' : ''}</Badge>
        </div>
      </CardHeader>
      <CardContent>
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
              <div className="space-y-1">
                <p className="text-sm font-medium truncate" title={asset.title}>
                  {asset.title}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatFileSize(asset.file_size_bytes)}</span>
                  <span>{formatDistanceToNow(new Date(asset.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}