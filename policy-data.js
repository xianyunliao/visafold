/* Rule review dates refer to the excerpts in research/rule-review.json.
   A reachable page is not necessarily a reviewed rule. Do not mark it verified automatically. */
(function (root) {
  'use strict';
  const source = (label, url, reviewedAt = null, scope = '申请细则待确认，请查看官方要求') => ({ label, url, reviewedAt, scope });
  const sources = {
    jpStudent: source('日本驻华使馆 · 学生个人旅游简化', 'https://www.cn.emb-japan.go.jp/itpr_zh/20190101.html', '2026-11-18', '中国高校在读及毕业三年内本科、硕士、博士生的单次个人旅游经济能力证明简化；学校／学习形式等适用性及其余基础材料由受理方确认'),
    krChengdu: source('韩国成都签证中心 · 签证申请及材料指引', 'https://www.koreavisa-cd.com/files/visadoc/%E7%AD%BE%E8%AF%81%E7%94%B3%E8%AF%B7%E5%8F%8A%E5%87%86%E5%A4%87%E6%9D%90%E6%96%99%E6%8C%87%E5%AF%BC_%202025.07.03.pdf', '2026-11-18', '公开2025-07-03版C-3-9：经济证明可选一类，另有学生或指定城市非集体户籍等免交路径；仅限对应成都领区与类别，递交前确认现行版本'),
    sgEntry: source('新加坡ICA · 入境要求', 'https://www.ica.gov.sg/enter-transit-depart/entering-singapore', null, '按证件、身份及旅行史查询个性化入境要求'),
    sgWhApply: source('新加坡MOM · 打工度假申请与材料', 'https://www.mom.gov.sg/passes-and-permits/work-holiday-programme/apply-for-a-pass', '2026-11-18', '毕业生学位或成绩单；在读生学校信函、学生证及适用时学生签证；翻译与获批后签发材料'),
    sgEpDocs: source('新加坡MOM · EP所需材料', 'https://www.mom.gov.sg/passes-and-permits/employment-pass/documents-required', '2026-11-18', '护照、雇主ACRA资料；学历核验及职业附加文件按情况适用，不要求所有人提供同一套学历材料'),
    ukWorkDocs: source('英国政府 · Skilled Worker申请材料', 'https://www.gov.uk/skilled-worker-visa/documents-you-must-provide', '2026-11-18', 'CoS、岗位及雇主信息、英语、身份；生活费可按资金或CoS雇主承担等适用路径证明；其他文件有条件适用'),
    auVisit: source('澳大利亚驻华使馆 · 访客签证', 'https://china.embassy.gov.au/bjng/DIMA0301.html', '2026-11-18', '600签证按ImmiAccount个人清单递交，各人独立申请；此页面不提供完整个人材料要求'),
    auWhDocs: source('澳大利亚驻华使馆 · 首次462中国申请人清单', 'https://china.embassy.gov.au/files/bjng/Checklist-462-Work-and-Holiday-China%20as%20at%2031%20Mar%202026_EN.pdf', '2026-11-18', '2026年3月版：身份、AUD5000及离境费用、学历路径、功能英语、健康及有条件的品行补件；各类别独立符合，类别内证明可有替代路径'),
    auEnglish: source('澳大利亚内政部 · Functional English', 'https://immi.homeaffairs.gov.au/help-support/meeting-our-requirements/english-language/functional-english', '2026-11-18', '考试或满足年限的全英文授课经历等适用路径；考试接受范围按考试日期区分，不能用一般英语自评替代'),
    ukWorkMoney: source('英国政府 · Skilled Worker生活费', 'https://www.gov.uk/skilled-worker-visa/how-much-it-costs', '2026-11-18', '通常本人GBP1270连续28天，末日距申请31天以内；CoS雇主确认承担或已持有效签证在英至少12个月可有相应豁免'),
    nlDocs: source('荷兰政府 · 申根旅游材料清单', 'https://www.netherlandsworldwide.nl/visa-the-netherlands/checklist-schengen-visa-tourism', '2026-11-18', '按学生／在职身份区分材料；本人付费的3个月流水；住宿、行程及医疗保险，行程不要求已付款机票'),
    jp: source('日本驻华使馆 · 签证', 'https://www.cn.emb-japan.go.jp/itpr_zh/visa.html'),
    jpRegion: source('日本驻华使馆 · 领事信息', 'https://www.cn.emb-japan.go.jp/itpr_zh/consular.html', null, '领区及异地申请条件待确认，可向使领馆咨询'),
    jpWork: source('日本外务省 · 工作及长期居留', 'https://www.mofa.go.jp/j_info/visit/visa/long/index.html'),
    jpWh: source('日本外务省 · Working Holiday', 'https://www.mofa.go.jp/j_info/visit/w_holiday/index.html'),
    kr: source('韩国签证门户', 'https://www.visa.go.kr/'),
    krRegion: source('韩国驻华使馆', 'https://chn.mofa.go.kr/'),
    krWh: source('韩国外交部 · Working Holiday', 'https://whic.mofa.go.kr/contents.do?menuNo=90&contentsNo=38'),
    sg: source('新加坡 ICA · 中新互免签证安排', 'https://www.ica.gov.sg/news-and-publications/newsroom/media-release/mutual-30-day-visa-exemption-arrangement-between-singapore-and-the-people-s-republic-of-china', '2026-11-18', '中国普通护照持有人符合条件的短期访问可免签停留不超过30天；不涵盖工作许可'),
    sgArrival: source('新加坡 ICA · SG Arrival Card', 'https://www.ica.gov.sg/enter-transit-depart/entering-singapore/sg-arrival-card', '2026-11-18', '通常在抵达前3天内（含抵达日）提交；入境卡不是签证'),
    sgWh: source('新加坡 MOM · Work Holiday Programme', 'https://www.mom.gov.sg/passes-and-permits/work-holiday-programme/eligibility', '2026-11-18', '18至25岁；指定10个国家或地区的认可大学在读生或毕业生，并有全日制就读及居住要求'),
    sgWork: source('新加坡 MOM · Employment Pass', 'https://www.mom.gov.sg/passes-and-permits/employment-pass/eligibility', '2026-11-18', 'EP有薪资及COMPASS等条件；其他准证另行核对，不以一份Offer判定资格'),
    us: source('美国国务院 · 访客签证', 'https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visitor.html'),
    usDocs: source('美国国务院 · 访客面谈材料', 'https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visitor.html', '2026-11-18', '面谈前的护照、DS-160确认页、适用时费用收据、上传失败时纸质照片；访问目的／资金／离境证据按情况，普通访客不要求邀请函或经济担保书；此处不代表面谈资格或当地流程已完整核实'),
    usWork: source('美国国务院 · 临时工作签证', 'https://travel.state.gov/content/travel/en/us-visas/employment/temporary-worker-visas.html'),
    uk: source('英国政府 · Standard Visitor', 'https://www.gov.uk/standard-visitor', '2026-11-17', '标准访客通常每次最多停留6个月；不能据此从事一般受雇工作'),
    ukDocs: source('英国政府 · 访客材料指引', 'https://www.gov.uk/government/publications/visitor-visa-guide-to-supporting-documents/guide-to-supporting-documents-visiting-the-uk', '2026-11-18', '学生证明、资金来源、第三方资助关系及支持能力；材料示例不等于人人必须提交'),
    ukWh: source('英国政府 · Youth Mobility Scheme', 'https://www.gov.uk/youth-mobility/eligibility', '2026-11-18', '中国大陆普通护照不在当前适用国籍／护照清单内'),
    ukWork: source('英国政府 · Skilled Worker', 'https://www.gov.uk/skilled-worker-visa/your-job', '2026-11-18', '认可担保雇主、合资格岗位和相应薪资要求；例外与具体门槛应按申请时规则核对'),
    au: source('澳大利亚内政部 · Visitor 600', 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600', null, '具体材料及申请条件待确认，请查看最新官方清单'),
    auWh: source('澳大利亚内政部 · 首次462', 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-462/first-work-holiday-462', null, '年龄、学历、英语、资金及中国申请人抽签安排待确认，请查看当期申请要求'),
    auWork: source('澳大利亚内政部 · Skills in Demand 482', 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482', null, '工作签证类别、担保及岗位条件待确认'),
    nz: source('新西兰移民局 · Visitor Visa', 'https://www.immigration.govt.nz/visas/visitor-visa/', '2026-11-17', '访客签证入口；以具体申请情形清单为准'),
    nzWh: source('新西兰移民局 · China Working Holiday', 'https://www.immigration.govt.nz/visas/china-working-holiday-visa/', '2026-11-18', '18至30岁、中国公民且居住在中国；高中学历、认可英语证据、至少NZD4200、全程医疗保险及既往WH签发限制；有年度名额'),
    nzWork: source('新西兰移民局 · AEWV', 'https://www.immigration.govt.nz/visas/accredited-employer-work-visa/', '2026-11-18', '认证雇主及符合要求的岗位，通常每周至少30小时；仍需核对其他条件'),
    eu: source('欧盟委员会 · 申请申根签证', 'https://home-affairs.ec.europa.eu/policies/schengen/visa-policy/applying-schengen-visa_en', '2026-11-18', '短期180天内最多90天；主要目的地；合法居住地受理原则；通常提前至少15天、不早于6个月递交；旅游医疗保险等证明'),
    euWork: source('欧盟移民门户 · 各国工作路径', 'https://immigration-portal.ec.europa.eu/index_en', null, '按国家核对；不适用于所有非欧盟申根成员国，不能作为统一工作签证依据'),
  };
  const countries = [
    ['japan', '🇯🇵', '日本', 'JAPAN', 'jp'], ['korea', '🇰🇷', '韩国', 'KOREA', 'kr'],
    ['singapore', '🇸🇬', '新加坡', 'SINGAPORE', 'sg'], ['usa', '🇺🇸', '美国', 'UNITED STATES', 'us'],
    ['uk', '🇬🇧', '英国', 'UNITED KINGDOM', 'uk'], ['australia', '🇦🇺', '澳大利亚', 'AUSTRALIA', 'au'],
    ['new-zealand', '🇳🇿', '新西兰', 'NEW ZEALAND', 'nz'], ['schengen', '◎', '申根区', 'SCHENGEN AREA', 'eu'],
  ].map(([id, flag, name, en, sourceId]) => ({ id, flag, name, en, sourceId }));
  const schengen = [
    ['at','奥地利','https://www.bmeia.gv.at/en/travel-stay/entrance-and-residence-in-austria'],
    ['be','比利时','https://dofi.ibz.be/en'], ['bg','保加利亚','https://www.mfa.bg/en/services-travel/consular-services'],
    ['hr','克罗地亚','https://mvep.gov.hr/services-for-citizens/consular-information-22802/visas-22807/22807'],
    ['cz','捷克','https://mzv.gov.cz/jnp/en/information_for_aliens/index.html'],
    ['dk','丹麦','https://www.nyidanmark.dk/en-GB'], ['ee','爱沙尼亚','https://vm.ee/en/consular-visa-and-travel-information'],
    ['fi','芬兰','https://um.fi/visa-to-visit-finland'], ['fr','法国','https://france-visas.gouv.fr/'],
    ['de','德国','https://china.diplo.de/cn-zh/service/visa-einreise'], ['gr','希腊','https://www.mfa.gr/en/visas/'],
    ['hu','匈牙利','https://konzinfo.mfa.gov.hu/en'], ['is','冰岛','https://island.is/en/visas'],
    ['it','意大利','https://vistoperitalia.esteri.it/'], ['lv','拉脱维亚','https://www.mfa.gov.lv/en/entry-latvia'],
    ['li','列支敦士登','https://www.eda.admin.ch/countries/china/en/home/visa.html'],
    ['lt','立陶宛','https://www.migracija.lt/'], ['lu','卢森堡','https://guichet.public.lu/en/citoyens/immigration.html'],
    ['mt','马耳他','https://identita.gov.mt/'], ['nl','荷兰','https://www.netherlandsworldwide.nl/visa-the-netherlands'],
    ['no','挪威','https://www.udi.no/en/'], ['pl','波兰','https://www.gov.pl/web/china/visas'],
    ['pt','葡萄牙','https://vistos.mne.gov.pt/en/'], ['ro','罗马尼亚','https://eviza.mae.ro/'],
    ['sk','斯洛伐克','https://www.mzv.sk/en/web/en/visa-and-services'],
    ['si','斯洛文尼亚','https://www.gov.si/en/topics/entry-and-residence/'],
    ['es','西班牙','https://www.exteriores.gob.es/Embajadas/pekin/zh/ServiciosConsulares/Paginas/index.aspx'],
    ['se','瑞典','https://www.migrationsverket.se/English.html'], ['ch','瑞士','https://www.eda.admin.ch/countries/china/en/home/visa.html'],
  ].map(([id, name, url]) => ({ id, name, url }));
  schengen.forEach(country => {
    sources[`schengen-${country.id}`] = source(`${country.name} · 官方申请入口`, country.url, null, '可在此查询该国签证及居留事项；具体类别、材料和受理地点待确认');
  });
  const provinces = ['北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江','上海','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','重庆','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆'];
  const types = [
    { id: 'tourism', title: '旅游 / 短期访问', en: 'VISIT', description: '观光旅行、探亲访友与短期访问' },
    { id: 'working-holiday', title: '打工度假', en: 'WORK & HOLIDAY', description: '旅行途中，体验当地生活与工作' },
    { id: 'offer-work', title: '已有 Offer · 工作', en: 'EMPLOYMENT', description: '已获得当地雇主的聘用意向或合同' },
  ];
  const workSources = { japan:'jpWork', korea:'kr', singapore:'sgWork', usa:'usWork', uk:'ukWork', australia:'auWork', 'new-zealand':'nzWork', schengen:'euWork' };
  const workRoutes = { singapore:{id:'ep',label:'Employment Pass (EP)'}, uk:{id:'skilled-worker',label:'Skilled Worker'}, 'new-zealand':{id:'aewv',label:'Accredited Employer Work Visa (AEWV)'} };
  const holidaySources = { japan:'jpWh', korea:'krWh', singapore:'sgWh', usa:'usWork', uk:'ukWh', australia:'auWh', 'new-zealand':'nzWh', schengen:'euWork' };
  const data = { version: 3, reviewedAt: '2026-11-18', countries, schengen, provinces, types, sources, workSources, workRoutes, holidaySources };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.VisaPolicies = data;
})(typeof globalThis !== 'undefined' ? globalThis : this);
