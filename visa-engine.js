(function (root) {
  'use strict';
  const P = typeof module !== 'undefined' && module.exports ? require('./policy-data.js') : root.VisaPolicies;
  const unknown = value => !value || value === 'unknown';
  const tourism = a => a.type === 'tourism';
  const mainSource = a => a.type === 'offer-work' ? a.country === 'schengen' && P.schengen.some(c => c.id === a.schengenCountry) ? `schengen-${a.schengenCountry}` : P.workSources[a.country] : a.type === 'working-holiday' ? P.holidaySources[a.country] : P.countries.find(c => c.id === a.country)?.sourceId;
  const holidaySupported = a => ['australia', 'new-zealand', 'singapore'].includes(a.country);

  function eligibility(a) {
    const reasons = [];
    const pending = [];
    const refs = [mainSource(a)];
    if (!a.country || !a.type || !a.age) pending.push('目的地、申请类型或年龄信息不完整。');
    if (a.passportType === 'other') reasons.push('此工具仅适用于中国大陆普通护照；请按实际护照重新查询。');
    if (a.passport === 'no') reasons.push('先办理或更新护照，再核对该路径。');
    if (unknown(a.passport) || unknown(a.passportType)) pending.push('护照类型或有效性尚未确认。');
    if (a.type === 'working-holiday') {
      if (!holidaySupported(a)) {
        return { code: a.country === 'uk' ? 'blocked' : 'unsupported', title: a.country === 'uk' ? '当前护照不适用该项目' : '暂不提供此路径的资格判断', reasons: [...reasons, a.country === 'uk' ? '英国YMS当前国籍／护照清单不包含中国大陆普通护照。' : '当前没有配置适用于中国大陆普通护照且已核验的打工度假项目，不能用旅游或工作材料替代资格条件。'], refs };
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
      if (a.country === 'australia') pending.push('462页面正文未完整核验：请先确认当期中国申请人抽签、年龄、学历、英语、资金和名额条件；本工具暂不肯定资格。');
    }
    if (tourism(a)) {
      if (a.country === 'singapore') {
        refs.push('sgArrival');
        if (['31-90', '91-180', '180+'].includes(a.days)) reasons.push('本次停留超过30天，不能直接套用本工具核验的中新短期免签安排。请查询实际访问目的对应许可。');
      }
      if (a.country === 'schengen') {
        if (!P.schengen.some(c => c.id === a.schengenCountry)) pending.push('尚未确定具体申根主要目的地。');
        if (a.mainDestination === 'unknown') pending.push('需要先按主要访问目的、各国停留安排及相应规则确定受理国。');
        if (['91-180', '180+'].includes(a.days)) reasons.push('本次停留超过90天，应查询国家长期签证或居留路径。');
        if (a.schengenPrior === 'over') reasons.push('连同本次计划将超过任意180天内90天的短期停留上限。');
        if (a.schengenPrior === 'unknown') pending.push('需核对滚动180天内的已用天数；90天不是每次旅行都重新获得。');
      }
      if (a.country === 'uk' && a.days === '180+') reasons.push('计划超过通常6个月访客停留范围，应查询相应签证路径；天数区间不等于官方月数计算。');
      if (!P.sources[mainSource(a)]?.reviewedAt) pending.push('该类别的具体官方规则尚未完整核验，暂不确认全部资格条件。');
      if (a.tripPurpose === 'employment') reasons.push('受雇工作／打工度假不能直接套用普通旅游或短期免签路径；请返回选择相应工作路径。');
      if (a.tripPurpose !== 'tourism') pending.push('探亲、课程、活动或实习可能需要不同访问条件或签证类别，请先核对具体活动。');
    }
    if (a.type === 'offer-work') {
      if (a.offer === 'none' || a.offer === 'verbal') reasons.push('尚无可核验的正式聘用文件，不满足此“已有Offer”评估路径的前提。');
      pending.push('有Offer不等于可获工作许可；具体签证类别、雇主资格、岗位、薪资、学历和其他要求均须按官方规则核对。');
      if (a.sponsor !== 'yes') pending.push('雇主担保／认证／申请资格未确认。');
      if (a.salaryCheck !== 'yes') pending.push('岗位及薪资是否适用该类别的要求未确认。');
      if (a.workCategory !== 'known' || a.qualification !== 'ready') pending.push('具体签证类别及个人学历、经验、语言或职业注册仍需逐项核对。');
      if (a.country === 'schengen') pending.push('申根短期签证不授予统一工作资格，需要申请所选国家的工作签证／居留许可。');
    }
    if (reasons.length) return { code: 'blocked', title: '当前计划需要调整', reasons: [...reasons, ...pending], refs };
    if (pending.length) return { code: 'pending', title: '部分资格仍待确认', reasons: pending, refs };
    return { code: a.country === 'singapore' && tourism(a) ? 'exempt' : 'initial', title: a.country === 'singapore' && tourism(a) ? '可按短期免签准备入境' : '可继续核对材料与申请条件', reasons: [a.country === 'singapore' && tourism(a) ? '中国大陆普通护照、符合条件的短期旅游且不超过30天，可参考已核验的免签安排；免签不保证入境，也不授予工作权利。' : '已填写的基础条件未触发本工具已核验的限制；名额、健康、品行及其他条件仍由官方审查，不能据此认定一定合资格。'], refs };
  }

  function materialPlan(a) {
    const src = mainSource(a);
    const items = [];
    const add = (id, title, detail, refs = [src], kind = '建议核对') => items.push({ id, title, detail, refs, kind });
    add('passport', '护照与身份材料', '本人核对护照有效期、空白页和身份信息。未办理护照时，先通过国家移民管理局／当地出入境管理机构了解办理要求。');
    const sgExempt = a.country === 'singapore' && tourism(a) && ['1-7','8-15','16-30'].includes(a.days) && a.tripPurpose === 'tourism';
    if (!sgExempt) add('application', '申请表、照片与申请账号', '从对应官方入口确认表格、照片规格、缴费、预约或递交方式；无需向本网站上传证件。');
    if (sgExempt) add('arrival', 'SG Arrival Card 与入境事项', '通常在抵达前3天内（含抵达日）通过ICA官方入口提交。入境卡免费且不是签证；同时核对护照、返程和入境要求。', ['sgArrival','sg'], '官方要求／说明');
    if (a.studentStatus === 'student') add('student', '在读证明与返校安排', '向学校教务处／学生事务部门咨询：姓名、学籍、课程／年级、假期和返校安排、签章及联系方式。翻译、格式和有效期按受理方清单确认。');
    else add('status', '当前身份与回国安排', a.studentStatus === 'recent-grad' ? '毕业证明、真实的工作／继续升学安排或其他能解释旅行后计划的材料；毕业本身不自动提高或降低资格。' : '按实际身份准备在职、经营、学习或其他说明；没有固定工作不能用不真实材料替代。');
    if (['parents','shared','other'].includes(a.funding)) {
      add('sponsor', '出资说明与资助关系', `${a.funding === 'parents' ? '父母' : '资助人'}的资助范围、关系及支持意愿；核对是否需要户口簿、出生证明等关系材料。不要默认所有情况都必须公证。`, a.country === 'uk' ? ['ukDocs'] : [src]);
      add('sponsorFunds', '出资人的资金来源材料', '按受理方要求准备真实银行流水／收入或其他来源证据。收入、账户余额与可支配资金是不同概念；不通过临时大额转账制造流水。', a.country === 'uk' ? ['ukDocs'] : [src]);
    }
    if (['self','shared','scholarship'].includes(a.funding)) add('ownFunds', '本人可使用资金及来源', a.funding === 'scholarship' ? '奖学金／补助证明、到账记录、余额与实际可使用范围；无需虚构工资收入。' : '核对本人流水、存款及真实来源；按申请类别准备，不能仅凭年收入区间判断资金充分。');
    add('itinerary', a.type === 'offer-work' ? '赴任及住宿安排' : '行程、住宿与离境计划', '准备与出行目的、假期、预算一致的安排。是否需已付款机票／酒店按官方清单核对，不为测评提前购买不可退产品。');
    if (a.tripPurpose === 'visiting' || a.relatives === 'host') add('invitation', '邀请与住宿关系说明', '说明访问对象、关系、停留地点及费用承担；邀请函和邀请人证件要求按类别确认，不隐瞒真实访问目的。');
    if (a.residence && (a.residence !== a.province || a.applyAt !== 'residence')) add('residence', '实际居住／异地申请证明', '准备学校在读与住宿、居住证或境外合法居留等相应证据，并向受理方确认可接受的材料及居住时长。户籍和常住地不是同一概念。', a.country === 'schengen' ? ['eu'] : a.country === 'japan' ? ['jpRegion'] : [src]);
    if (a.country === 'schengen' && tourism(a)) add('insurance', '申根旅游医疗保险', '按所选国家官方清单确认承保范围、额度和有效日期；欧盟指引要求涵盖紧急医疗、住院和遣返等风险。', ['eu'], '官方要求／说明');
    if (a.type === 'working-holiday') {
      add('whEducation', '学历与语言资格证据', '项目可能要求学历认证、认可英语考试或特定大学经历；自评“英语不错”不等于符合正式证据要求。');
      add('whFunds', '项目资金、保险与名额', a.country === 'new-zealand' ? '核对至少NZD4,200生活资金、离境费用、全程医疗保险、年度名额和开放状态。' : '逐项打开项目官方页核对当期资金、保险、年龄和名额要求。');
    }
    if (a.type === 'offer-work') {
      add('contract', '聘用合同与岗位信息', '核对雇主主体、职位、职责、工作时长、薪资、期限及签署情况；Offer和工作许可是不同文件。');
      add('sponsorship', '雇主资格与申请类别', '让雇主确认适用工作签证／居留类别、担保或认证、岗位审核及双方递交责任。');
      add('qualification', '岗位所需学历、经验与注册', '按具体类别核对学历、经验、语言、职业注册和资格认证；不以签署合同代替这些条件。');
    }
    if (a.country === 'usa') add('interview', '美国申请与面谈准备', '从国务院及使领馆官方入口确认适用流程；是否面谈及是否可免面谈以当期规则和本人情况为准，不把练习次数当作资格条件。');
    if (a.refusal === 'yes' || a.overstay === 'yes') add('history', '既往记录说明', '保留真实拒签／取消／逾期文件及后续变化，按表格如实披露。拒签不会因为自称“已解决”自动消失。');
    return items;
  }

  function jurisdiction(a) {
    const residence = a.residence === 'overseas' ? '境外合法居住地' : a.residence;
    const chosen = a.applyAt === 'hukou' ? a.province : a.applyAt === 'residence' ? residence : a.applyAt === 'overseas' ? '境外拟申请地' : '其他拟申请地';
    const details = [`户籍：${a.province || '待选择'}；实际常住：${residence || '待选择'}；拟递交：${chosen || '待选择'}。`];
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
      details.push('需同时核对户籍、就读／常住地址、受理领区及认可递交渠道。当前未完整核验领区表，不直接指定使领馆或承诺异地可受理。');
      details.push('询问受理方：凭在读及住宿证明是否可在学校所在地申请？是否另需居住证、居住时长或指定代理渠道？代理自身接单标准不能当作官方资格限制。');
    } else if (a.country === 'singapore' && tourism(a) && ['1-7','8-15','16-30'].includes(a.days) && a.tripPurpose === 'tourism') {
      title = '符合短期免签情形时无需递交旅游签证';
      details.push('按ICA短期免签与入境要求准备；工作、长期停留和其他受限活动另行办理相应许可。');
    } else {
      details.push('先从该类别官方入口确认在线申请、预约／生物信息地点与居住身份要求；本工具不按户籍省份评定获签难度。');
    }
    if (a.residence !== a.province || a.applyAt === 'other' || a.applyAt === 'overseas') details.push('存在户籍与居住地／拟申请地差异：先确认受理资格和证明，再缴费、预约或寄送材料。');
    if (a.residenceProof !== 'ready') details.push('居住依据尚待确认：可咨询在读／住宿证明、居住证或境外合法居留材料，具体接受范围由受理方决定。');
    if (a.residenceDuration === 'short') details.push('在现常住地不足3个月：优先询问该受理方是否要求最低居住时长或接受在读依据，不自动判为不能申请。');
    details.push('户籍本身不加减分；此处反映受理资格、材料和办理成本差异，不能换算为获签概率。');
    return { title, details, refs };
  }

  function buildReport(a, prepared = {}, now = new Date()) {
    const result = eligibility(a);
    const materials = materialPlan(a).map(item => ({ ...item, status: ['ready','missing','unknown'].includes(prepared[item.id]) ? prepared[item.id] : 'unknown' }));
    const notes = [];
    const add = (id, text, refs = [mainSource(a)], priority = 'notice', basis = '准备建议') => notes.push({ id, text, refs, priority, basis });
    if (a.studentStatus === 'student') add('student', '学生本人没有工资、没有房产或首次出境，都不能单独推断不合资格。重点解释真实资助、假期和返校安排。');
    if (a.graduation === 'soon') add('graduation', '接近毕业时，请核对旅行期间是否仍在读、是否还能使用学生材料，并用真实的毕业后安排解释行程；不能默认继续适用在读生简化条件。');
    if (a.funding === 'parents' || a.funding === 'shared') add('parents', '父母出资不会自动加分。应核对亲属关系、资助意愿、真实资金来源与本次可用金额。');
    if (a.funding === 'other') add('other-funder', '非父母资助需要解释关系、资助原因和资金能力，核对是否可被该类别接受。');
    if (a.availableFunds === 'short' || a.availableFunds === 'unknown') add('funds', '本次可支配资金与费用覆盖尚未说明，先列出交通、住宿、生活及应急费用，核对真实资金可用性；年收入不能替代账户资金证据。', undefined, 'important');
    if (a.incomeFamily === 'unknown' || a.incomeSelf === 'unknown') add('income-unknown', '收入信息不完整，不能推断资助能力；不透露也不会被自动判为低资格。');
    const familyIncome = {under15:'15万元以下','15-30':'15–30万元','30-60':'30–60万元','60+':'60万元以上'}[a.incomeFamily];
    if (familyIncome && ['parents','shared','other'].includes(a.funding)) add('income-context', `你选择的家庭年收入为${familyIncome}。这只是背景说明，不是通过门槛；仍需结合本次预算、实际资助人和可用资金证据判断是否有待解释的缺口。`);
    if (a.funding === 'self' && a.incomeSelf === 'none') add('self-source', '本人出资但无固定收入：可如实说明存款、奖学金或既往资助来源，并提供相应证据。');
    if (a.budget === 'low' && ['usa','uk','australia','new-zealand','schengen'].includes(a.country)) add('budget', '所选旅行预算较紧，建议先核算远程交通及住宿。这是预算提示，并非官方最低资产门槛。');
    if (a.history?.includes('none')) add('first-trip', '首次出境本身不等于不符合申请条件，无需为了“刷记录”额外出国；把本次真实行程和资助说明做好。');
    if (a.overstay === 'yes' || a.refusal === 'yes') add('history', '既往拒签、取消或逾期记录需要按要求如实披露并解释变化；必要时向官方或有资质人士咨询。', undefined, 'important');
    if (a.refusal === 'unknown' || a.overstay === 'unknown') add('history-unknown', '既往记录信息不足，报告不能视作已排除相关影响。', undefined, 'important');
    if (a.entry === 'multiple') add('entry', '多次入境愿望不直接减分。是否可申请、签发次数、有效期和每次停留期限必须按该类别区分；多次不等于可连续长期居留。');
    if (a.returnPlan !== 'clear') add('return', '建议用返校、考试、工作或其他真实安排解释离境计划，不把购买不可退机票当成测评的前提。');
    if (a.domesticTies === 'property') add('property', '家庭房产不等于申请人本人资产，也不能替代资金、在读或真实行程材料。');
    if (a.relatives === 'host' || a.tripPurpose === 'visiting') add('host', '访问亲友和住宿关系可能改变材料要求，需按实际目的核对访问类别。');
    if (a.companions === 'friends') add('companions', '和朋友同行时可保持主要行程一致，但每个人仍需独立满足申请和材料要求。');
    if (a.country === 'singapore' && tourism(a)) add('sg-entry', '短期免签与最终准许入境不同；在抵达前核对ICA入境要求，不能把“免签”当作可工作或无限停留。', ['sg','sgArrival'], 'important', '已核验规则');
    if (a.country === 'schengen' && tourism(a)) {
      add('rolling-limit', '短期停留按任意180天内累计90天计算；有效期、入境次数与允许停留天数是三件事。', ['eu'], 'important', '已核验规则');
      if (a.departure && a.departure !== 'unknown') {
        const date = new Date(`${a.departure}-01T12:00:00`);
        const months = (date.getFullYear() - now.getFullYear()) * 12 + date.getMonth() - now.getMonth();
        if (months > 6) add('too-early', '预计出发月份超过6个月，通常还未进入申根短期签证递交窗口；可先准备，但不应现在直接递交。', ['eu'], 'notice', '已核验规则');
        if (months <= 1) add('time-short', '出发时间较近：通常至少提前15天递交，预约等待和补件还需额外时间。因未选择具体日期，本工具不能确认是否来得及。', ['eu'], 'important', '已核验规则');
      }
    }
    if (a.departure === 'unknown') add('date-unknown', '出发月份未确定，暂不能判断递交窗口、预约或材料有效期。');
    const region = jurisdiction(a);
    const sourceIds = [...new Set([mainSource(a), ...result.refs, ...region.refs, ...notes.flatMap(n => n.refs), ...materials.flatMap(m => m.refs)].filter(Boolean))];
    const sources = sourceIds.map(id => ({ id, ...P.sources[id] }));
    if (a.country === 'schengen') {
      const selected = P.schengen.find(c => c.id === a.schengenCountry);
      if (selected && !sources.some(s => s.url === selected.url)) sources.push({ id: `country-${selected.id}`, label: `${selected.name} · 官方申请入口`, url: selected.url, reviewedAt: null, scope: '国家入口；具体签证类别、材料及领区需在该网站核对' });
    }
    const ready = materials.filter(m => m.status === 'ready').length;
    const actions = [];
    if (result.code === 'blocked' || result.code === 'unsupported') actions.push('先处理资格／路径限制，再决定是否缴费或继续准备。');
    if (result.code === 'pending') actions.push('先确认报告列出的资格疑问，尤其是具体签证类别与项目条件。');
    actions.push(region.title);
    actions.push('按下方清单逐项准备；标记“已准备”仅表示你的自报状态，未审核文件内容。');
    actions.push('递交前重新打开官方来源，核对清单、费用、预约和当期政策。');
    return { generatedAt: new Date(now).toISOString(), eligibility: result, materials, notes, region, sources, ready, total: materials.length, actions };
  }

  const api = { eligibility, materialPlan, jurisdiction, buildReport, holidaySupported, mainSource };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VisaEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
