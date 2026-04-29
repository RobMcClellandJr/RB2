# RB2

RB2 is an open-source amateur radio programming helper for converting
RepeaterBook-style repeater CSV data into user-reviewable export files.

This MVP runs entirely in the browser. It has no backend, no API access, and no
credentials.

## What RB2 Does

- Upload a RepeaterBook-style CSV file.
- Parse conventional amateur repeater records.
- Display repeaters in a review table.
- Select or deselect repeaters.
- Edit channel display names.
- Assign selected repeaters to zones.
- Export selected repeaters as Generic CSV.
- Export selected FM repeaters as APX CPS-style XML for user review/import.
- Export an APX review CSV for auditing, not for CPS import.

APX CPS imports and exports XML files, not CSV. RB2's APX CPS XML export is
still not a codeplug. It creates reviewable conventional system, personality,
frequency option, zone/channel assignment, and scan-list records for selected FM
repeaters only.

RB2 includes a built-in APX conventional analog XML template, so users do not
need to upload a CPS XML file before exporting APX CPS XML.

For APX-oriented exports, RB2 uses conservative display-name handling: zone and
channel names are limited to 14 ASCII characters, with the original value kept in
Notes when an export value must be shortened. The APX review CSV is only for
auditing the generated fields outside CPS.

## Important Scope

RB2 does not generate Motorola codeplugs directly. It does not create, decode,
edit, or write native Motorola codeplug files. It does not communicate directly
with radios and does not bypass Motorola CPS.

RB2 only generates user-reviewable CSV and XML files.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL Vite prints in your terminal, usually:

```text
http://localhost:5173/
```

Try the included sample file:

```text
examples/sample-repeaterbook.csv
```

The sample uses the same style of headers as a RepeaterBook county export, such
as `Output Freq`, `Input Freq`, `Uplink Tone`, `Downlink Tone`, `Call`, `Modes`,
and `Digital Access`.

## Build

Create a production build:

```bash
npm run build
```

## Notes

See `docs/project-scope.md` for project boundaries and
`docs/apx-cps-notes.md` for APX CPS XML notes.
