#import "../lib.typ": *

#show: manual.with(title: "Guida del Manager di Evento — Televoto", lang: "it")

#cover(
  eyebrow: "Manuale operativo · Ad uso dei manager evento",
  title: "Televoto — Guida del Manager di Evento",
  subtitle: [
    Come gestire un singolo evento in `/manager`: candidati, codici giudice, avvio/chiusura del
    televoto e classifica finale.
  ],
  chips: (
    "Area: /manager",
    "Lingua interfaccia: Italiano",
    "Versione manuale: 1.0",
    "Accesso con codice evento + password manager",
    "Gestione di un solo evento alla volta",
    "Nessun accesso ad altri eventi",
  ),
)

#toc(lang: "it")

= Accesso all'area manager

L'area `/manager` permette di gestire operativamente *un solo evento alla volta*: non è
possibile vedere o raggiungere altri eventi da qui, per progetto. Per accedere servono due
informazioni distinte, richieste in due passaggi separati.

+ *Apri l'indirizzo /manager* — Se non è già presente un codice evento nell'URL, comparirà la
  schermata _"Inserisci il codice evento"_. Digita il codice numerico dell'evento (da 1 a 5
  cifre, es. `00001`) e premi *Entra*.
+ *Inserisci la password manager dell'evento* — Comparirà la schermata _"Area protetta ›
  Gestione evento"_ con il messaggio _"Inserisci la password manager per gestire questo
  evento"_. Inserisci la password fornita dall'amministratore root e premi *Accedi*. Se la
  password è errata, il campo mostrerà un messaggio di errore e potrai riprovare.
+ *Sei dentro* — Dopo l'accesso corretto si apre la shell dell'evento, con menu laterale (o
  menu a comparsa su schermi piccoli) e le sezioni *Dashboard*, *Candidati*, *Codici Voto* e
  *Backstage Votazione*.

`/manager?eventCode=00001&adminSection=dashboard`

#nota(title: "Da sapere")[
  Il codice evento identifica _quale_ evento vuoi gestire; la password manager è specifica di
  *quell'evento* (una password diversa per ogni evento). Se hai ricevuto una sessione da
  amministratore root, l'accesso a `/manager` di qualunque evento avviene automaticamente,
  senza dover inserire di nuovo la password manager.
]

#nota(title: "Uscire dall'area")[
  Il pulsante *Esci* è disponibile sia nel menu laterale sia nella barra in alto (icona di
  logout) e riporta alla pagina pubblica di voto.
]

= Panoramica della Dashboard

La sezione *Dashboard* è la prima schermata dopo il login e riassume lo stato dell'evento con
tre riquadri:

#table(
  columns: (auto, 1fr),
  table.header([Riquadro], [Cosa mostra]),
  [*Candidati*], [Numero totale di candidati registrati per l'evento.],
  [*Codici giuria emessi*], [Totale dei codici giudice generati, suddiviso in Qualificata e Popolare.],
  [*Stato voti giuria*], [Conteggio dei codici attivi, finalizzati e revocati.],
)

Nella barra superiore è sempre visibile un'etichetta di stato: *Televoto aperto* oppure
*Televoto chiuso*. Da qui, con le apposite icone, puoi anche aprire in una nuova scheda la
pagina di voto pubblico (icona urna) e la *Classifica* (icona coppa) dell'evento corrente.

#attenzione[
  L'icona *Apri Classifica* è utilizzabile solo a televoto chiuso: se provi ad aprirla mentre
  il televoto è ancora aperto, comparirà un avviso — _"La Classifica è accessibile solo a
  televoto chiuso. Chiudi il televoto per poter continuare."_ — e la pagina non si aprirà.
]

Dal riquadro principale della Dashboard puoi anche saltare rapidamente alle altre sezioni
tramite i pulsanti con le stesse etichette del menu laterale: *Candidati*, *Codici Voto*,
*Backstage Votazione*.

= Gestione candidati

