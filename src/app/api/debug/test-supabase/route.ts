import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Require authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        details: 'Authentication required'
      }, { status: 401 });
    }

    // Test basic connection (without exposing sensitive data)
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

    // Test table access without exposing counts
    const { error: countError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true });

    const { error: sectionsCountError } = await supabase
      .from('document_sections')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      connection: 'healthy',
      user: {
        id: user.id,
        email: user.email ? user.email.substring(0, 3) + '***' : null // Partially mask email
      },
      tables: {
        documents: {
          accessible: !countError,
          error: countError?.message || null
        },
        document_sections: {
          accessible: !sectionsCountError,
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