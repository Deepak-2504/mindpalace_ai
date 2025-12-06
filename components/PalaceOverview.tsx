import React, { useEffect, useState } from 'react';
import { AppRoute, MemoryPalace } from '../types';
import { getPalaceById } from '../services/storageService';

interface PalaceOverviewProps {
  palaceId: string;
  onNavigate: (route: AppRoute, params?: any) => void;
}

const PalaceOverview: React.FC<PalaceOverviewProps> = ({ palaceId, onNavigate }) => {
  const [palace, setPalace] = useState<MemoryPalace | null>(null);

  useEffect(() => {
    const data = getPalaceById(palaceId);
    if (data) setPalace(data);
  }, [palaceId]);

  if (!palace) return <div>Loading Palace...</div>;

  return (
    <div className="max-w-6xl mx-auto pb-12">
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
            <div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                    <button onClick={() => onNavigate(AppRoute.DASHBOARD)} className="hover:text-primary">Dashboard</button>
                    <span>/</span>
                    <span className="text-slate-800 font-medium">Overview</span>
                </div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">{palace.title}</h1>
                <p className="text-slate-500">Contains {palace.rooms.length} memory rooms</p>
            </div>
            
            <button 
                onClick={() => onNavigate(AppRoute.MINDMAP, { id: palace.id })}
                className="text-primary hover:text-indigo-800 font-medium flex items-center gap-1"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                View Mind Map
            </button>
        </div>

        {/* Floor Plan / Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {palace.rooms.map((room, index) => (
                <div 
                    key={room.id}
                    onClick={() => onNavigate(AppRoute.ROOM_VIEW, { palaceId: palace.id, roomId: room.id })}
                    className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 overflow-hidden cursor-pointer flex flex-col h-full"
                >
                    <div className="relative h-48 overflow-hidden">
                        <img 
                            src={room.videoPlaceholderUrl} 
                            alt={room.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-6">
                             <div className="flex justify-between items-end">
                                <h3 className="text-white font-bold text-xl">{room.title}</h3>
                                <span className="text-white/80 text-xs bg-black/30 px-2 py-1 rounded backdrop-blur-sm">
                                    Room {index + 1}
                                </span>
                             </div>
                        </div>
                    </div>
                    
                    <div className="p-6 flex-grow flex flex-col">
                        <div className="mb-4">
                            <span className="text-xs font-bold tracking-wider text-primary uppercase">{room.theme}</span>
                        </div>
                        <p className="text-slate-600 text-sm mb-6 line-clamp-3 flex-grow">
                            {room.description}
                        </p>
                        
                        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>
                                {room.objects.length} Memory Objects
                            </span>
                            <span className="text-primary font-bold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center">
                                Enter 
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default PalaceOverview;
