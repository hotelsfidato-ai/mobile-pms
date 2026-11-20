import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../../src/core/session";
import { GroupPage } from "../../../../src/modules/reservations/Group";

/* /reservations/5EL/groups/<id>: the web's /h/:code/groups/:id, one group. */
export default function GroupRoute() {
  const s = useSession();
  const { code, id } = useLocalSearchParams<{ code: string; id: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <GroupPage
      key={`${hotel.code}/${id}`} hotel={hotel} role={roleAt(s.who, hotel.code)} id={id}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/reservations/${hotel.code}/groups`))}
    />
  );
}
