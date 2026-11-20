import { AdminRoute } from "../../../src/modules/admin/Route";
import { VipLevels } from "../../../src/modules/settings/Lists";

/* VIP levels (Settings → Lists): the list screen, the group's one list. */
export default function VipRoute() {
  return <AdminRoute screen={VipLevels} />;
}
