'use client';

import { useAppStore, ViewType } from '@/store/useAppStore';
import AudioPlayer from '@/components/sonora/AudioPlayer';
import MusicLibrary from '@/components/sonora/MusicLibrary';
import PlayerView from '@/components/sonora/PlayerView';
import AdminPanel from '@/components/sonora/AdminPanel';

function NavigationBar() {
  const { currentView, setCurrentView, player, isAdmin } = useAppStore();
  const hasSong = !!player.currentSong;

  const navItems: { view: ViewType; label: string; icon: JSX.Element }[] = [
    {
      view: 'library',
      label: 'Biblioteca',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      view: 'player',
      label: 'Reproductor',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
        </svg>
      ),
    },
    {
      view: 'admin',
      label: 'Admin',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-16 flex-col items-center py-6 bg-card/50 backdrop-blur-xl border-r border-border z-40">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-8">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>

        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setCurrentView(item.view)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-all ${
              currentView === item.view
                ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            } ${item.view === 'player' && !hasSong ? 'opacity-40 cursor-not-allowed' : ''}`}
            disabled={item.view === 'player' && !hasSong}
            title={item.label}
            aria-label={item.label}
          >
            {item.icon}
          </button>
        ))}

        {isAdmin && (
          <div className="mt-auto">
            <div className="w-2 h-2 rounded-full bg-green-500 mx-auto" title="Admin activo" />
          </div>
        )}
      </nav>

      {/* Mobile Bottom Bar */}
      <nav className="lg:hidden fixed bottom-16 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-40 px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => setCurrentView(item.view)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${
                currentView === item.view
                  ? 'text-purple-400'
                  : 'text-muted-foreground'
              } ${item.view === 'player' && !hasSong ? 'opacity-40' : ''}`}
              disabled={item.view === 'player' && !hasSong}
              aria-label={item.label}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

export default function Home() {
  const { currentView, player } = useAppStore();

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />

      {/* Main content area - offset for sidebar on desktop */}
      <main className="lg:ml-16 pb-32 lg:pb-24">
        {currentView === 'library' && <MusicLibrary />}
        {currentView === 'player' && <PlayerView />}
        {currentView === 'admin' && <AdminPanel />}
        {currentView === 'search' && <MusicLibrary />}
      </main>

      {/* Audio player (always visible when song is loaded) */}
      <AudioPlayer />
    </div>
  );
}
