// MongoDB client singleton. Cached on globalThis so dev HMR doesn't open a new
// pool every reload. In prod a single hot module also keeps one client alive.

import { MongoClient } from 'mongodb';
import dns from 'node:dns';

// Some local resolvers (ISP routers, corp networks) drop SRV queries, which
// breaks mongodb+srv:// URIs. Force Node to use Google/Cloudflare public DNS.
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', ...dns.getServers()]);
} catch {}

const GLOBAL_KEY = '__silkhr_mongo_client__';

function freshClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  return client.connect();
}

async function getClient() {
  let p = globalThis[GLOBAL_KEY];
  if (p) {
    try { return await p; }
    catch { delete globalThis[GLOBAL_KEY]; } // poisoned promise → start fresh
  }
  globalThis[GLOBAL_KEY] = freshClient();
  return globalThis[GLOBAL_KEY];
}

export async function getDb() {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB || 'silkhr');
}

export async function getSessions() {
  const db = await getDb();
  return db.collection('sessions');
}
