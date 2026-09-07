const MEDIA = /\.(jpg|jpeg|png|webp|heic|gif|mp4|mov|m4a|aac|mp3|webm)$/i;

export function isMedia(path: string): boolean {
  return MEDIA.test(path);
}
