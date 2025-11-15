'use client';

import { useEffect } from 'react';

export default function HomePage() {
  useEffect(() => {
    console.log('Cursive Next.js loaded!');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold text-center mb-4">
          🎨 Cursive - AI-Powered Digital Notebook
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Next.js migration in progress...
        </p>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">✅ What's Working</h2>
          <ul className="space-y-2">
            <li>✅ Next.js 15 with App Router</li>
            <li>✅ TypeScript configured</li>
            <li>✅ Supabase client set up</li>
            <li>✅ Environment variables loaded</li>
            <li>⏳ Canvas component (coming next...)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
