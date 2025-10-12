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
import { deleteAsset } from '@/app/actions/deleteAsset';
import { useRouter } from 'next/navigation';

interface DeleteAssetButtonProps {
  assetId: string;
  assetTitle: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function DeleteAssetButton({
  assetId,
  assetTitle,
  variant = 'ghost',
  size = 'sm'
}: DeleteAssetButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    toast.info('Deleting asset...');

    try {
      const result = await deleteAsset(assetId);

      if (result.success) {
        toast.success(`Deleted "${result.assetTitle}"`);
        setIsOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to delete asset');
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
        <Button variant={variant} size={size}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Asset</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &ldquo;{assetTitle}&rdquo;? This action cannot be undone.
            The file will be permanently removed from storage and the database.
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
              'Delete Asset'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}