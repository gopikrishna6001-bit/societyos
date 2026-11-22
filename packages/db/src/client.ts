import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres'
import { neon } from '@neondatabase/serverless'
import pg from 'pg'
import * as schema from './schema'

function isLocalPostgres(connectionString: string) {
  try {
    const host = new URL(connectionString).hostname
    return host === 'localhost' || host === '127.0.0.1' || host === 'postgres'
  } catch {
    return false
  }
}

// Neon HTTP for Workers / hosted Neon; node-postgres for local Docker/E2E.
// Typed as NeonHttpDatabase so API/route typecheck stays single-shaped; local
// pg is cast because callers only use the shared query/insert surface.
export type Database = NeonHttpDatabase<typeof schema>

export function createDb(connectionString: string): Database {
  if (isLocalPostgres(connectionString)) {
    const pool = new pg.Pool({ connectionString })
    return drizzleNode({ client: pool, schema }) as unknown as Database
  }
  const sql = neon(connectionString)
  return drizzleNeon({ client: sql, schema })
}

let cached: Database | undefined
export function getDb(): Database {
  if (!cached) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    cached = createDb(url)
  }
  return cached
}
