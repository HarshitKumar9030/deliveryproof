import nextEnv from '@next/env';
import { MongoClient } from 'mongodb';
import { randomBytes, scryptSync } from 'node:crypto';
nextEnv.loadEnvConfig(process.cwd());
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Usage: npm run account:create -- you@example.com');
if (!process.stdout.isTTY) throw new Error('Run account:create in an interactive terminal to receive your password.');
const password = randomBytes(24).toString('base64url');
const salt = randomBytes(32).toString('hex');
const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/deliveryproof');
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'deliveryproof');
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('login_limits').createIndex({ email: 1, bucket: 1 }, { unique: true });
  await db.collection('login_limits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection('users').insertOne({ email, name: email.split('@')[0], passwordHash: `${salt}:${scryptSync(password, salt, 64).toString('hex')}`, createdAt: new Date() });
  console.log('Account created. The generated password is shown only in this interactive terminal.');
  console.log(password);
} finally { await client.close(); }
