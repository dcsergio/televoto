// Televoto — libreria tipografica condivisa per i manuali PDF (Typst).
//
// Ricostruisce in Typst il sistema grafico di `docs/manuals/src/shared/manual.css`
// (palette "Neon Dark" adattata alla carta chiara: inchiostro scuro su fondo
// bianco, accenti cyan/violet per titoli, callout e dettagli).
//
// Standard grafici (skill "mio-tipografo"):
//   - A4, margini 2.5 cm
//   - numero di pagina in basso a destra ("Pagina X di Y" / "Page X of Y")
//   - corpo sans-serif, monospazio per codice/elementi UI
//   - callout Nota / Attenzione / Suggerimento
//   - indice generato automaticamente

// ---------------------------------------------------------------- Palette ----

#let tv = (
  paper: rgb("#ffffff"),
  paper-muted: rgb("#f5f6fa"),
  ink: rgb("#1b1e2b"),
  ink-soft: rgb("#4a4f63"),
  ink-faint: rgb("#767c93"),
  cyan: rgb("#0aa8c4"),
  cyan-dark: rgb("#067486"),
  violet: rgb("#6c4fd6"),
  violet-dark: rgb("#4c33a8"),
  line: rgb("#e1e3ec"),
  line-strong: rgb("#c7cadb"),
)

#let _callout-cfg = (
  info: (bg: rgb("#eaf7fb"), border: rgb("#0aa8c4"), ink: rgb("#0a5566")),
  warning: (bg: rgb("#fff4e5"), border: rgb("#e08a1e"), ink: rgb("#7a4c07")),
  tip: (bg: rgb("#eaf9ef"), border: rgb("#2fa860"), ink: rgb("#1a6b3c")),
)

#let _pill-cfg = (
  cyan: (bg: rgb("#eaf7fb"), fg: rgb("#0aa8c4")),
  violet: (bg: rgb("#f1ecfc"), fg: rgb("#4c33a8")),
  green: (bg: rgb("#eaf9ef"), fg: rgb("#2fa860")),
  amber: (bg: rgb("#fff4e5"), fg: rgb("#e08a1e")),
  red: (bg: rgb("#fdeceb"), fg: rgb("#b3261e")),
)

// ------------------------------------------------------------- Componenti ----

#let _pad2(n) = if n < 10 { "0" + str(n) } else { str(n) }

/// Callout colorato (Nota / Attenzione / Suggerimento).
#let callout(body, kind: "info", title: none) = {
  let c = _callout-cfg.at(kind)
  block(
    width: 100%,
    fill: c.bg,
    stroke: (left: 4pt + c.border),
    radius: (right: 5pt),
    inset: (left: 1.1em, rest: 0.9em),
    above: 1em,
    below: 1em,
    breakable: true,
    {
      set text(fill: c.ink)
      if title != none {
        block(below: 0.4em, text(weight: 700, fill: c.border, title))
      }
      body
    },
  )
}

#let nota(body, title: "Nota") = callout(body, kind: "info", title: title)
#let attenzione(body, title: "Attenzione") = callout(body, kind: "warning", title: title)
#let suggerimento(body, title: "Suggerimento") = callout(body, kind: "tip", title: title)

/// Pillola di stato, come i chip colorati dell'interfaccia.
#let pill(body, color: "cyan") = {
  let c = _pill-cfg.at(color)
  box(
    fill: c.bg,
    radius: 999pt,
    inset: (x: 0.55em, y: 0.15em),
    outset: (y: 0.2em),
    text(0.82em, weight: 600, fill: c.fg, hyphenate: false, body),
  )
}

/// Tag/chip neutro in linea.
#let chip(body) = box(
  fill: tv.paper-muted,
  stroke: 0.75pt + tv.line-strong,
  radius: 999pt,
  inset: (x: 0.9em, y: 0.42em),
  outset: (y: 0.24em),
  text(9.5pt, fill: tv.ink-soft, hyphenate: false, body),
)

/// Riga di chip (va a capo automaticamente).
#let chip-row(items) = block(above: 0.8em, below: 0.8em, {
  set par(leading: 1em)
  items.map(chip).join(h(0.5em))
})

/// Card informativa (fase, funzionalità, indicatore).
#let card(body, icon: none, title: none) = block(
  width: 100%,
  fill: tv.paper-muted,
  stroke: 0.75pt + tv.line,
  radius: 7pt,
  inset: 1em,
  breakable: false,
  {
    if icon != none { block(below: 0.4em, text(17pt, icon)) }
    if title != none { block(below: 0.35em, text(weight: 700, fill: tv.ink, title)) }
    body
  },
)

/// Griglia di card.
#let card-grid(cols: 2, ..items) = block(above: 1em, below: 1em, grid(
  columns: (1fr,) * cols,
  gutter: 0.9em,
  ..items.pos(),
))

/// Passo numerato per le guide rapide a step.
#let step(n, body, title: none) = {
  let cell = if title != none {
    stack(spacing: 0.5em, text(12pt, weight: 700, hyphenate: false, title), body)
  } else {
    body
  }
  block(above: 1.1em, below: 1.1em, breakable: false, grid(
    columns: (2.1em, 1fr),
    gutter: 0.85em,
    box(
      width: 2em,
      height: 2em,
      radius: 999pt,
      fill: tv.cyan,
      align(center + horizon, text(fill: white, weight: 700, size: 12pt, str(n))),
    ),
    cell,
  ))
}

