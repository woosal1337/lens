import * as stylex from "@stylexjs/stylex";

export const groundHex = { light: "#FAFAFA", dark: "#000000" } as const;

export const color = stylex.defineVars({
  ground: "light-dark(#FAFAFA, #000000)",
  surfaceRaised: "light-dark(#FFFFFF, #121212)",
  surfaceSunken: "light-dark(#F1F1F1, #1A1A1A)",
  surfaceHover: "light-dark(#EFEFEF, #262626)",
  surfacePress: "light-dark(#DBDBDB, #303030)",
  surfaceGlass: "light-dark(#FFFFFFC7, #121212C7)",
  surfaceOverlay: "light-dark(#FAFAFAF7, #000000F7)",

  line: "light-dark(#DBDBDB, #262626)",
  lineStrong: "light-dark(#C7C7C7, #363636)",
  lineFocus: "light-dark(#0064B1, #4CB5F9)",

  fg: "light-dark(#262626, #F5F5F5)",
  fgMuted: "light-dark(#737373, #A8A8A8)",
  fgSubtle: "light-dark(#8E8E8E, #737373)",
  fgOnAction: "#FFFFFF",

  action: "#0064B1",
  actionHover: "light-dark(#00528F, #0077CC)",

  signal: "light-dark(#C62B39, #FF7A85)",
  signalWash: "light-dark(#FDE9EB, #2A1216)",
  positive: "light-dark(#0064B1, #4CB5F9)",
  positiveWash: "light-dark(#E7F3FE, #0A1F2E)",

  brand: "light-dark(#0064B1, #4CB5F9)",
  brandWash: "light-dark(#E7F3FE, #0A1F2E)",
  brandWarm: "#F9CE34",
  brandPink: "#EE2A7B",
  brandDeep: "#6228D7",
  brandGradient: "linear-gradient(90deg, #F9CE34 0%, #EE2A7B 45%, #6228D7 100%)"
});

export const series = stylex.defineVars({
  first: "light-dark(#262626, #F5F5F5)",
  second: "light-dark(#737373, #A8A8A8)",
  third: "light-dark(#8E8E8E, #737373)",
  brand: "light-dark(#0064B1, #4CB5F9)",
  signal: "light-dark(#C62B39, #FF7A85)",
  positive: "light-dark(#0064B1, #4CB5F9)"
});

export const font = stylex.defineVars({
  sans: '"Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  script: '"Grand Hotel", "Snell Roundhand", "Apple Chancery", cursive'
});

export const type = stylex.defineVars({
  displaySize: "56px",
  displayWeight: "350",
  displayTracking: "-0.045em",
  displayLine: "1.02",

  title1Size: "32px",
  title1Weight: "400",
  title1Tracking: "-0.03em",
  title1Line: "1.15",

  title2Size: "22px",
  title2Weight: "500",
  title2Tracking: "-0.025em",
  title2Line: "1.25",

  title3Size: "16px",
  title3Weight: "500",
  title3Tracking: "-0.02em",
  title3Line: "1.35",

  bodySize: "14px",
  bodyWeight: "400",
  bodyTracking: "-0.02em",
  bodyLine: "1.6",

  labelSize: "13px",
  labelTracking: "-0.02em",
  labelLine: "1.45",

  microSize: "11px",
  microWeight: "500",
  microTracking: "0.02em",
  microLine: "1.3",

  markSize: "26px",
  markLargeSize: "56px",
  markLine: "1.36",

  figureLSize: "34px",
  figureLTracking: "-0.03em",
  figureLLine: "1.05",

  figureMSize: "20px",
  figureMTracking: "-0.02em",
  figureMLine: "1.2",

  figureSSize: "13px",
  figureSLine: "1.4"
});

export const space = stylex.defineVars({
  s0: "0px",
  s1: "4px",
  s2: "8px",
  s3: "12px",
  s4: "16px",
  s5: "20px",
  s6: "24px",
  s8: "32px",
  s10: "40px",
  s12: "48px",
  s16: "64px"
});

export const shape = stylex.defineVars({
  radiusS: "6px",
  radiusM: "10px",
  radiusL: "14px",
  radiusPill: "999px",

  hairline: "1px",
  focusOffset: "2px",
  focusWidth: "2px",
  stripe: "3px",

  navHeight: "68px",
  rowHeight: "52px",
  contentMax: "1240px",
  readingMax: "1180px",
  displayMax: "900px",
  sectionMin: "calc(100vh - 152px)",
  headMin: "92px",
  captionMin: "36px",
  chartTitleMin: "48px",
  chartSlot: "344px",
  toolbarMin: "68px",
  noticeSlot: "140px",
  panelHeight: "520px",
  panelMin: "420px",
  fieldWidth: "260px",
  menuWidth: "292px",
  languageMenuWidth: "160px",
  tipWidth: "148px",
  splashMax: "540px",
  railHeight: "6px",
  barWidth: "72px",
  barHeight: "4px",

  shadowSoft:
    "0 0.5px 0.5px rgb(0 0 0 / 0.04), 0 1.5px 1.5px rgb(0 0 0 / 0.04), 0 4px 4px rgb(0 0 0 / 0.05), 0 10px 12px rgb(0 0 0 / 0.06)",
  shadowOverlay:
    "0 0.5px 0.5px rgb(0 0 0 / 0.06), 0 2px 2px rgb(0 0 0 / 0.06), 0 8px 8px rgb(0 0 0 / 0.08), 0 20px 28px rgb(0 0 0 / 0.14)"
});

export const motion = stylex.defineVars({
  press: "60ms",
  hover: "90ms",
  swap: "140ms",
  panel: "180ms",
  count: "420ms",
  splash: "1400ms",
  ease: "cubic-bezier(0.2, 0, 0, 1)"
});
