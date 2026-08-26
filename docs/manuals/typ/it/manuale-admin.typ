#import "../lib.typ": *

#show: manual.with(title: "Manuale dell'Amministratore Root — Televoto", lang: "it")

#cover(
  badge: "Documentazione operativa",
  eyebrow: "Televoto · Area /admin",
  title: "Manuale dell'Amministratore Root",
  subtitle: "Guida operativa alla gestione cross-evento della piattaforma Televoto",
  meta: [
    *Destinatari:* amministratori con accesso alla password root globale. \
    *Ambito:* pannello `/admin` — dashboard generale, anagrafica eventi, archiviazione e
    clonazione eventi, pesi di scoring, sicurezza delle credenziali. \
    *Versione documento:* 1.1 · Agosto 2026
  ],
)

#toc(lang: "it")

= Introduzione e modello di accesso
#chapter-subtitle[
  Come funziona l'autenticazione root e cosa distingue l'area Admin dall'area Manager.
]

Televoto utilizza un modello di autenticazione a due livelli, indipendenti tra loro:

#table(
  columns: (auto, 1fr, 1fr),
  table.header([Livello], [Ambito], [Credenziale]),
  [*Root*],
  [Globale: accesso a `/admin`, gestione di tutti gli eventi, sicurezza generale],
  [Un'unica password root, condivisa],
  [*Event Manager*],
  [Singolo evento: accesso a `/manager`, candidati, codici giuria, avvio/chiusura del televoto],
  [Una password dedicata per ciascun evento],
)

#nota(title: "Da sapere")[
  Chi accede con la password *root* può aprire l'area `/manager` di *qualsiasi* evento senza
  dover inserire la password del manager di quell'evento: il sistema riconosce automaticamente
  il ruolo root e salta la richiesta. Questo NON vale per la pagina `/score` (Classifica), dove
  anche il root deve inserire la password manager dell'evento specifico.
]

L'area `/admin` è pensata esclusivamente per operazioni *cross-evento*: creazione e anagrafica
degli eventi, archiviazione e clonazione degli eventi, pesi di scoring, sicurezza delle
password. Non gestisce candidati, codici giuria o l'avvio/chiusura della votazione di un
singolo evento: per queste operazioni occorre raggiungere l'area dedicata `/manager`
dell'evento (vedi Capitolo 9).

= Accesso all'area Admin (login root)
#chapter-subtitle[Come autenticarsi con la password root.]

+ Apri il browser e naviga a `/admin` sul dominio dell'applicazione.
+ Se non è già presente una sessione root valida, viene mostrata una schermata di accesso
  protetta con il messaggio: _"Inserisci la password root per accedere a questa sezione."_
+ Digita la *password root* nel campo dedicato e conferma l'invio del modulo.
+ In caso di password errata, il modulo mostra un messaggio di errore e permette di riprovare.
+ È possibile annullare l'accesso: l'utente viene riportato alla pagina pubblica di voto (`/`).

#nota(title: "Sessione")[
  L'autenticazione produce un token firmato con validità di *12 ore*. Il token viene conservato
  nella `sessionStorage` del browser: resta valido dopo un aggiornamento della pagina, ma viene
  perso alla chiusura della scheda/browser.
]

#attenzione[
  Non esiste un sistema di account utente individuali: la password root è unica e condivisa da
  tutti gli amministratori. Custodiscila con cura e ruotala periodicamente (vedi Capitolo 7).
]

= Panoramica della Dashboard
#chapter-subtitle[Sezione "Dashboard" del menu laterale — vista d'insieme su tutti gli eventi.]

Dopo il login, l'area Admin si presenta con un menu laterale a tre voci: *Dashboard*, *Eventi*
e *Archiviati* (parametro URL `?adminSection=dashboard|events|archived`), quest'ultima dedicata
alla gestione degli eventi archiviati (vedi Capitolo 4). La Dashboard è la sezione predefinita
e mostra:

== Riepilogo generale (card numeriche)

