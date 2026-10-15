import {radarCategories,shanghaiDay} from './radar-core.mjs';

const DAY_MS=86400000;
const normalize=value=>String(value??'').normalize('NFKC').toLowerCase().trim();
const titleKey=value=>normalize(value).replace(/[\s\p{P}\p{S}]/gu,'');
const directions=[
  ['AI','人工智能','大模型','DeepSeek','ChatGPT','OpenAI','Claude','GPT','生成式AI','智能体'],
  ['职场','工作','就业','招聘','求职','工资','加班','离职','裁员','打工','退休'],
  ['婚礼','婚庆','婚宴','婚纱','新娘','新郎','结婚','彩礼','婚姻'],
  ['科技','科技数码','芯片','半导体','机器人','航天','火箭','量子','数码'],
  ['财经','财经商业','金融','股市','股票','沪指','A股','基金','经济','黄金','白银','利率','汇率'],
  ['育儿','母婴','孩子','儿童','宝宝','婴儿','亲子','幼儿'],
  ['教育','教育职场','高考','考研','中考','大学','学生','学校','教师','学费'],
  ['旅游','旅行','景区','游客','酒店','出游','机票','民宿'],
  ['美食','餐饮','食品','食物','咖啡','奶茶','早餐','餐厅'],
  ['汽车','车企','新车','买车','电车','新能源车','自动驾驶'],
  ['健康','健康科普','医疗','医院','医生','疫苗','疾病','营养'],
  ['娱乐','文娱','文娱影视','影视','电影','电视剧','演员','歌手','演唱会','综艺'],
  ['体育','体育运动','足球','篮球','乒乓','网球','赛事','世界杯','奥运']
];
const hasTerm=(text,term)=>/^[a-z0-9]+$/.test(term)
  ?new RegExp('(^|[^a-z0-9])'+term+'([^a-z0-9]|$)','i').test(text):text.includes(term);
const dateValid=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day+'T00:00:00+08:00'))&&shanghaiDay(day+'T00:00:00+08:00')===day;
export const historyWindow=today=>({today,from:shanghaiDay(Date.parse(today+'T00:00:00+08:00')-6*DAY_MS)});
const allowedHosts={baidu:'www.baidu.com',toutiao:'www.toutiao.com',weibo:'s.weibo.com'};
function cleanRow(item,day){
  if(!item||typeof item.title!=='string'||!item.title.trim()||item.title.length>200||!dateValid(day)||!Array.isArray(item.sources))return null;
  const sources=item.sources.filter(source=>{
    try{return Object.hasOwn(allowedHosts,source.id)&&Number.isInteger(source.rank)&&source.rank>=1&&source.rank<=100&&new URL(source.url).protocol==='https:'&&new URL(source.url).hostname===allowedHosts[source.id]&&Number.isFinite(Date.parse(source.fetchedAt))&&shanghaiDay(source.fetchedAt)===day;}catch{return false;}
  });
  if(!sources.length)return null;
  return {...item,id:titleKey(item.title),day,sources,category:radarCategories.includes(item.category)?item.category:'综合热点'};
}

// One row per title per Shanghai date; preserve every observed title as hotlists change.
export function extendRadarHistory(previous,snapshot,now=Date.now()){
  const today=shanghaiDay(now),{from}=historyWindow(today),map=new Map();
  for(const item of Array.isArray(previous?.items)?previous.items:[]){
    if(!dateValid(item?.day)||item.day<from||item.day>today)continue;
    const clean=cleanRow(item,item.day);if(clean)map.set(clean.day+':'+clean.id,clean);
  }
  if(snapshot?.day===today){
    for(const item of snapshot.searchItems||snapshot.items||[]){
      const clean=cleanRow(item,today);if(!clean)continue;
      const key=today+':'+clean.id,old=map.get(key);
      const merged=new Map((old?.sources||[]).map(source=>[source.id,source]));
      for(const source of clean.sources){const prior=merged.get(source.id);if(!prior||Date.parse(source.fetchedAt)>=Date.parse(prior.fetchedAt))merged.set(source.id,source);}
      const sourceList=[...merged.values()],times=sourceList.map(source=>source.fetchedAt).sort();
      map.set(key,{...clean,sources:sourceList,firstSeenAt:old?.firstSeenAt||times[0],lastSeenAt:times.at(-1)});
    }
  }
  const items=[...map.values()].sort((a,b)=>b.day.localeCompare(a.day)||(a.rank||999)-(b.rank||999));
  const days=[...new Set(items.map(item=>item.day))].sort();
  return {version:1,day:today,fromDay:days[0]||null,days,updatedAt:new Date(now).toISOString(),items};
}

export function searchTopics(items,query,{today=shanghaiDay(),period='week',category='全部',limit=100}={}){
  const q=normalize(query).slice(0,80),tokens=q.split(/[\s,，、]+/).filter(Boolean).slice(0,6);
  if(!tokens.length)return {items:[],total:0,expandedKeywords:[]};
  const groups=tokens.map(token=>{
    const related=directions.find(group=>group.some(alias=>normalize(alias)===token));
    return related?[...new Set([token,...related.map(normalize)])]:[token];
  });
  const {from}=historyWindow(today),unique=new Map();
  for(const item of items){
    if(!item||!dateValid(item.day)||item.day>today||item.day<(period==='today'?today:from))continue;
    const key=titleKey(item.title),old=unique.get(key);
    if(!old||item.day>old.day||(item.day===old.day&&String(item.lastSeenAt||'')>String(old.lastSeenAt||'')))unique.set(key,item);
  }
  const matches=[];
  for(const item of unique.values()){
    const title=normalize(item.title),categoryText=normalize(item.category),haystack=title+' '+categoryText;
    if(!groups.every(group=>group.some(term=>hasTerm(haystack,term))))continue;
    const exact=tokens.every(token=>hasTerm(title,token));
    const titleMatch=groups.every(group=>group.some(term=>hasTerm(title,term)));
    const weight=(exact?3:titleMatch?2:1);
    const hot=(item.sources||[]).reduce((total,source)=>total+1/(10+source.rank),0);
    matches.push({...item,weight,hot});
  }
  matches.sort((a,b)=>b.weight-a.weight||b.day.localeCompare(a.day)||b.hot-a.hot||a.title.localeCompare(b.title,'zh-CN'));
  const categoryMatches=matches.filter(item=>category==='全部'||item.category===category);
  return {items:categoryMatches.slice(0,limit).map(({weight,hot,...item})=>item),total:categoryMatches.length,expandedKeywords:[...new Set(groups.flat())].filter(term=>!tokens.includes(term)).slice(0,12)};
}
