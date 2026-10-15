import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchWebTopics,validateWebResults} from '../public/web-search-client.mjs';
const data={version:2,query:'咖啡店创业',searchedAt:'2026-10-15T04:00:00Z',items:[{title:'社区咖啡店的新变化',category:'生活消费',sources:[{name:'媒体',url:'https://example.com/coffee'}],publishedAt:'2026-10-15T01:00:00Z'}]};
test('搜索把用户方向发往联网服务，不读取当天50条或历史索引',async()=>{let seen;const result=await fetchWebTopics('咖啡店创业','week',{fetcher:async(url,options)=>{seen=new URL(url);assert.equal(options.credentials,'omit');return Response.json(data);}});assert.equal(seen.pathname,'/api/search');assert.equal(seen.searchParams.get('q'),'咖啡店创业');assert.equal(result.items[0].title,'社区咖啡店的新变化');});
test('来源失败时明确报错，不替换为本地筛选结果',async()=>{await assert.rejects(fetchWebTopics('咖啡店创业','week',{fetcher:async()=>new Response('',{status:502})}),/暂时不可用/);});
test('拒绝错方向响应、危险来源链接和无效日期',()=>{assert.throws(()=>validateWebResults(data,'婚礼布置'),/异常内容/);const result=validateWebResults({...data,items:[{...data.items[0],publishedAt:'invalid',sources:[{name:'x',url:'javascript:alert(1)'}]},{...data.items[0],publishedAt:'invalid'}]},data.query);assert.equal(result.items.length,1);assert.equal(result.items[0].publishedAt,null);});
