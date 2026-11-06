import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PICK_TIMEOUT = 5 * 60 * 1000;

function run(command: string, args: string[], timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const done = (error: Error | null, value = '') => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (error) reject(error);
      else resolve(value);
    };

    try {
      const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      timer = setTimeout(() => {
        child.kill();
        done(new Error('选择文件夹超时'));
      }, timeout);

      child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8'); });
      child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
      child.on('error', (error) => done(error));
      child.on('close', (code) => {
        if (code === 0) done(null, stdout.trim());
        else done(new Error(stderr.trim() || `选择文件夹失败（退出码 ${code}）`));
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      done(new Error(`无法打开系统文件夹窗口（${reason}），请改用目录浏览或直接粘贴路径`));
    }
  });
}

/**
 * Windows: 用 PowerShell 的 FolderBrowserDialog 弹原生选择窗口。
 * 结果写入 UTF-8 临时文件而不是走 stdout，避免中文路径在 OEM 代码页下乱码。
 * 脚本用 -EncodedCommand (UTF-16LE) 传入，避免引号转义问题。
 */
async function pickWindows(): Promise<string | null> {
  const tmp = path.join(os.tmpdir(), `usb-player-pick-${process.pid}-${Date.now()}.txt`);
  const escaped = tmp.replace(/'/g, "''");
  const script = [
    '$ErrorActionPreference = "Stop"',
    'Add-Type -AssemblyName System.Windows.Forms',
    '$dlg = New-Object System.Windows.Forms.FolderBrowserDialog',
    '$dlg.Description = "选择包含视频的文件夹"',
    '$dlg.ShowNewFolderButton = $false',
    '$result = $dlg.ShowDialog()',
    'if ($result -eq [System.Windows.Forms.DialogResult]::OK) {',
    `  [System.IO.File]::WriteAllText('${escaped}', $dlg.SelectedPath, (New-Object System.Text.UTF8Encoding($false)))`,
    '}',
    '$dlg.Dispose()',
  ].join('\n');
  const encoded = Buffer.from(script, 'utf16le').toString('base64');

  try {
    await run('powershell.exe', ['-NoProfile', '-STA', '-EncodedCommand', encoded], PICK_TIMEOUT);
    try {
      const value = (await fs.readFile(tmp, 'utf8')).trim();
      return value || null;
    } catch {
      return null; // 用户点了取消
    }
  } finally {
    await fs.unlink(tmp).catch(() => undefined);
  }
}

async function pickMac(): Promise<string | null> {
  try {
    const value = await run(
      'osascript',
      ['-e', 'tell application "System Events" to return POSIX path of (choose folder)'],
      PICK_TIMEOUT,
    );
    return value || null;
  } catch {
    return null; // 一般是用户取消
  }
}

async function pickLinux(): Promise<string | null> {
  try {
    const value = await run('zenity', ['--file-selection', '--directory'], PICK_TIMEOUT);
    return value || null;
  } catch {
    return null;
  }
}

/** 唤起系统原生文件夹选择对话框；取消或不支持时返回 null */
export async function pickFolder(): Promise<string | null> {
  if (process.platform === 'win32') return pickWindows();
  if (process.platform === 'darwin') return pickMac();
  return pickLinux();
}
