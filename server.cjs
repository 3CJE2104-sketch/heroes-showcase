const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js','/slideshow.mjs':'slideshow.mjs'};
// Expose only packaged PDF.js assets, never arbitrary files or uploaded PDFs.
function registerAssets(dir){for(const entry of fs.readdirSync(path.join(__dirname,dir),{withFileTypes:true})){const relative=dir+'/'+entry.name;if(entry.isDirectory())registerAssets(relative);else files['/'+relative]=relative;}}
registerAssets('vendor/pdfjs');
const types=new Proxy({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.wasm':'application/wasm'},{get:(map,key)=>map[key]||'application/octet-stream'});
http.createServer((req,res)=>{const name=files[new URL(req.url,'http://localhost').pathname];if(!name){res.writeHead(404);return res.end('Not found');}fs.readFile(path.join(__dirname,name),(err,data)=>{if(err){res.writeHead(500);return res.end('Read error');}res.writeHead(200,{'Content-Type':types[path.extname(name)],'Cache-Control':'no-store'});res.end(data);});}).listen(4180,'127.0.0.1',()=>console.log('Open http://127.0.0.1:4180 — Ctrl+C to stop'));
