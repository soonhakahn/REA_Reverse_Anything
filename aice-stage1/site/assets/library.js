const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const path=s=>s.split('/').map(encodeURIComponent).join('/');
const size=n=>n>=1048576?`${(n/1048576).toFixed(1)} MB`:`${Math.ceil(n/1024)} KB`;
const modes={notes:'암기노트',compare:'코드 비교표',code:'복붙 코드',data:'실습 데이터'};
let dataPromise;
const memory={notes:0,compare:0,code:0};
const download=(file,label='원본 다운로드 ↓')=>`<a class="btn ghost" href="${path(file.path)}" download="${esc(file.name)}">${label}</a>`;
const table=(rows,label)=>`<div class="library-table-wrap" tabindex="0" role="region" aria-label="${esc(label)} · 좌우 스크롤"><table class="library-table"><caption class="sr-only">${esc(label)}</caption><thead><tr>${rows[0].map(v=>`<th scope="col">${esc(v)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
function codeBox(code){return `<div class="codebox"><div class="code-head"><span>PYTHON</span><button type="button" data-library-copy>코드 복사</button></div><pre tabindex="0"><code>${esc(code)}</code></pre></div>`}
function noteBlocks(blocks){return blocks.map(b=>{
 if(b.type==='table')return b.rows[0]?.length===1?codeBox(b.rows.map(r=>r[0]).join('\n')):table(b.rows,'암기노트 비교표');
 if(b.style==='Heading 2')return `<h3>${esc(b.text)}</h3>`;
 if(b.style==='Heading 3')return `<h4>${esc(b.text)}</h4>`;
 return `<p class="${b.style==='List Paragraph'?'library-point':''}">${esc(b.text)}</p>`;
}).join('')}
function copies(root){root.querySelectorAll('[data-library-copy]').forEach(b=>b.onclick=async()=>{
 const code=b.closest('.codebox').querySelector('code');
 try{await navigator.clipboard.writeText(code.textContent);b.textContent='복사 완료 ✓';setTimeout(()=>{b.textContent='코드 복사'},2000)}catch{
 const range=document.createRange();range.selectNodeContents(code);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);b.textContent='선택됨 · Ctrl+C로 복사';
 }
})}
export async function renderLibrary(main,arg='notes'){
 const mode=Object.hasOwn(modes,arg)?arg:'notes';
 main.innerHTML='<p class="empty" role="status">학습자료실을 불러오고 있습니다…</p>';
 try{
 dataPromise??=fetch('assets/study-library.json').then(r=>{if(!r.ok)throw Error('library');return r.json()}).catch(e=>{dataPromise=undefined;throw e});
 const d=await dataPromise;
 if((location.hash.slice(1).split('/')[0]||'home')!=='library')return;
 if((location.hash.split('/')[1]||'notes')!==mode&&Object.hasOwn(modes,location.hash.split('/')[1]))return;
 main.innerHTML=`<div class="page-heading library-heading"><div><div class="eyebrow">STUDY LIBRARY</div><h1>학습자료실</h1><p>암기노트로 정리하고, 코드를 비교하며 복습하세요.</p></div><span class="library-count">원본 자료 ${d.files.length}개</span></div><details class="panel library-downloads"><summary>원본 파일 다운로드 <span>DOCX · XLSX · IPYNB · ZIP · CSV</span></summary><div class="library-file-grid">${d.files.map(f=>`<a href="${path(f.path)}" download="${esc(f.name)}"><span class="library-filetype">${f.ext}</span><span><b>${esc(f.title)}</b><small>${esc(f.name)} · ${size(f.bytes)}</small></span><span aria-hidden="true">↓</span></a>`).join('')}</div></details><nav class="library-tabs" aria-label="학습자료 유형">${Object.entries(modes).map(([id,title])=>`<a href="#library/${id}" ${mode===id?'aria-current="page"':''}>${title}<span>${id==='notes'?d.notes.length+'개 주제':id==='compare'?d.comparisons.length+'개 표':id==='code'?d.codes.length+'개 코드':'2개 CSV'}</span></a>`).join('')}</nav><div id="library-content"></div>`;
 const content=main.querySelector('#library-content');
 if(mode==='data'){
 content.innerHTML=`<section class="library-data-intro"><div><h2>샘플문항 가상 데이터</h2><p>두 CSV는 샘플문항 구조에 맞춰 만든 연습용 데이터입니다. 노트북과 같은 폴더에 두고 사용하세요.</p></div>${download(d.files.find(f=>f.ext==='ZIP'),'데이터 ZIP 다운로드 ↓')}</section><div class="library-datasets">${d.datasets.map((ds,i)=>`<section class="panel library-dataset"><div class="library-article-head"><div><span class="tag green">${i===0?'회귀 연습':'분류 연습'} · 가상 데이터</span><h2>${esc(ds.filename)}</h2><p>${ds.count.toLocaleString()}행 · ${ds.columns.length}열 · ${size(ds.bytes)}</p></div>${download(d.files.find(f=>f.name===ds.filename),'CSV 다운로드 ↓')}</div>${table([ds.columns,...ds.preview],ds.filename+' 앞 6행 미리보기')}<p class="library-caption">전체 데이터 중 앞 6행 · 빈 셀은 원본의 결측값입니다.</p><a class="btn green" href="#library/code" data-sample="${i}">관련 샘플문항 코드 보기 →</a></section>`).join('')}</div>`;
 content.querySelectorAll('[data-sample]').forEach(a=>a.addEventListener('click',()=>{memory.code=d.codes.findIndex(c=>c.group.startsWith('15.')&&c.title.includes(a.dataset.sample==='0'?'회귀':'분류'))}));return;
 }
 const items=mode==='notes'?d.notes:mode==='compare'?d.comparisons:d.codes;
 const f=d.files.find(f=>f.ext===(mode==='notes'?'DOCX':mode==='compare'?'XLSX':'IPYNB'));
 content.innerHTML=`<div class="library-layout"><nav class="panel library-menu" aria-label="${modes[mode]} 목차"><div class="library-menu-head">${modes[mode]} 목차</div>${items.map((item,i)=>`<button type="button" data-study-index="${i}"><span>${String(i+1).padStart(2,'0')}</span><span>${esc(item.title)}</span></button>`).join('')}</nav><article class="panel library-article" id="study-article" tabindex="-1"></article></div>`;
 const article=content.querySelector('#study-article');
 function show(index,moveFocus=false){
 const selected=items[index]?index:0;memory[mode]=selected;const item=items[selected];
 content.querySelectorAll('[data-study-index]').forEach(b=>{if(+b.dataset.studyIndex===selected)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current')});
 const pre=mode==='compare'?item.sheet.replace(/^\d+_/,''):mode==='code'?item.group:'암기노트';
 article.innerHTML=`<div class="library-article-head"><div><span class="library-kicker">${esc(pre)} · ${selected+1} / ${items.length}</span><h2>${esc(item.title)}</h2></div>${download(f,`${f.ext} 다운로드 ↓`)}</div>`;
 if(mode==='notes') article.insertAdjacentHTML('beforeend',`<div class="library-prose">${noteBlocks(item.blocks)}</div>`);
 if(mode==='compare'){
 const rows=item.rows;
 article.insertAdjacentHTML('beforeend',`<div class="library-table-wrap" tabindex="0" role="region" aria-label="코드 비교표 · 좌우 스크롤"><table class="library-table library-matrix"><caption class="sr-only">${esc(item.title)}</caption><thead><tr>${rows[0].map(v=>`<th scope="col">${esc(v)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(r=>r.filter(Boolean).length===1?`<tr class="library-common"><td colspan="${item.width}">${esc(r.find(Boolean))}</td></tr>`:`<tr>${r.map((v,i)=>`<${i===0?'th scope="row"':'td'}>${esc(v)}</${i===0?'th':'td'}>`).join('')}</tr>`).join('')}</tbody></table></div><p class="library-caption">${esc(f.name)} · ${esc(item.sheet)}에서 가져온 표입니다. 원본의 색상·강조 서식은 XLSX에서 확인할 수 있습니다.</p>`);
 }
 if(mode==='code')article.insertAdjacentHTML('beforeend',`<p class="library-code-help">코드를 복사해 Jupyter 셀에서 연습하세요. 공통 설정을 먼저 실행하고, 필요한 데이터와 앞선 셀의 변수를 확인하세요.</p>${item.notes.map(t=>`<p>${esc(t)}</p>`).join('')}${codeBox(item.code)}<p class="library-caption">코드 열람·복사용 원본입니다. TensorFlow/Keras는 로컬 Jupyter 또는 Colab에서 실행하세요. 원본 전체의 실행은 이번 업데이트에서 검증하지 않았습니다.</p><div class="flex"><a class="btn ghost" href="#library/data">샘플 CSV 받기</a><a class="btn ghost" href="#resources">기존 교재 데이터·실행 안내 →</a></div>`);
 article.insertAdjacentHTML('beforeend',`<div class="library-paging"><button class="btn ghost" data-study-prev ${selected===0?'disabled':''}>← 이전</button><span>${selected+1} / ${items.length}</span><button class="btn ghost" data-study-next ${selected===items.length-1?'disabled':''}>다음 →</button></div><p class="library-caption">출처: ${esc(f.name)} · 제공된 자료의 내용을 학습용으로 옮겼습니다.</p>`);
 article.querySelector('[data-study-prev]').onclick=()=>show(selected-1,true);
 article.querySelector('[data-study-next]').onclick=()=>show(selected+1,true);
 copies(article);
 if(moveFocus){article.focus({preventScroll:true});article.scrollIntoView({block:'start',behavior:'instant'})}
 }
 content.querySelectorAll('[data-study-index]').forEach(b=>b.onclick=()=>show(+b.dataset.studyIndex,true));
 show(memory[mode]);
 }catch(error){if(location.hash.startsWith('#library')){main.innerHTML='<section class="panel lesson-body"><h1>학습자료실을 불러오지 못했습니다.</h1><p>연결을 확인하고 다시 시도해 주세요.</p><button class="btn green" id="library-retry">다시 불러오기</button></section>';main.querySelector('#library-retry').onclick=()=>renderLibrary(main,mode)}console.error(error)}
}