Sezione *Candidati* del menu laterale — gestisce l'elenco dei candidati/performance in
votazione durante l'evento.

== Aggiungere un candidato

+ *Compila il modulo "Aggiungi nuovo candidato"* — Inserisci il _Nome candidato_ (obbligatorio,
  es. "Marco Rossi") ed eventualmente il _Titolo performance_ (facoltativo, es. "Brano /
  coreografia").
+ *Scegli il colore* — Un colore viene assegnato automaticamente ("Colore assegnato
  automaticamente"); puoi rigenerarlo con *Rigenera colore*, sceglierne uno dalla palette
  rapida mostrata a bottoni tondi, oppure impostarne uno personalizzato con il selettore colore
  ("Palette personalizzata").
+ *Conferma* — Premi *Aggiungi candidato*. Il candidato compare subito nell'elenco "Candidati
  attuali", numerato progressivamente.

== Modificare o eliminare un candidato

Ogni candidato nell'elenco ha i pulsanti *Modifica* ed *Elimina*. "Modifica" apre un pannello
inline con i campi Nome, Performance e Colore, con pulsanti *Salva* e *Annulla*.

#attenzione(title: "Vincolo importante — modifiche bloccate a voto aperto")[
  Aggiunta, modifica ed eliminazione dei candidati sono possibili *solo quando il televoto è
  chiuso*. Con televoto aperto tutti i controlli sono disattivati e compare il messaggio
  _"Modifiche bloccate finché il televoto è aperto."_ Per intervenire sui candidati devi prima
  chiudere il televoto (vedi Capitolo 5).
]

#nota(title: "Rinumerazione automatica")[
  L'eliminazione di un candidato fa *rinumerare automaticamente* i candidati rimanenti, così che
  la numerazione resti sempre progressiva e senza "buchi" (es. se elimini il candidato n.3 su
  5, il vecchio n.4 diventa il nuovo n.3, e così via).
]

#nota(title: "Stato evento visibile in cima")[
  In alto alla sezione Candidati trovi sempre un riquadro con lo *Stato evento* corrente
  (Televoto aperto/chiuso) e la relativa spiegazione, così sai subito se puoi operare o meno.
]

= Codici giudice

Sezione *Codici Voto* del menu laterale — "Gestione codici opachi": qui generi, distribuisci,
verifichi e revochi i codici che permettono ai giudici e al pubblico di votare.

Ogni codice è una stringa *opaca e imprevedibile di 16 caratteri*, mostrata anche suddivisa in
4 gruppi da 4 caratteri per facilitarne lettura e digitazione (es. `ABCD EFGH IJKL MNOP`). Il
codice in chiaro è visibile *solo al momento della generazione*: da quel momento il sistema
conserva solo un'impronta (hash) e un'anteprima parziale, non più il valore completo.

== Le due tipologie di codice

#table(
  columns: (auto, auto, 1fr),
  table.header([Tipo], [Etichetta in app], [Significato]),
  [QUALIFICATA], ["Giuria Qualificata"],
  [Voto di un giudice qualificato. Nel calcolo finale pesa come media giudici, divisa per
  *tutti* i codici qualificata attivi assegnati (non solo quelli usati) — un'astensione abbassa
  la media.],
  [POPOLARE], ["Giuria Popolare"],
  [Voto del pubblico generico. Confluisce nella media voto popolare dell'evento.],
)

== Generare codici

+ *Imposta i parametri di generazione* — Nel modulo "Genera codici" scegli: _Numero_ di codici
  da creare (1–200), un _Prefisso_ facoltativo per l'etichetta (es. "Giudice"), il _Tipo
  giuria_ (Giuria Qualificata / Giuria Popolare) e la _Base URL_ da usare per comporre il
  link/QR di ogni codice (es. l'indirizzo pubblico dell'evento). La lunghezza dei codici è
  fissa a 16 caratteri.
+ *Premi "Genera codici"* — I nuovi codici compaiono in "Ultimi codici generati", ciascuno con
  QR code, codice testuale formattato, link diretto e stato ("Attivo").
