# intl plugin — leftover comments

## TODOs

- [ ] `src/icu/serialize.ts:22` — serialize element.style (number)
- [ ] `src/icu/serialize.ts:48` — serialize element.style (date)
- [ ] `src/icu/serialize.ts:51` — serialize element.style (time)
- [ ] `src/hooks.ts:43` — check if this can be derived from the FieldHook args instead
- [ ] `src/components/MessagesImport.tsx:34` — validate URL
- [ ] `src/components/layout/MessagesTabs.tsx:13` — add hash for current tab to url
- [ ] `src/components/input/variables/VariableChip.tsx:35` — replace popover with portal below input field
- [ ] `src/components/input/variables/editors/TagVariableEditor.tsx:29` — find better solution for this
- [ ] `src/components/input/variables/editors/TagVariableEditor.tsx:38` — add support for variable mentions
- [ ] `src/components/input/variables/editors/TemporalVariableEditor.tsx:17` — bare TODO (no description)
- [ ] `src/components/input/variables/editors/PluralVariableEditor.tsx:19` — add support for selectordinal
- [ ] `src/components/input/variables/editors/PluralVariableEditor.tsx:129` — ensure fields are always in the same order as staticPluralOptions

## FIXMEs / @ts-expect-error

- [ ] `src/exports/fetchMessages.ts:18` — @ts-expect-error FIXME
- [ ] `src/components/input/useHtmlLexicalAdapter.ts:39` — @ts-expect-error FIXME

## Dead code to clean up

- [ ] `src/components/layout/MessagesTabs.tsx:19-26,35-36` — commented-out useFormState / hasErrors logic
- [ ] `src/icu/schema.ts:38-40` — commented-out withoutDescription / withoutOptional logic
