import { TransactionData } from "@formance/formance-sdk/sdk/models/shared";

export const txScript = (tx: TransactionData, opts?: {
  overdrafts: {
    [account: string]: boolean;
  }
}) : string => {
  const statements : string[] = [];
  for (const posting of tx.postings) {
    statements.push(
`send [${posting.asset} ${posting.amount}] (
  source = @${posting.source}${posting.source !== 'world' ? ' allowing unbounded overdraft' : ''}
  destination = @${posting.destination}
)`
    );
  }

  return `${statements.join('\n')}`;
}