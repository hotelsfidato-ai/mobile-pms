import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react-native";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ApiError, outcomeUnknown } from "../../core/api";
import { c, face, space, t } from "../../core/theme";
import { useRead } from "../../core/ui";
import { Box as Input, Field, Pick, Toggle } from "../front-desk/kit";
import { Box, Btn, Failed, Loading, body, type Said } from "../guest-services/kit";
import { failedWords, formOf, readsAsLine, type SetupForm } from "./bookings";
import { getCrsSetup, saveCrsSetup } from "./data";

/* ══════════════════════════════════════════════════════════════════
   THE CONNECTION TO THE CRS — the web's Setup card on the same page
   (CrsBookings.tsx 77-196), for the owner and an administrator only (the
   page draws it for them, the server refuses anybody else: setup.ts).
   The property's CRS id, the source its bookings are filed under, each CRS
   room type's match here, and the switch. Not pictured (the picture was
   taken as the GM): built from the web's code.

   The form is filled once from the server and then kept as typed, as the
   web's (a re-read after Done does not undo what is being typed). Save
   sends the whole form; the server trims it and answers its own sentence
   for anything wrong (setupProblem, 400; 409 for a CRS property already
   on another hotel). Refused offline with the web's sentence.
   ══════════════════════════════════════════════════════════════════ */

export function Setup({ code, onSaid }: { code: string; onSaid: (s: Said) => void }) {
  const cache = useQueryClient();
  const q = useRead(() => getCrsSetup(code), ["crs", code, "setup"]);
  const [form, setForm] = useState<SetupForm | null>(null);
  useEffect(() => {
    if (q.data && form === null) setForm(formOf(q.data));
  }, [q.data, form]);

  /* One tap, one write (MEMORY 8). */
  const latch = useRef(false);
  const [saving, setSaving] = useState(false);

  if (q.data === undefined && q.error) {
    return <View style={{ marginBottom: 8 }}><Failed title="The CRS connection did not load" error={q.error} onRetry={q.reload} /></View>;
  }
  const data = q.data;
  if (!data || !form) return <Loading words="Reading the CRS connection…" />;

  const set = (patch: Partial<SetupForm>) => setForm({ ...form, ...patch });
  const setRow = (i: number, patch: Partial<SetupForm["roomTypes"][number]>) =>
    set({ roomTypes: form.roomTypes.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  async function save() {
    if (latch.current || !form) return;
    latch.current = true;
    setSaving(true);
    try {
      await saveCrsSetup(code, form);
      onSaid({ title: "Connection saved.", tone: "ok" });
    } catch (e) {
      /* setupProblem's sentence, the 409's, the refusal's; offline the web's; nothing back, not known.
         The form stays as typed: sending it again is the same whole replace (data.ts). */
      onSaid({ ...failedWords("saved", e instanceof Error ? e : null, outcomeUnknown(e), e instanceof ApiError), tone: "bad" });
    } finally {
      latch.current = false;
      setSaving(false);
      void cache.invalidateQueries({ queryKey: ["crs", code] });
    }
  }

  const sources = [{ value: "", label: "Pick a source" }, ...data.sources.map((s) => ({ value: s.id, label: s.name }))];
  const types = [{ value: "", label: "Pick a room type" }, ...data.hotelRoomTypes.map((r) => ({ value: r.id, label: r.name }))];

  return (
    <Box style={{ marginBottom: 8 }}>
      {/* CardHeader: the title, its description, a hairline under */}
      <View style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, borderBottomWidth: 1, borderBottomColor: c.grey200, gap: 4 }}>
        <Text style={t.heading} accessibilityRole="header">Connection to the CRS</Text>
        <Text style={[body, { color: c.grey500 }]}>
          The ids come from the CRS. The property's is the last part of its address there. A room type has no address of
          its own: its id is in the CRS's Firebase console, Firestore, roomTypes (the one whose hotelId is the property's).
          A CRS room type with no match here is not booked by itself.
        </Text>
      </View>

      <View style={{ paddingHorizontal: space.cardX, paddingVertical: space.cardY, gap: 16 }}>
        <Field label="The property's id in the CRS" required>
          <Input label="The property's id in the CRS" value={form.crsHotelId} onChange={(v) => set({ crsHotelId: v })} />
        </Field>
        <Field label="File CRS bookings under" required>
          <Pick title="File CRS bookings under" value={form.bookingSourceId} options={sources} onChange={(v) => set({ bookingSourceId: v })} />
        </Field>

        <View style={{ gap: 8 }}>
          <Text style={[t.label, { color: c.grey700, ...face[500] }]}>Room types</Text>
          {form.roomTypes.length === 0 ? <Text style={[body, { color: c.grey500 }]}>No CRS room type is matched yet.</Text> : null}
          {form.roomTypes.map((r, i) => (
            <View key={i} style={{ gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.grey100 }}>
              <Labelled label={i === 0 ? "CRS room type id" : undefined}>
                <Input label="CRS room type id" value={r.crsRoomTypeId} onChange={(v) => setRow(i, { crsRoomTypeId: v })} />
              </Labelled>
              <Labelled label={i === 0 ? "Is this room type here" : undefined}>
                <Pick title="Is this room type here" label="Room type here" value={r.roomTypeId} options={types} onChange={(v) => setRow(i, { roomTypeId: v })} />
              </Labelled>
              <Pressable
                onPress={() => set({ roomTypes: form.roomTypes.filter((_, j) => j !== i) })}
                accessibilityRole="button" accessibilityLabel="Remove this room type"
                style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? c.grey200 : "transparent" })}
              >
                <Trash2 size={16} color={c.grey600} />
              </Pressable>
            </View>
          ))}
          <Btn
            label="Add a CRS room type" icon={Plus} style={{ alignSelf: "flex-start" }}
            onPress={() => set({ roomTypes: [...form.roomTypes, { crsRoomTypeId: "", roomTypeId: "" }] })}
          />
        </View>

        <Toggle
          value={form.isOn} onChange={(isOn) => set({ isOn })} label="Read bookings from the CRS"
          description="Bookings the CRS makes from the moment this is switched on arrive as waiting bookings. One made while it was off is typed in by hand."
        />

        <Text style={[body, { color: c.grey600 }]}>{readsAsLine(data.readsAs)}</Text>

        <Btn label="Save the connection" variant="primary" disabled={saving} onPress={() => void save()} style={{ alignSelf: "flex-start" }} />
      </View>
    </Box>
  );
}

/** The web's Field with a label only on the first row (its grid's header). */
function Labelled({ label, children }: { label: string | undefined; children: ReactNode }) {
  return label ? <Field label={label}>{children}</Field> : <>{children}</>;
}
