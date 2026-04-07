'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Copy, Sparkles, Upload } from 'lucide-react'
import { createConversationTurn, saveStoryProject, type Message, type GeneratedOutputs } from '@/app/actions/conversation'
import { generateLoglines } from '@/app/actions/loglines'
import { generateSynopsis } from '@/app/actions/synopsis'
import { generateCharacterBible } from '@/app/actions/characterBible'
import { generateOnePager } from '@/app/actions/onePager'

type OutputKey = 'logline' | 'genreTone' | 'characterBreakdown' | 'synopsis' | 'onePager'

const acceptedMimeTypes = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
}

function inferKnownDimensions(messages: Message[], outputs: GeneratedOutputs) {
  const writerText = messages
    .filter((m) => m.role === 'writer')
    .map((m) => m.content.toLowerCase())
    .join('\n')

  return {
    audience: /(teen|young adult|adult|family|children|kids)/.test(writerText)
      ? 'partially-defined'
      : '',
    themes: /(theme|identity|love|grief|revenge|class|faith|justice|family)/.test(writerText)
      ? 'partially-defined'
      : '',
    character: /(protagonist|hero|anti-hero|villain|antagonist|character)/.test(writerText)
      ? 'partially-defined'
      : '',
    world: /(world|setting|city|village|future|past|fantasy|realistic|mythic)/.test(writerText)
      ? 'partially-defined'
      : '',
    stakes: /(lose|risk|stakes|consequence|fail|death|survive)/.test(writerText)
      ? 'partially-defined'
      : '',
    outputsReady: Boolean(outputs.logline || outputs.synopsis),
  }
}

function makeProjectTitle(firstWriterMessage?: string) {
  if (!firstWriterMessage) return 'Untitled Story'
  return firstWriterMessage
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join(' ')
}

