const decoder = new TextDecoder("utf-8", { fatal: true });
const HIGH_BYTES = /[\u0080-\u00FF]/;
const HEX_ONLY = /^[0-9a-f]{4,20}$/;

export function demojibake(value: string): string {
  if (!HIGH_BYTES.test(value)) return value;
  try {
    return decoder.decode(Uint8Array.from(value, (character) => character.charCodeAt(0) & 0xff));
  } catch {
    return value;
  }
}

export function decodeReaction(value: string): string {
  if (!HEX_ONLY.test(value)) return demojibake(value);
  const bytes = value.match(/../g);
  if (!bytes) return value;
  try {
    return decoder.decode(Uint8Array.from(bytes, (pair) => parseInt(pair, 16)));
  } catch {
    return value;
  }
}

export function normalizeEmoji(value: string): string {
  return value.replace(/\uFE0F/g, "");
}

export function foldForSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
