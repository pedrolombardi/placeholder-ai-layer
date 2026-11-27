import OpenAI from "openai";
import { getProviderConfig } from "../config/aiConfig.js";
import { ServiceError } from "../errors.js";

export async function generateOpenAIResponse(message, instructions, options = {}) {
    const config = options.config || getProviderConfig("openai");
    const client = options.client || new OpenAI({
        apiKey: config.apiKey, timeout: config.timeout, maxRetries: 0
    });
    const response = await client.responses.create({
        model: config.model, instructions, input: message
    });
    if (typeof response?.output_text !== "string" || !response.output_text.trim()) {
        throw new ServiceError("AI_INVALID_RESPONSE", 502, "Resposta inválida do provider de IA");
    }
    return response.output_text;
}
