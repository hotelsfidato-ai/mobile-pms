import { AdminRoute } from "../../../src/modules/admin/Route";
import { MsgSchedules } from "../../../src/modules/settings/MsgSchedules";

/* Scheduled reports (Settings → Messages: the owner, an administrator and the GM; lane m13-set-messages). */
export default function MsgSchedulesRoute() {
  return <AdminRoute screen={MsgSchedules} />;
}
