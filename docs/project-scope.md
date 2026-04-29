# RB2 Project Scope

RB2 is an open-source amateur radio programming helper. The browser-only MVP
imports one or more RepeaterBook-style CSV files, guides the user through
Import, Repeaters, Zones, and Export steps, lets the user review conventional
amateur repeater records, organize channels with quick grouping or drag-and-drop
zone assignment, and export user-reviewable CSV or XML files.

The current GUI has four primary steps:

- Import: select one or more RepeaterBook-style CSV files.
- Repeaters: select channels, edit channel display names, and optionally enable
  edit mode to correct imported frequency, tone, mode, callsign, location, or
  P25 NAC data.
- Zones: create, rename, delete, and organize zones. Unassigned channels stay on
  the left, while user-created and auto-generated zones appear on the right.
  Quick grouping supports state, county, city, amateur band, and mode.
- Export: choose the export module, configure APX XML options when using the
  Motorola APX module, select target APX bands, and download APX CPS XML or
  Generic CSV.

RB2 does not:

- Generate, decode, edit, or write native Motorola codeplug files.
- Communicate directly with radios.
- Bypass Motorola CPS or any vendor programming software.
- Include API keys, credentials, or backend services.

The MVP is intentionally limited to lawful amateur radio conventional repeater
data and export workflows that a user can inspect before importing anywhere
else. APX CPS imports/exports XML, so RB2's CPS-oriented APX output is XML.
Those APX CPS XML exports are reviewable intermediate files and are not native
Motorola codeplugs.

RB2 is licensed under the GNU GPLv3. See the repository `LICENSE` file.
