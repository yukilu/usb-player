import { ExternalLink, Play } from 'lucide-react';
import type { SyntheticEvent } from 'react';
import type { VideoItem } from '../types';
import { cx, formatDate, formatSize } from '../utils';

interface CardProps {
  video: VideoItem;
  onPlay: (video: VideoItem) => void;
  onReveal: (video: VideoItem) => void;
}

// 带版本号，避免浏览器缓存住旧版占位图
const DEFAULT_COVER = '/default-cover.svg?v=5';

function handleCoverError(event: SyntheticEvent<HTMLImageElement>): void {
  const image = event.currentTarget;
  if (!image.src.includes('default-cover.svg')) image.src = DEFAULT_COVER;
}

export function VideoCard({ video, onPlay, onReveal }: CardProps) {
  return (
    <article className="group animate-fade-up">
      <button
        type="button"
        onClick={() => onPlay(video)}
        title={`用 PotPlayer 播放 ${video.fileName}`}
        className="relative block w-full cursor-pointer overflow-hidden rounded-xl border border-slate-900/[0.09] bg-ink-800 text-left shadow-card transition duration-300 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-glow"
      >
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={video.coverUrl ?? DEFAULT_COVER}
            alt={`${video.name} 的封面`}
            loading="lazy"
            onError={handleCoverError}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
          />
        </div>
        {/* 只有真实封面才叠加深色渐变保证白字可读；纯浅灰占位图保持干净 */}
        {video.hasCover && (
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/25" />
        )}

        <span
          className={cx(
            'absolute left-2.5 top-2.5 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider backdrop-blur',
            video.hasCover
              ? 'border-slate-900/[0.14] bg-black/55 text-white/90'
              : 'border-slate-900/[0.10] bg-white/70 text-mist-300',
          )}
        >
          {video.ext}
        </span>

        <span className="absolute inset-x-0 bottom-0 block p-3.5">
          <span
            className={cx(
              'block truncate text-[13px] font-semibold',
              video.hasCover ? 'text-white drop-shadow' : 'text-mist-100',
            )}
          >
            {video.name}
          </span>
          <span
            className={cx(
              'mt-1 block truncate text-[11px]',
              video.hasCover ? 'text-white/75' : 'text-mist-300',
            )}
          >
            {video.relativePath}
          </span>
        </span>
      </button>

      <div className="mt-2.5 flex items-center justify-between gap-2 px-0.5">
        <div className="flex min-w-0 items-center gap-2 text-[11px] text-mist-500">
          <span className="shrink-0">{formatSize(video.size)}</span>
          <span className="h-0.5 w-0.5 shrink-0 rounded-full bg-mist-500" />
          <span className="truncate">{formatDate(video.modifiedAt)}</span>
        </div>
        <button
          type="button"
          onClick={() => onReveal(video)}
          title="在文件管理器中显示"
          aria-label="在文件管理器中显示"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-mist-500 transition hover:bg-slate-900/10 hover:text-mist-100"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

export function VideoRow({ video, onPlay, onReveal }: CardProps) {
  return (
    <article className="group flex animate-fade-in items-center gap-4 rounded-xl border border-transparent px-2 py-2.5 transition hover:border-slate-900/[0.09] hover:bg-slate-900/[0.04]">
      <button
        type="button"
        onClick={() => onPlay(video)}
        className="relative h-16 w-28 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-900/[0.09] bg-ink-800"
        title={`用 PotPlayer 播放 ${video.fileName}`}
      >
        <img
          src={video.coverUrl ?? DEFAULT_COVER}
          alt=""
          loading="lazy"
          onError={handleCoverError}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
        />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-mist-100">{video.name}</p>
        <p className="mt-1 truncate text-xs text-mist-500">{video.relativePath}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-mist-500">
          <span className="rounded border border-slate-900/[0.12] px-1.5 py-0.5 font-mono uppercase">{video.ext}</span>
          <span>{formatSize(video.size)}</span>
          <span>{formatDate(video.modifiedAt)}</span>
          {video.hasCover && <span className="text-emerald-600">有封面</span>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onReveal(video)}
          title="在文件管理器中显示"
          aria-label="在文件管理器中显示"
          className="grid h-9 w-9 place-items-center rounded-lg text-mist-500 transition hover:bg-slate-900/10 hover:text-mist-100"
        >
          <ExternalLink className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onPlay(video)} className="btn-ghost px-3 py-2 text-xs">
          <Play className="h-3.5 w-3.5 fill-current" />
          播放
        </button>
      </div>
    </article>
  );
}
