import test from 'node:test'
import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import matter from 'gray-matter'
import { restoreSnapshot, importHalo } from '../scripts/import-halo.mjs'

test('Halo snapshot inheritance restores empty and line patches, refuses corrupt patches', () => {
 const snapshots = new Map([
  ['base', { metadata: {}, spec: { rawPatch: 'a\nb\nc' } }],
  ['empty', { metadata: {}, spec: { parentSnapshotName: 'base', rawPatch: '[]' } }],
  ['edit', { metadata: {}, spec: { parentSnapshotName: 'empty', rawPatch: JSON.stringify([{source:{position:1,lines:['b']},target:{position:1,lines:['B','new']}}]) } }],
 ])
 assert.equal(restoreSnapshot('empty',snapshots),'a\nb\nc')
 assert.equal(restoreSnapshot('edit',snapshots),'a\nB\nnew\nc')
 snapshots.get('base').spec.rawPatch='wrong'
 assert.throws(()=>restoreSnapshot('edit',snapshots),/mismatch/)
})
test('Halo import preserves released content, keeps drafts private and skips deleted posts', async () => {
 const temp = await fs.mkdtemp(path.join(os.tmpdir(),'halo-import-'))
 try {
  const snapshot = (name,rawPatch)=>({kind:'Snapshot',metadata:{name},spec:{rawPatch,rawType:'markdown'}})
  const post = (name,extra={})=>({kind:'Post',metadata:{name,creationTimestamp:'2025-05-01T00:00:00Z'},status:{permalink:'/archives/'+encodeURIComponent('中文'+name)},spec:{title:name,slug:'中文'+name,publish:true,visible:'PUBLIC',releaseSnapshot:'released',headSnapshot:'head',...extra}})
  const output=path.join(temp,'output')
  const report=await importHalo([snapshot('released','published'),snapshot('head','private draft'),post('one'),post('two',{publish:false}),post('three',{deleted:true})],output)
  assert.equal(report.published,1);assert.equal(report.drafts,1);assert.equal(report.skippedDeleted,1)
  const read=async id=>matter(await fs.readFile(path.join(output,'posts/2025',id,'index.md'),'utf8'))
  assert.match((await read('halo-one')).content,/published/)
  assert.equal((await read('halo-two')).data.draft,true)
  assert.match((await read('halo-two')).content,/private draft/)
  const redirects=await fs.readFile(path.join(output,'halo-redirects.conf'),'utf8')
  assert.ok(!redirects.includes('halo-two'))
  assert.ok(redirects.includes('/archives/中文one'))
  assert.ok(!redirects.includes('%E4'))
  await assert.rejects(()=>importHalo([],output),/EEXIST/)
 } finally {await fs.rm(temp,{recursive:true,force:true})}
})
