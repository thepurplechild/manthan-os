'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Twitter, Mail, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface SynopsisDisplayProps {
  tweet: string;
  short: string;
  long: string;
  scriptTitle: string;
  generatedAt: string;
}

export function SynopsisDisplay({ tweet, short, long, scriptTitle, generatedAt }: SynopsisDisplayProps) {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const handleCopy = async (content: string, format: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedFormat(format);
    toast.success(`${format} synopsis copied to clipboard`);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleCopyAll = async () => {
    const allFormats = `
SYNOPSIS FOR: ${scriptTitle}
Generated: ${new Date(generatedAt).toLocaleDateString()}

═══════════════════════════════════════════════════════════════

TWEET VERSION (${tweet.length} characters):
${tweet}

═══════════════════════════════════════════════════════════════

SHORT VERSION:
${short}

═══════════════════════════════════════════════════════════════

LONG VERSION:
${long}

═══════════════════════════════════════════════════════════════
    `.trim();

    await navigator.clipboard.writeText(allFormats);
    toast.success('All synopsis formats copied to clipboard');
  };

  // Count words helper
  const countWords = (text: string) => {
    return text.trim().split(/\s+/).length;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Synopsis</h2>
          <p className="text-sm text-muted-foreground">
            Multiple formats for different use cases
          </p>
        </div>
        <Button onClick={handleCopyAll} variant="outline">
          <Copy className="mr-2 h-4 w-4" />
          Export All Formats
        </Button>
      </div>

      <Tabs defaultValue="tweet" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tweet">
            <Twitter className="mr-2 h-4 w-4" />
            Tweet
          </TabsTrigger>
          <TabsTrigger value="short">
            <Mail className="mr-2 h-4 w-4" />
            Short
          </TabsTrigger>
          <TabsTrigger value="long">
            <FileText className="mr-2 h-4 w-4" />
            Long
          </TabsTrigger>
        </TabsList>

        {/* TWEET FORMAT */}
        <TabsContent value="tweet" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle>Tweet Version</CardTitle>
                  <CardDescription>
                    Perfect for social media promotion
                  </CardDescription>
                </div>
                <Button
                  onClick={() => handleCopy(tweet, 'Tweet')}
                  variant="ghost"
                  size="sm"
                >
                  {copiedFormat === 'Tweet' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm leading-relaxed">{tweet}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Character count: {tweet.length}/280</span>
                <Badge variant={tweet.length <= 280 ? 'default' : 'destructive'}>
                  {tweet.length <= 280 ? 'Valid' : 'Too long'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SHORT FORMAT */}
        <TabsContent value="short" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle>Short Synopsis</CardTitle>
                  <CardDescription>
                    Ideal for email pitches and quick reads
                  </CardDescription>
                </div>
                <Button
                  onClick={() => handleCopy(short, 'Short')}
                  variant="ghost"
                  size="sm"
                >
                  {copiedFormat === 'Short' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm leading-relaxed">{short}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Word count: {countWords(short)} words</span>
                <Badge variant="secondary">~150 words target</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LONG FORMAT */}
        <TabsContent value="long" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle>Detailed Synopsis</CardTitle>
                  <CardDescription>
                    Comprehensive overview for pitch decks
                  </CardDescription>
                </div>
                <Button
                  onClick={() => handleCopy(long, 'Long')}
                  variant="ghost"
                  size="sm"
                >
                  {copiedFormat === 'Long' ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{long}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Word count: {countWords(long)} words</span>
                <Badge variant="secondary">~500 words target</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}