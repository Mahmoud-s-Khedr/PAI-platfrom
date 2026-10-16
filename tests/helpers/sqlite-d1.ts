import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { join } from "node:path";

/**
 * A minimal D1 stand-in backed by an in-memory SQLite database with every
 * migration applied, so Worker tests exercise real constraints and triggers.
 */
class Statement {
  constructor(private readonly db: DatabaseSync, readonly query: string, private readonly values: SQLInputValue[] = []) {}
  bind(...values: unknown[]) { return new Statement(this.db, this.query, values.map((value) => (value === undefined ? null : typeof value === "boolean" ? Number(value) : value) as SQLInputValue)); }
  async first<T>() { return (this.db.prepare(this.query).get(...this.values) ?? null) as T | null; }
  async all<T>() { return { results: this.rows() as T[], success: true, meta: {} }; }
  async run() { const outcome = this.db.prepare(this.query).run(...this.values); return { success: true, results: [], meta: { changes: Number(outcome.changes), last_row_id: Number(outcome.lastInsertRowid) } }; }
  execute() { return /^\s*(SELECT|WITH)|RETURNING/i.test(this.query) ? { results: this.rows(), success: true, meta: {} } : (this.db.prepare(this.query).run(...this.values), { results: [], success: true, meta: {} }); }
  private rows() { return this.db.prepare(this.query).all(...this.values); }
}

export function createTestD1() {
  const db = new DatabaseSync(":memory:");
  const dir = join(import.meta.dirname, "..", "..", "migrations");
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) db.exec(readFileSync(join(dir, file), "utf8"));
  db.exec("PRAGMA foreign_keys = ON");
  return {
    raw: db,
    prepare: (query: string) => new Statement(db, query),
    async batch(statements: Statement[]) {
      db.exec("BEGIN");
      try {
        const results = statements.map((statement) => statement.execute());
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

export type TestD1 = ReturnType<typeof createTestD1>;
