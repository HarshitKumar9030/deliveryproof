import { MongoClient } from 'mongodb';

const globalMongo = globalThis as typeof globalThis & { deliveryProofMongo?: Promise<MongoClient> };
export async function database() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured');
  if (!globalMongo.deliveryProofMongo) {
    globalMongo.deliveryProofMongo = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 }).connect()
      .catch(error => { globalMongo.deliveryProofMongo = undefined; throw error; });
  }
  return (await globalMongo.deliveryProofMongo).db(process.env.MONGODB_DB || 'deliveryproof');
}
