import {
  Check, CheckCircle2, Image, Info, Loader2, Play, RefreshCw, Search, Settings,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';
import type { PlayerInfo } from '../types';
import { cx, truncateMiddle } from '../utils';
import { Modal } from './Modal';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  playerPath: string;
  onPlayerPathChange: (value: string) => void;
  playerInfo: PlayerInfo | null;
  onRefreshDetect: () => void;
  detecting: boolean;
  recursive: boolean;
  onRecursiveChange: (value: boolean) => void;
}

export function SettingsModal({
  open,
  onClose,
  playerPath,
  onPlayerPathChange,
  playerInfo,
  onRefreshDetect,
  detecting,
  recursive,
  onRecursiveChange,
}: SettingsModalProps) {
  const [validation, setValidation] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [formats, setFormats] = useState<{ videoExts: string[]; imageExts: string[] } | null>(null);

  useEffect(() => {
    if (!open) return;
    setValidation('idle');
    api.health().then(setFormats).catch(() => setFormats(null));
  }, [open]);

  const validate = async () => {
    if (!playerPath.trim()) return;
    setValidation('checking');
    try {
      const result = await api.validatePlayer(playerPath.trim());
      setValidation(result.valid ? 'valid' : 'invalid');
    } catch {
      setValidation('invalid');
    }
  };

  const ready = Boolean(playerPath || playerInfo?.found);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="设置"
      subtitle="播放器路径、扫描范围与封面规则"
      icon={<Settings className="h-5 w-5" />}
      size="lg"
      footer={
        <button type="button" onClick={onClose} className="btn-primary px-5 py-2 text-xs">
          完成
        </button>
      }
    >
      <section>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-semibold text-mist-100">PotPlayer</h3>
          </div>
          <span
            className={cx(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
              ready ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600',
            )}
          >
            <span className={cx('h-1.5 w-1.5 rounded-full', ready ? 'bg-emerald-500' : 'bg-rose-500')} />
            {ready ? '可用' : '未配置'}
          </span>
        </div>

        <div className="mt-3 rounded-xl border border-slate-900/[0.09] bg-slate-900/[0.035] p-3.5">
          <p className="text-xs text-mist-400">自动检测</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-mist-200" title={playerInfo?.path ?? ''}>
              {playerInfo?.path ?? (detecting ? '正在查找…' : '未找到 PotPlayer 安装路径')}
            </p>
            <button
              type="button"
              onClick={onRefreshDetect}
              disabled={detecting}
              className="btn-ghost shrink-0 px-2.5 py-1.5 text-[11px]"
            >
              {detecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              重新检测
            </button>
          </div>

          {playerInfo && playerInfo.candidates.length > 1 && (
            <div className="mt-3 border-t border-slate-900/[0.08] pt-3">
              <p className="mb-2 text-[11px] text-mist-500">检测到 {playerInfo.candidates.length} 个可执行文件</p>
              <div className="space-y-1">
                {playerInfo.candidates.map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => { onPlayerPathChange(candidate); setValidation('valid'); }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-[11px] text-mist-400 transition hover:bg-slate-900/[0.06] hover:text-mist-100"
                    title={candidate}
                  >
                    <Check className={cx('h-3 w-3 shrink-0', playerPath === candidate ? 'text-brand-600' : 'invisible')} />
                    <span className="truncate">{truncateMiddle(candidate, 62)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3">
          <p className="label-xs">手动指定可执行文件</p>
          <div className="mt-2 flex gap-2">
            <input
              value={playerPath}
              onChange={(event) => { onPlayerPathChange(event.target.value); setValidation('idle'); }}
              onKeyDown={(event) => { if (event.key === 'Enter') void validate(); }}
              placeholder={'C:\\Program Files\\DAUM\\PotPlayer\\PotPlayerMini64.exe'}
              className="field font-mono text-[11px]"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => void validate()}
              disabled={!playerPath.trim() || validation === 'checking'}
              className="btn-ghost shrink-0 px-3 text-xs"
            >
              {validation === 'checking' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              校验
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className={cx(
              'text-[11px]',
              validation === 'valid'
                ? 'text-emerald-600'
                : validation === 'invalid'
                  ? 'text-rose-600'
                  : 'text-mist-500',
            )}>
              {validation === 'valid' && '路径有效，播放时会优先使用它'}
              {validation === 'invalid' && '路径无效或不是可执行文件'}
              {(validation === 'idle' || validation === 'checking') && '留空则使用自动检测到的路径'}
            </p>
            {playerPath && (
              <button
                type="button"
                onClick={() => { onPlayerPathChange(''); setValidation('idle'); }}
                className="shrink-0 text-[11px] text-mist-500 transition hover:text-mist-100"
              >
                清除，改用自动检测
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="my-5 h-px bg-slate-900/[0.06]" />

      <section>
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-brand-600" />
          <h3 className="text-sm font-semibold text-mist-100">扫描与封面</h3>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-900/[0.09] bg-slate-900/[0.035] p-3.5">
          <div>
            <p className="text-xs font-medium text-mist-200">包含子文件夹</p>
            <p className="mt-1 text-[11px] text-mist-500">关闭后只扫描所选文件夹的当前层级</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={recursive}
            aria-label="包含子文件夹"
            onClick={() => onRecursiveChange(!recursive)}
            className={cx('relative h-5 w-9 shrink-0 rounded-full transition', recursive ? 'bg-brand-500' : 'bg-slate-900/15')}
          >
            <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', recursive ? 'left-[18px]' : 'left-0.5')} />
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-slate-900/[0.09] bg-slate-900/[0.035] p-3.5 text-xs leading-relaxed text-mist-400">
          <div className="flex items-center gap-2 text-mist-200">
            <Image className="h-3.5 w-3.5 text-brand-600" />
            <p className="font-medium">同名图片自动作为封面</p>
          </div>
          <p className="mt-2 font-mono text-[11px] text-mist-300">
            Movies/阿凡达.mp4 → Movies/阿凡达.jpg
          </p>
          <p className="mt-1.5">
            同目录下主文件名相同的图片会被用作封面；也兼容「阿凡达.mp4.jpg」这类命名。
            多种格式同时存在时按 jpg → png → webp 的优先级取用。没有匹配到就使用内置占位图。
          </p>
        </div>

        {formats && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="label-xs mr-1">视频</span>
              {formats.videoExts.map((ext) => (
                <span key={ext} className="rounded border border-slate-900/[0.10] bg-slate-900/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-mist-400">
                  {ext}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="label-xs mr-1">封面</span>
              {formats.imageExts.map((ext) => (
                <span key={ext} className="rounded border border-slate-900/[0.10] bg-slate-900/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-mist-400">
                  {ext}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.06] p-3.5">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p className="text-[11px] leading-relaxed text-mist-300">
          全部数据来自实时文件夹扫描，偏好只存在浏览器本地，后台不写入任何文件、不连接数据库、不上传任何内容。
        </p>
      </div>
    </Modal>
  );
}
