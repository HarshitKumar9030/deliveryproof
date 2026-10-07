import { MongoMemoryServer } from 'mongodb-memory-server';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const dbPath = path.resolve('.data/mongodb');
await mkdir(dbPath, { recursive: true });
const mongo = await MongoMemoryServer.create({
  instance: { port: 27017, ip: '127.0.0.1', dbPath, storageEngine: 'wiredTiger' },
});
console.log('Persistent local MongoDB listening on 127.0.0.1:27017. Keep this process running.');
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await mongo.stop({ doCleanup: false });
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
