import { createHash } from 'node:crypto';
import { promises as fs, type Dirent } from 'node:fs';
import path from 'node:path';
import type { LibraryPayload, VideoItem } from './types.js';
import type { LibraryStore } from './store.js';

export const VIDEO_EXTS = new Set([
  'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg',
  'ts', 'm2ts', 'rmvb', 'rm', 'vob', '3gp', 'asf', 'divx', 'f4v', 'ogv',
]);

/** 按优先级排列：同名图片同时存在多种格式时，取靠前的那个 */
export const IMAGE_PRIORITY = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'jfif', 'bmp', 'gif'];
const IMAGE_RANK = new Map(IMAGE_PRIORITY.map((ext, index) => [ext, index]));

const SKIP_DIRS = new Set([
  'node_modules', '$recycle.bin', 'system volume information', '.git', '.svn',
  '__macosx', 'appdata', 'windows', 'program files', 'program files (x86)',
  'programdata', 'recovery', 'perflogs', 'msocache', '.workbuddy', '.cache',
]);

const MAX_DEPTH = 12;
const MAX_VIDEOS = 5000;
const MAX_ENTRIES = 60000;

interface RawVideo {
  abs: string;
  fileName: string;
  name: string;
  ext: string;
  folder: string;
}

function extOf(name: string): string {
  const index = name.lastIndexOf('.');
  return index <= 0 ? '' : name.slice(index + 1).toLowerCase();
}

function baseOf(name: string): string {
  const index = name.lastIndexOf('.');
  return index <= 0 ? name : name.slice(0, index);
}

export function isVideoFile(name: string): boolean {
  return VIDEO_EXTS.has(extOf(name));
}

export function isImageFile(name: string): boolean {
  return IMAGE_RANK.has(extOf(name));
}

const byName = (a: string, b: string) =>
  a.localeCompare(b, 'zh-CN', { numeric: true, sensitivity: 'base' });

/**
 * 扫描目录并建立 id 索引。
 *
 * 封面规则：与视频同目录、同主文件名的图片（movie.mp4 -> movie.jpg）。
 * 同时兼容电影刮削器常见的 movie.mp4.jpg 形式。
 * 没有匹配到封面时 coverUrl 为 null，由前端展示默认封面。
 */
export async function scanLibrary(
  root: string,
  recursive: boolean,
  store: LibraryStore,
): Promise<LibraryPayload> {
  const started = Date.now();
  const images = new Map<string, string>();
  const raws: RawVideo[] = [];
  let truncated = false;
  let visited = 0;

  const walk = async (dir: string, rel: string, depth: number): Promise<void> => {
    if (depth > MAX_DEPTH || truncated) return;

    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // 无权限 / 目录被移除，跳过即可
    }

    for (const entry of entries) {
      if (++visited > MAX_ENTRIES || truncated) {
        truncated = true;
        return;
      }
      const abs = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!recursive && depth === 0) continue;
        const lower = entry.name.toLowerCase();
        if (entry.name.startsWith('.') || SKIP_DIRS.has(lower)) continue;
        await walk(abs, rel ? path.join(rel, entry.name) : entry.name, depth + 1);
      } else if (entry.isFile()) {
        const ext = extOf(entry.name);
        if (IMAGE_RANK.has(ext)) {
          const key = `${dir.toLowerCase()}::${baseOf(entry.name).toLowerCase()}`;
          const previous = images.get(key);
          if (!previous || IMAGE_RANK.get(ext)! < IMAGE_RANK.get(extOf(previous))!) {
            images.set(key, abs);
          }
        } else if (VIDEO_EXTS.has(ext)) {
          if (raws.length >= MAX_VIDEOS) {
            truncated = true;
            return;
          }
          raws.push({
            abs,
            fileName: entry.name,
            name: baseOf(entry.name),
            ext,
            folder: rel.split(path.sep).join('/'),
          });
        }
      }
    }
  };

  store.reset(root);
  await walk(root, '', 0);

  const videos: VideoItem[] = [];
  for (let offset = 0; offset < raws.length; offset += 64) {
    const batch = raws.slice(offset, offset + 64);
    const stats = await Promise.all(batch.map((item) => fs.stat(item.abs).catch(() => null)));

    batch.forEach((item, index) => {
      const stat = stats[index];
      if (!stat) return;

      const dirKey = path.dirname(item.abs).toLowerCase();
      const cover =
        images.get(`${dirKey}::${item.name.toLowerCase()}`) ??
        images.get(`${dirKey}::${item.fileName.toLowerCase()}`) ??
        null;

      const id = createHash('sha1').update(item.abs).digest('hex').slice(0, 20);
      store.add(id, item.abs, cover);

      videos.push({
        id,
        name: item.name,
        fileName: item.fileName,
        ext: item.ext,
        relativePath: item.folder ? `${item.folder}/${item.fileName}` : item.fileName,
        folder: item.folder,
        size: stat.size,
        modifiedAt: Math.round(stat.mtimeMs),
        coverUrl: cover ? `/api/cover/${id}` : null,
        hasCover: cover !== null,
      });
    });
  }

  videos.sort(
    (a, b) => byName(a.name, b.name) || byName(a.relativePath, b.relativePath),
  );

  return {
    root,
    recursive,
    count: videos.length,
    folders: [...new Set(videos.map((video) => video.folder))].sort(byName),
    videos,
    truncated,
    durationMs: Date.now() - started,
  };
}
