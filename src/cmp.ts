import { SDK } from "@formance/formance-sdk";
import { V2Account, V2Transaction } from "@formance/formance-sdk/sdk/models/shared";
import { createHash } from "crypto";

(BigInt.prototype as any).toJSON = function() {
  return this.toString()
}

async function* accounts(
  client: SDK,
  ledger: string
) : AsyncGenerator<V2Account> {
  let cursor = '';

  while (true) {
    const res = await client.ledger.v2ListAccounts({
      ledger,
      cursor,
      expand: 'effectiveVolumes',
    });

    if (!res.v2AccountsCursorResponse) {
      return;
    }

    for (const account of res.v2AccountsCursorResponse.cursor.data || []) {
      yield account;
    }

    cursor = res.v2AccountsCursorResponse?.cursor.next || '';

    if (!cursor) {
      return;
    }
  }
}

async function* transactions(
  client: SDK,
  ledger: string,
) {
  let cursor = '';

  while (true) {
    const res = await client.ledger.v2ListTransactions({
      ledger,
      cursor,
    });

    if (!res.v2TransactionsCursorResponse) {
      return;
    }

    yield res.v2TransactionsCursorResponse.cursor.data || [];

    cursor = res.v2TransactionsCursorResponse?.cursor.next || '';

    if (!cursor) {
      return;
    }
  }
}

export const state = async (
  client: SDK,
  ledger: string
) => {
  console.log(`[state] fetching state for ledger ${ledger}`);
  const _stats = await client.ledger.v2ReadStats({
    ledger,
  });

  const _accounts : V2Account[] = [];

  for await(const account of accounts(client, ledger)) {
    _accounts.push(account);
  }

  const _transactions : V2Transaction[] = [];

  for await(const transaction of transactions(client, ledger)) {
    _transactions.push(...transaction);
  }

  const hash = createHash('sha256');

  hash.update(JSON.stringify({
    stats: _stats.v2StatsResponse,
    accounts: _accounts,
    // do not include transactions in the hash for now
    // as exact timestamp precision seems to differ
    // transactions: _transactions,
  }));

  return {
    ledger,
    stats: _stats.v2StatsResponse,
    // accounts: _accounts,
    // transactions: _transactions,
    estimatedHash: hash.digest('hex'),
  };
};