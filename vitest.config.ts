import { defineConfig } from 'vite'

export default defineConfig({
    test: {
      forceRerunTriggers : ['./test/math.yml'],
    }
  });
