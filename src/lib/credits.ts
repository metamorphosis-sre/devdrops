export const BUNDLES = {
  starter:  { price: 5,   credits: 5.00,   queries: 500,    label: "Starter",  bonus: "0%" },
  pro:      { price: 25,  credits: 27.50,  queries: 2750,   label: "Pro",      bonus: "10%" },
  business: { price: 100, credits: 120.00, queries: 12000,  label: "Business", bonus: "20%" },
} as const;

export type BundleName = keyof typeof BUNDLES;

export async function getBalance(db: D1Database, wallet: string) {
  const w = wallet.toLowerCase();
  const row = await db.prepare(
    "SELECT balance, total_purchased, total_used, created_at, updated_at FROM credit_balances WHERE wallet = ?"
  ).bind(w).first<{ balance: number; total_purchased: number; total_used: number; created_at: string; updated_at: string }>();

  if (!row) return { balance: 0, total_purchased: 0, total_used: 0, has_account: false };

  return { ...row, has_account: true };
}

export async function addCredits(db: D1Database, wallet: string, bundle: BundleName) {
  const w = wallet.toLowerCase();
  const b = BUNDLES[bundle];

  await db.batch([
    db.prepare(
      `INSERT INTO credit_balances (wallet, balance, total_purchased, total_used)
       VALUES (?, ?, ?, 0)
       ON CONFLICT(wallet) DO UPDATE SET
         balance = balance + excluded.balance,
         total_purchased = total_purchased + excluded.total_purchased,
         updated_at = datetime('now')`
    ).bind(w, b.credits, b.credits),
    db.prepare(
      "INSERT INTO credit_transactions (wallet, type, amount, bundle) VALUES (?, 'purchase', ?, ?)"
    ).bind(w, b.credits, bundle),
  ]);

  return getBalance(db, w);
}

export async function hasCredits(db: D1Database, wallet: string, amount: number): Promise<boolean> {
  const w = wallet.toLowerCase();
  const row = await db.prepare(
    "SELECT balance FROM credit_balances WHERE wallet = ?"
  ).bind(w).first<{ balance: number }>();
  return (row?.balance ?? 0) >= amount;
}

export async function deductCredits(db: D1Database, wallet: string, amount: number, endpoint: string) {
  const w = wallet.toLowerCase();

  const row = await db.prepare(
    "SELECT balance FROM credit_balances WHERE wallet = ?"
  ).bind(w).first<{ balance: number }>();

  if (!row || row.balance < amount) {
    throw new Error("Insufficient credits");
  }

  await db.batch([
    db.prepare(
      `UPDATE credit_balances SET balance = balance - ?, total_used = total_used + ?, updated_at = datetime('now') WHERE wallet = ?`
    ).bind(amount, amount, w),
    db.prepare(
      "INSERT INTO credit_transactions (wallet, type, amount, endpoint) VALUES (?, 'usage', ?, ?)"
    ).bind(w, amount, endpoint),
  ]);

  return { remaining: row.balance - amount };
}

export async function getTransactions(db: D1Database, wallet: string, limit = 20) {
  const w = wallet.toLowerCase();
  const { results } = await db.prepare(
    "SELECT type, amount, bundle, endpoint, created_at FROM credit_transactions WHERE wallet = ? ORDER BY created_at DESC LIMIT ?"
  ).bind(w, limit).all();
  return results;
}
