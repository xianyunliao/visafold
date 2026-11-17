const countries = [
  {id:'japan', flag:'🇯🇵', name:'日本', en:'JAPAN', source:'https://www.mofa.go.jp/j_info/visit/visa/index.html', sourceLabel:'日本外务省 · Visa', sourceStatus:'待在线核验'},
  {id:'korea', flag:'🇰🇷', name:'韩国', en:'KOREA', source:'https://www.visa.go.kr/', sourceLabel:'韩国签证门户', sourceStatus:'待在线核验'},
  {id:'singapore', flag:'🇸🇬', name:'新加坡', en:'SINGAPORE', source:'https://www.ica.gov.sg/information-and-e-services/entry-and-departure/entering-singapore/visa-guidelines/visa-free', sourceLabel:'新加坡 ICA', sourceStatus:'已抓取'},
  {id:'usa', flag:'🇺🇸', name:'美国', en:'UNITED STATES', source:'https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visitor.html', sourceLabel:'美国国务院 · Visitor Visa', sourceStatus:'待在线核验'},
  {id:'uk', flag:'🇬🇧', name:'英国', en:'UNITED KINGDOM', source:'https://www.gov.uk/standard-visitor', sourceLabel:'GOV.UK · Standard Visitor', sourceStatus:'已抓取'},
  {id:'australia', flag:'🇦🇺', name:'澳大利亚', en:'AUSTRALIA', source:'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600', sourceLabel:'澳大利亚内政部', sourceStatus:'已抓取'},
  {id:'new-zealand', flag:'🇳🇿', name:'新西兰', en:'NEW ZEALAND', source:'https://www.immigration.govt.nz/visas/visitor-visa/', sourceLabel:'新西兰移民局', sourceStatus:'已抓取'},
  {id:'schengen', flag:'◎', name:'申根区', en:'SCHENGEN AREA', source:'https://home-affairs.ec.europa.eu/policies/schengen/visa-policy/applying-schengen-visa_en', sourceLabel:'欧盟委员会 · Schengen visa', sourceStatus:'已抓取'}
];
const typeOptions = [
  {id:'tourism', title:'旅游签证', sub:'短期旅行 / 探亲 / 观光', code:'TOURISM'},
  {id:'working-holiday', title:'打工度假', sub:'边旅行边短期工作', code:'WORK & HOLIDAY'},
  {id:'offer-work', title:'已有 Offer', sub:'已获得当地雇主聘用', code:'EMPLOYMENT'}
];
const provinces = ['北京','上海','广东','四川','江苏','浙江','湖北','湖南','福建','山东','河南','陕西','重庆','天津','河北','辽宁','吉林','黑龙江','安徽','江西','广西','云南','贵州','甘肃','山西','内蒙古','新疆','其他'];
const state = {step:1, country:null, type:null, answers:{}, history:[], report:null, started:false};
const saved = localStorage.getItem('visafold-state');
if(saved){try{Object.assign(state,JSON.parse(saved));}catch(e){localStorage.removeItem('visafold-state')}}

const $ = (sel)=>document.querySelector(sel);
function persist(){localStorage.setItem('visafold-state',JSON.stringify(state));}
function country(){return countries.find(c=>c.id===state.country) || countries[0]}
function setState(key,value){state[key]=value;persist();render()}
function setAnswer(key,value){state.answers[key]=value;persist()}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

