/* Destination-specific preparation groups. Evidence: research/material-review.json. */
(function (root) {
  'use strict';
  const P = typeof module !== 'undefined' && module.exports ? require('./policy-data.js') : root.VisaPolicies;
  const labels = { all:'本组各项都要准备', any:'任选一条完整路径', evidence:'按情况选用支持材料', confirm:'先确认适用清单' };
  const japanStudentRoute = a => a.country==='japan' && a.type==='tourism' && a.tripPurpose==='tourism' && a.entry==='single' && ['student','recent-grad'].includes(a.studentStatus) && ['bachelor','master','phd'].includes(a.education) && a.jpStudent==='yes';
  function plan(a) {
    const tourism = a.type === 'tourism';
    const source = a.type === 'offer-work' ? a.country === 'schengen' ? `schengen-${a.schengenCountry}` : P.workSources[a.country] : a.type === 'working-holiday' ? P.holidaySources[a.country] : P.countries.find(c=>c.id===a.country)?.sourceId;
    const groups = [];
    const add = (id,title,mode,detail,entries,refs=[source],extra={}) => groups.push({id,title,mode,detail,requirements:entries.map((e,i)=>typeof e==='string'?{id:`item${i+1}`,label:e}:e),refs,kind:labels[mode],...extra});
    const all = (id,title,entries,detail='',refs,extra) => add(id,title,'all',detail,entries,refs,extra);
    const support = (id,title,entries,detail='',refs,extra) => add(id,title,'evidence',detail,entries,refs,extra);
    const confirm = (id,title,detail,entries=[],refs) => add(id,title,'confirm',detail,entries,refs);
    const any = (id,title,entries,detail='',refs) => add(id,title,'any',detail,entries,refs);
    const identity = () => all('passport','护照与申请身份', ['护照个人信息页及本次所需的有效期、空白页','按本次清单提供身份证明及历史护照信息'], '证件及复印范围按受理方清单核对。');
    const student = (refs=[source],required=false) => {
      if(a.studentStatus==='student') (required?all:support)('student','在读证明与返校安排',required?['注明所读课程及学习期限的在读证明']:['注明课程及在读时间的学校证明','按情况补充假期及返校安排'],required?'按所选国家学生清单准备。':'用与你实际情况相符的材料说明学习及返校安排。',refs);
      else support('status','当前身份与回国安排',['毕业后的升学／入职安排，或当前在职等身份证明'],'按当前身份选择，不要求毕业生提供在读证明。',refs);
    };
    const funding = (refs=[source]) => {
      if(['parents','shared','other'].includes(a.funding)) all('sponsor','资助人的支持说明',['资助范围与支持方式','你与资助人的关系证明','资助人的可用资金及来源证明'],'父母出资时合并准备这一组；是否要翻译或特定关系文件按受理清单确认。',refs);
      if(['self','shared','scholarship'].includes(a.funding)) support('ownFunds','本人可用资金及来源',a.funding==='scholarship'?['奖学金／机构资助说明及到账证据']:['能显示资金来源及可用余额的流水','收入或其他合法资金来源材料'],'按实际资金来源选择证据，示例并非全部必交。',refs);
    };
    const localChecklist = (country,refs) => confirm('localChecklist',`${country}本次申请材料清单`,'先按申请类别、领区和身份取得对应清单；确认被接受的简化证明后，再按该路径准备。',['申请表、照片及递交渠道','学生／毕业生与资金材料的适用范围','单次／多次及户籍相关条件'],refs);
    const departure = (refs, sponsorAllowed = false) => any('departure','离境保障',[
      {id:'ticket',label:'离境机票及下一目的地入境资格'},
      {id:'funds',label:'额外购票资金及下一目的地入境资格'},
      ...(sponsorAllowed ? [{id:'sponsor',label:'由符合资格的正式担保人承诺支付离境机票'}] : []),
    ],'任选一条；购票资金应在生活费之外，按需要提供证明。',refs);

    if(tourism && a.country==='singapore') {
      const shortTourism = ['1-7','8-15','16-30'].includes(a.days) && a.tripPurpose === 'tourism' && a.passportType !== 'other';
      if (!shortTourism) {
        confirm('visitPermit','核对本次访问许可','先按你的护照、访问目的和停留天数确认适用许可，再准备对应文件。',[],['sg','sgEntry']);
        return groups;
      }
      all('passport','入境护照',['核对护照与本次行程的入境有效性'], '请在ICA入口按证件和行程确认。',['sg','sgEntry']);
      all('arrival','SG Arrival Card',['在抵达前3天内（含抵达日）免费提交入境卡和健康申报'], '入境卡不是签证，也不收取官方申报费。',['sgArrival']);
      support('entryPlan','行程与费用准备',['真实住宿地址与离境安排','可使用的旅行费用及必要证明'],'短期旅游无需套用学生签证材料包；有特殊旅行史时另查健康要求。',['sgEntry']);
      return groups;
    }
    identity();
    if(a.type==='working-holiday') {
      if(!['singapore','new-zealand','australia'].includes(a.country)) { confirm('project','先确认可适用的工作项目','该目的地的打工度假暂不支持测评，请先查看官方项目条件。'); return groups; }
      if(a.country==='singapore') {
        if(a.studentStatus==='student') all('whUniversity','在读生院校材料',['3个月内出具、含学籍／姓名／国籍／出生日期的大学信函','大学学生证','国际学生另需当地学生签证'], '这些材料同时准备；院校非英文文件需附大学认证的英文翻译。',['sgWhApply']);
        else any('whUniversity','毕业生院校材料',[{id:'degree',label:'学位证书'},{id:'transcript',label:'成绩单'}],'学位证书或成绩单二选一；非英文文件附大学认证的英文翻译。',['sgWhApply']);
        all('whIssue','获批后领取准证',['按IPA办理签发，准备新加坡住址及所需声明','准证有效期内离境的返程票'], '这是获批后阶段，按IPA及MOM签发指引安排。',['sgWhApply']);
        return groups;
      }
      if(a.country==='australia') {
        all('auIdentity','462中国申请人身份材料',['身份证及含家庭成员页的户口簿','出生证明；没有出生证明时提供出生公证','中英文填写的Form 54家庭成员表'], '出生证明与出生公证是替代关系；首次赴澳另按清单复印护照签字及签证／盖章页。',['auWhDocs']);
        any('whEducation','462学历证明路径',[
          {id:'china',label:'中国高等教育毕业资格＋学信网核验报告（中英文）'},
          {id:'overseas',label:'海外高等教育毕业资格＋留服认证（中英文）'},
          {id:'twoYears',label:'已完成本科至少两年＋学籍核验＋认证成绩单（中英文）'},
        ],'选择与你情况相符的一条，路径内的文件需要一起准备。尚未完成本科两年不能直接视为符合。',['auWhDocs']);
        support('whFunds','462生活及离境资金',['可证明至少AUD5,000初期生活费及另行离境费用的资金证据'], '资金证据可按实际情况选用存折、流水／工资单或其他资金资产证明，不要求所有示例叠加。',['auWhDocs']);
        any('whLanguage','462英语证明路径',[{id:'test',label:'递交前12个月内的认可功能英语考试成绩'},{id:'study',label:'符合功能英语要求的英语授课教育证据'}],'任选一种认可路径；认可考试、分数或英语授课经历按内政部Functional English细则确认。',['auWhDocs','auEnglish']);
        confirm('whConditions','抽签与个人补充要求','先确认当期抽签／邀请及年龄条件；体检按健康要求办理，Form 80和无犯罪等按受理部门要求提供。',[],['auWh','auWhDocs']);
        return groups;
      }
      all('whEducation','中国打工度假学历',['符合要求的高中学历及所需核验'], '',['nzWh'],{answerKey:'highSchool'});
      all('whLanguage','认可英语证据',['符合移民局要求的英语证据'], '',['nzWh'],{answerKey:'languageEvidence'});
      support('whFunds','至少NZD4,200生活资金',['能显示足额资金的银行／信用卡账单、汇票或旅行支票等证据'],'证据按资金情况选用；不以家庭年收入替代。',['nzWh'],{answerKey:'whFunds'});
      all('whInsurance','全程医疗保险',['覆盖整个停留期、包括住院的医疗保险证据'],'保险是独立条件，不能用资金或学历替代。',['nzWh'],{answerKey:'insurance'});
      departure(['nzWh']);
      all('application','中国申请人在线申请与补充表',['在线申请所需信息','中国访客／工作／学生适用的补充表'],'按移民局要求及通知补交体检、无犯罪等。',['nzWh']);
      return groups;
    }
    if(a.type==='offer-work') {
      if(a.country==='uk' && a.workCategory==='skilled-worker') {
        all('workApplication','Skilled Worker核心申请信息',['CoS参考号、雇主名称及担保牌照号','岗位名称、职业代码及年薪','英语能力证明及有效护照'],'核心信息同时准备；已有Offer不能替代CoS和其他资格。',['ukWorkDocs']);
        any('maintenance','生活费证明路径',[{id:'own',label:'本人账户至少GBP1,270连续持有28天，末日距申请31天以内'},{id:'employer',label:'CoS注明雇主承担生活费'},{id:'exempt',label:'已持有效签证在英国居住至少12个月，适用生活费证明豁免'}],'选择一条适用路径。同行家属需另行确认各自的生活费要求。',['ukWorkDocs','ukWorkMoney']);
        confirm('workExtra','按个人情况补充的材料','肺结核检测、特定职业无犯罪、ATAS或学历核验按个人情况及雇主要求提供；非英文／威尔士文材料需合规翻译。',[],['ukWorkDocs']);
      } else if(a.country==='new-zealand' && a.workCategory==='aewv') {
        all('workApplication','AEWV雇主及岗位文件',['签署的Offer、聘用协议和岗位描述','雇主发来的申请链接及获批的岗位审核'],'岗位、雇主、工时及其他要求仍需同时符合。',['nzWork']);
        any('qualification','AEWV最低技能证明路径',[{id:'experience',label:'至少两年相关工作经验＋可独立核实的雇佣／工资或税务证据'},{id:'education',label:'NZQCF四级及以上资格＋所需认证／核验'},{id:'exempt',label:'已确认符合官方列明的最低技能豁免'}],'最低技能可按经验或学历等适用路径证明；不能代替雇主的岗位要求。非学士及以上通常还需相关领域资格。',['nzWork']);
        confirm('workExtra','岗位及个人附加条件','按岗位技能等级确认英语要求；职业注册、健康、品行等独立核对，不能以学历路径替代。',[],['nzWork']);
      } else if(a.country==='singapore' && a.workCategory==='ep') {
        all('workApplication','EP身份与雇主资料',['护照个人资料页；姓名不一致时附说明及证明','雇主最新ACRA商业资料'],'本清单针对EP参考路径；其他准证应按雇主确定的类别查阅。',['sgEpDocs']);
        confirm('qualification','学历核验与职业附加材料','只有本次申请需要学历核验时，按MOM认可方式提交；中国学历按对应学历／学位使用正确在线核验报告。专业注册、行业许可按职业补充。',[],['sgEpDocs']);
      } else {
        const name=P.countries.find(c=>c.id===a.country)?.name || '目的地';
        confirm('workApplication',`${name}工作许可专属清单`,'先由雇主确定具体签证／居留类别和主管机关，再取得该类别清单。',['聘用文件及岗位信息','雇主／主管机关签发的许可或证明（如本类别要求）','该岗位实际要求的学历、经验、语言及注册证明'],[source]);
      }
      return groups;
    }
    if(a.country==='japan'||a.country==='korea') {
      const name=a.country==='japan'?'日本':'韩国'; const refs=[source,a.country==='japan'?'jpRegion':'krRegion'];
      localChecklist(name,refs);
      if(japanStudentRoute(a)) {
        all('jpStudent','日本单次旅游学生简化证明',['符合条件的中国高校在读／毕业三年内本科、硕士或博士身份材料','申请表、照片、滞在日程及指定旅行社要求保留的基础文件'],'符合该学生简化条件时可免交经济能力证明；此分支不适用于专科、所有多次签证或未确认的学校／学习形式。',['jpStudent']);
      } else if(a.country==='korea' && a.entry==='single' && a.krConsulate==='chengdu' && a.tripPurpose==='tourism') {
        any('krFinancial','成都领区C-3-9经济证明或免交路径',[
          {id:'bank',label:'近6个月信用卡／储蓄卡流水（原件）'},
          {id:'social',label:'近6个月社保缴费记录'},
          {id:'property',label:'房产或购车证明（原件）'},
          ...(a.studentStatus==='student' ? [{id:'student',label:'学信网可确认的高校在校学籍：验证报告及规定的核验信息'}] : []),
          ...(a.krHukouType==='ordinary' && (['北京','上海'].includes(a.province) || a.province==='广东' && ['guangzhou','shenzhen'].includes(a.krHukouCity)) ? [{id:'hukou',label:'北京／上海／广州／深圳非集体户籍：户口簿及原件'}] : []),
        ],'选择一条适用的证明或免交资格。可使用父母经济材料时，还要另附亲属关系证明。此处仅适用于成都领区公开C-3-9指引，不能套用其他领区或多次签证；递交前确认当期清单。',['krChengdu']);
        if(['parents','shared'].includes(a.funding)) support('krRelation','使用父母经济材料时的关系证明',['户口簿或其他可接受的亲属关系材料'],'选择本人材料或学生免交路径时，不因父母承担旅费就默认额外提交整套父母经济材料。',['krChengdu']);
      } else {
        student(refs);
        support('financial','资金与资助证明',[['parents','shared'].includes(a.funding)?'按受理方要求选用父母资金、来源及亲属关系证明':'按受理方要求选用本人／出资人的可用资金、来源及关系证明'],'先确认本次接受哪种资金证明；不默认流水、存款、收入、房产全部必交。',refs);
      }
      if(a.regionalPolicy==='confirmed') confirm('simplified','已确认的简化／多次申请路径','向确认适用的受理方取得本次具体清单；按其要求准备适用资格及仍需提交的文件，勿自行省略。',[],refs);
      if(a.residence!==a.province || a.applyAt==='other' || a.applyAt==='overseas') confirm('residence','异地受理材料','确认是否接受在读／住宿、居住证或合法居留等材料，并按该受理方要求准备。',[],refs);
    } else if(a.country==='uk') {
      all('application','在线申请与身份核验',['完成对应访客申请及费用步骤','按通知完成预约／生物信息核验'],'具体上传要求以本人的申请清单为准。',['uk','ukDocs']);
      student(['ukDocs']); funding(['ukDocs']);
      support('visitPlan','真实访问计划',['访问目的、预计日期、住宿地址和费用安排'],'提供清晰计划即可；普通访客不把机酒预订、旅行保险、房产或学历证书列为固定必交材料。',['ukDocs']);
    } else if(a.country==='new-zealand') {
      all('application','访客在线申请与照片',['在线申请所需信息及符合要求的照片','按清单提供中国申请人补充资料'],'体检和无犯罪按停留时间、既往情况及通知提供。',['nz']);
      any('nzFinance','生活费用证明路径',[
        {id:'own',label:'本人可用资金：每月NZD1,000＋资金证据'},
        {id:'prepaid',label:'住宿已预付证明＋每月NZD400及资金证据'},
        {id:'sponsor',label:'符合资格的正式担保人＋临时入境担保表及支持材料'},
      ],'三选一完整路径。父母给钱不自动等于正式担保人；自备路径的证据需显示申请人账户及可用金额。',['nz']);
      departure(['nz'], true); student(['nz']);
    } else if(a.country==='schengen') {
      const dest=P.schengen.find(c=>c.id===a.schengenCountry);const refs=['eu',`schengen-${a.schengenCountry}`];
      all('application','申根申请与照片',['已填写的签证申请表','符合要求的照片','按通知提供指纹（豁免者除外）'],'各项同时准备；按主要目的地要求预约。',['eu']);
      all('insurance','申根旅游医疗保险',['覆盖整个申根区及停留期','涵盖紧急医疗、住院和遣返等风险'],'保险与资金、住宿材料是独立要求，不能互相替代。',a.schengenCountry==='nl'?['eu','nlDocs']:['eu']);
      all('visitPlan','访问目的、住宿与离境安排',['访问目的及旅行安排','住宿证明','离境意图及行程证据'],'三类都要覆盖；每类具体可接受的文件按受理国清单选用。',refs);
      const netherlandsTourism = a.schengenCountry==='nl' && a.tripPurpose==='tourism';
      student(netherlandsTourism?['nlDocs']:refs,netherlandsTourism);
      if(!(a.schengenCountry==='nl' && a.funding==='self' && a.tripPurpose==='tourism')) funding(refs);
      if(a.schengenCountry==='nl' && a.funding==='self' && a.tripPurpose==='tourism') all('nlFunds','荷兰自付费用证明',['最近3个月本人银行流水',...(a.studentStatus==='employed'?['最近3期工资单']:[])],'只对本人承担费用的分支显示，不要求在读生提供本人工作工资单。',['nlDocs']);
      confirm('nationalChecklist',`${dest?.name||'主要目的地'}补充清单`,netherlandsTourism?'荷兰旅游清单要求学生提供在读课程及学习期限；行程预订不要求已付款机票。其他居住地及个案要求仍需确认。':'按所选国家及递交地取得最终清单；各国资金证据、翻译及身份补件可能不同。',[],netherlandsTourism?['nlDocs']:refs);
    } else if(a.country==='australia') {
      all('application','Visitor 600在线申请',['在ImmiAccount选择适用的600签证分支','按本人账号清单上传材料、缴费及回应补件'],'每位申请人分别申请；不要直接套用462打工度假的材料清单。',['auVisit']);
      support('visitPlan','访问目的与资金支持',['真实旅游／探亲安排','可用旅行费用及来源','学习／工作及离境安排的相关证据'],'具体文件按ImmiAccount个性化清单确认，先不要将机酒行程付款定死。',['auVisit']);
      confirm('localChecklist','本人的ImmiAccount材料清单','在账号内确认适用的身份、资助、健康及品行材料。使馆公开页面不等于完整个人清单。',[],['auVisit']);
    } else if(a.country==='usa') {
      all('application','美国访客申请与面谈材料',['DS-160申请确认页','按要求面谈前缴费时的付款收据','DS-160照片上传；上传失败时按规格携带纸质照片'],'携带符合有效期要求的护照；收据和纸质照片按相应条件准备。面谈资格、预约及当地递交流程另向使领馆确认。',['usDocs']);
      support('visitPlan','访问目的与回国安排',['旅行计划及费用来源','按情况提供在读／工作、离境安排的证据'],'普通旅游不把境外邀请函、经济担保书、房产和已付款机票统一列为必交材料。具体补件由受理方决定。',['usDocs']);
    }
    if((a.tripPurpose==='visiting'||a.relatives==='host') && !['usa','japan','korea'].includes(a.country)) support('invitation','亲友访问支持',['访问对象、关系及住宿／费用承担的说明'],'只在亲友访问或亲友提供支持时准备；具体邀请格式依目的地而定。');
    if(a.refusal==='yes'||a.overstay==='yes') support('history','既往记录说明',['既往决定文件、事实说明及之后的情况变化'],'按申请问题如实披露；具体需提交的文件以本次要求为准。');
    return groups;
  }
  function resolve(item, answers, prepared) {
    const selected = item.answerKey ? ({yes:'ready',no:'missing',unknown:'unknown'}[answers[item.answerKey]]||'unknown') : prepared[item.id]||'unknown';
    const chosen = item.mode==='any' ? item.requirements.find(r=>selected===`ready:${r.id}`) : null;
    const status = item.mode==='any' ? chosen?'ready':['missing','partial'].includes(selected)?selected:'unknown' : ['ready','missing','partial'].includes(selected)?selected:'unknown';
    return {...item,status,selection:selected,chosen:chosen?.label||null};
  }
  const api={plan,resolve,labels,japanStudentRoute};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  else root.VisaMaterials=api;
})(typeof globalThis!=='undefined'?globalThis:this);
