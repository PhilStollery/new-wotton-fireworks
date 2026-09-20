import test from 'node:test';
import assert from 'node:assert/strict';
import preference from '../netlify/functions/post-purchase-preference.mjs';
import { readJson } from '../netlify/functions/_lib/http.mjs';
import { patchRelease } from '../netlify/functions/_lib/tito.mjs';

const request = (body, headers = {}) => new Request('https://example.test/api/post-purchase-preference', {
  method: 'POST', headers: {'content-type':'application/json', ...headers}, body: JSON.stringify(body)
});
test('missing booking proof cannot call Tito', async () => {
  const original=global.fetch; let calls=0; global.fetch=async()=>{calls++;throw Error('unexpected upstream');};
  try { assert.equal((await preference(request({registrationSlug:'test'}))).status,400); assert.equal(calls,0); }
  finally { global.fetch=original; }
});
test('null JSON is rejected as a client error', async()=>assert.equal((await preference(request(null))).status,400));
test('prototype property is rejected as a client error', async()=>assert.equal((await preference(request({registrationSlug:'test',reference:'test',answers:{constructor:'yes'}}))).status,400));
test('body limit applies without Content-Length', async()=>{
  await assert.rejects(readJson(request({padding:'x'.repeat(9000)})), e=>e.status===413);
});
test('cross-origin writes rejected before upstream access', async()=>{
  assert.equal((await preference(request({registrationSlug:'test',reference:'test',answers:{travel:'walk'}},{origin:'https://other.test'}))).status,403);
});
test('only matching proof can write allowed metadata; unrelated metadata preserved', async()=>{
  const original=global.fetch; process.env.TITO_API_TOKEN_TEST='test-only'; const writes=[];
  global.fetch=async(url,init)=>{
    if(init.method==='PATCH'){writes.push(JSON.parse(init.body));return Response.json({registration:{slug:'test'}});}
    return Response.json({registration:{slug:'test',reference:'proof',state:'complete',metadata:{existing:'retained'}}});
  };
  try {
    assert.equal((await preference(request({registrationSlug:'test',reference:'wrong',answers:{travel:'walk'}}))).status,400);
    assert.equal(writes.length,0);
    assert.equal((await preference(request({registrationSlug:'test',reference:'proof',answers:{travel:'walk',next_year:'no'}}))).status,200);
    assert.equal(writes.length,1); assert.equal(writes[0].registration.metadata.existing,'retained');
    assert.equal(writes[0].registration.metadata.wfd_responses.next_year.value,'no');
  } finally {global.fetch=original;delete process.env.TITO_API_TOKEN_TEST;}
});

test('patchRelease reuses a supplied release without an extra Tito GET',async()=>{
  const original=global.fetch;
  const oldToken=process.env.TITO_API_TOKEN_TEST;
  const oldContext=process.env.CONTEXT;
  process.env.TITO_API_TOKEN_TEST='test-only';
  process.env.CONTEXT='deploy-preview';
  const calls=[];
  global.fetch=async(url,init={})=>{
    calls.push({url:String(url),method:init.method||'GET'});
    return Response.json({release:{slug:'example',title:'Example'}});
  };
  try{
    await patchRelease('example',{state:'off_sale'},{slug:'example',title:'Example'});
    assert.equal(calls.length,1);
    assert.equal(calls[0].method,'PATCH');
  }finally{
    global.fetch=original;
    if(oldToken===undefined)delete process.env.TITO_API_TOKEN_TEST;else process.env.TITO_API_TOKEN_TEST=oldToken;
    if(oldContext===undefined)delete process.env.CONTEXT;else process.env.CONTEXT=oldContext;
  }
});
