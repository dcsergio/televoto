#import "../lib.typ": *

#show: manual.with(title: "Root Administrator Manual · Televoto", lang: "en")

#cover(
  badge: "Operational documentation",
  icon: "🛡️",
  eyebrow: "Televoto · /admin area",
  title: "Root Administrator Manual",
  subtitle: "Operational guide to cross-event management on the Televoto platform.",
  meta: [
    *Audience:* administrators with access to the global root password. \
    *Scope:* the `/admin` panel — overview dashboard, creating and editing events, event
    archiving and cloning, scoring weights, security settings. \
    *Document version:* 1.2 · August 2026
  ],
)

#toc(lang: "en")

= Introduction and access model
#chapter-subtitle[
  How root authentication works and what distinguishes the Admin area from the Manager area.
]

Televoto uses a two-tier authentication model, independent of one another:

#table(
  columns: (auto, 1fr, 1fr),
  table.header([Level], [Scope], [Credential]),
  [*Root*],
  [Global: access to `/admin`, management of all events, general security],
  [One shared root password],
  [*Event Manager*],
  [Single event: access to `/manager`, candidates, judge codes, starting/closing voting],
  [One dedicated password per event],
)

#nota(title: "Good to know")[
  Anyone who logs in with the *root* password can open the `/manager` area of *any* event
  without entering that event's manager password: the system automatically recognizes the root
  role and skips the prompt. This does *NOT* apply to the `/score` page (Final Ranking), where
  root still has to enter that specific event's manager password.
]

The `/admin` area is designed exclusively for *cross-event* operations: creating and editing
the event registry, archiving and cloning events, scoring weights, password security. It does
not manage candidates, judge codes, or starting/closing voting for a single event: for those
operations you need to reach the dedicated `/manager` area for that event (see Chapter 9).

#nota(title: "Five-section side menu")[
  Since the August 2026 release the Admin area is organised into five sections: *Dashboard*,
  *Create Events*, *Edit Events*, *Archived* and *Settings* (URL parameter
  `?adminSection=dashboard|create-events|edit-events|archived|settings`). Creating an event and
  editing an existing one, once bundled in a single "Events" section, are now separate.
]

= Accessing the Admin area (root login)
#chapter-subtitle[How to authenticate with the root password.]

+ Open your browser and navigate to `/admin` on the application's domain.
+ If there isn't already a valid root session, a protected login screen appears with the
  message: _"Enter the root password to access this section."_
+ Type the *root password* into the dedicated field and submit the form.
+ If the password is incorrect, the form shows an error message and lets you try again.
+ You can cancel the login: you'll be taken back to the public voting page (`/`).

#nota(title: "Session")[
  Authentication produces a signed token valid for *12 hours*. The token is stored in the
  browser's `sessionStorage`: it survives a page refresh, but is lost when the tab/browser is
  closed.
]

#attenzione(title: "Warning")[
  There is no individual user account system: the root password is single and shared by all
  administrators. Keep it safe and rotate it periodically (see Chapter 7).
]

= Dashboard overview
#chapter-subtitle["Dashboard" section in the side menu — an overview across all events.]

After logging in, the Admin area shows the five-entry side menu described above. *Dashboard* is
the default section and provides a read-only overview of every event, with quick access to the
operational management of each.

== Overview summary (number cards)

#table(
  columns: (auto, 1fr),
  table.header([Indicator], [Meaning]),
  [Total events], [Overall number of events in the system],
  [Active events], [Events that aren't archived (excludes those with the "Active" flag off)],
  [Voting open], [Events with voting currently open],
  [Voting closed], [Events with voting closed],
)

== Full list

Below the number cards, a grid of cards lists every *non-archived* event with its code, name,
subtitle (if present), Voting open/closed status, a *"Manage"* button (opens the event's
`/manager` area in a new tab), and an *"Archive event"* icon for each. If any events are
archived, a quick link with their count appears above the grid, pointing to the *Archived*
section (see Chapter 4).

#nota(title: "No event selector in Dashboard")[
  Unlike previous versions, the Dashboard no longer contains a "Selected event" card or the
  selection dropdown: the Dashboard is purely informational. Choosing the event to operate on
  now happens in the *Edit Events* section (see Chapter 6), and the event selected there is the
  one the toolbar shortcuts act on.
]

#nota(title: "Toolbar quick actions")[
  The toolbar at the top always offers: *Refresh events* (reloads the list), *Open public
  voting page* and *Open Final Ranking* for the event selected in *Edit Events*, plus a
  *logout* button. The toolbar no longer contains the event dropdown.
]

