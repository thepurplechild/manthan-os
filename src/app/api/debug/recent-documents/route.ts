import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
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

    // Fetch recent documents with processing status
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, title, processing_status, extracted_text, file_size_bytes, created_at, asset_type, mime_type')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (docsError) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch documents: ${docsError.message}`
      }, { status: 500 });
    }

    // Get embeddings count for each document
    const documentsWithEmbeddings = await Promise.all(
      (documents || []).map(async (doc) => {
        const { data: sections, error: sectionsError } = await supabase
          .from('document_sections')
          .select('id', { count: 'exact' })
          .eq('document_id', doc.id);

        return {
          ...doc,
          has_text: !!doc.extracted_text,
          text_length: doc.extracted_text?.length || 0,
          embedding_count: sectionsError ? 0 : (sections?.length || 0),
          file_size_mb: Math.round((doc.file_size_bytes / 1024 / 1024) * 100) / 100,
          age_hours: Math.round((Date.now() - new Date(doc.created_at).getTime()) / (1000 * 60 * 60) * 100) / 100
        };
      })
    );

    // Calculate summary statistics
    const stats = {
      total_documents: documentsWithEmbeddings.length,
      by_status: {} as Record<string, number>,
      by_type: {} as Record<string, number>,
      total_embeddings: documentsWithEmbeddings.reduce((sum, doc) => sum + doc.embedding_count, 0),
      total_size_mb: Math.round(documentsWithEmbeddings.reduce((sum, doc) => sum + doc.file_size_mb, 0) * 100) / 100,
      ready_documents: documentsWithEmbeddings.filter(doc => doc.processing_status === 'COMPLETED').length,
      failed_documents: documentsWithEmbeddings.filter(doc => doc.processing_status === 'FAILED').length,
      processing_documents: documentsWithEmbeddings.filter(doc => doc.processing_status === 'PROCESSING').length
    };

    // Count by status and type
    documentsWithEmbeddings.forEach(doc => {
      stats.by_status[doc.processing_status] = (stats.by_status[doc.processing_status] || 0) + 1;
      stats.by_type[doc.asset_type] = (stats.by_type[doc.asset_type] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      documents: documentsWithEmbeddings,
      statistics: stats,
      health_indicators: {
        upload_working: stats.total_documents > 0,
        processing_working: stats.ready_documents > 0,
        embeddings_working: stats.total_embeddings > 0,
        recent_activity: documentsWithEmbeddings.some(doc => doc.age_hours < 24)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      details: 'Unexpected error during recent documents fetch'
    }, { status: 500 });
  }
}