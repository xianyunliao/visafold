const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const P=require('../policy-data.js');
const defaults={country:'new-zealand',type:'tourism',passportType:'ordinary',passport:'yes',age:'18-22',studentStatus:'student',education:'bachelor',graduation:'later',province:'四川',residence:'四川',applyAt:'residence',residenceProof:'ready',residenceDuration:'long',tripPurpose:'tourism',departure:'2027-07',days:'8-15',entry:'single',returnPlan:'clear',funding:'parents',incomeFamily:'30-60',budget:'medium',availableFunds:'enough',history:['none'],refusal:'no',overstay:'no',relatives:'none'};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',r=>r.abort());await page.goto(process.env.VISAFOLD_URL || 'http://127.0.0.1:4173');
  const seed=async(step,overrides={},prepared={})=>{
   await page.evaluate(s=>localStorage.setItem('visafold-state-v2',JSON.stringify(s)),{version:P.version,step,started:true,answers:{...defaults,...overrides},prepared});
   await page.reload();await page.waitForLoadState('networkidle');
  };
  const next=()=>page.locator('[data-action="next"]').click();
  const report=async()=>{for(let i=0;i<8 && await page.locator('[data-action="next"]').count();i++)await next();assert.ok(await page.locator('.readiness').count());};
  await seed('materials');
  assert.match(await page.locator('#field-doc-nzFinance-wrap').innerText(),/任选一条完整路径/);
  assert.equal(await page.locator('#field-doc-nzFinance option[value="ready"]').count(),0);
  await page.selectOption('#field-doc-nzFinance','ready:prepaid');
  await page.selectOption('#field-doc-departure','ready:funds');
  await page.reload();await page.waitForLoadState('networkidle');
  assert.equal(await page.locator('#field-doc-nzFinance').inputValue(),'ready:prepaid');
  await page.screenshot({path:'/tmp/visafold-personal-materials.png',fullPage:true});
  await report();
  assert.match(await page.locator('.material-report .chosen-path').first().innerText(),/预付.*400/);
  assert.match(await page.locator('.readiness strong').innerText(),/^2/);
  await page.locator('[data-action="copy"]').click();
  if(await page.locator('dialog').count()){
   const text=await page.locator('dialog pre').innerText();assert.match(text,/任选一条完整路径/);assert.match(text,/已选路径：.*预付/);
   await page.locator('dialog button').click();
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await seed('funding',{country:'japan',jpStudent:'yes',regionalPolicy:'unknown'});
  assert.equal(await page.locator('#field-funding,#field-incomeSelf,#field-incomeFamily').count(),0);
  await report();
  assert.match(await page.locator('.material-report').innerText(),/日本单次旅游学生简化证明/);
  assert.equal(await page.locator('.material-report h4').filter({hasText:'资金与资助证明'}).count(),0);
  await seed('materials',{country:'korea',krConsulate:'chengdu',regionalPolicy:'unknown'});
  await page.selectOption('#field-doc-krFinancial','ready:student');await report();
  assert.match(await page.locator('.chosen-path').innerText(),/在校学籍/);
  await seed('work',{country:'singapore',type:'working-holiday',studyRegion:'eligible',schoolResidence:'yes'});
  assert.equal(await page.locator('#field-languageEvidence,#field-insurance,#field-whSlot').count(),0);
  await report();assert.match(await page.locator('.material-report').innerText(),/在读生院校材料/);
  await seed('materials',{country:'uk',type:'offer-work',offer:'signed',workCategory:'skilled-worker',sponsor:'yes',salaryCheck:'yes',qualification:'ready'});
  await page.selectOption('#field-doc-maintenance','ready:employer');await report();
  assert.match(await page.locator('.chosen-path').innerText(),/CoS/);
  await seed('work',{country:'new-zealand',type:'working-holiday',previousWh:'no',highSchool:'yes',whFunds:'yes',languageEvidence:'yes',insurance:'yes',whSlot:'yes'});
  await next();assert.equal(await page.locator('#field-doc-whEducation,#field-doc-whFunds,#field-doc-whLanguage,#field-doc-whInsurance').count(),0);
  assert.equal(errors.length,0,errors.join('\n'));await context.close();
  console.log('PASS: mobile alternative paths, saved selection, group progress, text export, Japanese student simplification, Chengdu student exemption, SG WH no redundant language/insurance, UK CoS maintenance, NZ prior-answer reuse.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
