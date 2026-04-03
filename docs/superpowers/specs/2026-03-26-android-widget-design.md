# Widget Android — Lista Voli Turno

## Panoramica

Widget Android 4x4 che mostra la lista compatta dei voli durante il turno corrente con orari check-in e gate. Si aggiorna automaticamente ogni 30 minuti.

## Libreria

`react-native-android-widget` — permette di definire il layout widget in JSX/TypeScript, funziona con Expo via config plugin. Il widget viene renderizzato nativamente da Android.

## Layout

```
┌─────────────────────────────────────┐
│  ✈ Turno Lavoro  06:00 – 14:00     │
│─────────────────────────────────────│
│  W6 1234  BUD   CI 04:00–05:20  G 05:30–05:40  │
│  EJ 5678  CDG   CI 05:00–06:20  G 06:30–06:40  │
│  BA 902   LHR   CI 05:30–06:15  G 06:15–06:40  │
│  W6 4321  OTP   CI 06:00–07:20  G 07:30–07:40  │
│  ...                                             │
│─────────────────────────────────────│
│  Ultimo aggiornamento: 10:30        │
└─────────────────────────────────────┘
```

### Header
- Icona aereo + "Turno Lavoro" + orario turno (HH:MM – HH:MM)
- Sfondo leggermente più chiaro del body

### Righe voli
- Ogni riga: numero volo (bold), destinazione IATA, orari CI (arancione `#F59E0B`), orari Gate (blu `#3B82F6`)
- Ordinati per orario partenza
- Se più voli di quelli che entrano: il widget è scrollabile (Android supporta ListView nei widget)

### Footer
- "Ultimo aggiornamento: HH:MM" in testo piccolo grigio

### Tap
- Tap su qualsiasi punto del widget: apre l'app sulla HomeScreen

## Dati

### Fonte
- Stessa API FlightRadar24: `https://api.flightradar24.com/common/v1/airport.json?code=psa&plugin[]=schedule&page=1&limit=100`
- Calendario di sistema per il turno (stessa logica di HomeScreen)

### Filtro
- Solo partenze (`schedule.departures.data`)
- Filtro compagnie: `ALLOWED_AIRLINES` da `src/utils/airlineOps.ts`
- Filtro temporale: partenza compresa tra shiftStart e shiftEnd
- Ordinamento: per orario partenza crescente

### Tempi operativi
- Calcolati con `getAirlineOps()` da `src/utils/airlineOps.ts`
- CI Open = partenza - checkInOpen minuti
- CI Close = partenza - checkInClose minuti
- Gate Open = partenza - gateOpen minuti
- Gate Close = partenza - gateClose minuti

## Aggiornamento

- `updatePeriodMillis`: 1800000 (30 minuti, minimo Android)
- Nessun background service, nessun push — Android gestisce il ciclo di aggiornamento
- Al primo posizionamento del widget: fetch immediato

## Stati

- **Turno Lavoro con voli**: layout completo con lista voli
- **Turno Lavoro senza voli**: header turno + "Nessuna partenza nel turno" centrato
- **Giorno di Riposo**: icona palma + "Giorno di Riposo" centrato
- **Nessun turno**: "Nessun turno oggi" centrato
- **Errore fetch**: "Aggiornamento fallito" + mostra ultimo dato valido se disponibile

## Tema

- Sfondo scuro fisso (`#0F172A`) — funziona su qualsiasi home screen, risparmia batteria OLED
- Testo principale: bianco `#F1F5F9`
- Testo secondario: grigio `#94A3B8`
- CI orari: arancione `#F59E0B`
- Gate orari: blu `#3B82F6`
- Header sfondo: `#1E293B`
- Bordi arrotondati: 16dp

## Struttura file

- `src/widgets/ShiftWidget.tsx` — componente widget (JSX per react-native-android-widget)
- `src/widgets/shiftWidgetTask.ts` — task handler che fetcha dati e passa al widget
- Riusa `src/utils/airlineOps.ts` per costanti e funzioni condivise
- Config plugin in `app.json` per registrare il widget

## Dipendenze

- `react-native-android-widget` — rendering widget
- `expo-calendar` (già installato) — lettura turni
- Nessuna nuova dipendenza per il fetch (usa fetch nativo)
