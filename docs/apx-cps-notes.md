# APX CPS XML Notes

APX CPS imports and exports XML files, not CSV. RB2's APX CPS export is a
reviewable XML convenience format based on CPS import/export structure. It is
not a native Motorola codeplug and it is not a replacement for Motorola CPS.

The normal RB2 GUI presents APX CPS XML as the APX import/export download. RB2
also keeps an APX review CSV export path in the codebase for development and
auditing, but that CSV is not shown as a primary download and is not intended for
CPS import.

The APX review CSV columns are:

Zone, Channel Name, RX Frequency, TX Frequency, TX Tone, RX Tone, Mode,
Bandwidth, Power, Talkaround, Scan List, Notes

## Display Name Limits

APX CPS name fields depend on the radio display and model/options. As a
conservative MVP rule, RB2 keeps APX zone and channel display names to 14 ASCII
characters. For portable exports, RB2 also lets the user choose whether the top
display channel value uses the callsign or the first eight characters of the RX
frequency.

RB2 removes non-ASCII display characters for the APX-friendly export because
radio displays and CPS language settings can restrict unsupported characters and
diacritics. If RB2 has to shorten a name for APX export, the original RB2 name is
kept in the Notes column for user review.

Before using any exported data, review every channel for frequency accuracy,
tone settings, bandwidth, transmit authorization, local band plans, and any CPS
field mapping required by your radio model and CPS version.

RB2 does not connect to radios and does not bypass CPS. Final programming
decisions remain with the licensed operator.

## APX CPS XML Export

RB2 can also generate a CPS-style XML file based on the APX import/export XML
structure. This is still a reviewable intermediate file, not a native codeplug.

The XML export currently creates:

- One conventional system using the APX system name from the export panel.
- Analog and P25 conventional personalities using the APX personality name base
  from the export panel.
- Frequency options for selected APX-compatible analog FM and P25 conventional
  repeaters.
- Mobile zone channel assignments keep the selected RB2 zone together.
- Portable zone channel assignments split into 16-channel chunks for the
  selector knob positions.

The Zone Organizer keeps unassigned channels on the left and zones on the right.
Users can create zones, rename zones, delete zones, and drag channel cards
between zones. Deleting a populated zone asks for confirmation and returns those
channels to Unassigned. Quick grouping can organize selected channels by state,
county, city, amateur band, or mode before XML export.

APX XML export infers analog FM and P25 conventional channels from RepeaterBook
mode data. If a row lists both FM and P25, RB2 exports separate APX channels for
each mode. P25 conventional export maps `Digital Access` to the APX Network ID
field as a NAC value when present.

APX CPS stores P25 NAC in the XML as `Tx Network ID`, `Rx / TA  Network ID`, and
`Direct Network ID`. RB2 reads NAC from the RepeaterBook CSV `Digital Access`
field first. It accepts NAC values in the familiar hexadecimal form such as
`293` and writes the decimal value CPS expects, such as `659`. If a RepeaterBook
P25 row has no valid `Digital Access` value, RB2 uses the APX default P25 NAC
value.

The repeater review table shows the imported P25 NAC value. Channel name is
editable by default. Use table edit mode only when imported data needs
correction; edits to mode or NAC are used by the APX XML exporter. Zone
assignment is handled in the Zone Organizer step.

Select the APX target radio bands before exporting. No APX bands are selected
by default. RB2 filters out channels whose RX or TX frequency is outside the
selected APX bands. Current band filters are VHF, UHF 1, UHF 2, 700/800 MHz,
and 900 MHz.

Select APX Mobile or APX Portable before exporting. Portable zone/channel
assignment records include top-display, color backlight, and personnel
accountability fields that are not present in the mobile export shape. RB2 sets
portable zone and channel announcements to `<None>` and leaves TTS names blank
because TTS options are not available on every radio/codeplug. For portable
exports, select SRX 2200 or APX 8000. The APX 8000 export shape adds fields such
as `Clone Enable` and `Wi-Fi ` and omits a few fields present in the SRX 2200
sample.

Portable exports also include a top display channel option. RB2 can set `Top
Display Channel` to either the repeater callsign or the first eight characters
of the receive frequency.

RB2 does not generate APX scan lists yet. CPS scan-list members reference the
actual zone channel assignment number after import, so scan-list creation will be
handled as a later APX-specific workflow. Until then, APX personalities export
with scan list selection set to `<None>`.

RB2 includes a built-in APX conventional analog XML template, so users do not
need to upload a CPS XML file before exporting APX CPS XML. The generated file
uses complete conventional system, personality, and zone/channel assignment
structures, with repeater-specific values filled in from the CSV.