#table(
  columns: (auto, 1fr),
  table.header([Indicatore], [Significato]),
  [Eventi totali], [Numero complessivo di eventi presenti a sistema],
  [Eventi attivi], [Eventi non archiviati (esclude quelli con flag "Attivo" disattivato)],
  [Televoto aperto], [Eventi con votazione attualmente aperta],
  [Televoto chiuso], [Eventi con votazione chiusa],
)

== Evento selezionato

In alto nella toolbar è presente un selettore a tendina *"Evento selezionato"* che elenca
tutti gli eventi (codice + nome). L'evento scelto qui rimane selezionato anche passando da una
sezione all'altra e determina la card di dettaglio mostrata in Dashboard, con:

- Stato: *Attivo* / Non attivo, *Televoto aperto* / chiuso;
- Pulsante *"Gestisci evento"*, che apre l'area `/manager` dell'evento in una nuova scheda.

== Elenco completo eventi

Sotto la card di dettaglio, una griglia di schede riepiloga tutti gli eventi *non archiviati*
con codice, nome, sottotitolo (se presente), stato televoto Aperto/Chiuso, un pulsante
*"Gestisci"* e un'icona *"Archivia evento"* per ciascuno. Se esistono eventi archiviati, sopra
la griglia compare un collegamento rapido con il relativo conteggio verso la sezione
*Archiviati* (vedi Capitolo 4).

#nota(title: "Azioni rapide in toolbar")[
  Dalla toolbar in alto sono sempre disponibili: *Aggiorna eventi* (ricarica l'elenco), *Apri
  pagina voto pubblico* e *Apri Classifica* per l'evento selezionato, oltre al pulsante di
  *logout*.
]

= Archiviare, ripristinare e clonare un evento
#chapter-subtitle[
  Sezione "Eventi" (archiviazione) e sezione "Archiviati" (ripristino e clonazione).
]

Un evento archiviato viene escluso dal selettore *"Evento selezionato"* in toolbar, dalla
griglia "Tutti gli eventi" in Dashboard e dai conteggi "Eventi attivi"/"Televoto
aperto"/"Televoto chiuso": resta comunque interamente conservato (con i suoi candidati,
credenziali e impostazioni) e raggiungibile dalla sezione *Archiviati* del menu laterale.

== 4.1 Archiviare un evento

Puoi archiviare un evento da due punti del pannello:

- in *Dashboard*, dalla scheda dell'evento nella griglia "Tutti gli eventi", tramite l'icona
  *"Archivia evento"*;
- in *Eventi* → riquadro "Evento corrente", tramite il pulsante *"Archivia evento"* (mostra
  "Archiviazione..." durante l'operazione).

Non è richiesta una conferma aggiuntiva: l'evento archiviato scompare immediatamente dalle
liste attive e diventa visibile solo nella sezione Archiviati.

#attenzione(title: "Operazione reversibile, ma non distruttiva")[
  Archiviare un evento *non* cancella candidati, codici giuria, voti o credenziali: è un flag
  di visibilità, sempre reversibile disarchiviando l'evento.
]

== 4.2 Disarchiviare un evento

+ Vai nella sezione *Archiviati* del menu laterale.
+ Individua la scheda dell'evento nella griglia.
+ Premi *"Disarchivia"* (mostra "Ripristino..." durante l'operazione).
+ L'evento torna immediatamente disponibile nel selettore in toolbar e nelle liste attive di
  Dashboard/Eventi, con lo stato di televoto invariato rispetto a prima dell'archiviazione.

== 4.3 Clonare un evento archiviato

Dalla stessa sezione *Archiviati*, il pulsante *"Clona"* (icona di copia) crea un *nuovo
evento* a partire da quello archiviato, utile per riutilizzare un format già configurato (es.
un'edizione precedente dello stesso concorso) senza reinserire candidati e impostazioni da
zero.

#table(
  columns: (1fr, 1fr),
  table.header([Cosa viene copiato], [Cosa NON viene copiato]),
  [
    Nome evento (con suffisso " (copia)"), sottotitolo, modalità di voto popolare, pesi di
    scoring e impostazioni trimmed mean, elenco candidati completo (numero, nome, sottotitolo,
    colore, template), password manager evento
  ],
  [Voti registrati, codici giudice/pubblico già generati, storico progressi],
)

Il nuovo evento riceve un *codice evento generato automaticamente* (mai quello dell'evento di
origine), nasce *non archiviato* ma con il *televoto già chiuso*: prima di aprirlo al pubblico
occorre generare i nuovi codici giudice/pubblico dall'area `/manager` del nuovo evento.

#nota(title: "Perché clonare solo dagli eventi archiviati")[
  L'azione "Clona" è disponibile solo nella sezione Archiviati: per duplicare un evento ancora
  attivo, archivialo prima (Capitolo 4.1), poi clonalo e, se necessario, disarchivia
  l'originale.
]

