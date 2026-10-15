import {classifyTopic,radarCategories} from './radar-core.mjs';
export const WEB_SEARCH_ENDPOINT='https://ip-radar-web-search.wuliaowei2077.chatgpt.site/api/search';
export function validateWebResults(data,query){
  if(data?.version!==2||data.query!==query||!Array.isArray(data.items)||!Number.isFinite(Date.parse(data.searchedAt)))throw Error('联网搜索返回了异常内容，请重试');
  const items=data.items.flatMap(item=>{
    if(typeof item?.title!=='string'||!Array.isArray(item.sources))return [];
    const sources=item.sources.filter(source=>{try{const url=new URL(source.url);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password&&typeof source.name==='string';}catch{return false;}});
    if(!sources.length)return [];
    const validDate=item.publishedAt&&Number.isFinite(Date.parse(item.publishedAt));
    return [{...item,title:item.title.slice(0,200),category:radarCategories.includes(item.category)?item.category:classifyTopic(item.title).category,sources,publishedAt:validDate?item.publishedAt:null}];
  }).slice(0,50);
  return {...data,items};
}
export async function fetchWebTopics(query,period,{signal,fetcher=fetch,endpoint=WEB_SEARCH_ENDPOINT}={}){
  const url=new URL(endpoint);url.search=new URLSearchParams({q:query,period}).toString();
  const response=await fetcher(url,{signal,cache:'no-store',credentials:'omit'});
  if(!response.ok){if(response.status===429)throw Error('搜索较多，请稍后再试');throw Error('联网搜索暂时不可用，请稍后重试');}
  return validateWebResults(await response.json(),query);
}
