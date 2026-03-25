import { loadData } from "./utils";

loadData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