#attenzione(title: "Password manager duplicata")[
  L'evento clonato eredita la *stessa* password manager dell'evento di origine. Se l'originale
  e il clone restano entrambi attivi, valuta di ruotare la password di uno dei due (Capitolo 8)
  per evitare che condividano la stessa credenziale.
]

= Creare un nuovo evento
#chapter-subtitle[Sezione "Eventi" → riquadro "Crea nuovo evento".]

+ Nel menu laterale seleziona *Eventi*.
+ Individua il riquadro *"Crea nuovo evento"* sulla destra del pannello.
+ Compila i campi del modulo (vedi tabella sotto).
+ Premi il pulsante *"Crea evento"*.
+ Il nuovo evento viene aggiunto in cima all'elenco e selezionato automaticamente come evento
  corrente.

#table(
  columns: (auto, auto, 1fr),
  table.header([Campo], [Obbligatorio], [Note]),
  [*Nome evento*], [Sì],
  [Testo libero. Il separatore `//` nel nome evidenzia graficamente una parte del titolo (es.
  `Finale regionale // GRAN FINALE`).],
  [*Sottotitolo*], [No], [Testo libero opzionale, es. "Edizione 2026".],
  [*Codice evento*], [No],
  [Da 1 a 5 cifre numeriche. Se lasciato vuoto viene generato automaticamente dal sistema. È il
  codice usato nell'URL pubblico (`?eventCode=...`) e per l'accesso a `/manager`.],
  [*Modalità voto popolare*], [Sì (predefinita: Numerico)],
  [*Numerico (1-10)*: il pubblico assegna un punteggio. *Singolo (elezione)*: il pubblico vota
  un solo candidato. Non modificabile dopo la creazione dell'evento.],
  [*Password manager evento*], [Sì],
  [Minimo 8 caratteri. È la password che l'event manager userà per accedere a `/manager` per
  questo evento.],
)

#attenzione(title: "Validazioni bloccanti")[
  Il modulo respinge la creazione se: il nome è vuoto, il codice evento non rispetta il formato
  1-5 cifre, oppure la password manager è più corta di 8 caratteri. Il messaggio di errore
  compare in cima al pannello.
]

#attenzione(title: "Irreversibile dopo la creazione")[
  La modalità di voto popolare (Numerico / Singolo) non è più modificabile una volta creato
  l'evento: scegliela con attenzione prima di confermare.
]

= Modificare un evento e i pesi di scoring
#chapter-subtitle[Sezione "Eventi" → riquadro "Evento corrente".]

Seleziona l'evento da modificare tramite il selettore in toolbar, poi vai nella sezione
*Eventi*: il riquadro *"Evento corrente"* mostra tre moduli distinti per l'evento selezionato.

== 5.1 Rinominare l'evento

+ Nel campo *"Nuovo nome evento"* digita il nome aggiornato.
+ Premi *"Rinomina"*. Il pulsante mostra "Salvataggio..." durante l'operazione.

Se il nome digitato coincide con quello già salvato, non viene inviata alcuna richiesta.

== 5.2 Pesatura giurie (pesi di scoring)

Nel riquadro *"Pesatura giurie"* si imposta il bilanciamento tra la media della giuria
*Qualificata* e quella del voto *Popolare* nel calcolo del punteggio finale.

