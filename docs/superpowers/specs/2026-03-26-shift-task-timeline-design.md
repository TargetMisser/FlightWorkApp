# Shift Task Timeline — Bottom Sheet con Timeline Voli

## Panoramica

Aggiunta di un bottom sheet attivato dal pulsante "Dettagli Task" nella card turno di HomeScreen. Mostra una timeline verticale di tutte le partenze durante il turno, con barre colorate per le finestre operative di check-in e gate.

## Trigger

Tap su "Dettagli Task" nella card "Turno Attuale" di HomeScreen (visibile solo quando il turno è di tipo Lavoro).

## Contenitore

- Modal bottom sheet, 80% altezza schermo
- Handle di chiusura in alto (barra grigia)
- Titolo: "Voli nel Turno · HH:MM – HH:MM" (orari del turno)
- ScrollView verticale per la timeline

## Dati

- **Fonte**: stessa API FlightRadar24 usata in FlightScreen (`https://api.flightradar24.com/common/v1/airport.json?code=psa&plugin[]=schedule&page=1&limit=100`)
- **Filtro tipo**: solo partenze (`plugin-result.schedule.departures.data`)
- **Filtro compagnie**: stesse airline di FlightScreen (wizz, easyjet, british airways, sas, aer lingus, flydubai)
- **Filtro temporale**: `flight.time.scheduled.departure` compreso tra `shiftEvent.startDate` e `shiftEvent.endDate` (Unix timestamps in secondi)
- **Tempi operativi**: calcolati con la stessa mappa `AIRLINE_OPS` di FlightScreen (checkInOpen, checkInClose, gateOpen, gateClose in minuti prima della partenza)

## Timeline

- **Asse verticale** = tempo, da startDate a endDate del turno
- **Indicatori orari**: tacche ogni 30 minuti sul lato sinistro con label "HH:MM"
- **Linea "adesso"**: linea rossa tratteggiata orizzontale, visibile solo se il turno è in corso (`Date.now()` tra start e end)
- **Ogni volo** è una riga orizzontale posizionata verticalmente in base all'orario di partenza:
  - **Barra arancione** (`#F59E0B`): finestra check-in (da checkInOpen a checkInClose prima della partenza)
  - **Barra blu** (`#3B82F6`): finestra gate (da gateOpen a gateClose prima della partenza)
  - **Label** a sinistra: numero volo + destinazione IATA (es. "W6 1234 · BUD")
- Le barre sono posizionate orizzontalmente nella riga, proporzionali alla durata relativa delle finestre

## Interazione

- **Tap su un volo**: espande una card sotto la riga con:
  - Compagnia aerea (nome completo)
  - Orario partenza schedulato (HH:MM)
  - CI Open / CI Close (orari esatti)
  - Gate Open / Gate Close (orari esatti)
  - Stato volo (Scheduled, Delayed, ecc. con colore)
- **Tap di nuovo**: chiude la card espansa
- **Solo un volo espanso alla volta**

## Stati

- **Loading**: `ActivityIndicator` centrato nel bottom sheet
- **Nessun volo**: testo "Nessuna partenza nel turno" centrato con emoji aereo
- **Errore fetch**: messaggio "Errore nel caricamento" con pulsante "Riprova"

## Struttura file

- Nuovo componente: `src/components/ShiftTimeline.tsx`
  - Riceve: `shiftStart: Date`, `shiftEnd: Date`, `visible: boolean`, `onClose: () => void`
  - Gestisce internamente: fetch voli, stato loading/error, espansione card
- HomeScreen: aggiunge `onPress` al pulsante "Dettagli Task" che apre il modal passando i dati del turno

## Stile

- Segue il tema corrente (`useAppTheme()` per colori)
- In weather/dark mode: sfondo `colors.bg`, niente elevation, bordi sottili come le altre card
- Barre con bordi arrotondati (borderRadius: 4)
- Legenda in alto sotto il titolo: pallino arancione "Check-in", pallino blu "Gate"
