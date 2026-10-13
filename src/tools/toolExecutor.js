import {
    getSystemStatus,
    getCustomerData
} from "./systemTools.js";
import {
    profileColumn,
    sampleValues,
    checkCharset
} from "./migrationTools.js";

const tools = {
    getSystemStatus: () => getSystemStatus(),

    getCustomerData: (args) => {
        const customerId = Number(args.customerId);

        if (!Number.isInteger(customerId) || customerId <= 0) {
            throw new Error("customerId inválido");
        }

                return getCustomerData(customerId);
    },

    profileColumn: (args = {}) => {
        const { database, table, column } = args;

        if (
            typeof database !== "string" ||
            !database.trim() ||
            typeof table !== "string" ||
            !table.trim() ||
            typeof column !== "string" ||
            !column.trim()
        ) {
            throw new Error("Parâmetros inválidos para profileColumn");
        }

                return profileColumn({ database, table, column });
    },

    sampleValues: (args = {}) => {
        const { database, table, column } = args;

        if (
            typeof database !== "string" ||
            !database.trim() ||
            typeof table !== "string" ||
            !table.trim() ||
            typeof column !== "string" ||
            !column.trim()
        ) {
            throw new Error("Parâmetros inválidos para sampleValues");
        }

                return sampleValues({ database, table, column });
    },

    checkCharset: (args = {}) => {
        const { database, table, column } = args;

        if (
            typeof database !== "string" ||
            !database.trim() ||
            typeof table !== "string" ||
            !table.trim() ||
            typeof column !== "string" ||
            !column.trim()
        ) {
            throw new Error("Parâmetros inválidos para checkCharset");
        }

        return checkCharset({ database, table, column });
    }
};


export async function executeTool(name, args = {}) {

    const tool = tools[name];

    if (!tool) {
        throw new Error(`Tool não encontrada: ${name}`);
    }

    console.log("[Tool Calling] Executando:", name);

    try {
        const result = await tool(args);

        return result;

    } catch (error) {
        console.error(`Erro ao executar a Tool ${name}:`, error);

        throw error;
    }
}