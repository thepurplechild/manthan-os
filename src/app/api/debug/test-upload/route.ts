import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Test auth status
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required for upload testing',
        auth_status: 'unauthorized',
        details: 'Upload flow requires authenticated user'
      }, { status: 401 });
    }

    // Test storage bucket access
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    // Test if documents bucket exists and is accessible
    let documentsbucketInfo = null;
    if (!bucketsError && buckets) {
      const documentsBucket = buckets.find(bucket => bucket.name === 'documents');
      if (documentsBucket) {
        // Test listing files in the bucket (just to verify access)
        const { data: files, error: filesError } = await supabase.storage
          .from('documents')
          .list(user.id, { limit: 1 });

        documentsucketInfo = {
          exists: true,
          accessible: !filesError,
          file_count_sample: files?.length || 0,
          error: filesError?.message || null
        };
      } else {
        documentsBucketInfo = {
          exists: false,
          accessible: false,
          error: 'Documents bucket not found'
        };
      }
    }

    // Test database write permissions
    const testDoc = {
      title: `test-upload-${Date.now()}`,
      file_size: 1024,
      processing_status: 'PENDING' as const,
      user_id: user.id,
      storage_path: `test/dummy-path-${Date.now()}.pdf`,
      storage_url: 'https://example.com/test.pdf'
    };

    const { data: insertTest, error: insertError } = await supabase
      .from('documents')
      .insert(testDoc)
      .select()
      .single();

    // Clean up test document if it was created
    if (insertTest) {
      await supabase
        .from('documents')
        .delete()
        .eq('id', insertTest.id);
    }

    return NextResponse.json({
      success: true,
      auth_status: 'authenticated',
      user: {
        id: user.id,
        email: user.email
      },
      storage: {
        buckets_accessible: !bucketsError,
        buckets_count: buckets?.length || 0,
        documents_bucket: documentsBucketInfo,
        buckets_error: bucketsError?.message || null
      },
      database: {
        can_insert: !insertError,
        can_cleanup: insertTest ? true : false,
        insert_error: insertError?.message || null
      },
      upload_flow_ready: !authError && !bucketsError && documentsBucketInfo?.accessible && !insertError,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      details: 'Unexpected error during upload flow test'
    }, { status: 500 });
  }
}