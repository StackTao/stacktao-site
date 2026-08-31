import { watch } from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const projectRoot = path.resolve(import.meta.dirname, '..')
const sourceDir = path.resolve(projectRoot, process.env.CONTENT_DIR || 'example-content')
const generator = path.join(projectRoot, 'scripts', 'generate-content.mjs')
const vite = path.join(projectRoot, 'node_modules', '.bin', 'vite')
let generating = false
let queued = false
let timer = 0

function generate() {
  if (generating) {
    queued = true
    return Promise.resolve()
  }
  generating = true
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [generator], {
      cwd: projectRoot,
      env: process.env,
      stdio: 'inherit',
    })
    child.on('exit', (code) => {
      generating = false
      if (queued) {
        queued = false
        generate()
      }
      if (code === 0) resolve()
      else reject(new Error(`Content generation exited with code ${code}`))
    })
  })
}

await generate()

const watcher = watch(sourceDir, { recursive: true }, () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    generate().catch((error) => console.error(error.message))
  }, 120)
})

const server = spawn(vite, process.argv.slice(2), {
  cwd: projectRoot,
  env: process.env,
  stdio: 'inherit',
})

function stop(signal) {
  watcher.close()
  server.kill(signal)
}

process.on('SIGINT', () => stop('SIGINT'))
process.on('SIGTERM', () => stop('SIGTERM'))
server.on('exit', (code) => {
  watcher.close()
  process.exitCode = code ?? 0
})
