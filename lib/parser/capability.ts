export type PickerKind = "directory" | "input" | "phone";

export type BrowserProfile = {
  name: string;
  picker: PickerKind;
};

export function detectBrowser(): BrowserProfile {
  if (typeof window === "undefined") return { name: "your browser", picker: "input" };

  const agent = window.navigator.userAgent;
  const hasDirectoryPicker = "showDirectoryPicker" in window;

  if (/iPhone|iPad|Android/.test(agent)) return { name: "your phone", picker: "phone" };

  if (agent.includes("Firefox/")) return { name: "Firefox", picker: "input" };
  if (agent.includes("Edg/"))
    return { name: "Edge", picker: hasDirectoryPicker ? "directory" : "input" };
  if (agent.includes("OPR/"))
    return { name: "Opera", picker: hasDirectoryPicker ? "directory" : "input" };
  if (agent.includes("Chrome/"))
    return { name: "Chrome", picker: hasDirectoryPicker ? "directory" : "input" };
  if (agent.includes("Safari/")) return { name: "Safari", picker: "input" };

  return { name: "your browser", picker: hasDirectoryPicker ? "directory" : "input" };
}
