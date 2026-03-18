import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/bin/pact.ts'],
  format: ['cjs'],
  dts: true,
  clean: true,
  shims: true,
});
