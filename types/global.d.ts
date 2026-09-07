declare global {
  interface Window {
    showDirectoryPicker: (options?: {
      mode?: "read" | "readwrite";
    }) => Promise<FileSystemDirectoryHandle>;
  }

  interface FileSystemDirectoryHandle {
    entries: () => AsyncIterableIterator<
      [string, FileSystemDirectoryHandle | FileSystemFileHandle]
    >;
  }

  interface DataTransferItem {
    getAsFileSystemHandle?: () => Promise<FileSystemDirectoryHandle | FileSystemFileHandle | null>;
  }
}

declare module "react" {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

export {};