= Archiving, restoring and cloning an event
#chapter-subtitle[
  "Dashboard"/"Edit Events" sections (archiving) and "Archived" section (restoring and
  cloning).
]

An archived event is excluded from the "All events" grid in Dashboard, from the event selector
in *Edit Events*, and from the "Active events"/"Voting open"/"Voting closed" counters — but it
remains fully preserved (with its candidates, credentials, and settings) and reachable from the
*Archived* section of the side menu.

== 4.1 Archiving an event

You can archive an event from two places in the panel:

- in *Dashboard*, from the event's card in the "All events" grid, via the *"Archive event"*
  icon (asks for confirmation in a dialog);
- in *Edit Events* → "Current event" box, via the *"Archive event"* button (shows "Archiving…"
  while in progress).

The archived event disappears from the active lists and becomes visible only in the Archived
section.

#attenzione(title: "Reversible, non-destructive operation")[
  Archiving an event does *not* delete candidates, judge codes, votes, or credentials: it's a
  visibility flag, always reversible by unarchiving the event.
]

== 4.2 Unarchiving an event

+ Go to the *Archived* section in the side menu.
+ Locate the event's card in the grid.
+ Press *"Unarchive"* (shows "Restoring…" while in progress).
+ The event immediately becomes available again in the *Edit Events* selector and in the
  Dashboard active lists, with the same voting state it had before being archived.

== 4.3 Cloning an archived event

From the same *Archived* section, the *"Clone"* button (copy icon) creates a *new event* based
on the archived one, useful for reusing an already-configured format (e.g. a previous edition
of the same contest) without re-entering candidates and settings from scratch.

Pressing *"Clone"* opens a *modal window* where you enter the new event's details:

#table(
  columns: (auto, auto, 1fr),
  table.header([Field], [Required], [Notes]),
  [*Event name*], [Yes],
  [Pre-filled with the original name followed by " (copy)"; freely editable.],
  [*Event code*], [No],
  [1 to 5 digits. If left blank, a brand-new code is generated automatically (never the source
  event's code).],
  [*Event manager password*], [Yes],
  [Minimum 8 characters. Must be typed twice (password + confirmation): if the two fields don't
  match, cloning is blocked.],
)

Confirming with *"Clone"* creates the new event and the section automatically switches to *Edit
Events* with the clone already selected.

#table(
  columns: (1fr, 1fr),
  table.header([What gets copied], [What does NOT get copied]),
  [
    Subtitle, public voting mode (and the maximum number of preferences), scoring weights and
    trimmed mean settings, the full candidate list (number, name, subtitle, color, template)
  ],
  [Name and code (you choose them in the modal), event manager password (you choose it in the
  modal), recorded votes, already-generated judge/public codes, progress history],
)

The new event is created *not archived* but with *voting already closed*: before opening it to
the public you need to generate new judge/public codes from the new event's `/manager` area.

#nota(title: "Why cloning is only available from archived events")[
  The "Clone" action is only available in the Archived section: to duplicate a still active
  event, archive it first (Section 4.1), then clone it and, if needed, unarchive the original.
]

#nota(title: "The manager password is always new")[
  Unlike previous versions, the cloned event does *not* inherit the original's manager
  password: you are required to choose a new one in the clone modal. Original and clone
  therefore always have distinct credentials.
]

= Creating a new event
#chapter-subtitle["Create Events" section in the side menu.]

+ In the side menu select *Create Events*.
+ Fill in the "Create new event" form fields (see the table below).
+ Press the *"Create event"* button (fixed size; shows "Creating…" while in progress).
+ The new event is added at the top of the list and automatically selected as the current
  event in *Edit Events*.

#table(
  columns: (auto, auto, 1fr),
  table.header([Field], [Required], [Notes]),
  [*Event name*], [Yes],
  [Free text. The `//` separator visually highlights part of the title (e.g.
  `Regional final // GRAND FINALE`).],
  [*Subtitle*], [No], [Optional free text, e.g. "2026 edition".],
  [*Event code*], [No],
  [1 to 5 digits. If left blank, it's generated automatically by the system. It's the code used
  in the public URL (`?eventCode=...`) and to access `/manager`.],
  [*Public voting mode*], [Yes (default: Numeric)],
  [*Numeric (1–10)*: the public assigns a score to each candidate. *Preferences (election)*:
  the public assigns no scores but picks up to _N_ favourite candidates. Not editable once the
  event is created.],
  [*Max preferences per judge*], [Only in Preferences mode],
  [Maximum number of candidates each public voter may select (1 to 100). With a value of 1 the
  ballot becomes a single, election-style vote.],
  [*Event manager password*], [Yes],
  [Minimum 8 characters. This is the password the event manager will use to access `/manager`
  for this event.],
)

