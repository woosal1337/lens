const path = require("node:path");

module.exports = {
  presets: ["next/babel"],
  plugins: [
    [
      "@stylexjs/babel-plugin",
      {
        runtimeInjection: false,
        treeshakeCompensation: true,
        aliases: { "@/*": [path.join(__dirname, "*")] },
        unstable_moduleResolution: { type: "commonJS", rootDir: __dirname }
      }
    ]
  ]
};
