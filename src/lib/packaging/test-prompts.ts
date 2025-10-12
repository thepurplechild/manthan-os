import { extractAllVisualPrompts } from './extractVisualPrompts';

// Test with an existing document ID from the database
const TEST_DOCUMENT_ID = '6f9bbd96-e1ec-426d-87e3-a3f812f60b91'; // Actual document ID with analysis data

async function testPromptExtraction() {
  console.log('🧪 Testing prompt extraction...');

  try {
    const result = await extractAllVisualPrompts(TEST_DOCUMENT_ID);

    console.log('\n📊 RESULT SUMMARY:');
    console.log('Success:', result.success);
    console.log('Total prompts:', result.totalPrompts);
    console.log('Character prompts:', result.characterPrompts?.length || 0);
    console.log('Location prompts:', result.locationPrompts?.length || 0);

    if (result.error) {
      console.log('❌ Error:', result.error);
      return;
    }

    console.log('\n👥 CHARACTER PROMPTS:');
    result.characterPrompts?.forEach((prompt, i) => {
      console.log(`\n${i + 1}. ${prompt.characterName} (${prompt.role})`);
      console.log(`   Casting: ${prompt.castingSuggestions.join(', ')}`);
      console.log(`   Prompt: ${prompt.prompt}`);
    });

    console.log('\n📍 LOCATION PROMPTS:');
    result.locationPrompts?.forEach((prompt, i) => {
      console.log(`\n${i + 1}. ${prompt.locationName}`);
      console.log(`   Description: ${prompt.description}`);
      console.log(`   Prompt: ${prompt.prompt}`);
    });

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Export for Next.js API testing
export { testPromptExtraction };