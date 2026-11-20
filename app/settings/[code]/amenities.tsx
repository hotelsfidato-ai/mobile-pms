import { AdminRoute } from "../../../src/modules/admin/Route";
import { PropAmenities } from "../../../src/modules/settings/PropAmenities";

/* Amenities (Settings → Property; lane mobile/m13-set-property). */
export default function AmenitiesRoute() {
  return <AdminRoute screen={PropAmenities} />;
}
