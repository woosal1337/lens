import { unpackArchives } from "@/lib/parser/archive";

self.onmessage = (event: MessageEvent<File[]>) => {
  void unpackArchives(event.data)
    .then((files) => {
      self.postMessage({ files });
    })
    .catch(() => {
      self.postMessage({
        error:
          "The archive is damaged or exceeds the 512 MB memory limit. Extract it and choose the folder."
      });
    });
};
