import dotenv from 'dotenv';
dotenv.config();
import { SDK as Formance, SDK } from '@formance/formance-sdk';
import { createAuthorizationProvider } from '@formance/formance-sdk-oauth';
import { readFileSync } from "fs";
import YAML from "yaml";

type Action = (ledger: string, client: SDK) => any;

type Transaction = {
  times: number;
  script: string;
};

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

(async () => {
  const client = new Formance({
    serverURL: process.env['TEST_ENDPOINT'] || '',
    authorization: createAuthorizationProvider({
        endpointUrl: process.env['TEST_ENDPOINT'] || '',
        clientId: process.env['TEST_CLIENT_ID'] || '',
        clientSecret: process.env['TEST_CLIENT_SECRET'] || '',
    }),
  });

  const ledger = 'ledger-test-002';

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
  }

  for (const action of actions) {
    await action(ledger, client);
  }
})();