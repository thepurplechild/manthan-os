'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { uploadDocument } from '@/app/actions/upload'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Upload, File, CheckCircle2, X } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

interface SelectedFile {
  file: File
  preview: string
  extractedText?: string
}

export default function UploadPage() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isExtracting, setIsExtracting] = useState(false)

  // Text extraction function for PDFs
  async function extractTextFromPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: { str: string }) => item.str).join(' ')
      fullText += pageText + '\n'
    }

    return fullText
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
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
          preview: URL.createObjectURL(file)
        }

        setSelectedFiles([selectedFile])

        // Extract text from PDF
        if (file.type === 'application/pdf') {
          setIsExtracting(true)
          try {
            const extractedText = await extractTextFromPDF(file)
            setSelectedFiles([{
              ...selectedFile,
              extractedText
            }])
            toast.success('Text extracted successfully from PDF!')
          } catch (error) {
            toast.error('Failed to extract text from PDF')
            console.error('PDF extraction error:', error)
          } finally {
            setIsExtracting(false)
          }
        }
      }
    }
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

    // Add extracted text if available
    if (selectedFile.extractedText) {
      formData.append('extractedText', selectedFile.extractedText)
    }

    setIsUploading(true)
    setUploadProgress(0)

    // Simulate progress for UI feedback
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    try {
      const result = await uploadDocument(formData)

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (result.success) {
        toast.success(`${file.name} has been uploaded successfully!`)

        // Clear form after successful upload
        setTimeout(() => {
          removeFile()
          setUploadProgress(0)
        }, 1000)
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      clearInterval(progressInterval)
      setUploadProgress(0)

      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = () => {
    return <File className="h-8 w-8 text-blue-500" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Upload Script</h1>
        <p className="text-gray-600 mt-1">
          Upload your script files to get started with analysis
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Drop Zone */}
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg text-gray-600 mb-2">
                {isDragActive
                  ? 'Drop your script here'
                  : 'Drag and drop your script here, or click to browse'
                }
              </p>
              <p className="text-sm text-gray-500">
                Supports PDF, TXT, and MD files up to 50MB
              </p>
            </div>

            {/* File Preview */}
            {selectedFiles.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Selected File</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getFileIcon()}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedFiles[0].file.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(selectedFiles[0].file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      disabled={isUploading || isExtracting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Text Extraction Progress */}
                {isExtracting && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-blue-700">Extracting text from PDF...</span>
                    </div>
                  </div>
                )}

                {/* Text Preview */}
                {selectedFiles[0].extractedText && !isExtracting && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Text Preview</h4>
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <p className="text-xs text-gray-600 mb-2">
                        {selectedFiles[0].extractedText.length.toLocaleString()} characters extracted
                      </p>
                      <div className="text-sm text-gray-700 max-h-32 overflow-y-auto">
                        {selectedFiles[0].extractedText.slice(0, 500)}
                        {selectedFiles[0].extractedText.length > 500 && '...'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Uploading...</span>
                  <span className="text-gray-600">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            {/* Upload Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isUploading || isExtracting}
                className="min-w-[120px]"
              >
                {isUploading ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </>
                )}
              </Button>
            </div>

            {/* Success Message */}
            {uploadProgress === 100 && !isUploading && (
              <div className="flex items-center justify-center p-4 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-green-700">File uploaded successfully!</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            What happens after upload?
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <p>Your script will be securely stored and processed</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <p>AI analysis will extract characters, scenes, and dialogue</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <p>You&apos;ll be able to generate casting suggestions and breakdowns</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}