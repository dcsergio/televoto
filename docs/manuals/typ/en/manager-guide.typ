#import "../lib.typ": *

#show: manual.with(title: "Event Manager Guide · Televoto", lang: "en")

#cover(
  eyebrow: "Operational manual · for event managers",
  title: "Televoto — Event Manager Guide",
  subtitle: [
    How to manage a single event in `/manager`: candidates, judge codes, starting/closing
    voting, and the final ranking.
  ],
  chips: (
    "Area: /manager",
    "Interface language: Italian",
    "Manual version: 1.0",
    "Access via event code + manager password",
    "Manage a single event at a time",
    "No access to other events",
  ),
)

#toc(lang: "en")

= Accessing the manager area

The `/manager` area lets you operationally manage *one event at a time*: it's not possible to
see or reach other events from here, by design. To access it you need two separate pieces of
information, requested in two separate steps.

== 1. Open the /manager address

If there isn't already an event code in the URL, the screen _"Enter the event code"_ appears.
Type the event's numeric code (1 to 5 digits, e.g. `00001`) and press *Enter*.

`/manager?eventCode=00001&adminSection=dashboard`

== 2. Enter the event's manager password

The screen _"Protected area › Manage event"_ appears with the message _"Enter the manager
password to manage this event."_ Enter the password provided by the root administrator and
press *Log in*. If the password is incorrect, the field shows an error message and you can try
again.

== 3. You're in

After a successful login, the event's shell opens, with a side menu (or a pop-up menu on small
screens) and the sections *Dashboard*, *Candidates*, *Voting Codes*, and *Voting Backstage*.

#nota(title: "Good to know")[
  The event code identifies _which_ event you want to manage; the manager password is specific
  to *that event* (a different password for each event). If you're signed in as a root
  administrator, access to `/manager` for any event happens automatically, without having to
  enter the manager password again.
]

#nota(title: "Leaving the area")[
  The *Log out* button is available both in the side menu and in the top bar (logout icon), and
  takes you back to the public voting page.
]

= Dashboard overview

The *Dashboard* section is the first screen after login and summarizes the event's status with
three boxes:

#table(
  columns: (auto, 1fr),
  table.header([Box], [What it shows]),
  [Candidates], [Total number of candidates registered for the event.],
  [Judge codes issued],
  [Total number of judge codes generated, split into Qualified and Public.],
  [Vote status], [Count of active, finalized, and revoked codes.],
)

A status label is always visible in the top bar: #pill("Voting open", color: "cyan") or
#pill("Voting closed", color: "violet"). From here, using the respective icons, you can also
open the *public voting page* (urn icon) and the *Final Ranking* (trophy icon) for the current
event in a new tab.

#attenzione(title: "Warning")[
  The *Open Final Ranking* icon can only be used once voting is closed: if you try to open it
  while voting is still open, a warning appears — _"Final Ranking is only accessible once voting
  is closed. Close the voting to continue."_ — and the page will not open.
]

From the main Dashboard box you can also jump quickly to the other sections using buttons with
the same labels as the side menu: *Candidates*, *Voting Codes*, *Voting Backstage*.

= Candidate management

*Candidates* section in the side menu — manages the list of candidates/performances up for
voting during the event.

== Adding a candidate

+ *Fill in the "Add new candidate" form.* Enter the _Candidate name_ (required, e.g. "Marco
  Rossi") and optionally the _Performance title_ (optional, e.g. "Song / choreography").
+ *Choose the color.* A color is assigned automatically ("Color assigned automatically"); you
  can regenerate it with *Regenerate color*, pick one from the quick palette shown as round
  buttons, or set a custom one with the color picker ("Custom palette").
+ *Confirm.* Press *Add candidate*. The candidate immediately appears in the "Current
  candidates" list, numbered sequentially.

== Editing or deleting a candidate

Every candidate in the list has *Edit* and *Delete* buttons. "Edit" opens an inline panel with
the Name, Performance, and Color fields, with *Save* and *Cancel* buttons.

#attenzione(title: "Important constraint — edits locked while voting is open")[
  Adding, editing, and deleting candidates is possible *only when voting is closed*. While
  voting is open all controls are disabled and the message _"Changes are locked while voting is
  open."_ appears. To make changes to candidates you must first close voting (see Chapter 5).
]

#nota(title: "Automatic renumbering")[
  Deleting a candidate automatically *renumbers* the remaining candidates, so the numbering
  always stays sequential and without "gaps" (e.g. if you delete candidate no. 3 out of 5, the
  old no. 4 becomes the new no. 3, and so on).
]

#nota(title: "Event status visible at the top")[
  At the top of the Candidates section you'll always find a box with the current *Event status*
  (voting open/closed) and its explanation, so you immediately know whether you can operate or
  not.
]

= Judge codes

*Voting Codes* section in the side menu — "opaque code management": here you generate,
distribute, verify, and revoke the codes that let judges and the public vote.

