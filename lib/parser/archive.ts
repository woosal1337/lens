import { Unzip, UnzipInflate } from "fflate";
import { isMedia } from "@/lib/parser/media";
import { type PickedFile } from "@/lib/parser/source";

const MAX_BYTES = 512 * 1024 * 1024;
const MAX_ENTRIES = 50000;
const CHUNK_BYTES = 64 * 1024;

export async function unpackArchives(zips: readonly File[]): Promise<PickedFile[]> {
  const picked: PickedFile[] = [];
  let total = 0;
  let entries = 0;
  for (const zip of zips) {
    let selected = 0;
    let completed = 0;
    const unzip = new Unzip((entry) => {
      entries += 1;
      if (entries > MAX_ENTRIES)
        throw new Error("The archive has too many files. Extract it and choose the folder.");
      if (!/\.(json|html)$/i.test(entry.name) && !isMedia(entry.name)) return;
      if ((entry.originalSize ?? 0) > MAX_BYTES - total)
        throw new Error("The archive exceeds the memory limit. Extract it and choose the folder.");
      selected += 1;
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      entry.ondata = (error, bytes, final) => {
        if (error) throw error;
        total += bytes.length;
        if (total > MAX_BYTES)
          throw new Error(
            "The archive exceeds the memory limit. Extract it and choose the folder."
          );
        chunks.push(new Uint8Array(bytes));
        if (final) {
          completed += 1;
          picked.push({ path: entry.name, file: new File(chunks, entry.name) });
        }
      };
      entry.start();
    });
    unzip.register(UnzipInflate);
    for (let offset = 0; offset < zip.size; offset += CHUNK_BYTES) {
      const end = Math.min(offset + CHUNK_BYTES, zip.size);
      unzip.push(new Uint8Array(await zip.slice(offset, end).arrayBuffer()), end === zip.size);
    }
    if (selected !== completed)
      throw new Error("The archive is incomplete. Download it again from Meta.");
  }
  return picked;
}
