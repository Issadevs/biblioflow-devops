import { afterEach, describe, expect, it } from "vitest";
import { createDatabasePool } from "../../src/shared/database.js";

describe("createDatabasePool", () => {
  let pool;

  afterEach(async () => {
    await pool?.end();
  });

  it("configure un pool PostgreSQL borné", () => {
    pool = createDatabasePool("postgresql://user:pass@localhost:5432/example");
    expect(pool.options.max).toBe(10);
    expect(pool.options.connectionTimeoutMillis).toBe(5000);
    expect(pool.options.idleTimeoutMillis).toBe(30000);
  });
});
