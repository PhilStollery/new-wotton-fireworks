import test from 'node:test';
import assert from 'node:assert/strict';
import {upstream} from './fixtures.mjs';
let version=0;
async function scenario(options, run) {
  const original=global.fetch; const oldToken=process.env.TITO_API_TOKEN_TEST; const oldContext=process.env.CONTEXT;
  process.env.TITO_API_TOKEN_TEST='mock'; process.env.CONTEXT='deploy-preview';
  const fixture=upstream(options); let calls=0;
  global.fetch=async(url)=>{calls++; await Promise.resolve();return Response.json(String(url).includes('/releases?')?{releases:fixture.releases}:{activities:fixture.activities});};
  const {default:handler}=await import(`../netlify/functions/ticket-availability.mjs?scenario=${++version}`);
  try {await run(handler,()=>calls,fixture);} finally {global.fetch=original;if(oldToken===undefined)delete process.env.TITO_API_TOKEN_TEST;else process.env.TITO_API_TOKEN_TEST=oldToken;if(oldContext===undefined)delete process.env.CONTEXT;else process.env.CONTEXT=oldContext;}
}
test('event capacity caps all admission bands and preschool',async()=>scenario({eventRemaining:2},async handler=>{
  const data=await (await handler()).json();assert.equal(data.ok,true);
  assert.deepEqual(data.waves.map(x=>x.remaining),[2,2,2]);
  assert.equal(data.parkingGroups.find(x=>x.key==='preschool').remaining,2);
}));
test('exhausted event cannot expose a current band',async()=>scenario({eventRemaining:0},async handler=>{
  const data=await (await handler()).json();assert.equal(data.currentWave,null);assert.ok(data.waves.every(x=>x.soldOut));
}));
test('wave progression and parking share authoritative pools',async()=>scenario({superRemaining:0,advanceRemaining:1,parkingRemaining:3},async handler=>{
  const data=await (await handler()).json();assert.equal(data.currentWave.key,'advance');
  const parking=data.parkingGroups.find(x=>x.key==='parking');assert.equal(parking.remaining,3);assert.equal(parking.releases.length,2);
}));
test('100 simultaneous requests deduplicate to two upstream requests',async()=>scenario({},async(handler,calls)=>{
  const responses=await Promise.all(Array.from({length:100},()=>handler()));
  assert.ok(responses.every(x=>x.status===200));assert.equal(calls(),2);
  await handler();assert.equal(calls(),2);
}));
test('upstream failures are backed off and stale responses are explicit',async()=>scenario({},async(handler,calls)=>{
  await handler();const realNow=Date.now;Date.now=()=>realNow()+11000;
  global.fetch=async()=>{throw Error('offline');};
  try {const response=await handler();const data=await response.json();assert.equal(data.stale,true);assert.equal(response.headers.get('Netlify-CDN-Cache-Control'),'no-store');assert.ok(data.fetchedAt);await handler();}
  finally {Date.now=realNow;}
}));
test('availability rejects write methods',async()=>scenario({},async(handler,calls)=>{
  assert.equal((await handler(new Request('https://test/api/ticket-availability',{method:'POST'}))).status,405);assert.equal(calls(),0);
}));
