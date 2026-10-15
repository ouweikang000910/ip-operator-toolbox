import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {rankTopics,classifyTopic,shanghaiDay} from '../public/radar-core.mjs';
import {createRadar,parseSource,sources} from '../server/radar.mjs';

const baidu=(rows)=>'<!--s-data:'+JSON.stringify({data:{cards:[{component:'hotList',content:rows}]}})+'-->';
const baiduRows=Array.from({length:50},(_,i)=>({word:'城市地铁新消息'+i,index:i,hotScore:String(10000-i),rawUrl:'https://www.baidu.com/s?wd='+i}));
const toutiao=JSON.stringify({status:'success',data:Array.from({length:50},(_,i)=>({Title:'人工智能新消息'+i,HotValue:String(100-i),Url:'https://www.toutiao.com/trending/1234567890123456789/?origin=hot',InterestCategory:['technology']}))});
const weibo=JSON.stringify({data:{realtime:[{word:'城市地铁新消息0',realpos:1,num:12},{word:'广告',realpos:2,is_ad:1}]}});
const fixture=url=>new Response(url.includes('top.baidu')?baidu(baiduRows):url.includes('toutiao')?toutiao:weibo);

test('北京时间跨日、自动分类与未知平台标签',()=>{
  assert.equal(shanghaiDay('2026-10-14T15:59:59Z'),'2026-10-14');
  assert.equal(shanghaiDay('2026-10-14T16:00:00Z'),'2026-10-15');
  assert.equal(classifyTopic('AI芯片发布').category,'科技数码');
  assert.equal(classifyTopic('新消息',['finance']).classification,'平台分类');
  assert.equal(classifyTopic('新消息',['__proto__']).category,'综合热点');
});

test('同标题合并、同来源去重、按排名而非热度量纲排序',()=>{
  const rows=[{title:'AI 新消息！',sourceId:'baidu',rank:8,heat:'1'},{title:'AI新消息',sourceId:'toutiao',rank:8,heat:'1'},{title:'AI新消息',sourceId:'toutiao',rank:8},{title:'独家新闻',sourceId:'baidu',rank:1,heat:'999999999999'}];
  const ranked=rankTopics(rows);
  assert.equal(ranked.length,2);assert.equal(ranked[0].sources.length,2);assert.equal(ranked[0].category,'科技数码');
  assert.equal(ranked[1].rank,2);assert.ok(!('score' in ranked[0]));
  assert.equal(rankTopics([...rows,{title:'无效排名',sourceId:'baidu',rank:0}]).length,2);
});

test('解析公开榜单，跳过置顶广告并保留安全来源链接',()=>{
  const rows=parseSource(sources[0],baidu([{word:'置顶',index:0,isTop:true,rawUrl:'https://www.baidu.com/'},...baiduRows,{word:'危险链接',index:20,rawUrl:'javascript:alert(1)'}]));
  assert.equal(rows.length,50);assert.equal(rows[0].rank,1);
  const tt=parseSource(sources[1],toutiao);assert.equal(tt[0].url,'https://www.toutiao.com/trending/1234567890123456789/');
  assert.deepEqual(tt[0].categoryCodes,['technology']);assert.equal(parseSource(sources[2],weibo).length,1);
  assert.throws(()=>parseSource(sources[0],'<html>不再是榜单</html>'));
});

test('热榜返回50条，合并并发请求，TTL和手动刷新冷却生效',async()=>{
  let now=Date.parse('2026-10-14T10:00:00Z'),calls=0;
  const radar=createRadar({clock:()=>now,fetcher:async url=>{calls++;return fixture(url);}});
  const [a,b]=await Promise.all([radar.get(),radar.get()]);
  assert.deepEqual(a,b);assert.equal(calls,3);assert.equal(a.status,'live');assert.equal(a.items.length,50);
  assert.equal((await radar.get()).fromCache,true);await radar.get({force:true});assert.equal(calls,3);
  now+=30001;await radar.get({force:true});assert.equal(calls,6);
  now+=600001;await radar.get();assert.equal(calls,9);
});

test('403来源不可用，页面数据保留其他真实来源',async()=>{
  const radar=createRadar({fetcher:async url=>url.includes('weibo')?new Response('Forbidden',{status:403}):fixture(url)});
  const data=await radar.get();assert.equal(data.status,'partial');assert.equal(data.items.length,50);
  assert.equal(data.sources[2].status,'unavailable');assert.match(data.sources[2].error,/限制访问/);
  assert.ok(data.items.every(item=>item.sources.every(source=>source.id!=='weibo')));
});

test('磁盘快照支持当日失败回退，跨日不显示昨日内容',async t=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'radar-test-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  let now=Date.parse('2026-10-14T10:00:00Z');
  await createRadar({dataDir:dir,clock:()=>now,fetcher:async url=>fixture(url)}).get();
  const radar=createRadar({dataDir:dir,clock:()=>now,fetcher:async()=>{throw Error('网络不可用');}});
  const cached=await radar.get();assert.equal(cached.items.length,50);assert.equal(cached.status,'partial');assert.ok(cached.sources.every(s=>s.status==='cached'));
  now=Date.parse('2026-10-14T16:00:01Z');const next=await radar.get();
  assert.equal(next.day,'2026-10-15');assert.equal(next.items.length,0);assert.ok(next.sources.every(s=>s.status==='unavailable'));
});

test('请求跨午夜时，午夜前完成的来源不计入新日榜单',async()=>{
  let now=Date.parse('2026-10-14T15:59:59Z'),release;
  const gate=new Promise(resolve=>{release=resolve;});
  const radar=createRadar({clock:()=>now,fetcher:async url=>{
    if(url.includes('toutiao'))await gate;
    return fixture(url);
  }});
  const pending=radar.get();
  await new Promise(resolve=>setImmediate(resolve));now+=2000;release();
  const data=await pending;assert.equal(data.day,'2026-10-15');assert.equal(data.sources[0].status,'unavailable');
  assert.equal(data.sources[1].status,'live');assert.ok(data.items.every(i=>i.sources.every(s=>s.id==='toutiao')));
});

test('全部来源失败时返回空状态，超大响应不会进入缓存',async()=>{
  const radar=createRadar({fetcher:async()=>new Response('x'.repeat(2*1024*1024+1))});
  const data=await radar.get();assert.equal(data.status,'unavailable');assert.equal(data.items.length,0);
  assert.ok(data.sources.every(s=>s.error==='热榜响应过大'));
});
