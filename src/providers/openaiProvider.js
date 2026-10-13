import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export async function generateOpenAIResponse(message, instructions) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        throw new Error("OPENAI_API_KEY não configurada");
    }

    const client = new OpenAI({
        apiKey
    });

    const response = await client.responses.create({
        model: process.env.OPENAI_MODEL,
        instructions: instructions,
        input: message,
    });

    return response.output_text;
}