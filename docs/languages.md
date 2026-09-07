# Languages

Lens includes English and Turkish. The language control stays in the landing and dashboard headers. English is the default. The browser stores only the chosen language under `lens-language`. The choice changes the document language without reopening the export.

The catalog in `lib/i18n/messages.ts` uses the English message as its key. Each Turkish message keeps the same numbered placeholders. Complete messages let Turkish change word order. `useTranslation` supplies the current translator and number, date, and percentage formats.

Imported names, captions, messages, paths, and addresses remain unchanged. Analysis functions can attach `DisplayMessage` metadata to text that Lens creates. The view translates that metadata while keeping the original account data separate. The worker does not load the translation catalog.

Use `t` for static messages and `t.rich` for messages that contain React elements. Use `t.known` only for labels or errors that Lens owns. Never pass account text through it. Translations use React text nodes and do not insert HTML.

Run `npm run verify` before release. The language tests check placeholder parity, Turkish formatting, escaped values, account-data preservation, and search with Turkish letters. Browser checks must cover both header controls, keyboard use, persistence, narrow screens, and language changes after an import.
