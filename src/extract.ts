import { V2Log } from "@formance/formance-sdk/sdk/models/shared";
import { Log, NewLog, Source } from "./core";
import { writeFileSync } from "fs";

(BigInt.prototype as any).toJSON = function() {
  return this.toString()
}

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

export async function extract(src: Source) : Promise<Log> {
  const entries : V2Log[] = [];

  console.log('[logs] fetching logs');
  let pc = 0;
  for await(const page of _logs(src)) {
    console.log(`[logs] fetched log page [${pc++}]`);
    entries.push(...page);
  }

  entries.reverse();

  return NewLog(entries);
}