import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json({
        success: false,
        error: 'Document ID is required',
        usage: 'Add ?id=<document_id> to test embeddings for a specific document'
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        auth_status: 'unauthorized'
      }, { status: 401 });
    }

    // Check if document exists and belongs to user
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, processing_status, extracted_text, owner_id')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .single();

    if (docError || !document) {
      return NextResponse.json({
        success: false,
        error: 'Document not found or access denied',
        document_id: documentId
      }, { status: 404 });
    }

    // Check document sections (embeddings)
    const { data: sections, error: sectionsError } = await supabase
      .from('document_sections')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });

    if (sectionsError) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch document sections: ${sectionsError.message}`,
        document: {
          id: document.id,
          title: document.title,
          status: document.processing_status
        }
      }, { status: 500 });
    }

    // Analyze the sections
    const sectionAnalysis = {
      total_sections: sections?.length || 0,
      section_types: {} as Record<string, number>,
      sample_sections: sections?.slice(0, 3).map(section => ({
        id: section.id,
        type: section.section_type,
        content_preview: typeof section.content === 'string'
          ? section.content.substring(0, 100) + '...'
          : JSON.stringify(section.content).substring(0, 100) + '...',
        created_at: section.created_at
      })) || []
    };

    // Count section types
    sections?.forEach(section => {
      const type = section.section_type;
      sectionAnalysis.section_types[type] = (sectionAnalysis.section_types[type] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        processing_status: document.processing_status,
        has_extracted_text: !!document.extracted_text,
        extracted_text_length: document.extracted_text?.length || 0
      },
      embeddings: sectionAnalysis,
      embedding_status: {
        ready: (sections?.length || 0) > 0,
        sections_count: sections?.length || 0,
        processing_complete: document.processing_status === 'COMPLETED'
      },
      recommendations: [
        ...(document.processing_status !== 'COMPLETED'
          ? ['Document processing not completed - embeddings may be incomplete']
          : []),
        ...(!document.extracted_text
          ? ['No extracted text found - document may need reprocessing']
          : []),
        ...((sections?.length || 0) === 0
          ? ['No embeddings found - check if document was processed correctly']
          : [])
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}