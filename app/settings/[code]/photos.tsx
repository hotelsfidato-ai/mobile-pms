import { AdminRoute } from "../../../src/modules/admin/Route";
import { PropPhotos } from "../../../src/modules/settings/PropPhotos";

/* Logo and photos (Settings → Property; lane mobile/m13-set-property). */
export default function PhotosRoute() {
  return <AdminRoute screen={PropPhotos} />;
}