#nota(title: "Qualified judges always vote by score")[
  The public voting mode affects *only* POPOLARE (public) codes. QUALIFICATA judges always
  assign a score from 1 to 10 to every candidate, regardless of this setting.
]

#attenzione(title: "Validations and errors as notifications")[
  The form rejects creation if: the name is empty, the event code doesn't match the 1–5 digit
  format, or the manager password is shorter than 8 characters. The error message appears as a
  *transient notification (toast)* at the bottom center of the page, no longer as a banner at
  the top of the panel.
]

#attenzione(title: "Irreversible after creation")[
  The public voting mode (Numeric / Preferences) and the maximum number of preferences can no
  longer be changed once the event is created: choose carefully before confirming.
]

= Editing an existing event and scoring weights
#chapter-subtitle["Edit Events" section in the side menu.]

The *Edit Events* section gathers everything to do with a single existing event. At the top is
the *"Selected event" dropdown* (code + name, non-archived events only): the choice made here
determines the event the modules in this section act on, as well as the toolbar's *"Open public
voting page"* and *"Open Final Ranking"* shortcuts. Next to the selector, two labels show the
event's current state (*Voting open/closed* and *Public vote: Numeric/Preferences*).

Below the selector, the *"Current event"* box shows the operational modules for the chosen
event.

== 5.1 Renaming the event

+ In the *"New event name"* field, type the updated name.
+ Press *"Rename"*. The button shows "Saving…" while the operation is in progress.

If the typed name matches the one already saved, no request is sent.

== 5.2 Archiving the event and rotating the manager password

The same box also holds the *"Archive event"* button (see Section 4.1) and the *"New event
manager password"* field with the *"Update event password"* button (see Chapter 8).

== 5.3 Judge weighting (scoring weights)

In the *"Judge weighting"* box you set the balance between the *Qualified* judges' average and
the *Public* vote average in the final score calculation.

#table(
  columns: (auto, 1fr),
  table.header([Field], [Description]),
  [Qualified weight (%)], [Integer value 0–100, directly editable.],
  [Public weight (%)],
  [Disabled field, automatically calculated as `100 - Qualified weight`. The two weights always
  add up to 100.],
  [Enable trimmed mean on public votes],
  [Checkbox visible only for events with *Numeric* voting mode (not for "Preferences"). Reduces
  the impact of anomalous/outlier votes on the public average.],
  [Trimmed mean percentage (%)], [Value 0–49.99, active only if trimmed mean is enabled.],
)

Press *"Save voting settings"* to confirm. The factory default is 70% Qualified / 30% Public.

#nota(title: "How the Qualified weight is used")[
  The Qualified judges' average is divided by the number of eligible, non-revoked qualified
  judges assigned to the event (not just those who actually voted): abstentions therefore lower
  the candidate's average. The final score combines the two averages according to the weights
  set here.
]

#nota(title: "Preference voting and trimmed mean")[
  For events in *Preferences* mode a candidate's public average is its *share of preferences*
  out of all preferences cast, rescaled to 0–10: the trimmed mean has no effect and is
  therefore hidden from the interface.
]

#attenzione(title: "Validations")[
  The Qualified weight must be an integer between 0 and 100; the trimmed mean percentage must
  be between 0 and 49.99. Out-of-range values are rejected with an error notification.
]

= Rotating the root password
#chapter-subtitle["Settings" section in the side menu.]

This operation updates the global root password, used to access all protected administrative
areas. The form lives in the *Settings* section (previously it was at the bottom of the
"Events" section).

+ In the side menu select *Settings*.
+ Fill in the three fields: *Current root password*, *New root password*, *Confirm new root
  password*.
+ Press *"Update root password"*.

#attenzione(title: "Requirements and checks")[
  - Both the current and the new password must be at least *8 characters* long.
  - The new password and its confirmation must match exactly, otherwise the operation is
    rejected.
  - After a successful update, the form fields are cleared automatically.
]

#attenzione(title: "Impact")[
  Changing the root password doesn't automatically invalidate sessions already open on other
  browsers/devices (tokens remain valid until their 12-hour expiry), but any new login to
  `/admin` will require the new password. Communicate the change to all root administrators
  before performing it.
]

