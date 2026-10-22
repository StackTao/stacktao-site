import {promises as fs} from 'node:fs'
import path from 'node:path'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
const exec=promisify(execFile)
const root=path.resolve(import.meta.dirname,'..')
const source=process.env.CONTENT_DIR,output=process.env.ADMIN_OUTPUT_DIR
if(!source||!output)throw new Error('CONTENT_DIR and ADMIN_OUTPUT_DIR are required')
// Seed only a completely new directory. Never replace persistent user content.
try {await fs.access(source)} catch(e) {
 if(e.code!=='ENOENT')throw e
 await fs.cp(path.join(root,'example-content'),source,{recursive:true})
}
await fs.access(path.join(source,'content.config.json'))
const staging=output+'.building',previous=output+'.previous'
await fs.rm(staging,{recursive:true,force:true})
await fs.cp(path.join(root,'public'),staging,{recursive:true})
await fs.copyFile(path.join(root,'index.html'),path.join(staging,'index.html'))
await exec(process.execPath,[path.join(root,'scripts/generate-content.mjs'),`--source=${source}`,`--out=${staging}/content`,`--script=${staging}/js/content-generated.js`])
await fs.rm(previous,{recursive:true,force:true})
try {await fs.rename(output,previous)} catch(e){if(e.code!=='ENOENT')throw e}
try {await fs.rename(staging,output)} catch(e){await fs.rename(previous,output).catch(()=>{});throw e}
await import('./admin.mjs')
