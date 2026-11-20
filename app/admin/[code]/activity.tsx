import { AdminRoute } from "../../../src/modules/admin/Route";
import { Activity } from "../../../src/modules/admin/Logs";

/* Activity (the web's /admin/activity, Settings → People and security). */
export default function ActivityRoute() {
  return <AdminRoute screen={Activity} />;
}