function flow(){
  const countryFlows={
    japan:['destination','purpose','profile','funding','travel','history','confirm'],
    korea:['destination','purpose','profile','funding','travel','confirm'],
    singapore:['destination','purpose','profile','travel','funding','confirm'],
    usa:['destination','purpose','profile','funding','travel','history','interview','confirm'],
    uk:['destination','purpose','profile','funding','travel','history','confirm'],
    australia:['destination','purpose','profile','funding','travel','history','confirm'],
    'new-zealand':['destination','purpose','profile','funding','travel','history','confirm'],
    schengen:['destination','purpose','profile','funding','travel','history','confirm']
  };
  const steps=[...(countryFlows[state.country]||countryFlows.japan)];
  if(state.type && state.type!=='tourism')steps.splice(Math.max(steps.indexOf('confirm'),0),0,'work');
  return [...steps,'result'];
}
function stepTitle(id){
  const titles={
    destination:'先选目的地与计划',
    purpose:'选择申请类型',
    profile:'你的学习与个人背景',
    funding:'这次旅行由谁支持',
    travel:'计划中的那段旅程',
    history:'你的出境与签证记录',
    interview:'赴美面谈准备',
    work:state.type==='working-holiday'?'打工度假的准备情况':'工作签证的 Offer 与条件',
    confirm:'再确认几项细节',
    result:'你的准备报告'
  };
  return titles[id]||'签证准备信息';
}
function stepLabel(id){
  const steps=flow(),index=steps.indexOf(id)+1,total=steps.length-1;
  return `${String(index).padStart(2,'0')} / ${id.toUpperCase()} <span>${String(total).padStart(2,'0')} STEPS</span>`;
}
function scrollAssessment(){
  $('#assessment').scrollIntoView({behavior:'smooth',block:'start'});
}

