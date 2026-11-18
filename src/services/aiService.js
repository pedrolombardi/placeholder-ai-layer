import { generateAIResponse } from "../providers/providerFactory.js";
import { SYSTEM_PROMPT } from "../prompts/systemPrompt.js";
import { getAIConfig } from "../config/aiConfig.js";
import { ServiceError } from "../errors.js";

export async function chatWithAI(message, { generate = generateAIResponse, config = getAIConfig() } = {}) {
    const { provider, fallbackProvider } = config;
    const candidates = [...new Set([provider, fallbackProvider].filter(Boolean))];
    let lastError;
    for (const current of candidates) {
        try {
            const response = await generate(current, message, SYSTEM_PROMPT);
            if (typeof response !== "string" || !response.trim()) throw new Error("Invalid response");
            return { response, provider: current, ...(current !== provider ? { fallback: true } : {}) };
        } catch (error) {
            lastError = error;
            // Do not log SDK payloads or error messages: they may contain keys or data.
        }
    }
    if (lastError instanceof ServiceError) throw lastError;
    throw new ServiceError("AI_UNAVAILABLE", 502, "Provider de IA indisponível");
}
