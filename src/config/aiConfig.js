const SUPPORTED_PROVIDERS = [
    "gemini",
    "openai"
];

export function getAIConfig() {

    const provider = (
        process.env.AI_PROVIDER || "gemini"
    ).toLowerCase();

    const fallbackProvider = (
        process.env.AI_FALLBACK_PROVIDER || ""
    ).toLowerCase();

    if (
    fallbackProvider &&
    !SUPPORTED_PROVIDERS.includes(fallbackProvider)
    ) {
    throw new Error(
        `Fallback provider não suportado: ${fallbackProvider}`
        );
    }

    if (!SUPPORTED_PROVIDERS.includes(provider)) {
        throw new Error(
            `Provider não suportado: ${provider}`
        );
    }

    if (provider === "gemini") {

        if (!process.env.GEMINI_API_KEY) {
            throw new Error(
                "GEMINI_API_KEY não configurada"
            );
        }

        if (!process.env.GEMINI_MODEL) {
            throw new Error(
                "GEMINI_MODEL não configurado"
            );
        }
    }

    if (provider === "openai") {

        if (!process.env.OPENAI_API_KEY) {
            throw new Error(
                "OPENAI_API_KEY não configurada"
            );
        }

        if (!process.env.OPENAI_MODEL) {
            throw new Error(
                "OPENAI_MODEL não configurado"
            );
        }
    }

    return {
        provider,
        fallbackProvider
    };
}