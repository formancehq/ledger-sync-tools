import { TransactionData } from "@formance/formance-sdk/sdk/models/shared";

export const txScript = (tx: TransactionData, accountMetadata: {
  [key: string]: {
    [key: string]: string;
  }
}) : string => {
  const statements : string[] = [];

  for (const posting of tx.postings) {
    const script =
`send [${posting.asset} ${posting.amount}] (
  source = @${posting.source}${posting.source !== 'world' ? ' allowing unbounded overdraft' : ''}
  destination = @${posting.destination}
)`;
    statements.push(script);
  }

  if (accountMetadata) {
    for (const [account, meta] of Object.entries(accountMetadata)) {
      for (const [key, value] of Object.entries(meta)) {
        const script = `set_account_meta(@${account}, "${key}", "${value}")`;
        statements.push(script);
      }
    }
  }

  return `${statements.join('\n')}`;
}