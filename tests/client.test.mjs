import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const eventCode=fs.readFileSync(new URL('../js/event-data-2026.js',import.meta.url),'utf8');
const mainCode=fs.readFileSync(new URL('../js/fireworks-2026.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
function data(remaining=3) {
  const group=(key,label,kind,slugs,limit)=>({key,label,kind,remaining:limit,displayRemaining:limit,remainingKnown:true,counterMode:kind==='parking'?'parking-shared':key==='preschool'?'ticket-reminder':'capacity',releases:slugs,releaseDetails:slugs.map(slug=>({slug,title:label+': Adult',price:6,position:1}))});
  const waves=[group('super-saver','Super Saver','admission',['super'],3),group('advance','Advance','admission',['advance'],7),group('standard','Standard','admission',['standard'],remaining)];
  return {ok:true,testMode:true,event:'test/test',waves,currentWave:waves[0],admissionCapacity:{remaining},parkingGroups:[group('preschool','Pre-school','standalone',['preschool'],remaining),group('parking','Parking','parking',['parking','blue'],2)]};
}
async function setup({main=false,failure=false,pending=false,url='https://example.test/go/kingswood'}={}) {
  const dom=new JSDOM(html,{url,runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window; const frames=[]; const timers=[]; const writes=[];let calls=0;let payload=data();let postFailure=false;
  w.HTMLElement.prototype.scrollIntoView=function(){};
  if(pending){
    const record=pending===true?{slug:'mock-booking',reference:'mock-proof',savedAt:Date.now()}:pending;
    w.localStorage.setItem('wfdPendingPostPurchase2026',JSON.stringify(record));
  }
  w.CSS={escape:s=>s};w.matchMedia=()=>({matches:false});w.AbortSignal=AbortSignal;
  w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
  w.setTimeout=(fn,delay)=>{timers.push({fn,delay});return timers.length;};w.clearTimeout=id=>{if(timers[id-1])timers[id-1].cancelled=true;};
  w.fetch=async(url,init)=>{calls++;if(failure)throw Error('offline');if(String(url).includes('post-purchase')){if(postFailure)throw Error('save offline');writes.push(JSON.parse(init.body));return Response.json({ok:true});}return Response.json(payload);};
  w.eval(eventCode);if(main)w.eval(mainCode);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const settle=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));let n=0;while(frames.length&&n++<30){frames.shift()();await Promise.resolve();}assert.ok(n<30,'presentation must settle without a render loop');};
  if(!main)await w.fetch('/api/ticket-availability');await settle();
  return {w,dom,timers,frames,writes,settle,calls:()=>calls,setPayload:p=>payload=p,clearFailure:()=>failure=false,setPostFailure:v=>postFailure=Boolean(v)};
}
test('initial failure retries; page structure, FAQ, and attribution remain usable',async()=>{
  const t=await setup({main:true,failure:true});try{
    assert.match(t.w.document.querySelector('#tito-mount').textContent,/temporarily unavailable/);
    assert.match(t.w.document.querySelector('#source-support').textContent,/Kingswood/);
    assert.ok(t.w.document.querySelectorAll('#faq-list details').length>10);
    const retry=t.timers.find(x=>x.delay===60000);assert.ok(retry);
    t.clearFailure();await retry.fn();await t.settle();
    assert.ok(t.w.document.querySelector('tito-widget'));
    assert.equal(t.w.document.querySelector('tito-widget').getAttribute('source'),'Kingswood');
  }finally{t.dom.window.close();}
});
test('KLB route credits KLB Friends while preserving the KLB Tito source',async()=>{
  const t=await setup({main:true,url:'https://example.test/go/klb'});try{
    const support=t.w.document.querySelector('#source-support');
    assert.equal(support.hidden,false);
    assert.match(support.textContent,/KLB Friends/);
    const widget=t.w.document.querySelector('tito-widget');
    assert.ok(widget);
    assert.equal(widget.getAttribute('source'),'KLB');
    const prefill=JSON.parse(widget.getAttribute('prefill'));
    assert.equal(prefill.metadata.source_route,'klb');
    assert.equal(prefill.metadata.utm_source,'klb_friends');
  }finally{t.dom.window.close();}
});
function rows(t){
  const mount=t.w.document.querySelector('#tito-mount');mount.innerHTML='';
  for(const [key,slug,kind] of [['super-saver','super','admission'],['advance','advance','admission'],['standard','standard','admission'],['preschool','preschool','standalone'],['parking','parking','parking']]){
    mount.insertAdjacentHTML('beforeend',`<div class="wfd-group-counter" data-wfd-group-counter="${key}" data-wfd-group-kind="${kind}"></div><div class="wfd-release-row" data-wfd-group="${key}" data-wfd-release="${slug}" data-wfd-group-kind="${kind}"><input type="number" value="0"><button aria-label="Increase quantity">+</button></div>`);
  }
}
test('preschool consumes event capacity; correction warning survives transient hints until OK',async()=>{
  const t=await setup();try{
    rows(t);const input=t.w.document.querySelector('[data-wfd-release="preschool"] input');
    input.value='5';input.dispatchEvent(new t.w.Event('input',{bubbles:true}));await t.settle();
    assert.equal(input.value,'3');let warning=t.w.document.querySelector('.wfd-capacity-message[data-requires-acknowledgement="true"]');assert.ok(warning);assert.ok(warning.querySelector('button'));
    t.w.document.querySelector('[data-wfd-release="preschool"] button').click();await t.settle();
    assert.equal(warning.dataset.requiresAcknowledgement,'true');assert.ok(warning.isConnected);
    const transient=t.timers.find(x=>x.delay===6500&&!x.cancelled);
    if(transient){transient.fn();await t.settle();assert.ok(warning.isConnected);}
    warning.querySelector('button').click();assert.ok(!warning.isConnected);
  }finally{t.dom.window.close();}
});
test('background availability decrease corrects an existing selection',async()=>{
  const t=await setup();try{
    rows(t);const input=t.w.document.querySelector('[data-wfd-release="preschool"] input');input.value='3';await t.settle();
    t.setPayload(data(1));await t.w.fetch('/api/ticket-availability');await t.settle();
    assert.equal(input.value,'1');assert.ok(t.w.document.querySelector('.wfd-capacity-message[data-requires-acknowledgement="true"]'));
  }finally{t.dom.window.close();}
});
test('reallocation warnings sit below the source ticket and stack until acknowledged',async()=>{
  const t=await setup();try{
    t.setPayload(data(10));await t.w.fetch('/api/ticket-availability');await t.settle();
    rows(t);const row=t.w.document.querySelector('[data-wfd-release="super"]');const input=row.querySelector('input');input.value='3';await t.settle();
    row.querySelector('button').click();row.querySelector('button').click();await t.settle();
    const warnings=[...t.w.document.querySelectorAll('.wfd-capacity-message[data-requires-acknowledgement="true"]')];
    assert.equal(warnings.length,2);assert.equal(row.nextElementSibling,warnings[0]);assert.equal(warnings[0].nextElementSibling,warnings[1]);
    warnings[0].querySelector('button').click();assert.equal(t.w.document.querySelectorAll('.wfd-capacity-message[data-requires-acknowledgement="true"]').length,1);
  }finally{t.dom.window.close();}
});
test('zero quantity inputs remain valid after automatic correction',async()=>{
  const t=await setup();try{
    rows(t);const input=t.w.document.querySelector('[data-wfd-release="advance"] input');input.min='1';input.value='0';await t.settle();
    assert.equal(input.min,'0');assert.equal(input.validationMessage,'');
  }finally{t.dom.window.close();}
});
test('native quantity maximum is enforced and Continue waits for acknowledgement',async()=>{
  const t=await setup();try{
    const payload=data(500);
    payload.waves[0].remaining=300;
    payload.waves[0].displayRemaining=300;
    payload.admissionCapacity.remaining=500;
    t.setPayload(payload);
    await t.w.fetch('/api/ticket-availability');
    await t.settle();
    rows(t);
    const mount=t.w.document.querySelector('#tito-mount');
    mount.insertAdjacentHTML('beforeend','<div class="tito-widget-form"><div class="tito-form-actions"><button type="button">Continue</button></div></div>');
    const input=t.w.document.querySelector('[data-wfd-release="super"] input');
    input.max='100';input.value='290';
    input.dispatchEvent(new t.w.Event('input',{bubbles:true}));await t.settle();
    assert.equal(input.value,'100');assert.equal(input.validity.rangeOverflow,false);
    const warning=t.w.document.querySelector('.wfd-capacity-message[data-requires-acknowledgement="true"]');assert.ok(warning);
    const proceed=t.w.document.querySelector('.tito-form-actions button');
    assert.ok(proceed.classList.contains('wfd-awaiting-ack'));assert.equal(proceed.getAttribute('aria-disabled'),'true');
    let downstream=0;proceed.addEventListener('click',()=>downstream++);
    proceed.click();assert.equal(downstream,0);
    warning.querySelector('button').click();await t.settle();
    assert.ok(!proceed.classList.contains('wfd-awaiting-ack'));assert.notEqual(proceed.getAttribute('aria-disabled'),'true');
    proceed.click();assert.equal(downstream,1);
  }finally{t.dom.window.close();}
});
test('event overflow is reduced rather than transferred to a more expensive band',async()=>{
  const t=await setup();try{
    rows(t);const input=t.w.document.querySelector('[data-wfd-release="super"] input');input.value='5';input.dispatchEvent(new t.w.Event('input',{bubbles:true}));await t.settle();
    assert.equal(input.value,'3');assert.equal(t.w.document.querySelector('[data-wfd-release="advance"] input').value,'0');
    assert.ok(!t.timers.some(x=>x.delay===0&&!x.cancelled));
  }finally{t.dom.window.close();}
});
test('four post-purchase responses are batched into one write and exits wait for save',async()=>{
  const t=await setup({main:true,pending:true});try{
    const root=t.w.document;
    const plan=root.querySelector('#post-purchase-plan-visit');
    const more=root.querySelector('#post-purchase-book-more');
    assert.equal(plan.getAttribute('aria-disabled'),'true');assert.equal(more.disabled,true);
    root.querySelector('[data-post-choice][data-stage="round_table_invite"][data-value="no"]').click();
    root.querySelector('[data-post-choice][data-stage="cancellation"][data-value="refund"]').click();
    root.querySelector('[data-post-choice][data-stage="next_year"][data-value="no"]').click();
    assert.equal(t.writes.length,0);
    assert.equal(t.timers.some(x=>x.delay===160&&!x.cancelled),false);
    root.querySelector('[data-post-choice][data-stage="other_events"][data-value="no"]').click();
    const save=t.timers.find(x=>x.delay===160&&!x.cancelled);assert.ok(save);
    assert.equal(t.writes.length,0);assert.equal(more.disabled,true);
    save.fn();await t.settle();
    assert.equal(t.writes.length,1);
    assert.deepEqual(Object.keys(t.writes[0].answers).sort(),['cancellation','next_year','other_events','round_table_invite']);
    assert.match(root.querySelector('#post-purchase-save-status').textContent,/have been saved/i);
    assert.equal(plan.getAttribute('aria-disabled'),'false');assert.equal(more.disabled,false);
  }finally{t.dom.window.close();}
});
test('successful polling uses 30 seconds and pauses while hidden',async()=>{
  const t=await setup({main:true});try{
    assert.ok(t.timers.some(x=>x.delay===30000&&!x.cancelled));
    Object.defineProperty(t.w.document,'hidden',{value:true,configurable:true});
    t.w.document.dispatchEvent(new t.w.Event('visibilitychange'));
    assert.ok(!t.timers.some(x=>x.delay===30000&&!x.cancelled));
  }finally{t.dom.window.close();}
});

test('Tito custom validity is preserved by presentation corrections',async()=>{
  const t=await setup();try{
    rows(t);
    const input=t.w.document.querySelector('[data-wfd-release="advance"] input');
    input.setCustomValidity('Provider validation');
    input.dispatchEvent(new t.w.Event('change',{bubbles:true}));
    await t.settle();
    assert.equal(input.validationMessage,'Provider validation');
  }finally{t.dom.window.close();}
});
test('form submission cannot bypass an unacknowledged correction',async()=>{
  const t=await setup();try{
    const payload=data(500);
    payload.waves[0].remaining=300;
    payload.waves[0].displayRemaining=300;
    payload.admissionCapacity.remaining=500;
    t.setPayload(payload);
    await t.w.fetch('/api/ticket-availability');
    await t.settle();
    rows(t);
    const mount=t.w.document.querySelector('#tito-mount');
    mount.insertAdjacentHTML('beforeend','<form class="tito-widget-form"><button type="submit">Continue</button></form>');
    const input=t.w.document.querySelector('[data-wfd-release="super"] input');
    input.max='100';input.value='290';
    input.dispatchEvent(new t.w.Event('input',{bubbles:true}));
    await t.settle();
    const warning=t.w.document.querySelector('.wfd-capacity-message[data-requires-acknowledgement="true"]');
    assert.ok(warning);
    const form=mount.querySelector('form');
    const blocked=new t.w.Event('submit',{bubbles:true,cancelable:true});
    assert.equal(form.dispatchEvent(blocked),false);
    warning.querySelector('button').click();
    await t.settle();
    const allowed=new t.w.Event('submit',{bubbles:true,cancelable:true});
    assert.equal(form.dispatchEvent(allowed),true);
  }finally{t.dom.window.close();}
});
test('failed batched post-purchase save stays blocked after reload and can be retried',async()=>{
  let stored;
  const first=await setup({main:true,pending:true});try{
    first.setPostFailure(true);
    for(const selector of [
      '[data-post-choice][data-stage="round_table_invite"][data-value="no"]',
      '[data-post-choice][data-stage="cancellation"][data-value="refund"]',
      '[data-post-choice][data-stage="next_year"][data-value="no"]',
      '[data-post-choice][data-stage="other_events"][data-value="no"]'
    ]) first.w.document.querySelector(selector).click();
    const timer=first.timers.find(x=>x.delay===160&&!x.cancelled);assert.ok(timer);
    timer.fn();await first.settle();
    assert.match(first.w.document.querySelector('#post-purchase-save-status').textContent,/could not save/i);
    assert.equal(first.w.document.querySelector('#post-purchase-book-more').disabled,true);
    assert.equal(first.w.document.querySelector('#post-purchase-retry-save').hidden,false);
    stored=JSON.parse(first.w.localStorage.getItem('wfdPendingPostPurchase2026'));
    assert.ok(['error','pending'].includes(stored.saveStates.next_year));
  }finally{first.dom.window.close();}
  const second=await setup({main:true,pending:stored});try{
    assert.match(second.w.document.querySelector('#post-purchase-save-status').textContent,/could not save/i);
    second.w.document.querySelector('#post-purchase-retry-save').click();
    await second.settle();
    assert.equal(second.writes.length,1);
    assert.match(second.w.document.querySelector('#post-purchase-save-status').textContent,/have been saved/i);
    assert.equal(second.w.document.querySelector('#post-purchase-book-more').disabled,false);
  }finally{second.dom.window.close();}
});
