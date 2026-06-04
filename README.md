# ♟️ Chess to Lichess

Estensione Brave/Chrome che trasferisce all'istante le partite da **Chess.com** a **Lichess** avviando l'analisi del computer automatica con un solo click.

![Demo di funzionamento](demo.gif)

## Perché usare questa estensione?

L'analisi Stockfish illimitata su Chess.com fa parte dei piani a pagamento (fino a 100€/anno). Su Lichess l'analisi cloud è completamente gratuita, potente e illimitata. 
Questa estensione automatizza il fastidioso processo manuale di esportazione/importazione del PGN in **meno di 3 secondi**.

## Come Funziona

1. Finisci una partita su Chess.com.
2. Clicca l'**icona dell'estensione**, il **pulsante viola** che compare a lato della scacchiera, oppure usa la combinazione di tasti `Alt+Shift+L`.
3. L'estensione estrae il PGN, apre Lichess, compila il form, attiva l'opzione *"Chiedi un'analisi del computer"* e avvia l'importazione automaticamente.

---

## Supporta il Progetto ☕

Se questa estensione ti fa risparmiare tempo e denaro rispetto a un abbonamento Premium, offrimi un caffè su Ko-fi!

<a href="https://ko-fi.com/lorenzovasile" target="_blank">
  <img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="ko-fi" />
</a>

---

## Installazione per Sviluppatori

Se desideri caricarla manualmente senza passare dallo Store:

1. Scarica o clona questa repository.
2. Apri Brave/Chrome e vai su `chrome://extensions/` (o `brave://extensions/`).
3. Abilita la **Modalità sviluppatore** in alto a destra.
4. Clicca su **"Carica estensione non pacchettizzata"** (Load unpacked) e seleziona la cartella del progetto.

### Scorciatoia Personalizzabile
Puoi modificare la scorciatoia da tastiera predefinita (`Alt+Shift+L`) andando su `chrome://extensions/shortcuts`.

## Struttura del Progetto

```
├── manifest.json       Manifest V3 per estensioni Chrome
├── background.js       Service worker (gestione automazione Lichess)
├── content-chess.js    FAB (Pulsante Fluttuante) su Chess.com
├── popup.html/css/js   UI del popup
├── demo.gif            Animazione dimostrativa
└── icons/              Asset grafici dell'estensione
```

## Privacy

Questa estensione non raccoglie, memorizza o invia dati personali. Il PGN della partita viene letto localmente dal browser e inserito su Lichess.org. Nessun server di terze parti è coinvolto.

## Licenza

MIT
