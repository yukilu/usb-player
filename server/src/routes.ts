import { createReadStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { pickFolder } from './dialog.js';
import { IMAGE_PRIORITY, VIDEO_EXTS, scanLibrary } from './scanner.js';
import { detectPotPlayer, isExecutable, launchPlayer, revealFile } from './player.js';
import type { LibraryStore } from './store.js';
import type { BrowsePayload, FsEntry, RootsPayload } from './types.js';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Handler = (req: Request, res: Response) => Promise<void> | void;
const wrap = (handler: Handler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve().then(() => handler(req, res)).catch(next);
  };

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', jfif: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp', avif: 'image/avif',
};

/** 与 web/public/default-cover.svg 保持一致：纯浅灰底 + 纯色播放图标，零渐变、无文字、无多余装饰 */
const FALLBACK_COVER = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#d5dae2"/><circle cx="320" cy="176" r="44" fill="#f28a3d"/><path d="M311 158L345 176L311 194Z" fill="#ffffff"/></svg>`;

const HIDDEN_DIRS = new Set([
  'node_modules', '$recycle.bin', 'system volume information', 'appdata',
  'programdata', 'windows', 'recovery', 'perflogs', 'msocache', '.git', '.cache',
]);

const sortEntries = (a: FsEntry, b: FsEntry) =>
  a.name.localeCompare(b.name, 'zh-CN', { numeric: true, sensitivity: 'base' });

async function getRoots(): Promise<RootsPayload> {
  const home = os.homedir();
  const candidates: FsEntry[] = [
    { name: '主目录', path: home },
    { name: '桌面', path: path.join(home, 'Desktop') },
    { name: '下载', path: path.join(home, 'Downloads') },
    { name: '视频', path: path.join(home, 'Videos') },
    { name: '文档', path: path.join(home, 'Documents') },
  ];
  const shortcuts: FsEntry[] = [];
  for (const item of candidates) {
    if (shortcuts.some((existing) => existing.path === item.path)) continue;
    const stat = await fs.stat(item.path).catch(() => null);
    if (stat?.isDirectory()) shortcuts.push(item);
  }

  const drives: FsEntry[] = [];
  if (process.platform === 'win32') {
    for (let code = 65; code <= 90; code += 1) {
      const letter = String.fromCharCode(code);
      const drive = `${letter}:\\`;
      const stat = await fs.stat(drive).catch(() => null);
      if (stat?.isDirectory()) drives.push({ name: `${letter}: 盘`, path: drive });
    }
  } else {
    drives.push({ name: '根目录 /', path: '/' });
  }

  return { platform: process.platform, home, shortcuts, drives };
}

function sendFallbackCover(res: Response): void {
  res.status(200).type('image/svg+xml').set('Cache-Control', 'no-store').send(FALLBACK_COVER);
}

