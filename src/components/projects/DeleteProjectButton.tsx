'use client';

import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { deleteProject } from '@/app/actions/deleteAsset';
import { useRouter } from 'next/navigation';

interface DeleteProjectButtonProps {
  projectId: string;
  projectTitle: string;
  assetCount: number;
}

export function DeleteProjectButton({
  projectId,
  projectTitle,
  assetCount
}: DeleteProjectButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    toast.info('Deleting project...');

    try {
      const result = await deleteProject(projectId);

      if (result.success) {
        toast.success(`Deleted project "${result.projectTitle}"`);
        setIsOpen(false);
        router.push('/dashboard/projects');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('An error occurred while deleting');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Project</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &ldquo;{projectTitle}&rdquo;?
            {assetCount > 0 && (
              <span className="block mt-2 font-semibold text-destructive">
                This will permanently delete {assetCount} {assetCount === 1 ? 'asset' : 'assets'} and cannot be undone.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Project'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}