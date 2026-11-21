import { defineConfig, loadEnv } from 'vite'
import { validateHostingConfig } from './hosting-config'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

const useCloudflare =
  !process.env.VITEST && Boolean(process.env.CF_PAGES || process.env.CLOUDFLARE)

const config = defineConfig(({ mode }) => {
  validateHostingConfig({ ...loadEnv(mode, process.cwd(), ''), ...process.env })
  return {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    plugins: [
      ...(useCloudflare ? [cloudflare({ viteEnvironment: { name: 'ssr' } })] : [devtools()]),
      viteTsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      tailwindcss(),
      tanstackStart(
        useCloudflare
          ? {
              prerender: {
                enabled: true,
                crawlLinks: true,
              },
            }
          : {},
      ),
      viteReact(),
    ],
  }
})

export default config
