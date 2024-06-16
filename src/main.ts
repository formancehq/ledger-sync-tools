import dotenv from 'dotenv';
dotenv.config();

import { readFileSync } from 'fs';
import { Log, NewLog } from './core';
import { extract } from './extract';
import { restore } from './load';
import { clients } from './client';

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