/// Titolo di sezione "piatto" (senza numerazione di capitolo).
#let section-title(body) = block(
  above: 1.6em,
  below: 0.8em,
  breakable: false,
  {
    text(17pt, weight: 700, fill: tv.violet-dark, hyphenate: false, body)
    v(0.3em, weak: true)
    line(length: 100%, stroke: 2pt + tv.line)
  },
)

/// Sottotitolo grigio sotto il titolo di capitolo.
#let chapter-subtitle(body) = block(
  above: 0.2em,
  below: 1em,
  text(10.5pt, fill: tv.ink-faint, body),
)

/// Riga di chiusura del documento (piè di capitolo finale).
#let colophon(body) = block(
  above: 2em,
  stroke: (top: 0.75pt + tv.line),
  inset: (top: 1em),
  text(9.5pt, fill: tv.ink-faint, body),
)

// ---------------------------------------------------------------- Cover ------

#let cover(
  title: none,
  eyebrow: none,
  subtitle: none,
  meta: none,
  badge: none,
  icon: none,
  chips: (),
) = {
  page(footer: none, header: none, {
    set align(center + horizon)
    set par(justify: false)
    set text(hyphenate: false)
    let parts = ()
    if icon != none { parts.push(text(52pt, icon)) }
    if badge != none {
      parts.push(box(
        fill: tv.cyan-dark,
        radius: 999pt,
        inset: (x: 1em, y: 0.45em),
        text(9pt, weight: 700, fill: white, tracking: 0.06em, upper(badge)),
      ))
    }
    if eyebrow != none {
      parts.push(text(12pt, weight: 600, fill: tv.cyan-dark, tracking: 0.12em, upper(eyebrow)))
    }
    parts.push(text(33pt, weight: 700, fill: tv.ink, title))
    if subtitle != none {
      parts.push(block(width: 80%, text(14pt, fill: tv.ink-soft, subtitle)))
    }
    if chips.len() > 0 { parts.push(chip-row(chips)) }
    if meta != none { parts.push(text(10pt, fill: tv.ink-faint, meta)) }
    parts.join(v(0.85em))
  })
  counter(page).update(1)
}

// -------------------------------------------------------------- Indice -------

#let toc(lang: "it") = {
  block(
    above: 1em,
    below: 0.8em,
    text(20pt, weight: 700, fill: tv.violet-dark, if lang == "en" { "Table of contents" } else { "Indice" }),
  )
  outline(title: none, depth: 1)
  pagebreak()
}

// ------------------------------------------------------------- Template ------

#let manual(
  title: "Manuale",
  lang: "it",
  body,
) = {
  set document(title: title)

  set page(
    paper: "a4",
    margin: 2.5cm,
    footer: context {
      let page-num = counter(page).get().first()
      let total = counter(page).final().first()
      let label = if lang == "en" { [Page #page-num of #total] } else { [Pagina #page-num di #total] }
      align(right, text(9pt, fill: tv.ink-faint, label))
    },
  )

  set text(
    font: ("Segoe UI", "Arial", "Liberation Sans", "Segoe UI Emoji"),
    size: 11pt,
    fill: tv.ink,
    lang: lang,
  )
  set par(justify: true, leading: 0.7em, spacing: 0.95em)
  set list(indent: 0.5em, spacing: 0.6em, marker: ([•], [–], [·]))
  set enum(indent: 0.5em, spacing: 0.6em, numbering: "1.")

  show link: set text(fill: tv.violet-dark)

  // Codice / elementi UI in monospazio.
  show raw.where(block: false): it => box(
    fill: tv.paper-muted,
    stroke: 0.5pt + tv.line,
    radius: 2pt,
    inset: (x: 0.35em),
    outset: (y: 0.22em),
    text(0.92em, it),
  )

  // Titoli.
  set heading(numbering: none)
  show heading: set text(hyphenate: false)
  show heading: set par(justify: false)

  show heading.where(level: 1): it => {
    pagebreak(weak: true)
    counter("tv-chapter").step()
    block(above: 0em, below: 0.35em, {
      context {
        let n = counter("tv-chapter").get().first()
        text(19pt, weight: 700, fill: tv.cyan-dark)[#_pad2(n). ]
      }
      text(19pt, weight: 700, fill: tv.violet-dark, it.body)
    })
    line(length: 100%, stroke: 2pt + tv.line)
    v(0.5em, weak: true)
  }

  show heading.where(level: 2): it => block(
    above: 1.2em,
    below: 0.5em,
    text(13.5pt, weight: 700, fill: tv.ink, it.body),
  )

  show heading.where(level: 3): it => block(
    above: 1em,
    below: 0.4em,
    text(11.5pt, weight: 700, fill: tv.ink-soft, it.body),
  )

  // Tabelle.
  set table(
    stroke: 0.75pt + tv.line,
    inset: (x: 0.6em, y: 0.45em),
    fill: (_, y) => if y == 0 { tv.paper-muted } else if calc.even(y) { rgb("#fbfbfd") },
  )
  show table.cell.where(y: 0): set text(weight: 700, fill: tv.violet-dark)
  show table: set par(justify: false)
  show table: set text(hyphenate: false)

  body
}
