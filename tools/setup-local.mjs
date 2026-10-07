import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { parse } from 'dotenv';
const path = new URL('../.env.local', import.meta.url);
let contents = await readFile(path, 'utf8').catch(error => {
  if (error.code === 'ENOENT') return '';
  throw error;
});
const inherited = parse(await readFile(new URL('../.env', import.meta.url), 'utf8').catch(error => {
  if (error.code === 'ENOENT') return '';
  throw error;
}));
for (const [key, value] of Object.entries({
  AUTH_SECRET: randomBytes(32).toString('base64url'),
  APP_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
  MONGODB_URI: 'mongodb://127.0.0.1:27017/deliveryproof',
  UPLOADTHING_TOKEN: '',
  GEMINI_API_KEY: '', GEMINI_MODEL: '',
})) {
  if (!new RegExp(`^${key}=`, 'm').test(contents) && !inherited[key]?.trim()) contents += `\n${key}=${value}\n`;
}
await writeFile(path, contents, { mode: 0o600 });
console.log('Local configuration prepared in .env.local. Secrets are not printed. Existing values are preserved.');
