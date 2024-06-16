import { state } from "../src/cmp";
import { client } from "./client";

(async () => {
  const ledgers = [
    'ledger-test-005',
    'test-copy-tool-116',
  ];

  const states = await Promise.all(ledgers.map(async (ledger: string) => {
    return state(client, ledger);
  }));

  console.log(states);
})();