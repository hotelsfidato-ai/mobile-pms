import { Redirect, router, Stack, useLocalSearchParams } from "expo-router";
import { roleAt, useSession } from "../../../src/core/session";
import { OrderPad } from "../../../src/modules/pos/OrderPad";

/* /pos/5EL/pad?table=N1 (a free table) or ?order=<id>&table=T9 (another
   round on an open bill): the order pad, over the screen that opened it, as
   the web's dialog opens over Tables. It draws its own dim and card. */
export default function PadRoute() {
  const s = useSession();
  const { code, table, order } = useLocalSearchParams<{ code: string; table?: string; order?: string }>();
  if (!s.who) return <Redirect href="/" />;
  const hotel = s.who.hotels.find((h) => h.code === code);
  if (!hotel) return <Redirect href="/all" />;
  return (
    <>
      <Stack.Screen options={{ presentation: "transparentModal", animation: "fade", contentStyle: { backgroundColor: "transparent" } }} />
      <OrderPad
        hotel={hotel}
        role={roleAt(s.who, hotel.code)}
        table={table ?? ""}
        {...(order ? { orderId: order } : {})}
        onClose={() => (router.canGoBack() ? router.back() : router.replace(`/pos/${hotel.code}/tables`))}
      />
    </>
  );
}
