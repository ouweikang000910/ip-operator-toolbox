import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBrief,splitStatements,example,reconcileProject,toMarkdown} from '../public/briefly/parser.js';
const coffee='品牌要求做一条60秒以内的咖啡杯视频，必须展示防漏测试、出现品牌名称，不能出现竞品，周五交初稿';
test('coffee regression: six independent checks, correct scope and source offsets',()=>{
 const p=parseBrief(coffee);assert.equal(p.items.length,6);assert.deepEqual(p.items.map(i=>i.category),['spec','video','visual','brand','forbidden','delivery']);assert.deepEqual(p.items.map(i=>i.priority),['normal','normal','required','required','forbidden','normal']);
 for(const i of p.items)assert.equal(coffee.slice(i.sourceStart,i.sourceEnd),i.source);
 assert.ok(p.questions.some(q=>q.key==='relative-date'));assert.ok(p.questions.some(q=>q.key==='test-standard'));assert.ok(p.questions.some(q=>q.key==='brand-form'));assert.ok(!p.items.some(i=>/倒置|30秒|2026/.test(i.text)));
});
test('conjunctions and independent comma actions split without losing mandatory scope',()=>{
 for(const join of ['、','，','并','并且','以及','同时','和']){const p=parseBrief('必须展示防漏测试'+join+'出现品牌名称，不能出现竞品，周五交初稿');assert.equal(p.items.length,4,join);assert.equal(p.items[1].priority,'required',join);assert.equal(p.items.at(-1).priority,'normal');}
});
test('quoted punctuation, descriptive lists and thousands separators stay intact',()=>{
 assert.deepEqual(splitStatements('文案不能写“零糖；零脂肪”，需要拍摄产品包装。'),['文案不能写“零糖；零脂肪”','需要拍摄产品包装']);
 assert.deepEqual(splitStatements('口播为“试试看，必须好喝”。'),['口播为“试试看，必须好喝”']);assert.deepEqual(splitStatements('整体风格自然、松弛。'),['整体风格自然、松弛']);assert.equal(splitStatements('预算为5,000元，周五交初稿。')[0],'预算为5,000元');
});
test('selling points inherit instruction and deliverable versions get separate checks',()=>{
 const p=parseBrief(example);assert.ok(p.items.some(i=>i.text==='必须提到：0 添加蔗糖'&&i.priority==='required'&&i.category==='content'));assert.ok(p.items.some(i=>i.text==='交付无字幕版 1 份'));assert.ok(p.items.some(i=>i.text==='交付最终成片 1 份'));assert.ok(p.items.every(i=>example.slice(i.sourceStart,i.sourceEnd)===i.source));
});
test('new sentences do not inherit mandatory or forbidden scope',()=>{const p=parseBrief('不得出现竞品。出现品牌名称，周五交初稿。');assert.equal(p.items[1].priority,'normal');assert.equal(p.items[2].priority,'normal');});
test('questions use real ambiguity, explicit dates stay explicit, no contract question dump',()=>{
 const p=parseBrief('抖音发布1条视频，11月6日周五18点前交初稿。品牌名称需在画面展示。');assert.ok(!p.questions.some(q=>q.key==='relative-date'||q.key==='brand-form'));assert.ok(!p.questions.some(q=>/付款|修改|授权/.test(q.title)));assert.ok(!p.items.some(i=>/测试/.test(i.text)));
});
test('reparse preserves unchanged notes and checks but split completed requirements need rechecking',()=>{
 const old=parseBrief(coffee,'咖啡');old.parserVersion=undefined;old.items=[{id:'old',text:'必须展示防漏测试、出现品牌名称',source:'必须展示防漏测试、出现品牌名称',done:true,note:'旧执行备注',evidence:'00:20',category:'content',priority:'required'}];
 const next=reconcileProject(parseBrief(coffee,'咖啡'),old);const children=next.items.filter(i=>/防漏测试|出现品牌名称/.test(i.text));assert.equal(children.length,2);assert.ok(children.every(i=>!i.done&&i.needsRecheck&&i.note==='旧执行备注'));assert.ok(children.every(i=>i.previousEvidence==='00:20'));assert.equal(old.items[0].done,true);
 const orig=parseBrief(coffee);orig.items[0].done=true;orig.items[0].note='已核对';orig.items[0].evidence='成片A';orig.review={status:'approved',note:'品牌确认'};
 const same=reconcileProject(parseBrief(coffee),orig);assert.equal(same.items[0].done,true);assert.equal(same.items[0].evidence,'成片A');assert.equal(same.review.status,'approved');
 const changed=reconcileProject(parseBrief(coffee+'，标题需要带新品'),orig);assert.equal(changed.review.status,'unsubmitted');assert.equal(changed.items[0].note,'已核对');assert.equal(changed.previousProjectId,orig.id);
});
test('confirmation is not carried when its source changes',()=>{const old=parseBrief(coffee);old.questions[1].done=true;old.questions[1].answer='待核对';const next=reconcileProject(parseBrief(coffee.replace('展示防漏测试','展示高温测试')),old);assert.ok(next.questions.filter(q=>q.key==='test-standard').every(q=>!q.done));});
test('exports include self-check wording, evidence, review record, answers and original',()=>{const p=parseBrief(coffee);p.items[0].done=true;p.items[0].evidence='00:18';p.items[0].note='已核对';p.review={status:'pending',note:'已发品牌'};p.questions[0].answer='抖音';p.questions[0].done=true;const md=toMarkdown(p);for(const s of ['- [x]','00:18','检查方法','原文依据','清单自查进度：1 / 6','待反馈','不代表品牌验收','抖音',coffee])assert.ok(md.includes(s),s);});
test('input limits and unicode line endings',()=>{assert.throws(()=>parseBrief(''),/至少/);assert.throws(()=>parseBrief('长'.repeat(20001)),/20,000/);assert.equal(splitStatements('必须展示测试\r\n周五交初稿').length,2);});

test('duration upper bound and negative comma scope remain explicit',()=>{const p=parseBrief('交付1条不超过60秒的视频，不能出现竞品，展示防漏测试。');assert.ok(p.items.some(i=>i.text==='视频时长：不超过60秒'));assert.equal(p.items.find(i=>i.text==='展示防漏测试').priority,'normal');});
test('pending recheck survives repeated parsing and manual categories are preserved',()=>{const p=parseBrief('必须展示防漏测试、出现品牌名称。');p.items[0].needsRecheck=true;p.items[0].previousEvidence='旧镜头';p.items[0].category='other';const next=reconcileProject(parseBrief(p.original),p);assert.equal(next.items[0].needsRecheck,true);assert.equal(next.items[0].previousEvidence,'旧镜头');assert.equal(next.items[0].category,'other');});
