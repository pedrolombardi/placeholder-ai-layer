import { GoogleGenAI } from "@google/genai";
import { getProviderConfig } from "../config/aiConfig.js";
import { executeTool } from "../tools/toolExecutor.js";
import { toolDefinitions } from "../tools/toolDefinitions.js";
import { ServiceError } from "../errors.js";

const invalidResponse = () => new ServiceError("AI_INVALID_RESPONSE", 502, "Resposta inválida do provider de IA");

export async function generateGeminiResponse(message, instructions, options = {}) {
    const config = options.config || getProviderConfig("gemini");
    // Lazy client: /health and /ai/analyze-conflict do not need an API key.
    const client = options.client || new GoogleGenAI({ apiKey: config.apiKey });
    const runTool = options.runTool || executeTool;
    const requestOptions = { timeout_ms: config.timeout };
    let interaction = await client.interactions.create({
        model: config.model, input: message, system_instruction: instructions,
        tools: toolDefinitions
    }, requestOptions);
    let usedTools = 0;
    const ids = new Set();
    for (let round = 0; round <= 3; round++) {
        if (!interaction || (interaction.steps !== undefined && !Array.isArray(interaction.steps))) {
            throw invalidResponse();
        }
        const calls = (interaction.steps || []).filter(step => step?.type === "function_call");
        if (calls.length === 0) {
            if (typeof interaction.output_text !== "string" || !interaction.output_text.trim()) throw invalidResponse();
            return interaction.output_text;
        }
        if (round === 3 || usedTools + calls.length > 8) {
            throw new ServiceError("AI_TOOL_LIMIT", 502, "Limite de chamadas de ferramentas atingido");
        }
        if (typeof interaction.id !== "string" || !interaction.id) throw invalidResponse();
        const input = [];
        for (const call of calls) {
            if (typeof call.id !== "string" || !call.id || ids.has(call.id) ||
                !toolDefinitions.some(tool => tool.name === call.name)) throw invalidResponse();
            ids.add(call.id);
            const result = await runTool(call.name, call.arguments);
            usedTools++;
            input.push({
                type: "function_result", name: call.name, call_id: call.id,
                result: [{ type: "text", text: JSON.stringify(result) }]
            });
        }
        interaction = await client.interactions.create({
            model: config.model, previous_interaction_id: interaction.id,
            system_instruction: instructions, tools: toolDefinitions, input
        }, requestOptions);
    }
}
