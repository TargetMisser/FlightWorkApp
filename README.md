# FlightWorkApp

FlightWorkApp e un'app Expo / React Native pensata per chi lavora in ambito aeroportuale e vuole avere in un solo posto turni, operativita voli, manuali rapidi e supporto da telefono + Wear OS.

Serve soprattutto per:

- consultare il turno del giorno
- vedere la timeline operativa dei voli
- avere widget Android rapidi
- usare un companion Wear OS per informazioni essenziali
- salvare note, password, contatti e manuali operativi

## Sviluppo con IA

Una parte fondamentale del progetto e che e stato costruito con supporto IA lungo tutto il processo di sviluppo.

Questo include:

- ideazione e progettazione delle funzioni
- sviluppo e refactoring del codice
- debug e correzione di problemi
- preparazione della documentazione
- organizzazione del workflow di repository e release

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

## Clonazione e avvio

Per lavorarci da un altro computer:

```bash
git clone https://github.com/TargetMisser/FlightWorkApp.git
cd FlightWorkApp
npm ci
npm run start
```

## Comandi utili

Avvio Metro:

```bash
npm run start
```

Avvio Android:

```bash
npm run android
```

Avvio Web:

```bash
npm run web
```

Typecheck:

```bash
npm run typecheck
```

## Build e release

Nel repository vengono pubblicati anche gli APK nelle GitHub Releases quando disponibili.

Asset previsti:

- `FlightWorkApp-v1.1.0-release.apk`: app Android principale
- `FlightWorkApp-Wear-v1.1.0.apk`: companion Wear OS

Per installare una release:

1. Vai nella sezione Releases del repository.
2. Scarica l'APK che ti serve.
3. Installa l'APK sul dispositivo Android.
4. Per Wear OS usa l'APK dedicato all'orologio.

## Struttura rami

- `main`: ramo piu stabile e condivisibile
- `dev`: ramo di sviluppo corrente

## Workflow Git

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

Nel repository sono presenti workflow per:

- CI base
- release snapshot su `main`

Nota: l'esecuzione dipende dalla disponibilita di GitHub Actions sull'account/repository.

## Note utili

- Il repository e pensato per essere usato da piu computer.
- File locali, log, output temporanei e keystore non vengono pubblicati.
- Il modulo Android / Wear OS e incluso nel repository.
