import { StockReportRoute } from "../../../src/modules/reports/StockReportRoute";

/* The web's /reports/stock-on-hand (src/modules/reports/routes.tsx), lane m13-rep-stock. */
export default function Route() {
  return <StockReportRoute report="stock-on-hand" />;
}
