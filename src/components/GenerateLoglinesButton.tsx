'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { generateLoglines } from '@/app/actions/loglines';
import { toast } from 'sonner';
import { Loader2, Lightbulb } from 'lucide-react';

export function GenerateLoglinesButton({
  documentId,
  hasExisting
}: {
  documentId: string;
  hasExisting: boolean;
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    toast.info('Generating Loglines... This may take 20-30 seconds.');

    const result = await generateLoglines(documentId);

    if (result.success) {
      toast.success('Loglines generated successfully!');
      window.location.reload();
    } else {
      toast.error(result.error || 'Failed to generate loglines');
    }

    setIsGenerating(false);
  };

  if (hasExisting) {
    return null;
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
          Generating Loglines...
        </>
      ) : (
        <>
          <Lightbulb className="mr-2 h-4 w-4" />
          Generate Loglines
        </>
      )}
    </Button>
  );
}