#table(
  columns: (auto, 1fr),
  table.header([Campo], [Descrizione]),
  [Peso Qualificata (%)], [Valore intero 0–100, editabile direttamente.],
  [Peso Popolare (%)],
  [Campo _disabilitato_, calcolato automaticamente come `100 - Peso Qualificata`. I due pesi
  sommano sempre 100.],
  [Abilita trimmed mean su voti popolari],
  [Checkbox visibile solo per eventi con modalità di voto *Numerico* (non per "Singolo").
  Riduce l'impatto di voti anomali/outlier sulla media popolare.],
  [Percentuale trimmed mean (%)], [Valore 0–49,99, attivo solo se la trimmed mean è abilitata.],
)

Premi *"Salva impostazioni voto"* per confermare. Il valore predefinito di fabbrica è 70%
Qualificata / 30% Popolare.

#nota(title: "Come viene usato il peso Qualificata")[
  La media della giuria Qualificata viene divisa per il numero di giudici qualificata idonei e
  non revocati assegnati all'evento (non solo per chi ha effettivamente votato): le astensioni
  abbassano quindi la media del candidato. Il punteggio finale combina le due medie secondo i
  pesi impostati qui.
]

#attenzione(title: "Validazioni")[
  Il peso Qualificata deve essere un numero intero compreso tra 0 e 100; la percentuale trimmed
  mean deve essere compresa tra 0 e 49,99. Valori fuori range vengono respinti con un messaggio
  d'errore.
]

= Ruotare la password root
#chapter-subtitle[Sezione "Eventi" → riquadro "Sicurezza root" (in fondo alla pagina).]

Questa operazione aggiorna la password root globale, usata per l'accesso a tutte le aree
amministrative protette.

+ Vai nella sezione *Eventi* e scorri fino al riquadro *"Sicurezza root"*.
+ Compila i tre campi: *Password root attuale*, *Nuova password root*, *Conferma nuova password
  root*.
+ Premi *"Aggiorna password root"*.

#attenzione(title: "Requisiti e controlli")[
  - Sia la password attuale sia la nuova devono avere almeno *8 caratteri*.
  - La nuova password e la sua conferma devono coincidere esattamente, altrimenti l'operazione
    viene respinta.
  - Dopo l'aggiornamento con successo, i campi del modulo vengono svuotati automaticamente.
]

#attenzione(title: "Impatto")[
  Cambiare la password root non invalida automaticamente le sessioni già aperte in altri
  browser/dispositivi (i token restano validi fino alla scadenza delle 12 ore), ma qualunque
  nuovo accesso a `/admin` richiederà la nuova password. Comunica il cambiamento a tutti gli
  amministratori root prima di eseguirlo.
]

= Ruotare la password del manager di un evento
#chapter-subtitle[
  Sezione "Eventi" → riquadro "Evento corrente" → campo "Nuova password manager evento".
]

Ogni evento ha una propria password manager, indipendente dalla password root, usata per
accedere a `/manager` per quell'evento specifico (tipicamente da chi gestisce l'evento sul
campo, senza credenziali root).

+ Seleziona l'evento interessato dal selettore in toolbar.
+ Vai nella sezione *Eventi*, riquadro *"Evento corrente"*.
+ Nel campo *"Nuova password manager evento"* digita la nuova password (minimo 8 caratteri).
+ Premi *"Aggiorna password evento"*.

#nota(title: "Casi d'uso tipici")[
  Utile quando la password del manager di un evento è stata smarrita, condivisa impropriamente,
  oppure va ruotata a fine evento per motivi di sicurezza. Ricorda di comunicare la nuova
  password al manager dell'evento tramite un canale sicuro.
]

#attenzione(title: "Nota")[
  Questa operazione riguarda esclusivamente l'evento selezionato: non esiste un'operazione
  massiva per ruotare le password manager di più eventi contemporaneamente.
]

= Raggiungere l'area Manager di un evento
#chapter-subtitle[
  Come accedere alle operazioni quotidiane di un evento (candidati, codici giuria,
  avvio/chiusura voto).
]

L'area `/manager` gestisce le operazioni specifiche di un singolo evento: candidati, codici
giuria, avvio/chiusura della votazione e monitoraggio in tempo reale. Non è raggiungibile
dall'area Admin per la modifica dei dati anagrafici o dei pesi (quelli restano qui in
`/admin`), ma è il punto di ingresso per la gestione operativa del giorno dell'evento.

