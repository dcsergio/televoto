#import "../lib.typ": *

#show: manual.with(title: "How to vote — Quick guide · Televoto", lang: "en")

#grid(
  columns: (1fr, auto),
  align: (left + horizon, right + horizon),
  {
    text(10pt, weight: 600, fill: tv.cyan-dark, tracking: 0.08em, upper("For judges and the public · takes 30 seconds"))
    v(0.2em)
    text(25pt, weight: 700, fill: tv.ink)[How to vote — Quick guide]
  },
  pill("📱 TELEVOTO", color: "violet"),
)

#v(0.6em)
#line(length: 100%, stroke: 0.75pt + tv.line)
#v(0.6em)

#step(1, title: "🔗 Get your code")[
  The organizer gives you a QR code or a personal link. It's your voting code, for one-time use.
  #v(0.4em)
  #pill("⭐ Judges (QUALIFICATA)", color: "violet") #h(0.4em) #pill("👥 Public (POPOLARE)", color: "cyan")
]

#step(2, title: "📷 Open and enter")[
  Scan the QR code with your camera, or go to the site and enter the *event code*.

  *Just one tap: no registration, no password.*
]

#step(3, title: "🔢 Enter your voting code")[
  16 characters, split into *4 groups of 4*. If you open the link, it's already pre-filled.
  #v(0.4em)
  `A1B2` `C3D4` `E5F6` `G7H8`
]

#step(4, title: "🎯 Choose and vote")[
  *Numeric vote:* tap a candidate, then give a *score from 1 to 10*. \
  *Preference vote* (public only): tap the candidates you prefer, up to the allowed maximum.
  #v(0.4em)
  #pill("1", color: "red") #h(0.3em) #pill("3", color: "amber") #h(0.3em) #pill("5", color: "amber") #h(0.3em) #pill("7", color: "green") #h(0.3em) #pill("9", color: "cyan") #h(0.3em) #pill("10", color: "violet")
]

#step(5, title: "📊 Complete your ballot")[
  Numeric vote: one vote per candidate. Preference vote: up to _N_ candidates, with a
  "Preferences cast X/N" counter. Either way the vote is *not editable after submitting* and a
  progress bar shows what's still missing.

  *The page updates itself: if voting closes, your vote is locked.*
]

#step(6, title: "✅ Final confirmation")[
  When you're done, press *"Final confirmation"*: the code is locked and your vote becomes
  official.

  *Done! Thanks for voting.*
]

#v(0.4em)
#attenzione(title: "Warning")[
  If voting is shown as closed, you can no longer vote — try again later or contact the event
  staff.
]

#nota(title: "Numeric or preference vote?")[
  The organizer decides when creating the event. *Qualified judges* always vote with a score
  from 1 to 10. The *public* ballot, instead, may be preference-based: you pick one or more
  candidates (up to the maximum shown at the top of the page), with no scores.
]

#align(right, text(9pt, fill: tv.ink-faint)[TELEVOTO · Guide for judges and the public])
