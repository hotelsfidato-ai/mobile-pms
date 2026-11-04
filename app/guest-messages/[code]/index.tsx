import { Redirect, router, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { GuestMessages } from "../../../src/modules/guest-messaging/GuestMessages";

/* /guest-messages/5EL: what the system sent guests (the web's /h/:code/guest-messages);
   ?reservation=<id> for one booking and its group, as the web. */
export default function GuestMessagesRoute() {
  const s = useSession();
  const { code, reservation } = useLocalSearchParams<{ code: string; reservation?: string }>();
  if (!s.who) return <Redirect href="/" />;
  /* Only a property the API listed for this person. */
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  const one = reservation ? `?reservation=${encodeURIComponent(reservation)}` : "";
  return (
    <GuestMessages
      hotel={hotel}
      role={roleAt(s.who, hotel.code)}
      {...(reservation ? { reservation } : {})}
      onOpenDesk={() => router.push(`/guest-services/${hotel.code}/messages${one}`)}
    />
  );
}