+ Seleziona l'evento desiderato (dal selettore in toolbar oppure dalla scheda evento in
  Dashboard/Eventi).
+ Premi il pulsante *"Gestisci"* / *"Gestisci evento"*.
+ Si apre una nuova scheda del browser all'indirizzo `/manager?eventCode=<codice>`.

#nota(title: "Nessuna password aggiuntiva richiesta")[
  Essendo autenticato come root, l'accesso a `/manager` per qualsiasi evento avviene *senza*
  dover inserire la password manager di quell'evento: la sessione root viene riconosciuta
  automaticamente e ha diritti equivalenti (o superiori) a quelli del manager dell'evento.
]

#attenzione(title: "Eccezione: Classifica")[
  Questo bypass automatico *non* vale per la pagina `/score` (Classifica): lì, anche con
  sessione root attiva, è comunque richiesta la password manager specifica dell'evento. Usa il
  pulsante *"Apri Classifica"* in toolbar per raggiungerla rapidamente e tieni a portata di
  mano la password manager dell'evento.
]

= Altre operazioni cross-evento
#chapter-subtitle[Scorciatoie disponibili nella toolbar dell'area Admin.]

#table(
  columns: (auto, 1fr),
  table.header([Pulsante], [Azione]),
  [Aggiorna eventi], [Ricarica l'elenco eventi dal server.],
  [Apri pagina voto pubblico],
  [Apre in una nuova scheda la pagina pubblica di voto (`/?eventCode=...`) per l'evento
  selezionato.],
  [Apri Classifica],
  [Apre `/score?eventCode=...` per l'evento selezionato. Se il televoto dell'evento è ancora
  aperto, il sistema mostra un avviso ("La Classifica è accessibile solo a televoto chiuso") e
  blocca l'apertura finché la votazione non viene chiusa da `/manager`.],
  [Esci (logout)],
  [Termina sia la sessione root sia un'eventuale sessione manager attiva nello stesso browser,
  riportando alla schermata di login.],
)

#nota(title: "Vista compatta su mobile")[
  Su viewport stretti (smartphone/tablet in verticale), la toolbar mostra un badge compatto con
  il solo codice evento al posto del selettore completo; il menu laterale si apre tramite
  l'icona hamburger e si richiude automaticamente dopo la selezione di una sezione.
]

= Domande frequenti e risoluzione problemi
#chapter-subtitle[Situazioni comuni e come gestirle.]

== "Sessione root non disponibile" durante il caricamento eventi

Il token root non è presente o è scaduto (durata 12 ore). Esegui nuovamente il login da
`/admin`.

== Non riesco a creare l'evento: "Il codice evento deve contenere da 1 a 5 cifre"

Il campo "Codice evento" accetta solo cifre numeriche, da 1 a 5 caratteri. Lascialo vuoto per
farlo generare automaticamente.

== Il campo "Peso Popolare" appare bloccato/disabilitato

È un comportamento previsto: il peso Popolare non si edita mai direttamente, è sempre il
complemento a 100 del Peso Qualificata.

== Non trovo dove gestire i candidati o i codici giuria da /admin

Non è previsto: quelle operazioni appartengono esclusivamente all'area `/manager` del singolo
evento (vedi Capitolo 9). L'area Admin resta volutamente limitata alla gestione cross-evento.

== Un evento è sparito dal selettore "Evento selezionato" e dalla Dashboard

Probabilmente è stato archiviato: gli eventi archiviati sono esclusi dal selettore in toolbar e
dalle liste attive. Trovi l'evento nella sezione *Archiviati* del menu laterale, da cui puoi
disarchiviarlo o clonarlo (vedi Capitolo 4).

== Ho cambiato la password manager di un evento ma il manager non riesce ad accedere

Verifica di aver comunicato correttamente la nuova password (minimo 8 caratteri) e che il
manager stia usando il codice evento corretto nell'URL `/manager?eventCode=...`.

#colophon[Televoto · Manuale Amministratore Root · Documento interno]
