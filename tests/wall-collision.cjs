const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const path = require('node:path')
const source = fs.readFileSync(path.join(__dirname, '../public/js/wall-tools.js'), 'utf8')
const context = { window: {} }
vm.runInNewContext(source.replace('window.WallTools={', 'window.geometry={collisionIndex,leaseCells,segmentDistance,capsuleHitsRect,capsuleBox,cellRange};window.WallTools={'), context)
const { collisionIndex, leaseCells, segmentDistance } = context.window.geometry
const line = (x,y,x2,y2,r=4) => ({ a:[x,y],b:[x2,y2],r })
const index = collisionIndex()
// A U shaped drawing must protect its strokes, not the large empty interior.
index.add(line(200,100,200,600));index.add(line(200,600,800,600));index.add(line(800,600,800,100))
assert.equal(index.hits(line(400,250,600,250)), false, 'blank space inside a drawing remains writable')
assert.equal(index.hits(line(195,200,205,200)), true, 'actual engraving is protected')
assert.equal(index.hits(line(300,550,900,550)), true, 'a fast sweep cannot jump through a stroke')
assert.equal(index.hits(line(215,250,215,300,3)), false, 'narrow tools can pass close to a stroke')
assert.equal(index.hits(line(215,250,215,300,12)), true, 'wide spray includes its full footprint')
assert.equal(index.rectHits({x:350,y:200,width:160,height:120}),false,'paper fits within a U without covering a stroke')
assert.equal(index.rectHits({x:190,y:200,width:40,height:80}),true,'paper cannot cover the actual stroke')
// A paper protects its surface, but separate marks on either side are allowed.
index.add({x:430,y:290,width:100,height:100})
assert.equal(index.hits(line(300,200,350,220)), false)
assert.equal(index.hits(line(650,450,700,470)), false)
assert.equal(index.hits(line(300,330,700,330)), true)
assert.equal(index.hits(line(480,340,480,340)), true)
assert.equal(segmentDistance([0,0],[1,1],[0,1],[1,0]),0)
assert.equal(segmentDistance([0,0],[0,0],[2,0],[4,0]),2)
// Simultaneous writers reserve sparse cells along strokes rather than the union box.
const occupied = new Set([...leaseCells(line(200,100,200,600)),...leaseCells(line(200,600,800,600)),...leaseCells(line(800,600,800,100))])
assert.equal(leaseCells(line(400,250,600,250)).some(c=>occupied.has(c)),false)
assert.equal(leaseCells(line(190,300,210,300)).some(c=>occupied.has(c)),true)
console.log('PASS: stroke gaps, swept paths, brush widths, physical surfaces, and sparse concurrent reservations')

// Fast diagonal sweeps visit only candidate columns but retain the exact old mask.
const { capsuleHitsRect, capsuleBox, cellRange } = context.window.geometry
let seed = 123
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
for (let i = 0; i < 150; i++) {
  const s = line(random() * 1100 - 50, random() * 700 - 20, random() * 1100 - 50, random() * 700 - 20, random() * 32)
  const expected = []
  cellRange(capsuleBox(s), 8, (x,y) => { if(x >= 0 && x < 125 && y >= 0 && capsuleHitsRect(s,{x:x*8,y:y*8,width:8,height:8})) expected.push(y*128+x) })
  assert.deepEqual(Array.from(leaseCells(s)), expected, 'optimized sweep must match every occupied cell, including reversed diagonals and boundary grazes')
}
console.log('PASS: 150 deterministic swept-cell masks match the original exact collision rule')
