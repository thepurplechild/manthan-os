import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Test basic connection
    const { error: healthError } = await supabase
      .from('documents')
      .select('count')
      .limit(1);

    if (healthError) {
      return NextResponse.json({
        success: false,
        error: healthError.message,
        details: 'Failed to connect to Supabase'
      }, { status: 500 });
    }

    // Test auth status
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Get table info
    const { data: documentsCount, error: countError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true });

    const { data: sectionsCount, error: sectionsCountError } = await supabase
      .from('document_sections')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      connection: 'healthy',
      user: user ? { id: user.id, email: user.email } : null,
      authError: authError?.message || null,
      tables: {
        documents: {
          accessible: !countError,
          count: documentsCount || 0,
          error: countError?.message || null
        },
        document_sections: {
          accessible: !sectionsCountError,
          count: sectionsCount || 0,
          error: sectionsCountError?.message || null
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: 'Unexpected error during Supabase test'
    }, { status: 500 });
  }
}