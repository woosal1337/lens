import { isMedia } from "@/lib/parser/media";
export { isMedia } from "@/lib/parser/media";

const ANCHORS = [
  "your_instagram_activity/",
  "connections/",
  "personal_information/",
  "security_and_login_information/",
  "ads_information/",
  "logged_information/",
  "preferences/",
  "apps_and_websites_off_of_instagram/",
  "media/"
];

export type SourceFile = { path: string; read: () => Promise<string> };

export class ExportSource {
  private readonly files = new Map<string, SourceFile>();
  private htmlCount = 0;

  get size() {
    return this.files.size;
  }

  get looksLikeHtmlExport() {
    return this.files.size === 0 && this.htmlCount > 0;
  }

  add(rawPath: string, read: () => Promise<string>) {
    if (rawPath.endsWith(".html")) {
      this.htmlCount += 1;
      return;
    }
    if (!rawPath.endsWith(".json")) return;
    const path = normalizePath(rawPath);
    if (this.files.has(path))
      throw new Error("Duplicate export files found. Choose the parts of one export only.");
    this.files.set(path, { path, read });
  }

  find(suffix: string): SourceFile | undefined {
    for (const [path, file] of this.files) {
      if (path.endsWith(suffix)) return file;
    }
    return undefined;
  }

  findAll(pattern: RegExp): SourceFile[] {
    const matches: SourceFile[] = [];
    for (const [path, file] of this.files) {
      if (pattern.test(path)) matches.push(file);
    }
    return matches.sort((left, right) => left.path.localeCompare(right.path));
  }

  async readJson<T>(file: SourceFile | undefined): Promise<T | null> {
    if (!file) return null;
    const text = await file.read();
    if (text.trim().length === 0) return null;
    return JSON.parse(text) as T;
  }
}

export function normalizePath(rawPath: string): string {
  const path = rawPath.replace(/\\/g, "/");
  for (const anchor of ANCHORS) {
    const index = path.indexOf(`/${anchor}`);
    if (index >= 0) return path.slice(index + 1);
    if (path.startsWith(anchor)) return path;
  }
  return path;
}

export type PickedFile = { path: string; file: File };

function keep(path: string): boolean {
  return path.endsWith(".json") || path.endsWith(".html") || isMedia(path);
}

export function filesFromList(list: FileList): PickedFile[] {
  const picked: PickedFile[] = [];
  for (const file of Array.from(list)) {
    const path = file.webkitRelativePath.length > 0 ? file.webkitRelativePath : file.name;
    if (keep(path)) picked.push({ path, file });
  }
  return picked;
}

export async function filesFromDirectory(handle: FileSystemDirectoryHandle): Promise<PickedFile[]> {
  const picked: PickedFile[] = [];
  await walk(handle, "", picked);
  return picked;
}

async function walk(handle: FileSystemDirectoryHandle, prefix: string, picked: PickedFile[]) {
  for await (const [name, entry] of handle.entries()) {
    const path = prefix.length > 0 ? `${prefix}/${name}` : name;
    if (entry.kind === "directory") {
      await walk(entry, path, picked);
    } else if (keep(path)) {
      picked.push({ path, file: await entry.getFile() });
    }
  }
}

export async function filesFromZips(zips: readonly File[]): Promise<PickedFile[]> {
  const worker = new Worker(new URL("./zip-worker.ts", import.meta.url));
  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<{ files?: PickedFile[]; error?: string }>) => {
      worker.terminate();
      if (event.data.files) resolve(event.data.files);
      else reject(new Error(event.data.error ?? "The archive could not be read."));
    };
    const fail = () => {
      worker.terminate();
      reject(new Error("The archive could not be read. Extract it and choose the folder."));
    };
    worker.onerror = fail;
    worker.onmessageerror = fail;
    try {
      worker.postMessage(zips);
    } catch {
      fail();
    }
  });
}

export function isZip(file: File): boolean {
  return file.name.toLowerCase().endsWith(".zip");
}
