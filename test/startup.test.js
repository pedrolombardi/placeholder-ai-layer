import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { fixture, listen, close } from "./helpers.js";

const serverFile = fileURLToPath(new URL("../src/server.js",import.meta.url));
const smokeFile = fileURLToPath(new URL("../scripts/smoke.mjs",import.meta.url));

test("Standalone server loads DB URL from .env without keys and passes smoke against fixture DB",async()=>{
    const responses = {
        "/tools/profile-column":await fixture("profile-email"),
        "/tools/check-charset":await fixture("charset-email"),
        "/tools/sample-values":await fixture("sample-ativo")
    };
    const db=createServer((req,res)=>{
        req.resume();
        res.setHeader("content-type","application/json");
        res.end(JSON.stringify(responses[req.url]));
    });
    const dbUrl=await listen(db);
    const reservation=createServer();
    await listen(reservation);
    const port=reservation.address().port;
    await close(reservation);
    const directory=await mkdtemp(join(tmpdir(),"ai-layer-test-"));
    const env={...process.env};
    for(const key of ["PORT","DB_LAYER_URL","DB_LAYER_TIMEOUT_MS","GEMINI_API_KEY","OPENAI_API_KEY"])delete env[key];
    await writeFile(join(directory,".env"),`PORT=${port}\nDB_LAYER_URL=${dbUrl}\nDB_LAYER_TIMEOUT_MS=1000\n`);
    const child=spawn(process.execPath,[serverFile],{cwd:directory,env,windowsHide:true});
    let output="";
    child.stdout.on("data",chunk=>{output+=chunk;});
    child.stderr.on("data",chunk=>{output+=chunk;});
    try{
        await new Promise((done,reject)=>{
            const timer=setTimeout(()=>{cleanup();reject(Error("Server startup timed out"));},5000);
            function cleanup(){clearTimeout(timer);child.stdout.off("data",onData);child.off("exit",onExit);child.off("error",onError);}
            function onData(){if(output.includes("AI Service rodando")){cleanup();done();}}
            function onExit(){cleanup();reject(Error("Server did not start"));}
            function onError(error){cleanup();reject(error);}
            child.stdout.on("data",onData);child.once("exit",onExit);child.once("error",onError);
        });
        const smoke=spawn(process.execPath,[smokeFile],{cwd:directory,env:{...env,AI_LAYER_URL:`http://127.0.0.1:${port}`},windowsHide:true});
        let smokeOutput="";smoke.stdout.on("data",c=>smokeOutput+=c);smoke.stderr.on("data",c=>smokeOutput+=c);
        const [code]=await once(smoke,"exit");
        assert.equal(code,0,smokeOutput);
        assert.match(smokeOutput,/SMOKE OK/);
        assert.ok(!output.includes("API key"));
    }finally{
        if(child.exitCode===null){const stopped=once(child,"exit");child.kill();await stopped;}
        await close(db);
        // Only remove the unique temporary directory created by this test.
        const target=resolve(directory);
        if(dirname(target)===resolve(tmpdir()) && basename(target).startsWith("ai-layer-test-")) {
            await rm(target,{recursive:true,force:true});
        }
    }
});
