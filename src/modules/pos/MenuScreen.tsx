import { useQueryClient } from "@tanstack/react-query";
import { Plus, Upload, UtensilsCrossed } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { api, send, type Hotel } from "../../core/api";
import { ExportButtons } from "../../core/Export";
import { MENU_SPEC, type ImportReport } from "../../core/importSpec";
import { c, t } from "../../core/theme";
import { Card, Head, Screen, useRead, useScreenStop } from "../../core/ui";
import { ADDON_SPEC } from "./addonSpec";
import { ImportSheet } from "./ImportSheet";
import { CategoryCard } from "./MenuDishes";
import { NumberedAddons } from "./MenuAddons";
import { DishProfitTab } from "./MenuProfit";
import { Promotions, Sides } from "./MenuSides";
import { DISH_COLUMNS, dishesByGroup, dishRows, importStop, M, type Section } from "./menuEdit";
import { P, seesProfit, whyNotMenu } from "./setup";
import { Btn, Field, Input, Loading, Pill, Seg, useActs } from "./SetupKit";
import { ReadProblem, Refused, SaidBar, Stale, ty, useAccess } from "./TablesKit";

/* ══════════════════════════════════════════════════════════════════
   THE MENU on a phone — the web's /pos/:code/menu (src/modules/pos/pages/
   Menu.tsx, 16 Nov; the pictures reference/pms-shots/new/n-pos-menu and
   all/46-point-of-sale-menu, 31 Oct): what the outlets sell and what each
   item is taxed at. Dishes (the parts of the menu, each dish's price, MRP,
   course, minutes, variations, sides, Out of stock and Take off; Sides;
   Promotions), Add-ons (the numbered list), and Profit per dish for the
   owner, an Admin and the GM. The dishes in a file go out through the
   phone's own PDF and share sheets; a file comes IN (Import the menu,
   Import sides, M-16) through the phone's file picker, read on the phone
   and shown as the server's dry run first (ImportSheet.tsx), as the web.
   PRICES ARE THE HOTEL'S: nothing is shipped, a blank is never zero, and a
   price changed today applies to the next order.
   ══════════════════════════════════════════════════════════════════ */

type View3 = "dishes" | "addons" | "profit";

