import { Redirect, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { Channels } from "../../../src/modules/inventory/Channels";

/* /inventory/5EL/channels — the channel manager, the web's /h/:code/channels
   (Distribution, and Settings → Connections → Channels). */
export default function ChannelsRoute() {
  const s = useSession();
  const { code } = useLocalSearchParams<{ code: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return <Channels hotel={hotel} role={roleAt(s.who, hotel.code)} />;
}