+ *Distribuisci i codici* — Per ogni codice puoi *Copia codice* o *Copia URL QR*; oppure usa
  *Copia tutti i link* per l'intero lotto, o *Stampa foglio A4* per ottenere un foglio pronto
  da stampare e ritagliare (utile per consegnare fisicamente i QR ai giudici in sala).

== Validare, revocare e rigenerare

- *Valida un codice*: incolla un codice nel riquadro "Valida un codice" e premi *Valida codice*
  per verificarne rapidamente lo stato (attivo, usato o revocato), l'etichetta, la data di
  creazione e la data di utilizzo.
- *Codici attivi*: l'elenco in basso a destra mostra tutti i codici non ancora esauriti, con
  etichetta, tipo, anteprima del codice, date di creazione/uso/revoca e stato colorato
  (Attivo, Usato o Revocato).
- *Revoca codice*: disponibile su ogni codice attivo, invalida il codice impedendone l'uso
  (utile se un codice è stato condiviso per errore o compromesso).
- *Codice perso? Rigenera*: genera un nuovo codice al posto di uno smarrito, trasferendo su di
  esso gli eventuali voti già espressi con il codice originale — che non è più recuperabile una
  volta rigenerato.
- *Rigenera tutti i codici*: in cima all'elenco "Codici attivi", rigenera in un colpo solo
  tutti i codici attivi con un nuovo valore (i voti già dati vengono trasferiti). I codici
  precedenti e i relativi link/QR smettono di funzionare e vanno ridistribuiti; i nuovi codici
  restano visibili in chiaro (con QR, copia e stampa A4) finché non lasci la pagina. Utile dopo
  un *Azzera classifica* se vuoi ripartire con codici nuovi.

#suggerimento(title: "Aggiornamento in tempo reale")[
  L'elenco dei codici e i contatori *Attivi / Usati / Revocati* in alto alla sezione si
  aggiornano automaticamente man mano che i giudici usano i propri codici, senza bisogno di
  ricaricare la pagina.
]

= Ciclo di vita del televoto

Sezione *Backstage Votazione* del menu laterale, blocco "Operazioni amministrative" — qui si
controllano avvio, chiusura e reset del televoto. Lo stato corrente (*Televoto aperto* oppure
*Televoto chiuso*) è sempre visibile nell'etichetta colorata della barra superiore (verde =
aperto, rosso = chiuso), quindi non viene ripetuto in questo blocco.

#table(
  columns: (auto, 1fr, 1fr),
  table.header([Azione], [Etichetta pulsante], [Effetto]),
  [Avviare l'evento / chiudere il televoto],
  [Un unico pulsante che cambia in base allo stato: mostra *Avvia votazione* quando il televoto
  è chiuso, oppure *Chiudi televoto* quando è aperto.],
  [*Avvia votazione*: rinumera progressivamente i candidati, azzera tutti i voti, riporta allo
  stato *Attivo* tutti i codici giudice non revocati (anche quelli già "Usato") e riapre il
  televoto. *Chiudi televoto*: i voti non vengono più accettati; le modifiche ai candidati
  tornano disponibili.],
  [Azzerare la classifica],
  [*Azzera classifica* (nella "Danger zone")],
  [Azzera tutti i voti raccolti per ricominciare da capo, senza toccare i candidati. I codici
  giudice non revocati tornano allo stato *Attivo* (lo stesso codice resta valido).],
)

#attenzione(title: [Avviso — "Avvia votazione" azzera tutti i voti])[
  *"Avvia votazione" è un'operazione distruttiva, non incrementale.* Alla conferma del messaggio
  _"Vuoi avviare la votazione? I voti precedenti saranno azzerati e i candidati verranno
  rinumerati progressivamente."_, tutti i voti già raccolti per l'evento vengono *cancellati
  definitivamente* e non sono recuperabili. Usa questa funzione solo quando sei certo di voler
  ripartire da zero (ad es. all'inizio ufficiale della serata, dopo aver terminato prove
  tecniche o test), non per "riaprire" temporaneamente il voto. I codici giudice/pubblico già
  distribuiti restano validi e tornano riutilizzabili (stato "Attivo"): non serve rigenerarli
  dopo un avvio/riavvio, a meno che non siano stati revocati.
]

