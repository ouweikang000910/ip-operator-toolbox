export const PARSER_VERSION = 2;
export const categories = [
 {id:'spec',name:'交付规格',icon:'file'},
 {id:'video',name:'视频规格',icon:'camera'},
 {id:'content',name:'内容与卖点',icon:'align'},
 {id:'visual',name:'拍摄与展示',icon:'camera'},
 {id:'brand',name:'品牌露出',icon:'flag'},
 {id:'forbidden',name:'禁止事项',icon:'shield'},
 {id:'publish',name:'发布与互动',icon:'send'},
 {id:'delivery',name:'交付排期',icon:'calendar'},
 {id:'business',name:'合作与授权',icon:'shield'},
 {id:'other',name:'其他要求',icon:'list'}
];
export const example = `这次是「山野之间」燕麦拿铁的秋日新品合作，主要想传达“忙碌的日子，也能好好喝一杯”的感觉，面向喜欢生活方式、通勤场景的年轻人。

需要在小红书发布 1 条 60–90 秒的竖版视频，整体风格自然、松弛，不要做成硬广。开头 5 秒内要出现产品，至少有 1 个包装正面特写，品牌 Logo 要清晰。场景可以选通勤路上或居家早餐。

必须提到两个核心卖点：100% 植物基、0 添加蔗糖；口感可以用“顺滑、有淡淡燕麦香”来描述。不要出现“零糖”“减肥”等表述，不得露出其他咖啡品牌。

标题需要带「秋日第一杯」，正文带话题 #山野之间 #我的松弛感日常，并 @山野之间官方账号。发布后需在评论区置顶购买指引，保留笔记至少 180 天。

10 月 20 日前给脚本，10 月 24 日前交初剪，10 月 28 日发布；发布前需要品牌审核通过。需交付无字幕版和最终成片各 1 份，视频封面也一起给到。报价含 2 轮修改，超出部分另议。`;


