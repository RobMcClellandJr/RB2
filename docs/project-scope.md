# RB2 Project Scope

RB2 is an open-source amateur radio programming helper. The browser-only MVP
imports one or more RepeaterBook-style CSV files, lets the user review and
organize conventional amateur repeater records, and exports user-reviewable CSV
or XML files.

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
