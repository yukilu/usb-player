/**
 * 纯内存索引：扫描结果 -> id 的映射。
 *
 * 这里刻意不做任何持久化：视频库是文件夹的实时快照，刷新即重建。
 * 同时所有面向浏览器的接口只接受 id，不接受路径，天然避免任意文件读取。
 */
export class LibraryStore {
  root = '';
  private videos = new Map<string, string>();
  private covers = new Map<string, string>();

  reset(root: string): void {
    this.root = root;
    this.videos.clear();
    this.covers.clear();
  }

  add(id: string, videoPath: string, coverPath: string | null): void {
    this.videos.set(id, videoPath);
    if (coverPath) this.covers.set(id, coverPath);
  }

  getVideo(id: string): string | undefined {
    return this.videos.get(id);
  }

  getCover(id: string): string | undefined {
    return this.covers.get(id);
  }
}
