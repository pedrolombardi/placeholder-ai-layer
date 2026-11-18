import { profileColumn, sampleValues, checkCharset } from "./migrationTools.js";
const tools = { profileColumn, sampleValues, checkCharset };

export async function executeTool(name, args = {}) {
    if (typeof name !== "string" || !Object.hasOwn(tools, name)) throw new Error("Tool não permitida");
    if (!args || typeof args !== "object" || Array.isArray(args) ||
        ["database", "table", "column"].some(key => typeof args[key] !== "string" || !args[key].trim())) {
        throw new Error("Parâmetros inválidos para a tool");
    }
    // Only allowlisted functions and the three contract fields leave this layer.
    return tools[name]({ database: args.database, table: args.table, column: args.column });
}
