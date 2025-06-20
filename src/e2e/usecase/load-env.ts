import { config } from "dotenv";

const result = config();
console.log("dotenv result:", result);
console.log("GOOGLE_GENERATIVE_AI_API_KEY:", process.env.GOOGLE_GENERATIVE_AI_API_KEY);
