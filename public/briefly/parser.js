export const categories = [
  {id:'content',name:'内容与卖点',icon:'align'},
  {id:'visual',name:'拍摄与画面',icon:'camera'},
  {id:'publish',name:'发布与互动',icon:'send'},
  {id:'delivery',name:'交付与排期',icon:'calendar'},
  {id:'business',name:'合作与授权',icon:'shield'},
  {id:'other',name:'其他要求',icon:'list'}
];
export const example = `这次是「山野之间」燕麦拿铁的秋日新品合作，主要想传达“忙碌的日子，也能好好喝一杯”的感觉，面向喜欢生活方式、通勤场景的年轻人。

需要在小红书发布 1 条 60–90 秒的竖版视频，整体风格自然、松弛，不要做成硬广。开头 5 秒内要出现产品，至少有 1 个包装正面特写，品牌 Logo 要清晰。场景可以选通勤路上或居家早餐。

必须提到两个核心卖点：100% 植物基、0 添加蔗糖；口感可以用“顺滑、有淡淡燕麦香”来描述。不要出现“零糖”“减肥”等表述，不得露出其他咖啡品牌。

标题需要带「秋日第一杯」，正文带话题 #山野之间 #我的松弛感日常，并 @山野之间官方账号。发布后需在评论区置顶购买指引，保留笔记至少 180 天。

10 月 20 日前给脚本，10 月 24 日前交初剪，10 月 28 日发布；发布前需要品牌审核通过。需交付无字幕版和最终成片各 1 份，视频封面也一起给到。报价含 2 轮修改，超出部分另议。`;

