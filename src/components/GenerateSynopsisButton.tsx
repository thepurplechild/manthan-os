'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { generateSynopsis } from '@/app/actions/synopsis';
import { toast } from 'sonner';
import { Loader2, FileText } from 'lucide-react';

export function GenerateSynopsisButton({
  documentId,
  hasExisting
}: {
  documentId: string;
  hasExisting: boolean;
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    toast.info('Generating Synopsis... This may take 20-40 seconds.');

    const result = await generateSynopsis(documentId);

    if (result.success) {
      toast.success('Synopsis generated successfully!');
      window.location.reload();
    } else {
      toast.error(result.error || 'Failed to generate synopsis');
    }

    setIsGenerating(false);
  };

  if (hasExisting) {
    return null; // Don't show button if already exists
  }

  return (
    <Button
      onClick={handleGenerate}
      disabled={isGenerating}
      variant="outline"
      className="w-full sm:w-auto"
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating Synopsis...
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          Generate Synopsis
        </>
      )}
    </Button>
  );
}