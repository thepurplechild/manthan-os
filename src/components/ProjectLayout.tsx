'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Users,
  AlignLeft,
  Lightbulb,
  FileSpreadsheet,
  Search,
  Film
} from 'lucide-react';

interface ProjectLayoutProps {
  scriptView: React.ReactNode;
  characterBible: React.ReactNode;
  synopsis: React.ReactNode;
  loglines: React.ReactNode;
  onePager: React.ReactNode;
  searchView: React.ReactNode;
  documentTitle: string;
  showCharacterBible: boolean;
  showSynopsis: boolean;
  showLoglines: boolean;
  showOnePager: boolean;
}

export function ProjectLayout({
  scriptView,
  characterBible,
  synopsis,
  loglines,
  onePager,
  searchView,
  documentTitle,
  showCharacterBible,
  showSynopsis,
  showLoglines,
  showOnePager,
}: ProjectLayoutProps) {
  const [activeTab, setActiveTab] = useState('script');

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="border-b pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Film className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">{documentTitle}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          AI-Powered Script Analysis & Pitch Materials
        </p>
      </div>

      {/* Tabbed Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex h-12 items-center justify-start rounded-lg bg-muted p-1 w-full">
            <TabsTrigger value="script" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Script
            </TabsTrigger>

            {showCharacterBible && (
              <TabsTrigger value="characters" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Characters
              </TabsTrigger>
            )}

            {showSynopsis && (
              <TabsTrigger value="synopsis" className="flex items-center gap-2">
                <AlignLeft className="h-4 w-4" />
                Synopsis
              </TabsTrigger>
            )}

            {showLoglines && (
              <TabsTrigger value="loglines" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Loglines
              </TabsTrigger>
            )}

            {showOnePager && (
              <TabsTrigger value="onepager" className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                One-Pager
              </TabsTrigger>
            )}

            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        {/* Tab Contents */}
        <div className="mt-6">
          <TabsContent value="script" className="space-y-6">
            {scriptView}
          </TabsContent>

          {showCharacterBible && (
            <TabsContent value="characters">
              {characterBible}
            </TabsContent>
          )}

          {showSynopsis && (
            <TabsContent value="synopsis">
              {synopsis}
            </TabsContent>
          )}

          {showLoglines && (
            <TabsContent value="loglines">
              {loglines}
            </TabsContent>
          )}

          {showOnePager && (
            <TabsContent value="onepager">
              {onePager}
            </TabsContent>
          )}

          <TabsContent value="search">
            {searchView}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}