import { AlertCircle, Folder, Loader2, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { EmptyState } from './components/EmptyState';
import { FolderPicker } from './components/FolderPicker';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { Topbar } from './components/Topbar';
import { VideoCard, VideoRow } from './components/VideoCard';
import type {
  LibraryPayload, PlayerInfo, SortKey, ToastMessage, VideoItem, ViewMode,
} from './types';
import { errorMessage, formatSize, readStore, writeStore } from './utils';

function SkeletonGrid() {
  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center gap-2 text-xs text-mist-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
        正在扫描文件夹、匹配封面…
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index}>
            <div className="skeleton aspect-video rounded-xl" />
            <div className="skeleton mt-3 h-3 w-3/4 rounded" />
            <div className="skeleton mt-2 h-2.5 w-1/2 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function NoResult({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="mx-auto max-w-md py-24 text-center animate-fade-up">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-slate-900/[0.10] bg-slate-900/[0.03]">
        <Search className="h-6 w-6 text-mist-500" />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-mist-100">没有找到匹配的视频</h2>
      <p className="mt-2 text-sm text-mist-400">
        {query ? `「${query}」没有匹配结果，换个关键词试试。` : '这个文件夹里没有可识别的视频文件。'}
      </p>
      {query && (
        <button type="button" onClick={onClear} className="btn-ghost mt-5 px-4 py-2 text-xs">
          清空搜索
        </button>
      )}
    </div>
  );
}

