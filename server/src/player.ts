import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { PlayerInfo } from './types.js';

const REGISTRY_KEYS = [
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\PotPlayerMini64.exe',
  'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths\\PotPlayerMini64.exe',
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\PotPlayerMini.exe',
  'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\PotPlayerMini64.exe',
  'HKLM\\SOFTWARE\\DAUM\\PotPlayer',
  'HKCU\\SOFTWARE\\DAUM\\PotPlayer',
];

/**
 * 读取外部命令输出。注册表 / where 这类辅助探测在某些运行环境里会被安全策略
 * 拦截（spawn EPERM），这里所有失败都退化成「没查到」，绝不影响主流程。
 */
function capture(command: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    try {
      const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'ignore'] });
      let out = '';
      const timer = setTimeout(() => child.kill(), 3000);
      child.stdout.on('data', (chunk: Buffer) => { out += chunk.toString('utf8'); });
      child.on('error', () => { clearTimeout(timer); resolve(''); });
      child.on('close', () => { clearTimeout(timer); resolve(out); });
    } catch {
      resolve('');
    }
  });
}

export async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.X_OK);
    const info = await stat(filePath);
    return info.isFile();
  } catch {
    return false;
  }
}

function commonCandidates(): string[] {
  if (process.platform !== 'win32') return [];
  const programFiles = process.env.ProgramFiles ?? 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
  const localAppData = process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local');

  return [
    path.join(programFiles, 'DAUM', 'PotPlayer', 'PotPlayerMini64.exe'),
    path.join(programFiles, 'DAUM', 'PotPlayer', 'PotPlayerMini.exe'),
    path.join(programFiles, 'DAUM', 'PotPlayer', 'PotPlayer.exe'),
    path.join(programFilesX86, 'DAUM', 'PotPlayer', 'PotPlayerMini.exe'),
    path.join(programFiles, 'PotPlayer', 'PotPlayerMini64.exe'),
    path.join(localAppData, 'Programs', 'PotPlayer', 'PotPlayerMini64.exe'),
    path.join(localAppData, 'DAUM', 'PotPlayer', 'PotPlayerMini64.exe'),
    'D:\\Program Files\\DAUM\\PotPlayer\\PotPlayerMini64.exe',
    'D:\\PotPlayer\\PotPlayerMini64.exe',
  ];
}

let cache: { at: number; info: PlayerInfo } | null = null;

/** 自动探测 PotPlayer：常见安装路径（纯文件检查）-> 注册表 -> PATH */
export async function detectPotPlayer(force = false): Promise<PlayerInfo> {
  if (!force && cache && Date.now() - cache.at < 15_000) return cache.info;

  const found: string[] = [];
  const push = async (candidate: string | null | undefined) => {
    if (!candidate) return;
    const normalized = candidate.trim().replace(/^"|"$/g, '');
    if (!normalized || found.includes(normalized)) return;
    if (await isExecutable(normalized)) found.push(normalized);
  };

  // 第一步只查文件系统，任何环境都能跑；后面两步失败也不影响结果
  for (const candidate of commonCandidates()) await push(candidate);

  try {
    if (process.platform === 'win32') {
      for (const key of REGISTRY_KEYS) {
        const output = await capture('reg.exe', ['query', key, '/ve']);
        const match = output.match(/REG_SZ\s+(.+\.exe[^\r\n]*)/i);
        if (match) await push(match[1].trim());
        const installDir = output.match(/REG_SZ\s+(.+PotPlayer[^\r\n]*)/i);
        if (installDir && !installDir[1].toLowerCase().endsWith('.exe')) {
          await push(path.join(installDir[1].trim(), 'PotPlayerMini64.exe'));
        }
      }
    }

    if (process.platform === 'win32') {
      const fromPath = await capture('where.exe', ['PotPlayerMini64.exe']);
      for (const line of fromPath.split(/\r?\n/)) await push(line);
    } else {
      for (const name of ['potplayer', 'PotPlayerMini64']) {
        const fromPath = await capture('which', [name]);
        for (const line of fromPath.split(/\r?\n/)) await push(line);
      }
    }
  } catch (error) {
    console.warn('[player] 辅助探测不可用：', error instanceof Error ? error.message : error);
  }

  const info: PlayerInfo = { found: found.length > 0, path: found[0] ?? null, candidates: found };
  cache = { at: Date.now(), info };
  return info;
}

/** 用 PotPlayer 打开视频，进程独立运行，不随后台服务退出而关闭 */
export function launchPlayer(playerPath: string, videoPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const child = spawn(playerPath, [videoPath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      });
      child.once('spawn', () => {
        child.unref();
        resolve();
      });
      child.once('error', (error) => reject(new Error(`启动播放器失败：${error.message}`)));
    } catch (error) {
      reject(new Error(`启动播放器失败：${error instanceof Error ? error.message : String(error)}`));
    }
  });
}

/** 在文件管理器中定位视频文件 */
export function revealFile(filePath: string): void {
  const [command, commandArgs]: [string, string[]] = process.platform === 'win32'
    ? ['explorer.exe', [`/select,${filePath}`]]
    : process.platform === 'darwin'
      ? ['open', ['-R', filePath]]
      : ['xdg-open', [path.dirname(filePath)]];
  try {
    const child = spawn(command, commandArgs, { detached: true, stdio: 'ignore' });
    child.unref();
  } catch (error) {
    console.warn('[player] 无法打开文件管理器：', error instanceof Error ? error.message : error);
  }
}
