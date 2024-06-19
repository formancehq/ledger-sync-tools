import { V2BulkElement, V2Log, V2LogType, V2PostTransaction } from "@formance/formance-sdk/sdk/models/shared";
import { Destination, Log } from "./core";
import { txScript } from "./numscript";
import { writeFileSync } from "fs";

export type Context = {
  txid: number;
  txSeqGap?: [number, number][];
}

const logEntriesToBulk = (entries: V2Log[], context: Context) : V2BulkElement[] => {
  const bulk : V2BulkElement[] = [];
    
  for (const log of entries) {
    if (log.type === V2LogType.SetMetadata) {
      bulk.push({
        action: 'ADD_METADATA',
        data: {
          targetId: `${log.data['targetId']}`,
          targetType: log.data['targetType'],
          metadata: {
            ...log.data['metadata'],
          },
        }
      });
    }

    if (log.type === V2LogType.NewTransaction) {
      const data : V2PostTransaction = {
        timestamp: new Date(log.data.transaction['timestamp']),
        reference: log.data.transaction['reference'] || undefined,
        script: {
          plain: txScript(log.data.transaction, log.data.accountMetadata),
        },
        metadata: {
          ...log.data.transaction['metadata'],
          _expected_txid: `${context.txid}`,
        },
      };

      if (log.data.transaction['reference']) {
        data['reference'] = log.data.transaction['reference'];
      }

      // Special case for handling transaction sequence gaps,
      // in affected sandbox ledgers.
      // We're going to fill the gap with empty transactions.
      if (context.txSeqGap) {
        for (const [start, end] of context.txSeqGap) {
          if (context.txid === start) {
            for (let i = start; i <= end; i++) {
              bulk.push({
                action: 'CREATE_TRANSACTION',
                data: {
                  postings: [
                    {
                      source: 'world',
                      destination: 'world',
                      amount: BigInt(0),
                      asset: 'NOOP/2',
                    }
                  ],
                  metadata: {},
                }
              });
            }

            context.txid = end + 1;
          }
        }
      }

      bulk.push({
        action: 'CREATE_TRANSACTION',
        data,
      });

      context.txid++;
    }

    if (log.type === V2LogType.RevertedTransaction) {
      bulk.push({
        action: 'REVERT_TRANSACTION',
        data: {
          id: BigInt(log.data['revertedTransactionID']),
          force: true,
        }
      });

      context.txid++;
    }
  }

  return bulk;
}

export const restore = async (
  log: Log,
  dest: Destination,
  context: Context,
) => {
  try {
    console.log(`[init] creating ledger ${dest.ledger}`);
    await dest.client.ledger.v2CreateLedger({
      ledger: dest.ledger,
    });
  } catch (e) {
    console.log(`[init] ledger ${dest.ledger} already exists`);
    process.exit(1);
  }

  let [pc, ps] = [0, 1];
  const total = Math.ceil(log.size() / ps);

  for await(const page of log.all(ps)) {
    console.log(`[sync] preparing log page [${pc}/${total}]`);
    const bulk = logEntriesToBulk(page, context);

    console.log(`[sync] pushing log page [${pc}]`); 
    try {
      const res = await dest.client.ledger.v2CreateBulk({
        ledger: dest.ledger,
        requestBody: bulk,
      });
      console.log(`[sync] pushed log page [${pc}] [res=${res.statusCode}]`);
      for (const [key, entry] of (res.v2BulkResponse?.data || []).entries()) {
        if (entry.responseType === "ERROR") {
          console.log(entry);
          console.log(page[key]);
          console.log(bulk[key]);
          process.exit(1);
        }
      }
    } catch (e) {
      console.log(`[sync] failed to push log page [${pc}]`);
      writeFileSync('debug-bulk-page.json', JSON.stringify(bulk, null, 2));
      writeFileSync('debug-log-page.json', JSON.stringify(page, null, 2));
    }
    pc++;
  }
}