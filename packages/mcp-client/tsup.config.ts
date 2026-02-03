import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/bin/clawboy-mcp.ts'],
  format: ['cjs'],
  dts: true,
  clean: true,
  noExternal: ['@clawboy/contracts'], // Bundle this dependency into the output
  shims: true, // Add shims for __dirname, __filename, import.meta.url
});
