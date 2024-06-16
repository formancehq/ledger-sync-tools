import { V2Account, V2Transaction } from "@formance/formance-sdk/sdk/models/shared";
import { client } from "./client";
import { createHash } from "crypto";

(BigInt.prototype as any).toJSON = function() {
  return this.toString()
}

async function* accounts(ledger: string) : AsyncGenerator<V2Account> {
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

async function* transactions(ledger: string) {
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

(async () => {
  const ledgers = [
    'ledger-test-005',
    'test-copy-tool-116',
  ];

  const states = await Promise.all(ledgers.map(async (ledger: string) => {
    const _stats = await client.ledger.v2ReadStats({
      ledger,
    });

    const _accounts : V2Account[] = [];

    for await(const account of accounts(ledger)) {
      _accounts.push(account);
    }

    const _transactions : V2Transaction[] = [];

    for await(const transaction of transactions(ledger)) {
      _transactions.push(...transaction);
    }

    const hash = createHash('sha256');
    hash.update(JSON.stringify({
      stats: _stats.v2StatsResponse,
      accounts: _accounts,
      // transactions: _transactions,
    }));

    return {
      ledger,
      stats: _stats.v2StatsResponse,
      accounts: _accounts,
      hash: hash.digest('hex'),
    };
  }));

  console.log(JSON.stringify(states, null, 2));
  // console.log(states);
})();