export default function App() {
  const [library, setLibrary] = useState<LibraryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>(() => readStore('sort', 'name' as SortKey));
  const [view, setView] = useState<ViewMode>(() => readStore('view', 'grid' as ViewMode));
  const [grouped, setGrouped] = useState(() => readStore('grouped', false));
  const [recursive, setRecursive] = useState(() => readStore('recursive', true));
  const [recent, setRecent] = useState<string[]>(() => readStore('recent', [] as string[]));
  const [playerPath, setPlayerPath] = useState(() => readStore('player', ''));
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readStore('sidebarCollapsed', true));
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const booted = useRef(false);

  const notify = useCallback((type: ToastMessage['type'], text: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), type, text });
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const touchRecent = useCallback((target: string) => {
    setRecent((previous) => {
      const next = [target, ...previous.filter((item) => item !== target)].slice(0, 8);
      writeStore('recent', next);
      return next;
    });
  }, []);

  const load = useCallback(async (target: string, includeSubfolders: boolean) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.open(target, includeSubfolders);
      setLibrary(data);
      setQuery('');
      writeStore('last', target);
      touchRecent(target);
      notify(
        'success',
        `已加载 ${data.count} 个视频，耗时 ${data.durationMs} ms${data.truncated ? '（达到扫描上限，部分文件未显示）' : ''}`,
      );
    } catch (caught) {
      const message = errorMessage(caught);
      setError(message);
      notify('error', message);
    } finally {
      setLoading(false);
    }
  }, [notify, touchRecent]);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    api.detectPlayer()
      .then(setPlayerInfo)
      .catch(() => setPlayerInfo({ found: false, path: null, candidates: [] }));
    // 支持 ?folder=绝对路径 直接打开指定文件夹，方便演示、书签或分享本机路径
    const folderParam = new URLSearchParams(window.location.search).get('folder');
    const last = folderParam || readStore<string | null>('last', null);
    if (last) void load(last, readStore('recursive', true));
  }, [load]);

  useEffect(() => { writeStore('view', view); }, [view]);
  useEffect(() => { writeStore('sort', sort); }, [sort]);
  useEffect(() => { writeStore('grouped', grouped); }, [grouped]);
  useEffect(() => { writeStore('player', playerPath); }, [playerPath]);
  useEffect(() => { writeStore('sidebarCollapsed', sidebarCollapsed); }, [sidebarCollapsed]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (event.key === '/' && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setPickerOpen(false);
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const play = useCallback(async (video: VideoItem) => {
    try {
      const result = await api.play(video.id, playerPath.trim() || undefined);
      notify('success', `已用 ${result.player} 打开「${video.name}」`);
    } catch (caught) {
      const message = errorMessage(caught);
      notify('error', message);
      if (/PotPlayer|路径无效/.test(message)) setSettingsOpen(true);
    }
  }, [notify, playerPath]);

  const reveal = useCallback(async (video: VideoItem) => {
    try {
      await api.reveal(video.id);
    } catch (caught) {
      notify('error', errorMessage(caught));
    }
  }, [notify]);

  const pickSystem = useCallback(async () => {
    setPicking(true);
    try {
      const result = await api.pick();
      if (result.path) {
        setPickerOpen(false);
        await load(result.path, recursive);
      }
    } catch (caught) {
      notify('error', errorMessage(caught));
      setPickerOpen(true);
    } finally {
      setPicking(false);
    }
  }, [load, notify, recursive]);

  const refreshDetect = useCallback(async () => {
    setDetecting(true);
    try {
      const info = await api.detectPlayer(true);
      setPlayerInfo(info);
      notify(
        info.found ? 'success' : 'info',
        info.found ? `检测到 ${info.candidates.length} 个 PotPlayer 可执行文件` : '仍未找到 PotPlayer，请手动指定路径',
      );
    } catch (caught) {
      notify('error', errorMessage(caught));
    } finally {
      setDetecting(false);
    }
  }, [notify]);

  const changeRecursive = useCallback((value: boolean) => {
    setRecursive(value);
    writeStore('recursive', value);
    if (library) void load(library.root, value);
  }, [library, load]);

  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const list = (library?.videos ?? []).filter((video) =>
      !keyword ||
      video.name.toLowerCase().includes(keyword) ||
      video.relativePath.toLowerCase().includes(keyword),
    );
    const sorted = [...list];
    switch (sort) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true }));
        break;
      case 'modified':
        sorted.sort((a, b) => b.modifiedAt - a.modifiedAt);
        break;
      case 'size':
        sorted.sort((a, b) => b.size - a.size);
        break;
      case 'folder':
        sorted.sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'zh-CN', { numeric: true }));
        break;
    }
    return sorted;
  }, [library, query, sort]);

  const groups = useMemo(() => {
    if (!grouped || view === 'list') return [{ name: '', videos: visible }];
    const map = new Map<string, VideoItem[]>();
    for (const video of visible) {
      const key = video.folder || '根目录';
      const items = map.get(key) ?? [];
      items.push(video);
      map.set(key, items);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'zh-CN', { numeric: true }))
      .map(([name, videos]) => ({ name, videos }));
  }, [visible, grouped, view]);

  const stats = useMemo(() => {
    const videos = library?.videos ?? [];
    return {
      total: videos.length,
      withCover: videos.filter((video) => video.hasCover).length,
      totalSize: videos.reduce((sum, video) => sum + video.size, 0),
      folderCount: library?.folders.filter(Boolean).length ?? 0,
    };
  }, [library]);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        root={library?.root ?? null}
        recent={recent}
        total={stats.total}
        withCover={stats.withCover}
        totalSize={stats.totalSize}
        folderCount={stats.folderCount}
        playerInfo={playerInfo}
        playerPath={playerPath}
        loading={loading}
        collapsed={sidebarCollapsed}
        onOpenRecent={(target) => void load(target, recursive)}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggle={() => setSidebarCollapsed((value) => !value)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          root={library?.root ?? null}
          count={library?.count ?? 0}
          visibleCount={visible.length}
          query={query}
          sort={sort}
          view={view}
          grouped={grouped}
          loading={loading}
          searchRef={searchRef}
          onQueryChange={setQuery}
          onSortChange={setSort}
          onViewChange={setView}
          onToggleGrouped={() => setGrouped((value) => !value)}
          onPickSystem={() => void pickSystem()}
          picking={picking}
          onRefresh={() => { if (library) void load(library.root, recursive); }}
        />

        <main className="relative flex-1 px-5 pb-16 pt-7 lg:px-9">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-500/[0.07] px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-rose-700">打开文件夹失败</p>
                <p className="mt-0.5 break-words text-xs text-rose-600">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-rose-500 transition hover:text-rose-700"
                aria-label="关闭错误提示"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {library?.truncated && !loading && (
            <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] px-4 py-2.5 text-xs text-amber-800">
              文件数量较多，已达到单次扫描上限（5000 个视频），建议把媒体库拆成更小的文件夹。
            </div>
          )}

          {loading ? (
            <SkeletonGrid />
          ) : !library ? (
            <EmptyState
              onOpen={() => setPickerOpen(true)}
              onPickSystem={() => void pickSystem()}
              picking={picking}
            />
          ) : visible.length === 0 ? (
            <NoResult query={query} onClear={() => setQuery('')} />
          ) : (
            groups.map((group) => (
              <section key={group.name || '__all__'} className="mb-9">
                {group.name && (
                  <div className="mb-4 flex items-center gap-2.5">
                    <Folder className="h-4 w-4 text-brand-600" />
                    <h2 className="truncate text-sm font-semibold text-mist-200">{group.name}</h2>
                    <span className="rounded-full border border-slate-900/[0.10] px-2 py-0.5 font-mono text-[10px] text-mist-500">
                      {group.videos.length}
                    </span>
                    <span className="h-px flex-1 bg-slate-900/[0.06]" />
                  </div>
                )}
                {view === 'grid' ? (
                  <div className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {group.videos.map((video) => (
                      <VideoCard key={video.id} video={video} onPlay={play} onReveal={reveal} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {group.videos.map((video) => (
                      <VideoRow key={video.id} video={video} onPlay={play} onReveal={reveal} />
                    ))}
                  </div>
                )}
              </section>
            ))
          )}

          {library && !loading && visible.length > 0 && (
            <footer className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-900/[0.07] pt-5 text-[11px] text-mist-500">
              <span>扫描耗时 {library.durationMs} ms</span>
              <span>总容量 {formatSize(stats.totalSize)}</span>
              <span>{stats.withCover} 个视频有同名封面</span>
              <span className="ml-auto">数据仅来自本地文件系统 · 无数据库</span>
            </footer>
          )}
        </main>
      </div>

      <FolderPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(target) => { setPickerOpen(false); void load(target, recursive); }}
        onPickSystem={() => void pickSystem()}
        picking={picking}
        recursive={recursive}
        onRecursiveChange={changeRecursive}
        initialPath={library?.root ?? null}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        playerPath={playerPath}
        onPlayerPathChange={setPlayerPath}
        playerInfo={playerInfo}
        onRefreshDetect={() => void refreshDetect()}
        detecting={detecting}
        recursive={recursive}
        onRecursiveChange={changeRecursive}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
