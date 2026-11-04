import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { WorkOrders } from "../../../src/modules/housekeeping/WorkOrdersScreen";

/* /housekeeping/5EL/work-orders - the web's /h/:code/work-orders. The list itself says who may do what. */
export default function WorkOrdersRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <WorkOrders
      hotel={hotel}
      role={roleAt(s.who, hotel.code)}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/housekeeping/${hotel.code}`))}
    />
  );
}
