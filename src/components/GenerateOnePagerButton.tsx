'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { generateOnePager } from '@/app/actions/onePager';
import { toast } from 'sonner';
import { Loader2, FileText } from 'lucide-react';

export function GenerateOnePagerButton({
  documentId,
  hasExisting,
  hasPrerequisites
}: {
  documentId: string;
  hasExisting: boolean;
  hasPrerequisites: boolean;
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!hasPrerequisites) {
      toast.error('Please generate Character Bible, Synopsis, and Loglines first');
      return;
    }

    setIsGenerating(true);
    toast.info('Generating One-Pager... This may take 30-40 seconds.');

    const result = await generateOnePager(documentId);

    if (result.success) {
      toast.success('One-Pager generated successfully!');
      window.location.reload();
    } else {
      toast.error(result.error || 'Failed to generate one-pager');
    }

    setIsGenerating(false);
  };

  if (hasExisting) {
    return null;
  }

  return (
    <Button
      onClick={handleGenerate}
      disabled={isGenerating || !hasPrerequisites}
      variant={hasPrerequisites ? "default" : "outline"}
      className="w-full sm:w-auto"
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating One-Pager...
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          Generate One-Pager
        </>
      )}
    </Button>
  );
}