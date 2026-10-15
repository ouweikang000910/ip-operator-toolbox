export const RADAR_TOPIC_LIMIT=50;
export const radarCategories=['全部','社会民生','科技数码','财经商业','文娱影视','体育运动','生活消费','教育职场','健康科普','国际时事','综合热点'];
export function shanghaiDay(value=Date.now()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
  const get=type=>parts.find(p=>p.type===type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
const sourceCategories={technology:'科技数码',digital:'科技数码',finance:'财经商业',stock:'财经商业',economy:'财经商业',entertainment:'文娱影视',movie:'文娱影视',music:'文娱影视',sports:'体育运动',car:'生活消费',travel:'生活消费',food:'生活消费',fashion:'生活消费',education:'教育职场',career:'教育职场',health:'健康科普',international:'国际时事',military:'国际时事',taiwan:'国际时事',society:'社会民生'};
const rules=[
  ['国际时事',/外交|总统|首相|国台办|中朝|中美|中日|联合国|欧盟|停火|导弹|军队|军演|战争|俄乌|以色列|伊朗|巴勒斯坦|朝鲜|台独|两岸|制裁/],
  ['体育运动',/奥运|世界杯|亚运|冬奥|全运会|足球|篮球|乒乓|羽毛球|网球|男足|女足|男篮|女篮|国乒|欧冠|NBA|CBA|进球|夺冠|赛季|决赛|体操|游泳|马拉松|苏超/i],
  ['文娱影视',/票房|电影|影视|演员|歌手|演唱会|综艺|电视剧|剧集|新剧|上映|影帝|影后|金曲|导演|艺人|明星|热播|童星|金晨|孟佳|王一博|肖战|杨幂|赵丽颖|周杰伦/],
  ['科技数码',/人工智能|大模型|机器人|芯片|半导体|量子|航天|卫星|火箭|太空|手机|数码|算法|编程|开源|显卡|无人机|自动驾驶|ChatGPT|Claude|DeepSeek|OpenAI|GPT|iPhone|\bAI\b/i],
  ['财经商业',/股市|股票|基金|A股|美股|港股|利率|降息|加息|汇率|融资|上市|财报|营收|利润|经济|楼市|房价|金价|油价|关税|税收|糖税|含糖饮料税|涨价|降价|投资|消费税|倒闭|破产|企业|订单|出口/],
  ['教育职场',/高考|中考|考研|考公|考试|考证|大学|学校|教师|老师|学生|教育|校园|学费|招聘|求职|就业|职场|加班|工资|年终奖|打工|离职|裁员|实习|备课/],
  ['健康科普',/医院|医生|医疗|药物|布洛芬|疫苗|病毒|疾病|血糖|血压|健康|养生|减肥|失眠|癌症|糖尿病|医学|急救|营养|感染|流感/],
  ['生活消费',/旅游|游客|景区|酒店|美食|食物|食材|饮料|奶茶|咖啡|卫生纸|家电|宠物|猫咪|狗狗|穿搭|护肤|家居|装修|租房|婚礼|彩礼|结婚|婚姻|恋爱|育儿|孩子|生活|天气|气温|降温|台风|汽车|新车|买车|新能源车/],
  ['社会民生',/官方|通报|警方|警察|法院|判决|宣判|执法|违法|事故|高铁|地铁|公交|火车|机场|乘客|女子|男子|老人|男孩|女孩|路人|顾客|摊主|车主|街头|社区|城市|农村|乡村|救援|反诈|诈骗|曝光|身亡|受伤|差评|长江|大桥|隧道/]
];
export function classifyTopic(title,codes=[]){
  for(const code of codes){if(Object.hasOwn(sourceCategories,code))return {category:sourceCategories[code],classification:'平台分类'};}
  for(const [category,re] of rules){if(re.test(title))return {category,classification:'标题关键词分类'};}
  return {category:'综合热点',classification:'暂未细分'};
}
const ideas={
  '社会民生':['事件解读','把事件经过、官方回应和公众关心的问题分开讲清楚。'],
  '科技数码':['科技科普','解释这项变化解决了什么问题，对普通人的使用场景有什么影响。'],
  '财经商业':['行业观察','从价格、成本或商业模式切入，先核实数据与适用范围。'],
  '文娱影视':['文娱观察','从作品或公开表现找一个具体切口，区分事实和个人评价。'],
  '体育运动':['赛事解读','围绕关键表现或比赛节点展开，先确认赛况和数据来源。'],
  '生活消费':['实用分享','从普通人的具体生活问题切入，提供可核实的选择依据。'],
  '教育职场':['经验讨论','围绕受影响的人群提出一个实际问题，再补充真实经验或政策原文。'],
  '健康科普':['知识澄清','先查权威机构与专业出处，解释常见疑问，不把个案写成普遍结论。'],
  '国际时事':['背景梳理','梳理事件背景、各方公开表态与时间线，注明信息来源。'],
  '综合热点':['热点解读','先明确这件事为什么受到关注，再挑一个能查证的问题展开。']
};
const titleKey=title=>title.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
export function rankTopics(entries,limit=RADAR_TOPIC_LIMIT){
  const map=new Map();
  for(const entry of entries){
    if(!entry||typeof entry.title!=='string'||!entry.title.trim()||!Number.isInteger(entry.rank)||entry.rank<1||entry.rank>100)continue;
    const title=entry.title.trim().slice(0,200),key=titleKey(title);if(!key)continue;
    let item=map.get(key);
    if(!item){item={id:key,title,sources:[],codes:[]};map.set(key,item);}
    if(item.sources.some(s=>s.id===entry.sourceId))continue;
    item.sources.push({id:entry.sourceId,name:entry.sourceName,rank:entry.rank,heat:String(entry.heat||''),heatLabel:entry.heatLabel,url:entry.url,fetchedAt:entry.fetchedAt,cached:!!entry.cached});
    item.codes.push(...(Array.isArray(entry.categoryCodes)?entry.categoryCodes:[]));
  }
  return [...map.values()].map(item=>{
    const classification=classifyTopic(item.title,item.codes),[contentType,angle]=ideas[classification.category];
    return {id:item.id,title:item.title,...classification,contentType,angle,sources:item.sources,score:item.sources.reduce((n,s)=>n+1/(10+s.rank),0),bestRank:Math.min(...item.sources.map(s=>s.rank))};
  }).sort((a,b)=>b.score-a.score||a.bestRank-b.bestRank||a.title.localeCompare(b.title,'zh-CN')).slice(0,limit).map(({score,bestRank,...item},i)=>({...item,rank:i+1}));
}
