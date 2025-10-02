'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

type Character = {
  name: string
  description: string
}

type Scene = {
  heading: string
  location: string
  time: string
}

type Dialogue = {
  character: string
  line: string
  context: string
}

type SectionContent = {
  characters?: Character[]
  scenes?: Scene[]
  dialogue?: Dialogue[]
}

type Section = {
  id: string
  section_type: string
  content: SectionContent | string
  created_at: string
}

export function DocumentSections({ sections }: { sections: Section[] }) {
  console.log('DocumentSections received sections:', sections)
  console.log('First section content:', sections[0]?.content)
  console.log('Content type:', typeof sections[0]?.content)

  // Helper function to parse content and determine section type
  const parseSection = (section: Section): { id: string; section_type: string; content: SectionContent; created_at: string } | null => {
    console.log('Parsing section:', section)
    let content: SectionContent
    let sectionType = section.section_type

    // If content is a string, parse it as JSON
    if (typeof section.content === 'string') {
      try {
        content = JSON.parse(section.content) as SectionContent
      } catch (e) {
        console.error('Failed to parse content JSON:', e)
        return null
      }
    } else {
      content = section.content
    }

    console.log('Parsed content:', content)

    // Determine section type from content structure if not already set
    if (!sectionType) {
      if (content.characters) sectionType = 'CHARACTERS'
      else if (content.scenes) sectionType = 'SCENES'
      else if (content.dialogue) sectionType = 'DIALOGUE'
    }

    return {
      ...section,
      section_type: sectionType,
      content
    }
  }

  const parsedSections = sections.map(parseSection).filter((section): section is NonNullable<typeof section> => section !== null)
  console.log('Parsed sections:', parsedSections)

  return (
    <div className="bg-card border rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Analysis Results</h2>
      <Accordion type="multiple" className="w-full">
        {parsedSections.map((section) => {
          const content = section.content
          const sectionType = section.section_type ||
            (content.characters ? 'CHARACTERS' :
             content.scenes ? 'SCENES' :
             content.dialogue ? 'DIALOGUE' : 'UNKNOWN')

          return (
            <AccordionItem key={section.id} value={section.id}>
              <AccordionTrigger className="text-left">
                {sectionType.charAt(0) + sectionType.slice(1).toLowerCase()}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {(sectionType === 'CHARACTERS' || content.characters) && (
                    <div className="space-y-3">
                      {content.characters?.map((char: Character, i: number) => (
                        <div key={i} className="border-l-2 pl-4">
                          <div className="font-semibold">{char.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {char.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {(sectionType === 'SCENES' || content.scenes) && (
                    <div className="space-y-3">
                      {content.scenes?.map((scene: Scene, i: number) => (
                        <div key={i} className="border-l-2 pl-4">
                          <div className="font-semibold">{scene.heading}</div>
                          <div className="text-sm text-muted-foreground">
                            {scene.location} - {scene.time}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {(sectionType === 'DIALOGUE' || content.dialogue) && (
                    <div className="space-y-3">
                      {content.dialogue?.map((line: Dialogue, i: number) => (
                        <div key={i} className="border-l-2 pl-4">
                          <div className="font-semibold">{line.character}</div>
                          <div className="text-sm">{line.line}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {line.context}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}