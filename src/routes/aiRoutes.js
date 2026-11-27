import express from "express";
import { chatWithAI } from "../services/aiService.js";
import { analyzeConflict } from "../services/conflictAnalysisService.js";
const nonEmpty = (value, max) =>
    typeof value === "string" && value.trim().length > 0 && value.length <= max;
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);

export function createAiRouter({ chat = chatWithAI, analyze = analyzeConflict } = {}) {
    const router = express.Router();
    router.post("/chat", async (req, res) => {
        if (!object(req.body) || !nonEmpty(req.body.message, 10000)) {
            return res.status(400).json({ error: "message deve ser um texto não vazio de até 10000 caracteres" });
        }
        res.json(await chat(req.body.message));
    });
    router.post("/analyze-conflict", async (req, res) => {
        const body = req.body;
        if (!object(body) || !object(body.source) || !object(body.target) ||
            !nonEmpty(body.conflictId, 256) || !nonEmpty(body.table, 128) ||
            !nonEmpty(body.column, 128) ||
            !nonEmpty(body.source.database, 64) || !nonEmpty(body.source.type, 512) ||
            !nonEmpty(body.target.database, 64) || !nonEmpty(body.target.type, 512)) {
            return res.status(400).json({ error: "Dados do conflito incompletos ou inválidos" });
        }
        // Extra fields remain accepted, but are not forwarded to tools.
        res.json(await analyze(body));
    });
    return router;
}
export default createAiRouter();
