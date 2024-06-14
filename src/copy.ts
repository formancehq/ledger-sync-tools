import { SDK } from "@formance/formance-sdk";
import { Posting, V2BulkElement, V2Log, V2LogType, V2PostTransaction } from "@formance/formance-sdk/sdk/models/shared";
import { writeFileSync } from "fs";
import { txScript } from "./numscript";

type Source = {
  ledger: string;
  client: SDK;
};

type Destination = {
  ledger: string;
  client: SDK;
};

async function* _logs(src: Source) : AsyncGenerator<V2Log[]> {
  let cursor = '';
  while (true) {
    const res = await src.client.ledger.v2ListLogs({
      ledger: src.ledger,
      cursor,
    });

    if (!res.v2LogsCursorResponse) {
      return;
    }

    yield res.v2LogsCursorResponse.cursor.data || [];

    cursor = res.v2LogsCursorResponse?.cursor.next || '';

    if (!cursor) {
      return;
    }
  }
}

async function* logs(src: Source) : AsyncGenerator<V2Log[]> {
  const pages : V2Log[][] = [];

  console.log('[logs] fetching logs');
  let pc = 0;
  for await(const page of _logs(src)) {
    console.log(`[logs] fetched log page [${pc++}]`);
    pages.push(page);
  }

  pages.reverse();

  console.log(`[logs] fetched ${pages.length} log pages`);
  for (const page of pages) {
    yield page.reverse();
  }
}

export const copy = async (
  src: Source,
  dest: Destination,
) => {
  try {
    console.log(`[init] creating ledger ${dest.ledger}`);
    await dest.client.ledger.v2CreateLedger({
      ledger: dest.ledger,
    });
  } catch (e) {
    console.log(e);
  }

  let pc = 0;
  for await(const page of logs(src)) {
    console.log(`[sync] preparing log page [${pc++}]`);
    const bulk : V2BulkElement[] = [];
    
    for (const log of page) {
      if (log.type === V2LogType.SetMetadata) {
        bulk.push({
          action: 'ADD_METADATA',
          data: {
            targetId: log.data['targetId'],
            targetType: log.data['targetType'],
            metadata: {
              ...log.data['metadata'],
              'copied': 'true',
            },
          }
        });
      }
  
      if (log.type === V2LogType.NewTransaction) {
        const data : V2PostTransaction = {
          timestamp: new Date(log.data.transaction['timestamp']),
          reference: log.data.transaction['reference'] || undefined,
          // postings: [
          //   ...log.data.transaction['postings'].map((e: Posting) => {
          //     return {
          //       source: e.source,
          //       destination: e.destination,
          //       amount: BigInt(e.amount),
          //       asset: e.asset,
          //     };
          //   }),
          // ],
          script: {
            plain: txScript(log.data.transaction),
          },
          metadata: {
            ...log.data.transaction['metadata'],
          },
        };
  
        if (log.data.transaction['reference']) {
          data['reference'] = log.data.transaction['reference'];
        }

        console.log(data.script?.plain);
  
        bulk.push({
          action: 'CREATE_TRANSACTION',
          data,
        });
      }
    }

    console.log(`[sync] pushing log page [${pc}]`);
    const res = await dest.client.ledger.v2CreateBulk({
      ledger: dest.ledger,
      requestBody: bulk,
    });
    console.log(res.statusCode);
    console.log(res.v2BulkResponse?.data);
    console.log(`[sync] pushed log page [${pc}]`);
  }

  // writeFileSync('bulk.json', JSON.stringify(bulk, null, 2));
}