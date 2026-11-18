import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
async function walk(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
        const file = dir + "/" + e.name;
        if (e.isDirectory()) await walk(file);
        else if (/\.(m?js)$/.test(file)) {
            const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
            if (result.status !== 0) process.exit(result.status || 1);
        }
    }
}
for (const dir of ["src", "test", "scripts"]) await walk(dir);
console.log("Sintaxe JavaScript: OK");
