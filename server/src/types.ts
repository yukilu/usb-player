export interface VideoItem {
  /** 稳定的短哈希，用作封面 / 播放接口的凭据，避免把绝对路径暴露给浏览器 */
  id: string;
  /** 去掉扩展名后的文件名 */
  name: string;
  /** 完整文件名 */
  fileName: string;
  /** 小写扩展名，不含点 */
  ext: string;
  /** 相对所选文件夹的路径 */
  relativePath: string;
  /** 相对所在子目录，根目录为空字符串 */
  folder: string;
  size: number;
  modifiedAt: number;
  /** 有同名封面图时指向 /api/cover/:id，否则为 null（前端使用默认封面） */
  coverUrl: string | null;
  hasCover: boolean;
}

export interface LibraryPayload {
  root: string;
  recursive: boolean;
  count: number;
  folders: string[];
  videos: VideoItem[];
  /** 超过扫描上限时为 true，前端会提示 */
  truncated: boolean;
  durationMs: number;
}

export interface FsEntry {
  name: string;
  path: string;
}

export interface BrowsePayload {
  /** null 表示当前是「我的电脑 / 磁盘列表」层级 */
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
