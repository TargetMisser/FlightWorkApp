# FlightWorkApp

App Expo / React Native pensata per organizzare il lavoro operativo in aeroporto, con focus su turni, voli, manuali rapidi e integrazione Android / Wear OS.

## Funzioni principali

- Calendario turni con inserimento manuale e import.
- Timeline voli e operativita di turno.
- Widget Android per i voli del turno.
- Companion Wear OS.
- Manuali e note operative modificabili.
- Rubrica, blocco note e gestione password.

## Stack

- Expo SDK 54
- React Native 0.81
- React 19
- TypeScript
- Android native module + modulo Wear OS

## Requisiti

- Node.js 20 consigliato
- npm
- Android Studio + Android SDK per build Android locali
- Java 17 o superiore

## Avvio rapido

```bash
git clone https://github.com/TargetMisser/FlightWorkApp.git
cd FlightWorkApp
npm ci
npm run start
```

Per Android:

```bash
npm run android
```

Per typecheck:

```bash
npm run typecheck
```

## Workflow Git

- `main`: stato piu stabile e pronto da condividere.
- `dev`: ramo di lavoro principale.

Flusso consigliato:

```bash
git checkout dev
git pull
git checkout -b feature/nome-modifica
```

Quando hai finito:

```bash
git add .
git commit -m "Descrizione modifica"
git push
```

## GitHub Actions

Il repository include una CI base che ad ogni push / pull request:

- installa le dipendenze
- esegue il typecheck TypeScript
- verifica che la config Expo si risolva correttamente

## Note utili

- Il repository e pensato per essere usato da piu computer.
- File locali, log, output temporanei e keystore non vengono pubblicati.
- Il modulo Android / Wear OS e incluso nel repository.
