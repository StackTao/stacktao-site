// Keep the original 256 names stable. Longer names expand the vocabulary
// instead of cycling the same three-character inscription on later walls.
const images='听雨 栖云 照晚 借月 松风 竹影 清溪 山岚 疏桐 晴岚 观澜 听泉 枕流 寻芳 望舒 归鹤 停云 远岫 拾光 照水 暮山 微雨 流萤 疏雨 清欢 迟日 南枝 见山 望川 留云 含烟 听松'.split(' ')
const places='巷 坞 庭 轩 斋 舍 庐 里'.split(' ')
const scenes='松间 竹里 溪畔 山中 云外 花下 柳岸 石上 林深 水湄 庭前 月下 江南 檐下 桥边 池畔 岭上 苔径 岩前 舟中 湖心 茶烟 荷塘 梅坞 兰溪 风里 雪后 雨余 烟汀 沙洲 篱边 窗前'.split(' ')
const moments='初春 仲春 暮春 清夏 仲夏 长夏 早秋 仲秋 深秋 初冬 仲冬 岁暮 清晨 破晓 向晚 薄暮 入夜 更深 新晴 微凉 雨霁 雪晴 风清 月明 云开 日暖 星稀 露白 霜轻 花朝 月夕 良辰'.split(' ')
export function wallName(id,seed=0){
 const base=i=>images[Math.floor(i/8)]+places[i%8]
 if(id<256)return base((id*73+seed)%256)
 let index=id-256
 if(index<1024){index=(index*73+seed)%1024;return scenes[Math.floor(index/32)]+images[index%32]}
 index-=1024
 if(index<8192){index=(index*73+seed)%8192;return scenes[Math.floor(index/256)]+base(index%256)}
 index-=8192
 const variant=(index*73+seed)%262144
 const title=moments[Math.floor(variant/8192)]+scenes[Math.floor(variant/256)%32]+base(variant%256)
 return title+(index>=262144?' · '+(Math.floor(index/262144)+1):'')
}
