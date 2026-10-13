import express from "express";
import dotenv from "dotenv";
import aiRoutes from "./routes/aiRoutes.js";

dotenv.config();

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
    res.json({
        status: "ok"
    });
});

app.use("/ai", aiRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`AI Service rodando na porta ${PORT}`);
});