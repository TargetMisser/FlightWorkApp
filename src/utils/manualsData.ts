export const STORAGE_KEY = 'manuals_data_v2';

export const AIRLINE_COLORS = [
  { color: '#FF6600', textColor: '#fff' },
  { color: '#C01380', textColor: '#fff' },
  { color: '#003580', textColor: '#fff' },
  { color: '#F7C800', textColor: '#1a1a1a' },
  { color: '#006DBF', textColor: '#fff' },
  { color: '#2E7D32', textColor: '#fff' },
  { color: '#B71C1C', textColor: '#fff' },
  { color: '#4A148C', textColor: '#fff' },
  { color: '#E65100', textColor: '#fff' },
  { color: '#37474F', textColor: '#fff' },
];

export type ManualItem = { title: string; body: string };
export type Section    = { title: string; items: ManualItem[] };
export type DCSCommand = { cmd: string; desc: string; category: string };
export type Airline    = { id: string; name: string; code: string; color: string; textColor: string; sections: Section[]; commands?: DCSCommand[] };

export type ModalState =
  | { kind: 'none' }
  | { kind: 'airline_add' }
  | { kind: 'airline_edit'; airlineId: string }
  | { kind: 'section_add'; airlineId: string }
  | { kind: 'section_edit'; airlineId: string; sectionIdx: number }
  | { kind: 'item_add'; airlineId: string; sectionIdx: number }
  | { kind: 'item_edit'; airlineId: string; sectionIdx: number; itemIdx: number };

