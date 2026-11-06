import {
  ArrowUpDown, FolderOpen, LayoutGrid, List, Layers, Loader2, RefreshCw, Search, X, HardDrive,
} from 'lucide-react';
import type { RefObject } from 'react';
import type { SortKey, ViewMode } from '../types';
import { cx, pathSegments } from '../utils';

interface TopbarProps {
  root: string | null;
  count: number;
  visibleCount: number;
  query: string;
  sort: SortKey;
  view: ViewMode;
  grouped: boolean;
  loading: boolean;
  searchRef: RefObject<HTMLInputElement>;
  onQueryChange: (value: string) => void;
  onSortChange: (value: SortKey) => void;
  onViewChange: (value: ViewMode) => void;
  onToggleGrouped: () => void;
  onPickSystem: () => void;
  picking: boolean;
  onRefresh: () => void;
}

const SORT_LABELS: Record<SortKey, string> = {
  name: '按名称',
  modified: '按修改时间',
  size: '按文件大小',
  folder: '按目录',
};

export function Topbar({
  root,
  count,
  visibleCount,
  query,
  sort,
  view,
  grouped,
  loading,
  searchRef,
  onQueryChange,
  onSortChange,
  onViewChange,
  onToggleGrouped,
  onPickSystem,
  picking,
  onRefresh,
}: TopbarProps) {
  const parts = root ? pathSegments(root) : [];
  const crumbs = parts.slice(-2);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-900/[0.08] bg-ink-950/80 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3.5 lg:px-9">
        <div className="mr-auto min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-mist-500">
            <HardDrive className="h-3.5 w-3.5 shrink-0" />
            {parts.length > 2 && <span className="shrink-0">… /</span>}
            {crumbs.length > 0 ? (
              crumbs.map((part, index) => (
                <span key={`${part}-${index}`} className="flex min-w-0 items-center gap-1.5">
                  {index > 0 && <span className="text-mist-500/60">/</span>}
                  <span
                    className={cx(
                      'truncate',
                      index === crumbs.length - 1 && 'font-medium text-mist-300',
                    )}
                  >
                    {part}
                  </span>
                </span>
              ))
            ) : (
              <span>本地媒体库</span>
            )}
          </div>
          <h1 className="mt-1.5 flex items-baseline gap-2 text-lg font-semibold tracking-tight text-mist-100 sm:text-xl">
            {root ? parts[parts.length - 1] : '我的视频'}
            {root && (
              <span className="text-xs font-normal text-mist-500">
                {query ? `${visibleCount} / ${count} 个视频` : `${count} 个视频`}
              </span>
            )}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mist-500" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="搜索视频…"
              className="field w-40 py-2 pl-9 pr-9 text-xs sm:w-56"
              aria-label="搜索视频"
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mist-500 transition hover:text-mist-100"
                aria-label="清空搜索"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-slate-900/[0.12] px-1.5 py-0.5 font-mono text-[10px] text-mist-500 sm:block">
                /
              </kbd>
            )}
          </div>

          <div className="relative hidden sm:block">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mist-500" />
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as SortKey)}
              className="field appearance-none py-2 pl-9 pr-8 text-xs"
              aria-label="排序方式"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <option key={key} value={key} className="bg-ink-800">
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onToggleGrouped}
            title="按目录分组"
            aria-label="按目录分组"
            aria-pressed={grouped}
            className={cx(
              'hidden h-9 w-9 place-items-center rounded-xl border transition sm:grid',
              grouped
                ? 'border-brand-500/40 bg-brand-500/15 text-brand-600'
                : 'border-slate-900/[0.10] bg-slate-900/[0.04] text-mist-400 hover:bg-slate-900/[0.08]',
            )}
          >
            <Layers className="h-4 w-4" />
          </button>

          <div className="hidden items-center rounded-xl border border-slate-900/[0.10] bg-slate-900/[0.04] p-0.5 sm:flex">
            {([
              { key: 'grid' as ViewMode, icon: LayoutGrid, label: '网格视图' },
              { key: 'list' as ViewMode, icon: List, label: '列表视图' },
            ]).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => onViewChange(option.key)}
                title={option.label}
                aria-label={option.label}
                aria-pressed={view === option.key}
                className={cx(
                  'grid h-8 w-8 place-items-center rounded-lg transition',
                  view === option.key
                    ? 'bg-slate-900/10 text-mist-100'
                    : 'text-mist-500 hover:text-mist-200',
                )}
              >
                <option.icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={!root || loading}
            title="重新扫描当前文件夹"
            aria-label="重新扫描当前文件夹"
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-900/[0.10] bg-slate-900/[0.04] text-mist-400 transition hover:bg-slate-900/[0.08] hover:text-mist-100 disabled:opacity-40"
          >
            <RefreshCw className={cx('h-4 w-4', loading && 'animate-spin')} />
          </button>

          <button type="button" onClick={onPickSystem} disabled={picking} className="btn-primary py-2 text-xs">
            {picking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderOpen className="h-3.5 w-3.5" />}
            {picking ? '正在打开…' : '打开文件夹'}
          </button>
        </div>
      </div>
    </header>
  );
}
