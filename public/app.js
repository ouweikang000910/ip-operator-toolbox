import {RADAR_TOPIC_LIMIT,radarCategories,shanghaiDay} from './radar-core.mjs';
import {searchTopics} from './radar-search.mjs';
const hosted=document.documentElement.dataset.hosting==='github-pages';
const radarRefreshNote=hosted?'榜单约每半小时自动更新；点击刷新读取最新已发布榜单，更新时间以页面标注为准。':'每次打开检查更新，10 分钟内复用当天数据；手动刷新间隔至少 30 秒。';
const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6',checklist:'M9 5h12 M9 12h12 M9 19h12 M2 5l2 2 3-4 M2 12l2 2 3-4 M2 19l2 2 3-4',star:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',radar:'M12 12 20 4 M12 3a9 9 0 1 0 9 9 M12 7a5 5 0 1 0 5 5 M12 11a1 1 0 1 0 1 1',film:'M3 4h18v16H3z M7 4v16 M17 4v16 M3 9h4 M3 15h4 M17 9h4 M17 15h4',scissors:'M4 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M4 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M7 8 21 19 M7 16 21 5',arrow:'M5 12h14 M14 7l5 5-5 5',external:'M14 3h7v7 M10 14 21 3 M10 3H3v18h18v-7',back:'M19 12H5 M10 7l-5 5 5 5',refresh:'M20 8a8 8 0 1 0 0 8 M20 3v5h-5',copy:'M9 8h12v13H9z M5 16H3V3h12v2',moon:'M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12'};
const icon=(name,size='')=>`<svg ${size?`class="${size}"`:''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.star}"/></svg>`;
const onlineTools=[
  {name:'每日选题雷达',label:'每天打开，发现新选题',icon:'radar',description:`综合公开热榜，精选 ${RADAR_TOPIC_LIMIT} 个热点选题，自动分类，附上来源与创作角度。`,url:'#radar',action:'查看今日选题',type:'联网热榜',internal:true,featured:true},
  {name:'商单要求拆解器',label:'让每一条要求，都有着落',icon:'checklist',description:'粘贴品牌需求，整理摘要、执行清单与待确认事项。逐项勾选，交付心里有底。',url:'./briefly/index.html',action:'拆解商单需求',type:'本地拆解',internal:true},
  {name:'长视频切片助手',label:'一场长谈，几段好内容',icon:'film',description:'围绕完整话题整理访谈，预览片段、调整切点，导出字幕与剪辑清单。让每一段，都有始有终。',url:'https://ouweikang000910.github.io/-/yiduan/',action:'打开一段切片助手',type:'在线工具'},
  {name:'气口剪辑',label:'让表达，一气呵成',icon:'scissors',description:'打开气口剪辑小工具，让口播节奏更自然，把时间留给内容本身。',url:'https://breath-cut-ou-1014.wuliaowei2077.chatgpt.site/',action:'打开气口剪辑',type:'在线工具'},
  {name:'净帧去水印',label:'让好画面，回归干净',icon:'star',description:'图片、视频水印区域修补，支持模糊遮盖与裁剪。素材在浏览器本地处理，预览后直接导出。',url:'https://ouweikang000910.github.io/clearframe-studio/',action:'打开净帧去水印',type:'本地处理'},
  {name:'视频镜头库',label:'给下一个画面，一点灵感',icon:'film',description:'查看镜头与动效参考，找到适合你的视频表达。',url:'https://ouweikang000910.github.io/-/',action:'浏览视频镜头库',type:'在线镜头库'}
];
let route=location.hash==='#radar'?'radar':'home',category='全部',radar=null,loading=false,requestPromise=null,loadError='',lastClientFetch=0;
let searchDraft='',query='',searchPeriod='week',searchIndex=null,indexPromise=null,indexError='',lastIndexFetch=0,searchTimer=null,composing=false,displayedTopics=[];
let motion=localStorage.getItem('toolbox-online-motion')!=='off';
const time=value=>value?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)):'—';
const dayLabel=day=>day?.replace(/^(\d+)-(\d+)-(\d+)$/,'$1 年 $2 月 $3 日')||'';
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),3000);}
function home(){return `<section class="home-hero"><div class="eyebrow"><span></span> A SMALL SPACE FOR BIG IDEAS</div><h1>少一点繁琐，<br><em>多一点创作。</em></h1><p>找选题、拆商单、切访谈、剪口播、去水印、看镜头。<br class="mobile-break">常用的创作工具，都放在这里。</p><span class="hero-star">✦</span></section><section class="online-grid" aria-label="在线工具">${onlineTools.map((t,i)=>`<a class="online-card ${t.featured?'featured':''}" href="${t.url}" ${t.internal?'':'target="_blank" rel="noopener noreferrer"'}><div class="card-top"><span class="tool-icon">${icon(t.icon)}</span><span class="tool-type">${t.type}</span></div><small class="card-kicker">${t.label}</small><h2>${t.name}</h2><p>${t.description}</p><span class="card-action">${t.action}${icon(t.internal?'arrow':'external')}</span></a>`).join('')}</section><p class="home-footnote">一个入口，接着做你的创作。<span>✦</span></p>`;}
function sourceStatus(s){return s.status==='live'?'已获取':s.status==='cached'?'使用今日缓存':'暂不可用';}
function heat(value){const number=Number(value);if(!Number.isFinite(number)||number<=0)return '';return number>=10000?(number/10000).toFixed(1)+'万':number.toLocaleString('zh-CN');}
function searchPanel(){
  return `<section class="radar-search" aria-label="按方向搜索热门选题"><form id="direction-search"><label for="direction-query">想找哪个方向的热门选题？</label><div class="search-input-row"><span aria-hidden="true">${icon('search')}</span><input id="direction-query" type="search" maxlength="80" autocomplete="off" placeholder="输入方向，如 AI、职场、婚礼…" value="${esc(searchDraft)}"><button class="button" type="submit">搜索热门选题 ${icon('arrow')}</button></div></form><div class="search-options"><div class="search-suggestions"><span>试试</span>${['AI','职场','婚礼','旅游','财经'].map(term=>`<button type="button" data-action="suggestion" data-query="${term}">${term}</button>`).join('')}</div><div class="search-period" aria-label="搜索时间范围"><button type="button" data-action="period" data-period="week" aria-pressed="${searchPeriod==='week'}">近 7 天</button><button type="button" data-action="period" data-period="today" aria-pressed="${searchPeriod==='today'}">只看今天</button></div></div><div class="search-footnote"><span>${indexPromise?'正在读取已收录热点…':searchIndex?.fromDay?`历史从 ${esc(searchIndex.fromDay)} 开始累计，最多保留近 7 天。`:'搜索全部已收录热榜，支持方向相关词匹配。历史从启用搜索起累计。'}</span>${query?'<button data-action="clear-search" type="button">查看今日 TOP 50</button>':''}</div></section>`;
}
function searchCandidates(today){
  const current=radar?.day===today?radar:null;
  return [...(searchIndex?.items||[]),...(current?.searchItems||current?.items||[]).map(item=>({...item,day:today,lastSeenAt:current.updatedAt}))];
}
function topicCard(item,index,searching){
  const number=searching?index+1:item.rank;
  const topicDay=item.day||shanghaiDay();
  return `<article class="radar-card"><div class="topic-meta"><span class="rank ${number<=3?'top':''}">${String(number).padStart(2,'0')}</span><span class="category-tag">${esc(item.category)}</span><span class="format-tag">${esc(item.contentType)}</span>${searching?`<time class="topic-date" datetime="${esc(topicDay)}">${topicDay===shanghaiDay()?'今天':topicDay.slice(5)}上榜</time>`:''}</div><h3>${esc(item.title)}</h3><div class="angle"><small>创作切入</small><p>${esc(item.angle)}</p></div><div class="source-links">${item.sources.map(source=>`<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer" title="${esc(source.name)} · ${source.heatLabel} ${esc(source.heat||'未提供')} · ${dayLabel(topicDay)} ${time(source.fetchedAt)}获取">${esc(source.name)} #${source.rank}${source.cached?' · 缓存':''} ${icon('external')}<small>${source.heat?heat(source.heat)+' '+esc(source.heatLabel):'平台未提供热度数值'}</small></a>`).join('')}</div><div class="topic-actions"><span>${item.sources.length>1?item.sources.length+' 个平台同题上榜':esc(item.classification)}</span><button data-action="copy" data-index="${index}" aria-label="复制第${number}条选题">${icon('copy')}复制选题</button></div></article>`;
}
function radarBody(){
  const today=shanghaiDay(),current=radar?.day===today?radar:null,items=current?.items||[],available=current?.sources?.filter(s=>s.status!=='unavailable').length||0;
  const searching=!!query;
  const allMatches=searching?searchTopics(searchCandidates(today),query,{today,period:searchPeriod,limit:Number.MAX_SAFE_INTEGER}):null;
  const pool=searching?allMatches.items:items;
  if(category!=='全部'&&!pool.some(item=>item.category===category))category='全部';
  const filtered=pool.filter(item=>category==='全部'||item.category===category),selected=searching?filtered.slice(0,100):filtered;
  displayedTopics=selected;
  const stateLabel=current?.updatedAt?`${time(current.updatedAt)} 获取 · 北京时间`:loading?'正在连接热榜来源':'等待重新获取';
  const filters=pool.length?`<div class="category-filter" aria-label="选题分类">${radarCategories.filter(c=>c==='全部'||pool.some(t=>t.category===c)).map(c=>`<button data-action="category" data-category="${c}" class="${category===c?'selected':''}" aria-pressed="${category===c}">${c}<span>${c==='全部'?pool.length:pool.filter(t=>t.category===c).length}</span></button>`).join('')}</div>`:'';
  const heading=searching?`“${esc(query)}”相关热门选题 · ${filtered.length} 条`:category==='全部'?'今日综合 TOP '+items.length:category+' · '+selected.length+' 条';
  let content='';
  if(loading&&!items.length&&!searching){content=`<div class="radar-loading" role="status"><span class="loading-orbit">${icon('radar')}</span><h2>正在搜集今天值得聊的事</h2><p>连接公开榜单、合并同标题、自动分类…</p></div>`;}
  else if(searching||items.length){
    content=`${filters}<div class="results-heading" aria-live="polite"><h2>${heading}</h2><small>${searching?'标题相关度优先，再看日期与平台名次':'分类依据：平台标签与标题关键词'}</small></div>${searching&&allMatches.expandedKeywords.length?`<p class="search-expanded">同时匹配：${allMatches.expandedKeywords.map(esc).join('、')}</p>`:''}<div class="radar-grid">${selected.map((item,index)=>topicCard(item,index,searching)).join('')}</div>${!selected.length?`<div class="search-empty" role="status">${indexPromise||loading?`<h3>正在查找相关热点…</h3>`:`<h3>暂未收录与“${esc(query)}”相关的热点</h3><p>可以换一个更宽泛的方向；多个关键词用空格分开，例如“AI 职场”。${searchPeriod==='today'?'也可以切换到近 7 天。':''}</p><button class="button" data-action="clear-search">查看今日 TOP 50</button>`}</div>`:''}${searching&&filtered.length>100?'<p class="notice">先显示前 100 条相关结果，可以补充关键词或选择分类缩小范围。</p>':''}${!searching&&items.length<RADAR_TOPIC_LIMIT?`<div class="notice">本次仅取得 ${items.length} 条有效选题，未用旧日期内容补足。</div>`:''}`;
  }else{content=`<div class="radar-loading unavailable"><span class="loading-orbit">${icon('radar')}</span><h2>暂时没有取得今天的热榜</h2><p>请检查网络后重试，也可以从下方直接查看平台榜单。</p><button class="button" data-action="refresh">重新获取</button></div>`;}
  return `<section class="radar-page"><div class="radar-heading"><div><div class="eyebrow">DAILY TOPIC RADAR <span class="date">${dayLabel(today)}</span></div><h1>今天，<em>值得聊什么？</em></h1><p>综合公开热榜 · ${RADAR_TOPIC_LIMIT} 个热点选题 · 自动分类</p></div><button class="button refresh" data-action="refresh" ${loading?'disabled':''}>${icon('refresh')}${loading?'正在更新':'刷新热榜'}</button></div><div class="radar-meta"><span class="connection ${available?'connected':''}"><i></i>${stateLabel}</span><span>${available?`${available} 个可用来源`:'百度 · 今日头条 · 微博'}</span></div>${searchPanel()}${loadError?`<div class="notice error" role="alert">${esc(loadError)}${items.length?'，下面保留今天已获取的内容。':'，可以刷新重试。'}</div>`:''}${indexError&&searching?`<div class="notice" role="status">${esc(indexError)}${searchIndex?'，保留上次已读取的历史记录。':'，当前仅搜索今天已取得的热榜。'}</div>`:''}${current?.status==='partial'?`<div class="notice">${current.sources.some(s=>s.status==='cached')?'部分来源更新失败，已标注并保留今天的缓存。':'部分来源暂不可用，下面根据已获取的公开热榜整理。'}</div>`:''}${current?.cacheSaved===false?'<div class="notice">热榜已获取，但本机快照未保存成功。</div>':''}${content}${current?`<details class="radar-method"><summary>来源与排序说明</summary><div class="source-statuses">${current.sources.map(s=>`<div><a href="${esc(s.boardURL)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a><span class="${s.status==='unavailable'?'muted':''}">${sourceStatus(s)}${s.fetchedAt?' · '+time(s.fetchedAt):''}</span>${s.error?`<small>${esc(s.error)}</small>`:''}</div>`).join('')}</div><p>仅对已接入来源排序，不代表全网绝对排名。同标题合并，跨平台上榜优先；按各榜名次加权排序，不直接比较不同平台的热度数值。不同写法的同一事件可能未合并。</p><p>方向搜索使用标题、分类和相关词，范围为全部已收录热榜及近 7 天记录，结果标注实际上榜日期。同标题展示最近一次上榜信息，来源名次为该次收录的名次；没有收录的内容不会编造成热点。多个关键词用空格分开时需同时相关。</p><p>日期按北京时间计算。${radarRefreshNote}热度是选题参考，成片表现取决于创作。分类与创作角度为自动建议，信息请以原始来源为准。</p></details>`:''}</section>`;
}
function render(){
  const input=$('#direction-query'),keepFocus=input&&document.activeElement===input,selection=keepFocus?[input.selectionStart,input.selectionEnd]:null;
  document.body.classList.toggle('static',!motion);
  $('#app').innerHTML=`<div class="site-shell"><header class="site-header"><a href="#home" class="brand"><span class="brand-mark">${icon('star')}</span><span>IP 操盘工具箱<small>ONLINE CREATOR TOOLS</small></span></a><div class="header-actions">${route==='radar'?`<a class="back-link" href="#home">${icon('back')}返回工具箱</a>`:`<span class="header-label">${onlineTools.length} 个入口，开始创作</span>`}<button class="motion-button" data-action="motion" aria-label="${motion?'暂停':'开启'}星空动效" title="${motion?'暂停':'开启'}星空动效">${icon('moon')}</button></div></header><main id="content">${route==='radar'?radarBody():home()}</main><footer>留一点空间，给下一个好想法。<span>IP TOOLBOX · ONLINE EDITION</span></footer></div>`;
  if(keepFocus){const next=$('#direction-query');if(next){next.focus({preventScroll:true});next.setSelectionRange(...selection);}}
}
async function loadRadar(force=false){
  if(requestPromise)return requestPromise;
  loading=true;loadError='';if(radar&&radar.day!==shanghaiDay()){radar=null;category='全部';}if(route==='radar')render();
  requestPromise=(async()=>{try{
    const response=hosted?await fetch(new URL('./radar.json',import.meta.url),{cache:'no-store',signal:AbortSignal.timeout(15000)}):await fetch(force?'/api/radar/refresh':'/api/radar',force?{method:'POST',headers:{'X-Toolbox-Request':'1'}}:{});
    if(!response.ok)throw Error(hosted?'暂时无法读取热榜，请稍后刷新':'无法连接本机热榜服务');
    const data=await response.json();if(!Array.isArray(data.items)||!Array.isArray(data.sources)||!data.day)throw Error('热榜数据格式异常');
    if(data.day!==shanghaiDay()){radar={...data,day:shanghaiDay(),items:[],searchItems:[],updatedAt:null,status:'unavailable',sources:data.sources.map(s=>({...s,status:'unavailable',fetchedAt:null,count:0}))};throw Error(hosted?'当天榜单正在更新，请稍后刷新':'日期已经切换，请刷新获取今天的热榜');}
    radar=data;lastClientFetch=Date.now();if(!query&&category!=='全部'&&!radar.items.some(t=>t.category===category))category='全部';
    if(force&&hosted)toast('已读取最新发布的榜单');else if(force&&data.fromCache)toast('已是最近获取的榜单，请稍后再刷新');
  }catch(error){loadError=error.message;}finally{loading=false;requestPromise=null;if(route==='radar')render();}})();return requestPromise;
}
async function copyTopic(index){
  const item=displayedTopics[index];if(!item)return;
  const text=`${item.title}\n类型：${item.category} / ${item.contentType}\n创作切入：${item.angle}\n${item.sources.map(s=>`${s.name} #${s.rank}：${s.url}`).join('\n')}\n上榜日期：${item.day||radar.day}（北京时间）`;
  try{await navigator.clipboard.writeText(text);toast('选题和来源已复制');}catch{
    const dialog=$('#modal');dialog.innerHTML=`<h2>复制选题</h2><p>当前浏览器未允许自动复制，请选中文字复制。</p><textarea readonly aria-label="选题与来源">${esc(text)}</textarea><button class="button" data-action="close">完成</button>`;dialog.showModal();dialog.querySelector('textarea').select();
  }
}
document.addEventListener('click',async event=>{const target=event.target.closest('[data-action]');if(!target)return;const action=target.dataset.action;
  if(action==='refresh')await Promise.all([loadRadar(true),query?loadSearchIndex(true):Promise.resolve()]);
  if(action==='category'){category=target.dataset.category;render();}
  if(action==='copy')await copyTopic(Number(target.dataset.index));
  if(action==='suggestion'){searchDraft=target.dataset.query;applySearch();}
  if(action==='period'){searchPeriod=target.dataset.period;category='全部';render();if(query)loadSearchIndex();}
  if(action==='clear-search'){clearTimeout(searchTimer);searchDraft=query='';category='全部';render();}
  if(action==='close')$('#modal').close();
  if(action==='motion'){motion=!motion;localStorage.setItem('toolbox-online-motion',motion?'on':'off');document.body.classList.toggle('static',!motion);target.setAttribute('aria-label',motion?'暂停星空动效':'开启星空动效');target.title=target.getAttribute('aria-label');}
});
async function loadSearchIndex(force=false){
  if(indexPromise)return indexPromise;
  if(searchIndex&&!force&&Date.now()-lastIndexFetch<10*60*1000)return;
  indexError='';
  indexPromise=(async()=>{try{
    const response=await fetch(new URL('./radar-search.json',import.meta.url),{cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('近 7 天热点暂时未能读取');
    const data=await response.json();if(data.version!==1||!Array.isArray(data.items)||!Array.isArray(data.days))throw Error('热点索引暂时不可用');
    searchIndex=data;lastIndexFetch=Date.now();
  }catch(error){indexError=error.name==='TimeoutError'?'读取历史热点超时':error.message;}finally{indexPromise=null;if(route==='radar')render();}})();
  if(route==='radar')render();return indexPromise;
}
function applySearch(){clearTimeout(searchTimer);query=searchDraft.trim().slice(0,80);category='全部';render();if(query)loadSearchIndex();}
document.addEventListener('submit',event=>{if(event.target.id!=='direction-search')return;event.preventDefault();searchDraft=$('#direction-query').value;applySearch();});
document.addEventListener('compositionstart',event=>{if(event.target.id==='direction-query'){composing=true;clearTimeout(searchTimer);}});
document.addEventListener('compositionend',event=>{if(event.target.id==='direction-query'){composing=false;searchDraft=event.target.value;clearTimeout(searchTimer);searchTimer=setTimeout(applySearch,350);}});
document.addEventListener('input',event=>{if(event.target.id!=='direction-query')return;searchDraft=event.target.value;clearTimeout(searchTimer);if(!composing&&!event.isComposing)searchTimer=setTimeout(applySearch,350);});
window.addEventListener('hashchange',()=>{route=location.hash==='#radar'?'radar':'home';category='全部';render();window.scrollTo(0,0);if(route==='radar')loadRadar();});
function checkFresh(){if(document.hidden||route!=='radar')return;if(!radar||radar.day!==shanghaiDay()||Date.now()-lastClientFetch>10*60*1000)loadRadar();if(query)loadSearchIndex();}
document.addEventListener('visibilitychange',checkFresh);window.addEventListener('focus',checkFresh);setInterval(checkFresh,60000);
function starfield(){const canvas=$('#stars'),ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)');let stars=[],w,h,last=0;
  function resize(){w=innerWidth;h=innerHeight;const scale=Math.min(devicePixelRatio,2);canvas.width=w*scale;canvas.height=h*scale;ctx.setTransform(scale,0,0,scale,0,0);stars=Array.from({length:Math.min(110,Math.round(w/12))},(_,i)=>({x:(i*157.71)%w,y:(i*i*21.31)%h,r:i%9===0?1.35:.6,p:i*1.3}));}resize();addEventListener('resize',resize);
  function frame(t){requestAnimationFrame(frame);if(document.hidden||t-last<45)return;last=t;ctx.clearRect(0,0,w,h);const still=!motion||reduced.matches;for(const s of stars){ctx.globalAlpha=.18+.38*(still?.65:(Math.sin(t/2600+s.p)+1)/2);ctx.fillStyle=s.r>1?'#f0d3a0':'#b9edff';ctx.beginPath();ctx.arc(s.x,s.y+(still?0:Math.sin(t/8000+s.p)*7),s.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}requestAnimationFrame(frame);
}
render();starfield();if(route==='radar')loadRadar();
