import { promises as fs } from 'node:fs'
import path from 'node:path'

const projectRoot = path.resolve(import.meta.dirname, '..')
const publicDir = path.join(projectRoot, 'public')
const outputDir = path.join(projectRoot, 'dist')

await fs.rm(outputDir, { recursive: true, force: true })
await fs.mkdir(outputDir, { recursive: true })
await fs.cp(publicDir, outputDir, { recursive: true })
await fs.copyFile(path.join(projectRoot, 'index.html'), path.join(outputDir, 'index.html'))

console.log(`Built the prototype shell and generated content to ${outputDir}`)
