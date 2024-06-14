import { SDK } from "@formance/formance-sdk";
import { V2Log } from "@formance/formance-sdk/sdk/models/shared";

export type Source = {
  ledger: string;
  client: SDK;
};

export type Destination = {
  ledger: string;
  client: SDK;
};

export type Log = {
  entries : V2Log[];
  all: (pageSize? : number) => Generator<V2Log[], void, unknown>;
  writeFile: (filename : string) => void;
  size: () => number;
};

export const NewLog = (entries : V2Log[]) : Log => {
  const log : Log = {
    entries,
    all: function*(pageSize? : number) {
      pageSize = pageSize || 100;
  
      let i = 0;
      while (i < entries.length) {
        yield entries.slice(i, i + pageSize);
        i += pageSize;
      }
    },
    writeFile: (filename : string) => {
      const data = log.entries.map((l) => JSON.stringify(l)).join('\n');
    },
    size: () => {
      return log.entries.length;
    },
  };

  return log;
};