Ogni azione richiede una conferma esplicita in un riquadro di dialogo prima di essere eseguita:

- *Avvia votazione* → conferma con il pulsante *Avvia*.
- *Chiudi televoto* → conferma con il pulsante *Chiudi* (messaggio: "Vuoi chiudere il televoto?
  I voti non saranno più accettati e le modifiche torneranno disponibili.").
- *Azzera classifica* → conferma con il pulsante *Azzera* (messaggio: "Vuoi azzerare tutti i
  voti e ricominciare da capo? I codici giudice non revocati torneranno attivi (lo stesso
  codice resta valido).").

Il riquadro mostra anche il codice e nome evento e include un accesso rapido al pulsante *Apri
Classifica* (con lo stesso avviso già visto: bloccato finché il televoto resta aperto).

= Monitoraggio in tempo reale

Sezione *Backstage Votazione*, blocco "Progresso voti giudici" — la dashboard che ti permette
di seguire l'andamento del voto mentre è in corso.

Quattro indicatori principali, aggiornati in tempo reale:

#card-grid(
  cols: 2,
  card(title: "Qualificata attivi")[
    Numero di codici giuria qualificata ancora attivi (non revocati) assegnati all'evento.
  ],
  card(title: "Qualificata finalizzati")[
    Numero di giudici qualificati che hanno completato e bloccato definitivamente il proprio
    voto.
  ],
  card(title: "Popolare QR attivati")[
    Numero di codici popolari che sono stati effettivamente aperti/usati dal pubblico.
  ],
  card(title: "Voti popolari espressi")[
    Totale dei voti popolari già registrati per l'evento.
  ],
)

Più in basso trovi il dettaglio operativo utile a chiudere gli ultimi voti mancanti:

- *Candidati con voti incompleti*: elenco dei candidati a cui mancano ancora voti da parte di
  alcuni giudici, con il conteggio di quanti giudici mancano per ciascuno.
- *Giudici attivi incompleti*: elenco dei giudici (identificati dall'anteprima del codice e, se
  presente, dall'etichetta) che non hanno ancora votato tutti i candidati, con il conteggio
  voti espressi/richiesti e i nomi dei candidati ancora mancanti.

#nota(title: "Nessun dato ancora")[
  Se non è stato generato nessun codice giudice per l'evento, la sezione mostra semplicemente
  _"Nessun codice giudice generato per questo evento."_ Puoi comunque forzare un aggiornamento
  manuale con il pulsante *Aggiorna* in alto alla dashboard.
]

#suggerimento(title: "Utile durante l'evento dal vivo")[
  Questa dashboard è pensata per essere tenuta aperta "in backstage" durante la serata, per
  capire in ogni momento se si può procedere a chiudere il televoto o se conviene aspettare
  ancora qualche giudice.
]

= Classifica finale

Questa pagina mostra la classifica finale dei candidati. È raggiungibile dall'icona coppa
presente nella barra dell'evento (Dashboard) o dal pulsante *Apri Classifica* nel Backstage
Votazione, e si apre in una nuova scheda del browser.

#attenzione(title: "Accessibile solo a televoto chiuso")[
  Se il televoto è ancora aperto, l'accesso alla Classifica è *bloccato*: comparirà l'avviso
  _"Televoto ancora aperto — La Classifica è accessibile solo a televoto chiuso. Chiudi il
  televoto per poter continuare."_ Devi prima chiudere il televoto (Capitolo 5) per poter
  consultare la classifica.
]

== Come viene calcolato il punteggio (in sintesi)

Il punteggio finale di ciascun candidato combina due componenti:

