import React, { useEffect, useState } from 'react';
import { MemoryPalace, AppRoute } from '../types';
import { getPalaces, deletePalace } from '../services/storageService';

interface DashboardProps {
  onNavigate: (route: AppRoute, params?: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [palaces, setPalaces] = useState<MemoryPalace[]>([]);

  useEffect(() => {
    setPalaces(getPalaces().sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this Memory Palace?')) {
      deletePalace(id);
      setPalaces(prev => prev.filter(p => p.id !== id));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-primary to-indigo-800 rounded-2xl p-8 text-white shadow-xl">
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-3xl font-bold">Welcome Back, Scholar</h1>
          <p className="text-indigo-100 max-w-xl">
            Ready to expand your mind? Create a new Memory Palace to transform complex text into an unforgettable 3D journey.
          </p>
        </div>
        <button
          onClick={() => onNavigate(AppRoute.CREATE)}
          className="mt-6 md:mt-0 bg-accent hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition hover:scale-105 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
          Create New Palace
        </button>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Your Palaces
        </h2>
        
        {palaces.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-500 text-lg">No palaces found. Start your journey by creating one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {palaces.map(palace => (
              <div 
                key={palace.id}
                onClick={() => {
                  if (palace.status === 'draft') {
                    onNavigate(AppRoute.MINDMAP, { id: palace.id });
                  } else {
                    onNavigate(AppRoute.PALACE_OVERVIEW, { id: palace.id });
                  }
                }}
                className="group bg-white rounded-xl shadow-sm hover:shadow-md border border-slate-200 overflow-hidden cursor-pointer transition-all hover:border-primary"
              >
                <div className="h-32 bg-slate-100 relative overflow-hidden">
                   {/* Placeholder visual based on status */}
                   <div className={`absolute inset-0 opacity-20 ${palace.status === 'completed' ? 'bg-secondary' : 'bg-slate-400'}`}></div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl">
                        {palace.status === 'completed' ? '🏛️' : '🧠'}
                      </span>
                   </div>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-primary truncate pr-4">
                      {palace.title}
                    </h3>
                    <button 
                      onClick={(e) => handleDelete(e, palace.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete Palace"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                  <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                    {palace.originalText}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{new Date(palace.createdAt).toLocaleDateString()}</span>
                    <span className={`px-2 py-1 rounded-full ${
                      palace.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {palace.status === 'completed' ? `${palace.rooms.length} Rooms` : 'Draft'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
