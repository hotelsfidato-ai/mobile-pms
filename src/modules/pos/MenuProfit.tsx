import { useState } from "react";
import { Text, View } from "react-native";
import { api } from "../../core/api";
import { DateField } from "../../core/DateField";
import { c, face, t } from "../../core/theme";
import { Card, useRead } from "../../core/ui";
import { costShown, firstRange, M, marginPctShown, profitLine, type DishProfit } from "./menuEdit";
import { Fig } from "./SetupScreen";
import { paise } from "./setup";
import { Loading, Part } from "./SetupKit";
import { ReadProblem, ty } from "./TablesKit";

/* ══════════════════════════════════════════════════════════════════
   PROFIT PER DISH (components/DishProfitTab.tsx, D27-383 item 9) - the
   Menu's third tab, for the owner, an Admin and the GM. Every figure is the
   server's: a dish's cost is its recipe at the Store's average today; no
   recipe or an unpriced ingredient is a dash with its reason, never zero.
   The web's two tables become cards of labelled figures, in its order.
   The two days with the phone's own date picker (M-16), as the web's date boxes.
   ══════════════════════════════════════════════════════════════════ */

export function DishProfitTab({ code, businessDate }: { code: string; businessDate: string }) {
  const first = firstRange(businessDate);
  const [from, setFrom] = useState(first.from);
  const [to, setTo] = useState(first.to);
  return (
    <>
      <Text style={[t.label, ty.sm, { color: c.grey600 }]}>
        A dish's cost is its recipe (Inventory, Restaurant tab) at each Store item's average cost today. A dish with no recipe, or with an ingredient nobody has
        priced, shows a dash: it has no cost yet, which is not the same as costing nothing.
      </Text>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}><DateField label="From" value={from} onChange={setFrom} hotel={{ businessDate }} /></View>
        <View style={{ flex: 1 }}><DateField label="To" value={to} onChange={setTo} hotel={{ businessDate }} /></View>
      </View>
      {from <= to ? <Figures key={`${from}${to}`} code={code} from={from} to={to} />
        : <Text style={[t.label, ty.sm, { color: c.red700 }]}>From is after To.</Text>}
    </>
  );
}

function Figures({ code, from, to }: { code: string; from: string; to: string }) {
  const q = useRead(() => api<DishProfit>(M.profit(code, from, to)), ["pos", code, "menu", "profit", from, to]);
  const d = q.data;
  if (!d) return q.error ? <ReadProblem error={new Error(q.error)} what="the profit per dish" onRetry={q.reload} /> : <Loading what="the profit per dish" />;
  const totals = profitLine(d.totals);
  return (
    <>
      <Part title="Each dish" about="At its menu price now.">
        {d.dishes.length === 0 ? <Card><Text style={[t.label, ty.sm, { color: c.grey500 }]}>No dishes on the menu yet</Text></Card>
          : d.dishes.map((x) => (
            <Card key={`${x.itemId}:${x.variationId ?? ""}`} style={{ gap: 4 }}>
              <Text style={[t.label, ty.md, { color: c.ink900, ...face[600] }]}>{x.name}</Text>
              <Text style={[t.caption, ty.xs]}>{x.section}</Text>
              <Fig label="Menu price" value={paise(x.price)} />
              <Fig label="Cost" value={costShown(x.cost)} />
              {x.noCost ? <Text style={[t.caption, ty.xs, { textAlign: "right" }]}>{x.noCost}</Text> : null}
              <Fig label="Margin" value={costShown(x.margin)} />
              <Fig label="Margin %" value={marginPctShown(x.marginPct)} />
            </Card>
          ))}
      </Part>
      <Part title="What was sold" about="The dishes on paid bills of these days, at the price sold, before the bill's discount.">
        <Text style={[t.label, ty.md, { color: c.ink900 }]}>
          {totals.line}{totals.uncosted ? <Text style={{ color: c.grey600 }}> {totals.uncosted}</Text> : null}
        </Text>
        {d.sold.length === 0 ? <Card><Text style={[t.label, ty.sm, { color: c.grey500 }]}>Nothing sold on these days</Text></Card>
          : d.sold.map((x) => (
            <Card key={`${x.itemId}:${x.variationId ?? ""}`} style={{ gap: 4 }}>
              <Text style={[t.label, ty.md, { color: c.ink900, ...face[600] }]}>{x.name}</Text>
              <Fig label="Sold" value={String(x.qty)} />
              <Fig label="Sales" value={paise(x.sales)} />
              <Fig label="Cost" value={costShown(x.cost)} />
              {x.noCost ? <Text style={[t.caption, ty.xs, { textAlign: "right" }]}>{x.noCost}</Text> : null}
              <Fig label="Margin" value={costShown(x.margin)} />
            </Card>
          ))}
      </Part>
    </>
  );
}
