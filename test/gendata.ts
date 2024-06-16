import dotenv from 'dotenv';
dotenv.config();
import { SDK } from '@formance/formance-sdk';
import { readFileSync } from "fs";
import YAML from "yaml";
import { client } from './client';

type Action = (ledger: string, client: SDK) => any;

type Transaction = {
  times: number;
  script: string;
};

type Revert = {
  txid: number;
}

const transaction = (opts: Transaction) : Action => {
  return async (ledger: string, client: SDK) => {
    for (let i = 0; i < opts.times; i++) {
      await client.ledger.v2CreateTransaction({
        ledger,
        v2PostTransaction: {
          script: {
            plain: opts.script,
          },
          metadata: {},
        }
      });
    }
  };
};

const revert = (opts: Revert) : Action => {
  return async (ledger: string, client: SDK) => {
    await client.ledger.v2RevertTransaction({
      ledger,
      id: BigInt(opts.txid),
    });
  };
}

(async () => {
  const ledger = 'ledger-test-005';

  try {
    await client.ledger.v2CreateLedger({
      ledger,
      v2CreateLedgerRequest: {
        bucket: 'ledger-test-round-1',
      }
    });
  } catch (e) {

  }
  
  const _data = readFileSync(`${__dirname}/data-001.yml`).toString();
  const data : {
    [key: string]: any;
  }[]  = YAML.parse(_data);

  const actions : Action[] = [];
  
  for (const entry of data) {
    const [type] = Object.keys(entry);
    const content = entry[type];

    if (type === 'transaction') {
      actions.push(transaction(content as Transaction));
    }

    if (type === 'revert') {
      actions.push(revert(content as Revert));
    }
  }

  for (const action of actions) {
    await action(ledger, client);
  }
})();