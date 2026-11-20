import RNDateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { CalendarDays, Clock, X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import {
  bounds, dateToDay, dateToTime, dayShown, dayToDate, hotelClock, hotelDay, isDay, isTime, opensOn, PICKER_ZONE, timeShown, timeToDate,
} from "./dateField";
import { c, face, space, t } from "./theme";
import { modalEdge, ripple, shade, useSheetPad } from "./ui";

/* ══════════════════════════════════════════════════════════════════
   A DAY OR A TIME, WITH EACH PHONE'S OWN PICKER (M-16, 20 Nov;
   docs/NATIVE.md) — the web's <input type="date"> and type="time".
   - Android: the system's dialog (DateTimePickerAndroid.open), OK sets it.
   - iPhone: a sheet from the bottom with the calendar (inline) or the
     time wheels, Cancel and Done; Done sets it.
   - The web preview has no native picker: the text is typed as the API
     writes it ("YYYY-MM-DD", "HH:MM").
   The value is the API's text ("" when none); the picker is shown in UTC
   (dateField.ts), so the day picked is the day seen in any phone zone.
   With nothing chosen a day opens on the HOTEL's day (`hotel`: the
   session's, GET /api/hotels' today), never the phone's, and a time on
   the hotel's clock (its `timezone`, India's when none); `min` / `max`
   are days as text. `clearable` draws a clear button where blank is
   allowed. The label above, the error (or a hint) under it, as every
   kit's Field.
   ══════════════════════════════════════════════════════════════════ */

interface Common {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** Blank is allowed: a clear button while there is a value. */
  clearable?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
}

export function DateField({ hotel, min, max, ...p }: Common & {
  /** The session's hotel: its day is where the picker opens with nothing chosen. */
  hotel: { today?: string; businessDate: string };
  min?: string;
  max?: string;
}) {
  const b = bounds(min, max);
  const start = () => dayToDate(opensOn(p.value, hotelDay(hotel), b.min, b.max))!;
  return (
    <Picker {...p} mode="date" shown={isDay(p.value) ? dayShown(p.value) : p.value} placeholder="Choose a day" typed="YYYY-MM-DD"
      start={start} done={dateToDay} min={b.min ? dayToDate(b.min)! : undefined} max={b.max ? dayToDate(b.max)! : undefined} />
  );
}

export function TimeField({ opensAt, hotel, ...p }: Common & {
  /** Where the wheels open with nothing chosen ("HH:MM"); else the hotel's clock now. */
  opensAt?: string;
  /** The session's hotel: its `timezone` is the clock the wheels open on (India's when it has none). */
  hotel?: { timezone?: string | null };
}) {
  const start = () => {
    if (isTime(p.value)) return timeToDate(p.value)!;
    if (isTime(opensAt)) return timeToDate(opensAt)!;
    /* The hotel's clock, never the phone's (dateField.ts hotelClock, 20 Nov). */
    return timeToDate(hotelClock(new Date(), hotel?.timezone))!;
  };
  return <Picker {...p} mode="time" shown={isTime(p.value) ? timeShown(p.value) : p.value} placeholder="Choose a time" typed="HH:MM" start={start} done={dateToTime} />;
}

function Picker({ label, value, onChange, required, clearable, error, hint, disabled, mode, shown, placeholder, typed, start, done, min, max }: Common & {
  mode: "date" | "time"; shown: string; placeholder: string; typed: string;
  start: () => Date; done: (d: Date) => string; min?: Date; max?: Date;
}) {
  const [draft, setDraft] = useState<Date | null>(null);
  const pad = useSheetPad();
  const Icon = mode === "date" ? CalendarDays : Clock;

  const open = () => {
    if (disabled) return;
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: start(), mode, minimumDate: min, maximumDate: max, timeZoneName: PICKER_ZONE,
        onValueChange: (_e, d) => onChange(done(d)), onDismiss: () => undefined,
      });
    } else {
      setDraft(start());
    }
  };

  const border = error ? c.red700 : c.grey300;
  const box = {
    flex: 1, minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: border,
    backgroundColor: disabled ? c.grey50 : c.white,
  } as const;

  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.label, { color: c.grey700 }]}>{label}{required ? <Text style={{ color: c.red700 }}> *</Text> : null}</Text>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        {Platform.OS === "web" ? (
          <TextInput value={value} onChangeText={onChange} editable={!disabled} placeholder={typed} placeholderTextColor={c.grey400}
            accessibilityLabel={label} autoCapitalize="none" autoCorrect={false}
            style={[box, { fontSize: 16, color: disabled ? c.grey500 : c.ink900, ...face[500] }]} />
        ) : (
          <Pressable
            onPress={open} disabled={disabled} android_ripple={ripple} accessibilityRole="button"
            accessibilityLabel={`${label}: ${value ? shown : "not chosen"}`}
            accessibilityHint={mode === "date" ? "Opens the calendar" : "Opens the clock"}
            accessibilityState={{ disabled: !!disabled }}
            style={shade(({ pressed }) => [box, { flexDirection: "row", alignItems: "center", gap: 8, overflow: "hidden" }, pressed && { backgroundColor: c.grey50 }])}
          >
            <Text style={[t.label, { flex: 1, fontSize: 16, color: value ? (disabled ? c.grey500 : c.ink900) : c.grey400 }]} numberOfLines={1}>
              {value ? shown : placeholder}
            </Text>
            <Icon size={18} color={c.grey500} />
          </Pressable>
        )}
        {clearable && value && !disabled ? (
          <Pressable onPress={() => onChange("")} accessibilityRole="button" accessibilityLabel={`Clear ${label}`} hitSlop={4}
            android_ripple={{ ...ripple, borderless: true }}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
            <X size={18} color={c.grey500} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[t.caption, { color: c.red700 }]} accessibilityRole="alert">{error}</Text>
        : hint ? <Text style={[t.caption, { lineHeight: 17 }]}>{hint}</Text> : null}

      {Platform.OS === "ios" ? (
        <Modal {...modalEdge} visible={draft !== null} transparent animationType="slide" onRequestClose={() => setDraft(null)}>
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <Pressable style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(3,23,40,0.45)" }}
              onPress={() => setDraft(null)} accessibilityLabel="Cancel" />
            <View style={{ backgroundColor: c.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: pad.bottom, paddingLeft: pad.left, paddingRight: pad.right }}>
              <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: space.side - 8, borderBottomWidth: 1, borderColor: c.grey100 }}>
                <SheetAct label="Cancel" onPress={() => setDraft(null)} />
                <Text style={[t.heading, { flex: 1, textAlign: "center" }]} numberOfLines={1} accessibilityRole="header">{label}</Text>
                <SheetAct label="Done" strong onPress={() => { if (draft) onChange(done(draft)); setDraft(null); }} />
              </View>
              {draft ? (
                <RNDateTimePicker
                  value={draft} mode={mode} display={mode === "date" ? "inline" : "spinner"} timeZoneName={PICKER_ZONE}
                  minimumDate={min} maximumDate={max} onValueChange={(_e, d) => setDraft(d)}
                  themeVariant="light" accentColor={c.orange} textColor={c.ink900}
                  style={{ alignSelf: "stretch", marginHorizontal: space.side - 8 }}
                />
              ) : null}
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function SheetAct({ label, onPress, strong }: { label: string; onPress: () => void; strong?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}
      style={({ pressed }) => ({ minWidth: 64, minHeight: 48, paddingHorizontal: 8, alignItems: strong ? "flex-end" : "flex-start", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}>
      <Text style={[t.label, { fontSize: 16, color: strong ? c.orange700 : c.grey600, ...face[strong ? 600 : 500] }]}>{label}</Text>
    </Pressable>
  );
}
