import { SDK } from "@formance/formance-sdk";
import { createAuthorizationProvider } from "@formance/formance-sdk-oauth";

export const clients = () : [SDK, SDK] => {
  const srcClient = new SDK({
    serverURL: process.env['SRC_ENDPOINT'] || '',
    authorization: createAuthorizationProvider({
        endpointUrl: process.env['SRC_ENDPOINT'] || '',
        clientId: process.env['SRC_CLIENT_ID'] || '',
        clientSecret: process.env['SRC_CLIENT_SECRET'] || '',
    }),
  });

  const destClient = new SDK({
    serverURL: process.env['DEST_ENDPOINT'] || '',
    authorization: createAuthorizationProvider({
        endpointUrl: process.env['DEST_ENDPOINT'] || '',
        clientId: process.env['DEST_CLIENT_ID'] || '',
        clientSecret: process.env['DEST_CLIENT_SECRET'] || '',
    }),
  });

  return [srcClient, destClient];
}