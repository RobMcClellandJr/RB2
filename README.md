# RB2

RB2 is an open-source amateur radio programming helper for converting
RepeaterBook-style repeater CSV data into user-reviewable export files.

This MVP runs entirely in the browser. It has no backend, no API access, and no
credentials.

## What RB2 Does

- Upload one or more RepeaterBook-style CSV files.
- Parse conventional amateur repeater records.
- Display repeaters in a review table.
- Select or deselect repeaters.
- Edit channel display names and zones by default.
- Enable edit mode to correct imported RX/TX frequency, tone, mode, callsign,
  location, or P25 NAC data before export.
- Assign selected repeaters to zones manually or organize them by county, band,
  or mode.
- Export selected repeaters as Generic CSV.
- Export selected FM repeaters as APX CPS-style XML for user review/import.
- Export an APX review CSV for auditing, not for CPS import.

APX CPS imports and exports XML files, not CSV. RB2's APX CPS XML export is
still not a codeplug. It creates reviewable conventional system, personality,
frequency option, and zone/channel assignment records for selected FM repeaters
only. The APX XML export lets you set the conventional system name and
personality base name before downloading.
For P25 conventional exports, RB2 maps RepeaterBook `Digital Access` NAC values
from the CSV into APX Network ID fields. If a P25 row has no CSV NAC, RB2 uses
the APX default P25 NAC value.
RB2 automatically exports analog FM and P25 conventional APX channels based on
RepeaterBook mode data. Rows that list both FM and P25 are exported as separate
APX channels.

For APX exports, choose the target radio bands before exporting. No APX bands
are selected by default. RB2 currently
supports VHF, UHF 1, UHF 2, 700/800 MHz, and 900 MHz filtering.
Choose APX Mobile or APX Portable so RB2 writes the matching zone/channel
assignment fields. Mobile exports keep a selected RB2 zone together, while
portable exports split zone channel assignments into 16-channel chunks for the
selector knob positions.
For portable APX exports, choose SRX 2200 or APX 8000 so RB2 can account for
known portable XML field differences. Portable exports leave TTS announcements
disabled because TTS is not available on every radio/codeplug. Portable exports
can set the top display channel name to either the callsign or the RX frequency.

RB2 includes a built-in APX conventional analog XML template, so users do not
need to upload a CPS XML file before exporting APX CPS XML.

For APX-oriented exports, RB2 uses conservative display-name handling: zone and
channel names are limited to 14 ASCII characters, with the original value kept in
Notes when an export value must be shortened. The APX review CSV is only for
auditing the generated fields outside CPS.

RB2 does not generate APX scan lists yet because CPS scan members depend on the
actual zone channel assignment number after import.

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

Try the included sample file, or select multiple CSV files at once to combine
them into one review table:

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