export const DEFAULT_AIRLINES: Airline[] = [
  {
    id: 'easyjet', name: 'easyJet', code: 'EZY',
    color: '#FF6600', textColor: '#fff',
    commands: [
      { cmd: 'L', desc: 'Lista voli del giorno', category: 'Flight Ops' },
      { cmd: 'OF/[volo]', desc: 'Apri volo per check-in', category: 'Flight Ops' },
      { cmd: 'CF/[volo]', desc: 'Chiudi volo', category: 'Flight Ops' },
      { cmd: 'LOF', desc: 'Lista voli aperti', category: 'Flight Ops' },
      { cmd: 'GC/[gate]', desc: 'Cambia gate', category: 'Flight Ops' },
      { cmd: 'F[cognome]/[nome]', desc: 'Cerca passeggero per nome', category: 'Search' },
      { cmd: '.[booking ref]', desc: 'Cerca per codice prenotazione', category: 'Search' },
      { cmd: 'C[n]', desc: 'Check-in passeggero linea n', category: 'Check-in' },
      { cmd: 'C[n]-[m]', desc: 'Check-in gruppo (linee n-m)', category: 'Check-in' },
      { cmd: 'AB[n]', desc: 'Aggiungi bagaglio a passeggero', category: 'Baggage' },
      { cmd: '.DSP[n]', desc: 'Mostra/cambia seat plan', category: 'Seating' },
      { cmd: '.SS/[volo]/[s1]-[s2]', desc: 'Seat swap', category: 'Seating' },
      { cmd: '.SAG[volo]', desc: 'Lista Seat at Gate', category: 'Seating' },
      { cmd: 'DSP1', desc: 'Seat plan per SAG customer 1', category: 'Seating' },
      { cmd: '.COM[n]', desc: 'Visualizza commenti booking', category: 'Customer' },
      { cmd: 'COM[n]', desc: 'Aggiungi commento a booking', category: 'Customer' },
      { cmd: 'TM[n]', desc: 'Cambia titolo a Male', category: 'Customer' },
      { cmd: 'TF[n]', desc: 'Cambia titolo a Female', category: 'Customer' },
      { cmd: 'J[n]', desc: 'Cambia titolo a Child', category: 'Customer' },
      { cmd: 'EX', desc: 'Esci / logout', category: 'System' },
    ],
    sections: [
      {
        title: 'Check-in DCS',
        items: [
          {
            title: 'Apertura volo',
            body: 'Accedere al DCS (opzione 16). Digitare `L` per lista voli.\n\nPer aprire il volo: `OF/[numero volo]` e confermare con Y.\n\nImpostare boarding card e bag tag su A (auto).\nInserire gate, orario boarding e capacità.\n\nVerificare:\n• Numero volo e data corretti\n• Rotta e gate assegnati\n• Segmenti collegati (connessioni)\n• Restrizioni eventuali sul volo',
          },
          {
            title: 'Check-in passeggeri',
            body: 'Cercare passeggero: `F[cognome]/[nome]` oppure `.[booking ref]`.\n\nCheck-in: `C[n]` per singolo, `C[n]-[m]` per gruppo.\n\nRichiedere documento d\'identità valido.\n\nDocumenti accettati (UE):\n• Carta d\'identità\n• Passaporto\n\nVerificare: validità, nome uguale al biglietto, destinazione.\n\nAssegnare posto con `.DSP[n]`.',
          },
          {
            title: 'Bagaglio a mano',
            body: 'Misure max bagaglio cabina:\n• Standard: 56×45×25 cm (inclusa impugnatura e ruote)\n• Borsa aggiuntiva: 45×36×20 cm\n\nSe eccede → addebitare hold baggage fee.\nSe il volo è pieno → imbarchare gratis in stiva.',
          },
          {
            title: 'Overbooking',
            body: 'Procedura overbooking:\n1. Verificare numero di passeggeri in eccesso\n2. Cercare volontari (offrire voucher + volo alternativo)\n3. Se nessun volontario → denied boarding involontario\n\nAggiungere commento al booking con `COM[n]` selezionando il motivo appropriato.\n\nRegolamento EU 261/2004:\n• Voli ≤1.500 km → €250\n• Voli 1.500–3.500 km → €400\n• Voli >3.500 km → €600\n\nOltre a rimborso o volo alternativo.',
          },
        ],
      },
      {
        title: 'Gate e Imbarco',
        items: [
          {
            title: 'Apertura gate',
            body: 'Prima di aprire il gate:\n• Attivare gate nel sistema DCS\n• Per cambiare gate: `GC/[numero gate]`\n• Verificare lista SPEQ comunicata al capo cabina\n• Controllare info gate board\n• Comunicare ritardi se presenti\n\nPer lista SAG: `.SAG[numero volo]`',
          },
          {
            title: 'Sequenza boarding',
            body: 'Ordine imbarco easyJet:\n1. Passeggeri speciali (WCHR, WCHC, famiglie con bambini <5 anni)\n2. easyJet Plus + posti Upfront & Extra Legroom\n3. Tutti gli altri passeggeri\n\nVerificare sempre boarding pass + documento.\n\nPer seat swap operativo: `.SS/[volo]/[posto1]-[posto2]`',
          },
          {
            title: 'Chiusura volo',
            body: 'Procedura chiusura:\n1. Scansione ultimi passeggeri (T-15 min)\n2. Riconciliare no-show nel DCS\n3. Last-minute changes comunicati al capo volo\n4. Invio load sheet definitiva\n5. Chiusura volo: `CF/[numero volo]`\n6. Comunicare al gate supervisore\n\nPer verificare voli aperti: `LOF`',
          },
        ],
      },
      {
        title: 'Passeggeri Speciali',
        items: [
          {
            title: 'Codici WCHR / WCHC / WCHS',
            body: 'WCHR → può camminare, ha difficoltà sulle scale.\nWCHC → non può camminare, necessita assistenza totale.\nWCHS → non può fare scale (usa pontile o bus).\n\nSempre:\n• Pre-imbarcare\n• Notificare capo cabina e handling\n• Verificare posto (non uscita emergenza)',
          },
          {
            title: 'UM – Unaccompanied Minor',
            body: 'Minori non accompagnati (5–14 anni):\n• Servizio UM obbligatorio\n• Modulo UM compilato da genitore/tutore\n• Accettare solo con form completo\n• Notificare capo cabina\n• Contatti ritirante a destinazione\n• Non lasciare mai il minore da solo',
          },
          {
            title: 'MEDA – Passeggero Medico',
            body: 'Passeggero con condizione medica rilevante:\n• Richiede MEDA clearance pre-volo\n• MEDA form compilato dal medico curante\n• Eventuale accompagnatore medico (MEDA + 1)\n• Comunicare al Comandante\n• Equipaggiamento medico a bordo verificato',
          },
          {
            title: 'Documenti di viaggio',
            body: 'Verificare sempre:\n• Validità documento (min. 3 mesi oltre la data di rientro per alcuni paesi)\n• Visto se necessario (TIMATIC nel DCS)\n• Per viaggi extra-Schengen: passaporto obbligatorio\n• APIS: inserire dati documento nel sistema se richiesto dalla rotta',
          },
        ],
      },
      {
        title: 'Tariffe Aeroportuali',
        items: [
          {
            title: 'Bagaglio irregolare al gate',
            body: 'Bagaglio cabina fuori misura o non conforme al gate: €58.\n\nViene imbarcato in stiva.\n\nMisure consentite:\n• Standard: 45×36×20 cm\n• Grande (Plus/Up Front/Extra Legroom): 56×45×25 cm',
          },
          {
            title: 'Bagaglio da aggiungere',
            body: 'Bagaglio stiva da aggiungere in aeroporto: €65.\n\nBagaglio stiva 23kg prenotato online: da €11.99 (varia per rotta/periodo).',
          },
          {
            title: 'Sovrappeso bagaglio',
            body: 'Bagaglio che supera il peso acquistato:\n• €15 per ogni kg in eccesso\n• Peso massimo consentito: 32kg\n\nPesare sempre il bagaglio e addebitare la differenza.',
          },
        ],
      },
    ],
  },
  {
    id: 'wizzair', name: 'Wizz Air', code: 'W6',
    color: '#C01380', textColor: '#fff',
    sections: [
      {
        title: 'Check-in DCS',
        items: [
          {
            title: 'Apertura check-in',
            body: 'Accedere al sistema DCS Wizz Air con credenziali personali.\n\nSelezionare il volo → verificare rotta, data e orario → avviare check-in.\n\nCheck-in online disponibile da 30 giorni a 3 ore prima del volo.',
          },
          {
            title: 'Documenti accettati',
            body: 'Per TUTTI i voli:\n• Passaporto valido\n\nVoli intra-Schengen (paesi selezionati):\n• Carta d\'identità\n\nVerificare sempre validità e destinazione tramite TIMATIC.',
          },
          {
            title: 'WIZZ Priority',
            body: 'Passeggeri WIZZ Priority:\n• Corsia dedicata al check-in\n• Imbarco prioritario\n• Bagaglio cabina grande (40×30×20 cm + borsa)\n• Verificare tariffa Priority sulla prenotazione o Wizz+ membership\n\nSenza Priority: solo borsa piccola 40×30×20 cm.',
          },
        ],
      },
      {
        title: 'Bagaglio',
        items: [
          {
            title: 'Politica bagagli',
            body: 'Bagaglio incluso in tutti i biglietti:\n• 1 borsa piccola 40×30×20 cm (sotto sedile) – GRATIS\n\nA pagamento (prenotato online o al banco):\n• Bagaglio cabina grande 55×40×23 cm\n\nBagaglio stiva disponibile: 10 kg / 20 kg / 26 kg / 32 kg\nVerificare la prenotazione nel DCS.',
          },
          {
            title: 'Eccesso bagaglio al banco',
            body: 'Se il bagaglio non è prenotato o supera i limiti:\n1. Verificare nel DCS la prenotazione bagagli\n2. Addebitare la tariffa airport fee (superiore al prezzo online)\n3. Registrare il pagamento nel sistema\n4. Emettere ricevuta\n5. Attaccare tag bagaglio correttamente',
          },
        ],
      },
      {
        title: 'Gate e Imbarco',
        items: [
          {
            title: 'Sequenza boarding',
            body: 'Ordine imbarco Wizz Air:\n1. Passeggeri speciali + WCHR + famiglie con bambini piccoli\n2. WIZZ Priority\n3. Tutti gli altri\n\nVerificare boarding pass (app o cartaceo) + documento d\'identità ad ogni imbarco.',
          },
          {
            title: 'Chiusura volo',
            body: 'Procedura chiusura volo:\n1. Scansione ultimi passeggeri\n2. Riconciliare no-show nel sistema\n3. Bags reconcile (bagagli senza passeggero → scaricare)\n4. Trasmettere dati finali al vettore\n5. Chiudere gate nel DCS\n6. Notificare supervisore',
          },
        ],
      },
      {
        title: 'Tariffe Aeroportuali',
        items: [
          {
            title: 'Check-in aeroportuale',
            body: 'Check-in al banco aeroporto: €40 a passeggero.\n\nIl passeggero deve aver fatto check-in online (da 30 giorni a 3h prima). Se non l\'ha fatto, addebitare la tariffa.',
          },
          {
            title: 'Bagaglio irregolare al gate',
            body: 'Bagaglio cabina fuori misura o non conforme al gate: €58.\n\nViene imbarcato in stiva.\n\nMisure consentite senza Priority: 40×30×20 cm.\nCon WIZZ Priority: 55×40×23 cm inclusa.',
          },
          {
            title: 'Bagaglio da aggiungere',
            body: 'Bagaglio stiva da aggiungere in aeroporto: €65.\n\nBagaglio stiva disponibile online: 10kg / 20kg / 26kg / 32kg.\nVerificare sempre la prenotazione nel DCS.',
          },
          {
            title: 'Sovrappeso bagaglio',
            body: 'Bagaglio che supera il peso acquistato:\n• €15 per ogni kg in eccesso\n\nPesare sempre il bagaglio e addebitare la differenza.',
          },
        ],
      },
    ],
  },
  {
    id: 'ryanair', name: 'Ryanair', code: 'FR',
    color: '#003580', textColor: '#fff',
    sections: [
      {
        title: 'Check-in DCS',
        items: [
          {
            title: 'Check-in online obbligatorio',
            body: 'Ryanair richiede check-in online obbligatorio (2–30 giorni prima).\n\nAl banco: solo per casi speciali (SPEQ, documenti da verificare, bagagli).\n\nVerificare boarding pass su app Ryanair o PDF stampato.',
          },
          {
            title: 'Priority Boarding',
            body: 'Passeggeri con Priority:\n• Boarding prioritario\n• Bagaglio cabina grande 55×40×20 cm incluso\n• Verificare tariffa (Regular Plus, Family Plus) o Ryanair+ membership\n\nSenza Priority:\n• Solo borsa 40×20×25 cm (sotto sedile) – GRATIS\n• Bagaglio cabina non incluso',
          },
          {
            title: 'Gestione bagagli non-Priority',
            body: 'Se passeggero senza Priority porta bagaglio grande:\n• Al gate: imbarcare in stiva GRATIS (se volo non pieno)\n• Addebitare tariffa se supera i limiti\n\nAl banco check-in:\n• Addebitare bagaglio cabina se non incluso nel biglietto\n• Registrare nel DCS e emettere ricevuta',
          },
        ],
      },
      {
        title: 'Gate Operations',
        items: [
          {
            title: 'Scan boarding pass',
            body: 'Scansione boarding pass:\n• App Ryanair (QR code)\n• PDF stampato (con QR code leggibile)\n\nIn caso di errore lettura:\n1. Verificare volo e data\n2. Controllare documento d\'identità\n3. Verificare manualmente nel DCS\n4. Contattare supervisore se necessario',
          },
          {
            title: 'Eccesso bagaglio al gate',
            body: 'Al gate – bagaglio fuori misura:\n1. Misurare con il gauge\n2. Addebitare gate fee (tariffa più alta)\n3. Imbarcare in stiva\n4. Emettere ricevuta\n\nNote: il gate fee è significativamente più alto della tariffa online.',
          },
          {
            title: 'Chiusura e DEP',
            body: 'Chiusura volo Ryanair:\n• Chiudere scansione 15 min prima della partenza\n• Riconciliare no-show\n• Bags off per no-show (sicurezza)\n• Trasmettere DEP (Departure Message)\n• Comunicare via radio/telefono al supervisore operativo',
          },
        ],
      },
    ],
  },
  {
    id: 'vueling', name: 'Vueling', code: 'VY',
    color: '#F7C800', textColor: '#1a1a1a',
    sections: [
      {
        title: 'Check-in Amadeus Altéa',
        items: [
          {
            title: 'Apertura volo',
            body: 'DCS Vueling – Amadeus Altéa DCS:\n\nLogin → selezionare volo → verificare rotta e data → aprire check-in.\n\nVerificare eventuali restrizioni operative sul volo.',
          },
          {
            title: 'Tariffe e bagagli',
            body: 'Tariffa Basic:\n• 1 borsa 40×20×30 cm (gratis, sotto sedile)\n\nTariffa Optima / TimeFlex:\n• Bagaglio cabina 55×35×25 cm incluso\n• Possibile bagaglio stiva incluso\n\nVerificare sempre la tariffa nella prenotazione.',
          },
          {
            title: 'Documenti e TIMATIC',
            body: 'Consultare TIMATIC in Altéa per requisiti documenti.\n\nVoli intra-UE: carta d\'identità o passaporto.\nVoli extra-UE: passaporto + eventuale visto.\n\nVerificare validità documento rispetto alla data di rientro.',
          },
        ],
      },
      {
        title: 'Imbarco',
        items: [
          {
            title: 'Sequenza imbarco',
            body: 'Ordine imbarco Vueling:\n1. Passeggeri speciali\n2. Vueling Club Platinum / Gold\n3. Biglietti Excellence\n4. Tutti gli altri\n\nAnnuncio imbarco via interfono o display gate.',
          },
          {
            title: 'Chiusura e APIS',
            body: 'Chiusura volo:\n1. Scansione passeggeri completata\n2. Riconciliare no-show in Altéa\n3. Trasmissione APIS se rotta lo richiede\n4. Load sheet definitiva approvata\n5. Chiusura volo nel sistema',
          },
        ],
      },
    ],
  },
];