function render(){
  const steps=flow();
  if(state.report && steps[state.step-1]!=='result')state.step=steps.length;
  if(state.step>1)state.started=true;
  state.step=Math.min(Math.max(state.step,1),steps.length);
  const stepId=steps[state.step-1];
  const questionCount=steps.length-1;
  document.body.classList.toggle('assessment-mode',Boolean(state.started));
  $('#stepEyebrow').textContent=stepId==='result'?'REPORT':`${String(state.step).padStart(2,'0')} / ${String(questionCount).padStart(2,'0')}`;
  $('#progressFill').style.width=`${stepId==='result'?100:Math.max(10,Math.round((state.step/questionCount)*100))}%`;
  $('#stepTitle').textContent=stepTitle(stepId);
  const views={destination:stepDestination,purpose:stepPurpose,profile:stepProfile,funding:stepFunding,travel:stepTravel,history:stepHistory,interview:stepInterview,work:stepWork,confirm:stepConfirm,result:stepResult};
  $('#stepContainer').innerHTML=views[stepId]();
  bindStep();
}
function stepDestination(){
  return `<div class="step-panel"><div class="step-label">${stepLabel('destination')}</div><div class="country-grid choice-grid">${countries.map((c,i)=>`<button class="choice-card ${state.country===c.id?'selected':''}" data-country="${c.id}" type="button"><span class="country-flag">${c.flag}</span><strong>${c.name}</strong><small>${c.en}</small><span class="choice-code">0${i+1}</span></button>`).join('')}</div><div class="notice">先选目的地，下一页会根据目的地确认申请类型和后续问题。</div><div class="step-actions"><span></span><button class="primary-button" id="nextStep" type="button">选择申请类型 <span class="button-arrow">→</span></button></div></div>`;
}
function stepPurpose(){
  return `<div class="step-panel"><div class="step-label">${stepLabel('purpose')}</div><p class="step-intro">不同类型对应的材料和审核重点不同，选择最接近你当前计划的一项。</p><div class="choice-grid">${typeOptions.map(o=>`<button class="choice-card ${state.type===o.id?'selected':''}" data-type="${o.id}" type="button"><span class="choice-code">${o.code}</span><strong>${o.title}</strong><small>${o.sub}</small></button>`).join('')}</div><div class="notice">如果你是学生，旅游签证通常需要重点准备在读证明、资金来源和清晰的返校安排。</div><div class="step-actions"><button class="secondary-button" id="backStep" type="button">← 返回</button><button class="primary-button" id="nextStep" type="button">进入个人背景 <span class="button-arrow">→</span></button></div></div>`;
}
function select(name,options,value,placeholder){return `<select class="select-input" data-answer="${name}"><option value="">${placeholder}</option>${options.map(o=>{const val=Array.isArray(o)?o[0]:o;const label=Array.isArray(o)?o[1]:o;return `<option value="${esc(val)}" ${value===String(val)?'selected':''}>${esc(label)}</option>`}).join('')}</select>`}
function stepProfile(){
  const a=state.answers;
  return `<div class="step-panel"><div class="step-label">${stepLabel('profile')}</div><p class="step-intro">如果你还在读书，学校、专业和预计毕业时间会帮助报告更准确地判断回国安排与材料重点。</p><div class="form-grid"><div class="field"><label>年龄</label>${select('age',[['18-20','18–20 岁'],['21-24','21–24 岁'],['25-30','25–30 岁'],['31+','31 岁以上']],a.age,'选择年龄段')}</div><div class="field"><label>目前状态</label>${select('studentStatus',[['student','在校学生'],['recent-grad','应届 / 毕业三年内'],['employed','已工作'],['freelancer','自由职业'],['other','其他']],a.studentStatus,'选择当前状态')}</div><div class="field"><label>教育阶段</label>${select('education',[['college','专科'],['bachelor','本科'],['master','硕士'],['phd','博士'],['other','其他']],a.education,'选择教育阶段')}</div><div class="field"><label>户籍省份</label>${select('province',provinces,a.province,'选择省份')}</div><div class="field"><label>学校 / 单位</label><input class="text-input" data-answer="school" value="${esc(a.school||'')}" placeholder="例如：某某大学 / 公司名称" /></div><div class="field"><label>专业 / 研究方向</label><input class="text-input" data-answer="major" value="${esc(a.major||'')}" placeholder="例如：设计、商科、护理" /></div><div class="field"><label>预计毕业 / 入职时间</label><input class="text-input" type="month" data-answer="timeline" value="${esc(a.timeline||'')}" /></div><div class="field"><label>常住地</label><input class="text-input" data-answer="residence" value="${esc(a.residence||'')}" placeholder="例如：成都 / 上海" /></div>${state.country==='japan'?`<div class="field full-width"><label>计划前往的城市</label><span class="field-note">日本旅游签证材料和领区提示可能因常住地、行程而不同。</span>${select('city',[['tokyo','东京 / 关东'],['osaka','大阪 / 关西'],['hokkaido','北海道'],['okinawa','冲绳'],['other','其他']],a.city,'选择主要目的地')}</div>`:''}</div><div class="step-actions"><button class="secondary-button" id="backStep" type="button">← 返回</button><button class="primary-button" id="nextStep" type="button">保存并继续 <span class="button-arrow">→</span></button></div></div>`;
}
function stepFunding(){
  const a=state.answers;
  return `<div class="step-panel"><div class="step-label">${stepLabel('funding')}</div><p class="step-intro">学生常见的资金材料包括父母出资、奖学金或个人存款，按真实情况选择即可。</p><div class="form-grid"><div class="field full-width"><label>这次行程主要由谁出资？</label><div class="option-row">${[['self','本人出资'],['parents','父母出资'],['shared','共同出资'],['other','其他亲属 / 机构']].map(o=>`<button type="button" class="mini-option ${a.funding===o[0]?'selected':''}" data-answer-option="funding" data-value="${o[0]}">${o[1]}</button>`).join('')}</div></div><div class="field"><label>本人年收入（人民币）</label>${select('incomeSelf',[['none','暂无固定收入'],['0-10','10 万以下'],['10-30','10–30 万'],['30+','30 万以上']],a.incomeSelf,'选择区间')}</div><div class="field"><label>家庭年收入（人民币）</label>${select('incomeFamily',[['0-15','15 万以下'],['15-30','15–30 万'],['30-60','30–60 万'],['60+','60 万以上'],['unknown','不方便透露']],a.incomeFamily,'选择区间')}</div><div class="field"><label>可用于本次行程的预算</label><div class="range-wrap"><input class="range-input" type="range" min="1" max="6" value="${a.budget||3}" data-answer-range="budget"/><span class="range-value" id="budgetValue">${['1 万以下','1–2 万','2–4 万','4–8 万','8–15 万','15 万以上'][(a.budget||3)-1]}</span></div></div><div class="field"><label>能否提供资金证明</label>${select('proof',[['ready','可以提供流水 / 存款'],['partial','部分可以'],['no','目前没有准备']],a.proof,'选择情况')}</div><div class="field full-width"><label>是否有房产、长期租约等国内约束？</label><div class="option-row">${[['yes','有'],['no','没有'],['unsure','不确定']].map(o=>`<button type="button" class="mini-option ${a.tie===o[0]?'selected':''}" data-answer-option="tie" data-value="${o[0]}">${o[1]}</button>`).join('')}</div></div></div><div class="step-actions"><button class="secondary-button" id="backStep" type="button">← 返回</button><button class="primary-button" id="nextStep" type="button">继续 <span class="button-arrow">→</span></button></div></div>`;
}
function stepTravel(){
  const a=state.answers;
  return `<div class="step-panel"><div class="step-label">${stepLabel('travel')}</div><p class="step-intro">不同目的地对停留时间、申请地点和入境次数的要求不同，先把行程框架定下来。</p><div class="form-grid"><div class="field"><label>申请地点（领区）</label>${select('applyPlace',[['mainland','中国大陆常住地'],['overseas','海外合法居住地']],a.applyPlace,'选择申请地')}</div><div class="field"><label>预计出发时间</label><input class="text-input" type="month" data-answer="departure" value="${esc(a.departure||'')}" /></div><div class="field"><label>预计停留天数</label>${select('days',[['1-7','1–7 天'],['8-15','8–15 天'],['16-30','16–30 天'],['31-90','31–90 天'],['90+','90 天以上']],a.days,'选择停留时间')}</div><div class="field"><label>入境次数偏好</label><div class="option-row">${[['single','单次入境'],['multiple','多次入境'],['unsure','不确定']].map(o=>`<button type="button" class="mini-option ${a.entry===o[0]?'selected':''}" data-answer-option="entry" data-value="${o[0]}">${o[1]}</button>`).join('')}</div></div><div class="field full-width"><label>行程重点</label>${select('tripFocus',[['tourism','观光 / 城市体验'],['visiting','探亲 / 朋友访问'],['study','短期课程 / 学术交流'],['event','比赛 / 活动 / 展会'],['other','其他']],a.tripFocus,'选择此次出行重点')}</div></div><div class="step-actions"><button class="secondary-button" id="backStep" type="button">← 返回</button><button class="primary-button" id="nextStep" type="button">继续 <span class="button-arrow">→</span></button></div></div>`;
}
function stepInterview(){
  const a=state.answers;
  return `<div class="step-panel"><div class="step-label">${stepLabel('interview')}</div><p class="step-intro">美国访客签证通常更看重旅行目的、资金来源和回国安排。把面谈时要说清楚的内容先准备好。</p><div class="form-grid"><div class="field full-width"><label>能否用一句话说明赴美目的？</label><input class="text-input" data-answer="usPurpose" value="${esc(a.usPurpose||'')}" placeholder="例如：暑假去纽约和波士顿旅行 10 天" /></div><div class="field"><label>面谈准备程度</label>${select('usInterview',[['ready','已整理材料并练习'],['some','知道大致流程'],['not-yet','还没有准备']],a.usInterview,'选择准备程度')}</div><div class="field"><label>是否有明确返校 / 返工时间</label>${select('usReturn',[['yes','有明确日期'],['draft','有大致安排'],['no','暂未确定']],a.usReturn,'选择情况')}</div></div><div class="step-actions"><button class="secondary-button" id="backStep" type="button">← 返回</button><button class="primary-button" id="nextStep" type="button">继续 <span class="button-arrow">→</span></button></div></div>`;
}
function stepWork(){
  const a=state.answers;
  const isHoliday=state.type==='working-holiday';
  return `<div class="step-panel"><div class="step-label">${stepLabel('work')}</div><p class="step-intro">${isHoliday?'打工度假项目通常有年龄、名额、语言和资金门槛。':'工作签证需要核对雇主、岗位、薪资和你的专业背景。'}</p><div class="form-grid"><div class="field"><label>语言能力</label>${select('language',[['none','暂时没有'],['basic','基础交流'],['working','可工作交流'],['fluent','熟练 / 有成绩']],a.language,'选择语言情况')}</div>${isHoliday?`<div class="field"><label>年龄与名额要求</label>${select('whReady',[['yes','已了解并准备'],['some','了解一部分'],['no','还不了解']],a.whReady,'选择了解程度')}</div>`:`<div class="field"><label>Offer 情况</label>${select('offer',[['signed','已有签署合同'],['written','有书面 Offer，待签约'],['verbal','口头意向'],['none','还未拿到']],a.offer,'选择情况')}</div>`}${isHoliday?`<div class="field full-width"><label>希望从事的工作方向</label><input class="text-input" data-answer="workPlan" value="${esc(a.workPlan||'')}" placeholder="例如：餐饮、农场、酒店、短期实习" /></div>`:`<div class="field"><label>雇主 / 机构所在地</label><input class="text-input" data-answer="employer" value="${esc(a.employer||'')}" placeholder="例如：东京 / 伦敦 / 悉尼" /></div><div class="field"><label>岗位方向</label><input class="text-input" data-answer="role" value="${esc(a.role||'')}" placeholder="例如：产品设计、护理、软件工程" /></div>`}</div><div class="step-actions"><button class="secondary-button" id="backStep" type="button">← 返回</button><button class="primary-button" id="nextStep" type="button">继续 <span class="button-arrow">→</span></button></div></div>`;
}
function stepHistory(){
  const items=[['japan-korea','日本 / 韩国'],['sea','新加坡 / 马来西亚 / 泰国'],['europe','欧洲 / 申根区'],['north-america','美国 / 加拿大'],['anz','澳大利亚 / 新西兰'],['other','其他国家 / 地区'],['none','从未出境']];
  const a=state.answers;
  return `<div class="step-panel"><div class="step-label">${stepLabel('history')}</div><div class="field"><label>过去五年去过哪些地方？可多选</label><span class="field-note">用于判断你的出境轨迹与回国记录，请按真实情况选择。</span><div class="history-options" style="margin-top:16px">${items.map(o=>`<button type="button" class="history-option ${state.history.includes(o[0])?'selected':''}" data-history="${o[0]}">${o[1]}${o[0]==='none'?'<small>包括没有任何出境记录</small>':''}</button>`).join('')}</div></div><div class="form-grid" style="margin-top:32px"><div class="field"><label>是否有过拒签或签证被取消？</label>${select('refusal',[['no','没有'],['yes','有，且已解决'],['pending','有，情况待确认'],['prefer-not','不方便透露']],a.refusal,'选择情况')}</div><div class="field"><label>是否有境外亲友？</label>${select('relatives',[['none','没有'],['yes','有，非本次同行'],['host','有，可能提供住宿 / 邀请']],a.relatives,'选择情况')}</div></div><div class="step-actions"><button class="secondary-button" id="backStep" type="button">← 返回</button><button class="primary-button" id="nextStep" type="button">继续 <span class="button-arrow">→</span></button></div></div>`;
}
function stepConfirm(){
  const c=country(),a=state.answers;
  return `<div class="step-panel"><div class="step-label">${stepLabel('confirm')}</div><div class="form-grid"><div class="field"><label>这次和谁一起出发？</label>${select('companions',[['alone','一个人'],['friends','朋友'],['family','家人'],['partner','伴侣'],['group','团队 / 旅行团']],a.companions,'选择同行人')}</div><div class="field"><label>是否有固定返程安排？</label>${select('returnPlan',[['yes','已有往返机票 / 明确计划'],['draft','有大致计划'],['no','暂未确定']],a.returnPlan,'选择情况')}</div><div class="field full-width"><label>你最希望报告回答什么？</label><div class="option-row">${[['eligibility','我现在适不适合申请'],['materials','我还缺哪些材料'],['multiple','我能否争取多次入境']].map(o=>`<button type="button" class="mini-option ${a.focus===o[0]?'selected':''}" data-answer-option="focus" data-value="${o[0]}">${o[1]}</button>`).join('')}</div></div></div><div class="notice"><strong>${c.name} · ${typeOptions.find(t=>t.id===state.type)?.title||'签证'}</strong><br />确认后会生成你的个性化报告。报告会引用公开官方页面，并显示本次资料核验日期。</div><div class="step-actions"><button class="secondary-button" id="backStep" type="button">← 返回</button><button class="primary-button" id="generateReport" type="button">生成报告 <span class="button-arrow">↗</span></button></div></div>`;
}
function scoreReport(){
  const a=state.answers; let score=48; const strengths=[],risks=[];
  if(a.education){score+=8;strengths.push(`${({college:'专科背景',bachelor:'本科背景',master:'硕士背景',phd:'博士阶段',other:'教育经历明确'})[a.education]||'有明确教育经历'}`)}
  if(a.studentStatus==='student'){score+=5;strengths.push('在读状态清晰')}else if(a.studentStatus==='recent-grad'){score+=4;strengths.push('毕业时间较近')}
  if(a.school){score+=2;strengths.push('学校 / 单位信息明确')}
  if(a.proof==='ready'){score+=11;strengths.push('资金证明准备度较好')}else if(a.proof==='no'){score-=7;risks.push('资金证明尚未准备')}
  if(a.tie==='yes'){score+=8;strengths.push('有国内约束，回国动机更清晰')}else if(a.tie==='no'){risks.push('可以补充稳定的国内约束证明')}
  if(state.history.length && !state.history.includes('none')){score+=8;strengths.push('有合规出境记录')}else{risks.push('首次出境，建议把行程和回国计划做得更完整')}
  if(a.refusal==='yes'||a.refusal==='pending'){score-=14;risks.push('既往签证记录需要如实解释')}else if(a.refusal==='no'){score+=4}
  if(a.returnPlan==='yes'){score+=5;strengths.push('返程安排明确')}else{risks.push('建议补充可解释的返程计划')}
  if(a.funding==='parents'){score+=3;strengths.push('父母出资路径清楚')} 
  if(a.entry==='multiple'){score-=4;risks.push('多次入境通常需要更强的旅行必要性与历史记录')}
  if(state.type==='working-holiday'){
    if(['18-20','21-24','25-30'].includes(a.age))score+=10;
    if(a.language==='working'||a.language==='fluent')score+=5; else risks.push('工作假期通常需要核对年龄、语言、资金和名额');
    if(a.whReady==='no')risks.push('还需要确认目的地的年龄、名额和资金要求');
  }
  if(state.type==='offer-work'){
    if(a.offer==='signed')score+=14; else if(a.offer==='none'){score-=12;risks.push('已有 Offer 类工作签证通常需要可核验的雇主文件')}
    if(a.language==='working'||a.language==='fluent')score+=5;
  }
  if(state.country==='schengen'&&a.days==='90+')risks.push('申根短期签证通常适用 180 天内最多 90 天');
  if(state.country==='japan'&&a.city)strengths.push(`行程目的地明确：${({tokyo:'东京',osaka:'大阪',hokkaido:'北海道',okinawa:'冲绳',other:'日本其他地区'})[a.city]}`);
  if(state.country==='usa'&&a.usInterview==='ready'){score+=5;strengths.push('美国面谈准备较充分')}
  if(state.country==='usa'&&a.usReturn==='no')risks.push('建议准备清晰的返校 / 返工安排');
  if(state.country==='singapore'&&a.days==='90+')risks.push('新加坡短期访问需要重新核对停留目的与许可类型');
  score=Math.max(28,Math.min(86,score));
  const level=score>=70?'准备度较好':score>=52?'建议补强后申请':'信息不足，先补齐材料';
  if(!strengths.length)strengths.push('已完成基础信息填写');
  if(!risks.length)risks.push('暂无明显硬伤，仍需逐项核对官方清单');
  const action=state.type==='tourism'?(a.studentStatus==='student'?'先整理在读证明、学校信息、资金流水、行程与住宿文件。':'先整理在读 / 工作证明、资金流水、行程与住宿文件。'):state.type==='working-holiday'?'先核对年龄、名额、语言、资金与保险要求，再确认开放时间。':'先确认雇主资质、Offer 内容、岗位与薪资是否满足目的地工作签证要求。';
  return {score,level,strengths:strengths.slice(0,4),risks:risks.slice(0,4),action};
}
function stepResult(){
  const c=country(),r=state.report||scoreReport(),t=typeOptions.find(t=>t.id===state.type)||typeOptions[0];
  return `<div class="step-panel"><div class="step-label">REPORT / ${new Date().toISOString().slice(0,10).replaceAll('-','.')}</div><div class="result-layout"><article class="result-card" id="resultCard"><div class="result-topline"><span class="result-destination">${c.flag} ${c.en} / ${t.code}</span><span class="result-date">VISAFOLD 01</span></div><div class="score-wrap"><span class="score">${r.score}</span><span class="score-denom">/ 100<br />条件匹配度</span></div><h3>${r.level}</h3><p>你提供的信息显示，这条申请路径具备一定基础。模拟结果更适合当作材料准备的起点，最终决定权属于目的地使领馆或移民部门。</p><div class="tag-row"><span class="result-tag">${c.name}</span><span class="result-tag">${t.title}</span><span class="result-tag">${state.answers.entry==='multiple'?'多次入境倾向':'单次 / 未确定'}</span></div></article><aside class="report-side"><h4>你的优势</h4><ul class="report-list">${r.strengths.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h4>建议补强</h4><ul class="report-list warn">${r.risks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><div class="notice"><strong>下一步</strong><br />${esc(r.action)}</div><div class="report-actions"><button class="outline-button" id="downloadReport" type="button">下载结果图片</button><button class="outline-button" id="copyReport" type="button">复制报告文字</button></div><div class="source-note">本次参考：<a href="${c.source}" target="_blank" rel="noreferrer">${c.sourceLabel}</a><br />页面状态：${c.sourceStatus} · 建议递交前再次打开官方页面核对。<br />更新标记：2026.11 · <a href="${c.source}" target="_blank" rel="noreferrer">查看官方页面 ↗</a></div></aside></div><div class="step-actions"><button class="secondary-button" id="backStep" type="button">← 修改答案</button><button class="primary-button" id="resetBottom" type="button">重新测评 <span class="button-arrow">↗</span></button></div></div>`;
}
function bindStep(){
  document.querySelectorAll('[data-country]').forEach(b=>b.onclick=()=>{state.country=b.dataset.country;state.type=null;state.step=1;state.report=null;persist();render()});
  document.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{state.type=b.dataset.type;state.step=1;state.report=null;persist();render()});
  document.querySelectorAll('[data-answer]').forEach(el=>el.onchange=()=>setAnswer(el.dataset.answer,el.value));
  document.querySelectorAll('[data-answer-option]').forEach(b=>b.onclick=()=>{setAnswer(b.dataset.answerOption,b.dataset.value);render()});
  document.querySelectorAll('[data-answer-range]').forEach(el=>el.oninput=()=>{setAnswer(el.dataset.answerRange,Number(el.value));const labels=['1 万以下','1–2 万','2–4 万','4–8 万','8–15 万','15 万以上'];$('#budgetValue').textContent=labels[Number(el.value)-1]});
  document.querySelectorAll('[data-history]').forEach(b=>b.onclick=()=>{const key=b.dataset.history;if(key==='none')state.history=state.history.includes('none')?[]:['none'];else{state.history=state.history.filter(x=>x!=='none');state.history=state.history.includes(key)?state.history.filter(x=>x!==key):[...state.history,key]}persist();render()});
  $('#nextStep')?.addEventListener('click',()=>{if(state.step===1&&!state.country){alert('先选一个目的地');return}if(flow()[state.step-1]==='purpose'&&!state.type){alert('再选一个申请类型');return}state.started=true;state.step=Math.min(state.step+1,flow().length);persist();render();scrollAssessment()});
  $('#generateReport')?.addEventListener('click',()=>{state.report=scoreReport();state.started=true;state.step=flow().length;persist();render();scrollAssessment()});
  $('#backStep')?.addEventListener('click',()=>{state.step=Math.max(1,state.step-1);persist();render()});
  $('#resetBottom')?.addEventListener('click',resetAll); $('#downloadReport')?.addEventListener('click',downloadReport); $('#copyReport')?.addEventListener('click',copyReport);
}
function resetAll(){if(confirm('确定重新开始吗？当前回答会被清空。')){localStorage.removeItem('visafold-state');Object.assign(state,{step:1,country:null,type:null,answers:{},history:[],report:null,started:false});render();window.scrollTo({top:0,behavior:'smooth'})}}
function reportText(){const c=country(),r=state.report||scoreReport();return `visafold 签证官模拟器\n${c.name} · ${typeOptions.find(t=>t.id===state.type)?.title||'签证'}\n条件匹配度：${r.score}/100 · ${r.level}\n\n优势：${r.strengths.join('；')}\n建议补强：${r.risks.join('；')}\n下一步：${r.action}\n\n仅供信息参考，最终以官方政策和使领馆决定为准。`}
function copyReport(){navigator.clipboard?.writeText(reportText()).then(()=>{const b=$('#copyReport');b.textContent='已复制';setTimeout(()=>b.textContent='复制报告文字',1500)}).catch(()=>alert(reportText()))}
function downloadReport(){const r=state.report||scoreReport(),c=country(),t=typeOptions.find(t=>t.id===state.type)||typeOptions[0];const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1500;const ctx=canvas.getContext('2d');ctx.fillStyle='#f5f1e8';ctx.fillRect(0,0,1200,1500);ctx.fillStyle='#171816';ctx.fillRect(70,70,1060,1360);ctx.fillStyle='#f2c400';ctx.fillRect(70,70,1060,12);ctx.fillStyle='#f2c400';ctx.font='500 22px monospace';ctx.fillText('VISAFOLD / VISA FIELD REPORT',120,150);ctx.fillStyle='#fffdf8';ctx.font='700 46px sans-serif';ctx.fillText(`${c.flag} ${c.name}`,120,245);ctx.font='400 24px sans-serif';ctx.fillStyle='#c1c3bc';ctx.fillText(t.title,120,292);ctx.fillStyle='#f2c400';ctx.font='900 190px sans-serif';ctx.fillText(String(r.score),120,520);ctx.font='400 25px monospace';ctx.fillStyle='#b8b9b2';ctx.fillText('/ 100  条件匹配度',485,510);ctx.fillStyle='#fffdf8';ctx.font='700 36px sans-serif';ctx.fillText(r.level,120,610);ctx.font='400 25px sans-serif';ctx.fillStyle='#c1c3bc';wrapText(ctx,'这是根据你填写的信息生成的模拟报告，不代表使领馆的获签概率。',120,670,900,43);ctx.fillStyle='#f2c400';ctx.font='700 25px sans-serif';ctx.fillText('你的优势',120,825);ctx.fillStyle='#fffdf8';ctx.font='400 24px sans-serif';r.strengths.forEach((s,i)=>ctx.fillText(`+ ${s}`,140,880+i*42));ctx.fillStyle='#f2c400';ctx.fillText('建议补强',120,1080);ctx.fillStyle='#fffdf8';r.risks.forEach((s,i)=>ctx.fillText(`! ${s}`,140,1135+i*42));ctx.fillStyle='#c1c3bc';ctx.font='400 18px monospace';ctx.fillText('VISAFOLD · 2026.11 · 仅供信息参考',120,1365);const a=document.createElement('a');a.download=`visafold-${c.id}-report.png`;a.href=canvas.toDataURL('image/png');a.click()}
function wrapText(ctx,text,x,y,maxWidth,lineHeight){let line='';for(const char of text){const test=line+char;if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,y);line=char;y+=lineHeight}else line=test}ctx.fillText(line,x,y)}
$('#startButton').onclick=()=>{state.started=true;persist();render();scrollAssessment()};$('#resetTop').onclick=resetAll;render();
