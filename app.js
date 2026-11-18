(() => {
  'use strict';
  const P = window.VisaPolicies;
  const E = window.VisaEngine;
  const KEY = 'visafold-state-v2';
  const blank = () => ({ version: P.version, step: 'destination', started: false, answers: {}, prepared: {}, report: null });
  let state = blank();
  let storageAvailable = true;
  let restoreNotice = '';
  try {
    const old = localStorage.getItem('visafold-state');
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if ([2, P.version].includes(saved?.version) && saved.answers && typeof saved.answers === 'object' && !Array.isArray(saved.answers)) {
      const answers = Object.fromEntries(Object.entries(saved.answers).filter(([key,value]) => key === 'history' ? Array.isArray(value) && value.every(v => typeof v === 'string') : typeof value === 'string'));
      const prepared = saved.version === P.version && saved.prepared && typeof saved.prepared === 'object' && !Array.isArray(saved.prepared) ? Object.fromEntries(Object.entries(saved.prepared).filter(([,value]) => typeof value === 'string' && (['ready','missing','partial','unknown'].includes(value) || /^ready:[a-zA-Z0-9_-]+$/.test(value)))) : {};
      state = { ...blank(), step: typeof saved.step === 'string' ? saved.step : 'destination', started: Boolean(saved.started), answers, prepared };
      if (!P.countries.some(c => c.id === state.answers.country)) state = blank();
    } else if (old) restoreNotice = '欢迎回来，重新选择你的情况，获取最新的准备清单。';
    localStorage.removeItem('visafold-state');
  } catch (_) { storageAvailable = false; }
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[char]);
  const pair = (value, label) => [value, label];
  const yesNo = [['yes','是'],['no','否'],['unknown','不确定']];
  const q = (id, label, options, help = '', multi = false) => ({ id, label, options, help, multi });
  const currentCountry = () => P.countries.find(c => c.id === state.answers.country);
  const selectedName = () => state.answers.country === 'schengen' ? P.schengen.find(c => c.id === state.answers.schengenCountry)?.name || '申根区' : currentCountry()?.name;
  const typeName = () => P.types.find(t => t.id === state.answers.type)?.title || '';
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ ...state, report: null })); }
    catch (_) { storageAvailable = false; }
  }
  const sgVisit = () => state.answers.country === 'singapore' && state.answers.type === 'tourism';
  const steps = () => ['destination','purpose','profile', ...(!sgVisit()?['location']:[]), 'travel', ...(!sgVisit()?['funding']:[]), 'history', ...(state.answers.type !== 'tourism' ? ['work'] : []), 'materials','result'];
  function optionsMonths() {
    const now = new Date();
    return [...Array.from({ length: 13 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return [`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`, `${date.getFullYear()}年${date.getMonth()+1}月`];
    }), ['unknown','尚未确定']];
  }
  function questions(step) {
    const a = state.answers;
    const local = ['japan','korea'].includes(a.country);
    const residenceNeeded = a.applyAt === 'overseas' || a.applyAt === 'other' || a.residence === 'overseas' || local && a.applyAt === 'residence' && a.province !== a.residence;
    switch (step) {
      case 'destination': return [q('country','想去哪里？',P.countries.map(c => [c.id,c.name])), ...(a.country === 'schengen' ? [q('schengenCountry','选择具体申根目的地',P.schengen.map(c => [c.id,c.name]),'多国旅行请选择主要目的地。')] : [])];
      case 'purpose': return [q('type','选择最接近的申请计划',P.types.map(t => [t.id,t.title]),'选择与你这次出行最相符的计划。')];
      case 'profile': return [
        q('passportType','护照类型',[['ordinary','中国大陆普通护照'],['other','其他护照／旅行证件']], '适用于中国大陆普通护照持有人。'),
        q('passport','是否已有有效护照？',[['yes','已有，信息与有效期已检查'],['no','尚未办理／需要更新'],['unknown','有护照，但还没核对有效期']]),
        q('age','年龄段',[['18-22','18–22 岁'],['22-29','22–29 岁'],['30+','30 岁及以上']],'按周岁选择，已满22岁请选择第二档。'),
        ...(!sgVisit() ? [q('studentStatus','目前状态',[['student','在校学生'],['recent-grad','毕业三年以内'],['employed','毕业已工作'],['other','其他情况']]),
        q('education','教育阶段',[['college','专科'],['bachelor','本科'],['master','硕士研究生'],['phd','博士研究生'],['other','其他']])] : []),
        ...(a.country === 'singapore' && a.type === 'working-holiday' ? [q('studyRegion','当前／最近就读院校所在地',[['mainland','中国大陆'],['eligible','澳／法／德／港／日／荷／新西兰／瑞士／英／美'],['other','其他国家或地区'],['unknown','暂不确定']],a.country === 'singapore' && a.type === 'working-holiday' ? '该项目对院校所在地有要求，请按实际就读情况选择。' : '')] : []),
        ...(!sgVisit() && a.studentStatus === 'student' ? [q('graduation','预计什么时候毕业？',[['later','距毕业一年以上'],['soon','一年内毕业'],['unknown','尚未确定']])] : []),
        ...(a.country==='japan' && a.type==='tourism' && ['student','recent-grad'].includes(a.studentStatus) && ['bachelor','master','phd'].includes(a.education) ? [q('jpStudent','是否属于日本旅游签学生简化范围？',[
          ['yes','已确认：符合条件的中国高校全日制本科及以上在读／毕业三年内'],['no','不是／不符合'],['unknown','尚未确认学校或学习形式是否适用'],
        ],'可通过日本使馆学生简化说明及指定受理旅行社确认。单次个人旅游适用时，可免交经济能力证明。')] : []),
      ];
      case 'location': return [
        ...(local ? [q('province','户籍省份',P.provinces.map(p => [p,p]))] : []),
        q('residence','实际就读／常住地',[...P.provinces.map(p => [p,p]),['overseas','中国大陆以外的合法居住地']]),
        q('applyAt','计划在哪里递交申请？',[['residence','实际常住／就读地'],...(local?[['hukou','户籍所在地']]:[]),['other','大陆其他地点'],['overseas','境外申请地'],['unknown','还不知道在哪申请']]),
        ...(residenceNeeded ? [q('residenceProof','常住／就读依据准备情况',[['ready','有在读住宿／居住证／合法居留等依据'],['partial','有部分材料，尚未确认能否受理'],['no','尚未准备'],['unknown','不知道需要什么']],'可参考在读及住宿证明、居住证或境外居留许可。')] : []),
        ...(local && residenceNeeded ? [q('residenceDuration','在实际常住地的居住时间',[['short','不足3个月'],['medium','3–6个月'],['long','超过6个月'],['unknown','不确定／即将迁入']])] : []),
        ...(a.type === 'tourism' && ['japan','korea'].includes(a.country) ? [q('regionalPolicy','是否已确认可享户籍相关的申请便利？',[
          ['confirmed','受理方已确认：我的户籍适用本次简化／多次入境条件'],
          ['no','已咨询，本次不适用'],['unknown','还没咨询／不清楚'],
        ],'可向对应使领馆或其指定受理机构确认。尚未确认时选“不清楚”即可。')] : []),
        ...(a.country==='korea' && a.type==='tourism' ? [q('krConsulate','计划递交的韩国领区',[
          ['chengdu','成都领区（四川／重庆／云南／贵州）'],['other','其他领区'],['unknown','还没确定'],
        ],'不同领区的简化材料可能不同；请选择已确认可受理你的领区。')] : []),
        ...(a.country==='korea' && a.krConsulate==='chengdu' && a.province==='广东' ? [q('krHukouCity','户籍所在城市',[
          ['guangzhou','广州'],['shenzhen','深圳'],['other','广东其他城市'],['unknown','暂不确定'],
        ])] : []),
        ...(a.country==='korea' && a.krConsulate==='chengdu' && (['北京','上海'].includes(a.province) || a.province==='广东' && ['guangzhou','shenzhen'].includes(a.krHukouCity)) ? [q('krHukouType','你的户口是否为集体户口？',[
          ['ordinary','非集体户口'],['collective','集体户口'],['unknown','还不清楚'],
        ],'用于核对本领区指定城市户籍的经济材料免交路径。')] : []),
      ];
      case 'travel': return [
        ...(a.type === 'tourism' ? [q('tripPurpose','这次实际要做什么？',[['tourism','观光旅游'],['visiting','探亲／访友'],['course','短期课程／交流／活动'],['employment','受雇工作／打工度假'],['unknown','尚未确定']],'工作、实习等活动可能需要单独的许可。')] : []),
        q('departure','预计出发月份',optionsMonths(),''),
        q('days','预计停留多久？',[['1-7','1–7天'],['8-15','8–15天'],['16-30','16–30天'],['31-90','31–90天'],['91-180','91–180天'],['180+','超过180天']]),
        ...(!sgVisit() && a.type === 'tourism' ? [q('entry','希望入境几次？',[['single','单次'],['multiple','多次'],['unknown','不确定']],'入境次数及有效期以最终签发结果为准。')] : []),
        ...(a.country === 'schengen' && a.type === 'tourism' ? [
          q('mainDestination','所选国家是否为主要目的地？',[['single','只去所选国家'],['longest','多国旅游，所选国停留最久'],['equal','各国等长，所选国是首入国'],['unknown','尚未排好／主要目的可能不同']],''),
          q('schengenPrior','计入本次后，滚动180天内累计停留情况',[['within','已核对，不超过90天'],['over','已核对，会超过90天'],['unknown','还不会算／没有核对']],'短期停留天数按滚动180天累计计算。'),
        ] : []),
        ...(a.type === 'tourism' ? [q('returnPlan','离境／返校计划',[['clear','已有真实、明确安排'],['draft','有大致安排'],['none','还没计划'],['unknown','不确定']])] : []),
        ...(sgVisit() ? [q('availableFunds','旅行费用能否覆盖？',[['enough','可以覆盖'],['short','目前不足'],['unknown','还未核算']])] : []),
      ];
      case 'funding': return [
        ...(!E.japanStudentRoute(a) ? [
        q('funding','主要由谁承担费用？',[['parents','父母'],['self','本人'],['shared','本人和父母共同'],['scholarship','奖学金／学校或机构资助'],['other','其他亲属／资助人']],''),
        ...(a.funding === 'self' ? [q('incomeSelf','本人年收入',[['none','没有固定收入'],['under10','10万元以下'],['10-30','10–30万元'],['30+','30万元以上'],['unknown','不确定／不方便透露']])] : []),
        ...(['parents','shared'].includes(a.funding) ? [q('incomeFamily','家庭年收入',[['under15','15万元以下'],['15-30','15–30万元'],['30-60','30–60万元'],['60+','60万元以上'],['unknown','不确定／不方便透露']])] : []),
        ] : []),
        q('budget','本次总预算（人民币）',[['low','1万元以下'],['medium','1–2万元'],['high','2–4万元'],['higher','4万元以上'],['unknown','尚未估算']]),
        q('availableFunds','交通、住宿、生活与应急费用能否覆盖？',[['enough','已核算，可用资金能覆盖'],['short','已核算，目前不足'],['unknown','还未核算／不确定']],'请结合本次行程估算实际可用资金。'),
      ];
      case 'history': return [
        ...(!sgVisit() ? [q('history','过去五年去过哪些地区？可多选',[['japan','日本'],['korea','韩国'],['sea','新加坡／马来西亚／泰国等东南亚'],['usa','美国／加拿大'],['uk','英国'],['schengen','申根区'],['anz','澳大利亚／新西兰'],['other','其他地区'],['none','从未出境']], '',true)] : []),
        q('refusal','是否曾被拒签、取消签证或拒绝入境？',[['no','没有'],['yes','有'],['unknown','不确定／不方便透露']]),
        q('overstay','是否有逾期停留或违反许可条件的记录？',[['no','没有'],['yes','有'],['unknown','不确定／不方便透露']]),
        q('relatives','目的地是否有亲友？',[['none','没有'],['yes','有，但不提供住宿或资助'],['host','有，会邀请、提供住宿或资助'],['unknown','不方便透露']]),
      ];
      case 'work': {
        if (a.type === 'offer-work') return [
          q('offer','聘用文件目前是什么状态？',[['signed','已签署正式合同'],['written','书面Offer，待签约'],['verbal','仅口头意向'],['none','还未取得']]),
          q('workCategory','雇主确定了哪种工作签证？',[
            ...(P.workRoutes[a.country] ? [[P.workRoutes[a.country].id,P.workRoutes[a.country].label],['known','已确定，是另一类别']] : [['known','雇主已确定具体类别']]),
            ['unknown','还未确定'],
          ]),
          q('sponsor','雇主资格／担保是否已按该类别核对？',yesNo),
          q('salaryCheck','岗位、薪资与工时是否符合该类别要求？',yesNo),
          q('qualification','是否已核对个人和岗位资格？',[['ready','已按类别核对'],['partial','只确认了部分'],['unknown','还不知道要求']],'例如岗位技能、语言水平和职业注册。下一步按签证类别准备证明文件。'),
        ];
        if (!E.holidaySupported(a)) return [q('pathAcknowledged','已了解本路径限制',[['yes','已了解，查看限制与后续建议']],'你可以返回选择其他出行计划。')];
        const items = [];
        if (a.country === 'singapore' && a.age === '22-29') items.push(q('sgAge','提交申请时的确切年龄范围',[['22-25','22–25周岁'],['26-29','26–29周岁'],['unknown','尚未确定']],'该项目年龄上限为25周岁。'));
        if (a.country === 'singapore') items.push(q('schoolResidence','符合认可大学、全日制就读及居住要求吗？',yesNo,'在读生通常需已在指定地区全日制就读并居住至少3个月；毕业生也须有当地全日制就读与居住经历。'));
        if (a.country === 'new-zealand' && a.age === '30+') items.push(q('nzAge','提交申请时的确切年龄',[['30','30周岁'],['31+','31周岁及以上'],['unknown','尚未确定']],'该项目包含30周岁，但不包含31周岁。'));
        if (a.country === 'new-zealand') items.push(
          q('previousWh','是否曾获签新西兰打工度假？',yesNo,'即使没有使用，既往获签也可能导致不能再次申请。'),
          q('highSchool','能否提供符合要求的高中学历及认证？',yesNo),
          q('whFunds','是否具备至少NZD4,200生活资金？',yesNo,'还需核对离境费用和其他要求；不能用家庭年收入替代可用资金。'),
        );
        if (a.country === 'new-zealand') items.push(q('languageEvidence','是否已具备项目认可的语言证据？',[['yes','已核对，具备认可证据'],['no','尚未取得'],['unknown','还不知道具体要求']],'请选择该项目认可的语言考试或其他证明。'));
        if (a.country === 'new-zealand') items.push(q('insurance','是否准备覆盖项目要求的医疗保险？',yesNo));
        if (a.country !== 'singapore') items.push(q('whSlot','当前名额、开放时间／抽签是否已确认？',[['yes','已在官方渠道确认适用'],['no','尚未确认／尚无名额'],['unknown','不确定']],'请在项目官方页面查看最新名额和开放时间。'));
        return items;
      }
      case 'materials': return E.materialPlan(a).filter(item => !item.answerKey).map(item => ({ ...q(`doc:${item.id}`,item.title,[
        ...(item.mode === 'any' ? item.requirements.map((r,i) => [`ready:${r.id}`,`第 ${i+1} 条路径已完整准备`]) : [['ready',item.mode === 'all'?'本组各项均已准备':item.mode === 'confirm'?'已确认并取得本次清单':'已准备适用的支持材料']]),
        ['partial','准备了一部分'],['missing','尚未准备'],['unknown','暂不清楚，先看报告'],
      ],item.detail), material:item }));
      default: return [];
    }
  }
  const titles = { destination:'先选你的目的地', purpose:'这次，为什么出发', profile:'你的学习与个人背景', location:'找到合适的递交路径', travel:'把行程框架定下来', funding:'梳理真实的资金支持', history:'如实确认既往记录', work:'核对项目与工作条件', materials:'你的专属材料准备表', result:'你的签证测评报告' };
  const hints = { destination:'选择目的地，开启你的出发准备。', purpose:'旅游、打工度假，还是去赴任？', profile:'选择与你目前情况最相符的选项。', location:'选择户籍和常住地，了解在哪里递交申请。', travel:'告诉我们你打算何时出发、停留多久。', funding:'了解本次行程的预算和费用来源。', history:'按实际经历选择，不确定的可以稍后确认。', work:'看看你的工作计划还需要哪些条件。', materials:'只显示与你相关的准备事项。任选路径只需备齐其中一条；暂不清楚的可以直接查看报告。', result:'你的申请条件、准备进度和下一步安排，都在这里。' };
  function valueOf(question) { return question.id.startsWith('doc:') ? state.prepared[question.id.slice(4)] || 'unknown' : state.answers[question.id]; }
  function completed(question) {
    const value = valueOf(question);
    if (question.multi) return Array.isArray(value) && value.length > 0 && value.every(v => question.options.some(o => o[0] === v));
    return question.options.some(o => o[0] === value);
  }
  function fieldHTML(question) {
    const value = valueOf(question);
    const id = `field-${question.id.replace(':','-')}`;
    const helpId = `${id}-help`;
    const errorId = `${id}-error`;
    const help = question.help ? `<p class="field-note" id="${helpId}">${esc(question.help)}</p>` : '';
    if (question.multi) return `<fieldset class="field full-width" id="${id}" tabindex="-1"><legend>${esc(question.label)}</legend>${help}<div class="history-options">${question.options.map(([v,label]) => `<button type="button" class="history-option ${value?.includes(v)?'selected':''}" data-multi="${question.id}" data-value="${v}" aria-pressed="${value?.includes(v)?'true':'false'}">${esc(label)}</button>`).join('')}</div><p class="field-error" id="${errorId}"></p></fieldset>`;
    return `<div class="field ${question.material?'material-field':''}" id="${id}-wrap"><label for="${id}">${esc(question.label)}</label>${question.material ? `<span class="material-kind mode-${question.material.mode}">${esc(question.material.kind)}</span>` : ''}${help}${question.material ? `<${question.material.mode==='any'?'ol':'ul'} class="material-requirements">${question.material.requirements.map(r=>`<li>${esc(r.label)}</li>`).join('')}</${question.material.mode==='any'?'ol':'ul'}><div class="inline-sources">${referenceLinks(question.material.refs)}</div>` : ''}<select class="select-input" id="${id}" data-question="${question.id}" required aria-describedby="${question.help?`${helpId} `:''}${errorId}"><option value="">请选择</option>${question.options.map(([v,label]) => `<option value="${esc(v)}" ${v === value?'selected':''}>${esc(label)}</option>`).join('')}</select><p class="field-error" id="${errorId}"></p></div>`;
  }
  function referenceLinks(ids) {
    return [...new Set(ids)].filter(id => P.sources[id]).map(id => `<a href="${esc(P.sources[id].url)}" target="_blank" rel="noopener noreferrer">${esc(P.sources[id].label)} ↗</a>`).join(' · ');
  }
  function gateHTML() {
    if (state.step === 'purpose') {
      if (!state.answers.type) return '';
      const a = state.answers;
      if (a.type === 'working-holiday') return `<div class="notice"><strong>${E.holidaySupported(a)?'先核对项目条件':'该项目暂不支持测评'}</strong><br />${a.country === 'uk' ? '英国YMS目前不适用于中国大陆普通护照。' : E.holidaySupported(a) ? '申请前请确认年龄、学历、资金和名额条件。' : '该目的地的打工度假暂不支持测评，请通过官方页面了解适用项目。'}<div class="inline-sources">${referenceLinks([P.holidaySources[a.country]])}</div></div>`;
      if (a.type === 'offer-work') return '<div class="notice">请准备好聘用文件，并与雇主确认签证类别、担保、岗位和薪资要求。</div>';
      if (a.country === 'singapore') return `<div class="notice">持中国大陆普通护照，符合条件的30天以内短期旅游可免签。<div class="inline-sources">${referenceLinks(['sg'])}</div></div>`;
    }
    if (state.step === 'work') {
      const result = E.eligibility(state.answers);
      return `<div class="notice"><strong>${esc(result.title)}</strong><ul>${result.reasons.map(text => `<li>${esc(text)}</li>`).join('')}</ul><div class="inline-sources">${referenceLinks(result.refs)}</div></div>`;
    }
    return '';
  }
  function render() {
    if (!steps().includes(state.step)) state.step = 'destination';
    const list = steps();
    const index = list.indexOf(state.step);
    const isResult = state.step === 'result';
    document.body.classList.toggle('assessment-mode',Boolean(state.started));
    $('#stepTitle').textContent = titles[state.step];
    $('#stepEyebrow').textContent = isResult ? 'FIELD REPORT' : `${String(index+1).padStart(2,'0')} / ${list.length-1}`;
    $('#progressFill').style.width = `${isResult?100:Math.round((index+1)/(list.length-1)*100)}%`;
    $('#progressTrack').setAttribute('aria-valuenow', String(isResult?100:Math.round((index+1)/(list.length-1)*100)));
    $('#storageNote').textContent = storageAvailable ? '进度自动保存' : '当前浏览器无法保存进度，请在本次完成测评';
    if (isResult) {
      state.report = E.buildReport(state.answers,state.prepared);
      $('#stepContainer').innerHTML = reportHTML(state.report);
    } else {
      const qs = questions(state.step);
      let fields;
      if (state.step === 'destination') fields = `<div class="country-grid choice-grid">${P.countries.map((c,i) => `<button type="button" class="choice-card ${state.answers.country===c.id?'selected':''}" data-country="${c.id}" aria-pressed="${state.answers.country===c.id}"><span class="country-flag">${c.flag}</span><strong>${c.name}</strong><small>${c.en}</small><span class="choice-code">0${i+1}</span></button>`).join('')}</div><p class="field-error" id="field-country-error"></p>${qs.slice(1).map(fieldHTML).join('')}`;
      else if (state.step === 'purpose') fields = `<div class="choice-grid">${P.types.map(t => {
        const unavailable = t.id === 'working-holiday' && !E.holidaySupported(state.answers);
        return `<button type="button" class="choice-card ${state.answers.type===t.id?'selected':''}" data-type="${t.id}" aria-pressed="${state.answers.type===t.id}" ${unavailable?'disabled':''}><span class="choice-code">${t.en}</span><strong>${t.title}</strong><small>${unavailable?(state.answers.country==='uk'?'目前不适用中国大陆普通护照':'暂不支持测评'):t.description}</small></button>`;
      }).join('')}</div>${!E.holidaySupported(state.answers)?`<div class="notice">${state.answers.country==='uk'?'英国YMS目前不适用于中国大陆普通护照。':'该目的地的打工度假暂不支持测评，项目资格可在官方页面查询。'}<div class="inline-sources">${referenceLinks([P.holidaySources[state.answers.country]])}</div></div>`:''}<p class="field-error" id="field-type-error"></p>`;
      else fields = `${state.step === 'materials' ? '<div class="material-shortcuts"><button class="outline-button" data-action="all-unknown">这些我都还不清楚</button><button class="outline-button" data-action="all-missing">目前都尚未准备</button></div>' : ''}<div class="form-grid">${qs.map(fieldHTML).join('')}</div>`;
      $('#stepContainer').innerHTML = `<section class="step-panel"><p class="step-intro">${hints[state.step]}</p>${restoreNotice?`<div class="notice">${esc(restoreNotice)}</div>`:''}<div class="validation-summary" id="validationSummary" role="alert" tabindex="-1" hidden></div>${fields}<div id="gateContainer">${gateHTML()}</div><div class="step-actions"><button class="secondary-button" data-action="back" ${index===0?'hidden':''}>← 返回上一步</button><button type="button" class="primary-button" data-action="next">${state.step==='materials'?'生成我的准备报告':'保存并继续'} <span class="button-arrow">→</span></button></div></section>`;
    }
    bindEvents();
  }
  function listHTML(items, className = '') { return `<ul class="report-list ${className}">${items.map(text => `<li>${esc(text)}</li>`).join('')}</ul>`; }
  function reportHTML(r) {
    const statusLabel = { ready:'已准备', partial:'部分准备', missing:'待准备', unknown:'待了解' };
    return `<section class="step-panel"><div class="report-date">报告生成：${esc(new Date(r.generatedAt).toLocaleDateString('zh-CN'))}</div>
      <div class="result-layout"><article class="result-card"><div class="result-topline"><span class="result-destination">${esc(selectedName())}</span><span class="result-date">FIELD REPORT / 03</span></div><div class="status-word">${r.assessment.value === null?'出行建议':'签证参考评分'}</div>${r.assessment.value === null?'':`<div class="score-wrap"><span class="score">${r.assessment.value}</span><span class="score-denom">/ 100</span></div>`}<h3 class="assessment-level">${esc(r.assessment.label)}</h3><p class="score-caption">${esc(r.assessment.note)}</p><div class="eligibility-summary"><span class="status-word ${r.eligibility.code}">资格初筛</span><h4>${esc(r.eligibility.title)}</h4>${listHTML(r.eligibility.reasons)}</div><div class="tag-row"><span class="result-tag">${esc(typeName())}</span><span class="result-tag">专属测评报告</span></div><div class="readiness"><strong>${r.ready}<small> / ${r.total} 组</small></strong><span>材料准备进度（含支持材料及待确认事项）</span><progress value="${r.ready}" max="${r.total}" aria-label="材料准备进度"></progress></div></article>
      <aside class="report-side">${r.assessment.value === null?'':`<h4>你的评分明细</h4><p class="field-note">基础分 ${r.assessment.base}，结合以下情况综合评估。</p><ul class="score-factors">${r.assessment.factors.map(f => `<li><div><strong>${esc(f.label)}</strong>${f.detail?`<p>${esc(f.detail)}</p>`:''}${f.refs.length?`<div class="inline-sources">${referenceLinks(f.refs)}</div>`:''}</div><span class="score-points ${f.points<0?'negative':''}">${f.points>0?'+':''}${f.points}</span></li>`).join('')}</ul>`}<h4>接下来先做什么</h4><ol class="action-list">${r.actions.map(text => `<li>${esc(text)}</li>`).join('')}</ol><div class="report-actions"><button class="outline-button" data-action="download">下载完整报告图片</button><button class="outline-button" data-action="copy">复制报告文字</button></div><p class="field-note" id="exportStatus" role="status"></p></aside></div>
      <section class="report-section"><p class="eyebrow">01 / WHERE TO APPLY</p><h3>${esc(r.region.title)}</h3>${listHTML(r.region.details)}<div class="inline-sources">${referenceLinks(r.region.refs)}</div></section>
      <section class="report-section"><p class="eyebrow">02 / YOUR PREPARATION NOTES</p><h3>针对你的情况</h3><div class="note-grid">${r.notes.length?r.notes.map(note => `<article class="report-note ${note.priority}"><span>${esc(note.basis)}</span><p>${esc(note.text)}</p><div class="inline-sources">${referenceLinks(note.refs)}</div></article>`).join(''):'<p>暂无额外提示，请继续核对材料和官方条件。</p>'}</div></section>
      <section class="report-section"><p class="eyebrow">03 / MATERIALS CHECKLIST</p><h3>你的材料清单</h3><p class="step-intro">根据你的选择整理。具体材料以受理机构的最新清单为准。</p><div class="material-report">${r.materials.map(item => `<article><span class="material-status ${item.status}">${statusLabel[item.status]}</span><div><h4>${esc(item.title)}</h4><p>${esc(item.detail)}</p><span class="material-kind mode-${item.mode}">${esc(item.kind)}</span><ul class="material-requirements">${item.requirements.map(req=>`<li>${esc(req.label)}</li>`).join('')}</ul>${item.chosen?`<p class="chosen-path">已选路径：${esc(item.chosen)}</p>`:''}${item.answerKey?'<p class="field-note">已沿用前面的回答，可通过“修改回答”更新。</p>':''}<div class="inline-sources">${referenceLinks(item.refs)}</div></div></article>`).join('')}</div><button class="outline-button" data-action="edit-materials">更新材料状态</button></section>
      <section class="report-section"><p class="eyebrow">04 / OFFICIAL REFERENCES</p><h3>政策与官方链接</h3><p class="step-intro">递交前可在以下官方网站确认最新申请要求。</p>${r.sources.map(s => `<article class="source-item"><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a><span>${s.reviewedAt?`查阅日期：${s.reviewedAt}`:'申请细则待确认'}</span><p>${esc(s.scope)}</p></article>`).join('')}</section>
      <div class="notice">测评根据你的选择生成。签证及入境决定以官方审核为准。</div><div class="step-actions"><button class="secondary-button" data-action="edit">← 修改回答</button><button class="primary-button" data-action="reset">开始新的测评 <span class="button-arrow">↗</span></button></div></section>`;
  }
  function update(id,value) {
    const previous = state.answers[id];
    state.report = null;
    if (id.startsWith('doc:')) state.prepared[id.slice(4)] = value;
    else state.answers[id] = value;
    if (id === 'country' || id === 'type') {
      // Dependent answers must never leak from a previous destination/type.
      const country = state.answers.country;
      const schengenCountry = state.answers.schengenCountry;
      const type = id === 'type' ? value : null;
      state.answers = { country, ...(id === 'type' && schengenCountry ? { schengenCountry } : {}), ...(type ? { type } : {}) };
      state.prepared = {};
    }
    if (id === 'funding' && previous !== value) { delete state.answers.incomeSelf; delete state.answers.incomeFamily; }
    if (id === 'studentStatus' && previous !== value) { delete state.answers.graduation; delete state.answers.jpStudent; }
    if (id === 'education' && previous !== value) delete state.answers.jpStudent;
    if (id === 'workCategory' && previous && previous !== value) {
      for (const key of ['sponsor','salaryCheck','qualification']) delete state.answers[key];
    }
    if (['province','residence','applyAt'].includes(id) && previous && previous !== value) delete state.answers.krConsulate;
    if (['province','krConsulate'].includes(id) && previous !== value) { delete state.answers.krHukouCity; delete state.answers.krHukouType; }
    if (id === 'krHukouCity' && previous !== value) delete state.answers.krHukouType;
    if (!id.startsWith('doc:') && previous !== value) state.prepared = {};
    if (id === 'age') { delete state.answers.sgAge; delete state.answers.nzAge; }
    if (['province','residence','applyAt','entry'].includes(id) && previous && previous !== value) delete state.answers.regionalPolicy;
    persist();
  }
  function validate() {
    const missing = questions(state.step).filter(question => !completed(question));
    const summary = $('#validationSummary');
    if (!missing.length) return true;
    summary.hidden = false;
    summary.textContent = `还需选择${missing.length}项：${missing.map(q => q.label).join('、')}。不确定时可以选择相应选项。`;
    for (const question of missing) {
      const id = `field-${question.id.replace(':','-')}`;
      const input = document.getElementById(id);
      input?.setAttribute('aria-invalid','true');
      const error = document.getElementById(`${id}-error`);
      if (error) error.textContent = '请选择一项后继续。';
    }
    summary.focus();
    return false;
  }
  function navigate(next) {
    state.step = next; state.started = true; restoreNotice = ''; persist(); render();
    $('#stepTitle').focus({ preventScroll: true });
    $('#assessment').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function bindEvents() {
    document.querySelectorAll('[data-country]').forEach(button => button.addEventListener('click',() => { if (state.answers.country !== button.dataset.country) update('country',button.dataset.country); render(); }));
    document.querySelectorAll('[data-type]').forEach(button => button.addEventListener('click',() => { if (state.answers.type !== button.dataset.type) update('type',button.dataset.type); render(); }));
    document.querySelectorAll('[data-question]').forEach(input => input.addEventListener('change',() => {
      update(input.dataset.question,input.value); input.removeAttribute('aria-invalid');
      const error = document.getElementById(`${input.id}-error`); if (error) error.textContent = '';
      if (['country','studentStatus','education','funding','workCategory'].includes(input.dataset.question) || state.step === 'location' && ['province','residence','applyAt','krConsulate','krHukouCity'].includes(input.dataset.question)) render();
      else if (state.step === 'work') $('#gateContainer').innerHTML = gateHTML();
    }));
    document.querySelectorAll('[data-multi]').forEach(button => button.addEventListener('click',() => {
      const key = button.dataset.multi; const value = button.dataset.value; let selected = state.answers[key] || [];
      if (value === 'none') selected = selected.includes('none') ? [] : ['none'];
      else selected = selected.filter(v => v !== 'none').includes(value) ? selected.filter(v => v !== 'none' && v !== value) : [...selected.filter(v => v !== 'none'),value];
      update(key,selected); render();
    }));
    document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click',() => {
      const action = button.dataset.action;
      if (action === 'next') {
        if (!validate()) return;
        // Validate all active steps again before producing a report (also covers changed conditional questions).
        if (state.step === 'materials') {
          for (const step of steps().filter(s => s !== 'result')) {
            if (questions(step).some(question => !completed(question))) { navigate(step); validate(); return; }
          }
        }
        navigate(steps()[steps().indexOf(state.step)+1]);
      } else if (action === 'back') navigate(steps()[Math.max(0,steps().indexOf(state.step)-1)]);
      else if (action === 'edit') { state.report = null; navigate('profile'); }
      else if (action === 'edit-materials') { state.report = null; navigate('materials'); }
      else if (action === 'all-unknown' || action === 'all-missing') {
        E.materialPlan(state.answers).forEach(item => { state.prepared[item.id] = action === 'all-unknown' ? 'unknown' : 'missing'; });
        persist(); render();
      }
      else if (action === 'reset') reset();
      else if (action === 'copy') copyReport();
      else if (action === 'download') downloadReport(button);
    }));
  }
  function reset() {
    if (!confirm('重新开始会清空当前浏览器里的回答和材料状态，继续吗？')) return;
    state = blank(); persist(); render(); window.scrollTo({ top:0, behavior:'smooth' });
  }
  function textReport() {
    const r = state.report || E.buildReport(state.answers,state.prepared);
    return [
      'visafold · 签证官模拟器', `${selectedName()} / ${typeName()}`, `报告生成：${new Date(r.generatedAt).toLocaleDateString('zh-CN')}`,
      '', r.assessment.value === null ? r.assessment.label : `签证参考评分：${r.assessment.value}/100 · ${r.assessment.label}`, r.assessment.note,
      ...(r.assessment.value === null ? [] : ['', `评分明细（基础分 ${r.assessment.base}）`, ...r.assessment.factors.map(f => `• ${f.label} ${f.points>0?'+':''}${f.points}${f.detail?`：${f.detail}`:''}`)]),
      '', `资格初筛：${r.eligibility.title}`, ...r.eligibility.reasons.map(t => `• ${t}`),
      '', `材料准备进度：${r.ready}/${r.total}组（根据你的选择，含支持材料及待确认事项）`,
      '', '递交路径', r.region.title, ...r.region.details.map(t => `• ${t}`),
      '', '针对你的情况', ...r.notes.map(n => `• ${n.text} [${n.basis}]`),
      '', '材料清单', ...r.materials.flatMap(m => [`${{ready:'[已准备]',partial:'[部分准备]',missing:'[待准备]',unknown:'[待了解]'}[m.status]} ${m.title}`,m.kind,m.detail,...m.requirements.map(req=>`  • ${req.label}`),...(m.chosen?[`已选路径：${m.chosen}`]:[])]),
      '', '下一步', ...r.actions.map((t,i) => `${i+1}. ${t}`),
      '', '政策与官方链接', ...r.sources.flatMap(s => [s.label,s.url,`${s.reviewedAt?`查阅 ${s.reviewedAt}`:'申请细则待确认'} · ${s.scope}`]),
      '', '仅供申请准备参考，不代表获签概率，不保证签证或入境；请按递交时官方规则核对。',
    ].join('\n');
  }
  async function copyReport() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(textReport());
      $('#exportStatus').textContent = '报告文字已复制。';
    } catch (_) {
      // Provide selectable text without asking the user to fill in a field.
      const dialog = document.createElement('dialog'); dialog.className = 'copy-dialog';
      const close = document.createElement('button'); close.className = 'outline-button'; close.textContent = '关闭'; close.onclick = () => dialog.remove();
      const paragraph = document.createElement('p'); paragraph.textContent = '浏览器未允许自动复制，请选择下方文字复制。';
      const pre = document.createElement('pre'); pre.textContent = textReport();
      dialog.append(paragraph,pre,close); document.body.append(dialog); dialog.showModal();
    }
  }
  function layoutText(ctx,text,width,font,lineHeight,color,space=0) {
    ctx.font = font;
    const rows = [];
    for (const paragraph of text.split('\n')) {
      let line = '';
      for (const char of paragraph) {
        if (ctx.measureText(line+char).width > width && line) { rows.push(line); line = char; }
        else line += char;
      }
      rows.push(line);
    }
    return { rows, font, lineHeight, color, space };
  }
  async function downloadReport(button) {
    button.disabled = true;
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const r = state.report || E.buildReport(state.answers,state.prepared);
      const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
      const blocks = [];
      // Lay out all paragraphs before sizing the canvas, so long reports never truncate.
      const block = (text,size=25,color='#34382f',space=18) => blocks.push(layoutText(ctx,text,1000,`${size>=32?'700':'400'} ${size}px sans-serif`,Math.ceil(size*1.65),color,space));
      block('VISAFOLD / FIELD REPORT',24,'#b84232',28);
      block(`${selectedName()} · ${typeName()}`,40,'#171816',30);
      block(r.assessment.value === null ? r.assessment.label : `签证参考评分 ${r.assessment.value} / 100 · ${r.assessment.label}`,44,'#171816',14);
      block(r.assessment.note,23,'#62655d');
      if (r.assessment.value !== null) {
        block(`评分明细 · 基础分 ${r.assessment.base}`,32);
        r.assessment.factors.forEach(f => block(`${f.points>0?'+':''}${f.points} · ${f.label}${f.detail?`：${f.detail}`:''}`,24));
      }
      block(r.eligibility.title,44,'#171816',14);
      r.eligibility.reasons.forEach(t => block(`• ${t}`));
      block(`材料准备进度 ${r.ready} / ${r.total} 组`,28,'#317451',34);
      block('01 / 递交路径',32); r.region.details.forEach(t => block(`• ${t}`));
      block('02 / 针对你的情况',32); r.notes.forEach(n => block(`• ${n.text}（${n.basis}）`));
      block('03 / 材料清单',32); r.materials.forEach(m => { block(`${{ready:'已准备',partial:'部分准备',missing:'待准备',unknown:'待了解'}[m.status]} · ${m.title}`,28,'#171816',6); block(m.kind,22,'#b84232',6); block(m.detail,24); m.requirements.forEach(req=>block(`• ${req.label}`,23)); if(m.chosen) block(`已选路径：${m.chosen}`,23,'#317451'); });
      block('04 / 下一步',32); r.actions.forEach((t,i) => block(`${i+1}. ${t}`));
      block('05 / 政策与官方链接',32); r.sources.forEach(s => { block(s.label,26,'#171816',4); block(`${s.reviewedAt?`查阅：${s.reviewedAt}`:'申请细则待确认'} · ${s.scope}`,21,'#62655d',4); block(s.url,19,'#62655d'); });
      block(`报告生成：${new Date(r.generatedAt).toLocaleDateString('zh-CN')}。仅供准备参考，不代表获签概率，不保证签证或入境；以递交时官方规则为准。`,21,'#62655d');
      canvas.width = 1200; canvas.height = 180 + blocks.reduce((sum,b) => sum+b.rows.length*b.lineHeight+b.space,0);
      ctx.fillStyle = '#f5f1e8'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = '#f2c400'; ctx.fillRect(0,0,canvas.width,20);
      let y = 100;
      blocks.forEach(b => { ctx.font=b.font; ctx.fillStyle=b.color; b.rows.forEach(row => { ctx.fillText(row,100,y); y+=b.lineHeight; }); y+=b.space; });
      const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
      if (!blob) throw new Error('image export failed');
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
      anchor.href=url; anchor.download=`visafold-${state.answers.country}-report.png`; document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url),60000);
      $('#exportStatus').textContent = '完整报告图片已生成。手机内置浏览器如未保存，可在系统浏览器中下载。';
    } catch (_) { $('#exportStatus').textContent = '图片暂未成功生成，请重试或复制报告文字保存。'; }
    finally { button.disabled = false; }
  }
  $('#startButton').addEventListener('click',() => navigate(state.step));
  $('#resetTop').addEventListener('click',reset);
  // Revalidate cached selections against the current option list before restoring a result.
  if (state.step === 'result') {
    const firstMissing = steps().filter(s => s !== 'result').find(s => questions(s).some(question => !completed(question)));
    if (firstMissing) state.step = firstMissing;
  }
  render();
})();
