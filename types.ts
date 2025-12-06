export interface MindMapNode {
  id: string;
  label: string;
  description?: string;
  children?: MindMapNode[];
}

export interface PalaceObject {
  id: string;
  name: string;
  conceptDefinition?: string; // The educational explanation
  description: string; // The memory cue
  position: { x: number; y: number };
}

export interface Room {
  id: string;
  title: string;
  description: string;
  theme: string;
  videoPlaceholderUrl: string; // URL for the placeholder image/video thumbnail
  objects: PalaceObject[];
}

export interface MemoryPalace {
  id: string;
  title: string;
  originalText: string;
  createdAt: number;
  mindMap: MindMapNode;
  rooms: Room[];
  status: 'draft' | 'processing' | 'completed';
}

export enum AppRoute {
  DASHBOARD = 'dashboard',
  CREATE = 'create',
  MINDMAP = 'mindmap',
  PALACE_OVERVIEW = 'palace_overview',
  ROOM_VIEW = 'room_view',
}