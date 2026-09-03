import bcrypt from "bcryptjs";
import { query, queryOne } from "./client";

export type User = {
  id: number;
  email: string;
  display_name: string;
  created_at: string;
};

export async function userCount(): Promise<number> {
  const row = await queryOne<{ count: string }>("SELECT COUNT(*) AS count FROM users");
  return row ? parseInt(row.count, 10) : 0;
}

export async function createUser(
  email: string,
  password: string,
  displayName: string,
): Promise<User> {
  const hash = await bcrypt.hash(password, 10);
  const rows = await query<User>(
    `INSERT INTO users (email, password_hash, display_name)
     VALUES (LOWER($1), $2, $3)
     RETURNING id, email, display_name, created_at`,
    [email, hash, displayName],
  );
  return rows[0];
}

export async function verifyUser(email: string, password: string): Promise<User | null> {
  const row = await queryOne<User & { password_hash: string }>(
    `SELECT id, email, display_name, created_at, password_hash
     FROM users WHERE email = LOWER($1)`,
    [email],
  );
  if (!row) return null;
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return null;
  const { password_hash: _ph, ...user } = row;
  return user;
}
