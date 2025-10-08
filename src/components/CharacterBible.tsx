'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { User, Heart, TrendingUp, MessageCircle, Film, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Character {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  physicalDescription: string;
  personality: string[];
  backstory: string;
  motivations: string;
  arc: string;
  relationships: Record<string, string>;
  keyDialogue: string[];
  castingSuggestions: string[];
}

interface CharacterBibleProps {
  characters: Character[];
  scriptTitle: string;
  generatedAt: string;
}

const roleColors = {
  protagonist: 'bg-blue-500',
  antagonist: 'bg-red-500',
  supporting: 'bg-green-500',
  minor: 'bg-gray-500',
};

const roleLabels = {
  protagonist: 'Protagonist',
  antagonist: 'Antagonist',
  supporting: 'Supporting',
  minor: 'Minor',
};

export function CharacterBible({ characters, scriptTitle, generatedAt }: CharacterBibleProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCharacter = async (character: Character, index: number) => {
    const text = `
CHARACTER: ${character.name}
ROLE: ${roleLabels[character.role]}

PHYSICAL DESCRIPTION:
${character.physicalDescription}

PERSONALITY:
${character.personality.join(', ')}

BACKSTORY:
${character.backstory}

MOTIVATIONS:
${character.motivations}

CHARACTER ARC:
${character.arc}

KEY DIALOGUE:
${character.keyDialogue.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

CASTING SUGGESTIONS:
${character.castingSuggestions.join(', ')}
    `.trim();

    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success(`${character.name}'s details copied to clipboard`);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExportAll = async () => {
    const text = `
CHARACTER BIBLE
${scriptTitle}
Generated: ${new Date(generatedAt).toLocaleDateString()}

${characters.map((char, i) => `
═══════════════════════════════════════════════════════════════

CHARACTER ${i + 1}: ${char.name}
ROLE: ${roleLabels[char.role]}

PHYSICAL DESCRIPTION:
${char.physicalDescription}

PERSONALITY TRAITS:
${char.personality.map((t, j) => `${j + 1}. ${t}`).join('\n')}

BACKSTORY:
${char.backstory}

MOTIVATIONS & GOALS:
${char.motivations}

CHARACTER ARC:
${char.arc}

RELATIONSHIPS:
${Object.entries(char.relationships).map(([name, desc]) => `• ${name}: ${desc}`).join('\n')}

KEY DIALOGUE:
${char.keyDialogue.map((q, j) => `${j + 1}. "${q}"`).join('\n')}

CASTING SUGGESTIONS:
${char.castingSuggestions.map((s, j) => `${j + 1}. ${s}`).join('\n')}
`).join('\n')}

═══════════════════════════════════════════════════════════════
    `.trim();

    await navigator.clipboard.writeText(text);
    toast.success('Full Character Bible copied to clipboard');
  };

  if (!characters || characters.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Character Bible</CardTitle>
          <CardDescription>No characters found in analysis</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Character Bible</h2>
          <p className="text-sm text-muted-foreground">
            {characters.length} character{characters.length !== 1 ? 's' : ''} analyzed
          </p>
        </div>
        <Button onClick={handleExportAll} variant="outline">
          <Copy className="mr-2 h-4 w-4" />
          Export All
        </Button>
      </div>

      <div className="grid gap-6">
        {characters.map((character, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="bg-muted/50">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">{character.name}</CardTitle>
                  <Badge className={roleColors[character.role]}>
                    {roleLabels[character.role]}
                  </Badge>
                </div>
                <Button
                  onClick={() => handleCopyCharacter(character, index)}
                  variant="ghost"
                  size="sm"
                >
                  {copiedIndex === index ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">
                    <User className="mr-2 h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="personality">
                    <Heart className="mr-2 h-4 w-4" />
                    Personality
                  </TabsTrigger>
                  <TabsTrigger value="arc">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Arc
                  </TabsTrigger>
                  <TabsTrigger value="dialogue">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Dialogue
                  </TabsTrigger>
                  <TabsTrigger value="casting">
                    <Film className="mr-2 h-4 w-4" />
                    Casting
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div>
                    <h4 className="font-semibold mb-2">Physical Description</h4>
                    <p className="text-sm text-muted-foreground">{character.physicalDescription}</p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-2">Backstory</h4>
                    <p className="text-sm text-muted-foreground">{character.backstory}</p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-2">Motivations & Goals</h4>
                    <p className="text-sm text-muted-foreground">{character.motivations}</p>
                  </div>
                </TabsContent>

                <TabsContent value="personality" className="space-y-4 mt-4">
                  <div>
                    <h4 className="font-semibold mb-3">Core Personality Traits</h4>
                    <div className="flex flex-wrap gap-2">
                      {character.personality.map((trait, i) => (
                        <Badge key={i} variant="secondary">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {Object.keys(character.relationships).length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-semibold mb-3">Relationships</h4>
                        <div className="space-y-3">
                          {Object.entries(character.relationships).map(([name, description], i) => (
                            <div key={i} className="border-l-2 border-primary pl-4">
                              <p className="font-medium text-sm">{name}</p>
                              <p className="text-sm text-muted-foreground">{description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="arc" className="mt-4">
                  <div>
                    <h4 className="font-semibold mb-2">Character Development</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{character.arc}</p>
                  </div>
                </TabsContent>

                <TabsContent value="dialogue" className="mt-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Memorable Lines</h4>
                    {character.keyDialogue.map((quote, i) => (
                      <blockquote key={i} className="border-l-4 border-primary pl-4 italic">
                        &ldquo;{quote}&rdquo;
                      </blockquote>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="casting" className="mt-4">
                  <div>
                    <h4 className="font-semibold mb-3">Casting Suggestions</h4>
                    <ul className="space-y-2">
                      {character.castingSuggestions.map((suggestion, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-primary mr-2">•</span>
                          <span className="text-sm">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}