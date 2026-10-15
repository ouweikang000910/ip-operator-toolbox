import {RADAR_TOPIC_LIMIT,radarCategories,shanghaiDay} from './radar-core.mjs';
import {fetchWebTopics} from './web-search-client.mjs';
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
let searchDraft='',query='',searchPeriod='week',webResult=null,webLoading=false,webError='',webController=null,searchSequence=0,displayedTopics=[];
let motion=localStorage.getItem('toolbox-online-motion')!=='off';
const time=value=>value?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)):'—';
const dayLabel=day=>day?.replace(/^(\d+)-(\d+)-(\d+)$/,'$1 年 $2 月 $3 日')||'';
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),3000);}
function home(){return `<section class="home-hero"><div class="eyebrow"><span></span> A SMALL SPACE FOR BIG IDEAS</div><h1>少一点繁琐，<br><em>多一点创作。</em></h1><p>找选题、拆商单、切访谈、剪口播、去水印、看镜头。<br class="mobile-break">常用的创作工具，都放在这里。</p><span class="hero-star">✦</span></section><section class="online-grid" aria-label="在线工具">${onlineTools.map((t,i)=>`<a class="online-card ${t.featured?'featured':''}" href="${t.url}" ${t.internal?'':'target="_blank" rel="noopener noreferrer"'}><div class="card-top"><span class="tool-icon">${icon(t.icon)}</span><span class="tool-type">${t.type}</span></div><small class="card-kicker">${t.label}</small><h2>${t.name}</h2><p>${t.description}</p><span class="card-action">${t.action}${icon(t.internal?'arrow':'external')}</span></a>`).join('')}</section><p class="home-footnote">一个入口，接着做你的创作。<span>✦</span></p>`;}
function sourceStatus(s){return s.status==='live'?'已获取':s.status==='cached'?'使用今日缓存':'暂不可用';}
function heat(value){const number=Number(value);if(!Number.isFinite(number)||number<=0)return '';return number>=10000?(number/10000).toFixed(1)+'万':number.toLocaleString('zh-CN');}
function searchPanel(){
  return `<section class="radar-search" aria-label="联网搜索热门选题"><form id="direction-search"><label for="direction-query"><span class="live-search-badge">联网搜索</span> 输入一个方向，找到网上值得聊的内容</label><div class="search-input-row"><span aria-hidden="true">${icon('search')}</span><input id="direction-query" type="search" maxlength="80" autocomplete="off" placeholder="如：咖啡店创业、婚礼布置、AI 做视频…" value="${esc(searchDraft)}"><button class="button" type="submit">${webLoading?'搜索新方向':'联网找选题'} ${icon('arrow')}</button></div></form><div class="search-options"><div class="search-suggestions"><span>试试</span>${['AI 做视频','咖啡店创业','婚礼布置','旅游','职场'].map(term=>`<button type="button" data-action="suggestion" data-query="${term}">${term}</button>`).join('')}</div><div class="search-period" aria-label="新闻搜索时间范围">${[['week','近 7 天'],['today','今天'],['all','不限时间']].map(([value,label])=>`<button type="button" data-action="period" data-period="${value}" aria-pressed="${searchPeriod===value}">${label}</button>`).join('')}</div></div><div class="search-footnote"><span>${webLoading?'正在联网检索相关内容…':'输入方向后按回车或点击搜索 · 查询公开新闻与网页'}</span>${query?'<button data-action="clear-search" type="button">查看今日 TOP 50</button>':''}</div></section>`;
}
function webTopicCard(item,index){
  const published=item.publishedAt?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(item.publishedAt))+' 发布':'发布时间待核验';
  return `<article class="radar-card"><div class="topic-meta"><span class="rank ${index<3?'top':''}">${String(index+1).padStart(2,'0')}</span><span class="category-tag">${esc(item.category)}</span><span class="format-tag">${esc(item.contentType)}</span><time class="topic-date" ${item.publishedAt?`datetime="${esc(item.publishedAt)}"`:''}>${published}</time></div><h3>${esc(item.title)}</h3><div class="angle"><small>创作切入 · 自动建议</small><p>${esc(item.angle)}</p></div><div class="source-links">${item.sources.map(source=>`<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.name)} ${icon('external')}<small>查看原文来源</small></a>`).join('')}</div><div class="topic-actions"><span>${item.sources.length>1?item.sources.length+' 个来源同标题':item.kind==='news'?'新闻搜索推荐':'相关网页线索'}</span><button data-action="copy" data-index="${index}" aria-label="复制第${index+1}条选题">${icon('copy')}复制选题</button></div></article>`;
}
function topicCard(item,index,searching){
  const number=searching?index+1:item.rank;
  const topicDay=item.day||shanghaiDay();
  return `<article class="radar-card"><div class="topic-meta"><span class="rank ${number<=3?'top':''}">${String(number).padStart(2,'0')}</span><span class="category-tag">${esc(item.category)}</span><span class="format-tag">${esc(item.contentType)}</span>${searching?`<time class="topic-date" datetime="${esc(topicDay)}">${topicDay===shanghaiDay()?'今天':topicDay.slice(5)}上榜</time>`:''}</div><h3>${esc(item.title)}</h3><div class="angle"><small>创作切入</small><p>${esc(item.angle)}</p></div><div class="source-links">${item.sources.map(source=>`<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer" title="${esc(source.name)} · ${source.heatLabel} ${esc(source.heat||'未提供')} · ${dayLabel(topicDay)} ${time(source.fetchedAt)}获取">${esc(source.name)} #${source.rank}${source.cached?' · 缓存':''} ${icon('external')}<small>${source.heat?heat(source.heat)+' '+esc(source.heatLabel):'平台未提供热度数值'}</small></a>`).join('')}</div><div class="topic-actions"><span>${item.sources.length>1?item.sources.length+' 个平台同题上榜':esc(item.classification)}</span><button data-action="copy" data-index="${index}" aria-label="复制第${number}条选题">${icon('copy')}复制选题</button></div></article>`;
}
function radarBody(){
  const today=shanghaiDay(),current=radar?.day===today?radar:null,items=current?.items||[],available=current?.sources?.filter(s=>s.status!=='unavailable').length||0;
  const searching=!!query,pool=searching?(webResult?.items||[]):items;
  if(category!=='全部'&&!pool.some(item=>item.category===category))category='全部';
  const selected=pool.filter(item=>category==='全部'||item.category===category);displayedTopics=selected;
  const stateLabel=current?.updatedAt?`${time(current.updatedAt)} 获取 · 北京时间`:loading?'正在连接热榜来源':'等待重新获取';
  const filters=pool.length?`<div class="category-filter" aria-label="选题分类">${radarCategories.filter(c=>c==='全部'||pool.some(t=>t.category===c)).map(c=>`<button data-action="category" data-category="${c}" class="${category===c?'selected':''}" aria-pressed="${category===c}">${c}<span>${c==='全部'?pool.length:pool.filter(t=>t.category===c).length}</span></button>`).join('')}</div>`:'';
  let content='';
  if(searching&&webLoading){content=`<div class="radar-loading" role="status"><span class="loading-orbit">${icon('search')}</span><h2>正在网上寻找“${esc(query)}”</h2><p>检索相关来源、核对时间、整理选题…</p></div>`;}
  else if(searching&&webError){content=`<div class="search-empty" role="alert"><h3>这次联网搜索没有完成</h3><p>${esc(webError)}。请重试，或直接打开新闻搜索查看。</p><button class="button" data-action="retry-search">重新联网搜索</button> <a class="button" href="https://news.google.com/search?q=${encodeURIComponent(query)}&hl=zh-CN&gl=CN&ceid=CN%3Azh-Hans" target="_blank" rel="noopener noreferrer">打开新闻搜索 ↗</a></div>`;}
  else if(searching||items.length){
    const heading=searching?`“${esc(query)}” · 找到 ${selected.length} 条选题线索`:category==='全部'?'今日综合 TOP '+items.length:category+' · '+selected.length+' 条';
    content=`${searching&&webResult?.notice?`<div class="notice" role="status">${esc(webResult.notice)}</div>`:''}${filters}<div class="results-heading" aria-live="polite"><h2>${heading}</h2><small>${searching?`联网检索 · ${time(webResult?.searchedAt)}${webResult?.cached?' · 2 分钟内搜索缓存':''}`:'分类依据：平台标签与标题关键词'}</small></div><div class="radar-grid">${selected.map((item,index)=>searching?webTopicCard(item,index):topicCard(item,index,false)).join('')}</div>${!selected.length?`<div class="search-empty" role="status"><h3>暂时没有找到相关内容</h3><p>试试更具体的关键词，或选择“不限时间”继续查找。</p><button class="button" data-action="retry-search">重新搜索</button></div>`:''}${searching?'<p class="search-expanded">按新闻搜索相关性整理；网页线索不代表已证实爆款，未取得阅读或点赞数据。</p>':''}${!searching&&items.length<RADAR_TOPIC_LIMIT?`<div class="notice">本次仅取得 ${items.length} 条有效选题，未用旧日期内容补足。</div>`:''}`;
  }else{content=`<div class="radar-loading ${loading?'':'unavailable'}" role="status"><span class="loading-orbit">${icon('radar')}</span><h2>${loading?'正在搜集今天值得聊的事':'暂时没有取得今天的热榜'}</h2><p>${loading?'连接公开榜单、合并同标题、自动分类…':'可以使用上方联网搜索，或稍后刷新热榜。'}</p></div>`;}
  return `<section class="radar-page"><div class="radar-heading"><div><div class="eyebrow">DAILY TOPIC RADAR <span class="date">${dayLabel(today)}</span></div><h1>今天，<em>值得聊什么？</em></h1><p>每日 50 条热点 · 按方向联网找选题 · 自动分类</p></div><button class="button refresh" data-action="refresh" ${loading?'disabled':''}>${icon('refresh')}${loading?'正在更新':'刷新热榜'}</button></div><div class="radar-meta"><span class="connection ${available?'connected':''}"><i></i>${stateLabel}</span><span>${available?`${available} 个可用来源`:'百度 · 今日头条 · 微博'}</span></div>${searchPanel()}${!searching&&loadError?`<div class="notice error" role="alert">${esc(loadError)}</div>`:''}${!searching&&current?.status==='partial'?'<div class="notice">部分热榜来源暂不可用，下面根据已获取的公开热榜整理。</div>':''}${content}<details class="radar-method"><summary>来源与排序说明</summary><p>方向搜索按提交的关键词即时请求新浪新闻搜索，覆盖多家媒体的相关报道，优先查所选时间范围的资讯。没有取得有效新闻时，会尝试其他新闻源与 Bing 网页搜索，并明确标注发布时间待核验。相同方向的搜索可能复用 2 分钟内的查询结果。</p><p>搜索结果独立于每日 50 条榜单，按搜索来源的相关性顺序整理，同标题合并。这些是选题线索，未取得全网播放、阅读或点赞数据，不作为“全网最热”的绝对排名。自动分类与创作切入仅供参考，请打开来源核实。</p>${current?`<div class="source-statuses">${current.sources.map(s=>`<div><a href="${esc(s.boardURL)}" target="_blank" rel="noopener noreferrer">${esc(s.name)} ↗</a><span>${sourceStatus(s)}${s.fetchedAt?' · '+time(s.fetchedAt):''}</span></div>`).join('')}</div><p>每日榜单合并接入平台的同标题内容，跨平台上榜优先，再按名次加权；仅代表已接入来源。日期按北京时间计算。${radarRefreshNote}</p>`:''}</details></section>`;
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
  const text=`${item.title}\n类型：${item.category} / ${item.contentType}\n创作切入（自动建议）：${item.angle}\n${item.sources.map(s=>`${s.name}${s.rank?' #'+s.rank:''}：${s.url}`).join('\n')}\n${query?(item.publishedAt?'来源发布时间：'+item.publishedAt:'发布时间待核验'):'上榜日期：'+(item.day||radar.day)+'（北京时间）'}`;
  try{await navigator.clipboard.writeText(text);toast('选题和来源已复制');}catch{
    const dialog=$('#modal');dialog.innerHTML=`<h2>复制选题</h2><p>当前浏览器未允许自动复制，请选中文字复制。</p><textarea readonly aria-label="选题与来源">${esc(text)}</textarea><button class="button" data-action="close">完成</button>`;dialog.showModal();dialog.querySelector('textarea').select();
  }
}
document.addEventListener('click',async event=>{const target=event.target.closest('[data-action]');if(!target)return;const action=target.dataset.action;
  if(action==='refresh')await loadRadar(true);
  if(action==='retry-search')runWebSearch();
  if(action==='category'){category=target.dataset.category;render();}
  if(action==='copy')await copyTopic(Number(target.dataset.index));
  if(action==='suggestion'){searchDraft=target.dataset.query;applySearch();}
  if(action==='period'){searchPeriod=target.dataset.period;category='全部';if(query)runWebSearch();else render();}
  if(action==='clear-search'){webController?.abort();searchSequence++;webLoading=false;webResult=null;webError='';searchDraft=query='';category='全部';render();}
  if(action==='close')$('#modal').close();
  if(action==='motion'){motion=!motion;localStorage.setItem('toolbox-online-motion',motion?'on':'off');document.body.classList.toggle('static',!motion);target.setAttribute('aria-label',motion?'暂停星空动效':'开启星空动效');target.title=target.getAttribute('aria-label');}
});
async function runWebSearch(){
  webController?.abort();const sequence=++searchSequence;
  webResult=null;webError='';webLoading=true;category='全部';
  const controller=new AbortController();webController=controller;
  const timeout=setTimeout(()=>controller.abort('timeout'),25000);render();
  try{const data=await fetchWebTopics(query,searchPeriod,{signal:controller.signal});if(sequence===searchSequence)webResult=data;}
  catch(error){if(sequence===searchSequence)webError=controller.signal.aborted?'搜索等待超时，请重试':error.message==='Failed to fetch'?'暂时无法连接联网搜索服务，请检查网络':error.message;}
  finally{clearTimeout(timeout);if(sequence===searchSequence){webLoading=false;webController=null;if(route==='radar')render();}}
}
function applySearch(){query=searchDraft.trim().slice(0,80);category='全部';if(query)runWebSearch();else{webController?.abort();searchSequence++;webLoading=false;webResult=null;webError='';render();}}
document.addEventListener('submit',event=>{if(event.target.id!=='direction-search')return;event.preventDefault();searchDraft=$('#direction-query').value;applySearch();});
document.addEventListener('input',event=>{if(event.target.id!=='direction-query')return;searchDraft=event.target.value;if(!searchDraft)applySearch();});
window.addEventListener('hashchange',()=>{route=location.hash==='#radar'?'radar':'home';category='全部';render();window.scrollTo(0,0);if(route==='radar')loadRadar();});
function checkFresh(){if(document.hidden||route!=='radar')return;if(!radar||radar.day!==shanghaiDay()||Date.now()-lastClientFetch>10*60*1000)loadRadar();}
document.addEventListener('visibilitychange',checkFresh);window.addEventListener('focus',checkFresh);setInterval(checkFresh,60000);
function starfield(){const canvas=$('#stars'),ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)');let stars=[],w,h,last=0;
  function resize(){w=innerWidth;h=innerHeight;const scale=Math.min(devicePixelRatio,2);canvas.width=w*scale;canvas.height=h*scale;ctx.setTransform(scale,0,0,scale,0,0);stars=Array.from({length:Math.min(110,Math.round(w/12))},(_,i)=>({x:(i*157.71)%w,y:(i*i*21.31)%h,r:i%9===0?1.35:.6,p:i*1.3}));}resize();addEventListener('resize',resize);
  function frame(t){requestAnimationFrame(frame);if(document.hidden||t-last<45)return;last=t;ctx.clearRect(0,0,w,h);const still=!motion||reduced.matches;for(const s of stars){ctx.globalAlpha=.18+.38*(still?.65:(Math.sin(t/2600+s.p)+1)/2);ctx.fillStyle=s.r>1?'#f0d3a0':'#b9edff';ctx.beginPath();ctx.arc(s.x,s.y+(still?0:Math.sin(t/8000+s.p)*7),s.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}requestAnimationFrame(frame);
}
render();starfield();if(route==='radar')loadRadar();
