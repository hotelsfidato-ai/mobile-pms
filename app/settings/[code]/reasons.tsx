import { AdminRoute } from "../../../src/modules/admin/Route";
import { Reasons } from "../../../src/modules/settings/Lists";

/* Ready reasons (Settings → Lists): the list screen, four tabs. */
export default function ReasonsRoute() {
  return <AdminRoute screen={Reasons} />;
}
