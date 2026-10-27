import "./instrument";
import "reflect-metadata";
import { createApp } from "./app.factory";
import { loadEnv } from "./config/env";

const env = loadEnv();
const app = await createApp(env);
await app.listen(env.API_PORT);
console.log(`myvisa API on http://localhost:${env.API_PORT}  ·  docs: http://localhost:${env.API_PORT}/docs`);
