import { V2BulkElement, V2Log, V2LogType, V2PostTransaction } from "@formance/formance-sdk/sdk/models/shared";
import { Destination, Log } from "./core";
import { txScript } from "./numscript";
import { writeFileSync } from "fs";

const logEntriesToBulk = (entries: V2Log[]) : V2BulkElement[] => {
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
        },
      };

      if (log.data.transaction['reference']) {
        data['reference'] = log.data.transaction['reference'];
      }
      bulk.push({
        action: 'CREATE_TRANSACTION',
        data,
      });
    }

    if (log.type === V2LogType.RevertedTransaction) {
      bulk.push({
        action: 'REVERT_TRANSACTION',
        data: {
          id: BigInt(log.data['revertedTransactionID']),
        }
      });
    }
  }

  return bulk;
}

export const restore = async (
  log: Log,
  dest: Destination,
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

  let [pc, ps, total] = [0, 10, Math.ceil(log.size() / 10)];

  for await(const page of log.all(ps)) {
    console.log(`[sync] preparing log page [${pc}/${total}]`);
    const bulk = logEntriesToBulk(page);

    console.log(`[sync] pushing log page [${pc}]`); 
    try {
      const res = await dest.client.ledger.v2CreateBulk({
        ledger: dest.ledger,
        requestBody: bulk,
      });
      console.log(`[sync] pushed log page [${pc}] [res=${res.statusCode}]`);
      for (const [key, entry] of (res.v2BulkResponse?.data || []).entries()) {
        if (entry.responseType === "ERROR") {
          console.log(entry, bulk[key]);
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