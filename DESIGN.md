# Design System: Pisa Flight Schedule

Questa documentazione riassume le specifiche di design estratte dal workspace Stitch (`projects/494829064577014119`), studiate per garantire la coerenza visiva dell'applicazione.

## 🎨 Palette Colori

| Elemento | Valore | Descrizione |
| :--- | :--- | :--- |
| **Color Mode** | `DARK` | Interfaccia scura di base per ridurre l’affaticamento visivo. |
| **Colore Primario** | `#136DEC` | Blu elettrico per pulsanti, evidenziati e call-to-action. |
| **Saturazione** | `2` | Livello di saturazione medio-alto per mantenere colori vibranti. |

---

## 🅰️ Tipografia

- **Font Family:** `Inter` (Sans-Serif)
  - *Utilizzo:* Elevata leggibilità su schermi mobile, adatta per numeri di volo e schemi dati compatti.
  - *Fallback:* `System`, `San Francisco` (iOS), `Roboto` (Android).

---

## 📐 Struttura e Bordi

- **Roundness (Raggi di Arrotondamento):** `ROUND_EIGHT` (~8px)
  - applicato a:
    - Card dei Voli / Schede Shift
    - Pulsanti e Barre di Navigazione
    - Modali e Pop-up

---

## 💡 Integrazione nel Canale Mobile (React Native)

Per applicare questi valori nel foglio di stile locale:

```typescript
export const StitchTheme = {
  dark: true,
  colors: {
    primary: '#136DEC',
    background: '#121212', // Standard dark background
    card: '#1E1E1E',       // Card background fallback
    text: '#FFFFFF',
    border: '#136DEC44',   // Tinted Borders
  },
  roundness: 8,
  fontFamily: 'Inter',
};
```
