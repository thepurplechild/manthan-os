# Testing the Search API Endpoint

## Prerequisites
1. Make sure your Next.js development server is running: `npm run dev`
2. Ensure you have created the `search_documents` function in Supabase
3. Have some documents with embeddings in your database
4. Be authenticated (have valid cookies from logging in)

## Test Commands

### Basic Search Test
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -H "Cookie: $(curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt http://localhost:3000/auth/login | grep -o 'Set-Cookie: [^;]*' | cut -d' ' -f2-)" \
  -d '{"query": "romantic scene", "limit": 3}'
```

### Simple Test (if you have valid auth cookies)
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "romantic scene", "limit": 3}'
```

### Test with Custom Parameters
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "action sequence",
    "limit": 5,
    "threshold": 0.6
  }'
```

### Test Error Handling (Missing Query)
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"limit": 3}'
```

### Test Error Handling (Invalid Query Type)
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": 123, "limit": 3}'
```

## Expected Response Format

### Success Response
```json
{
  "results": [
    {
      "id": "uuid",
      "document_id": "uuid",
      "content": "text content",
      "similarity": 0.85,
      "document_title": "Document Title",
      "section_type": "paragraph",
      "metadata": {}
    }
  ],
  "query": "romantic scene",
  "count": 1
}
```

### Error Response
```json
{
  "error": "Query is required"
}
```

## Notes
- The endpoint requires authentication via Supabase auth cookies
- Voyage AI API key must be set in environment variables
- The search_documents PostgreSQL function must exist in your database
- Results are filtered by the authenticated user's documents only