#block(inset: (left: 0.5em), {
  set text(0.92em)
  raw("Media Qualificata = somma punti giudici qualificati ÷ numero di codici QUALIFICATA attivi (non solo chi ha votato)")
  parbreak()
  raw("Media Popolare (voto numerico) = media dei voti popolari (eventualmente \"trimmed mean\" per ridurre l'effetto di voti anomali)")
  parbreak()
  raw("Media Popolare (voto a preferenze) = quota di preferenze del candidato sul totale delle preferenze espresse, su scala 0-10")
  parbreak()
  raw("Punteggio finale = (Media Qualificata × peso Qualificata) + (Media Popolare × peso Popolare)")
})

- *Le astensioni pesano*: la media dei giudici qualificati si divide per _tutti_ i codici
  QUALIFICATA validi assegnati all'evento, non solo per quelli effettivamente usati — quindi un
  giudice qualificato che non vota abbassa comunque la media del candidato.
- *Voto popolare a preferenze*: se l'evento usa la modalità "Preferenze" (il pubblico sceglie
  uno o più candidati anziché dare un punteggio), la componente popolare di un candidato è la
  sua quota di preferenze sul totale, riportata su scala 0–10. In questa modalità la trimmed
  mean non viene applicata.
- *Trimmed mean (facoltativa, solo voto numerico)*: se attivata per l'evento, la media del voto
  popolare esclude una percentuale di voti estremi (più alti/più bassi) per ridurre l'impatto
  di valutazioni anomale.
- *Pesi per evento*: le due medie vengono combinate secondo pesi specifici dell'evento (di
  norma 70% giuria qualificata / 30% pubblico, ma personalizzabili dall'amministratore root),
  che sommano al 100%.
- *Parità*: in caso di punteggi finali sostanzialmente uguali, prevale prima chi ha la media
  qualificata più alta, poi — a parità anche di quella — chi ha il numero di candidato più
  basso.

#nota(title: "Classifica in corso vs classifica finale")[
  Nel Backstage Votazione è disponibile anche una vista di *classifica parziale*, utile per
  seguire l'andamento mentre il voto è ancora aperto: è una stima "live" e può differire
  leggermente dal calcolo definitivo mostrato da questa pagina a televoto chiuso.
]

= Domande frequenti

== Non riesco ad accedere: "Password errata"

Verifica di aver digitato correttamente la password manager di *questo specifico evento* (ogni
evento ha la propria). Se l'hai persa, chiedi all'amministratore root di comunicartela di nuovo
o di rigenerarla.

== Non riesco a modificare/eliminare un candidato

I controlli sono disattivati mentre il *televoto è aperto*. Vai in *Backstage Votazione* e usa
*Chiudi televoto*, poi torna in *Candidati*.

== Un giudice ha smarrito il proprio codice

In *Codici Voto*, individua il codice del giudice tra i "Codici attivi" e usa *Codice perso?
Rigenera*: verrà creato un nuovo codice, con gli eventuali voti già dati trasferiti su di esso;
il vecchio codice smette di funzionare.

== La Classifica non si apre

Controlla lo stato in alto alla pagina: se mostra *Televoto aperto*, devi prima chiuderlo da
*Backstage Votazione* → *Chiudi televoto*.

== Ho premuto "Avvia votazione" per errore

L'azzeramento dei voti eseguito da *Avvia votazione* non è reversibile: i voti precedenti non
sono recuperabili. I candidati restano comunque presenti (solo rinumerati); potrai far ripetere
il voto ai giudici e al pubblico con i codici già emessi (se ancora attivi) o generandone di
nuovi.

== Posso gestire più eventi da qui?

No: `/manager` è volutamente limitato a *un evento alla volta*, identificato dal codice evento
inserito in accesso. Per passare a un altro evento serve il suo codice e la sua password
manager (oppure una sessione amministratore root, che può aprire qualsiasi evento senza
password aggiuntiva).

#colophon[
  Manuale operativo Televoto per Manager di evento · area applicativa `/manager` · contenuti
  allineati all'interfaccia corrente dell'applicazione.
]
