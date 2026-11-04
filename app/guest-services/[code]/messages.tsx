import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Messages } from "../../../src/modules/guest-services/Messages";

/* /guest-services/5EL/messages - every booking's unread; ?reservation= one booking's, with the reply box. */
export default function MessagesRoute() {
  const s = useSession();
  const { code, reservation } = useLocalSearchParams<{ code: string; reservation?: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <Messages
      hotel={hotel}
      role={roleAt(s.who, hotel.code)}
      {...(reservation ? { reservation } : {})}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/guest-services/${hotel.code}`))}
      onOpen={(id) => router.push(`/guest-services/${hotel.code}/messages?reservation=${encodeURIComponent(id)}`)}
    />
  );
}
