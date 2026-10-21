import { createApp } from './app.js';
import { loadConfig } from './platform/config.js';
const config = loadConfig();
const app = await createApp(config);
await app.listen(config.API_PORT,'127.0.0.1');
console.log(`AGAP staff API listening on 127.0.0.1:${config.API_PORT}; contract 0.1.0.`);
