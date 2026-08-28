#import "../lib.typ": *

#show: manual.with(title: "Televoto — Panoramica generale", lang: "it")

#cover(
  icon: "🗳  📱  🏆  📊",
  eyebrow: "Piattaforma di voto live per eventi",
  title: "Televoto",
  subtitle: [
    Trasforma il pubblico in giuria. Voto in tempo reale, classifiche live e un gran finale in
    Classifica — senza app da installare.
  ],
  meta: "Panoramica generale — documento per potenziali adopter",
)

#section-title[Cos'è Televoto]

Televoto è una piattaforma web pensata per chi organizza eventi con *votazione live*: talent
show, gare artistiche o sportive, hackathon, festival, concorsi aziendali o scolastici.
Sostituisce schede cartacee, fogli Excel e conteggi manuali con un sistema digitale in tempo
reale, accessibile da smartphone tramite semplice link o QR code — nessuna app da scaricare,
nessun account da creare per chi vota.

#section-title[Come funziona, in 3 fasi]

#card-grid(
  cols: 3,
  card(icon: "⚙️", title: "1 · Prepara l'evento")[
    L'organizzatore crea l'evento, inserisce i candidati/concorrenti e genera i codici di
    accesso per giuria e pubblico.
  ],
  card(icon: "📲", title: "2 · Si vota in diretta")[
    Giudici e pubblico ricevono un link o un QR code, aprono la pagina sul telefono e assegnano
    un punteggio a ciascun candidato.
  ],
  card(icon: "🏆", title: "3 · Classifica e reveal")[
    Il punteggio finale viene calcolato automaticamente e rivelato con un effetto scenico
    dedicato: la Classifica.
  ],
)

#section-title[Funzionalità principali]

#card-grid(
  cols: 2,
  card(icon: "⚖️", title: "Doppio canale di voto")[
    Giuria qualificata (voto pesato) e pubblico generale, combinati con pesi personalizzabili
    per evento (es. 70% giuria / 30% pubblico).
  ],
  card(icon: "🔐", title: "Codici voto monouso")[
    Ogni votante riceve un codice univoco condiviso via link o QR, valido per un solo voto a
    candidato: niente voti doppi.
  ],
  card(icon: "📡", title: "Dashboard live")[
    L'organizzatore vede in tempo reale quanti codici sono stati usati e a che punto è la
    votazione, senza dover ricaricare la pagina.
  ],
  card(icon: "🗂", title: "Gestione multi-evento")[
    Un pannello centrale per organizzare più eventi, ciascuno con i propri candidati, codici e
    password, isolati tra loro. Gli eventi conclusi si archiviano con un click e possono essere
    clonati per ripartire da un format già pronto.
  ],
  card(icon: "📈", title: "Punteggio configurabile")[
    Media pesata tra giuria e pubblico, con opzione di "trimmed mean" per ridurre l'impatto di
    voti anomali o outlier.
  ],
  card(icon: "🗳", title: "Voto pubblico flessibile")[
    Per il pubblico puoi scegliere il voto numerico (punteggio 1–10 per candidato) oppure una
    scheda a preferenze in stile elezione (uno o più candidati preferiti).
  ],
  card(icon: "🎉", title: "Classifica")[
    Una schermata di rivelazione della classifica finale pensata per il momento clou
    dell'evento, davanti al pubblico.
  ],
)

#pagebreak()

#section-title[Per chi è pensato]

Televoto si adatta a qualsiasi evento dal vivo in cui serve raccogliere un voto da più
persone, in modo rapido e trasparente:

#chip-row((
  "🎤 Talent show",
  "🏅 Gare e concorsi",
  "💻 Hackathon",
  "🎭 Festival ed eventi culturali",
  "🏢 Eventi aziendali",
  "🏫 Concorsi scolastici",
  "🎶 Contest musicali",
  "🍕 Sagre e fiere",
))

#suggerimento[
  *Zero attrito per chi vota:* basta aprire un link o inquadrare un QR code dal proprio
  telefono. Nessuna registrazione, nessun dato personale richiesto, nessuna app da installare.
]

#section-title[Sicurezza e affidabilità]

#card-grid(
  cols: 3,
  card(icon: "🔑", title: "Accessi separati")[
    Password dedicata per l'amministratore generale e per ogni singolo organizzatore di evento.
  ],
  card(icon: "🎟", title: "Codici protetti")[
    I codici voto sono opachi e monouso, salvati solo in forma cifrata: mai in chiaro nel
    sistema.
  ],
  card(icon: "🕵", title: "Nessun tracciamento")[
    Chi vota non viene profilato: nessun dato personale o identificativo del dispositivo viene
    raccolto.
  ],
)

#section-title[Perché sceglierlo]

#card-grid(
  cols: 2,
  card(icon: "⚡", title: "Pronto in pochi minuti")[
    Creare un evento, aggiungere candidati e generare i codici richiede pochissimi passaggi
    guidati.
  ],
  card(icon: "📱", title: "Solo browser, nessuna app")[
    Funziona su qualunque smartphone o tablet con connessione, senza installazioni.
  ],
  card(icon: "🧮", title: "Conteggio automatico")[
    Zero errori di calcolo: il punteggio finale è generato dal sistema secondo regole
    trasparenti e configurabili.
  ],
  card(icon: "🎬", title: "Momento scenico garantito")[
    La Classifica trasforma l'annuncio dei risultati in un momento di show pensato per il
    pubblico in sala.
  ],
)

#pagebreak()

#v(1fr)
#align(center, block(width: 85%, {
  set align(center)
  text(22pt, "🗳  🏆  📱")
  v(1em)
  text(26pt, weight: 700, fill: tv.ink)[
    Pronto a portare il voto live al tuo prossimo evento?
  ]
  v(0.8em)
  text(14pt, fill: tv.ink-soft)[
    Televoto è la soluzione per chi vuole coinvolgere pubblico e giuria in tempo reale, con un
    sistema semplice, sicuro e pensato per lo spettacolo del momento del verdetto.
  ]
}))
#v(1fr)
