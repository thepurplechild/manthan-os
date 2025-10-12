'use client';

import { Project, ASSET_TYPE_COLORS, ASSET_TYPE_LABELS, formatFileSize, getTotalAssetCount } from '@/lib/types/projects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { DeleteProjectButton } from './DeleteProjectButton';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const totalAssets = getTotalAssetCount(project.asset_counts);
  const assetEntries = project.asset_counts ? Object.entries(project.asset_counts) : [];

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Thumbnail */}
      <Link href={`/dashboard/projects/${project.id}`}>
        <div className="relative aspect-video w-full bg-muted overflow-hidden">
          {project.cover_image_url ? (
            <Image
              src={project.cover_image_url}
              alt={project.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <FileText className="h-16 w-16 text-gray-400" />
            </div>
          )}

          {/* Asset count overlay */}
          <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-sm font-medium">
            {totalAssets} {totalAssets === 1 ? 'asset' : 'assets'}
          </div>
        </div>
      </Link>

      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate" title={project.title}>
              <Link
                href={`/dashboard/projects/${project.id}`}
                className="hover:underline"
              >
                {project.title}
              </Link>
            </CardTitle>
            {project.description && (
              <CardDescription className="line-clamp-2 mt-1">
                {project.description}
              </CardDescription>
            )}
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DeleteProjectButton
              projectId={project.id}
              projectTitle={project.title}
              assetCount={getTotalAssetCount(project.asset_counts)}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Asset type badges */}
        {assetEntries.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {assetEntries.map(([type, count]) => (
              <Badge
                key={type}
                variant="secondary"
                className={`${ASSET_TYPE_COLORS[type]} text-white text-xs`}
              >
                {ASSET_TYPE_LABELS[type] || type}: {count}
              </Badge>
            ))}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatFileSize(project.total_size_bytes)}</span>
          <span>{formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button asChild className="flex-1" size="sm">
            <Link href={`/dashboard/projects/${project.id}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Project
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}