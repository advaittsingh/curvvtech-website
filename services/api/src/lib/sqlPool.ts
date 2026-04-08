import { pool } from "../db.js";

/** Tagged-template SQL using one shared pg pool (replaces @neondatabase/serverless pattern). */
export function sql(strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]> {
  let text = "";
  const params: unknown[] = [];
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) {
      params.push(values[i]);
      text += `$${params.length}`;
    }
  }
  return pool.query(text, params).then((r) => r.rows as unknown[]);
}

export function firstRow<T>(result: unknown): T | null {
  return Array.isArray(result) && result.length > 0 ? (result[0] as T) : null;
}
