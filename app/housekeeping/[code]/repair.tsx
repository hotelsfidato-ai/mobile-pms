import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { ReportRepair } from "../../../src/modules/housekeeping/ReportRepair";

/* /housekeeping/5EL/repair?room=204 - opened from a room's Repair; `room` is optional (the building). */
export default function ReportRepairRoute() {
  const s = useSession();
  const { code, room } = useLocalSearchParams<{ code: string; room?: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <ReportRepair
      hotel={hotel}
      room={room ?? ""}
      role={roleAt(s.who, hotel.code)}
      onDone={() => (router.canGoBack() ? router.back() : router.replace(`/housekeeping/${hotel.code}`))}
    />
  );
}
