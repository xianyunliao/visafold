/* Run with a local static server on 4173; PLAYWRIGHT_MODULE can point at a bundled install. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const baseUrl = process.env.VISAFOLD_URL || 'http://127.0.0.1:4173';
const defaults = {
  passportType:'ordinary',passport:'yes',age:'18-22',studentStatus:'student',education:'bachelor',studyRegion:'mainland',graduation:'later',
  province:'四川',residence:'上海',applyAt:'residence',residenceProof:'ready',residenceDuration:'long',
  tripPurpose:'tourism',departure:'2027-07',days:'8-15',entry:'single',companions:'friends',returnPlan:'clear',
  funding:'parents',incomeSelf:'none',incomeFamily:'30-60',budget:'medium',availableFunds:'enough',domesticTies:'study',
  refusal:'no',overstay:'no',relatives:'none',
};
async function setup(browser, viewport) {
  const context = await browser.newContext({viewport,acceptDownloads:true});
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror',error => errors.push(error.message));
  await page.route('https://**/*',route => route.abort());
  await page.goto(baseUrl); await page.waitForLoadState('networkidle');
  return {context,page,errors};
}
const next = page => page.locator('[data-action="next"]').click();
async function fill(page,overrides={}) {
  const values={...defaults,...overrides};
  const filled = new Set();
  while (true) {
    const names = await page.locator('select[data-question]').evaluateAll(selects=>selects.map(select=>select.dataset.question));
    const name = names.find(id=>!filled.has(id));
    if (!name) break;
    filled.add(name);
    const select = page.locator(`select[data-question="${name}"]`);
    const options=await select.locator('option').evaluateAll(options => options.map(o=>o.value));
    const value=values[name] || (name.startsWith('doc:') ? name==='doc:student'?'ready':'missing' : options.includes('unknown')?'unknown':options[1]);
    await select.selectOption(value);
  }
  const noHistory=page.locator('[data-multi][data-value="none"]');
  if (await noHistory.count() && await noHistory.getAttribute('aria-pressed')!=='true') await noHistory.click();
  assert.equal(await page.locator('input,textarea,[contenteditable="true"]').count(),0,'questionnaire must never require typing');
}
async function complete(page,overrides={}) {
  for(let i=0;i<14 && await page.locator('[data-action="next"]').count();i++) { await fill(page,overrides); await next(page); }
  assert.ok(await page.locator('.readiness').count(),`report must be reachable; stopped at: ${await page.locator('#stepTitle').innerText()}`);
}
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    const {page,context,errors}=await setup(browser,{width:1440,height:1000});
    await page.locator('#startButton').click();
    await next(page); assert.equal(await page.locator('#validationSummary').isVisible(),true);
    await page.locator('[data-country="japan"]').click(); await next(page);
    assert.equal(await page.locator('[data-type="working-holiday"]').isDisabled(),true);
    await page.locator('[data-type="tourism"]').click();
    assert.match(await page.locator('#stepTitle').innerText(),/为什么出发/,'choosing type must not jump to destination');
    await next(page); await next(page);
    assert.equal(await page.locator('#validationSummary').isVisible(),true);
    assert.deepEqual(await page.locator('#field-age option').allTextContents(),['请选择','18–22 岁','22–29 岁','30 岁及以上']);
    await fill(page); await next(page);
    await fill(page); await page.reload(); await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('#field-province').inputValue(),'四川');
    assert.equal(await page.locator('#field-residence').inputValue(),'上海');
    await next(page); await complete(page);
    assert.ok((await page.locator('.material-report').innerText()).includes('父母'));
    assert.match(await page.locator('.report-section').first().innerText(),/户籍：四川.*常住：上海/);
    assert.equal(await page.locator('.score').count(),1);
    assert.match(await page.locator('.score').innerText(),/^\d+$/);
    assert.match(await page.locator('.score-factors').innerText(),/户籍与常住申请地一致|异地申请依据/);
    await page.screenshot({path:'/tmp/visafold-v2-desktop.png',fullPage:true,animations:'disabled'});
    const downloadPromise=page.waitForEvent('download');
    await page.locator('[data-action="download"]').click();
    const download=await downloadPromise; await download.saveAs('/tmp/visafold-v2-report.png');
    assert.ok(fs.statSync('/tmp/visafold-v2-report.png').size>10000);
    await page.locator('[data-action="copy"]').click();
    assert.ok(await page.locator('#exportStatus').count());
    // Close fallback dialog if permission is unavailable in this browser.
    if(await page.locator('dialog').count()) await page.locator('dialog button').click();
    await page.locator('[data-action="edit"]').click();
    assert.match(await page.locator('#stepTitle').innerText(),/学习与个人/,'editing must leave result');
    await page.selectOption('#field-studentStatus','recent-grad');
    assert.equal(await page.locator('#field-graduation').count(),0);
    if(await page.locator('#field-jpStudent').count()) await page.selectOption('#field-jpStudent','unknown');
    await next(page); await complete(page);
    assert.equal(await page.locator('.material-report h4').filter({hasText:'在读证明与返校安排'}).count(),0);
    assert.ok(await page.locator('.material-report h4').filter({hasText:'当前身份与回国安排'}).count());
    // Changing a route clears destination-specific answers and document statuses.
    await page.locator('[data-action="edit"]').click(); await page.locator('[data-action="back"]').click();
    await page.locator('[data-action="back"]').click();
    await page.locator('[data-country="singapore"]').click(); await next(page);
    await page.locator('[data-type="tourism"]').click(); await next(page); await complete(page);
    assert.match(await page.locator('.result-card').innerText(),/免签/);
    assert.equal(await page.locator('.score').count(),0);
    assert.ok(await page.locator('.material-report h4').filter({hasText:'SG Arrival Card'}).count());
    assert.equal(await page.locator('.material-report article').count(),3);
    assert.equal(errors.length,0,errors.join('\n'));
    await context.close();

    const mobile=await setup(browser,{width:390,height:844});
    await mobile.page.locator('#startButton').click();
    await mobile.page.locator('[data-country="schengen"]').click();
    assert.equal(await mobile.page.locator('#field-schengenCountry option').count(),30);
    await mobile.page.selectOption('#field-schengenCountry','fr'); await next(mobile.page);
    await mobile.page.locator('[data-type="tourism"]').click(); await next(mobile.page);
    await complete(mobile.page,{mainDestination:'longest',schengenPrior:'within',days:'91-180'});
    assert.match(await mobile.page.locator('.result-card').innerText(),/需要调整/);
    assert.ok(Number(await mobile.page.locator('.score').innerText())<=25);
    assert.ok((await mobile.page.locator('.result-card').innerText()).includes('超过90天'));
    assert.ok(await mobile.page.locator('a').filter({hasText:'法国'}).count());
    assert.equal(await mobile.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'mobile must not overflow horizontally');
    await mobile.page.screenshot({path:'/tmp/visafold-v2-mobile.png',fullPage:true,animations:'disabled'});
    assert.equal(mobile.errors.length,0,mobile.errors.join('\n')); await mobile.context.close();

    const wh=await setup(browser,{width:390,height:844});
    await wh.page.locator('#startButton').click(); await wh.page.locator('[data-country="new-zealand"]').click(); await next(wh.page);
    await wh.page.locator('[data-type="working-holiday"]').click(); await next(wh.page);
    await complete(wh.page,{age:'30+',nzAge:'31+',residence:'四川',tripPurpose:'employment',previousWh:'no',highSchool:'yes',whFunds:'yes',languageEvidence:'yes',insurance:'yes',whSlot:'yes'});
    assert.match(await wh.page.locator('.result-card').innerText(),/18至30岁/);
    assert.equal(wh.errors.length,0,wh.errors.join('\n')); await wh.context.close();

    const sgWh=await setup(browser,{width:390,height:844});
    await sgWh.page.locator('#startButton').click(); await sgWh.page.locator('[data-country="singapore"]').click(); await next(sgWh.page);
    await sgWh.page.locator('[data-type="working-holiday"]').click(); await next(sgWh.page);
    await complete(sgWh.page,{age:'22-29',sgAge:'26-29',studyRegion:'eligible',schoolResidence:'yes',tripPurpose:'employment',languageEvidence:'unknown',insurance:'unknown',whSlot:'unknown'});
    assert.match(await sgWh.page.locator('.result-card').innerText(),/18至25岁/);
    assert.match(await sgWh.page.locator('.material-report').innerText(),/在读生院校材料.*本组各项都要准备/s);
    assert.doesNotMatch(await sgWh.page.locator('.material-report').innerText(),/认可英语证据|全程医疗保险/);
    assert.equal(sgWh.errors.length,0,sgWh.errors.join('\n')); await sgWh.context.close();
    console.log('PASS: selection-only flow, validation, type navigation, persistence, editable reports, material recalculation, downloads, SG exemption, 29 Schengen countries, overstay limit, NZ/SG age boundaries, mobile layout, no page errors.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