const categoryRules = [
 ['business',/报价|费用|预算|结算|付款|定金|尾款|发票|税|授权|版权|肖像|买断|投流|白名单|排他|竞业|修改|轮.*改|免费|付费|超出.*另议/],
 ['delivery',/脚本|初剪|初稿|终稿|定稿|成片|交付|提交|交稿|审[核稿]|确认后|给到|给.{0,4}版|反馈|截止|排期|无字幕版|源文件/],
 ['publish',/标题|正文|话题|标签|@|#[^\s]+|评论|置顶|购买|链接|挂车|发布|上线|保留|下架|删除|平台|小红书|抖音|哔哩|B站|视频号|微博|快手|公众号/],
 ['visual',/镜头|特写|画面|构图|包装|logo|Logo|LOGO|露出|出镜|开头|前\s*\d+\s*秒|竖[版屏]|横[版屏]|分辨率|比例|光线|封面|拍摄|场景|字幕|配音|音乐|BGM|bgm|音频|收音|滤镜|剪辑|色调|1080|4K|机位/],
 ['content',/卖点|提到|强调|体现|传达|突出|表达|表述|描述|口感|文案|内容|风格|调性|植入|硬广|品牌|产品|受众|面向|人群|故事|测评|体验|开箱|自然|松弛/]
];

// Split outside quotations only: protected wording stays verbatim.
export function splitStatements(text) {
 const sentences=[];let buffer='',quote=null;
 const normalized=text.replace(/\r\n?/g,'\n');
 for(let index=0;index<normalized.length;index++) {
  const c=normalized[index];
  if(!quote&&'“「『"'.includes(c)) quote=({'“':'”','「':'」','『':'』','"':'"'})[c];
  else if(quote&&c===quote) quote=null;
  const commaBoundary=/[，,]/.test(c)&&/^\s*(?:(?:并且|另外|同时))?(?:必须|务必|不得|禁止|不可|不能|不要|至少|需要|需交付|发布前|发布后|标题|正文|整体风格|品牌\s*[Ll][Oo][Gg][Oo]|保留笔记|视频封面|\d{1,2}\s*月)/.test(normalized.slice(index+1));
  if(!quote&&(/[。；;\n]/.test(c)||commaBoundary)){if(buffer.trim())sentences.push(buffer.trim());buffer='';}
  else buffer+=c;
 }
 if(buffer.trim())sentences.push(buffer.trim());
 return sentences.map(s=>s.replace(/^\s*(?:[-•·]|\d+[.、])\s*/,'').trim()).filter(Boolean);
}

function classify(s){if(/(?:\d{1,2}\s*月\s*\d{1,2}|\d{1,2}[-/]\d{1,2}|周[一二三四五六日天]).*(?:发布|上线|交付|给|提交)/.test(s))return 'delivery';return categoryRules.find(([,re])=>re.test(s))?.[0]||'other';}
function priority(s){return /不得|禁止|不要|不能|不可|严禁|避免/.test(s)?'forbidden':/必须|务必|至少|一定|确保|强制/.test(s)?'required':/建议|可以|可选|最好|倾向/.test(s)?'suggested':'normal';}
function missing(text,pattern){return !pattern.test(text);}
function stableId(prefix,index){return `${prefix}-${index+1}`;}
function short(s,n=100){return s.length>n?s.slice(0,n)+'…':s;}

export function parseBrief(input,projectName='') {
 const text=input.trim();
 if(text.length<10) throw new Error('再补充一点信息吧，至少输入 10 个字。');
 if(text.length>20000) throw new Error('原文超过 20,000 字，请分成多个项目拆解。');
 const statements=splitStatements(text);
 const brand=text.match(/(?:品牌(?:名称)?|合作品牌)\s*[：:]\s*([^\n，。；]{1,35})/)?.[1] || text.match(/[「【]([^」】]{1,25})[」】]/)?.[1] || '';
 const platform=[...new Set(text.match(/小红书|抖音|视频号|B站|哔哩哔哩|微博|快手|公众号|YouTube|Instagram|TikTok/gi)||[])];
 const dates=[...new Set(text.match(/(?:20\d{2}[-/.年])?\d{1,2}\s*(?:月\s*\d{1,2}\s*[日号]?|[-/]\d{1,2})|(?:本|下)周[一二三四五六日天]|明天|后天/g)||[])];
 const deliverable=statements.find(s=>/(?:\d+|[一二三四五六])\s*[条篇支份张组].*(?:视频|图文|笔记|图片|照片|文章)|(?:视频|图文|笔记).*(?:\d+|[一二三四五六])\s*[条篇支份张组]/.test(s));
 const goal=statements.find(s=>/传达|主打|希望.*(?:感|传递)|目标|主要想|主题|提升|推广|宣传/.test(s));
 const audience=statements.find(s=>/面向|受众|人群|针对/.test(s));
 const context=statements.filter(s=>/^(?:这次|本次|我们是|品牌名称|合作品牌|项目名称)/.test(s)&&/合作|品牌|传达|面向|产品/.test(s)&&!/必须|需要|禁止|不得|请|交付|发布|上线|提到|露出|提交|拍摄|视频|图文|笔记|至少|包含|保留|修改|审核/.test(s));
 const items=statements.filter(s=>!context.includes(s)).map((s,i)=>({id:stableId('item',i),text:s,source:s,category:classify(s),priority:priority(s),done:false,note:''}));
 if(!items.length) items.push({id:'item-1',text:statements.join('；'),source:text,category:'other',priority:'normal',done:false,note:''});
 const questions=[];
 const add=(title,detail)=>questions.push({id:stableId('question',questions.length),title,detail,done:false,answer:''});
 if(missing(text,/(?:\d+|[一二三四五六七八九十])\s*[条篇支份张组]/))add('交付数量和形式是什么？','确认视频、图文或其他物料的数量、规格和发布平台。');
 if(!platform.length)add('在哪些平台发布？','确认发布平台、账号，以及是否需要多平台同步。');
 if(!dates.length&&missing(text,/\d+\s*(?:个工作日|天|小时|周).*(?:内|前|后)/))add('具体排期如何安排？','补齐脚本、初稿、定稿与发布时间，避免只约定“尽快”。');
 if(missing(text,/审核|审稿|确认后|通过后|品牌确认/))add('发布前需要谁审核？','确认审核负责人、反馈时限，以及通过后是否可以直接发布。');
 if(missing(text,/授权|版权|买断|投流|白名单|使用权/))add('素材授权范围是什么？','确认品牌能否二次剪辑、转载或投流，以及授权渠道和期限。');
 if(missing(text,/结算|付款|定金|尾款|支付|预付|报酬/))add('如何付款和结算？','确认合作金额、付款节点、税费及开票要求。');
 if(missing(text,/(?:\d+|[一二三四五六七八九十两])\s*(?:轮|次).*改|改.*(?:\d+|[一二三四五六七八九十两])\s*(?:轮|次)/))add('包含几轮修改？','明确免费修改次数、修改范围，以及额外修改的费用。');
 if(/尽快|待定|另议|到时候|差不多|左右|另行/.test(text))add('这些模糊约定需要补充细节',statements.filter(s=>/尽快|待定|另议|到时候|差不多|左右|另行/.test(s)).join('；'));
 const timeline=statements.filter(s=>/(?:\d{1,2}\s*月|\d{1,2}[-/]\d{1,2}|周[一二三四五六日天]|明天|后天|\d+\s*(?:个工作日|天|小时)).*(?:前|后|交|发|审|给|完成)|(?:截止|排期)/.test(s)).map((s,i)=>({id:stableId('date',i),text:s}));
 const summary=[goal,deliverable].filter(Boolean);
 return {id:globalThis.crypto?.randomUUID?.()||'brief-'+Date.now(),name:projectName.trim()||(brand?brand+' · 品牌合作':'未命名合作项目'),brand,platform,dates,summary:summary.length?[...new Set(summary)].join('。')+'。':short(statements.slice(0,2).join('。'),260),audience:audience?short(audience,150):'原文未明确',deliverable:deliverable?short(deliverable,140):'原文未明确',timeline,items,questions,original:text,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),isDemo:false};
}

export function toMarkdown(p){
 const lines=[`# ${p.name}`,'', '## 需求摘要',p.summary,'','## 执行清单'];
 for(const cat of categories){const group=p.items.filter(i=>i.category===cat.id);if(!group.length)continue;lines.push('',`### ${cat.name}`);for(const i of group){lines.push(`- [${i.done?'x':' '}] ${i.priority==='forbidden'?'[注意禁忌] ':i.priority==='required'?'[必须] ':''}${i.text}`);if(i.note)lines.push(`  - 备注：${i.note}`);}}
 lines.push('','## 待确认事项');for(const q of p.questions){lines.push(`- [${q.done?'x':' '}] ${q.title}`,`  - ${q.detail}`);if(q.answer)lines.push(`  - 确认结果：${q.answer}`);}
 lines.push('','## 品牌原文',p.original,'','---','由 Briefly 本地规则拆解生成，请结合原文复核。');return lines.join('\n');
}
