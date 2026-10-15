import {readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {rankTopics,shanghaiDay} from '../public/radar-core.mjs';
export const sources=[
  {id:'baidu',name:'百度热搜',url:'https://top.baidu.com/board?tab=realtime',boardURL:'https://top.baidu.com/board?tab=realtime',heatLabel:'热搜指数'},
  {id:'toutiao',name:'今日头条',url:'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc',boardURL:'https://www.toutiao.com/',heatLabel:'热度'},
  {id:'weibo',name:'微博热搜',url:'https://weibo.com/ajax/side/hotSearch',boardURL:'https://s.weibo.com/top/summary?cate=realtimehot',heatLabel:'热度'}
];
function safeURL(value,hosts){try{const url=new URL(value);return url.protocol==='https:'&&hosts.includes(url.hostname)?url.href:'';}catch{return '';}}
const heat=value=>/^\d+(\.\d+)?$/.test(String(value))?String(value):'';
export function parseSource(source,text){
  let rows;
  if(source.id==='baidu'){
    const match=text.match(/<!--s-data:([\s\S]*?)-->/);if(!match)throw Error('榜单结构已变化');
    const data=JSON.parse(match[1]);const card=data.data?.cards?.find(c=>c.component==='hotList');
    if(!Array.isArray(card?.content))throw Error('榜单结构已变化');
    rows=card.content.filter(x=>!x.isTop&&!x.isAd).map((x,i)=>({title:x.word||x.query,rank:Number.isInteger(x.index)?x.index+1:i+1,heat:heat(x.hotScore),url:safeURL(x.rawUrl||x.url,['www.baidu.com']),categoryCodes:[]}));
  }else if(source.id==='toutiao'){
    const data=JSON.parse(text);if(!Array.isArray(data.data)||data.status!=='success')throw Error('榜单结构已变化');
    rows=data.data.filter(x=>!x.is_ad&&!x.IsAd).map((x,i)=>{
      let url=safeURL(x.Url,['www.toutiao.com']);if(url){const u=new URL(url);u.search='';url=u.href;}
      return {title:x.Title,rank:i+1,heat:heat(x.HotValue),url,categoryCodes:Array.isArray(x.InterestCategory)?x.InterestCategory.filter(c=>typeof c==='string'):[]};
    });
  }else if(source.id==='weibo'){
    const data=JSON.parse(text);if(!Array.isArray(data.data?.realtime))throw Error('榜单结构已变化');
    rows=data.data.realtime.filter(x=>!x.is_ad&&!x.isTop).map((x,i)=>({title:x.word,rank:Number.isInteger(x.realpos)?x.realpos:i+1,heat:heat(x.num),url:'https://s.weibo.com/weibo?q='+encodeURIComponent('#'+x.word+'#'),categoryCodes:[]}));
  }else throw Error('不支持的来源');
  const clean=rows.filter(x=>typeof x.title==='string'&&x.title.trim()&&x.title.length<=200&&x.url&&Number.isInteger(x.rank)&&x.rank>0&&x.rank<=100).slice(0,50);
  if(!clean.length)throw Error('暂时没有读到有效榜单');return clean;
}
async function readResponse(response){
  const reader=response.body?.getReader();if(!reader)throw Error('热榜响应为空');let size=0;const chunks=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2*1024*1024)throw Error('热榜响应过大');chunks.push(value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}
  return Buffer.concat(chunks).toString('utf8');
}
function cleanCache(value){
  if(!value||value.version!==1||!value.snapshots||typeof value.snapshots!=='object')return {};
  const snapshots={};
  for(const source of sources){const saved=value.snapshots[source.id];if(!saved||!Number.isFinite(Date.parse(saved.fetchedAt))||!Array.isArray(saved.items)||saved.items.length>50)continue;
    if(saved.items.some(x=>!x||typeof x.title!=='string'||!x.title.trim()||x.title.length>200||!Number.isInteger(x.rank)||x.rank<1||x.rank>100||!safeURL(x.url,source.id==='baidu'?['www.baidu.com']:source.id==='toutiao'?['www.toutiao.com']:['s.weibo.com'])))continue;
    snapshots[source.id]={fetchedAt:saved.fetchedAt,items:saved.items.map(x=>({...x,heat:heat(x.heat),categoryCodes:Array.isArray(x.categoryCodes)?x.categoryCodes.filter(c=>typeof c==='string'):[]}))};
  }return snapshots;
}
export function createRadar({dataDir,fetcher=fetch,clock=()=>Date.now(),ttl=10*60*1000,timeout=10000}={}){
  const cacheFile=dataDir?path.join(dataDir,'radar-cache.json'):null;
  let snapshots={},pending=null,lastAttempt=0,lastResult=null;
  try{if(cacheFile)snapshots=cleanCache(JSON.parse(readFileSync(cacheFile,'utf8')));}catch{}
  function snapshotResult(states,extra={}){
    const today=shanghaiDay(clock());const usable=states.filter(s=>s.status!=='unavailable');
    const entries=usable.flatMap(s=>(snapshots[s.id]?.items||[]).map(item=>({...item,sourceId:s.id,sourceName:s.name,heatLabel:s.heatLabel,fetchedAt:s.fetchedAt,cached:s.status==='cached'})));
    const items=rankTopics(entries);const times=usable.map(s=>s.fetchedAt).filter(Boolean).sort();
    return {day:today,timeZone:'Asia/Shanghai',items,sources:states,updatedAt:times.at(-1)||null,status:!items.length?'unavailable':states.some(s=>s.status!=='live')?'partial':'live',fromCache:false,candidateCount:entries.length,...extra};
  }
  async function refresh(){
    const attempt=clock();lastAttempt=attempt;
    const results=await Promise.allSettled(sources.map(async source=>{
      const response=await fetcher(source.url,{signal:AbortSignal.timeout(timeout),redirect:'error',headers:{Accept:source.id==='baidu'?'text/html':'application/json'}});
      if(!response.ok)throw Error([401,403,429].includes(response.status)?'来源暂时限制访问':'来源暂时不可用');
      const items=parseSource(source,await readResponse(response));return {items,fetchedAt:new Date(clock()).toISOString()};
    }));
    const today=shanghaiDay(clock());const states=sources.map((source,i)=>{
      const result=results[i];const basic={id:source.id,name:source.name,boardURL:source.boardURL,heatLabel:source.heatLabel};
      if(result.status==='fulfilled'&&shanghaiDay(result.value.fetchedAt)===today){snapshots[source.id]=result.value;return {...basic,status:'live',count:result.value.items.length,fetchedAt:result.value.fetchedAt};}
      const saved=snapshots[source.id];const valid=saved&&shanghaiDay(saved.fetchedAt)===today&&Date.parse(saved.fetchedAt)<=clock()+60000;
      return {...basic,status:valid?'cached':'unavailable',count:valid?saved.items.length:0,fetchedAt:valid?saved.fetchedAt:null,error:result.status==='fulfilled'?'日期已切换，请刷新':result.reason?.name==='TimeoutError'?'连接超时':result.reason?.message||'连接失败'};
    });
    let cacheSaved=true;
    if(cacheFile){try{mkdirSync(dataDir,{recursive:true});writeFileSync(cacheFile+'.tmp',JSON.stringify({version:1,snapshots}));renameSync(cacheFile+'.tmp',cacheFile);}catch{cacheSaved=false;}}
    lastResult=snapshotResult(states,{cacheSaved});return lastResult;
  }
  async function get({force=false}={}){
    const time=clock(),today=shanghaiDay(time);
    if(pending)return pending;
    if(lastResult&&lastResult.day===today){
      const cooldown=lastResult.items.length?ttl:60000;
      if(time-lastAttempt<(force?30000:cooldown))return {...lastResult,fromCache:true};
    }
    // A persisted snapshot is used only after a live attempt, and only for the same Shanghai date.
    pending=refresh();try{return await pending;}finally{pending=null;}
  }
  return {get};
}
