import React, { useEffect, useState, useRef } from 'react';
import { AppRoute, MemoryPalace, Room, PalaceObject } from '../types';
import { getPalaceById } from '../services/storageService';
import { generateSpeech } from '../services/geminiService';

interface RoomViewProps {
  palaceId: string;
  roomId: string;
  onNavigate: (route: AppRoute, params?: any) => void;
}

interface PresentationSegment {
  type: 'intro' | 'object' | 'outro';
  text: string;
  obj?: PalaceObject;
  startTimeRatio: number; // 0 to 1
  endTimeRatio: number; // 0 to 1
}

const RoomView: React.FC<RoomViewProps> = ({ palaceId, roomId, onNavigate }) => {
  const [palace, setPalace] = useState<MemoryPalace | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [currentObjId, setCurrentObjId] = useState<string | null>(null);
  
  // Audio/Video State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);

  // Slideshow State
  const [playlist, setPlaylist] = useState<PresentationSegment[]>([]);
  const [activeSegment, setActiveSegment] = useState<PresentationSegment | null>(null);

  useEffect(() => {
    const p = getPalaceById(palaceId);
    if (p) {
      setPalace(p);
      const r = p.rooms.find(rm => rm.id === roomId);
      if (r) {
          setRoom(r);
          resetPlayer();
      }
    }
    
    return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
    };
  }, [palaceId, roomId]);

  const resetPlayer = () => {
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
      }
      setAudioUrl(null);
      setIsPlaying(false);
      setProgress(0);
      setPlaylist([]);
      setActiveSegment(null);
  };

  useEffect(() => {
      // Audio progress listener
      const audio = audioRef.current;
      if (!audio) return;

      const updateProgress = () => {
          if (audio.duration) {
              const currentRatio = audio.currentTime / audio.duration;
              setProgress(currentRatio * 100);

              // Find active segment
              const segment = playlist.find(s => currentRatio >= s.startTimeRatio && currentRatio < s.endTimeRatio);
              if (segment && segment !== activeSegment) {
                  setActiveSegment(segment);
                  if (segment.type === 'object' && segment.obj) {
                      setCurrentObjId(segment.obj.id);
                  } else {
                      setCurrentObjId(null);
                  }
              }
          }
      };
      
      const handleEnded = () => {
          setIsPlaying(false);
          setProgress(100);
          setActiveSegment(null);
          setCurrentObjId(null);
      };

      audio.addEventListener('timeupdate', updateProgress);
      audio.addEventListener('ended', handleEnded);
      
      return () => {
          audio.removeEventListener('timeupdate', updateProgress);
          audio.removeEventListener('ended', handleEnded);
      };
  }, [audioUrl, isPlaying, playlist]);

  const togglePlay = async () => {
      if (isPlaying) {
          audioRef.current?.pause();
          setIsPlaying(false);
          return;
      }

      if (audioUrl) {
          // Resume
          audioRef.current?.play();
          setIsPlaying(true);
      } else {
          // Generate New
          if (!room) return;
          setIsLoadingAudio(true);
          try {
              // 1. Construct Narrative & Playlist
              const segments: PresentationSegment[] = [];
              let narrative = `Welcome to the ${room.title}. ${room.description}. `;
              
              segments.push({
                  type: 'intro',
                  text: narrative,
                  startTimeRatio: 0,
                  endTimeRatio: 0
              });

              for (const obj of room.objects) {
                  const part = `Next, consider the concept of ${obj.name}. ${obj.conceptDefinition || ''} To remember this, visualize ${obj.description}. `;
                  segments.push({
                      type: 'object',
                      text: part,
                      obj: obj,
                      startTimeRatio: 0,
                      endTimeRatio: 0
                  });
                  narrative += part;
              }

              const outro = " This concludes our tour of this room.";
              narrative += outro;
              segments.push({
                  type: 'outro',
                  text: outro,
                  startTimeRatio: 0,
                  endTimeRatio: 0
              });

              // 2. Calculate Timing Ratios based on text length
              const totalLength = narrative.length;
              let currentLength = 0;
              segments.forEach(seg => {
                  seg.startTimeRatio = currentLength / totalLength;
                  currentLength += seg.text.length;
                  seg.endTimeRatio = currentLength / totalLength;
              });
              // Adjust last end to 1.1 to be safe
              segments[segments.length - 1].endTimeRatio = 1.1;

              setPlaylist(segments);

              // 3. Generate Audio
              const url = await generateSpeech(narrative);
              if (url) {
                  setAudioUrl(url);
                  const audio = new Audio(url);
                  audioRef.current = audio;
                  audio.play();
                  setIsPlaying(true);
                  
                  // Attach listeners again
                  audio.addEventListener('timeupdate', () => {
                     if (audio.duration && playlist.length > 0) {
                        const ratio = audio.currentTime / audio.duration;
                        setProgress(ratio * 100);
                     }
                  });
                  audio.addEventListener('ended', () => {
                      setIsPlaying(false);
                      setProgress(100);
                  });
              } else {
                  alert("Could not generate audio explanation. Please try again.");
              }
          } catch (e) {
              console.error(e);
              alert("Error generating explanation.");
          } finally {
              setIsLoadingAudio(false);
          }
      }
  };

  if (!palace || !room) return <div>Loading Room...</div>;

  const roomIndex = palace.rooms.findIndex(r => r.id === roomId);
  const prevRoom = palace.rooms[roomIndex - 1];
  const nextRoom = palace.rooms[roomIndex + 1];

  return (
    <div className="max-w-6xl mx-auto px-4">
       {/* Navigation Bar */}
       <div className="flex items-center justify-between mb-6">
         <button 
           onClick={() => onNavigate(AppRoute.PALACE_OVERVIEW, { id: palaceId })}
           className="text-slate-500 hover:text-primary flex items-center gap-2"
         >
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
           Back to Palace
         </button>
         
         <div className="flex gap-4">
            <button
                disabled={!prevRoom}
                onClick={() => onNavigate(AppRoute.ROOM_VIEW, { palaceId, roomId: prevRoom.id })}
                className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${!prevRoom ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100'}`}
            >
                Previous Room
            </button>
            <button
                disabled={!nextRoom}
                onClick={() => onNavigate(AppRoute.ROOM_VIEW, { palaceId, roomId: nextRoom.id })}
                className={`px-4 py-2 rounded-lg bg-primary text-white flex items-center gap-2 ${!nextRoom ? 'opacity-30 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
            >
                Next Room
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
         </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Visual & Video Area */}
          <div className="lg:col-span-2 space-y-6">
             <div className="bg-black rounded-2xl overflow-hidden shadow-2xl relative aspect-video group select-none">
                {/* Simulated Video Background */}
                <img 
                    src={room.videoPlaceholderUrl} 
                    alt="Room Visual" 
                    className={`w-full h-full object-cover transition-transform duration-[20s] ease-linear ${isPlaying ? 'scale-110' : 'scale-100'}`} 
                />
                
                {/* Dark Overlay for Readability */}
                <div className="absolute inset-0 bg-black/40"></div>

                {/* Slideshow Content Overlay */}
                {isPlaying && activeSegment && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
                        {activeSegment.type === 'intro' && (
                             <div className="bg-black/60 backdrop-blur-md p-6 rounded-xl border border-white/10 max-w-lg">
                                 <h2 className="text-3xl font-bold text-white mb-2">{room.title}</h2>
                                 <p className="text-indigo-200 text-lg">Room Tour</p>
                             </div>
                        )}
                        {activeSegment.type === 'object' && activeSegment.obj && (
                             <div className="flex flex-col gap-4 max-w-xl">
                                <div className="bg-indigo-600/90 backdrop-blur-md p-6 rounded-xl shadow-xl border border-indigo-400">
                                    <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-1 block">Concept</span>
                                    <h2 className="text-3xl font-bold text-white mb-3">{activeSegment.obj.name}</h2>
                                    <p className="text-white text-lg leading-snug">{activeSegment.obj.conceptDefinition || "A key topic component."}</p>
                                </div>
                                
                                <div className="mt-8 transform translate-y-4">
                                     <svg className="w-8 h-8 text-white mx-auto mb-2 animate-bounce" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                </div>

                                <div className="bg-white/95 backdrop-blur-md p-5 rounded-xl shadow-2xl text-slate-800 border-l-4 border-accent">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Memory Visual</span>
                                    <p className="text-xl font-serif italic">"{activeSegment.obj.description}"</p>
                                </div>
                             </div>
                        )}
                         {activeSegment.type === 'outro' && (
                             <div className="bg-black/60 backdrop-blur-md p-6 rounded-xl border border-white/10">
                                 <h2 className="text-2xl font-bold text-white">Tour Complete</h2>
                             </div>
                        )}
                    </div>
                )}

                {/* Play Button Overlay */}
                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer" onClick={togglePlay}>
                        <button 
                            disabled={isLoadingAudio}
                            className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center border-2 border-white hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-wait shadow-xl"
                        >
                            {isLoadingAudio ? (
                                <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                            )}
                        </button>
                    </div>
                )}
                
                {/* Pause Button (Bottom Right) */}
                {isPlaying && (
                     <div className="absolute bottom-6 right-6 z-20">
                         <button onClick={togglePlay} className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                         </button>
                     </div>
                )}

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800/50">
                    <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>

                <div className="absolute top-4 left-4 text-white text-xs bg-black/50 px-3 py-1.5 rounded-full font-medium tracking-wide border border-white/10 backdrop-blur">
                    AI Explainer Mode
                </div>
             </div>

             <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-3xl font-bold text-slate-900">{room.title}</h1>
                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium border border-indigo-100">
                        {room.theme}
                    </span>
                </div>
                <div className="prose prose-slate max-w-none">
                    <p className="text-lg leading-relaxed text-slate-700">{room.description}</p>
                </div>
             </div>
          </div>

          {/* Sidebar: Objects / Subtopics */}
          <div className="lg:col-span-1">
             <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden sticky top-24">
                <div className="bg-slate-50 p-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>
                        Memory Objects ({room.objects.length})
                    </h3>
                </div>
                
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                    {room.objects.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-sm">
                            No distinct objects. This room represents a general concept.
                        </div>
                    ) : (
                        room.objects.map((obj, idx) => (
                            <div 
                                key={obj.id}
                                className={`p-4 cursor-pointer transition-colors border-l-4 ${currentObjId === obj.id ? 'bg-indigo-50 border-primary' : 'hover:bg-slate-50 border-transparent'}`}
                                onClick={() => setCurrentObjId(currentObjId === obj.id ? null : obj.id)}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-xs text-slate-400 font-mono mb-1 block">0{idx + 1}</span>
                                        <h4 className={`font-bold text-sm ${currentObjId === obj.id ? 'text-primary' : 'text-slate-800'}`}>
                                            {obj.name}
                                        </h4>
                                    </div>
                                    <svg 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        width="16" height="16" 
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                        className={`transition-transform duration-200 text-slate-400 ${currentObjId === obj.id ? 'rotate-180' : ''}`}
                                    >
                                        <path d="m6 9 6 6 6-6"/>
                                    </svg>
                                </div>
                                {currentObjId === obj.id && (
                                    <div className="mt-3 space-y-3 animate-fadeIn">
                                        <p className="text-sm text-slate-600 leading-relaxed">
                                            {obj.conceptDefinition}
                                        </p>
                                        <div className="text-sm bg-white p-3 rounded border border-indigo-100 shadow-sm">
                                            <span className="block text-xs font-bold text-indigo-400 mb-1 uppercase tracking-wider">Visual Cue</span>
                                            {obj.description}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
             </div>
          </div>

       </div>
    </div>
  );
};

export default RoomView;