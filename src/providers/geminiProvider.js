import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { executeTool } from "../tools/toolExecutor.js";
import { toolDefinitions } from "../tools/toolDefinitions.js";

dotenv.config();

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

export async function generateGeminiResponse(message, instructions) {

    const interaction = await ai.interactions.create({
        model: process.env.GEMINI_MODEL,
        input: message,
        system_instruction: instructions,
        tools: toolDefinitions
    });

    const functionCall = interaction.steps.find(
        step => step.type === "function_call"
    );

    if (functionCall) {
        console.log("Gemini pdeiu a tool:", functionCall.name);

        const toolResult = await executeTool(
            functionCall.name,
            functionCall.arguments
        );

        const finalInteraction = await ai.interactions.create({
            model: process.env.GEMINI_MODEL,
            previous_interaction_id: interaction.id,
            tools: toolDefinitions,
            input: [{
                type: "function_result",
                name: functionCall.name,
                call_id: functionCall.id,
                result: [{
                    type: "text",
                    text: JSON.stringify(toolResult)
                }]
            }]
        });

        return finalInteraction.output_text;
    }

    return interaction.output_text;

}