export function WriterConversationExperience() {
  const router = useRouter()
  const supabase = createClient()

  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([])
  const [workingDocumentId, setWorkingDocumentId] = useState<string | null>(null)
  const [storyMaterial, setStoryMaterial] = useState('')
  const [thinking, setThinking] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [saveInFlight, setSaveInFlight] = useState(false)
  const [outputs, setOutputs] = useState<GeneratedOutputs>({})
  const [conversationError, setConversationError] = useState<string | null>(null)
  const [lastMessageForRetry, setLastMessageForRetry] = useState<string>('')

  const knownDimensions = useMemo(() => inferKnownDimensions(messages, outputs), [messages, outputs])

  const dimensionProgress = useMemo(() => {
    const fields = ['audience', 'themes', 'character', 'world', 'stakes'] as const
    const complete = fields.filter((f) => Boolean(knownDimensions[f])).length
    return { complete, total: fields.length, percent: Math.round((complete / fields.length) * 100) }
  }, [knownDimensions])

  const uploadFilesAndReturnIds = async (files: File[]) => {
    if (files.length === 0) return []

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Please log in again to upload files.')
    }

    const ids: string[] = []
    for (const file of files) {
      const fileExt = file.name.split('.').pop() || 'bin'
      const storagePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
      const { error: storageError } = await supabase.storage.from('creator-assets').upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })
      if (storageError) throw new Error(storageError.message)

      const {
        data: { publicUrl },
      } = supabase.storage.from('creator-assets').getPublicUrl(storagePath)

      const { data: document, error: documentError } = await supabase
        .from('documents')
        .insert({
          owner_id: user.id,
          title: file.name,
          storage_url: publicUrl,
          storage_path: storagePath,
          mime_type: file.type || null,
          file_size_bytes: file.size,
          processing_status: 'UPLOADED',
          extracted_text: null,
          asset_type: 'SCRIPT',
          is_primary: false,
        })
        .select('id')
        .single()

      if (documentError || !document) {
        throw new Error(documentError?.message || 'Failed to create file record')
      }

      ids.push(document.id)

      await fetch('/api/inngest/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'document.uploaded',
          data: {
            documentId: document.id,
            userId: user.id,
            storagePath,
            fileName: file.name,
          },
        }),
      }).catch(() => null)
    }
    return ids
  }

  const ensureWorkingDocument = async (textSeed: string) => {
    if (workingDocumentId) return workingDocumentId

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Not authenticated')

    const storagePath = `${user.id}/conversation/${Date.now()}-seed.txt`
    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        owner_id: user.id,
        title: 'New Story Session',
        storage_url: `conversation://${storagePath}`,
        storage_path: storagePath,
        mime_type: 'text/plain',
        file_size_bytes: textSeed.length,
        processing_status: 'COMPLETED',
        extracted_text: textSeed,
        asset_type: 'SCRIPT',
        is_primary: true,
      })
      .select('id')
      .single()

    if (error || !document) {
      throw new Error(error?.message || 'Could not initialize story session')
    }

    setWorkingDocumentId(document.id)
    return document.id
  }

  const updateWorkingDocumentText = async (documentId: string, content: string) => {
    await supabase
      .from('documents')
      .update({
        extracted_text: content,
        file_size_bytes: content.length,
      })
      .eq('id', documentId)
  }

  const generateOutputs = async (documentId: string) => {
    setIsGenerating(true)

    const nextOutputs: GeneratedOutputs = {}

    const loglineResult = await generateLoglines(documentId)
    if (loglineResult.success && loglineResult.data?.loglines?.[0]?.text) {
      nextOutputs.logline = loglineResult.data.loglines[0].text
      setOutputs((prev) => ({ ...prev, ...nextOutputs }))
    } else {
      toast.error('Logline generation failed. You can retry.')
      setIsGenerating(false)
      return
    }

    const synopsisResult = await generateSynopsis(documentId)
    if (synopsisResult.success && synopsisResult.data?.short) {
      nextOutputs.synopsis = synopsisResult.data.short
      setOutputs((prev) => ({ ...prev, ...nextOutputs }))
    }

    const characterResult = await generateCharacterBible(documentId)
    if (characterResult.success && characterResult.data) {
      nextOutputs.characterBreakdown = characterResult.data as unknown as GeneratedOutputs['characterBreakdown']
      setOutputs((prev) => ({ ...prev, ...nextOutputs }))
    }

    const onePagerResult = await generateOnePager(documentId)
    if (onePagerResult.success && onePagerResult.data) {
      nextOutputs.onePager = onePagerResult.data as unknown as GeneratedOutputs['onePager']
      nextOutputs.genreTone = onePagerResult.data.genreAndTone
      setOutputs((prev) => ({ ...prev, ...nextOutputs }))
    }

    setIsGenerating(false)
  }

  const handleRegenerate = async (type: OutputKey) => {
    if (!workingDocumentId) return
    const outputTypeMap: Record<OutputKey, string> = {
      logline: 'LOGLINES',
      synopsis: 'SYNOPSIS',
      characterBreakdown: 'CHARACTER_BIBLE',
      onePager: 'ONE_PAGER',
      genreTone: 'GENRE_CLASSIFICATION',
    }

    await supabase
      .from('script_analysis_outputs')
      .delete()
      .eq('document_id', workingDocumentId)
      .eq('output_type', outputTypeMap[type])

    if (type === 'logline') {
      const res = await generateLoglines(workingDocumentId)
      if (res.success) {
        setOutputs((prev) => ({ ...prev, logline: res.data?.loglines?.[0]?.text }))
      }
      return
    }

    if (type === 'synopsis') {
      const res = await generateSynopsis(workingDocumentId)
      if (res.success) {
        setOutputs((prev) => ({ ...prev, synopsis: res.data?.short }))
      }
      return
    }

    if (type === 'characterBreakdown') {
      const res = await generateCharacterBible(workingDocumentId)
      if (res.success) {
        setOutputs((prev) => ({ ...prev, characterBreakdown: res.data as unknown as GeneratedOutputs['characterBreakdown'] }))
      }
      return
    }

    const res = await generateOnePager(workingDocumentId)
    if (res.success) {
      setOutputs((prev) => ({
        ...prev,
        onePager: res.data as unknown as GeneratedOutputs['onePager'],
        genreTone: res.data?.genreAndTone,
      }))
    }
  }

  const handleBeginOrReply = async () => {
    await sendConversationTurn(draft.trim(), pendingFiles)
  }

  const requestTurnWithRetry = async (
    updatedMessages: Message[],
    combinedMaterial: string
  ): Promise<{ ready: boolean; question?: string; summary?: string }> => {
    let lastError: unknown
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await createConversationTurn(
          updatedMessages,
          combinedMaterial,
          inferKnownDimensions(updatedMessages, outputs)
        )
      } catch (error) {
        lastError = error
        console.error(`conversation turn attempt ${attempt + 1} failed:`, error)
      }
    }
    throw lastError || new Error('Conversation turn failed')
  }

  const sendConversationTurn = async (messageText: string, filesToUpload: File[]) => {
    if (!messageText && filesToUpload.length === 0) return
    setThinking(true)
    setConversationError(null)
    try {
      setLastMessageForRetry(messageText)
      const newFileIds = await uploadFilesAndReturnIds(filesToUpload)
      if (newFileIds.length > 0) {
        setUploadedFileIds((prev) => [...prev, ...newFileIds])
      }

      const userMessage: Message = {
        role: 'writer',
        content: messageText || 'Uploaded reference files for context.',
      }
      const updatedMessages = [...messages, userMessage]
      setMessages(updatedMessages)

      const combinedMaterial = [storyMaterial, messageText, filesToUpload.map((f) => `[Attachment] ${f.name}`).join('\n')]
        .filter(Boolean)
        .join('\n\n')
      setStoryMaterial(combinedMaterial)

      const docId = await ensureWorkingDocument(combinedMaterial || userMessage.content)
      await updateWorkingDocumentText(docId, combinedMaterial || userMessage.content)

      const turn = await requestTurnWithRetry(updatedMessages, combinedMaterial)
      if (turn.ready) {
        setMessages((prev) => [
          ...prev,
          { role: 'manthan', content: turn.summary || 'Great. I have enough to start generating your story package.' },
        ])
        await generateOutputs(docId)
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'manthan',
            content: turn.question || 'What should your audience feel by the final scene?',
          },
        ])
      }

      setDraft('')
      setPendingFiles([])
    } catch (error: unknown) {
      console.error(error)
      setConversationError("Something went wrong on our end. Let's try that again.")
    } finally {
      setThinking(false)
    }
  }

  const handleRetryLastMessage = async () => {
    if (!lastMessageForRetry) return
    await sendConversationTurn(lastMessageForRetry, [])
  }

  const handleSaveProject = async () => {
    if (!outputs.logline && !outputs.synopsis) return

    setSaveInFlight(true)
    try {
      const title = makeProjectTitle(messages.find((m) => m.role === 'writer')?.content)
      const result = await saveStoryProject(title, messages, outputs, uploadedFileIds)
      toast.success('Project saved.')
      router.push(`/dashboard/projects/${result.projectId}`)
    } catch {
      toast.error('Could not save project. Please retry.')
    } finally {
      setSaveInFlight(false)
    }
  }

  const onDrop = (acceptedFiles: File[]) => {
    setPendingFiles((prev) => [...prev, ...acceptedFiles])
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: acceptedMimeTypes,
  })

  const outputCards = [
    {
      key: 'logline' as const,
      title: 'LOGLINE',
      content: outputs.logline || '',
    },
    {
      key: 'genreTone' as const,
      title: 'GENRE + TONE',
      content: outputs.genreTone
        ? `${outputs.genreTone.primaryGenre || ''}\n${(outputs.genreTone.subGenres || []).join(', ')}\n${(outputs.genreTone.tone || []).join(', ')}`
        : '',
    },
    {
      key: 'characterBreakdown' as const,
      title: 'CHARACTER BREAKDOWN',
      content: outputs.characterBreakdown ? JSON.stringify(outputs.characterBreakdown, null, 2) : '',
    },
    {
      key: 'synopsis' as const,
      title: 'SYNOPSIS',
      content: outputs.synopsis || '',
    },
    {
      key: 'onePager' as const,
      title: 'ONE-PAGER',
      content: outputs.onePager ? JSON.stringify(outputs.onePager, null, 2) : '',
    },
  ]

  return (
    <div className="min-h-[calc(100vh-7rem)] bg-[#0A0A0A] p-6 md:p-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <div>
            <div className="text-[#C8A97E] text-xs tracking-[0.22em] uppercase">Manthan OS</div>
            <h1 className="mt-2 text-white text-[2.5rem] font-light leading-tight">New Story</h1>
          </div>

          <div className="space-y-4">
            <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
              {messages.length === 0 ? (
                <div className="text-[#666666] text-sm">
                  Start with anything: a feeling, a character, a conflict, or a world.
                </div>
              ) : (
                messages.map((message, idx) => (
                  <div key={`${message.role}-${idx}`} className={`flex ${message.role === 'writer' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[85%]">
                      {message.role === 'manthan' && (
                        <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-[#C8A97E]">Manthan</div>
                      )}
                      <div
                        className={`px-4 py-3 text-sm whitespace-pre-wrap rounded-[8px] ${
                          message.role === 'writer'
                            ? 'bg-[#1A1A1A] text-[#E5E5E5] ml-auto max-w-[80%]'
                            : 'bg-[#111111] border-l-2 border-l-[#C8A97E] text-[#E5E5E5]'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {thinking && <div className="text-[#666666] text-sm animate-pulse">Manthan is thinking...</div>}
            </div>

            {conversationError && (
              <div className="rounded-[8px] border border-[#2A2A2A] bg-[#111111] p-3 text-sm text-[#E5E5E5]">
                <p>{conversationError}</p>
                <Button
                  variant="ghost"
                  className="mt-2 h-auto p-0 text-[#C8A97E] hover:bg-transparent hover:text-[#e0bf91]"
                  onClick={handleRetryLastMessage}
                >
                  Retry
                </Button>
              </div>
            )}

            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-36 rounded-[8px] border-[#2A2A2A] bg-[#111111] p-5 text-white placeholder:text-[#555555] focus-visible:ring-0 focus-visible:border-[#C8A97E]/50"
              placeholder="What's your story about? Tell me anything — a feeling, a character, a situation, a world."
            />

            <div
              {...getRootProps()}
              className={`rounded-[8px] border border-dashed border-[#2A2A2A] p-4 cursor-pointer transition-colors ${
                isDragActive ? 'border-[#C8A97E]/30' : 'hover:border-[#C8A97E]/30'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex items-center gap-2 text-sm text-[#555555]">
                <Upload className="h-4 w-4" />
                <span>Or drop files here - script, screenplay, one-pager, reference images, PDF, Word, PPT</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {pendingFiles.map((file) => (
                  <Badge key={`${file.name}-${file.size}`} variant="secondary" className="rounded-[4px] bg-[#1A1A1A] text-[#E5E5E5]">
                    {file.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleBeginOrReply}
                className="rounded-[4px] bg-[#C8A97E] text-[#0A0A0A] font-medium hover:brightness-110"
              >
                {messages.length === 0 ? 'Begin ->' : 'Send ->'}
              </Button>

              {(outputs.logline || outputs.synopsis) && (
                <Button
                  onClick={handleSaveProject}
                  disabled={saveInFlight}
                  className="rounded-[4px] bg-[#1A1A1A] text-[#E5E5E5] hover:bg-[#222222] border border-[#2A2A2A]"
                >
                  {saveInFlight ? 'Saving...' : 'Save as Project'}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-[8px] border border-[#1A1A1A] bg-[#0D0D0D] p-4 space-y-4">
            <h2 className="text-white text-2xl font-light">Live Outputs</h2>
            <div className="text-sm text-[#444444]">
              {(outputs.logline || outputs.synopsis || outputs.onePager)
                ? 'Your package is updating as the conversation evolves.'
                : 'Your story package will appear here as we talk.'}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[#888888]">
                <span>Story readiness</span>
                <span>{dimensionProgress.complete}/5</span>
              </div>
              <Progress value={dimensionProgress.percent} className="h-2 bg-[#1A1A1A]" />
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['Audience', 'Themes', 'Character', 'World', 'Stakes'].map((label) => {
                  const key = label.toLowerCase()
                  const isKnown = key in knownDimensions && Boolean((knownDimensions as Record<string, unknown>)[key])
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${isKnown ? 'bg-[#C8A97E]' : 'bg-[#2A2A2A]'}`} />
                      <span className={isKnown ? 'text-[#C8A97E]' : 'text-[#666666]'}>{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {isGenerating && (
              <div className="text-sm text-[#666666] animate-pulse flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Manthan is thinking...
              </div>
            )}
          </div>

          {outputCards.map((card) =>
            card.content ? (
              <div key={card.key} className="rounded-[8px] border border-[#1E1E1E] bg-[#111111] p-4 space-y-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#C8A97E]">{card.title}</div>
                <pre className="whitespace-pre-wrap text-sm leading-7 text-[#E5E5E5] font-sans">{card.content}</pre>
                <div className="flex gap-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-auto p-0 text-[#666666] hover:text-[#C8A97E] hover:bg-transparent"
                    onClick={() => handleRegenerate(card.key)}
                  >
                    Regenerate
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-auto p-0 text-[#666666] hover:text-[#C8A97E] hover:bg-transparent"
                    onClick={async () => {
                      await navigator.clipboard.writeText(card.content)
                      toast.success('Copied')
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
            ) : null
          )}
        </div>
      </div>
    </div>
  )
}
