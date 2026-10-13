import { generateGeminiResponse } from "./geminiProvider.js";
import { generateOpenAIResponse} from "./openaiProvider.js";

export async function generateAIResponse(
    provider,
    message,
    instructions
) {

    if (provider === "gemini") {
        return await generateGeminiResponse(
            message,
            instructions
        );
    }

    if (provider === "openai") {
        return await generateOpenAIResponse(
            message,
            instructions
        );
    }

    throw new Error(`Provider não suportado: ${provider}`);
}