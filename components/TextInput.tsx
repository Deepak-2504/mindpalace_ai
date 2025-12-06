import React, { useState } from 'react';
import { AppRoute, MemoryPalace } from '../types';
import { generateMindMapFromText } from '../services/geminiService';
import { savePalace } from '../services/storageService';

interface TextInputProps {
  onNavigate: (route: AppRoute, params?: any) => void;
}

const TextInput: React.FC<TextInputProps> = ({ onNavigate }) => {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // We pass the title as the source "text" for the AI to expand upon
      const mindMap = await generateMindMapFromText(title);
      
      const newPalace: MemoryPalace = {
        id: crypto.randomUUID(),
        title: title,
        // Since we don't have source text, we label it as AI-generated from the topic
        originalText: `AI-generated content based on topic: ${title}`,
        createdAt: Date.now(),
        mindMap: mindMap,
        rooms: [],
        status: 'draft'
      };

      savePalace(newPalace);
      onNavigate(AppRoute.MINDMAP, { id: newPalace.id });

    } catch (err) {
      console.error(err);
      setError("Failed to generate content. Please try a different topic.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <button onClick={() => onNavigate(AppRoute.DASHBOARD)} className="hover:text-primary">Dashboard</button>
        <span>/</span>
        <span className="text-slate-800 font-medium">Create New Palace</span>
      </div>

      <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-8">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">What do you want to master?</h2>
            <p className="text-slate-500 mt-2">Enter a topic, and our AI will build a complete Memory Palace for you.</p>
        </div>
        
        {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r">
                <p className="text-red-700 text-sm">{error}</p>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Topic
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Quantum Physics, The French Revolution, React Hooks"
              className="w-full px-5 py-4 text-lg rounded-xl border border-slate-300 focus:ring-4 focus:ring-indigo-100 focus:border-primary outline-none transition shadow-sm"
              maxLength={100}
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className={`w-full py-4 px-6 text-lg font-bold text-white rounded-xl shadow-lg transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3
                ${loading || !title.trim() ? 'bg-slate-300 cursor-not-allowed transform-none shadow-none' : 'bg-gradient-to-r from-primary to-indigo-600 hover:shadow-xl'}`}
          >
            {loading ? (
                <>
                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Researching & Building...
                </>
            ) : (
                <>
                <span>Generate Palace</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>
                </>
            )}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
                Powered by Gemini 2.5 Flash • Generates structured Mind Maps & 3D Spatial Descriptions
            </p>
        </div>
      </div>
    </div>
  );
};

export default TextInput;