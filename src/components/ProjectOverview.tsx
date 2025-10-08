'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  Download,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProjectOverviewProps {
  uploadedAt: string;
  fileSize: number;
  status: string;
  hasCharacterBible: boolean;
  hasSynopsis: boolean;
  hasLoglines: boolean;
  hasOnePager: boolean;
  downloadUrl?: string;
  onDelete?: () => void;
}

export function ProjectOverview({
  uploadedAt,
  fileSize,
  status,
  hasCharacterBible,
  hasSynopsis,
  hasLoglines,
  hasOnePager,
  downloadUrl,
  onDelete,
}: ProjectOverviewProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const completionPercentage = () => {
    let completed = 0;
    if (hasCharacterBible) completed += 25;
    if (hasSynopsis) completed += 25;
    if (hasLoglines) completed += 25;
    if (hasOnePager) completed += 25;
    return completed;
  };

  const analysisItems = [
    { name: 'Character Bible', completed: hasCharacterBible },
    { name: 'Synopsis', completed: hasSynopsis },
    { name: 'Loglines', completed: hasLoglines },
    { name: 'One-Pager', completed: hasOnePager },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">File Size</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(fileSize)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Uploaded</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDistanceToNow(new Date(uploadedAt), { addSuffix: true })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={status === 'READY' ? 'default' : 'secondary'}>
              {status}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Completion */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Progress</CardTitle>
          <CardDescription>
            {completionPercentage()}% complete • {analysisItems.filter(i => i.completed).length} of {analysisItems.length} analyses generated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Progress Bar */}
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${completionPercentage()}%` }}
              />
            </div>

            {/* Analysis Checklist */}
            <div className="grid gap-2 mt-4">
              {analysisItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  {item.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                  )}
                  <span className={item.completed ? 'text-sm' : 'text-sm text-muted-foreground'}>
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          {downloadUrl && (
            <Button variant="outline" asChild>
              <a href={downloadUrl} download>
                <Download className="mr-2 h-4 w-4" />
                Download Script
              </a>
            </Button>
          )}
          {onDelete && (
            <Button onClick={onDelete} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Project
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}