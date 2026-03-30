import { create } from 'zustand';

export type ViewType = 'library' | 'player' | 'admin' | 'search';

export interface LyricLine {
  time: number;
  text: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  genre: string;
  filePath: string;
  coverUrl: string;
  lyricsLrc: string;
  lyricsJson: string;
  playCount: number;
  createdAt: string;
  updatedAt: string;
}

interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: Song[];
  queueIndex: number;
}

interface AppState {
  // Navigation
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  previousView: ViewType;
  setPreviousView: (view: ViewType) => void;

  // Player
  player: PlayerState;
  setCurrentSong: (song: Song | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setQueue: (songs: Song[]) => void;
  setQueueIndex: (index: number) => void;
  playNext: () => void;
  playPrevious: () => void;

  // Library
  songs: Song[];
  setSongs: (songs: Song[]) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Admin
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  adminToken: string;
  setAdminToken: (token: string) => void;

  // Lyrics
  liveTranscript: string;
  setLiveTranscript: (text: string) => void;
  isLiveTranscribing: boolean;
  setIsLiveTranscribing: (active: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentView: 'library',
  setCurrentView: (view) => set({ previousView: get().currentView, currentView: view }),
  previousView: 'library',
  setPreviousView: (view) => set({ previousView: view }),

  // Player
  player: {
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    queue: [],
    queueIndex: 0,
  },
  setCurrentSong: (song) => set((state) => ({
    player: { ...state.player, currentSong: song }
  })),
  setIsPlaying: (playing) => set((state) => ({
    player: { ...state.player, isPlaying: playing }
  })),
  setCurrentTime: (time) => set((state) => ({
    player: { ...state.player, currentTime: time }
  })),
  setDuration: (duration) => set((state) => ({
    player: { ...state.player, duration }
  })),
  setVolume: (volume) => set((state) => ({
    player: { ...state.player, volume }
  })),
  setQueue: (songs) => set((state) => ({
    player: { ...state.player, queue: songs }
  })),
  setQueueIndex: (index) => set((state) => ({
    player: { ...state.player, queueIndex: index }
  })),
  playNext: () => set((state) => {
    const { queue, queueIndex } = state.player;
    const nextIndex = queueIndex + 1;
    if (nextIndex < queue.length) {
      return {
        player: {
          ...state.player,
          queueIndex: nextIndex,
          currentSong: queue[nextIndex],
          currentTime: 0,
          isPlaying: true,
        }
      };
    }
    return {
      player: { ...state.player, isPlaying: false }
    };
  }),
  playPrevious: () => set((state) => {
    const { queue, queueIndex } = state.player;
    const prevIndex = queueIndex - 1;
    if (prevIndex >= 0) {
      return {
        player: {
          ...state.player,
          queueIndex: prevIndex,
          currentSong: queue[prevIndex],
          currentTime: 0,
          isPlaying: true,
        }
      };
    }
    return state;
  }),

  // Library
  songs: [],
  setSongs: (songs) => set({ songs }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Admin
  isAdmin: false,
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  adminToken: '',
  setAdminToken: (token) => set({ adminToken: token }),

  // Lyrics
  liveTranscript: '',
  setLiveTranscript: (text) => set({ liveTranscript: text }),
  isLiveTranscribing: false,
  setIsLiveTranscribing: (active) => set({ isLiveTranscribing: active }),
}));
