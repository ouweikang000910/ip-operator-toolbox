import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extendRadarHistory,searchTopics} from '../public/radar-search.mjs';

const today='2026-10-15',now=Date.parse(today+'T12:00:00+08:00');
const topic=(title,day=today,category='科技数码',rank=1)=>({id:title,title,day,rank,category,angle:'不要根据通用创作建议匹配职场',contentType:'测试分类',sources:[{id:'baidu',name:'百度热搜',rank,heat:'1234',heatLabel:'热搜指数',url:'https://www.baidu.com/s?wd='+encodeURIComponent(title),fetchedAt:day+'T03:00:00.000Z'}]});

test('方向相关词匹配，英文大小写兼容且不把 chair 当 AI',()=>{
  const items=[topic('DeepSeek发布新模型'),topic('人工智能如何改变工作'),topic('AI新进展'),topic('chair design','2026-10-15','生活消费')];
  const result=searchTopics(items,'aI',{today});
  assert.equal(result.total,3);assert.equal(result.items[0].title,'AI新进展');assert.ok(result.expandedKeywords.includes('deepseek'));
  assert.equal(searchTopics(items,'职场',{today}).total,1);
});

test('多个方向同时相关，允许分类匹配，空白与未知关键词无伪造结果',()=>{
  const items=[topic('AI辅助求职'),topic('人工智能新模型'),topic('招聘新变化',today,'教育职场')];
  assert.equal(searchTopics(items,'AI 职场',{today}).total,1);
  assert.equal(searchTopics(items,'教育',{today}).total,1);
  assert.equal(searchTopics(items,'不存在的方向关键词',{today}).total,0);
  assert.equal(searchTopics(items,'  ',{today}).total,0);
});

test('近7天含当天、按标题去重取最近上榜，排除未来和第8天',()=>{
  const items=[topic('AI同标题','2026-10-14'),topic('AI同标题'),topic('AI旧热点','2026-10-09'),topic('AI过期','2026-10-08'),topic('AI未来','2026-10-16')];
  const week=searchTopics(items,'AI',{today});assert.equal(week.total,2);
  assert.equal(week.items.find(x=>x.title==='AI同标题').day,today);
  assert.equal(searchTopics(items,'AI',{today,period:'today'}).total,1);
  assert.equal(searchTopics(items,'AI',{today,category:'财经商业'}).total,0);
});

test('搜索可找到综合50名之后的候选，分类筛选和结果上限保留总数',()=>{
  const items=Array.from({length:120},(_,i)=>topic('AI相关热点'+i,today,'科技数码',i%50+1));
  items[80]=topic('婚礼现场新发现',today,'生活消费',42);
  assert.equal(searchTopics(items,'婚庆',{today}).items[0].title,'婚礼现场新发现');
  const result=searchTopics(items,'AI',{today,limit:50});assert.equal(result.total,119);assert.equal(result.items.length,50);
});

test('保存每次抓取中出现过的标题，同日合并来源，7天外记录过期',()=>{
  const first=extendRadarHistory(null,{day:today,searchItems:[topic('AI第一条'),topic('AI另一条')]},now);
  const changed=topic('AI第一条');changed.sources.push({...changed.sources[0],id:'toutiao',name:'今日头条',url:'https://www.toutiao.com/trending/123/',rank:8});
  const second=extendRadarHistory(first,{day:today,searchItems:[changed,topic('AI新条目')]},now+60000);
  assert.equal(second.items.length,3);assert.equal(second.items.find(x=>x.title==='AI第一条').sources.length,2);
  assert.equal(second.fromDay,today);assert.deepEqual(second.days,[today]);
  const next=extendRadarHistory(second,{day:'2026-10-22',searchItems:[]},Date.parse('2026-10-22T12:00:00+08:00'));
  assert.equal(next.items.length,0);
});

test('历史不接收伪造日期或危险链接，来源只保留对应平台域名',()=>{
  const bad=topic('不安全的AI话题');bad.sources[0].url='javascript:alert(1)';
  const foreign=topic('伪装平台AI话题');foreign.sources[0].url='https://example.com/';
  const yesterday=topic('昨天AI','2026-10-14');
  const history=extendRadarHistory(null,{day:today,searchItems:[bad,foreign,yesterday,topic('真实AI')]},now);
  assert.equal(history.items.length,1);assert.equal(history.items[0].title,'真实AI');
  assert.equal(extendRadarHistory(null,{day:'2026-10-14',searchItems:[yesterday]},now).items.length,0);
});
