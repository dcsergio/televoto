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
    *Scope:* the `/admin` panel — overview dashboard, event registry, event archiving and
    cloning, scoring weights, credential security. \
    *Document version:* 1.1 · August 2026
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

The `/admin` area is designed exclusively for *cross-event* operations: creating and
maintaining the event registry, archiving and cloning events, scoring weights, password
security. It does not manage candidates, judge codes, or starting/closing voting for a single
event: for those operations you need to reach the dedicated `/manager` area for that event (see
Chapter 9).

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

After logging in, the Admin area shows a side menu with three entries: *Dashboard*, *Events*
and *Archived* (URL parameter `?adminSection=dashboard|events|archived`), the last one
dedicated to managing archived events (see Chapter 4). Dashboard is the default section and
shows:

== Overview summary (number cards)

#table(
  columns: (auto, 1fr),
  table.header([Indicator], [Meaning]),
  [Total events], [Overall number of events in the system],
  [Active events], [Events that aren't archived (excludes those with the "Active" flag off)],
  [Voting open], [Events with voting currently open],
  [Voting closed], [Events with voting closed],
)

== Selected event

At the top of the toolbar there's a dropdown selector *"Selected event"* listing all events
(code + name). The chosen event stays selected even when moving between sections, and it
determines the detail card shown in Dashboard, with:

- Status: #pill("Active", color: "green") / Not active, #pill("Voting open", color: "cyan") /
  closed;
- A *"Manage event"* button, which opens the event's `/manager` area in a new tab.

== Full list

Below the detail card, a grid of cards lists every *non-archived* event with its code, name,
subtitle (if present), Voting open/closed status, a *"Manage"* button, and an *"Archive event"*
icon for each. If any events are archived, a quick link with their count appears above the
grid, pointing to the *Archived* section (see Chapter 4).

#nota(title: "Toolbar quick actions")[
  The toolbar at the top always offers: *Refresh events* (reloads the list), *Open public
  voting page* and *Open Final Ranking* for the selected event, plus a *logout* button.
]

= Archiving, restoring and cloning an event
#chapter-subtitle["Events" section (archiving) and "Archived" section (restoring and cloning).]

An archived event is excluded from the *"Selected event"* dropdown in the toolbar, the "All
events" grid in Dashboard, and the "Active events"/"Voting open"/"Voting closed" counters — but
it remains fully preserved (with its candidates, credentials, and settings) and reachable from
the *Archived* section of the side menu.

== 4.1 Archiving an event

You can archive an event from two places in the panel:

- in *Dashboard*, from the event's card in the "All events" grid, via the *"Archive event"*
  icon;
- in *Events* → "Current event" box, via the *"Archive event"* button (shows "Archiving…" while
  in progress).

No additional confirmation is required: the archived event immediately disappears from the
active lists and becomes visible only in the Archived section.

#attenzione(title: "Reversible, non-destructive operation")[
  Archiving an event does *not* delete candidates, judge codes, votes, or credentials: it's a
  visibility flag, always reversible by unarchiving the event.
]

== 4.2 Unarchiving an event

+ Go to the *Archived* section in the side menu.
+ Locate the event's card in the grid.
+ Press *"Unarchive"* (shows "Restoring…" while in progress).
+ The event immediately becomes available again in the toolbar selector and in
  Dashboard/Events' active lists, with the same voting state it had before being archived.

== 4.3 Cloning an archived event

From the same *Archived* section, the *"Clone"* button (copy icon) creates a *new event* based
on the archived one, useful for reusing an already-configured format (e.g. a previous edition
of the same contest) without re-entering candidates and settings from scratch.

#table(
  columns: (1fr, 1fr),
  table.header([What gets copied], [What does NOT get copied]),
  [
    Event name (with a " (copy)" suffix), subtitle, public voting mode, scoring weights and
    trimmed mean settings, the full candidate list (number, name, subtitle, color, template),
    the event manager password
  ],
  [Recorded votes, already-generated judge/public codes, progress history],
)

The new event gets an *automatically generated event code* (never the source event's code) and
is created *not archived* but with *voting already closed*: before opening it to the public you
need to generate new judge/public codes from the new event's `/manager` area.

#nota(title: "Why cloning is only available from archived events")[
  The "Clone" action is only available in the Archived section: to duplicate a still active
  event, archive it first (Section 4.1), then clone it and, if needed, unarchive the original.
]

#attenzione(title: "Duplicated manager password")[
  The cloned event inherits the *same* manager password as the source event. If both the
  original and the clone remain active, consider rotating one of their passwords (Chapter 8) to
  avoid them sharing the same credential.
]

= Creating a new event
#chapter-subtitle["Events" section → "Create new event" box.]

