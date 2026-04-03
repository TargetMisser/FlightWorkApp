# WearOS Companion App — Design Spec

## Overview

App WearOS companion per AeroStaff Pro. Mostra gli orari operativi del volo pinnato dal telefono, con complicazione per il quadrante. Nessuna navigazione o selezione voli sul watch — tutto controllato dal telefono.

Target: Samsung Galaxy Watch (Wear OS 4/5).

## Schermata principale

### Header
- Barra colorata con il colore della compagnia aerea
- Contenuto: numero volo + codice IATA destinazione/origine
- Formato partenze: `U2 8316 → LGW`
- Formato arrivi: `W6 3218 ← BUD`

### Timeline verticale (Partenze)
Lista eventi operativi in sequenza con linea verticale di collegamento:
1. **CI Open** — orario apertura check-in
2. **CI Close** — orario chiusura check-in
3. **Gate** — orario apertura gate (da inbound se disponibile)
4. **Gate Close** — orario chiusura gate
5. **DEP** — orario partenza

### Timeline verticale (Arrivi)
1. **Partito** — orario reale decollo dall'origine
2. **In volo** — tempo restante stimato
3. **Atterraggio** — orario stimato/schedulato

### Stati eventi
- **Passato**: pallino verde, testo grigio barrato
- **Corrente/Prossimo**: pallino blu (partenze) o ambra (arrivi) con glow, sfondo evidenziato, testo bold 14px
- **Futuro**: pallino grigio, testo grigio chiaro

### Countdown
- Fisso in basso al centro dello schermo
- Testo ambra bold 13px: "Gate tra X min", "+7 min ritardo", ecc.

### Stato vuoto
- Quando nessun volo è pinnato: icona aereo + "Nessun volo" + "Pinna un volo dall'app"

## Complicazione quadrante

- Tipo: `SHORT_TEXT` con icona
- Contenuto: countdown al prossimo evento (es. "Gate 4m")
- Se nessun volo pinnato: "—"
- Tap → apre l'app watch

## Sincronizzazione phone → watch

### Tecnologia
Wearable Data Layer API (DataClient) per sync real-time.

### Flusso dati
1. Telefono: al pin/unpin/refresh, scrive JSON nel DataClient al path `/pinned_flight`
2. Watch: DataClient.OnDataChangedListener riceve l'update e aggiorna UI
3. Al unpin: telefono scrive payload vuoto, watch mostra stato vuoto

### Payload JSON
```json
{
  "flightNumber": "U2 8316",
  "airline": "easyJet",
  "airlineColor": "#FF6600",
  "iataCode": "U2",
  "tab": "departures",
  "destination": "LGW",
  "origin": "BUD",
  "scheduledTime": 1774732500,
  "estimatedTime": 1774732500,
  "realDeparture": null,
  "realArrival": null,
  "ops": {
    "checkInOpen": 120,
    "checkInClose": 40,
    "gateOpen": 30,
    "gateClose": 20
  },
  "inboundArrival": 1774730000,
  "pinnedAt": 1774720000
}
```

### Notifiche
Le notifiche del volo pinnato dal telefono arrivano al watch tramite bridge Android nativo — nessuna implementazione aggiuntiva necessaria.

## Architettura

### Moduli
- `wear/` — modulo WearOS (Jetpack Compose, Kotlin)
  - `WatchFaceComplication` — complicazione quadrante
  - `MainActivity` — schermata principale con timeline
  - `DataListenerService` — riceve dati dal telefono
- `app/` (telefono) — aggiunta DataClient send al pin/unpin/refresh

### Dipendenze
- `com.google.android.gms:play-services-wearable` (phone + watch)
- Jetpack Compose for Wear OS (`androidx.wear.compose`)
- Horologist (utility Wear OS)

## Leggibilità
- Font size minimo: 12px per eventi passati/futuri, 14px per evento corrente
- Label abbreviate: CI, DEP, Gate
- Spaziatura generosa tra righe (12px gap)
- Colori ad alto contrasto su sfondo scuro (#0F172A)
