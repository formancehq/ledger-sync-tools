import dotenv from 'dotenv';
dotenv.config();

import { SDK as Formance } from '@formance/formance-sdk';
import { createAuthorizationProvider } from '@formance/formance-sdk-oauth';

export const client = new Formance({
  serverURL: process.env['TEST_ENDPOINT'] || '',
  authorization: createAuthorizationProvider({
      endpointUrl: process.env['TEST_ENDPOINT'] || '',
      clientId: process.env['TEST_CLIENT_ID'] || '',
      clientSecret: process.env['TEST_CLIENT_SECRET'] || '',
  }),
});