import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres'
import { neon } from '@neondatabase/serverless'
import pg from 'pg'
import * as schema from './schema'

function isNeonHttpHost(connectionString: string) {
  try {
    const host = new URL(connectionString).hostname
    return host.includes('neon.tech')
  } catch {
    return false
  }
}

// Neon HTTP for Workers against Neon; node-postgres for local Docker, Supabase,
// and other Postgres hosts (Workers need nodejs_compat + a reachable URL /
// Hyperdrive). Typed as NeonHttpDatabase so API typecheck stays single-shaped.
export type Database = NeonHttpDatabase<typeof schema>

export function createDb(connectionString: string): Database {
  if (isNeonHttpHost(connectionString)) {
    const sql = neon(connectionString)
    return drizzleNeon({ client: sql, schema })
  }
  const pool = new pg.Pool({ connectionString, max: 5 })
  return drizzleNode({ client: pool, schema }) as unknown as Database
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
