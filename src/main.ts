import dotenv from 'dotenv';
dotenv.config();

import { SDK as Formance, SDK } from '@formance/formance-sdk';
import { createAuthorizationProvider } from '@formance/formance-sdk-oauth';
import { readFileSync } from 'fs';
import { Log, NewLog } from './core';
import { extract } from './extract';
import { restore } from './load';

const clients = () : [SDK, SDK] => {
  const srcClient = new Formance({
    serverURL: process.env['SRC_ENDPOINT'] || '',
    authorization: createAuthorizationProvider({
        endpointUrl: process.env['SRC_ENDPOINT'] || '',
        clientId: process.env['SRC_CLIENT_ID'] || '',
        clientSecret: process.env['SRC_CLIENT_SECRET'] || '',
    }),
  });

  const destClient = new Formance({
    serverURL: process.env['DEST_ENDPOINT'] || '',
    authorization: createAuthorizationProvider({
        endpointUrl: process.env['DEST_ENDPOINT'] || '',
        clientId: process.env['DEST_CLIENT_ID'] || '',
        clientSecret: process.env['DEST_CLIENT_SECRET'] || '',
    }),
  });

  return [srcClient, destClient];
}

(async () => {
  for (const key of [
    'SRC_ENDPOINT',
    'SRC_CLIENT_ID',
    'SRC_CLIENT_SECRET',
    'SRC_LEDGER',
    'DEST_ENDPOINT',
    'DEST_CLIENT_ID',
    'DEST_CLIENT_SECRET',
    'DEST_LEDGER',
  ]) {
    if (!process.env[key]) {
      throw new Error(`missing env var ${key}`);
    }
  };

  const [srcClient, destClient] = clients();

  const cmd = process.argv[process.argv.length - 1];

  if (cmd === 'snapshot') {
    const filename = `log-${process.env['SRC_LEDGER'] || ''}.json`;

    const log = await extract({
      ledger: process.env['SRC_LEDGER'] || '',
      client: srcClient,
    });

    console.log(`[snapshot] writing log to ${filename}`);
    log.writeFile(filename);

    process.exit(0);
  }

  if (cmd === 'restore') {
    const filename = `log-${process.env['SRC_LEDGER'] || ''}.json`;
    const _log = readFileSync(filename).toString().split('\n').map((l) => JSON.parse(l));
    const log : Log = NewLog(_log);
    await restore(log, {
      ledger: process.env['DEST_LEDGER'] || '',
      client: destClient,
    });
  }
})();