import {
  ChevronLeft, ChevronRight, Folder, FolderSearch, HardDrive, Home, Loader2, Monitor,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { BrowsePayload, RootsPayload } from '../types';
import { cx, errorMessage, truncateMiddle } from '../utils';
import { Modal } from './Modal';

interface FolderPickerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (target: string) => void;
  onPickSystem: () => void;
  picking: boolean;
  recursive: boolean;
  onRecursiveChange: (value: boolean) => void;
  initialPath: string | null;
}

export function FolderPicker({
  open,
  onClose,
  onConfirm,
  onPickSystem,
  picking,
  recursive,
  onRecursiveChange,
  initialPath,
}: FolderPickerProps) {
  const [roots, setRoots] = useState<RootsPayload | null>(null);
  const [browse, setBrowse] = useState<BrowsePayload | null>(null);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const loadBrowse = useCallback(async (target: string | null) => {
    setBrowseLoading(true);
    setError('');
    try {
      const data = await api.browse(target);
      setBrowse(data);
      if (data.path) setInput(data.path);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBrowseLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setInput(initialPath ?? '');
    setError('');
    api.roots().then(setRoots).catch(() => setRoots(null));
    void loadBrowse(null);
  }, [open, initialPath, loadBrowse]);

  const confirm = () => {
    const target = input.trim() || browse?.path;
    if (!target) {
      setError('请选择一个文件夹，或直接输入绝对路径');
      return;
    }
    onConfirm(target);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="打开文件夹"
      subtitle="选择本机或 U 盘上的目录，后台会扫描其中的视频并匹配同名封面"
      icon={<FolderSearch className="h-5 w-5" />}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost px-4 py-2 text-xs">
            取消
          </button>
          <button type="button" onClick={confirm} className="btn-primary py-2 text-xs">
            确定
          </button>
        </>
      }
    >
      <button
        type="button"
        onClick={onPickSystem}
        disabled={picking}
        className="group flex w-full items-center gap-3 rounded-xl border border-brand-500/25 bg-gradient-to-r from-brand-500/12 to-transparent px-4 py-3.5 text-left transition hover:border-brand-500/50"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-600">
          {picking ? <Loader2 className="h-5 w-5 animate-spin" /> : <Monitor className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-mist-100">
            {picking ? '等待系统窗口选择…' : '用系统窗口选择文件夹'}
          </span>
          <span className="mt-0.5 block text-xs text-mist-400">
            推荐：Windows 原生对话框，支持任意磁盘和中文路径
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-brand-600/70 transition group-hover:translate-x-0.5" />
      </button>

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-mist-300">
        <input
          type="checkbox"
          checked={recursive}
          onChange={(event) => onRecursiveChange(event.target.checked)}
          className="h-3.5 w-3.5 accent-brand-500"
        />
        包含子文件夹
      </label>

      <div className="mt-5">
        <p className="label-xs">直接粘贴绝对路径</p>
        <div className="mt-2 flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') confirm(); }}
            placeholder={'例如 D:\\Movies 或 E:\\视频'}
            className="field font-mono text-xs"
            spellCheck={false}
          />
          <button type="button" onClick={confirm} className="btn-ghost shrink-0 px-4 text-xs">
            载入
          </button>
        </div>
      </div>

      {roots && roots.shortcuts.length > 0 && (
        <div className="mt-5">
          <p className="label-xs">快捷位置</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {roots.shortcuts.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => void loadBrowse(item.path)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-900/[0.10] bg-slate-900/[0.04] px-2.5 py-1.5 text-xs text-mist-300 transition hover:border-brand-500/40 hover:text-mist-100"
              >
                {item.name === '主目录' ? <Home className="h-3 w-3" /> : <Folder className="h-3 w-3" />}
                {item.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5">
        <div className="flex items-center justify-between gap-2">
          <p className="label-xs">浏览目录</p>
          {browseLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />}
        </div>
        <div className="mt-2 overflow-hidden rounded-xl border border-slate-900/[0.09] bg-slate-900/[0.035]">
          <div className="flex items-center gap-2 border-b border-slate-900/[0.08] px-2.5 py-2">
            <button
              type="button"
              onClick={() => void loadBrowse(null)}
              title="返回磁盘列表"
              className="grid h-7 w-7 place-items-center rounded-lg text-mist-400 transition hover:bg-slate-900/10 hover:text-mist-100"
            >
              <HardDrive className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => void loadBrowse(browse?.parent ?? null)}
              disabled={!browse?.path}
              title="上一级"
              className="grid h-7 w-7 place-items-center rounded-lg text-mist-400 transition hover:bg-slate-900/10 hover:text-mist-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-mist-300" title={browse?.path ?? ''}>
              {browse?.path ? truncateMiddle(browse.path, 60) : '我的电脑 / 磁盘列表'}
            </span>
          </div>

          <div className="max-h-52 overflow-y-auto p-1.5 scrollbar-slim">
            {browseLoading && browse === null && (
              <p className="px-3 py-6 text-center text-xs text-mist-500">正在读取目录…</p>
            )}
            {!browseLoading && browse?.entries.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-mist-500">这个目录下没有可浏览的子文件夹</p>
            )}
            {browse?.entries.map((entry) => (
              <button
                key={entry.path}
                type="button"
                onClick={() => void loadBrowse(entry.path)}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-slate-900/[0.06]',
                  input === entry.path ? 'bg-brand-500/10 text-brand-700' : 'text-mist-300',
                )}
              >
                <Folder className="h-3.5 w-3.5 shrink-0 text-brand-600/70" />
                <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-mist-500" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
          {error}
        </p>
      )}
    </Modal>
  );
}
