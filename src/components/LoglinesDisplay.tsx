'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Logline {
  type: string;
  label: string;
  text: string;
  description: string;
}

interface LoglinesDisplayProps {
  loglines: Logline[];
  scriptTitle: string;
  generatedAt: string;
}

const loglineIcons = {
  hero: '👤',
  conflict: '⚔️',
  highConcept: '💡',
  emotional: '❤️',
  genre: '🎬',
};

export function LoglinesDisplay({ loglines, scriptTitle, generatedAt }: LoglinesDisplayProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const handleCopy = async (logline: Logline, index: number) => {
    await navigator.clipboard.writeText(logline.text);
    setCopiedIndex(index);
    toast.success(`${logline.label} logline copied to clipboard`);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = async () => {
    const allLoglines = `
LOGLINES FOR: ${scriptTitle}
Generated: ${new Date(generatedAt).toLocaleDateString()}

${loglines.map((logline, i) => `
${i + 1}. ${logline.label.toUpperCase()}
${logline.text}

Why this works: ${logline.description}
`).join('\n')}
    `.trim();

    await navigator.clipboard.writeText(allLoglines);
    toast.success('All loglines copied to clipboard');
  };

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).length;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Loglines</h2>
          <p className="text-sm text-muted-foreground">
            5 different angles for pitching your story
          </p>
        </div>
        <Button onClick={handleCopyAll} variant="outline">
          <Copy className="mr-2 h-4 w-4" />
          Export All
        </Button>
      </div>

      {/* Quick selection pills */}
      <div className="flex flex-wrap gap-2">
        {loglines.map((logline, index) => (
          <Button
            key={index}
            variant={selectedIndex === index ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedIndex(index)}
          >
            <span className="mr-2">{loglineIcons[logline.type as keyof typeof loglineIcons]}</span>
            {logline.label}
          </Button>
        ))}
      </div>

      {/* Selected logline display */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{loglineIcons[loglines[selectedIndex].type as keyof typeof loglineIcons]}</span>
                <CardTitle>{loglines[selectedIndex].label}</CardTitle>
              </div>
              <CardDescription>{loglines[selectedIndex].description}</CardDescription>
            </div>
            <Button
              onClick={() => handleCopy(loglines[selectedIndex], selectedIndex)}
              variant="ghost"
              size="sm"
            >
              {copiedIndex === selectedIndex ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-6">
            <p className="text-base leading-relaxed font-medium">
              {loglines[selectedIndex].text}
            </p>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Word count: {countWords(loglines[selectedIndex].text)} words</span>
            <Badge variant="secondary">35-50 words optimal</Badge>
          </div>
        </CardContent>
      </Card>

      {/* All loglines grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {loglines.map((logline, index) => (
          <Card
            key={index}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedIndex === index ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedIndex(index)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{loglineIcons[logline.type as keyof typeof loglineIcons]}</span>
                  <CardTitle className="text-sm">{logline.label}</CardTitle>
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(logline, index);
                  }}
                  variant="ghost"
                  size="sm"
                >
                  {copiedIndex === index ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {logline.text}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}