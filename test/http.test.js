import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createApp } from "../src/app.js";
import { executeTool } from "../src/tools/toolExecutor.js";
import { email, active, fixture, listen, close, assertCoreContract } from "./helpers.js";

let api, db, base, dbBase, mode, requests, override;
const originals = Object.fromEntries(["DB_LAYER_URL","DB_LAYER_TIMEOUT_MS","AI_PROVIDER","AI_FALLBACK_PROVIDER","GEMINI_API_KEY","GEMINI_MODEL","OPENAI_API_KEY","OPENAI_MODEL"].map(k=>[k,process.env[k]]));
const responses = {
    "/tools/profile-column": await fixture("profile-email"),
    "/tools/check-charset": await fixture("charset-email"),
    "/tools/sample-values": await fixture("sample-ativo")
};
before(async()=>{
    db=createServer(async(req,res)=>{
        let text=""; for await(const chunk of req) text+=chunk;
        const body=JSON.parse(text);
        requests.push({method:req.method,path:req.url,body,contentType:req.headers["content-type"]});
        res.setHeader("content-type","application/json");
        if(mode==="timeout")return;
        if(mode==="slow-body"){res.writeHead(200);res.write("{");return;}
        if(mode==="bad-json"){res.end("invalid json");return;}
        if(mode==="null"){res.end("null");return;}
        if(mode==="array"){res.end("[]");return;}
        if(mode==="empty"){res.end("{}");return;}
        if(mode==="400"||mode==="500"){res.statusCode=Number(mode);res.end(JSON.stringify({error:"SENSITIVE_SENTINEL"}));return;}
        if(mode==="redirect"){res.statusCode=302;res.setHeader("location","http://127.0.0.1:1/");res.end();return;}
        const answer = mode==="no-data" ?
            {status:"NO_DATA",simulated:false,...body,reason:"Coluna ausente no catálogo"} :
            {...responses[req.url],...override};
        res.end(JSON.stringify(answer));
    });
    dbBase=await listen(db);
    api=createServer(createApp());
    base=await listen(api);
});
beforeEach(()=>{
    mode="ok";override={};requests=[];
    process.env.DB_LAYER_URL=dbBase;process.env.DB_LAYER_TIMEOUT_MS="500";
    process.env.AI_PROVIDER="gemini";process.env.AI_FALLBACK_PROVIDER="";
    delete process.env.GEMINI_API_KEY;delete process.env.GEMINI_MODEL;
    delete process.env.OPENAI_API_KEY;delete process.env.OPENAI_MODEL;
});
after(async()=>{
    await close(api);await close(db);
    for(const[k,v]of Object.entries(originals)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
async function post(path,body,raw=false){
    const r=await fetch(base+path,{method:"POST",headers:{"content-type":"application/json"},body:raw?body:JSON.stringify(body)});
    const data=await r.json();return {status:r.status,data,headers:r.headers};
}
test("health remains liveness-only and does not need LLM keys or DB",async()=>{
    const r=await fetch(base+"/health");assert.equal(r.status,200);
    assert.deepEqual(await r.json(),{status:"ok"});assert.equal(requests.length,0);
    assert.equal(r.headers.get("x-powered-by"),null);
});
test("Core payload -> real HTTP AI -> fixture HTTP DB preserves full response contract",async()=>{
    const {status,data}=await post("/ai/analyze-conflict",{...email,extra:"ignored"});
    assert.equal(status,200);assertCoreContract(data);assert.equal(data.verdict,"PROPOSE");
    assert.deepEqual(requests.map(r=>r.path),["/tools/profile-column","/tools/check-charset"]);
    for(const req of requests){
        assert.equal(req.method,"POST");assert.equal(req.contentType,"application/json");
        assert.deepEqual(req.body,{database:"mysql",table:"clientes",column:"email"});
    }
});
test("DB_LAYER_URL is read after imports; trailing slash remains valid",async()=>{
    process.env.DB_LAYER_URL=dbBase+"/";
    assert.equal((await post("/ai/analyze-conflict",email)).status,200);
    assert.equal(requests[0].path,"/tools/profile-column");
});
test("C-015 through HTTP defers and forwards the expected tool payload",async()=>{
    const r=await post("/ai/analyze-conflict",active);assert.equal(r.status,200);
    assertCoreContract(r.data);assert.equal(r.data.verdict,"DEFER");
    assert.equal(requests[0].path,"/tools/sample-values");
});
test("Unsupported conflict through HTTP does not call DB",async()=>{
    const r=await post("/ai/analyze-conflict",{...email,column:"json"});
    assert.equal(r.status,200);assert.equal(r.data.verdict,"DEFER");assert.deepEqual(requests,[]);
});
test("NO_DATA through HTTP produces a valid DEFER",async()=>{
    mode="no-data";const r=await post("/ai/analyze-conflict",email);
    assert.equal(r.status,200);assertCoreContract(r.data);assert.equal(r.data.verdict,"DEFER");
});
test("DB 400 stays INVALID -> DEFER and does not expose upstream text",async()=>{
    mode="400";const r=await post("/ai/analyze-conflict",email);
    assert.equal(r.status,200);assert.equal(r.data.verdict,"DEFER");
    assert.equal(r.data.evidence.profileColumn.status,"INVALID");
    assert.ok(!JSON.stringify(r).includes("SENSITIVE_SENTINEL"));
});
for(const kind of ["bad-json","null","array","empty"]){
    test("Malformed DB response "+kind+" returns controlled 502",async()=>{
        mode=kind;const r=await post("/ai/analyze-conflict",email);
        assert.equal(r.status,502);assert.equal(r.data.code,"DB_INVALID_RESPONSE");
    });
}
for(const patch of [{column:"wrong"},{database:"oracle"},{simulated:undefined},{valuesAboveThreshold:"2"},{thresholdUnit:"UNKNOWN"},{valuesAboveThreshold:11}]){
    test("Reject evidence inconsistent with the DB contract: "+JSON.stringify(patch),async()=>{
        override=patch;const r=await post("/ai/analyze-conflict",email);
        assert.equal(r.status,502);assert.equal(r.data.code,"DB_INVALID_RESPONSE");
    });
}
test("DB 5xx returns controlled 502 without leaking response body",async()=>{
    mode="500";const r=await post("/ai/analyze-conflict",email);
    assert.equal(r.status,502);
    assert.deepEqual(r.data,{error:"DB Layer indisponível",code:"DB_UNAVAILABLE"});
});
test("DB redirect is refused instead of forwarding evidence requests",async()=>{
    mode="redirect";const r=await post("/ai/analyze-conflict",email);
    assert.equal(r.status,502);assert.equal(requests.length,1);
});
for(const kind of ["timeout","slow-body"]){
    test("Timeout covers "+kind,async()=>{
        mode=kind;process.env.DB_LAYER_TIMEOUT_MS="50";
        const started=Date.now();const r=await post("/ai/analyze-conflict",email);
        assert.equal(r.status,504);assert.equal(r.data.code,"DB_TIMEOUT");
        assert.ok(Date.now()-started<2000);
    });
}
for(const url of ["not-a-url","file:///tmp/data","http://user:password@localhost:1","http://localhost:1?q=private"]){
    test("Invalid DB configuration is sanitized: "+url.split(":")[0],async()=>{
        process.env.DB_LAYER_URL=url;
        const r=await post("/ai/analyze-conflict",email);
        assert.equal(r.status,503);assert.equal(r.data.code,"DB_CONFIG");assert.equal(requests.length,0);
        assert.ok(!JSON.stringify(r.data).includes(url));
    });
}
for(const timeout of ["0","-1","abc","1.5","60001"]){
    test("Invalid timeout "+timeout+" is a configuration error",async()=>{
        process.env.DB_LAYER_TIMEOUT_MS=timeout;
        assert.equal((await post("/ai/analyze-conflict",email)).status,503);
    });
}
test("Network refusal produces controlled 502",async()=>{
    const unavailable=createServer();const url=await listen(unavailable);await close(unavailable);
    process.env.DB_LAYER_URL=url;
    assert.equal((await post("/ai/analyze-conflict",email)).status,502);
});
for(const body of [{},[],null,{...email,source:{}},{...email,table:123},{...email,conflictId:" "},{...email,source:null},{...email,target:[]}]){
    test("Invalid conflict input returns 400 before accessing DB: "+JSON.stringify(body),async()=>{
        assert.equal((await post("/ai/analyze-conflict",body)).status,400);assert.equal(requests.length,0);
    });
}
test("Malformed JSON and oversized body return JSON 400/413",async()=>{
    const invalid=await post("/ai/analyze-conflict",'{broken',true);assert.equal(invalid.status,400);
    assert.equal(invalid.data.error,"JSON inválido");
    assert.equal((await post("/ai/chat",{message:"x".repeat(110000)})).status,413);
});
for(const message of [undefined,null,[],{},42,false,"","   ","x".repeat(10001)]){
    test("Chat validates input type and size: "+typeof message+" "+(typeof message==="string"?message.length:""),async()=>{
        assert.equal((await post("/ai/chat",{message})).status,400);
    });
}
test("Chat without credentials returns 503; health still works",async()=>{
    assert.equal((await post("/ai/chat",{message:"Olá"})).status,503);
    assert.equal((await fetch(base+"/health")).status,200);
});
test("Tool allowlist rejects inherited names and removed demo tools",async()=>{
    for(const name of ["constructor","toString","__proto__","getSystemStatus","getCustomerData","unknown"]){
        await assert.rejects(executeTool(name,{}),/não permitida/);
    }
    assert.equal(requests.length,0);
});
test("Tool arguments reject null, arrays and missing identifiers",async()=>{
    for(const args of [null,[],{}, {database:"mysql",table:"",column:"email"}]){
        await assert.rejects(executeTool("profileColumn",args),/Parâmetros inválidos/);
    }
});
test("Unknown route is JSON 404 and internal exception details stay private",async()=>{
    assert.equal((await fetch(base+"/missing")).status,404);
    const isolated=createServer(createApp({analyze:async()=>{throw Error("SENSITIVE_SENTINEL")}}));
    const isolatedBase=await listen(isolated);
    try{
        const r=await fetch(isolatedBase+"/ai/analyze-conflict",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(email)});
        assert.equal(r.status,500);assert.deepEqual(await r.json(),{error:"Erro interno na AI Layer"});
    }finally{await close(isolated);}
});
test("HTTP chat success preserves provider response fields",async()=>{
    const isolated=createServer(createApp({chat:async()=>({response:"Resposta de teste",provider:"openai",fallback:true})}));
    const isolatedBase=await listen(isolated);
    try{
        const r=await fetch(isolatedBase+"/ai/chat",{method:"POST",headers:{"content-type":"application/json"},body:'{"message":"Olá"}'});
        assert.equal(r.status,200);assert.deepEqual(await r.json(),{response:"Resposta de teste",provider:"openai",fallback:true});
    }finally{await close(isolated);}
});
