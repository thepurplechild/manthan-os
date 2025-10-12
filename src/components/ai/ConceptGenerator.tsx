'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Sparkles, User, MapPin } from 'lucide-react';
import { generateConcept } from '@/app/actions/generateConcept';
import Image from 'next/image';

interface ConceptGeneratorProps {
  projectId: string;
}

export function ConceptGenerator({ projectId }: ConceptGeneratorProps) {
  console.log('🟦 ConceptGenerator mounted with projectId:', projectId);
  
  const [characterPrompt, setCharacterPrompt] = useState('');
  const [locationPrompt, setLocationPrompt] = useState('');
  const [style, setStyle] = useState<'realistic' | 'cinematic' | 'cyberpunk' | 'digitalart' | 'fantasy' | 'anime'>('realistic');
  const [aspectRatio, setAspectRatio] = useState<'square' | 'portrait' | 'landscape'>('portrait');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'character' | 'location'>('character');

  const handleGenerate = async () => {
    console.log('🔵 handleGenerate called');
    console.log('🔵 activeTab:', activeTab);
    console.log('🔵 projectId:', projectId);
    
    const prompt = activeTab === 'character' ? characterPrompt : locationPrompt;
    console.log('🔵 prompt:', prompt);

    if (!prompt.trim()) {
      console.log('❌ Empty prompt');
      toast.error('Please enter a description');
      return;
    }

    if (prompt.trim().length < 3) {
      console.log('❌ Prompt too short:', prompt.trim().length);
      toast.error('Description must be at least 3 characters');
      return;
    }

    console.log('🟢 Validation passed, starting generation...');
    console.log('🟢 Generation params:', {
      projectId,
      prompt: prompt.trim(),
      conceptType: activeTab,
      generationStyle: style,
      aspectRatio,
    });

    setIsGenerating(true);
    setGeneratedImage(null);
    toast.info('Generating concept art... This may take 15-30 seconds');

    try {
      console.log('🟡 Calling generateConcept action...');
      
      const result = await generateConcept({
        projectId,
        prompt: prompt.trim(),
        conceptType: activeTab,
        generationStyle: style,
        aspectRatio,
      });

      console.log('🟣 generateConcept result:', result);

      if (result.success && result.imageUrl) {
        console.log('✅ Generation successful!');
        console.log('✅ Image URL:', result.imageUrl);
        setGeneratedImage(result.imageUrl);
        toast.success('Concept generated and saved to project!');
      } else {
        console.error('❌ Generation failed:', result.error);
        toast.error(result.error || 'Failed to generate concept');
      }
    } catch (error) {
      console.error('💥 Generation error (caught):', error);
      console.error('💥 Error type:', typeof error);
      console.error('💥 Error details:', JSON.stringify(error, null, 2));
      toast.error('An error occurred during generation');
    } finally {
      console.log('🏁 Generation complete, setting isGenerating to false');
      setIsGenerating(false);
    }
  };

  const examplePrompts = {
    character: [
      'Fierce warrior queen in traditional Kerala attire with ornate gold jewelry',
      'Young tech entrepreneur in modern Indian streetwear with traditional elements',
      'Elderly sage with flowing white beard in saffron robes meditating',
      'Bollywood dance performer in vibrant lehenga with dramatic makeup',
    ],
    location: [
      'Ancient temple courtyard with intricate stone carvings at golden hour',
      'Bustling Mumbai street market with colorful stalls and monsoon rain',
      'Modern glass office with traditional Indian art installations',
      'Serene Kerala backwater scene with houseboat and palm trees',
    ],
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI Concept Generator
        </CardTitle>
        <CardDescription>
          Generate authentic Indian-themed concept art using BharatDiffusion AI
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => {
          console.log('📑 Tab changed to:', v);
          setActiveTab(v as 'character' | 'location');
        }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="character">
              <User className="h-4 w-4 mr-2" />
              Character
            </TabsTrigger>
            <TabsTrigger value="location">
              <MapPin className="h-4 w-4 mr-2" />
              Location
            </TabsTrigger>
          </TabsList>

          <TabsContent value="character" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="character-prompt">Character Description</Label>
              <Textarea
                id="character-prompt"
                value={characterPrompt}
                onChange={(e) => {
                  console.log('✏️ Character prompt changed:', e.target.value.substring(0, 50));
                  setCharacterPrompt(e.target.value);
                }}
                placeholder="Describe your character in detail..."
                rows={4}
                disabled={isGenerating}
              />
              <div className="flex flex-wrap gap-2">
                {examplePrompts.character.map((example, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('📋 Example', i + 1, 'clicked');
                      setCharacterPrompt(example);
                    }}
                    disabled={isGenerating}
                  >
                    Example {i + 1}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="location" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location-prompt">Location Description</Label>
              <Textarea
                id="location-prompt"
                value={locationPrompt}
                onChange={(e) => {
                  console.log('✏️ Location prompt changed:', e.target.value.substring(0, 50));
                  setLocationPrompt(e.target.value);
                }}
                placeholder="Describe the location or setting..."
                rows={4}
                disabled={isGenerating}
              />
              <div className="flex flex-wrap gap-2">
                {examplePrompts.location.map((example, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('📋 Example', i + 1, 'clicked');
                      setLocationPrompt(example);
                    }}
                    disabled={isGenerating}
                  >
                    Example {i + 1}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="style">Style</Label>
              <Select 
                value={style} 
                onValueChange={(v: any) => {
                  console.log('🎨 Style changed to:', v);
                  setStyle(v);
                }} 
                disabled={isGenerating}
              >
                <SelectTrigger id="style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realistic">Realistic</SelectItem>
                  <SelectItem value="cinematic">Cinematic</SelectItem>
                  <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
                  <SelectItem value="digitalart">Digital Art</SelectItem>
                  <SelectItem value="fantasy">Fantasy</SelectItem>
                  <SelectItem value="anime">Anime</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aspect-ratio">Aspect Ratio</Label>
              <Select 
                value={aspectRatio} 
                onValueChange={(v: any) => {
                  console.log('📐 Aspect ratio changed to:', v);
                  setAspectRatio(v);
                }} 
                disabled={isGenerating}
              >
                <SelectTrigger id="aspect-ratio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Square (1:1)</SelectItem>
                  <SelectItem value="portrait">Portrait (3:4)</SelectItem>
                  <SelectItem value="landscape">Landscape (4:3)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => {
              console.log('🖱️ Generate button clicked');
              handleGenerate();
            }}
            disabled={isGenerating}
            className="w-full mt-4"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating... (15-30 seconds)
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Concept Art
              </>
            )}
          </Button>

          {generatedImage && (
            <div className="mt-6 space-y-2">
              <Label>Generated Concept (Saved to Project)</Label>
              <div className="relative aspect-square rounded-lg overflow-hidden border">
                <Image
                  src={generatedImage}
                  alt="Generated concept"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}