export function createApiRouter(store: LibraryStore): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      platform: process.platform,
      version: '1.0.0',
      videoExts: [...VIDEO_EXTS],
      imageExts: IMAGE_PRIORITY,
    });
  });

  router.get('/fs/roots', wrap(async (_req, res) => {
    res.json(await getRoots());
  }));

  /** 只列目录，不返回文件内容；用于前端内置的文件夹浏览器 */
  router.get('/fs/browse', wrap(async (req, res) => {
    const raw = typeof req.query.path === 'string' ? req.query.path.trim() : '';
    if (!raw) {
      const roots = await getRoots();
      const payload: BrowsePayload = {
        path: null,
        parent: null,
        entries: [...roots.drives, ...roots.shortcuts].sort(sortEntries),
      };
      res.json(payload);
      return;
    }

    const target = path.resolve(raw);
    const stat = await fs.stat(target).catch(() => null);
    if (!stat?.isDirectory()) throw new HttpError(400, '目录不存在或无法访问');

    const dirents = await fs.readdir(target, { withFileTypes: true }).catch(() => []);
    const entries: FsEntry[] = dirents
      .filter((entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        !HIDDEN_DIRS.has(entry.name.toLowerCase()),
      )
      .map((entry) => ({ name: entry.name, path: path.join(target, entry.name) }))
      .sort(sortEntries);

    const parent = path.dirname(target);
    const payload: BrowsePayload = {
      path: target,
      parent: parent === target ? null : parent,
      entries,
    };
    res.json(payload);
  }));

  /** 系统原生文件夹选择对话框 */
  router.post('/fs/pick', wrap(async (_req, res) => {
    const selected = await pickFolder();
    res.json({ path: selected, canceled: selected === null });
  }));

  /** 打开文件夹并扫描（每次都是全新快照，不落任何持久化数据） */
  router.post('/library/open', wrap(async (req, res) => {
    const { path: requested, recursive } = (req.body ?? {}) as {
      path?: unknown;
      recursive?: unknown;
    };
    if (typeof requested !== 'string' || !requested.trim()) {
      throw new HttpError(400, '请提供文件夹路径');
    }

    const root = path.resolve(requested.trim());
    const stat = await fs.stat(root).catch(() => null);
    if (!stat?.isDirectory()) throw new HttpError(400, '文件夹不存在或无法访问');

    const payload = await scanLibrary(root, recursive !== false, store);
    res.json(payload);
  }));

  /** 封面图流；没有同名封面时返回一个内置兜底图 */
  router.get('/cover/:id', wrap(async (req, res) => {
    const cover = store.getCover(req.params.id);
    if (!cover) {
      sendFallbackCover(res);
      return;
    }
    if (!/^[a-f0-9]{20}$/.test(req.params.id)) {
      sendFallbackCover(res);
      return;
    }

    const ext = path.extname(cover).slice(1).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const stream = createReadStream(cover);
    stream.on('error', () => {
      if (!res.headersSent) sendFallbackCover(res);
      else res.destroy();
    });
    stream.pipe(res);
  }));

  router.get('/player/detect', wrap(async (req, res) => {
    try {
      res.json(await detectPotPlayer(req.query.refresh === '1'));
    } catch (error) {
      // 自动检测属于增强能力，失败时也要让页面正常渲染（用户可手动指定路径）
      console.warn('[player] 探测失败：', error instanceof Error ? error.message : error);
      res.json({ found: false, path: null, candidates: [] });
    }
  }));

  router.post('/player/validate', wrap(async (req, res) => {
    const { path: candidate } = (req.body ?? {}) as { path?: unknown };
    const valid = typeof candidate === 'string' && candidate.trim()
      ? await isExecutable(candidate.trim().replace(/^"|"$/g, ''))
      : false;
    res.json({ valid });
  }));

  router.post('/player/play', wrap(async (req, res) => {
    const { id, playerPath } = (req.body ?? {}) as {
      id?: unknown;
      playerPath?: unknown;
    };
    if (typeof id !== 'string') throw new HttpError(400, '缺少视频 id');

    const video = store.getVideo(id);
    if (!video) throw new HttpError(404, '视频不在当前媒体库中，请重新打开文件夹');
    const stat = await fs.stat(video).catch(() => null);
    if (!stat?.isFile()) throw new HttpError(404, '视频文件已不存在');

    let executable = typeof playerPath === 'string' && playerPath.trim()
      ? playerPath.trim().replace(/^"|"$/g, '')
      : '';
    if (executable && !(await isExecutable(executable))) {
      throw new HttpError(400, '自定义的 PotPlayer 路径无效，请在设置中重新指定');
    }
    if (!executable) executable = (await detectPotPlayer()).path ?? '';
    if (!executable) {
      throw new HttpError(404, '没有找到 PotPlayer，请在「设置」里手动指定 PotPlayerMini64.exe 的路径');
    }

    await launchPlayer(executable, video);
    res.json({ ok: true, player: path.basename(executable), file: path.basename(video) });
  }));

  router.post('/player/reveal', wrap(async (req, res) => {
    const { id } = (req.body ?? {}) as { id?: unknown };
    if (typeof id !== 'string') throw new HttpError(400, '缺少视频 id');
    const video = store.getVideo(id);
    if (!video) throw new HttpError(404, '视频不在当前媒体库中');
    revealFile(video);
    res.json({ ok: true });
  }));

  return router;
}
