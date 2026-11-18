import dotenv from "dotenv";
import { createApp } from "./app.js";
dotenv.config({ quiet: true });
const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT deve ser um inteiro entre 1 e 65535");
}
createApp().listen(port, () => console.log(`AI Service rodando na porta ${port}`));
