import {promises as fs,createReadStream} from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {pathToFileURL} from 'node:url'
async function digest(file){const h=crypto.createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);return h.digest('hex')}
async function files(root,relative=''){
 const result=[]
 for(const item of await fs.readdir(path.join(root,relative),{withFileTypes:true})){
  const name=path.posix.join(relative,item.name)
  if(item.isSymbolicLink())throw new Error(`Symlinks are not supported: ${name}`)
  if(item.isDirectory())result.push(...await files(root,name))
  else if(item.isFile())result.push(name)
  else throw new Error(`Unsupported file: ${name}`)
 }
 return result
}
export async function snapshot(data,destination){
 data=path.resolve(data);destination=path.resolve(destination)
 if(destination===data||destination.startsWith(data+path.sep))throw new Error('Backup must be outside data directory')
 await fs.access(path.join(data,'content/content.config.json'))
 await fs.access(path.join(data,'state/owner-token'))
 try{await fs.access(path.join(data,'state/wall-writer.lock'));throw new Error('Stop the app before backing up (writer lock exists)')}catch(e){if(e.code!=='ENOENT')throw e}
 await fs.mkdir(destination,{mode:0o700})
 const manifest={version:1,createdAt:new Date().toISOString(),files:[]}
 for(const folder of ['content','state'])for(const name of await files(path.join(data,folder))){
  const relative=`${folder}/${name}`,target=path.join(destination,relative)
  await fs.mkdir(path.dirname(target),{recursive:true,mode:0o700})
  await fs.copyFile(path.join(data,relative),target);await fs.chmod(target,0o600)
  manifest.files.push({path:relative,sha256:await digest(target)})
 }
 // Written last: an incomplete backup has no manifest and cannot be restored.
 await fs.writeFile(path.join(destination,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600})
 return manifest
}
export async function restore(backup,destination){
 backup=path.resolve(backup);destination=path.resolve(destination)
 const manifest=JSON.parse(await fs.readFile(path.join(backup,'manifest.json'),'utf8'))
 if(manifest.version!==1||!Array.isArray(manifest.files)||!manifest.files.length)throw new Error('Invalid manifest')
 const actual=new Set(await files(backup)),seen=new Set()
 for(const f of manifest.files){
  if(typeof f.path!=='string'||! /^(content|state)\//.test(f.path)||f.path.split('/').some(p=>!p||p==='.'||p==='..')||f.path.includes('\\')||seen.has(f.path)||!actual.has(f.path))throw new Error('Invalid backup path')
  if(f.path==='state/wall-writer.lock')throw new Error('Backup contains a live writer lock')
  seen.add(f.path)
  if(await digest(path.join(backup,f.path))!==f.sha256)throw new Error(`Checksum mismatch: ${f.path}`)
 }
 if(!seen.has('content/content.config.json')||!seen.has('state/owner-token'))throw new Error('Incomplete backup')
 await fs.mkdir(destination,{mode:0o700}) // Refuse any existing target, including an empty one.
 for(const f of manifest.files){const target=path.join(destination,f.path);await fs.mkdir(path.dirname(target),{recursive:true,mode:0o700});await fs.copyFile(path.join(backup,f.path),target);await fs.chmod(target,0o600)}
 return manifest
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [mode,source,target]=process.argv.slice(2)
 if(!['backup','restore'].includes(mode)||!source||!target)throw new Error('Usage: node scripts/data-snapshot.mjs backup|restore SOURCE NEW_DESTINATION')
 const result=await (mode==='backup'?snapshot:restore)(source,target)
 console.log(`${mode}: verified ${result.files.length} files → ${target}`)
}
