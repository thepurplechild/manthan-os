'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { generateCharacterBible } from '@/app/actions/characterBible';
import { toast } from 'sonner';

interface GenerateCharacterBibleButtonProps {
  documentId: string;
  hasExisting: boolean;
  hasExtractedText: boolean;
}

export function GenerateCharacterBibleButton({
  documentId,
  hasExisting,
  hasExtractedText
}: GenerateCharacterBibleButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    toast.info('Generating Character Bible... This may take 30-60 seconds.');

    const result = await generateCharacterBible(documentId);

    if (result.success) {
      toast.success('Character Bible generated successfully!');
      window.location.reload();
    } else {
      toast.error(result.error || 'Failed to generate Character Bible');
    }

    setIsGenerating(false);
  };

  if (hasExisting || !hasExtractedText) {
    return null; // Don't show button if already exists or no extracted text
  }

  return (
    <Button onClick={handleGenerate} disabled={isGenerating} className="w-full sm:w-auto">
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating Character Bible...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Character Bible
        </>
      )}
    </Button>
  );
}