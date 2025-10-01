'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

type Section = {
  id: string
  section_type: string
  content: any
  created_at: string
}

export function DocumentSections({ sections }: { sections: Section[] }) {
  return (
    <div className="bg-card border rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Analysis Results</h2>
      <Accordion type="multiple" className="w-full">
        {sections.map((section) => (
          <AccordionItem key={section.id} value={section.id}>
            <AccordionTrigger className="text-left">
              {section.section_type.charAt(0) +
                section.section_type.slice(1).toLowerCase()}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                {section.section_type === 'CHARACTERS' && (
                  <div className="space-y-3">
                    {section.content.characters?.map((char: any, i: number) => (
                      <div key={i} className="border-l-2 pl-4">
                        <div className="font-semibold">{char.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {char.description}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {section.section_type === 'SCENES' && (
                  <div className="space-y-3">
                    {section.content.scenes?.map((scene: any, i: number) => (
                      <div key={i} className="border-l-2 pl-4">
                        <div className="font-semibold">{scene.heading}</div>
                        <div className="text-sm text-muted-foreground">
                          {scene.location} - {scene.time}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {section.section_type === 'DIALOGUE' && (
                  <div className="space-y-3">
                    {section.content.dialogue?.map((line: any, i: number) => (
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
        ))}
      </Accordion>
    </div>
  )
}