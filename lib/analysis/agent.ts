export type AgentDescription = { client: string; platform: string; device: string };

const BROWSERS: readonly [string, RegExp][] = [
  ["Edge", /Edg\/(\d+)/],
  ["Opera", /OPR\/(\d+)/],
  ["Chrome", /Chrome\/(\d+)/],
  ["Firefox", /Firefox\/(\d+)/],
  ["Safari", /Version\/(\d+).*Safari/]
];

const PLATFORMS: readonly [string, RegExp][] = [
  ["Windows", /Windows NT/],
  ["macOS", /Mac OS X/],
  ["iOS", /iPhone OS|iPad/],
  ["Android", /Android/],
  ["ChromeOS", /CrOS/],
  ["Linux", /X11|Linux/]
];

const UNKNOWN: AgentDescription = { client: "Not recorded", platform: "", device: "" };

function readBrowser(userAgent: string): AgentDescription {
  const browser = BROWSERS.find(([, pattern]) => pattern.test(userAgent));
  const platform = PLATFORMS.find(([, pattern]) => pattern.test(userAgent));
  const version = browser?.[1].exec(userAgent)?.[1] ?? "";
  const name = browser?.[0] ?? "Browser";
  return {
    client: version.length > 0 ? `${name} ${version}` : name,
    platform: platform?.[0] ?? "",
    device: ""
  };
}

function readAndroidApp(userAgent: string, version: string): AgentDescription {
  const inside = /Android \(([^)]*)\)/.exec(userAgent)?.[1] ?? "";
  const parts = inside.split(";").map((part) => part.trim());
  const release = (parts[0] ?? "").split("/")[1] ?? "";
  const maker = parts[3] ?? "";
  const model = parts[4] ?? "";
  return {
    client: `Instagram ${version}`,
    platform: release.length > 0 ? `Android ${release}` : "Android",
    device: `${maker} ${model}`.trim()
  };
}

function readAppleApp(userAgent: string, version: string): AgentDescription {
  const inside = /\(([^)]*)\)/.exec(userAgent)?.[1] ?? "";
  const parts = inside.split(";").map((part) => part.trim());
  return {
    client: `Instagram ${version}`,
    platform: (parts[1] ?? "").replace(/_/g, "."),
    device: parts[0] ?? ""
  };
}

export function describeAgent(userAgent: string): AgentDescription {
  const value = userAgent.trim();
  if (value.length === 0) return UNKNOWN;
  if (value.startsWith("C++")) {
    return { client: "Meta internal client", platform: "server", device: "" };
  }
  if (value.startsWith("Instagram ")) {
    const version = (value.split(" ")[1] ?? "").split(".").slice(0, 2).join(".");
    return value.includes(" Android (")
      ? readAndroidApp(value, version)
      : readAppleApp(value, version);
  }
  return readBrowser(value);
}

export function agentLabel(userAgent: string): string {
  const { client, platform, device } = describeAgent(userAgent);
  const tail = device.length > 0 ? device : platform;
  return tail.length > 0 ? `${client} · ${tail}` : client;
}
