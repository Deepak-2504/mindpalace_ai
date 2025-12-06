import React from 'react';
import { AppRoute } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute, params?: any) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentRoute, onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => onNavigate(AppRoute.DASHBOARD)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain-circuit">
              <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
              <path d="M9 13a4.5 4.5 0 0 0 3-4"/>
              <path d="M6.003 5.125A3 3 0 0 0 10.407 8"/>
              <path d="M12 13a4.5 4.5 0 0 0 3 4"/>
              <path d="M12 18a3 3 0 1 0 5.997-.125 4 4 0 0 0 2.526-5.77 4 4 0 0 0-.556-6.588A4 4 0 1 0 12 5Z"/>
            </svg>
            <span className="font-bold text-xl tracking-tight">MindPalace AI</span>
          </div>

          <nav className="flex items-center gap-4">
             {currentRoute !== AppRoute.DASHBOARD && (
                <button 
                  onClick={() => onNavigate(AppRoute.DASHBOARD)}
                  className="text-sm font-medium hover:text-indigo-200 transition-colors"
                >
                  Dashboard
                </button>
             )}
             <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold border border-indigo-400">
                ME
             </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm">
          <p>© 2025 MindPalace AI. Built for better learning.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
