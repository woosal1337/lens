export const FIRST_PAINT_THEME = [
  "(function(){",
  "try{",
  'var s=localStorage.getItem("lens-theme");',
  'var m=s==="light"||s==="dark"?s:(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");',
  'document.documentElement.setAttribute("data-theme",m);',
  "}catch(e){}",
  "})()"
].join("");
