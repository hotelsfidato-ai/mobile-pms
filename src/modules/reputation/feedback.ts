import { DASH } from "../../core/format.ts";
import type { ExportTable } from "../../core/exportDoc.ts";
import { moment } from "./rules.ts";

/* ══════════════════════════════════════════════════════════════════
   GUEST FEEDBACK'S RULES AND WORDS — mobile/m13-sales (19 Nov), lane F.
   Ported from the web's src/modules/reputation/pages/Feedback.tsx and
   data/feedback.ts; the server is api/src/modules/reputation/feedback.ts
   (GET /:code/feedback) with its own list, feedbackRoles.ts.

   What guests answered on their own page after check-out: the scores by
   month (the server's averages, rounded by the server to one place) and
   the latest 100 answers. A part nobody scored is null: a dash, never a
   zero. Read only: nothing here writes.
   ══════════════════════════════════════════════════════════════════ */

/** data/feedback.ts FeedbackMonth. */
export interface FeedbackMonth {
  /** "YYYY-MM", the hotel's month. */
  month: string;
  answers: number;
  overall: number;
  room: number | null;
  cleanliness: number | null;
  food: number | null;
  staff: number | null;
  /** Answers with a 1 or a 2, overall or in any part. */
  low: number;
}

/** data/feedback.ts FeedbackAnswer. */
export interface FeedbackAnswer {
  id: string;
  /** The hotel's clock, "YYYY-MM-DDTHH:MM" (app.hotel_clock). */
  answeredAt: string;
  overall: number;
  room: number | null;
  cleanliness: number | null;
  food: number | null;
  staff: number | null;
  comment: string | null;
  low: boolean;
  stayId: string;
  reference: string;
  guest: string;
  roomNumber: string;
}

/** data/feedback.ts FeedbackPage. */
export interface FeedbackPage {
  /** Whether the hotel is asking now (Settings, Modules, "Feedback survey"). */
  on: boolean;
  months: FeedbackMonth[];
  answers: FeedbackAnswer[];
  latest: number;
}

/* ── Who: feedbackRoles.ts and feedback.ts, word for word ─────────── */

/** api/src/modules/reputation/feedbackRoles.ts: the owner, an administrator and the GM. */
export const FEEDBACK_ROLES: readonly string[] = ["owner", "admin", "gm"];
/** feedback.ts FEEDBACK_REFUSED (answered 403 `reason`). */
export const FEEDBACK_REFUSED = "Guest feedback is for the owner, an administrator or the general manager.";
/** Null when the server would answer this role, else its sentence (the core's roleAt gives a group administrator "owner"). */
export const whyNotFeedback = (role: string | null) => (role != null && FEEDBACK_ROLES.includes(role) ? null : FEEDBACK_REFUSED);

/* ── The figures ─────────────────────────────────────────────────── */

/** Feedback.tsx `score`: the server's average as it rounded it, one place; none is a dash. */
export const score = (n: number | null | undefined) => (n == null ? DASH : n.toFixed(1));

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Feedback.tsx `monthWords`: "Nov 2026", from the digits (no Date: Hermes, MEMORY 7). */
export function monthWords(m: string): string {
  const x = /^(\d{4})-(\d{2})$/.exec(m);
  const name = x ? MON[Number(x[2]) - 1] : undefined;
  return x && name ? `${name} ${x[1]}` : DASH;
}

export const PARTS = ["room", "cleanliness", "food", "staff"] as const;
export const PART_WORD = { room: "Room", cleanliness: "Cleanliness", food: "Food", staff: "Staff" } as const;

/** "The parts": "Room 4 · Cleanliness - · Food 5 · Staff 3" (a part not scored is a dash). */
export const partsLine = (a: Pick<FeedbackAnswer, (typeof PARTS)[number]>) =>
  PARTS.map((p) => `${PART_WORD[p]} ${a[p] ?? DASH}`).join(" · ");

/** The Overall pill: red for a low answer, green from 4, grey between. */
export const overallTone = (a: Pick<FeedbackAnswer, "low" | "overall">): "danger" | "success" | "neutral" =>
  a.low ? "danger" : a.overall >= 4 ? "success" : "neutral";
export const overallWords = (a: Pick<FeedbackAnswer, "overall">) => `${a.overall} of 5`;

/** "AB12CD · room 204". */
export const answerRef = (a: Pick<FeedbackAnswer, "reference" | "roomNumber">) => `${a.reference} · room ${a.roomNumber}`;

/* ── The words ───────────────────────────────────────────────────── */

export const TITLE = "Guest feedback";
export const UNDER = "What guests answered on their own page after check-out: scores out of 5 and their comments.";
export const OFF =
  "This hotel is not asking guests for feedback. The owner or an administrator switches it on in "
  + "Settings, Property, Modules: Feedback survey. Answers already given stay here.";
export const MONTHS_TITLE = "Scores by month";
export const MONTHS_NOTE = "The average of each score, out of 5, for the answers given that month. The last 12 months.";
export const MONTHS_EMPTY = { title: "No answers yet", line: "A guest is asked on their own page after check-out, once a stay." };
export const LATEST_TITLE = "Latest answers";
export const latestNote = (n: number) =>
  `The latest ${n}, newest first. A 1 or a 2, overall or in any part, is red and goes to Notifications for a week.`;
export const LATEST_EMPTY = { title: "No answers yet", line: "Each answer and its comment will be listed here." };
export const FAILED = "Guest feedback did not load";

/** Feedback.tsx ANSWER_EXPORT: each answer, its columns in the web's order; a part not scored is a dash. */
export const answersTable = (page: Pick<FeedbackPage, "answers">): ExportTable => ({
  title: TITLE,
  columns: ["Answered", "Guest", "Booking", "Room", "Overall", "Room score", "Cleanliness", "Food", "Staff", "Low (1-2)", "Comment"],
  rows: page.answers.map((a) => [
    moment(a.answeredAt), a.guest, a.reference, a.roomNumber, String(a.overall),
    ...PARTS.map((p) => (a[p] == null ? DASH : String(a[p]))), a.low ? "Yes" : "No", a.comment ?? DASH,
  ]),
});
