'use client';

import { useState } from 'react';

interface TestResult {
  success: boolean;
  status?: number;
  data?: Record<string, unknown>;
  error?: string;
  timestamp: string;
}

export default function DebugPage() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const testComponent = async (component: string, endpoint: string, body?: unknown) => {
    setLoading(component);
    try {
      const response = await fetch(endpoint, {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();
      setResults((prev: Record<string, TestResult>) => ({
        ...prev,
        [component]: {
          success: response.ok,
          status: response.status,
          data,
          timestamp: new Date().toISOString(),
        }
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResults((prev: Record<string, TestResult>) => ({
        ...prev,
        [component]: {
          success: false,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        }
      }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔧 Manthan OS - Pipeline Debug Dashboard</h1>

        {/* Component Tests */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          {/* 1. Supabase Connection */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">1️⃣ Supabase Connection</h2>
            <button
              onClick={() => testComponent('supabase', '/api/debug/test-supabase')}
              disabled={loading === 'supabase'}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading === 'supabase' ? 'Testing...' : 'Test Supabase'}
            </button>
            {results.supabase && (
              <pre className="mt-4 p-3 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(results.supabase, null, 2)}
              </pre>
            )}
          </div>

          {/* 2. Railway Worker Health */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">2️⃣ Railway Worker Health</h2>
            <button
              onClick={() => testComponent('railway', '/api/debug/test-railway')}
              disabled={loading === 'railway'}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading === 'railway' ? 'Testing...' : 'Test Railway'}
            </button>
            {results.railway && (
              <pre className="mt-4 p-3 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(results.railway, null, 2)}
              </pre>
            )}
          </div>

          {/* 3. Inngest Endpoint */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">3️⃣ Inngest Endpoint</h2>
            <button
              onClick={() => testComponent('inngest', '/api/inngest', {
                name: 'test.event',
                data: { test: true }
              })}
              disabled={loading === 'inngest'}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
            >
              {loading === 'inngest' ? 'Testing...' : 'Test Inngest'}
            </button>
            {results.inngest && (
              <pre className="mt-4 p-3 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(results.inngest, null, 2)}
              </pre>
            )}
          </div>

          {/* 4. Document Upload Flow */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">4️⃣ Upload Flow</h2>
            <button
              onClick={() => testComponent('upload', '/api/debug/test-upload')}
              disabled={loading === 'upload'}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
            >
              {loading === 'upload' ? 'Testing...' : 'Test Upload'}
            </button>
            {results.upload && (
              <pre className="mt-4 p-3 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(results.upload, null, 2)}
              </pre>
            )}
          </div>

          {/* 5. Extraction (Railway Worker) */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">5️⃣ PDF Extraction</h2>
            <input
              type="text"
              placeholder="Document ID"
              id="extractDocId"
              className="border p-2 rounded w-full mb-2"
            />
            <button
              onClick={() => {
                const docId = (document.getElementById('extractDocId') as HTMLInputElement).value;
                if (docId) testComponent('extract', `/api/test-extract?id=${docId}`);
              }}
              disabled={loading === 'extract'}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
            >
              {loading === 'extract' ? 'Testing...' : 'Test Extraction'}
            </button>
            {results.extract && (
              <pre className="mt-4 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-64">
                {JSON.stringify(results.extract, null, 2)}
              </pre>
            )}
          </div>

          {/* 6. Embeddings Check */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">6️⃣ Embeddings Status</h2>
            <input
              type="text"
              placeholder="Document ID"
              id="embedDocId"
              className="border p-2 rounded w-full mb-2"
            />
            <button
              onClick={() => {
                const docId = (document.getElementById('embedDocId') as HTMLInputElement).value;
                if (docId) testComponent('embeddings', `/api/debug/test-embeddings?id=${docId}`);
              }}
              disabled={loading === 'embeddings'}
              className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 disabled:opacity-50"
            >
              {loading === 'embeddings' ? 'Testing...' : 'Check Embeddings'}
            </button>
            {results.embeddings && (
              <pre className="mt-4 p-3 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(results.embeddings, null, 2)}
              </pre>
            )}
          </div>

        </div>

        {/* Full Pipeline Test */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">🚀 Full Pipeline Test</h2>
          <p className="text-gray-600 mb-4">Test the complete flow with an existing document</p>
          <input
            type="text"
            placeholder="Document ID"
            id="fullPipelineDocId"
            className="border p-2 rounded w-full mb-4"
          />
          <button
            onClick={() => {
              const docId = (document.getElementById('fullPipelineDocId') as HTMLInputElement).value;
              if (docId) testComponent('fullPipeline', `/api/test-pipeline/${docId}`, { trigger: true });
            }}
            disabled={loading === 'fullPipeline'}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
          >
            {loading === 'fullPipeline' ? '⏳ Running Full Pipeline...' : '🚀 Run Full Pipeline Test'}
          </button>
          {results.fullPipeline && (
            <div className="mt-4">
              <div className={`p-4 rounded ${results.fullPipeline.success ? 'bg-green-100' : 'bg-red-100'}`}>
                <h3 className="font-semibold mb-2">
                  {results.fullPipeline.success ? '✅ Pipeline Success' : '❌ Pipeline Failed'}
                </h3>
                <pre className="text-xs overflow-auto max-h-96">
                  {JSON.stringify(results.fullPipeline, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Recent Documents */}
        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h2 className="text-xl font-semibold mb-4">📄 Recent Documents</h2>
          <button
            onClick={() => testComponent('recentDocs', '/api/debug/recent-documents')}
            disabled={loading === 'recentDocs'}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:opacity-50"
          >
            {loading === 'recentDocs' ? 'Loading...' : 'Load Recent Documents'}
          </button>
          {results.recentDocs && results.recentDocs.data &&
           (results.recentDocs.data as Record<string, unknown>).documents ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">ID</th>
                    <th className="p-2 text-left">Title</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Has Text</th>
                    <th className="p-2 text-left">Embeddings</th>
                  </tr>
                </thead>
                <tbody>
                  {((results.recentDocs.data as Record<string, unknown>).documents as Record<string, unknown>[]).map((doc: Record<string, unknown>) => (
                    <tr key={doc.id as string} className="border-b">
                      <td className="p-2 font-mono text-xs">{(doc.id as string).substring(0, 8)}...</td>
                      <td className="p-2">{doc.title as string}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          doc.processing_status === 'READY' ? 'bg-green-100 text-green-800' :
                          doc.processing_status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                          doc.processing_status === 'EXTRACTION_FAILED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.processing_status as string}
                        </span>
                      </td>
                      <td className="p-2">{doc.has_text ? '✅' : '❌'}</td>
                      <td className="p-2">{(doc.embedding_count as number) || 0} chunks</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
}