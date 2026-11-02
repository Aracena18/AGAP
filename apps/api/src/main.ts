import { createApp } from './app.js';
import { loadConfig } from './platform/config.js';
const config = loadConfig();
const app = await createApp(config);
await app.listen(config.API_PORT,config.API_HOST);
console.log(`AGAP staff API listening on ${config.API_HOST}:${config.API_PORT}; contract 0.3.0 candidate.`);
