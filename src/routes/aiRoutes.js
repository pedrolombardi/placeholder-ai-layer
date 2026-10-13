import express from "express";
import { chatWithAI } from "../services/aiService.js";
import { analyzeConflict } from "../services/conflictAnalysisService.js";

const router = express.Router();

router.post("/chat", async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                error: "message é obrigatório"
            });
        }

        const result = await chatWithAI(message);

        res.json(result);

    } catch (error) {
        console.error(error);

        if (error.message === "customerId inválido") {
            return res.status(400).json({
                error: "customerId inválido"
            });
        }

        return res.status(500).json({
            error: "Erro na AI Layer"
        });
    }
});

router.post("/analyze-conflict", async (req, res) => {
    const { conflictId, table, column, source, target } = req.body ?? {};

    const isNonEmptyString = (value) => {
    return typeof value === "string" && value.trim().length > 0;
};

    if (
    !isNonEmptyString(conflictId) ||
    !isNonEmptyString(table) ||
    !isNonEmptyString(column) ||
    !isNonEmptyString(source?.database) ||
    !isNonEmptyString(source?.type) ||
    !isNonEmptyString(target?.database) ||
    !isNonEmptyString(target?.type)
) {
    return res.status(400).json({
        error: "Dados do conflito incompletos"
    });
}

    try {
        const result = await analyzeConflict(req.body);

        return res.status(200).json(result);

    } catch (error) {
        console.error("Erro ao analisar conflito:", error);

        return res.status(500).json({
            error: "Falha interna ao analisar conflito"
        });
    }

});

export default router;