# ♟️ Chess to Lichess

Estensione Brave/Chrome che trasferisce le partite da **Chess.com** a **Lichess** con analisi del computer automatica.

## Come Funziona

1. Finisci una partita su Chess.com
2. Clicca l'**icona dell'estensione**, il **pulsante viola** sulla pagina, o premi `Alt+Shift+L`
3. L'estensione estrae il PGN, lo invia a Lichess, e apre direttamente la pagina di analisi con l'analisi del computer già avviata

> Tutto avviene in background — vedi solo il risultato finale su Lichess.

## Installazione

1. Clona o scarica questa repo
2. Apri `brave://extensions/` (o `chrome://extensions/`)
3. Attiva **Modalità sviluppatore**
4. Clicca **"Carica estensione non pacchettizzata"** → seleziona la cartella

### Shortcut personalizzabile

`brave://extensions/shortcuts` → cerca "Chess to Lichess"

## Struttura

```
├── manifest.json       Manifest V3
├── background.js       Service worker (pipeline completa)
├── content-chess.js    FAB button su Chess.com
├── popup.html/css/js   UI popup
└── icons/              Icone estensione
```

## Permessi

| Permesso | Motivo |
|----------|--------|
| `activeTab` | Accesso alla scheda corrente |
| `storage` | Storage temporaneo |
| `scripting` | Iniezione script per estrazione PGN |
| `chess.com` | Lettura dati partita |
| `lichess.org` | Compilazione form import + analisi |

## Privacy

Nessun dato inviato a server terzi. Il PGN passa solo tra Chess.com → Lichess nel tuo browser.

## Licenza

MIT
