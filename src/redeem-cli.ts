import { redeemAndWait } from "./redeem";

const conditionId = process.argv[2];
if (!conditionId) {
  console.error("Usage: bun run src/redeem-cli.ts <conditionId>");
  process.exit(1);
}

redeemAndWait(conditionId, true)
  .then((receipt) => {
    console.log("Redeemed. Tx hash:", receipt.transactionHash);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
