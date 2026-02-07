import { approveAllowanceAndWait } from "./approve";

approveAllowanceAndWait()
  .then(() => console.log("Allowance set"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
