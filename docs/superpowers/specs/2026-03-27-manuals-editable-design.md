# Manuali DCS — Editing dall'app

**Data:** 2026-03-27
**Scope:** Aggiungere CRUD completo (compagnie, sezioni, voci) con persistenza locale in ManualsScreen.

---

## Obiettivo

Permettere all'utente di modificare i contenuti dei manuali DCS direttamente dall'app, senza accesso protetto, con persistenza tra sessioni.

---

## Dati

- I dati attuali (hardcoded in `AIRLINES`) diventano il **dataset di default**.
- Al mount, si legge da `AsyncStorage` (chiave `manuals_data`). Se assente → si usa il default e lo si persiste.
- Ogni modifica aggiorna lo state React e chiama `AsyncStorage.setItem` immediatamente.
- Struttura dati invariata: `Airline[] → Section[] → ManualItem[]`.

---

## UI

### Edit mode

- Header "Manuali DCS" aggiunge un'icona ✏️ a destra.
- Toccandola → entra in edit mode (colore accent sull'icona come indicatore).
- Toccandola di nuovo → esce da edit mode.
- In edit mode i controlli di modifica appaiono; fuori da edit mode la schermata è identica all'attuale.

### Compagnie (chip bar)

- In edit mode: chip `+` alla fine per aggiungere una nuova compagnia.
- Pressione lunga su chip esistente → apre modal modifica/elimina compagnia.

### Sezioni

- In edit mode: ogni header sezione mostra un'icona ✏️ a destra → apre modal modifica/elimina sezione.
- In fondo alla lista sezioni (dentro il content): pulsante `+ Sezione` per aggiungere.

### Voci (ManualItem)

- In edit mode: ogni riga item mostra un'icona ✏️ a destra → apre modal modifica/elimina voce.
- In fondo a ogni sezione aperta: pulsante `+ Voce` per aggiungere.

---

## Modal

Tutti i modal sono `Modal` React Native con `animationType="slide"` e uno sfondo semi-trasparente.

### Modal Compagnia
Campi:
- Nome (TextInput)
- Codice IATA (TextInput, max 2–3 char, uppercase)
- Colore (selezione da palette di ~10 colori predefiniti)

Pulsanti: **Annulla** | **Salva**
In modalità modifica: aggiunta pulsante **Elimina** (con confirm dialog "Eliminare questa compagnia e tutti i suoi contenuti?").

### Modal Sezione
Campi:
- Titolo (TextInput)

Pulsanti: **Annulla** | **Salva** | **Elimina** (con confirm).

### Modal Voce
Campi:
- Titolo (TextInput)
- Corpo (TextInput multilinea, min 4 righe)

Pulsanti: **Annulla** | **Salva** | **Elimina** (con confirm).

---

## File coinvolti

- `src/screens/ManualsScreen.tsx` — unico file da modificare
- Nessun nuovo file necessario (AsyncStorage già disponibile via `@react-native-async-storage/async-storage`)

---

## Fuori scope

- Sync cloud / backup
- Import/export
- Protezione con password
- Ordinamento manuale delle voci (drag & drop)
