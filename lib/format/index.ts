const numberFormats = {
  en: new Intl.NumberFormat("en-US"),
  tr: new Intl.NumberFormat("tr-TR")
};

type Language = keyof typeof numberFormats;

export function count(value: number, language: Language = "en"): string {
  return numberFormats[language].format(value);
}

export function percent(part: number, whole: number, language: Language = "en"): string {
  const value = whole === 0 ? 0 : Math.round((part / whole) * 100);
  return language === "tr" ? `%${value}` : `${value}%`;
}

export function isoDate(seconds: number, language: Language = "en"): string {
  if (seconds <= 0) return "—";
  const date = new Date(seconds * 1000);
  if (language === "tr") {
    return new Intl.DateTimeFormat("tr-TR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC"
    }).format(date);
  }
  return date.toISOString().slice(0, 10);
}

export function elapsed(seconds: number, language: Language = "en"): string {
  if (seconds <= 0) return "—";
  const days = (Date.now() / 1000 - seconds) / 86400;
  if (days < 60) return language === "tr" ? `${Math.round(days)} gün` : `${Math.round(days)}d`;
  if (days < 730)
    return language === "tr" ? `${Math.round(days / 30.44)} ay` : `${Math.round(days / 30.44)}mo`;
  const years = (days / 365.25).toFixed(1);
  return language === "tr" ? `${years.replace(".", ",")} yıl` : `${years}y`;
}

export function profileUrl(username: string): string {
  return `https://www.instagram.com/${encodeURIComponent(username)}`;
}
