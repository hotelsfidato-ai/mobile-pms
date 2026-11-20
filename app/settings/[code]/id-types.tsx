import { AdminRoute } from "../../../src/modules/admin/Route";
import { IdTypesScreen } from "../../../src/modules/settings/Lists";

/* ID types (Settings → Lists). */
export default function IdTypesRoute() {
  return <AdminRoute screen={IdTypesScreen} />;
}