= Rotating an event manager's password
#chapter-subtitle["Edit Events" section → "Current event" box → "New event manager password" field.]

Each event has its own manager password, independent of the root password, used to access
`/manager` for that specific event (typically by whoever runs the event on-site, without root
credentials).

+ In the side menu select *Edit Events*.
+ Choose the event in question from the *"Selected event"* dropdown.
+ In the *"Current event"* box, *"New event manager password"* field, type the new password
  (minimum 8 characters).
+ Press *"Update event password"*.

#nota(title: "Typical use cases")[
  Useful when an event manager's password has been lost, shared improperly, or needs to be
  rotated at the end of an event for security reasons. Remember to communicate the new password
  to the event's manager through a secure channel.
]

#attenzione(title: "Note")[
  This operation applies exclusively to the selected event: there is no bulk operation to
  rotate the manager passwords of multiple events at once.
]

= Reaching a specific event's Manager area
#chapter-subtitle[
  How to access the day-to-day operations of an event (candidates, judge codes,
  starting/closing voting).
]

The `/manager` area handles the operations specific to a single event: candidates, judge
codes, starting/closing voting, and real-time monitoring. It cannot be reached from the Admin
area to edit registry data or weights (those remain here in `/admin`), but it's the entry
point for the day-to-day operational management of the event.

+ Locate the event in the Dashboard's "All events" grid (or select it in *Edit Events*).
+ Press the *"Manage" / "Manage event"* button.
+ A new browser tab opens at `/manager?eventCode=<code>`.

#nota(title: "No additional password required")[
  Being authenticated as root, access to `/manager` for any event happens *without* having to
  enter that event's manager password: the root session is automatically recognized and has
  equivalent (or superior) rights to those of the event's manager.
]

#attenzione(title: "Exception: Final Ranking")[
  This automatic bypass does *not* apply to the `/score` page (Final Ranking): there, even with
  an active root session, that event's specific manager password is still required. Use the
  *"Open Final Ranking"* button in the toolbar to reach it quickly (it acts on the event
  selected in *Edit Events*), and keep the event's manager password on hand.
]

= Other cross-event operations
#chapter-subtitle[Shortcuts available in the Admin area toolbar.]

#table(
  columns: (auto, 1fr),
  table.header([Button], [Action]),
  [Refresh events], [Reloads the event list from the server.],
  [Open public voting page],
  [Opens the public voting page (`/?eventCode=...`) for the event selected in *Edit Events* in
  a new tab.],
  [Open Final Ranking],
  [Opens `/score?eventCode=...` for the event selected in *Edit Events*. If the event's voting
  is still open, the system shows a warning ("Final Ranking is only accessible once voting is
  closed") and blocks the opening.],
  [Log out],
  [Ends both the root session and any active manager session in the same browser, returning to
  the login screen.],
)

#nota(title: "Compact view on mobile")[
  On narrow viewports (smartphone/tablet in portrait) the side menu opens via the hamburger
  icon and closes automatically after a section is selected. The toolbar shortcuts remain
  available.
]

= FAQ and troubleshooting
#chapter-subtitle[Common situations and how to handle them.]

== "Root session not available" while loading events

The root token is missing or has expired (12-hour duration). Log in again from `/admin`.

== Can't create the event: "Event code must contain 1 to 5 digits"

The "Event code" field only accepts numeric digits, 1 to 5 characters. Leave it blank to have
it generated automatically. The error appears as a transient notification at the bottom.

== The "Public weight" field appears locked/disabled

This is expected behavior: the Public weight is never edited directly, it's always the
complement to 100 of the Qualified weight.

== I can't find the "trimmed mean" checkbox for an event

It is hidden on purpose for events in *Preferences* voting mode: in that mode the public
average is a share of preferences and the trimmed mean does not apply. The checkbox only
appears for *Numeric* events.

== I can't find where to manage candidates or judge codes from /admin

That's expected: those operations belong exclusively to the `/manager` area of the individual
event (see Chapter 9). The Admin area is intentionally limited to cross-event management.

== An event disappeared from the Dashboard and the "Edit Events" selector

It has probably been archived: archived events are excluded from the active lists. You'll find
it in the *Archived* section of the side menu, where you can unarchive or clone it (see Chapter
4).

== I changed an event manager's password but the manager can't log in

Check that you communicated the new password correctly (minimum 8 characters) and that the
manager is using the correct event code in the URL `/manager?eventCode=...`.

#colophon[Televoto · Root Administrator Manual · Internal document]
