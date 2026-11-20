# settings — defects

Each lane appends its own section; numbers `MSET-<lane letter><n>`.

## Lane P — mobile/m13-set-property (20 Nov)

### MSET-P1 · The web clears a child age typed as anything but a whole number (open, the PMS's)

**What happened:** the web's Policies → Child ages sends `Number(text)`; "7.5" goes as 7.5 (the server
refuses it), but "abc" or "1e" become `NaN`, which JSON writes as `null`, and the server takes null as
"not set": the age is cleared without a word. **How found:** porting `Policies.tsx` ChildAges against
`api/src/modules/admin/property.ts` child-ages. **What was done:** the phone sends blank as null, digits
as the number, anything else as typed, so the server answers "An age is a whole number up to 17."
(`propertyRules.ts` `ageOf`, checked, and broken once). The web's fault is for `docs/api-requests.md`.
**The rule:** a typed number goes as typed after the web's own validation, never through `Number()`
whose NaN becomes a silent null.
