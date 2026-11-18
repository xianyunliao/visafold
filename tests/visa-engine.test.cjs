const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../policy-data.js');
const E = require('../visa-engine.js');
const base = { country:'japan', type:'tourism', age:'18-22', passportType:'ordinary', passport:'yes', studentStatus:'student', education:'bachelor', studyRegion:'mainland', province:'四川', residence:'四川', residenceProof:'ready', residenceDuration:'long', applyAt:'residence', funding:'parents', incomeSelf:'none', incomeFamily:'30-60', budget:'medium', availableFunds:'enough', departure:'2027-07', days:'8-15', tripPurpose:'tourism', entry:'single', history:['none'], refusal:'no', overstay:'no', returnPlan:'clear', companions:'friends' };
const evaluate = changes => E.buildReport({ ...base, ...changes }, {}, new Date('2026-11-18T04:00:00Z'));

test('reference scoring is explicit and unknown data cannot confirm eligibility', () => {
  const r = evaluate({});
  assert.equal(typeof r.assessment.value, 'number');
  assert.match(r.assessment.note,/不代表实际获签概率/);
  assert.equal(r.assessment.value, r.assessment.base + r.assessment.factors.reduce((sum, f) => sum + f.points, 0));
  assert.equal(E.eligibility({}).code, 'pending');
  assert.match(evaluate({}).eligibility.title, /待确认/);
});
test('Japan and Korea award a disclosed bonus only for confirmed hukou convenience', () => {
  for (const country of ['japan','korea']) {
    const ordinary = evaluate({country,regionalPolicy:'unknown'}).assessment;
    const confirmed = evaluate({country,regionalPolicy:'confirmed'}).assessment;
    assert.equal(confirmed.value - ordinary.value,6);
    const bonus = confirmed.factors.find(f=>f.id === 'hukou-benefit');
    assert.equal(bonus.points,6);
    assert.match(bonus.detail,/根据你的选择/);
    assert.ok(bonus.refs.length);
    assert.ok(!ordinary.factors.some(f=>f.id === 'hukou-benefit'));
  }
  assert.equal(evaluate({country:'uk',regionalPolicy:'confirmed'}).assessment.value,evaluate({country:'uk'}).assessment.value);
  assert.equal(evaluate({province:'上海',residence:'上海'}).assessment.value,evaluate({province:'四川',residence:'四川'}).assessment.value);
});
test('background score responds to funding, history and work evidence; materials remain supplementary', () => {
  assert.ok(evaluate({availableFunds:'enough'}).assessment.value > evaluate({availableFunds:'short'}).assessment.value);
  assert.ok(evaluate({history:['usa']}).assessment.value > evaluate({history:['none']}).assessment.value);
  assert.ok(evaluate({refusal:'no'}).assessment.value > evaluate({refusal:'yes'}).assessment.value);
  const unprepared = E.buildReport(base,{});
  const prepared = E.buildReport(base,Object.fromEntries(E.materialPlan(base).map(m=>[m.id,'ready'])));
  assert.deepEqual(unprepared.assessment,prepared.assessment);
  assert.ok(prepared.ready>unprepared.ready);
  assert.ok(evaluate({type:'offer-work',offer:'signed',sponsor:'yes',salaryCheck:'yes',qualification:'ready'}).assessment.value > evaluate({type:'offer-work',offer:'written',sponsor:'unknown',salaryCheck:'unknown',qualification:'unknown'}).assessment.value);
});
test('hard eligibility limits control scores and exemption or unsupported routes do not invent one', () => {
  assert.ok(evaluate({country:'schengen',schengenCountry:'fr',days:'91-180',history:['usa'],regionalPolicy:'confirmed'}).assessment.value<=25);
  assert.equal(evaluate({country:'japan',type:'working-holiday'}).assessment.value,null);
  assert.equal(evaluate({country:'singapore'}).assessment.value,null);
  for (const changes of [{history:['usa'],domesticTies:'study',regionalPolicy:'confirmed'},{passport:'no',availableFunds:'short',refusal:'yes',overstay:'yes',returnPlan:'none'},{country:'uk',history:['usa'],domesticTies:'study'}]) {
    const a = evaluate(changes).assessment;
    assert.ok(a.value>=0 && a.value<=100);
    assert.equal(a.value,a.base+a.factors.reduce((sum,f)=>sum+f.points,0));
  }
});
test('hukou changes routing context without inventing regional approval rates', () => {
  const original = evaluate({}); const changed = evaluate({ province:'上海', residence:'四川' });
  assert.deepEqual(original.eligibility,changed.eligibility);
  assert.notDeepEqual(original.region.details,changed.region.details);
  assert.ok(changed.materials.some(m => m.id === 'residence'));
});
test('parent funding produces relationship and sponsor evidence; self funding differs', () => {
  const parent = evaluate({}); const self = evaluate({ funding:'self' });
  assert.ok(parent.materials.some(m => m.id === 'sponsor'));
  assert.ok(parent.materials.some(m => m.id === 'sponsorFunds'));
  assert.ok(self.materials.some(m => m.id === 'ownFunds'));
  assert.ok(!self.materials.some(m => m.id === 'sponsor'));
  assert.notDeepEqual(parent.notes,evaluate({ incomeFamily:'under15' }).notes);
});
test('readiness measures current material selections, not approval; irrelevant cached items are excluded', () => {
  const result = E.buildReport(base,{student:'ready',ownFunds:'ready',sponsor:'missing'});
  assert.equal(result.ready,1);
  assert.equal(result.materials.find(m => m.id === 'passport').status,'unknown');
});
test('Singapore exemption is limited to applicable short tourism', () => {
  assert.equal(evaluate({ country:'singapore', days:'16-30' }).eligibility.code,'exempt');
  assert.equal(evaluate({ country:'singapore', days:'31-90' }).eligibility.code,'blocked');
  assert.equal(evaluate({ country:'singapore', passport:'no' }).eligibility.code,'blocked');
  assert.equal(evaluate({ country:'singapore', tripPurpose:'employment' }).eligibility.code,'blocked');
  assert.ok(!evaluate({ country:'singapore' }).materials.some(m => m.id === 'application'));
  assert.ok(evaluate({ country:'singapore' }).materials.some(m => m.id === 'arrival'));
});
test('non-applicable holiday projects cannot become positive from financial or education answers', () => {
  assert.equal(evaluate({ country:'uk', type:'working-holiday' }).eligibility.code,'blocked');
  for (const country of ['japan','korea','usa','schengen']) assert.equal(evaluate({country,type:'working-holiday'}).eligibility.code,'unsupported');
  assert.equal(evaluate({country:'australia',type:'working-holiday'}).eligibility.code,'pending');
});
test('Singapore age boundary and university residency must both be checked', () => {
  const wh = {country:'singapore',type:'working-holiday',studyRegion:'eligible',schoolResidence:'yes'};
  assert.equal(evaluate({...wh,age:'22-29',sgAge:'22-25'}).eligibility.code,'initial');
  assert.equal(evaluate({...wh,age:'22-29',sgAge:'26-29'}).eligibility.code,'blocked');
  assert.equal(evaluate({...wh,age:'22-29'}).eligibility.code,'pending');
  assert.equal(evaluate({...wh,studyRegion:'mainland'}).eligibility.code,'blocked');
  assert.equal(evaluate({...wh,schoolResidence:'unknown'}).eligibility.code,'pending');
});
test('New Zealand permits 30 but not 31, and checks prior issue, location and funds', () => {
  const wh={country:'new-zealand',type:'working-holiday',age:'30+',nzAge:'30',previousWh:'no',highSchool:'yes',whFunds:'yes',languageEvidence:'yes',insurance:'yes',whSlot:'yes'};
  assert.equal(evaluate(wh).eligibility.code,'initial');
  for (const change of [{nzAge:'31+'},{previousWh:'yes'},{residence:'overseas'},{whFunds:'no'}]) assert.equal(evaluate({...wh,...change}).eligibility.code,'blocked');
  assert.equal(evaluate({...wh,nzAge:'unknown'}).eligibility.code,'pending');
});
test('all 29 Schengen countries have a country-specific official entry, with cumulative stay check', () => {
  assert.equal(P.schengen.length,29);
  for (const country of P.schengen) {
    const result=evaluate({country:'schengen',schengenCountry:country.id,mainDestination:'single',schengenPrior:'within'});
    assert.ok(result.sources.some(s => s.url === country.url));
    assert.match(result.region.title,new RegExp(country.name));
  }
  assert.equal(evaluate({country:'schengen',schengenCountry:'fr',days:'91-180'}).eligibility.code,'blocked');
  assert.equal(evaluate({country:'schengen',schengenCountry:'fr',schengenPrior:'over'}).eligibility.code,'blocked');
});
test('offer work stays separate from visitor rules and does not equate a contract with permission', () => {
  const work=evaluate({country:'uk',type:'offer-work',offer:'signed',sponsor:'yes',salaryCheck:'yes',workCategory:'known',qualification:'ready'});
  assert.equal(work.eligibility.code,'pending');
  assert.ok(work.sources.some(s => s.id === 'ukWork'));
  assert.ok(!work.sources.some(s => s.id === 'uk'));
  assert.equal(evaluate({type:'offer-work',offer:'none'}).eligibility.code,'blocked');
  const swiss=evaluate({country:'schengen',schengenCountry:'ch',type:'offer-work',offer:'signed'});
  assert.equal(swiss.sources[0].id,'schengen-ch');
  assert.ok(!swiss.region.details.some(t => t.includes('等长时按首入国')));
});
test('all important risks survive, and near-date Schengen reports explain uncertainty', () => {
  const r=evaluate({country:'schengen',schengenCountry:'fr',days:'91-180',refusal:'yes',overstay:'yes',availableFunds:'short',entry:'multiple',departure:'2026-11',domesticTies:'property',returnPlan:'none'});
  assert.ok(r.notes.length > 4);
  for (const id of ['rolling-limit','history','funds','time-short']) assert.ok(r.notes.some(n => n.id===id));
  assert.ok(r.sources.every(s => s.url?.startsWith('https://') && s.scope));
});
