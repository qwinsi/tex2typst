import { defineConfig } from 'vite'

export default defineConfig({
    test: {
      forceRerunTriggers : [
        './test/math.yml',
        './test/symbol.yml',
        './test/cheat-sheet.toml',
      ],
    }
  });
