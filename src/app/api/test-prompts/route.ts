import { testPromptExtraction } from '@/lib/packaging/test-prompts';

export async function GET() {
  console.log('🧪 API: Testing prompt extraction...');

  try {
    await testPromptExtraction();
    return Response.json({ success: true, message: 'Check server logs for detailed output' });
  } catch (error) {
    console.error('💥 API test failed:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}