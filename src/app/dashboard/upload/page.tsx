'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Upload, X, FileText, Loader2 } from 'lucide-react'
import { uploadDocument } from '@/app/actions/upload'
import { toast } from 'sonner'

type SelectedFile = {
  file: File
  preview: string
}

function UploadPageImpl() {
  const router = useRouter()
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
    onDrop: async (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        const error = rejectedFiles[0].errors[0]
        if (error.code === 'file-too-large') {
          toast.error('File too large. Please select a file smaller than 50MB')
        } else if (error.code === 'file-invalid-type') {
          toast.error('Invalid file type. Please select a PDF, TXT, or MD file')
        }
        return
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        const selectedFile: SelectedFile = {
          file,
          preview: URL.createObjectURL(file),
        }

        setSelectedFiles([selectedFile])
        toast.success('File selected successfully!')
      }
    },
  })

  const removeFile = () => {
    if (selectedFiles[0]?.preview) {
      URL.revokeObjectURL(selectedFiles[0].preview)
    }
    setSelectedFiles([])
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    const selectedFile = selectedFiles[0]
    const file = selectedFile.file
    const formData = new FormData()
    formData.append('file', file)

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const result = await uploadDocument(formData)

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (result.error) {
        toast.error(result.error)
      } else {
        // Trigger background processing
        try {
          await fetch('/api/inngest/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'document/text.extract',
              data: { documentId: result.document.id }
            })
          })
        } catch (triggerError) {
          console.error('Failed to trigger background processing:', triggerError)
        }

        toast.success('File uploaded! Extracting text in background...')
        removeFile()
        router.push('/dashboard/documents')
      }
    } catch (error) {
      toast.error('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload Document</h1>
        <p className="text-muted-foreground mt-2">
          Upload your script or document for AI analysis
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              {isDragActive
                ? 'Drop your file here'
                : 'Drag and drop your script here, or click to browse'}
            </p>
            <p className="text-sm text-muted-foreground">
              Supports PDF, TXT, and MD files up to 50MB
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="font-semibold">Selected File</h3>
              {selectedFiles.map((selectedFile, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <FileText className="h-10 w-10 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedFile.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={removeFile} disabled={isUploading}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              <Button onClick={handleUpload} disabled={isUploading} className="w-full">
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload File
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">What happens after upload?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Your script will be securely stored and processed in the background</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Text extraction and AI analysis will happen automatically</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>You&apos;ll be notified when processing is complete</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default UploadPageImpl