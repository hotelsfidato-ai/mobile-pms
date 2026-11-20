import { AdminRoute } from "../../../src/modules/admin/Route";
import { Properties } from "../../../src/modules/admin/Properties";

/* Properties (the web's /properties). */
export default function PropertiesRoute() {
  return <AdminRoute screen={Properties} />;
}
