import * as pdfjs from './vendor/pdfjs/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc='./vendor/pdfjs/pdf.worker.mjs';
const el=id=>document.getElementById(id);
const card=document.createElement('section');card.className='card';
card.innerHTML=`<h2>PDFスライドショー</h2>
<p class="muted">PowerPointをPDFとして保存し、ここで選択してください。動画・音声・アニメーションはPDFでは再生されません。</p>
<label>PDFファイル（100MBまで）<input id="pdf-file" type="file" accept="application/pdf,.pdf"></label>
<p id="pdf-status" role="status">PDF未選択</p>
<label>1ページの表示時間（秒）<input id="slide-seconds" type="number" min="2" max="120" step="1" value="8"></label>
<div class="actions"><button id="use-pdf" disabled>PDFを展示</button><button id="use-video">動画を展示</button><button id="slide-toggle" disabled>一時停止</button><button id="slide-prev" disabled>前へ</button><button id="slide-next" disabled>次へ</button></div>
<p class="muted">最後のページから先頭へ自動で戻ります。ファイルは外部送信せず、このタブだけで読み込みます。再読み込み後は選び直してください。スタッフ管理を開いている間はページ送りを止めます。</p><a href="#display" class="button">展示画面へ</a>`;
document.querySelector('.admin-grid').prepend(card);
const stage=document.createElement('div');stage.id='pdf-stage';stage.hidden=true;
stage.innerHTML='<div id="pdf-page"><canvas id="pdf-canvas" role="img" aria-label="紹介スライド"></canvas></div><div id="pdf-counter" aria-live="off"></div>';
document.querySelector('.movie-caption').before(stage);
document.querySelector('#placeholder small').textContent='スタッフ画面から紹介動画またはPDFを選択してください';
const style=document.createElement('style');style.textContent=`#pdf-stage{flex:1;min-height:340px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#050b13;padding:12px;overflow:hidden}#pdf-page{width:100%;height:52vh;min-height:260px;display:flex;align-items:center;justify-content:center}#pdf-canvas{display:block;max-width:100%;max-height:100%;object-fit:contain}#pdf-counter{padding:10px;color:#c4fa59;font-size:14px}button:disabled{opacity:.45;cursor:default}@media(max-width:800px){#pdf-page{height:36vh}}`;
document.head.append(style);
let doc=null,loading=null,pageNumber=1,mode='video',playing=true,timer=null,loadId=0,drawId=0,renderTask=null;
function stopTimer(){clearTimeout(timer);timer=null;}
function interval(){return Math.max(2,Math.min(120,Math.round(Number(el('slide-seconds').value)||8)));}
function schedule(){stopTimer();if(doc&&mode==='pdf'&&playing&&location.hash!=='#staff'&&!document.hidden)timer=setTimeout(()=>showPage(pageNumber%doc.numPages+1),interval()*1000);}
function controls(){for(const id of ['use-pdf','slide-toggle','slide-prev','slide-next'])el(id).disabled=!doc;el('slide-toggle').textContent=playing?'一時停止':'自動再生';}
function selectMode(next){mode=next;el('video').pause();stage.hidden=mode!=='pdf'||!doc;el('video').hidden=mode!=='video'||!el('video').getAttribute('src');el('placeholder').hidden=!stage.hidden||!el('video').hidden;
document.querySelector('.movie-caption span:last-child').textContent=mode==='pdf'?'PDFスライドをくり返し表示します':'映像はくり返し再生されます';
if(mode==='pdf'&&doc)showPage(pageNumber);else{stopTimer();if(!el('video').hidden)el('video').play().catch(()=>{});}}
async function showPage(n){stopTimer();if(!doc)return;const currentDoc=doc,id=++drawId;pageNumber=n;renderTask?.cancel();const previousTask=renderTask;renderTask=null;try{if(previousTask)await previousTask.promise.catch(()=>{});const page=await currentDoc.getPage(n);if(id!==drawId||currentDoc!==doc)return;const viewport=page.getViewport({scale:1});const holder=el('pdf-page');const width=holder.clientWidth||1000,height=holder.clientHeight||600;const scale=Math.min(width/viewport.width,height/viewport.height)*Math.min(devicePixelRatio||1,2);const view=page.getViewport({scale});const canvas=el('pdf-canvas');canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);canvas.setAttribute('aria-label',`紹介スライド ${n} / ${currentDoc.numPages}ページ`);renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport:view});await renderTask.promise;if(id!==drawId)return;renderTask=null;el('pdf-counter').textContent=`${n} / ${currentDoc.numPages} ページ · ${interval()}秒ごと${playing?'':' · 一時停止中'}`;schedule();}catch(error){if(id!==drawId||error.name==='RenderingCancelledException')return;playing=false;controls();el('pdf-status').textContent='ページを表示できませんでした。別のPDFを選び直してください。';}}
el('pdf-file').onchange=async()=>{const file=el('pdf-file').files[0];if(!file)return;const id=++loadId;stopTimer();++drawId;renderTask?.cancel();renderTask=null;const oldLoading=loading;loading=null;doc=null;controls();stage.hidden=true;el('pdf-status').textContent='PDFを読み込み中…';await oldLoading?.destroy();if(id!==loadId)return;
if(file.size>100*1024*1024){el('pdf-status').textContent='100MB以下のPDFを選んでください。';selectMode('video');return;}
try{const data=new Uint8Array(await file.arrayBuffer());if(id!==loadId)return;loading=pdfjs.getDocument({data,cMapUrl:'./vendor/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'./vendor/pdfjs/standard_fonts/',wasmUrl:'./vendor/pdfjs/wasm/',iccUrl:'./vendor/pdfjs/iccs/',isEvalSupported:false});loading.onPassword=()=>{loading.destroy();};const loaded=await loading.promise;if(id!==loadId){await loaded.destroy();return;}doc=loaded;pageNumber=1;playing=true;el('pdf-status').textContent=`${file.name} — ${doc.numPages}ページ`;controls();selectMode('pdf');}catch{if(id!==loadId)return;el('pdf-status').textContent='読み込めませんでした。破損していない、パスワード保護のないPDFを選んでください。';selectMode('video');}};
el('use-pdf').onclick=()=>selectMode('pdf');el('use-video').onclick=()=>selectMode('video');
el('movie-file').addEventListener('change',()=>{if(el('movie-file').files[0])selectMode('video');});
el('slide-toggle').onclick=()=>{playing=!playing;controls();if(mode==='pdf')showPage(pageNumber);};
el('slide-next').onclick=()=>{if(doc)showPage(pageNumber%doc.numPages+1);};el('slide-prev').onclick=()=>{if(doc)showPage((pageNumber+doc.numPages-2)%doc.numPages+1);};
el('slide-seconds').onchange=()=>{el('slide-seconds').value=interval();if(doc&&mode==='pdf')showPage(pageNumber);};
window.addEventListener('hashchange',()=>{if(doc&&mode==='pdf')showPage(pageNumber);});
document.addEventListener('visibilitychange',schedule);
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(doc&&mode==='pdf')showPage(pageNumber);},180);});
