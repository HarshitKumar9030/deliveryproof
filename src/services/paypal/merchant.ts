import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { database } from '../database/mongodb.ts';
import { PayPalService } from './paypal.service.ts';
function key() {
  const value = process.env.APP_ENCRYPTION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) throw new Error('APP_ENCRYPTION_KEY must be a 32-byte hex key');
  return Buffer.from(value, 'hex');
}
export function encrypt(value: string) {
  const nonce=randomBytes(12); const cipher=createCipheriv('aes-256-gcm',key(),nonce);
  const bytes=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return [nonce,cipher.getAuthTag(),bytes].map(b=>b.toString('base64url')).join('.');
}
export function decrypt(value: string) {
  const [nonce,tag,bytes]=value.split('.');
  if(!nonce || !tag || !bytes) throw new Error('Invalid encrypted value');
  const cipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(nonce,'base64url'));
  cipher.setAuthTag(Buffer.from(tag,'base64url'));
  return Buffer.concat([cipher.update(Buffer.from(bytes,'base64url')),cipher.final()]).toString('utf8');
}
export async function merchant(ownerId: string) {
  const db=await database();
  const record=await db.collection('merchants').findOne({ownerId});
  if(!record) throw new Error('Connect your PayPal sandbox app in Account settings');
  return new PayPalService({clientId:decrypt(record.clientId),clientSecret:decrypt(record.clientSecret)});
}