export function MenuEditor({ hotel, role }: { hotel: Hotel; role: string | null }) {
  const code = hotel.code;
  const access = useAccess(code);
  const acts = useActs(code);
  const cache = useQueryClient();
  const [view, setView] = useState<View3>("dishes");
  const [importing, setImporting] = useState<"menu" | "addons" | null>(null);
  /* A menu import whose reply was lost is let go only by a read of the dishes begun after it (ImportSheet.tsx). */
  const menuImport = useScreenStop(importStop(code, "menu"));
  const menu = useRead(menuImport.watch(async () => (await api<{ categories: Section[] }>(M.menu(code))).categories), ["pos", code, "menu", "dishes"]);
  /* Whether this property serves alcohol, which opens the Alcohol heading (D21-90). The server refuses it either way. */
  const modules = useRead(async () => Object.fromEntries(
    (await api<{ modules: { module: string; enabled: boolean }[] }>(P.modules(code))).modules.map((m) => [m.module, m.enabled])) as Record<string, boolean>,
    ["pos", code, "menu", "modules"]);
  const [category, setCategory] = useState("");
  const ctx = { code, role, acts, hotel };
  const refusal = whyNotMenu(role);
  const refresh = () => { acts.unstick(); void cache.invalidateQueries({ queryKey: ["pos", code, "menu"] }); };

  if (access.data && !access.data.ok) {
    return (
      <Screen refreshing={false} onRefresh={() => void access.refetch()}>
        <Head title="Menu" />
        <Refused store title="The point of sale is not open to you here" reason={access.data.reason} />
      </Screen>
    );
  }

  const sections = menu.data ?? [];
  const items = sections.flatMap((s) => s.items);
  const byGroup = dishesByGroup(sections);
  const tabs = [{ value: "dishes" as const, label: "Dishes" }, { value: "addons" as const, label: "Add-ons" },
    ...(seesProfit(role) ? [{ value: "profit" as const, label: "Profit per dish" }] : [])];
  const addCategory = async () => {
    const name = category.trim();
    if (!name) return;
    const ran = await acts.run("category:new", "POST", M.categories(code), { name }, { done: "", not: "Not added", what: "added", where: "the menu" });
    if (ran === "done") setCategory("");
  };

  return (
    <Screen refreshing={false} onRefresh={refresh}>
      <Head title="Menu" under="What the outlets sell, and what each item is taxed at."
        action={menu.data ? <View style={{ paddingTop: 8 }}><Pill tone="neutral" text={`${items.length} item${items.length === 1 ? "" : "s"}`} /></View> : undefined} />
      {view !== "addons" ? (
        <View style={{ gap: 8 }}>
          {/* The dishes in a file (D27-383 item 1), the web's columns, from the rows read. */}
          <ExportButtons table={menu.data ? { title: "Menu", subtitle: hotel.name, columns: DISH_COLUMNS, rows: dishRows(sections) } : null} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {/* The web shows both to whoever sees the menu; the API's MENU grant decides (menu edit). */}
            <Btn label="Import sides" Icon={Upload} why={refusal} onRefused={acts.refused} onPress={() => setImporting("addons")} />
            <Btn label="Import the menu" Icon={Upload} why={refusal} onRefused={acts.refused} onPress={() => setImporting("menu")} />
          </View>
        </View>
      ) : null}
      <Seg label="Menu" value={view} options={tabs} onPick={setView} />
      {acts.said ? <SaidBar said={acts.said} onDone={() => acts.setSaid(null)} /> : null}

      {view === "profit" && seesProfit(role) ? <DishProfitTab code={code} businessDate={hotel.businessDate} />
        : view === "addons" ? <NumberedAddons ctx={ctx} /> : (
          <>
            <View style={{ flexDirection: "row", gap: 12, borderRadius: 10, borderWidth: 1, borderColor: c.grey200, backgroundColor: c.grey50, paddingHorizontal: 16, paddingVertical: 14 }}>
              <UtensilsCrossed size={16} color={c.grey400} style={{ marginTop: 3 }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[t.label, ty.md, { color: c.ink900 }]}>These prices are yours</Text>
                <Text style={[t.label, ty.sm, { color: c.grey600 }]}>
                  Nothing here was shipped with the system. A price changed today applies to the next order - bills already printed keep the price they were sold at.
                </Text>
              </View>
            </View>
            <Card style={{ gap: 10 }}>
              <Text style={[t.heading, ty.md]}>Add a part of the menu</Text>
              <Text style={[t.label, ty.sm, { color: c.grey600 }]}>Starters, Main course, Beverages - whatever the card is organised by.</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}><Field label="A part of the menu"><Input label="A part of the menu" value={category} onChange={setCategory} placeholder="Starters" onDone={() => void addCategory()} /></Field></View>
                <Btn label="Add" Icon={Plus} style={{ alignSelf: "flex-end" }} off={!category.trim()} busy={acts.busy === "category:new"}
                  why={acts.why("category:new", refusal)} onRefused={acts.refused} onPress={() => void addCategory()} />
              </View>
            </Card>
            {menu.error && menu.data ? <Stale error={new Error(menu.error)} loadedAt={0} onRetry={refresh} /> : null}
            {/* POS-4: "The menu is empty" only when the menu arrived and is empty. */}
            {!menu.data ? (menu.error ? <ReadProblem error={new Error(menu.error)} what="the menu" onRetry={refresh} /> : <Loading what="the menu" />)
              : sections.length === 0 ? (
                <Card style={{ alignItems: "center", gap: 6, paddingVertical: 24 }}>
                  <UtensilsCrossed size={22} color={c.grey400} />
                  <Text style={[t.heading, ty.md]}>The menu is empty</Text>
                  <Text style={[t.label, ty.sm, { textAlign: "center", color: c.grey600 }]}>
                    Add a part of the menu above, then put items in it. Until then the till has nothing to sell.
                  </Text>
                </Card>
              ) : sections.map((s) => (
                <CategoryCard key={s.id} section={s} servesAlcohol={modules.data?.["alcohol"] === true} byGroup={byGroup} ctx={ctx} />
              ))}
            {menu.data ? <Sides sections={sections} ctx={ctx} /> : null}
            <Promotions ctx={ctx} />
          </>
        )}
      {importing ? (
        <ImportSheet key={importing} spec={importing === "menu" ? MENU_SPEC : ADDON_SPEC} stopName={importStop(code, importing)}
          where={importing === "menu" ? "the menu's dishes" : "the menu's sides"}
          load={(rows, dryRun) => send<ImportReport>("POST", M.imports(code, importing), { rows, dryRun })}
          onClose={() => setImporting(null)} onImported={refresh} />
      ) : null}
    </Screen>
  );
}