Every code is an *opaque, unpredictable 16-character string*, also shown split into 4 groups of
4 characters to make it easier to read and type (e.g. `ABCD EFGH IJKL MNOP`). The plain-text
code is visible *only at the moment it's generated*: from then on the system keeps only a hash
(fingerprint) and a partial preview, never the full value.

== The two code types

#table(
  columns: (auto, auto, 1fr),
  table.header([Type], [Label in app], [Meaning]),
  [QUALIFIED], ["Qualified Jury"],
  [A qualified judge's vote. In the final calculation it counts as a judges' average, divided by
  *all* active qualified codes assigned (not only those actually used) — an abstention lowers
  the average.],
  [PUBLIC], ["Public Jury"],
  [A member of the general public's vote. Feeds into the event's public vote average.],
)

== Generating codes

+ *Set the generation parameters.* In the "Generate codes" form choose: _Number_ of codes to
  create (1–200), an optional _Prefix_ for the label (e.g. "Judge"), the _Judge type_
  (Qualified Jury / Public Jury), and the _Base URL_ used to build the link/QR for each code
  (e.g. the event's public address). Code length is fixed at 16 characters.
+ *Press "Generate codes".* The new codes appear under "Latest generated codes," each with a QR
  code, formatted text code, direct link, and status ("Active").
+ *Distribute the codes.* For each code you can *Copy code* or *Copy QR URL*; or use *Copy all
  links* for the entire batch, or *Print A4 sheet* to get a ready-to-print, ready-to-cut sheet
  (useful for physically handing out QR codes to judges in the room).

== Validating, revoking, and regenerating

- *Validate a code*: paste a code into the "Validate a code" box and press *Validate code* to
  quickly check its status (active, used, or revoked), its label, and its creation/usage dates.
- *Active codes*: the list at the bottom right shows all codes not yet exhausted, with label,
  type, code preview, creation/usage/revocation dates, and colored status (Active, Used or
  Revoked).
- *Revoke code*: available on every active code, invalidates the code and prevents further use
  (useful if a code was shared by mistake or compromised).
- *Lost code? Regenerate*: generates a new code to replace a lost one, transferring any votes
  already cast with the original code onto it — the original code is no longer recoverable once
  regenerated.
- *Regenerate all codes*: at the top of the "Active codes" list, regenerates every active code
  at once with a new value (votes already cast are transferred). The previous codes and their
  links/QRs stop working and must be redistributed; the new codes stay visible in clear text
  (with QR, copy and A4 print) until you leave the page. Handy after a *Reset ranking* when you
  want to start over with fresh codes.

#suggerimento(title: "Real-time updates")[
  The code list and the Active / Used / Revoked counters at the top of the section update
  automatically as judges use their codes, with no need to reload the page.
]

= Voting lifecycle

*Voting Backstage* section in the side menu, "Administrative operations" block — this is where
you control starting, closing, and resetting the voting.

#table(
  columns: (auto, 1fr, 1fr),
  table.header([Action], [Button label], [Effect]),
  [Start the event],
  [*Start voting* (available only when voting is closed; if it's open, the button shows "Voting
  open" and is disabled)],
  [Sequentially renumbers the candidates, *clears all votes*, resets every non-revoked judge
  code back to *Active* (including ones already "Used"), and reopens voting.],
  [Close voting],
  [*Close voting* (visible only while voting is open)],
  [Votes are no longer accepted; candidate edits become available again.],
  [Reset the ranking],
  [*Reset ranking* (in the "Danger zone")],
  [Clears all votes collected so far to start over, without touching candidates. Non-revoked judge codes become "Active" again (the same code stays valid).],
)

#attenzione(title: [Warning — "Start voting" clears all votes])[
  *"Start voting" is a destructive operation, not an incremental one.* Upon confirming the
  message _"Do you want to start voting? Previous votes will be cleared and candidates will be
  renumbered sequentially."_, all votes already collected for the event are *permanently
  deleted* and cannot be recovered. Use this function only when you're certain you want to
  start fresh (e.g. at the official start of the evening, after finishing technical rehearsals
  or tests), not to "temporarily reopen" voting. Judge/public codes already handed out remain
  valid and become reusable again ("Active" status): you don't need to regenerate them after a
  start/restart, unless they were revoked.
]

Every action requires explicit confirmation in a dialog box before it's carried out:

