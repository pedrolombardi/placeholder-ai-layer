import test from "node:test";
import assert from "node:assert/strict";
import { getAIConfig, getProviderConfig } from "../src/config/aiConfig.js";
import { chatWithAI } from "../src/services/aiService.js";
import { generateGeminiResponse } from "../src/providers/geminiProvider.js";
import { generateOpenAIResponse } from "../src/providers/openaiProvider.js";
import { generateAIResponse } from "../src/providers/providerFactory.js";
import { toolDefinitions } from "../src/tools/toolDefinitions.js";
const config={apiKey:"test-only",model:"test-model",timeout:500};
const call=(id="call-1",name="profileColumn")=>({type:"function_call",id,name,arguments:{database:"mysql",table:"clientes",column:"email"}});
function fakeGemini(responses){
    const requests=[];
    return {requests,client:{interactions:{create:async(...args)=>{
        requests.push(args);return responses.shift();
    }}}};
}
test("Provider selection normalizes case and whitespace",()=>{
    assert.deepEqual(getAIConfig({AI_PROVIDER:" OpenAI ",AI_FALLBACK_PROVIDER:"GEMINI"}),{provider:"openai",fallbackProvider:"gemini"});
    assert.deepEqual(getAIConfig({}),{provider:"gemini",fallbackProvider:""});
});
test("Unknown provider names reject without echoing their values",()=>{
    for(const env of [{AI_PROVIDER:"SENSITIVE_SENTINEL"},{AI_FALLBACK_PROVIDER:"SENSITIVE_SENTINEL"}]){
        assert.throws(()=>getAIConfig(env),e=>e.code==="AI_CONFIG"&&!e.message.includes("SENSITIVE_SENTINEL"));
    }
});
test("Configuration is checked per attempted provider",()=>{
    assert.throws(()=>getProviderConfig("gemini",{}),e=>e.code==="AI_CONFIG");
    assert.throws(()=>getProviderConfig("openai",{OPENAI_API_KEY:"test-only"}),e=>e.code==="AI_CONFIG");
    assert.throws(()=>getProviderConfig("bad",{}),e=>e.code==="AI_CONFIG");
    assert.deepEqual(getProviderConfig("openai",{OPENAI_API_KEY:" test-only ",OPENAI_MODEL:"test-model"}),{apiKey:"test-only",model:"test-model",timeout:15000});
});
for(const timeout of ["0","NaN","-1","120001"]){
    test("Invalid AI timeout "+timeout+" rejects",()=>{
        assert.throws(()=>getProviderConfig("gemini",{GEMINI_API_KEY:"test-only",GEMINI_MODEL:"test-model",AI_TIMEOUT_MS:timeout}),e=>e.code==="AI_CONFIG");
    });
}
test("Primary success returns the original chat response contract",async()=>{
    assert.deepEqual(await chatWithAI("Olá",{config:{provider:"gemini",fallbackProvider:"openai"},generate:async p=>{assert.equal(p,"gemini");return "Resposta"}}),{response:"Resposta",provider:"gemini"});
});
test("Fallback runs once and records the actual provider",async()=>{
    const attempts=[];
    const r=await chatWithAI("Olá",{config:{provider:"gemini",fallbackProvider:"openai"},generate:async p=>{
        attempts.push(p);if(p==="gemini")throw Error("SENSITIVE_SENTINEL");return "Resposta";
    }});
    assert.deepEqual(attempts,["gemini","openai"]);
    assert.deepEqual(r,{response:"Resposta",provider:"openai",fallback:true});
});
test("Missing primary credentials can use a configured fallback",async()=>{
    const r=await chatWithAI("Olá",{config:{provider:"gemini",fallbackProvider:"openai"},generate:async p=>{
        if(p==="gemini")getProviderConfig(p,{});
        return "Fallback de teste";
    }});
    assert.equal(r.provider,"openai");assert.equal(r.fallback,true);
});
test("Same provider is not retried as its own fallback; errors are sanitized",async()=>{
    let attempts=0;
    await assert.rejects(chatWithAI("Olá",{config:{provider:"gemini",fallbackProvider:"gemini"},generate:async()=>{attempts++;throw Error("SENSITIVE_SENTINEL")}}),
        e=>e.code==="AI_UNAVAILABLE"&&!e.message.includes("SENSITIVE_SENTINEL"));
    assert.equal(attempts,1);
});
test("Empty provider text activates fallback rather than successful empty JSON",async()=>{
    const r=await chatWithAI("Olá",{config:{provider:"gemini",fallbackProvider:"openai"},generate:async p=>p==="gemini"?"":"ok"});
    assert.equal(r.provider,"openai");
});
test("Both providers failing returns a controlled error",async()=>{
    await assert.rejects(chatWithAI("Olá",{config:{provider:"gemini",fallbackProvider:"openai"},generate:async()=>{throw Error("SENSITIVE_SENTINEL")}}),e=>e.code==="AI_UNAVAILABLE");
});
test("Provider factory rejects unknown provider",async()=>{
    await assert.rejects(generateAIResponse("unknown","message","instructions"),/não suportado/);
});
test("Gemini supports responses without optional steps",async()=>{
    const f=fakeGemini([{output_text:"Resposta"}]);
    assert.equal(await generateGeminiResponse("Olá","instructions",{client:f.client,config}),"Resposta");
    assert.equal(f.requests[0][0].model,"test-model");
    assert.equal(f.requests[0][1].timeout_ms,500);
});
test("Gemini returns every tool result using matching call IDs",async()=>{
    const f=fakeGemini([{id:"interaction-1",steps:[call("a"),call("b","checkCharset")]},{output_text:"Pronto"}]);
    const executed=[];
    const r=await generateGeminiResponse("Olá","instructions",{client:f.client,config,runTool:async(name,args)=>{
        executed.push({name,args});return {status:"NO_DATA"};
    }});
    assert.equal(r,"Pronto");assert.equal(executed.length,2);
    assert.deepEqual(f.requests[1][0].input.map(x=>x.call_id),["a","b"]);
    assert.equal(f.requests[1][0].previous_interaction_id,"interaction-1");
    assert.equal(f.requests[1][0].system_instruction,"instructions");
});
test("Gemini handles successive tool rounds and stops at three",async()=>{
    const f=fakeGemini([1,2,3,4].map(n=>({id:"i"+n,steps:[call("c"+n)]})));
    let executions=0;
    await assert.rejects(generateGeminiResponse("Olá","i",{client:f.client,config,runTool:async()=>{executions++;return {status:"NO_DATA"}}}),e=>e.code==="AI_TOOL_LIMIT");
    assert.equal(executions,3);assert.equal(f.requests.length,4);
});
test("Gemini caps a batch before executing more than eight tools",async()=>{
    const f=fakeGemini([{id:"i",steps:Array.from({length:9},(_,i)=>call("c"+i))}]);
    let executions=0;
    await assert.rejects(generateGeminiResponse("Olá","i",{client:f.client,config,runTool:async()=>{executions++;}}),e=>e.code==="AI_TOOL_LIMIT");
    assert.equal(executions,0);
});
test("Gemini rejects unknown tools and duplicate call IDs",async()=>{
    for(const steps of [[call("a","getCustomerData")],[call("a","constructor")],[call("a"),call("a")]]){
        const f=fakeGemini([{id:"i",steps}]);
        await assert.rejects(generateGeminiResponse("Olá","i",{client:f.client,config,runTool:async()=>({status:"NO_DATA"})}),e=>e.code==="AI_INVALID_RESPONSE");
    }
});
for(const response of [undefined,{}, {output_text:""}, {steps:{}}, {steps:[call()]}, {id:"i",steps:[call("")]}]){
    test("Gemini malformed response is not accepted: "+JSON.stringify(response),async()=>{
        const f=fakeGemini([response]);
        await assert.rejects(generateGeminiResponse("Olá","i",{client:f.client,config}),e=>e.code==="AI_INVALID_RESPONSE");
    });
}
test("OpenAI Responses request keeps instructions and model",async()=>{
    let request;
    const client={responses:{create:async body=>{request=body;return {output_text:"Resposta"}}}};
    assert.equal(await generateOpenAIResponse("Olá","instructions",{client,config}),"Resposta");
    assert.deepEqual(request,{model:"test-model",instructions:"instructions",input:"Olá"});
});
test("OpenAI empty output is an error",async()=>{
    await assert.rejects(generateOpenAIResponse("Olá","instructions",{config,client:{responses:{create:async()=>({output_text:" "})}}}),e=>e.code==="AI_INVALID_RESPONSE");
});
test("Only the three real DB tools are advertised",()=>{
    assert.deepEqual(toolDefinitions.map(t=>t.name),["profileColumn","sampleValues","checkCharset"]);
});
