import { V2BulkElement, V2Log, V2LogType, V2PostTransaction } from "@formance/formance-sdk/sdk/models/shared";
import { Destination, Log } from "./core";
import { txScript } from "./numscript";

const logEntriesToBulk = (entries: V2Log[]) : V2BulkElement[] => {
  const bulk : V2BulkElement[] = [];
    
  for (const log of entries) {
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
      bulk.push({
        action: 'CREATE_TRANSACTION',
        data,
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
    const res = await dest.client.ledger.v2CreateBulk({
      ledger: dest.ledger,
      requestBody: bulk,
    });
    // console.log(res.v2BulkResponse?.data);
    console.log(`[sync] pushed log page [${pc}] [res=${res.statusCode}]`);
    pc++;
  }

  // writeFileSync('bulk.json', JSON.stringify(bulk, null, 2));
}