import { generateAIResponse } from "../providers/providerFactory.js";
import { SYSTEM_PROMPT } from "../prompts/systemPrompt.js";
import { getAIConfig } from "../config/aiConfig.js";

export async function chatWithAI(message) {

    const {
        provider,
        fallbackProvider
    } = getAIConfig();

    try {

        const response = await generateAIResponse(
            provider,
            message,
            SYSTEM_PROMPT
        );

        return {
            response,
            provider
        };

    } catch (error) {

        console.error(
            `Provider principal ${provider} falhou:`,
            error.message
        );

        if (
            !fallbackProvider ||
            fallbackProvider === provider
        ) {
            throw error;
        }

        console.log(
            `Tentando fallback: ${fallbackProvider}`
        );

        const response = await generateAIResponse(
            fallbackProvider,
            message,
            SYSTEM_PROMPT
        );

        return {
            response,
            provider: fallbackProvider,
            fallback: true
        };
    }
}