import { AdminRoute } from "../../../src/modules/admin/Route";
import { Backfill } from "../../../src/modules/admin/Backfill";

/* Backfill data (Settings → Property → Backfill data; the web's /h/:code/backfill for the Accountant). */
export default function BackfillRoute() {
  return <AdminRoute screen={Backfill} />;
}
