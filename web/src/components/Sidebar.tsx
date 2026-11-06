import {
  ChevronsLeft, ChevronsRight, Folder, Play, Settings, HardDrive, Image, Film, Layers,
} from 'lucide-react';
import type { PlayerInfo } from '../types';
import { cx, formatSize, lastSegment, truncateMiddle } from '../utils';

interface SidebarProps {
  root: string | null;
  recent: string[];
  total: number;
  withCover: number;
  totalSize: number;
  folderCount: number;
  playerInfo: PlayerInfo | null;
  playerPath: string;
  loading: boolean;
  collapsed: boolean;
  onOpenRecent: (target: string) => void;
  onOpenSettings: () => void;
  onToggle: () => void;
}

export function Sidebar({
  root,
  recent,
  total,
  withCover,
  totalSize,
  folderCount,
  playerInfo,
  playerPath,
  loading,
  collapsed,
  onOpenRecent,
  onOpenSettings,
  onToggle,
}: SidebarProps) {
  const playerReady = Boolean(playerPath || playerInfo?.found);
  const toggleClass = 'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-mist-400 transition hover:bg-slate-900/[0.07] hover:text-mist-100';

  return (
    <aside
      className={cx(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-900/[0.08] bg-ink-900/70 backdrop-blur-xl transition-[width] duration-200 lg:flex',
        collapsed ? 'w-14' : 'w-[264px]',
      )}
      aria-label="侧边导航"
    >
      {collapsed ? (
        <div className="flex flex-col items-center gap-3 py-5">
          <button
            type="button"
            onClick={onToggle}
            title="展开侧栏"
            aria-label="展开侧栏"
            aria-expanded={false}
            className={toggleClass}
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
            <Play className="h-4 w-4 translate-x-[1px] fill-ink-900 text-ink-900" />
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 px-4 py-5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
              <Play className="h-5 w-5 translate-x-[1px] fill-ink-900 text-ink-900" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold tracking-[0.13em] text-mist-100">USB PLAYER</p>
              <p className="mt-0.5 text-[11px] text-mist-500">本地视频库 · 不上传</p>
            </div>
            <button
              type="button"
              onClick={onToggle}
              title="收起侧栏"
              aria-label="收起侧栏"
              aria-expanded={true}
              className={toggleClass}
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-slim">
            <p className="label-xs px-2">当前媒体库</p>
            <div className="mt-2 rounded-xl border border-slate-900/[0.09] bg-slate-900/[0.03] p-3">
              <div className="flex items-center gap-2">
                <span
                  className={cx(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    loading ? 'animate-pulse bg-amber-500' : root ? 'bg-emerald-500' : 'bg-mist-500',
                  )}
                />
                <p className="truncate text-[13px] font-medium text-mist-100">
                  {root ? lastSegment(root) : '尚未选择文件夹'}
                </p>
              </div>
              <p className="mt-1.5 truncate font-mono text-[10px] text-mist-500" title={root ?? ''}>
                {root ? truncateMiddle(root, 26) : '打开后自动扫描视频与封面'}
              </p>
            </div>

            <div className="mt-7 flex items-center justify-between px-2">
              <p className="label-xs">最近打开</p>
              <span className="font-mono text-[10px] text-mist-500">{recent.length}</span>
            </div>
            <div className="mt-2 space-y-1">
              {recent.length === 0 && (
                <p className="px-2 py-3 text-xs leading-relaxed text-mist-500">
                  还没有记录，选一个文件夹开始吧。
                </p>
              )}
              {recent.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onOpenRecent(item)}
                  title={item}
                  className={cx(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition',
                    root === item
                      ? 'bg-brand-500/10 text-brand-700'
                      : 'text-mist-300 hover:bg-slate-900/[0.05] hover:text-mist-100',
                  )}
                >
                  <Folder className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{lastSegment(item)}</span>
                    <span className="block truncate font-mono text-[10px] text-mist-500">{item}</span>
                  </span>
                </button>
              ))}
            </div>

            {root && (
              <>
                <p className="label-xs mt-7 px-2">媒体库概览</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    { icon: Film, label: '视频', value: String(total) },
                    { icon: Image, label: '有封面', value: String(withCover) },
                    { icon: HardDrive, label: '总容量', value: formatSize(totalSize) },
                    { icon: Layers, label: '子目录', value: String(folderCount) },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-slate-900/[0.08] bg-slate-900/[0.025] p-3">
                      <stat.icon className="h-3.5 w-3.5 text-brand-600/80" />
                      <p className="mt-2 truncate text-base font-semibold tabular-nums text-mist-100">{stat.value}</p>
                      <p className="mt-0.5 text-[10px] text-mist-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="border-t border-slate-900/[0.08] p-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-900/[0.08] bg-slate-900/[0.025] p-3">
              <span
                className={cx(
                  'h-2 w-2 shrink-0 rounded-full',
                  playerReady ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,.35)]' : 'bg-rose-500',
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-mist-200">PotPlayer</p>
                <p className="truncate text-[10px] text-mist-500" title={playerPath || playerInfo?.path || ''}>
                  {playerPath
                    ? truncateMiddle(playerPath, 24)
                    : playerInfo?.found
                      ? '已自动检测'
                      : '未检测到，请手动指定'}
                </p>
              </div>
            </div>
            <button type="button" onClick={onOpenSettings} className="btn-ghost mt-2 w-full py-2 text-xs">
              <Settings className="h-3.5 w-3.5" />
              设置
            </button>
            <p className="mt-3 text-center font-mono text-[10px] text-mist-500/70">v1.0.0 · local only</p>
          </div>
        </>
      )}
    </aside>
  );
}
