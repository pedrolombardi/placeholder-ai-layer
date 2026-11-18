import express from "express";
import { createAiRouter } from "./routes/aiRoutes.js";
import { ServiceError } from "./errors.js";

// Creating the app does not open a port or require LLM credentials.
export function createApp(dependencies = {}) {
    const app = express();
    app.disable("x-powered-by");
    app.use(express.json({ limit: "100kb" }));
    app.get("/health", (req, res) => res.json({ status: "ok" }));
    app.use("/ai", createAiRouter(dependencies));
    app.use((req, res) => res.status(404).json({ error: "Rota não encontrada" }));
    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        if (error.type === "entity.parse.failed") {
            return res.status(400).json({ error: "JSON inválido" });
        }
        if (error.type === "entity.too.large") {
            return res.status(413).json({ error: "Corpo da requisição excede 100 KB" });
        }
        if (error.status === 415) {
            return res.status(415).json({ error: "Codificação não suportada" });
        }
        if (error instanceof ServiceError) {
            return res.status(error.status).json({ error: error.message, code: error.code });
        }
        // SDK and upstream errors may contain prompts, data, URLs or API keys.
        return res.status(500).json({ error: "Erro interno na AI Layer" });
    });
    return app;
}
