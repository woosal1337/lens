export type PlacePoint = { id: string; lat: number; lon: number; at: number; caption: string };

type Located = { latitude: string; longitude: string; at: number; caption: string };

export function toPlaces(rows: readonly Located[]): PlacePoint[] {
  return rows
    .map((row, index) => ({
      id: `${String(index)}:${String(row.at)}`,
      lat: Number(row.latitude),
      lon: Number(row.longitude),
      at: row.at,
      caption: row.caption
    }))
    .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lon))
    .filter((row) => row.lat >= -90 && row.lat <= 90 && row.lon >= -180 && row.lon <= 180)
    .filter((row) => row.lat !== 0 || row.lon !== 0);
}
