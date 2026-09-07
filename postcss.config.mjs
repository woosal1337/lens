import path from "node:path";

const rootDir = path.resolve(".");

const stylexBabelPlugin = [
  "@stylexjs/babel-plugin",
  {
    runtimeInjection: false,
    treeshakeCompensation: true,
    aliases: { "@/*": [path.join(rootDir, "*")] },
    unstable_moduleResolution: { type: "commonJS", rootDir }
  }
];

export default {
  plugins: {
    "@stylexjs/postcss-plugin": {
      include: [
        "./app/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "./lib/**/*.{ts,tsx}",
        "./styles/**/*.ts"
      ],
      useCSSLayers: true,
      babelConfig: {
        babelrc: false,
        configFile: false,
        parserOpts: { plugins: ["typescript", "jsx"] },
        plugins: [stylexBabelPlugin]
      }
    }
  }
};