const modal = /^(?:并且|而且|同时|并|且)?\s*(必须|务必|不得|禁止|不要|不能|不可|严禁|至少|需要|建议|可以|可选|最好)/;
const rightAction = /^(?:(?:并且|而且|同时|以及|另外|和|并|且)\s*)?(?:必须|务必|不得|禁止|不可|不能|不要|至少|需要|需交付|交付|提交|展示|出现|露出|拍摄|提到|强调|包含|提供|保留|开头|发布前|发布后|标题|正文|整体风格|品牌\s*(?:[Ll][Oo][Gg][Oo]|名称)|视频封面|@|报价|超出|\d{1,2}\s*月|(?:本|下)?周[一二三四五六日天]|星期[一二三四五六日天]|明天|后天|(?:20\d{2}[-/])?\d{1,2}[-/]\d{1,2})/;
function segments(text) {
 const out=[];let start=0,quote=null,depth=0;
 const push=end=>{let a=start,b=end;while(a<b&&/\s/.test(text[a]))a++;while(b>a&&/\s/.test(text[b-1]))b--;if(a<b){const raw=text.slice(a,b);const strip=raw.match(/^(?:[-•·]|\d+[.、])\s*/)?.[0]||'';a+=strip.length;if(a<b)out.push({text:text.slice(a,b),start:a,end:b});}};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quote){if(c===quote)quote=null;continue;}
  if('“「『"'.includes(c)){quote=({'“':'”','「':'」','『':'』','"':'"'})[c];continue;}
  if('（('.includes(c))depth++;
  if('）)'.includes(c))depth=Math.max(0,depth-1);
  if(depth)continue;
  const before=text.slice(start,i),after=text.slice(i+1).trimStart();
  const enumeration=/[、，,]/.test(c)&&/卖点|提到|强调|包括|包含/.test(before)&&/^(?:\d|[零无低高全纯])/.test(after)&&!/^\d{3}(?:\D|$)/.test(after);
  const comma=/[，,、]/.test(c)&&rightAction.test(after)&&!(c===','&&/\d$/.test(before)&&/^\d{3}(?:\D|$)/.test(after));
  if(/[。；;\n\r]/.test(c)||comma||enumeration){push(i);start=i+1;continue;}
  const join=text.slice(i).match(/^(并且|而且|同时|以及|和|并|且)/)?.[0];
  if(join&&before.trim()&&rightAction.test(text.slice(i+join.length).trimStart())){push(i);start=i+join.length;i+=join.length-1;}
 }
 push(text.length);return out;
}
export function splitStatements(text){return segments(text).map(s=>s.text);}
function priority(s){return /不得|禁止|不要|不能|不可|严禁|避免/.test(s)?'forbidden':/必须|务必|至少|一定|确保|强制/.test(s)?'required':/建议|可以|可选|最好|倾向/.test(s)?'suggested':'normal';}
function classify(s){
 if(priority(s)==='forbidden')return 'forbidden';
 if(/报价|费用|预算|结算|付款|定金|尾款|发票|税|授权|版权|肖像|买断|投流|白名单|排他|竞业|修改|超出.*另议/.test(s))return 'business';
 if(/(?:周[一二三四五六日天]|星期[一二三四五六日天]|\d{1,2}\s*月|\d{1,2}[-/]\d{1,2}|明天|后天|截止|排期|\d+\s*(?:天|小时|工作日)).*(?:交|给|审|发|完成)|初稿|初剪|脚本|审[核稿]|终稿|定稿/.test(s))return 'delivery';
 if(/时长|\d+\s*(?:[–—~～-]\s*\d+\s*)?秒|分辨率|1080|4K|竖[版屏]|横[版屏]|画幅|帧率/.test(s)&&!/开头|前\s*\d+\s*秒|镜头/.test(s))return 'video';
 if(/品牌名称|品牌名|[Ll][Oo][Gg][Oo]|品牌.*(?:露出|出镜)/.test(s))return 'brand';
 if(/标题|正文|话题|标签|@|#|评论|置顶|购买|链接|挂车|发布|上线|保留|下架|平台|小红书|抖音|B站|视频号|微博|快手|公众号/.test(s))return 'publish';
 if(/测试|镜头|特写|画面|构图|包装|露出|出镜|开头|拍摄|场景|字幕|配音|音乐|封面|BGM|收音|滤镜|剪辑|色调/.test(s))return 'visual';
 if(/交付|给到|成片|无字幕版|源文件|(?:\d+|[一二三四五六])\s*[条篇支份张组].*(?:视频|图文|笔记|图片|照片|文章)/.test(s))return 'spec';
 if(/卖点|提到|强调|体现|传达|突出|表达|表述|描述|口感|文案|内容|风格|调性|品牌|产品|受众|面向|人群|故事|测评|体验|开箱|自然|松弛/.test(s))return 'content';
 return 'other';
}
export function checkMethod(category,text){
 if(/防漏|测试/.test(text))return '记录测试对应的镜头位置；按品牌确认的方法与标准核对，不自行补充测试条件。';
 return ({spec:'核对交付文件的数量、主题与版本。',video:'查看成片实际时长、画幅或文件参数，对照原文检查。',brand:'记录名称或 Logo 出现的位置；未明确露出形式时先向品牌确认。',forbidden:'检查完整成片、字幕、口播与背景，确认没有出现禁止内容。',visual:'记录对应镜头或画面位置，对照原文逐项检查。',content:'核对脚本、口播或字幕，记录对应句子或镜头。',publish:'核对发布页面、文案、账号与发布记录。',delivery:'确认具体日期与交付节点，记录实际提交或审核结果。',business:'对照双方书面约定，核对金额、修改或授权条款。',other:'结合原文人工检查；不明确的条件先与品牌确认。'})[category];
}
function atoms(text){
 const clauses=segments(text);let inherited='',verb='';const out=[];
 for(const c of clauses){
  let value=c.text.replace(/^(?:并且|而且|同时|以及|另外|和|并|且)\s*/,''),textValue=value;
  const previous=out.at(-1);
  // Only inherit a list's instruction across an adjacent enumeration, never a new sentence/deadline.
  const gap=previous?text.slice(previous.sourceEnd,c.start):'';
  if(/[。；;\n\r]/.test(gap)){inherited='';verb='';}
  const m=value.match(modal);if(m)inherited=m[1];
  if(!m&&/^(?:出现|展示|露出|提到|强调|包含)/.test(value)&&/^[、，,\s]*(?:(?:并且|和|并|且|同时|以及)\s*)?$/.test(gap)&&inherited&&(!/不得|禁止|不要|不能|不可|严禁/.test(inherited)||!/[，,]/.test(gap)))textValue=inherited+value;
  if(/^(?:\d|[零无低高全纯])/.test(value)&&verb&&/^[、，,\s]*$/.test(gap))textValue=(inherited||'')+verb+'：'+value;
  if(/卖点|提到|强调|包含|包括/.test(value))verb=value.match(/提到|强调|包含|包括/)?.[0]||'提到';
  const duration=value.match(/(?:不超过|不少于|最多|至少|小于|大于)?\s*\d+\s*(?:[–—~～-]\s*\d+\s*)?(?:秒|分钟)(?:以内|以下|以上|内)?/);
  const quantity=/(?:\d+|[一二三四五六七八九十])\s*[条支份篇]/.test(value)&&/视频/.test(value);
  const add=(label,category)=>out.push({text:label,source:text.slice(c.start,c.end),sourceStart:c.start,sourceEnd:c.end,category:category||classify(label),priority:priority(textValue)});
  if(duration&&quantity&&!/开头|前\s*\d+\s*秒/.test(value)){
   add(textValue.replace(duration[0],'').replace(/([条支份篇])\s*的/,'$1 ').replace(/\s+/g,' ').trim(),/发布|小红书|抖音/.test(value)?'publish':'spec');
   add('视频时长：'+duration[0],'video');
  }else if(/无字幕版和最终成片各\s*(\d+|[一二两])\s*份/.test(value)){const quantity=value.match(/各\s*(\d+|[一二两])\s*份/)[1];add('交付无字幕版 '+quantity+' 份','spec');add('交付最终成片 '+quantity+' 份','spec');}else add(textValue);
  if(!m&&!/^(?:出现|展示|露出|提到|强调|包含|\d)/.test(value)){inherited='';verb='';}
 }
 return out;
}
const short=(s,n=260)=>s.length>n?s.slice(0,n)+'…':s;
export function parseBrief(input,projectName=''){
 const text=input.trim();if(text.length<10)throw new Error('再补充一点信息吧，至少输入 10 个字。');if(text.length>20000)throw new Error('原文超过 20,000 字，请分成多个项目拆解。');
 const clauses=segments(text),statements=clauses.map(s=>s.text);
 const brand=text.match(/(?:品牌(?:名称)?|合作品牌)\s*[：:]\s*([^\n，。；]{1,35})/)?.[1]||text.match(/[「【]([^」】]{1,25})[」】]/)?.[1]||'';
 const platform=[...new Set(text.match(/小红书|抖音|视频号|B站|哔哩哔哩|微博|快手|公众号|YouTube|Instagram|TikTok/gi)||[])];
 const dates=[...new Set(text.match(/(?:20\d{2}[-/.年])?\d{1,2}\s*(?:月\s*\d{1,2}\s*[日号]?|[-/]\d{1,2})|(?:本|下)?周[一二三四五六日天]|星期[一二三四五六日天]|明天|后天/g)||[])];
 const deliverable=statements.find(s=>/(?:\d+|[一二三四五六])\s*[条篇支份张组].*(?:视频|图文|笔记|图片|照片|文章)|(?:视频|图文|笔记).*(?:\d+|[一二三四五六])\s*[条篇支份张组]/.test(s));
 const goal=statements.find(s=>/传达|主打|希望.*(?:感|传递)|目标|主要想|主题|提升|推广|宣传/.test(s));
 const audience=statements.find(s=>/面向|受众|人群|针对/.test(s));
 const context=statements.filter(s=>/^(?:这次|本次|我们是|品牌名称|合作品牌|项目名称)/.test(s)&&/合作|品牌|传达|面向|产品/.test(s)&&!/必须|需要|禁止|不得|请|交付|发布|上线|提到|露出|提交|拍摄|视频|图文|笔记|至少|包含|保留|修改|审核/.test(s));
 const items=atoms(text).filter(i=>!context.includes(i.source)).map((i,n)=>({...i,id:'item-'+(n+1),done:false,note:'',evidence:'',checkMethod:checkMethod(i.category,i.text)}));
 if(items.length>1000)throw new Error('拆解项超过 1,000 条，请分成多个项目。');
 if(!items.length)items.push({id:'item-1',text:short(text),source:text,sourceStart:0,sourceEnd:text.length,category:'other',priority:'normal',done:false,note:'',evidence:'',checkMethod:checkMethod('other',text)});
 const questions=[];const add=(key,title,detail,source='')=>{if(!questions.some(q=>q.key===key))questions.push({key,id:'question-'+(questions.length+1),title,detail,source,done:false,answer:''});};
 if(!deliverable)add('deliverable','交付数量和形式是什么？','原文没有明确交付物，请补充数量、形式和版本。');
 if(!platform.length)add('platform','在哪些平台发布？','原文未写明发布平台；如只交付素材、不负责发布，也请记录这一约定。');
 if(!dates.length&&!/\d+\s*(?:个工作日|天|小时|周).*(?:内|前|后)/.test(text))add('schedule','具体排期如何安排？','原文未明确排期，请确认本次所需的交付日期。');
 for(const i of items){
  if(/(?:周[一二三四五六日天]|星期[一二三四五六日天]|明天|后天)/.test(i.text)&&!/(?:\d{1,2}\s*月\s*\d{1,2}|\d{1,2}[-/]\d{1,2})/.test(i.source))add('relative-date','相对日期具体是哪一天、几点前？','请把“周五 / 明天”等相对时间确认成具体年月日和截止时间，工具不会自动推算。',i.source);
  if(/品牌名|品牌名称/.test(i.text)&&!/口播|字幕|画面|包装|片头|片尾|特写/.test(i.text))add('brand-form','品牌名称以什么形式出现？','确认画面、字幕或口播是否均可，以及是否有指定名称写法。',i.source);
  if(/防漏|测试/.test(i.text)&&!/测试(?:方法|标准)[：:]|倒置\s*\d|静置\s*\d/.test(text))add('test-standard','测试方法和通过标准是什么？','请品牌提供测试方式及判断标准；原文未写的时长、动作和条件不会补进执行清单。',i.source);
  if(/竞品|其他.*品牌/.test(i.text))add('competitor','禁止出现的竞品范围是什么？','确认涉及的品牌、品类，以及包装、背景或口播是否都在限制范围内。',i.source);
  if(/尽快|待定|另议|到时候|差不多|左右|另行/.test(i.text))add('vague-'+i.id,'这条约定需要补充具体条件',i.text,i.source);
 }
 // Contract questions are tied to a mentioned term, rather than appended to every brief.
 if(/授权|版权|买断|投流|白名单/.test(text)&&!/授权.{0,25}(?:天|月|年)|(?:渠道|范围|期限)[：:]/.test(text))add('rights','授权范围和期限是什么？','原文涉及素材使用，请确认渠道、期限和二次剪辑范围。');
 const timeline=items.filter(i=>i.category==='delivery').map((i,n)=>({id:'date-'+n,text:i.text}));
 return {parserVersion:PARSER_VERSION,id:globalThis.crypto?.randomUUID?.()||'brief-'+Date.now(),name:projectName.trim()||(brand?brand+' · 品牌合作':'未命名合作项目'),brand,platform,dates,summary:[...new Set([goal,deliverable].filter(Boolean))].join('。')||short(statements.slice(0,2).join('。')),audience:audience?short(audience,150):'原文未明确',deliverable:deliverable?short(deliverable,140):'原文未明确',timeline,items,questions,original:text,review:{status:'unsubmitted',note:''},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),isDemo:false};
}
const key=s=>s.replace(/\s+/g,'').replace(/[，,。；;：:、]/g,'');
export function reconcileProject(next,previous){
 if(!previous||previous.isDemo)return next;
 const used=new Set();let retained=0,recheck=0;
 for(const item of next.items){
  const exact=previous.items.find(p=>!used.has(p.id)&&key(p.text)===key(item.text));
  if(exact){used.add(exact.id);Object.assign(item,{done:!!exact.done,note:exact.note||'',evidence:exact.evidence||'',checkMethod:exact.checkMethod||item.checkMethod,needsRecheck:!!exact.needsRecheck,previousEvidence:exact.previousEvidence||''});if(previous.parserVersion===PARSER_VERSION){item.category=exact.category;item.priority=exact.priority;}if(exact.text!==item.text||exact.source!==item.source){item.done=false;item.needsRecheck=true};retained++;continue;}
  const parent=previous.items.find(p=>p.source&&(p.source.includes(item.source)||item.source.includes(p.source)));
  if(parent){item.note=parent.note||'';item.previousEvidence=parent.evidence||'';item.needsRecheck=true;item.done=false;recheck++;}
 }
 for(const q of next.questions){const old=previous.questions.find(p=>(q.key&&p.key===q.key||p.title===q.title)&&(p.source||'')===(q.source||''));if(old){q.done=!!old.done;q.answer=old.answer||'';}}
 const changed=next.original!==previous.original;
 next.review=changed?{status:'unsubmitted',note:'需求已变更，请重新提交审核。'}:{...(previous.review||next.review)};
 next.previousProjectId=previous.id;
 recheck=next.items.filter(i=>i.needsRecheck).length;
 next.changeSummary={retained,added:next.items.length-retained,removed:previous.items.filter(p=>!used.has(p.id)).map(p=>({text:p.text,done:!!p.done})),recheck};
 return next;
}
export function toMarkdown(p){
 const complete=p.items.filter(i=>i.done).length,reviewLabels={unsubmitted:'未提交',pending:'待反馈',changes:'需修改',approved:'已通过'};
 const lines=[`# ${p.name}`,'','## 需求摘要',p.summary,'',`清单自查进度：${complete} / ${p.items.length} 项（自查不代表品牌验收通过）`,`品牌审核（人工记录）：${reviewLabels[p.review?.status]||'未提交'}`];
 if(p.review?.note)lines.push('审核记录：'+p.review.note);
 lines.push('','## 执行清单');
 for(const cat of categories){const group=p.items.filter(i=>i.category===cat.id);if(!group.length)continue;lines.push('',`### ${cat.name}`);for(const i of group){lines.push(`- [${i.done?'x':' '}] ${i.priority==='forbidden'?'[禁止] ':i.priority==='required'?'[必须] ':i.priority==='suggested'?'[建议] ':''}${i.text}`);if(i.checkMethod)lines.push(`  - 检查方法：${i.checkMethod}`);if(i.evidence)lines.push(`  - 检查记录 / 证据位置：${i.evidence}`);if(i.note)lines.push(`  - 备注：${i.note}`);if(i.needsRecheck)lines.push('  - 由旧要求细分，请重新检查');if(i.source)lines.push(`  - 原文依据：${i.source}`);}}
 lines.push('','## 待确认事项');for(const q of p.questions){lines.push(`- [${q.done?'x':' '}] ${q.title}`,`  - ${q.detail}`);if(q.source)lines.push(`  - 原文依据：${q.source}`);if(q.answer)lines.push(`  - 确认结果：${q.answer}`);}
 lines.push('','## 品牌原文',p.original,'','---','由 Briefly 本地规则拆解生成，请结合原文复核；勾选仅表示人工自查。');return lines.join('\n');
}