- *Start voting* → confirm with the *Start* button.
- *Close voting* → confirm with the *Close* button (message: "Do you want to close voting?
  Votes will no longer be accepted and edits will become available again.").
- *Reset ranking* → confirm with the *Reset* button (message: "Do you want to clear all votes
  and start over? Non-revoked judge codes will become active again (the same code stays
  valid).").

The box also shows the event code and name and the current *Status* (voting open/closed), and
includes a quick-access *Open Final Ranking* button (with the same warning already mentioned:
blocked while voting remains open).

= Real-time monitoring

*Voting Backstage* section, "Judge voting progress" block — the dashboard that lets you follow
how voting is going while it's in progress.

Four main indicators, updated in real time:

#card-grid(
  cols: 2,
  card(title: "Qualified active")[
    Number of qualified jury codes still active (not revoked) assigned to the event.
  ],
  card(title: "Qualified finalized")[
    Number of qualified judges who have completed and permanently locked their vote.
  ],
  card(title: "Public QR activated")[
    Number of public codes that have actually been opened/used by the public.
  ],
  card(title: "Public votes cast")[
    Total number of public votes already recorded for the event.
  ],
)

Below that you'll find operational detail useful for closing out the last missing votes:

- *Candidates with incomplete votes*: list of candidates still missing votes from some judges,
  with a count of how many judges are missing for each.
- *Incomplete active judges*: list of judges (identified by their code preview and, if present,
  their label) who haven't yet voted for all candidates, with a count of votes cast/expected
  and the names of the candidates still missing.

#nota(title: "No data yet")[
  If no judge code has been generated for the event, the section simply shows _"No judge code
  generated for this event."_ You can still force a manual refresh with the *Refresh* button at
  the top of the dashboard.
]

#suggerimento(title: "Useful during the live event")[
  This dashboard is designed to be kept open "backstage" during the evening, so you can tell at
  any moment whether it's time to close voting or whether it's worth waiting for a few more
  judges.
]

= Final ranking

The *Final Ranking* shows the candidates' final standings. You can reach it from the trophy
icon in the event bar (Dashboard) or from the *Open Final Ranking* button in Voting Backstage,
and it opens in a new browser tab.

#attenzione(title: "Only accessible when voting is closed")[
  If voting is still open, access to the Final Ranking is blocked: the warning _"Voting still
  open — Final Ranking is only accessible once voting is closed. Close voting to continue."_
  appears. You must close voting first (Chapter 5) before you can view the ranking.
]

== How the score is calculated (in brief)

Each candidate's final score combines two components:

#block(inset: (left: 0.5em), {
  set text(0.92em)
  raw("Qualified average = sum of qualified judges' scores ÷ number of active QUALIFIED codes (not just those who voted)")
  parbreak()
  raw("Public average (numeric vote) = average of public votes (optionally a \"trimmed mean\" to reduce the effect of anomalous votes)")
  parbreak()
  raw("Public average (preference vote) = candidate's share of all preferences cast, rescaled to 0-10")
  parbreak()
  raw("Final score = (Qualified average × Qualified weight) + (Public average × Public weight)")
})

- *Abstentions count*: the qualified judges' average is divided by all valid QUALIFIED codes
  assigned to the event, not only the ones actually used — so a qualified judge who doesn't
  vote still lowers the candidate's average.
- *Preference-based public vote*: if the event uses "Preferences" mode (the public picks one or
  more candidates instead of scoring them), a candidate's public component is its share of all
  preferences cast, rescaled to 0–10. The trimmed mean is not applied in this mode.
- *Trimmed mean (optional, numeric vote only)*: if enabled for the event, the public vote
  average excludes a percentage of extreme votes (highest/lowest) to reduce the impact of
  anomalous ratings.
- *Per-event weights*: the two averages are combined according to event-specific weights
  (typically 70% qualified jury / 30% public, but customizable by the root administrator),
  which add up to 100%.
- *Ties*: in the event of substantially equal final scores, the higher qualified average wins
  first, then — if that's also tied — the lower candidate number wins.

#nota(title: "Live ranking vs. final ranking")[
  Voting Backstage also offers a *partial ranking* view, useful for following the standings
  while voting is still open: it's a "live" estimate and may differ slightly from the
  definitive calculation shown by the Final Ranking once voting is closed.
]

= FAQ

== Can't log in: "Incorrect password"

Check that you typed the manager password for this specific event correctly (each event has its
own). If you've lost it, ask the root administrator to give it to you again or to regenerate
it.

== Can't edit/delete a candidate

The controls are disabled while voting is open. Go to *Voting Backstage* and use *Close
voting*, then go back to *Candidates*.

== A judge has lost their code

In *Voting Codes*, find the judge's code among the "Active codes" and use *Lost code?
Regenerate*: a new code will be created, with any votes already cast transferred onto it; the
old code stops working.

== Final Ranking won't open

Check the status at the top of the page: if it shows *Voting open*, you must first close it
from *Voting Backstage* → *Close voting*.

== I pressed "Start voting" by mistake

The vote reset performed by *Start voting* cannot be undone: previous votes are not
recoverable. Candidates remain in place (only renumbered); you'll be able to have judges and
the public vote again with the codes already issued (if still active) or by generating new
ones.

== Can I manage multiple events from here?

No: `/manager` is intentionally limited to *one event at a time*, identified by the event code
entered at login. To switch to another event you need its code and its manager password (or a
root administrator session, which can open any event without an additional password).

#colophon[
  Operational Televoto manual for Event Managers · `/manager` application area · content
  aligned with the current interface.
]
