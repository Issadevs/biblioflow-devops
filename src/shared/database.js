import pg from "pg";

export const createDatabasePool = (connectionString) =>
  new pg.Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
