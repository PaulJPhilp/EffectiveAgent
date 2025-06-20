import { config } from "dotenv";

config();
console.log("process.env:", process.env);
console.log("GOOGLE_GENERATIVE_AI_API_KEY:", process.env.GOOGLE_GENERATIVE_AI_API_KEY);
