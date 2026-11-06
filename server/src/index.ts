import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import { HttpError, createApiRouter } from './routes.js';
import { LibraryStore } from './store.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(here, '../../web/dist');

const app = express();
app.disable('x-powered-by');

// 本地工具：允许任意来源直接调 API，省去开发时的跨域配置
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use('/api', createApiRouter(new LibraryStore()));
app.use('/api', (_req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

if (existsSync(webDist)) {
  app.use(express.static(webDist, { index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
} else {
  app.get('/', (_req, res) => {
    res.type('text/plain').send('前端尚未构建。开发模式请访问 http://localhost:5173');
  });
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof Error ? error.message : '服务器内部错误';
  if (status >= 500) console.error('[server]', error);
  res.status(status).json({ error: message });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`[usb-player] 后台已启动: http://localhost:${port}`);
  console.log(`[usb-player] 静态页面: ${existsSync(webDist) ? webDist : '未构建（开发模式请用 Vite 的 5173 端口）'}`);
});
