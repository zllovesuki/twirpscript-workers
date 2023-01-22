// rollup.config.mjs
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";

export default {
  input: "src/index.ts",
  output: {
    exports: "named",
    format: "es",
    file: "dist/index.mjs",
    sourcemap: true,
  },
  plugins: [
    typescript(),
    commonjs(),
    nodeResolve({
      exportConditions: ["browser", "worker"],
      browser: true,
    }),
    terser(),
  ],
};
