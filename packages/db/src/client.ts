import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres'
import { neon } from '@neondatabase/serverless'
import pg from 'pg'
import * as schema from './schema'

function isLocalPostgres(connectionString: string) {
  try {
    const u = new URL(connectionString)
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

// Factory: Neon HTTP for Workers / hosted Neon; node-postgres for local E2E.
// Cloudflare Workers has no process.env at module-load time; the connection
// string arrives per-request via the fetch handler's `env`.
export function createDb(connectionString: string) {
  if (isLocalPostgres(connectionString)) {
    const pool = new pg.Pool({ connectionString })
    return drizzleNode({ client: pool, schema })
  }
  const sql = neon(connectionString)
  return drizzleNeon({ client: sql, schema })
}

export type Database = ReturnType<typeof createDb>

// Convenience for Node contexts (scripts/tests) where DATABASE_URL is present.
let cached: Database | undefined
export function getDb(): Database {
  if (!cached) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    cached = createDb(url)
  }
  return cached
}
