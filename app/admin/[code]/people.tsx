import { People } from "../../../src/modules/admin/People";
import { AdminRoute } from "../../../src/modules/admin/Route";

/* People (the web's /people and Settings → People and security → People). */
export default function PeopleRoute() {
  return <AdminRoute screen={People} />;
}
