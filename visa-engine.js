(function (root) {
  'use strict';
  const P = typeof module !== 'undefined' && module.exports ? require('./policy-data.js') : root.VisaPolicies;
  const M = typeof module !== 'undefined' && module.exports ? require('./material-rules.js') : root.VisaMaterials;
  const unknown = value => !value || value === 'unknown';
  const tourism = a => a.type === 'tourism';
  const mainSource = a => a.type === 'offer-work' ? a.country === 'schengen' && P.schengen.some(c => c.id === a.schengenCountry) ? `schengen-${a.schengenCountry}` : P.workSources[a.country] : a.type === 'working-holiday' ? P.holidaySources[a.country] : P.countries.find(c => c.id === a.country)?.sourceId;
  const holidaySupported = a => ['australia', 'new-zealand', 'singapore'].includes(a.country);
  function normalizeAnswers(a) {
    const clean = {...a};
    delete clean.companions; delete clean.domesticTies;
    if (a.studentStatus !== 'student') delete clean.graduation;
    if (a.funding !== 'self') delete clean.incomeSelf;
    if (!['parents','shared'].includes(a.funding)) delete clean.incomeFamily;
    if (a.country !== 'singapore' || a.type !== 'working-holiday') delete clean.studyRegion;
    if (a.country === 'singapore' && a.type === 'working-holiday') delete clean.whSlot;
    if (M.japanStudentRoute(clean)) { for (const key of ['funding','incomeSelf','incomeFamily']) delete clean[key]; }
    if (a.country === 'singapore' && a.type === 'tourism') {
      for (const key of ['province','residence','applyAt','residenceProof','residenceDuration','studentStatus','education','graduation','funding','incomeSelf','incomeFamily','history','entry','budget']) delete clean[key];
    }
    if (a.country !== 'new-zealand' || a.type !== 'working-holiday') {
      for (const key of ['languageEvidence','insurance','whFunds','highSchool','previousWh']) delete clean[key];
    }
    if (a.type !== 'tourism') { delete clean.tripPurpose; delete clean.entry; delete clean.returnPlan; }
    return clean;
  }

  function eligibility(a) {
    a = normalizeAnswers(a);
    const reasons = [];
    const pending = [];
    const refs = [mainSource(a)];
    if (!a.country || !a.type || !a.age) pending.push('目的地、申请类型或年龄信息不完整。');
    if (a.passportType === 'other') reasons.push('当前测评适用于中国大陆普通护照，请按你持有的证件查询相应申请条件。');
    if (a.passport === 'no') reasons.push('先办理或更新护照，再核对该路径。');
    if (unknown(a.passport) || unknown(a.passportType)) pending.push('护照类型或有效性尚未确认。');
    if (a.type === 'working-holiday') {
      if (!holidaySupported(a)) {
        return { code: a.country === 'uk' ? 'blocked' : 'unsupported', title: a.country === 'uk' ? '当前护照不适用该项目' : '该项目暂不支持测评', reasons: [...reasons, a.country === 'uk' ? '英国YMS当前国籍／护照清单不包含中国大陆普通护照。' : '该目的地的打工度假暂不支持测评，请通过官方页面了解适用项目及条件。'], refs };
      }
      if (a.country === 'singapore') {
        if (a.age === '18-22' && unknown(a.studyRegion)) pending.push('院校所在地区未确认。');
        if (a.age === '30+' || (a.age === '22-29' && a.sgAge === '26-29')) reasons.push('新加坡该项目要求申请时18至25岁。');
        if (a.age === '22-29' && unknown(a.sgAge)) pending.push('请确认申请时是否已满26岁。');
        if (!['eligible', 'unknown', undefined].includes(a.studyRegion)) reasons.push('该项目要求在指定10个国家或地区的认可大学就读或毕业，中国大陆院校本身不在此名单内。');
        if (unknown(a.studyRegion) || a.studyRegion === 'eligible' && a.schoolResidence !== 'yes') pending.push('需核对院校认可及全日制就读、居住要求：在读生通常需已在当地全日制就读及居住至少3个月；毕业生也有相应经历要求。');
        if (!['bachelor','master','phd'].includes(a.education)) pending.push('需核对教育资格是否符合认可大学要求，不能将其他教育类别直接视作符合。');
      }
      if (a.country === 'new-zealand') {
        if (a.age === '30+' && a.nzAge === '31+') reasons.push('中国打工度假项目要求18至30岁（包含30岁）。');
        if (a.age === '30+' && unknown(a.nzAge)) pending.push('请确认申请时是30岁还是31岁及以上。');
        if (a.residence === 'overseas') reasons.push('中国打工度假项目要求申请人居住在中国。');
        if (a.previousWh === 'yes') reasons.push('曾获签新西兰打工度假，即使未使用，也不能再申请该项目。');
        if (a.highSchool === 'no') reasons.push('该项目要求具备高中学历，需核对学历及认证。');
        if (a.whFunds === 'no') reasons.push('该项目要求至少NZD 4,200生活资金，还需准备离境费用等。');
        for (const [key, label] of [['previousWh','既往打工度假签发记录'],['highSchool','高中学历及认证'],['whFunds','至少NZD 4,200资金'],['languageEvidence','认可英语考试证据'],['insurance','覆盖全程的医疗保险'],['whSlot','当前名额和申请开放情况']]) {
          if (a[key] !== 'yes' && !(key === 'previousWh' && a[key] === 'no')) pending.push(`${label}仍需准备或核对。`);
        }
      }
      if (a.country === 'australia') pending.push('澳大利亚462的学历、英语和资金证明可按下方中国申请人清单准备；当期抽签邀请、年龄及个案条件仍需逐项确认。');
    }
    if (tourism(a)) {
      if (a.country === 'singapore') {
        refs.push('sgArrival');
        if (['31-90', '91-180', '180+'].includes(a.days)) reasons.push('本次停留超过30天，超出中新短期免签范围，请查询与你的访问目的相符的许可。');
      }
      if (a.country === 'schengen') {
        if (!P.schengen.some(c => c.id === a.schengenCountry)) pending.push('尚未确定具体申根主要目的地。');
        if (a.mainDestination === 'unknown') pending.push('需要先按主要访问目的、各国停留安排及相应规则确定受理国。');
        if (['91-180', '180+'].includes(a.days)) reasons.push('本次停留超过90天，应查询国家长期签证或居留路径。');
        if (a.schengenPrior === 'over') reasons.push('连同本次计划将超过任意180天内90天的短期停留上限。');
        if (a.schengenPrior === 'unknown') pending.push('需核对滚动180天内的已用天数；90天不是每次旅行都重新获得。');
      }
      if (a.country === 'uk' && a.days === '180+') reasons.push('计划超过通常6个月访客停留范围，应查询相应签证路径；天数区间不等于官方月数计算。');
      if (!P.sources[mainSource(a)]?.reviewedAt) pending.push('该类别的部分申请条件尚待确认，请通过下方官方入口核对后再递交。');
      if (a.tripPurpose === 'employment') reasons.push('受雇工作／打工度假不能直接套用普通旅游或短期免签路径；请返回选择相应工作路径。');
      if (a.tripPurpose !== 'tourism') pending.push('探亲、课程、活动或实习可能需要不同访问条件或签证类别，请先核对具体活动。');
    }
    if (a.type === 'offer-work') {
      if (a.offer === 'none' || a.offer === 'verbal') reasons.push('请先取得正式的书面聘用文件，再核对工作签证申请条件。');
      pending.push('有Offer不等于可获工作许可；具体签证类别、雇主资格、岗位及个人条件均须按官方规则核对。');
      if (a.sponsor !== 'yes') pending.push('雇主担保／认证／申请资格未确认。');
      if (a.salaryCheck !== 'yes') pending.push('岗位及薪资是否适用该类别的要求未确认。');
      if (unknown(a.workCategory) || a.qualification !== 'ready') pending.push('具体签证类别及个人学历、经验、语言或职业注册仍需逐项核对。');
      if (a.country === 'schengen') pending.push('申根短期签证不授予统一工作资格，需要申请所选国家的工作签证／居留许可。');
    }
    if (reasons.length) return { code: 'blocked', title: '当前计划需要调整', reasons: [...reasons, ...pending], refs };
    if (pending.length) return { code: 'pending', title: '部分资格仍待确认', reasons: pending, refs };
    return { code: a.country === 'singapore' && tourism(a) ? 'exempt' : 'initial', title: a.country === 'singapore' && tourism(a) ? '可按短期免签准备入境' : '可继续核对材料与申请条件', reasons: [a.country === 'singapore' && tourism(a) ? '你的计划可参考30天以内短期旅游免签安排。出发前请确认入境所需材料；如计划工作，需另办相应许可。' : '根据你选择的情况，可以继续准备材料。请同时确认该类别的完整申请条件、开放名额及健康和品行要求。'], refs };
  }

  const materialPlan = a => M.plan(normalizeAnswers(a));
  const japanStudentRoute = a => M.japanStudentRoute(a);

  function jurisdiction(a) {
    const residence = a.residence === 'overseas' ? '境外合法居住地' : a.residence;
    const chosen = a.applyAt === 'hukou' ? a.province : a.applyAt === 'residence' ? residence : a.applyAt === 'overseas' ? '境外拟申请地' : '其他拟申请地';
    const details = [`${a.province?`户籍：${a.province}；`:''}实际常住：${residence || '待选择'}；拟递交：${chosen || '待选择'}。`];
    let title = '受理地点需按官方规则确认';
    const refs = [mainSource(a)];
    if (a.country === 'schengen') {
      if (tourism(a)) refs.push('eu');
      const dest = P.schengen.find(c => c.id === a.schengenCountry);
      if (tourism(a)) {
        details.push(`主要目的地：${dest?.name || '尚未确定'}。先结合访问目的确定主管国家；一般多国旅游按停留最久国，等长时按首入国确定。不能只为了预约方便任意选国。`);
        details.push('通常在合法居住国有地域管辖权的领事机构申请；境内具体中心、异地受理及例外以所选国家官方说明为准。');
      } else details.push(`计划工作国家：${dest?.name || '待确认'}。该国工作签证／居留许可的主管机关和递交地点，必须单独从该国官方入口查询；不能套用短期申根签证的材料、停留或受理规则。`);
      title = dest ? `${dest.name} · 合法居住地受理规则` : '先确定申根主要目的地';
    } else if (a.country === 'japan' || a.country === 'korea') {
      refs.push(a.country === 'japan' ? 'jpRegion' : 'krRegion');
      details.push('请向使领馆确认户籍和就读／常住地址对应的受理领区，以及可使用的递交渠道。具体受理范围尚待确认。');
      details.push('在学校所在地申请时，可询问是否接受在读及住宿证明，是否需要居住证、最低居住时长或指定递交渠道。');
    } else if (a.country === 'singapore' && tourism(a) && ['1-7','8-15','16-30'].includes(a.days) && a.tripPurpose === 'tourism') {
      title = '符合短期免签情形时无需递交旅游签证';
      details.push('按ICA短期免签与入境要求准备；工作、长期停留和其他受限活动另行办理相应许可。');
    } else {
      details.push('在官方申请页面确认递交方式、预约及生物信息采集地点，并核对当地申请所需的居住身份。');
    }
    const localDifference = ['japan','korea'].includes(a.country) && a.province && a.residence !== a.province;
    if (localDifference || a.applyAt === 'other' || a.applyAt === 'overseas') {
      details.push('常住或拟递交地点与户籍／通常受理地点不同，请先确认当地受理资格。');
      if (a.residenceProof !== 'ready') details.push('居住依据尚待确认：可咨询在读／住宿证明、居住证或境外合法居留材料，具体接受范围由受理方决定。');
      if (localDifference && a.residenceDuration === 'short') details.push('你在现常住地居住不足3个月，请先确认受理方的居住时长要求，以及是否接受在读证明。');
    }
    return { title, details, refs };
  }

  function scoreAssessment(a, result = eligibility(a)) {
    a = normalizeAnswers(a);
    const base = 48;
    const factors = [];
    const add = (id, label, points, detail = '', refs = []) => factors.push({ id, label, points, detail, refs });
    if (result.code === 'unsupported') return { value: null, label: '先确认适用项目', base, factors, note: '该项目暂不支持测评，可在官方页面确认其他申请路径。' };
    if (result.code === 'exempt') return { value: null, label: '按免签行程准备', base, factors, note: '符合短期免签情形时，可直接查看入境准备和材料清单。' };

    if (['college','bachelor','master','phd'].includes(a.education)) add('education', '教育经历明确', 6);
    if (a.studentStatus === 'student') add('student', '在读身份清晰', 5, '准备在读证明及假期、返校安排。');
    if (a.studentStatus === 'recent-grad') add('graduate', '毕业阶段明确', 3, '说明毕业后的工作、升学或其他安排。');
    if (a.availableFunds === 'enough') add('funds', '行程资金可覆盖', 10, '保留预算及真实可用资金的证明。');
    else if (a.availableFunds === 'short') add('funds', '行程资金暂不足', -12);
    else add('funds', '可用资金待核算', -5);
    const income = a.funding === 'self' ? {under10:1,'10-30':3,'30+':4}[a.incomeSelf] : ['parents','shared'].includes(a.funding) ? {under15:1,'15-30':2,'30-60':3,'60+':4}[a.incomeFamily] : 0;
    if (income && a.availableFunds === 'enough') add('income', '出资人的收入支持', income, '年收入需结合本次可使用资金及来源证明一起说明。');
    if (a.funding === 'parents' || a.funding === 'shared') add('funding', '父母资助路径明确', 3, '准备关系证明、资助说明和出资人的资金材料。');
    if (M.japanStudentRoute(a)) add('jp-student-route', '适用日本学生简化路径', 6, '根据你的选择，符合单次个人旅游学生简化范围；经济能力证明可按该路径简化，基础材料仍需准备。', ['jpStudent']);
    if (tourism(a)) {
      if (a.returnPlan === 'clear') add('return', '离境／返校安排明确', 6);
      else if (a.returnPlan === 'none' || unknown(a.returnPlan)) add('return', '离境安排待完善', -5);
    }
    const history = Array.isArray(a.history) ? a.history : [];
    if (!history.includes('none') && a.overstay === 'no') {
      if (history.some(h => ['usa','uk','schengen','anz'].includes(h))) add('history', '有相关出境经历', 8, '按申请要求提供既往签证及出入境记录。');
      else if (history.some(h => ['japan','korea','sea','other'].includes(h))) add('history', '有出境经历', 5);
    }
    if (a.refusal === 'no') add('refusal', '无既往拒签等记录', 3);
    else if (a.refusal === 'yes') add('refusal', '既往拒签等记录待说明', -12, '如实说明原因及之后的情况变化。');
    else add('refusal', '既往签证记录待确认', -3);
    if (a.overstay === 'no') add('overstay', '无逾期或违规记录', 2);
    else if (a.overstay === 'yes') add('overstay', '既往逾期／违规记录', -18);
    else add('overstay', '出入境合规情况待确认', -3);
    if (a.entry === 'multiple') add('entry', '多次入境条件需补充', -4, '核对多次类别并说明重复出行需要。');

    if (tourism(a) && ['japan','korea'].includes(a.country)) {
      const refs = [a.country === 'japan' ? 'jpRegion' : 'krRegion'];
      if (a.province && a.province === a.residence && ['hukou','residence'].includes(a.applyAt)) add('local-route', '户籍与常住申请地一致', 4, '户籍和常住地一致，递交依据较清楚；仍需确认受理领区。', refs);
      else if (a.residenceProof === 'ready' && ['residence','overseas'].includes(a.applyAt)) add('residence-route', '异地申请依据已准备', 4, '递交前确认该受理方接受你的居住／就读证明。', refs);
      if (a.regionalPolicy === 'confirmed') add('hukou-benefit', '户籍相关申请便利', 6, `根据你的选择，受理方已确认${a.province || '你的'}户籍适用本次申请的简化或多次入境条件。具体适用范围以该受理方要求为准。`, refs);
    }
    if (a.type === 'offer-work') {
      if (a.offer === 'signed') add('offer', '已有正式聘用合同', 10);
      else if (a.offer === 'written') add('offer', '已有书面聘用意向', 5);
      if (a.sponsor === 'yes') add('sponsor', '雇主资格已核对', 5);
      if (a.salaryCheck === 'yes') add('salary', '岗位及薪资已核对', 5);
      if (a.qualification === 'ready') add('qualification', '岗位个人条件已核对', 5);
    }
    if (a.type === 'working-holiday') {
      if (a.whSlot === 'yes') add('slot', '项目开放及名额已确认', 5);
      if (a.languageEvidence === 'yes') add('language', '语言证据已准备', 5);
      if (a.insurance === 'yes') add('insurance', '医疗保险已准备', 3);
      if (a.whFunds === 'yes') add('whFunds', '项目生活资金已确认', 5);
    }
    let value = base + factors.reduce((sum, f) => sum + f.points, 0);
    if (result.code === 'blocked') {
      if (value > 25) add('eligibility-limit', '先解决申请条件限制', 25 - value, '请先调整报告列出的不适用条件，再重新测评。');
      value = Math.min(value, 25);
    } else if (result.code === 'pending') {
      add('eligibility-limit', '部分申请条件尚待确认', -10, '确认资格初筛中列出的事项后，再评估申请计划。');
      value -= 10;
    }
    value = Math.max(0, Math.min(result.code === 'pending' ? 89 : 95, value));
    // Keep every displayed contribution reconcilable, including range limits.
    const sum = base + factors.reduce((total, f) => total + f.points, 0);
    if (sum !== value) add('range-limit', '综合分数范围调整', value - sum);
    const label = result.code === 'blocked' ? '先调整申请计划' : result.code === 'pending' ? '补充确认后再申请' : value >= 80 ? '申请背景较充分' : value >= 65 ? '具备基础，继续完善' : value >= 50 ? '建议补强后申请' : '先完善申请条件';
    return { value, label, base, factors, note: '评分综合考虑你的背景和申请条件，满分100；仅供参考，不代表实际获签概率。' };
  }

  function buildReport(a, prepared = {}, now = new Date()) {
    a = normalizeAnswers(a);
    const result = eligibility(a);
    const materials = materialPlan(a).map(item => M.resolve(item, a, prepared));
    const notes = [];
    const add = (id, text, refs = [mainSource(a)], priority = 'notice', basis = '准备建议') => notes.push({ id, text, refs, priority, basis });
    if (M.japanStudentRoute(a)) add('jp-student', '你选择了日本单次个人旅游学生简化路径。符合适用条件时可免交经济能力证明，其余基础申请文件仍需准备。', ['jpStudent'], 'notice', '学生简化');
    if (a.type === 'tourism' && a.studentStatus === 'student') add('student', '在校期间可重点准备在读证明、假期及返校安排，并说明旅行费用的来源。');
    if (a.graduation === 'soon') add('graduation', '接近毕业时，请核对旅行期间是否仍在读、是否还能使用学生材料，并用真实的毕业后安排解释行程；不能默认继续适用在读生简化条件。');
    if (a.funding === 'parents' || a.funding === 'shared') add('parents', '由父母出资时，准备亲属关系、资助说明和父母的资金来源材料，确认本次可使用的金额。');
    if (a.funding === 'other') add('other-funder', '非父母资助需要解释关系、资助原因和资金能力，核对是否可被该类别接受。');
    if (a.availableFunds === 'short' || a.availableFunds === 'unknown') add('funds', '本次可支配资金与费用覆盖尚未说明，先列出交通、住宿、生活及应急费用，核对真实资金可用性；年收入不能替代账户资金证据。', undefined, 'important');
    if (a.funding === 'self' && a.incomeSelf === 'unknown' || ['parents','shared'].includes(a.funding) && a.incomeFamily === 'unknown') add('income-unknown', '如果暂不清楚收入情况，可以先与出资人确认本次可使用的资金及证明材料。');
    const familyIncome = {under15:'15万元以下','15-30':'15–30万元','30-60':'30–60万元','60+':'60万元以上'}[a.incomeFamily];
    if (familyIncome && ['parents','shared','other'].includes(a.funding)) add('income-context', `你选择的家庭年收入为${familyIncome}。请结合本次预算，与出资人确认可使用的金额和对应资金证明。`);
    if (a.funding === 'self' && a.incomeSelf === 'none') add('self-source', '本人出资但无固定收入：可如实说明存款、奖学金或既往资助来源，并提供相应证据。');
    if (a.budget === 'low' && ['usa','uk','australia','new-zealand','schengen'].includes(a.country)) add('budget', '所选旅行预算较紧，建议先核算远程交通及住宿。可进一步估算机票、住宿和应急支出。');
    if (a.history?.includes('none')) add('first-trip', '第一次出国，可以从清晰的行程、住宿、费用来源和返程安排开始准备。');
    if (a.overstay === 'yes' || a.refusal === 'yes') add('history', '既往拒签、取消或逾期记录需要按要求如实披露并解释变化；必要时向官方或有资质人士咨询。', undefined, 'important');
    if (a.refusal === 'unknown' || a.overstay === 'unknown') add('history-unknown', '请先核对既往签证及出入境记录，确认申请表中需要说明的事项。', undefined, 'important');
    if (a.entry === 'multiple') add('entry', '如需多次入境，请核对对应类别的申请条件，并说明重复出行的需要。签证有效期与每次允许停留时间应分别确认。');
    if (a.type === 'tourism' && a.returnPlan !== 'clear') add('return', '建议用返校、考试、工作或其他真实安排解释离境计划，是否需要提交已出票机票，请以官方材料清单为准。');
    if (a.domesticTies === 'property') add('property', '家庭房产不等于申请人本人资产，也不能替代资金、在读或真实行程材料。');
    if (a.relatives === 'host' || a.tripPurpose === 'visiting') add('host', '访问亲友和住宿关系可能改变材料要求，需按实际目的核对访问类别。');
    if (a.companions === 'friends') add('companions', '和朋友同行时可保持主要行程一致，但每个人仍需独立满足申请和材料要求。');
    if (a.country === 'singapore' && tourism(a)) add('sg-entry', '短期免签与最终准许入境不同；在抵达前核对ICA入境要求，不能把“免签”当作可工作或无限停留。', ['sg','sgArrival'], 'important', '政策提示');
    if (a.country === 'schengen' && tourism(a)) {
      add('rolling-limit', '短期停留按任意180天内累计90天计算；有效期、入境次数与允许停留天数是三件事。', ['eu'], 'important', '政策提示');
      if (a.departure && a.departure !== 'unknown') {
        const date = new Date(`${a.departure}-01T12:00:00`);
        const months = (date.getFullYear() - now.getFullYear()) * 12 + date.getMonth() - now.getMonth();
        if (months > 6) add('too-early', '预计出发月份超过6个月，通常还未进入申根短期签证递交窗口；可先准备，但不应现在直接递交。', ['eu'], 'notice', '政策提示');
        if (months <= 1) add('time-short', '出发时间较近：通常至少提前15天递交，预约等待和补件还需额外时间。请结合具体出发日期确认是否仍来得及申请。', ['eu'], 'important', '政策提示');
      }
    }
    if (a.departure === 'unknown') add('date-unknown', '出发月份未确定，暂不能判断递交窗口、预约或材料有效期。');
    const region = a.country === 'singapore' && tourism(a) ? {title:'按本次行程核对入境要求',details:['符合30天内普通旅游免签时无需递交旅游签证；出发前按ICA指引确认护照、入境申报及行程要求。'],refs:['sg','sgArrival','sgEntry']} : jurisdiction(a);
    const assessment = scoreAssessment(a, result);
    const sourceIds = [...new Set([mainSource(a), ...result.refs, ...region.refs, ...assessment.factors.flatMap(f => f.refs), ...notes.flatMap(n => n.refs), ...materials.flatMap(m => m.refs)].filter(id => P.sources[id]))];
    const sources = sourceIds.map(id => ({ id, ...P.sources[id] }));
    if (a.country === 'schengen') {
      const selected = P.schengen.find(c => c.id === a.schengenCountry);
      if (selected && !sources.some(s => s.url === selected.url)) sources.push({ id: `country-${selected.id}`, label: `${selected.name} · 官方申请入口`, url: selected.url, reviewedAt: null, scope: '可在此查询具体签证类别、材料及受理地点' });
    }
    const ready = materials.filter(m => m.status === 'ready').length;
    const actions = [];
    if (result.code === 'blocked' || result.code === 'unsupported') actions.push('先处理资格／路径限制，再决定是否缴费或继续准备。');
    if (result.code === 'pending') actions.push('先确认报告列出的资格疑问，尤其是具体签证类别与项目条件。');
    actions.push(region.title);
    actions.push('按下方清单准备材料，并随时更新准备进度。');
    actions.push('递交前重新打开官方来源，核对清单、费用、预约和当期政策。');
    return { generatedAt: new Date(now).toISOString(), assessment, eligibility: result, materials, notes, region, sources, ready, total: materials.length, actions };
  }

  const api = { eligibility, materialPlan, jurisdiction, scoreAssessment, buildReport, holidaySupported, mainSource, japanStudentRoute };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VisaEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
