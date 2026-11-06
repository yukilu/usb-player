import { FolderOpen, FolderSearch, Image, Loader2, Play, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  onOpen: () => void;
  onPickSystem: () => void;
  picking: boolean;
}

const STEPS = [
  { icon: FolderOpen, title: '选一个文件夹', text: '本机路径或 U 盘目录都可以' },
  { icon: Image, title: '自动找封面', text: '同名图片变海报，没有就用默认图' },
  { icon: Play, title: '一键播放', text: '直接唤起本机 PotPlayer' },
];

export function EmptyState({ onOpen, onPickSystem, picking }: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center py-12 text-center animate-fade-up">
      <div className="relative mb-10 h-44 w-80">
        <div className="absolute left-6 top-7 h-28 w-52 -rotate-12 rounded-xl border border-slate-900/[0.09] bg-ink-800/80" />
        <div className="absolute right-6 top-7 h-28 w-52 rotate-12 rounded-xl border border-slate-900/[0.09] bg-ink-800/80" />
        <div className="absolute left-1/2 top-2 grid h-32 w-56 -translate-x-1/2 place-items-center rounded-xl border border-slate-900/[0.12] bg-gradient-to-br from-ink-700 to-ink-900 shadow-panel">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
            <Play className="h-6 w-6 translate-x-[2px] fill-white text-white" />
          </div>
          <span className="absolute bottom-3 text-[10px] font-medium uppercase tracking-[0.24em] text-mist-500">
            your library
          </span>
        </div>
        <Sparkles className="absolute -right-1 top-0 h-5 w-5 text-brand-600/80" />
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-mist-100 sm:text-3xl">
        把本地视频变成一个漂亮的片库
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-mist-400">
        选择一个文件夹，自动扫描里面的所有视频并匹配同名封面图，点击海报就能用 PotPlayer 播放。
        不上传、不索引到云端、不需要数据库。
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onPickSystem} disabled={picking} className="btn-primary px-5 py-3">
          {picking ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderSearch className="h-4 w-4" />}
          {picking ? '正在打开系统窗口…' : '打开文件夹'}
        </button>
        <button type="button" onClick={onOpen} className="btn-ghost px-4 py-3">
          <FolderOpen className="h-4 w-4" />
          手动浏览 / 粘贴路径
        </button>
      </div>

      <div className="mt-14 grid w-full gap-3 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <div key={step.title} className="panel px-4 py-5 text-left">
            <div className="mb-3 flex items-center justify-between">
              <step.icon className="h-4 w-4 text-brand-600" />
              <span className="font-mono text-[11px] text-mist-500">0{index + 1}</span>
            </div>
            <p className="text-sm font-medium text-mist-100">{step.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-mist-400">{step.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
