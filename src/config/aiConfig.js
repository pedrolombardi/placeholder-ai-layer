import { ServiceError } from "../errors.js";
const supported = ["gemini", "openai"];
const configError = () => new ServiceError("AI_CONFIG", 503, "Provider de IA não configurado corretamente");

export function getAIConfig(env = process.env) {
    const provider = (env.AI_PROVIDER || "gemini").trim().toLowerCase();
    const fallbackProvider = (env.AI_FALLBACK_PROVIDER || "").trim().toLowerCase();
    if (!supported.includes(provider) || (fallbackProvider && !supported.includes(fallbackProvider))) {
        throw configError();
    }
    return { provider, fallbackProvider };
}

export function getProviderConfig(provider, env = process.env) {
    if (!supported.includes(provider)) throw configError();
    const prefix = provider === "gemini" ? "GEMINI" : "OPENAI";
    const apiKey = env[`${prefix}_API_KEY`]?.trim();
    const model = env[`${prefix}_MODEL`]?.trim();
    const timeout = Number(env.AI_TIMEOUT_MS || 15000);
    if (!apiKey || !model || !Number.isInteger(timeout) || timeout < 1 || timeout > 120000) {
        throw configError();
    }
    return { apiKey, model, timeout };
}