+ In the side menu select *Events*.
+ Locate the *"Create new event"* box on the right side of the panel.
+ Fill in the form fields (see the table below).
+ Press the *"Create event"* button.
+ The new event is added at the top of the list and automatically selected as the current
  event.

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
  [*Numeric (1–10)*: the public assigns a score. *Single (election)*: the public votes for one
  candidate only. Not editable once the event is created.],
  [*Event manager password*], [Yes],
  [Minimum 8 characters. This is the password the event manager will use to access `/manager`
  for this event.],
)

#attenzione(title: "Blocking validations")[
  The form rejects creation if: the name is empty, the event code doesn't match the 1–5 digit
  format, or the manager password is shorter than 8 characters. The error message appears at
  the top of the panel.
]

#attenzione(title: "Irreversible after creation")[
  The public voting mode (Numeric / Single) can no longer be changed once the event is created:
  choose carefully before confirming.
]

= Editing an existing event and scoring weights
#chapter-subtitle["Events" section → "Current event" box.]

Select the event to edit via the toolbar selector, then go to the *Events* section: the
*"Current event"* box shows three distinct modules for the selected event.

== 5.1 Renaming the event

+ In the *"New event name"* field, type the updated name.
+ Press *"Rename"*. The button shows "Saving…" while the operation is in progress.

If the typed name matches the one already saved, no request is sent.

== 5.2 Judge weighting (scoring weights)

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
  [Checkbox visible only for events with *Numeric* voting mode (not for "Single"). Reduces the
  impact of anomalous/outlier votes on the public average.],
  [Trimmed mean percentage (%)], [Value 0–49.99, active only if trimmed mean is enabled.],
)

Press *"Save voting settings"* to confirm. The factory default is 70% Qualified / 30% Public.

#nota(title: "How the Qualified weight is used")[
  The Qualified judges' average is divided by the number of eligible, non-revoked qualified
  judges assigned to the event (not just those who actually voted): abstentions therefore lower
  the candidate's average. The final score combines the two averages according to the weights
  set here.
]

#attenzione(title: "Validations")[
  The Qualified weight must be an integer between 0 and 100; the trimmed mean percentage must
  be between 0 and 49.99. Out-of-range values are rejected with an error message.
]

= Rotating the root password
#chapter-subtitle["Events" section → "Root security" box (at the bottom of the page).]

This operation updates the global root password, used to access all protected administrative
areas.

+ Go to the *Events* section and scroll down to the *"Root security"* box.
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
#chapter-subtitle["Events" section → "Current event" box → "New event manager password" field.]

Each event has its own manager password, independent of the root password, used to access
`/manager` for that specific event (typically by whoever runs the event on-site, without root
credentials).

+ Select the event in question via the toolbar selector.
+ Go to the *Events* section, *"Current event"* box.
+ In the *"New event manager password"* field, type the new password (minimum 8 characters).
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

+ Select the desired event (via the toolbar selector, or from the event card in
  Dashboard/Events).
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
  *"Open Final Ranking"* button in the toolbar to reach it quickly, and keep the event's
  manager password on hand.
]

= Other cross-event operations
#chapter-subtitle[Shortcuts available in the Admin area toolbar.]

#table(
  columns: (auto, 1fr),
  table.header([Button], [Action]),
  [Refresh events], [Reloads the event list from the server.],
  [Open public voting page],
  [Opens the public voting page (`/?eventCode=...`) for the selected event in a new tab.],
  [Open Final Ranking],
  [Opens `/score?eventCode=...` for the selected event. If the event's voting is still open,
  the system shows a warning ("Final Ranking is only accessible once voting is closed") and
  blocks the opening.],
  [Log out],
  [Ends both the root session and any active manager session in the same browser, returning to
  the login screen.],
)

#nota(title: "Compact view on mobile")[
  On narrow viewports (smartphone/tablet in portrait), the toolbar shows a compact badge with
  just the event code instead of the full selector; the side menu opens via the hamburger icon
  and closes automatically after a section is selected.
]

= FAQ and troubleshooting
#chapter-subtitle[Common situations and how to handle them.]

== "Root session not available" while loading events

The root token is missing or has expired (12-hour duration). Log in again from `/admin`.

== Can't create the event: "Event code must contain 1 to 5 digits"

The "Event code" field only accepts numeric digits, 1 to 5 characters. Leave it blank to have
it generated automatically.

== The "Public weight" field appears locked/disabled

This is expected behavior: the Public weight is never edited directly, it's always the
complement to 100 of the Qualified weight.

== I can't find where to manage candidates or judge codes from /admin

That's expected: those operations belong exclusively to the `/manager` area of the individual
event (see Chapter 9). The Admin area is intentionally limited to cross-event management.

== An event disappeared from the "Selected event" dropdown and Dashboard

It has probably been archived: archived events are excluded from the toolbar selector and the
active lists. You'll find it in the *Archived* section of the side menu, where you can
unarchive or clone it (see Chapter 4).

== I changed an event manager's password but the manager can't log in

Check that you communicated the new password correctly (minimum 8 characters) and that the
manager is using the correct event code in the URL `/manager?eventCode=...`.

#colophon[Televoto · Root Administrator Manual · Internal document]
