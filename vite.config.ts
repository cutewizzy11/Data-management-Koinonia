import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { componentTagger } from 'lovable-tagger'
import { exec as execCb } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execCb)

function gitCommitApi(): PluginOption {
  return {
    name: 'git-commit-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method === 'POST' && req.url && req.url.startsWith('/dev/git-commit')) {
          try {
            const chunks: Buffer[] = []
            await new Promise<void>((resolve, reject) => {
              req.on('data', (c) => chunks.push(c))
              req.on('end', () => resolve())
              req.on('error', (e) => reject(e))
            })
            let message = `Update via UI - ${new Date().toISOString()}`
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
              if (body && typeof body.message === 'string' && body.message.trim().length > 0) {
                message = body.message.trim()
              }
            } catch (err) {
              // ignore JSON parse errors; fall back to default message
            }

            const safeMsg = message.replace(/"/g, '\\"')

            const cwd = server.config.root || process.cwd()
            await exec('git add -A', { cwd })
            try {
              await exec(`git commit -m "${safeMsg}"`, { cwd })
            } catch (e: unknown) {
              const stderr = (e as { stderr?: string })?.stderr || ''
              if (!/nothing to commit/i.test(stderr)) {
                throw e
              }
            }
            await exec('git push', { cwd })

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
            return
          } catch (err: unknown) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }))
            return
          }
        }
        next()
      })
    }
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    mode === 'development' && gitCommitApi(),
  ].filter(Boolean) as PluginOption[],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 8080,
    proxy: {
      '/gs-api': {
        target: 'https://script.google.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/gs-api/, ''),
      }
    }
  },
  define: {
    'process.env': {}
  },
  publicDir: 'public',
  build: {
    outDir: 'dist',
  }
}))
