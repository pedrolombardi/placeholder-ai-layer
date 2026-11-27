import test from "node:test";
import assert from "node:assert/strict";
import { analyzeConflict } from "../src/services/conflictAnalysisService.js";
import { email, active, fixture, assertCoreContract } from "./helpers.js";
const profile = await fixture("profile-email");
const charset = await fixture("charset-email");
const sample = await fixture("sample-ativo");
function evidence(overrides = {}) {
    return { profileColumn: structuredClone(profile), checkCharset: structuredClone(charset),
        sampleValues: structuredClone(sample), ...overrides };
}
async function analyze(input = email, data = evidence()) {
    const calls = [];
    const result = await analyzeConflict(input, { runTool: async (name, args) => {
        calls.push({ name, args });
        return data[name];
    } });
    assertCoreContract(result);
    return { result, calls };
}
test("C-014: historical DB evidence preserves PROPOSE and Core contract", async () => {
    const { result, calls } = await analyze();
    assert.deepEqual(result.proposal, { targetType: "VARCHAR2(300 CHAR)", requiresValidation: true });
    assert.equal(result.verdict, "PROPOSE");
    assert.equal(result.simulated, false);
    assert.match(result.reason, /200 bytes/);
    assert.deepEqual(result.toolsUsed, ["profileColumn", "checkCharset"]);
    assert.deepEqual(calls.map(c => c.args), Array(2).fill({database:"mysql",table:"clientes",column:"email"}));
});
test("C-015: [0,1,2] preserves DEFER", async () => {
    const { result } = await analyze(active);
    assert.equal(result.verdict, "DEFER");
    assert.match(result.reason, /além de 0 e 1/);
});
test("C-018: unsupported conflict defers without inventing evidence", async () => {
    const { result, calls } = await analyze({...email, conflictId:"pedidos.metadata",column:"metadata"});
    assert.equal(result.verdict, "DEFER");
    assert.deepEqual(result.evidence, {});
    assert.deepEqual(calls, []);
});
test("Multibyte values: BYTE overflow with <=200 characters still proposes 300 CHAR", async () => {
    const { result } = await analyze(email, evidence({profileColumn:{...profile,maxObservedLength:150,maxObservedBytes:300}}));
    assert.equal(result.verdict,"PROPOSE");
    assert.match(result.reason,/bytes/);
});
test("CHAR semantics uses character length and labels reason correctly", async () => {
    const { result } = await analyze(email,evidence({profileColumn:{...profile,thresholdUnit:"CHAR"}}));
    assert.equal(result.verdict,"PROPOSE");
    assert.match(result.reason,/200 caracteres/);
});
for (const [name, changes] of [
    ["no overflow",{valuesAboveThreshold:0}],
    ["too long for proposal",{maxObservedLength:301}],
    ["unknown threshold",{lengthThreshold:null}],
    ["wrong threshold",{lengthThreshold:100}],
    ["unknown semantics",{thresholdUnit:null}],
    ["missing measured bytes",{maxObservedBytes:null}],
    ["string instead of numeric count",{valuesAboveThreshold:"2"}],
    ["contradictory count",{valuesAboveThreshold:11}],
    ["zero character length",{maxObservedLength:0}],
    ["no measured overflow",{maxObservedBytes:200}]
]) test("Conservative rule: "+name,async()=>{
    const {result}=await analyze(email,evidence({profileColumn:{...profile,...changes}}));
    assert.equal(result.verdict,"DEFER");
});
for (const [name, conflict] of [
    ["other table",{...email,table:"outros"}],
    ["other target",{...email,target:{database:"postgres",type:"VARCHAR2(200)"}}],
    ["other source type",{...email,source:{database:"mysql",type:"VARCHAR(500)"}}]
]) test("No automatic generalization: "+name,async()=>{
    assert.equal((await analyze(conflict)).result.verdict,"DEFER");
});
test("Simulated evidence cannot produce PROPOSE",async()=>{
    const {result}=await analyze(email,evidence({profileColumn:{...profile,simulated:true}}));
    assert.equal(result.verdict,"DEFER");assert.equal(result.simulated,true);
});
test("NO_DATA and INVALID produce DEFER",async()=>{
    for(const status of ["NO_DATA","INVALID"]){
        const {result}=await analyze(email,evidence({profileColumn:{status,simulated:false},checkCharset:{status,simulated:false}}));
        assert.equal(result.verdict,"DEFER");
    }
});
test("Unknown charset produces DEFER",async()=>{
    assert.equal((await analyze(email,evidence({checkCharset:{...charset,charset:null}}))).result.verdict,"DEFER");
});
test("Masked, truncated or binary samples never prove business semantics",async()=>{
    for(const change of [{masked:true,values:[]},{truncated:true,values:[0,1]},{values:[0,1]},{values:[]}]){
        const {result}=await analyze(active,evidence({sampleValues:{...sample,...change}}));
        assert.equal(result.verdict,"DEFER");
        if(change.masked)assert.match(result.reason,/mascarada/);
    }
});
test("Dependency failures propagate instead of becoming fake DEFER evidence",async()=>{
    await assert.rejects(analyzeConflict(email,{runTool:async()=>{throw new Error("offline")}}),/offline/);
});
