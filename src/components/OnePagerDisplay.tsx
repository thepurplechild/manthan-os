'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Check, FileText, Palette, Users, Target, Film, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface OnePagerDisplayProps {
  data: {
    logline: string;
    synopsis: string;
    keyCharacters: Array<{
      name: string;
      role: string;
      description: string;
    }>;
    genreAndTone: {
      primaryGenre: string;
      subGenres: string[];
      tone: string[];
    };
    comparableFilms: Array<{
      title: string;
      reason: string;
    }>;
    visualStyle: {
      cinematography: string;
      colorPalette: string[];
      mood: string;
    };
    targetAudience: {
      demographics: string;
      psychographics: string;
    };
    productionNotes: {
      budgetTier: string;
      locationCount: number;
      specialRequirements: string[];
    };
    scriptTitle: string;
    generatedAt: string;
  };
}

export function OnePagerDisplay({ data }: OnePagerDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    const formatted = `
═══════════════════════════════════════════════════════════════
                        ONE-PAGER PITCH DOCUMENT
═══════════════════════════════════════════════════════════════

TITLE: ${data.scriptTitle}
Generated: ${new Date(data.generatedAt).toLocaleDateString()}

───────────────────────────────────────────────────────────────
LOGLINE
───────────────────────────────────────────────────────────────
${data.logline}

───────────────────────────────────────────────────────────────
SYNOPSIS
───────────────────────────────────────────────────────────────
${data.synopsis}

───────────────────────────────────────────────────────────────
KEY CHARACTERS
───────────────────────────────────────────────────────────────
${data.keyCharacters.map((char, i) => `
${i + 1}. ${char.name} (${char.role})
   ${char.description}`).join('\n')}

───────────────────────────────────────────────────────────────
GENRE & TONE
───────────────────────────────────────────────────────────────
Primary Genre: ${data.genreAndTone.primaryGenre}
Sub-Genres: ${data.genreAndTone.subGenres.join(', ')}
Tone: ${data.genreAndTone.tone.join(', ')}

───────────────────────────────────────────────────────────────
COMPARABLE FILMS
───────────────────────────────────────────────────────────────
${data.comparableFilms.map((film, i) => `${i + 1}. ${film.title}\n   ${film.reason}`).join('\n\n')}

───────────────────────────────────────────────────────────────
VISUAL STYLE
───────────────────────────────────────────────────────────────
Cinematography: ${data.visualStyle.cinematography}
Color Palette: ${data.visualStyle.colorPalette.join(', ')}
Mood: ${data.visualStyle.mood}

───────────────────────────────────────────────────────────────
TARGET AUDIENCE
───────────────────────────────────────────────────────────────
Demographics: ${data.targetAudience.demographics}
Psychographics: ${data.targetAudience.psychographics}

───────────────────────────────────────────────────────────────
PRODUCTION NOTES
───────────────────────────────────────────────────────────────
Budget Tier: ${data.productionNotes.budgetTier}
Location Count: ${data.productionNotes.locationCount}
Special Requirements: ${data.productionNotes.specialRequirements.join(', ')}

═══════════════════════════════════════════════════════════════
    `.trim();

    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    toast.success('One-pager copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">One-Pager Pitch Document</h2>
          <p className="text-sm text-muted-foreground">
            Comprehensive pitch-ready document
          </p>
        </div>
        <Button onClick={handleCopyAll} variant="outline">
          {copied ? (
            <Check className="mr-2 h-4 w-4 text-green-500" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          Export Full Document
        </Button>
      </div>

      {/* Logline Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Logline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium leading-relaxed">{data.logline}</p>
        </CardContent>
      </Card>

      {/* Synopsis Card */}
      <Card>
        <CardHeader>
          <CardTitle>Synopsis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{data.synopsis}</p>
        </CardContent>
      </Card>

      {/* Key Characters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Key Characters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.keyCharacters.map((character, index) => (
              <div key={index}>
                {index > 0 && <Separator className="my-4" />}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{character.name}</h4>
                    <Badge variant="secondary">{character.role}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{character.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Genre & Tone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Genre & Tone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">Primary Genre</h4>
            <Badge className="text-base px-3 py-1">{data.genreAndTone.primaryGenre}</Badge>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">Sub-Genres</h4>
            <div className="flex flex-wrap gap-2">
              {data.genreAndTone.subGenres.map((genre, i) => (
                <Badge key={i} variant="secondary">{genre}</Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">Tone</h4>
            <div className="flex flex-wrap gap-2">
              {data.genreAndTone.tone.map((tone, i) => (
                <Badge key={i} variant="outline">{tone}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparable Films */}
      <Card>
        <CardHeader>
          <CardTitle>Comparable Films</CardTitle>
          <CardDescription>Market positioning and references</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.comparableFilms.map((film, index) => (
              <div key={index} className="border-l-2 border-primary pl-4">
                <h4 className="font-semibold text-sm">{film.title}</h4>
                <p className="text-sm text-muted-foreground">{film.reason}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Visual Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Visual Style
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">Cinematography</h4>
            <p className="text-sm text-muted-foreground">{data.visualStyle.cinematography}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">Color Palette</h4>
            <div className="flex flex-wrap gap-2">
              {data.visualStyle.colorPalette.map((color, i) => (
                <Badge key={i} variant="secondary">{color}</Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">Mood</h4>
            <p className="text-sm text-muted-foreground">{data.visualStyle.mood}</p>
          </div>
        </CardContent>
      </Card>

      {/* Target Audience */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Target Audience
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold mb-1">Demographics</h4>
            <p className="text-sm text-muted-foreground">{data.targetAudience.demographics}</p>
          </div>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-1">Psychographics</h4>
            <p className="text-sm text-muted-foreground">{data.targetAudience.psychographics}</p>
          </div>
        </CardContent>
      </Card>

      {/* Production Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Production Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold mb-1">Budget Tier</h4>
              <Badge variant="default">{data.productionNotes.budgetTier}</Badge>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1">Location Count</h4>
              <Badge variant="secondary">{data.productionNotes.locationCount} locations</Badge>
            </div>
          </div>
          {data.productionNotes.specialRequirements.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Special Requirements</h4>
              <ul className="space-y-1">
                {data.productionNotes.specialRequirements.map((req, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start">
                    <span className="text-primary mr-2">•</span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}