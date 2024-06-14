import dotenv from 'dotenv';
dotenv.config();

import { SDK as Formance } from '@formance/formance-sdk';
import { createAuthorizationProvider } from '@formance/formance-sdk-oauth';
import { copy } from './copy';
import axios from 'axios';
import { HTTPClient } from '@formance/formance-sdk/lib/http';
import { cp } from 'fs';
import { V2BulkElement, V2LogType, V2TargetType } from '@formance/formance-sdk/sdk/models/shared';

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

  copy({
    ledger: process.env['SRC_LEDGER'] || '',
    client: srcClient,
  }, {
    ledger: process.env['DEST_LEDGER'] || '',
    client: destClient,
  });
})();