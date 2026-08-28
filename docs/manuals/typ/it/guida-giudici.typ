#import "../lib.typ": *

#show: manual.with(title: "Come votare — Guida rapida | Televoto", lang: "it")

#grid(
  columns: (1fr, auto),
  align: (left + horizon, right + horizon),
  {
    text(25pt, weight: 700, fill: tv.ink)[Come votare — Guida rapida]
    v(0.2em)
    text(fill: tv.ink-soft)[Per giudici e pubblico · bastano 30 secondi]
  },
  box(
    fill: tv.cyan-dark,
    radius: 999pt,
    inset: (x: 1em, y: 0.45em),
    text(9pt, weight: 700, fill: white, tracking: 0.06em)[📱 TELEVOTO],
  ),
)

#v(0.4em)
#line(length: 100%, stroke: 0.75pt + tv.line)
#v(1em)

#card-grid(
  cols: 2,
  card(icon: "🔗", title: "1. Ricevi il tuo codice")[
    L'organizzatore ti consegna un *QR code* o un *link personale*. È il tuo codice voto,
    monouso.
    #v(0.5em)
    #chip-row(("⭐ Giuria (QUALIFICATA)", "👥 Pubblico (POPOLARE)"))
  ],
  card(icon: "📷", title: "2. Apri e accedi")[
    Inquadra il QR con la fotocamera, oppure vai sul sito e inserisci il *codice evento*.
    #v(0.5em)
    *Basta un tap: nessuna registrazione, nessuna password.*
  ],
  card(icon: "🔢", title: "3. Inserisci il codice voto")[
    16 caratteri, divisi in *4 gruppi da 4*. Se apri il link è già precompilato.
    #v(0.5em)
    `A1B2 C3D4 E5F6 G7H8`
  ],
  card(icon: "🎯", title: "4. Scegli e vota")[
    *Voto numerico:* tocca un candidato e assegna un *punteggio da 1 a 10*. \
    *Voto a preferenze* (solo pubblico): tocca i candidati che preferisci, fino al numero
    massimo consentito.
    #v(0.5em)
    #chip-row(("1", "3", "5", "7", "9", "10"))
  ],
  card(icon: "📊", title: "5. Completa la scheda")[
    Nel voto numerico: un voto per candidato. Nel voto a preferenze: fino a _N_ candidati, con
    un contatore "Preferenze espresse X/N". In entrambi i casi il voto non è modificabile dopo
    l'invio e una barra mostra cosa manca.
    #v(0.5em)
    *La pagina si aggiorna da sola: se il televoto chiude, il voto si blocca.*
  ],
  card(icon: "✅", title: "6. Conferma definitiva")[
    Quando hai finito, premi *"Conferma definitiva"*: il codice si blocca e il voto è ufficiale.
    #v(0.5em)
    *Fatto! Grazie per aver votato.*
  ],
)

#attenzione[
  Se il televoto risulta chiuso non è più possibile votare — riprova più tardi o contatta lo
  staff.
]

#nota(title: "Numerico o a preferenze?")[
  Lo decide l'organizzatore quando crea l'evento. I *giudici della giuria qualificata* votano
  *sempre* con un punteggio da 1 a 10. Per il *pubblico*, l'evento può invece usare una scheda
  a preferenze: si scelgono uno o più candidati (fino al massimo indicato in alto nella
  pagina), senza assegnare punteggi.
]

#align(right, text(9.5pt, fill: tv.ink-faint)[TELEVOTO · Guida per giudici e pubblico])
