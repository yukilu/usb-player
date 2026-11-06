export interface VideoItem {
  id: string;
  name: string;
  fileName: string;
  ext: string;
  relativePath: string;
  folder: string;
  size: number;
  modifiedAt: number;
  coverUrl: string | null;
  hasCover: boolean;
}

export interface LibraryPayload {
  root: string;
  recursive: boolean;
  count: number;
  folders: string[];
  videos: VideoItem[];
  truncated: boolean;
  durationMs: number;
}

export interface FsEntry {
  name: string;
  path: string;
}

export interface BrowsePayload {
  path: string | null;
  parent: string | null;
  entries: FsEntry[];
}

export interface RootsPayload {
  platform: string;
  home: string;
  shortcuts: FsEntry[];
  drives: FsEntry[];
}

export interface PlayerInfo {
  found: boolean;
  path: string | null;
  candidates: string[];
}

export type SortKey = 'name' | 'modified' | 'size' | 'folder';
export type ViewMode = 'grid' | 'list';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  text: string;
}
