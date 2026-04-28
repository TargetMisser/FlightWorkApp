import React from 'react';
import { FlexWidget, TextWidget, ListWidget } from 'react-native-android-widget';
import type { WidgetData, WidgetFlight } from './widgetTaskHandler';

// ── Brand colours ─────────────────────────────────────────────────────────────
const BG          = '#120700';   // deep warm dark
const HEADER_BG   = '#1E0E02';   // slightly lighter warm dark
const CARD_ODD    = '#1E0E02';
const CARD_EVEN   = '#160900';
const TEXT        = '#FFF5EE';   // warm white
const MUTED       = '#A07850';   // warm muted
const ORANGE      = '#F47B16';   // app primary
const ORANGE_DARK = '#3A1800';   // pill backgrounds
const BLUE        = '#60A5FA';   // gate accent (kept complementary)
const BLUE_BG     = '#0C1830';
const PILL_R      = 10;

function FlightRow({ flight, index }: { flight: WidgetFlight; index: number }) {
  const pinned = flight.isPinned === true;
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: pinned ? '#2A1000' : (index % 2 === 0 ? CARD_ODD : CARD_EVEN),
        flexDirection: 'column',
        ...(pinned ? { borderLeftWidth: 3, borderLeftColor: ORANGE } : {}),
      }}
      clickAction="OPEN_APP"
    >
      {/* Top row: flight pill + destination + time */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Flight number pill */}
          <FlexWidget
            style={{
              backgroundColor: flight.airlineColor,
              borderRadius: PILL_R,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <TextWidget
              text={flight.flightNumber}
              style={{ fontSize: 12, fontWeight: 'bold', color: '#FFFFFF' }}
            />
          </FlexWidget>
          {/* Destination IATA pill */}
          <FlexWidget
            style={{
              backgroundColor: '#2A1800',
              borderRadius: PILL_R,
              paddingHorizontal: 7,
              paddingVertical: 3,
              marginLeft: 6,
            }}
          >
            <TextWidget
              text={flight.destinationIata}
              style={{ fontSize: 12, fontWeight: 'bold', color: TEXT }}
            />
          </FlexWidget>
        </FlexWidget>
        {/* Departure time */}
        <TextWidget
          text={flight.departureTime}
          style={{ fontSize: 15, fontWeight: 'bold', color: pinned ? ORANGE : TEXT }}
        />
      </FlexWidget>

      {/* Bottom row 1: CI timing + Gate timing */}
      <FlexWidget
        style={{ width: 'match_parent', flexDirection: 'row', marginTop: 5 }}
      >
        <FlexWidget
          style={{ backgroundColor: ORANGE_DARK, borderRadius: PILL_R, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center' }}
        >
          <TextWidget text="CI" style={{ fontSize: 12, fontWeight: 'bold', color: ORANGE }} />
          <TextWidget text={` ${flight.ciOpen}-${flight.ciClose}`} style={{ fontSize: 12, color: ORANGE }} />
        </FlexWidget>
        <FlexWidget
          style={{ backgroundColor: BLUE_BG, borderRadius: PILL_R, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 6, flexDirection: 'row', alignItems: 'center' }}
        >
          <TextWidget text="Gate" style={{ fontSize: 12, fontWeight: 'bold', color: BLUE }} />
          <TextWidget text={` ${flight.gateOpen}-${flight.gateClose}`} style={{ fontSize: 12, color: BLUE }} />
        </FlexWidget>
      </FlexWidget>

      {/* Bottom row 2: stand / check-in desk / gate number from staffMonitor */}
      <FlexWidget
        style={{ width: 'match_parent', flexDirection: 'row', marginTop: 4 }}
      >
        <FlexWidget
          style={{ backgroundColor: '#1C0A00', borderRadius: PILL_R, paddingHorizontal: 7, paddingVertical: 2, flexDirection: 'row', alignItems: 'center' }}
        >
          <TextWidget text="Stand " style={{ fontSize: 10, fontWeight: 'bold', color: MUTED }} />
          <TextWidget text={flight.stand ?? '—'} style={{ fontSize: 10, color: TEXT }} />
        </FlexWidget>
        <FlexWidget
          style={{ backgroundColor: '#1C0A00', borderRadius: PILL_R, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 5, flexDirection: 'row', alignItems: 'center' }}
        >
          <TextWidget text="Banco " style={{ fontSize: 10, fontWeight: 'bold', color: MUTED }} />
          <TextWidget text={flight.checkin ?? '—'} style={{ fontSize: 10, color: TEXT }} />
        </FlexWidget>
        <FlexWidget
          style={{ backgroundColor: '#1C0A00', borderRadius: PILL_R, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 5, flexDirection: 'row', alignItems: 'center' }}
        >
          <TextWidget text="Uscita " style={{ fontSize: 10, fontWeight: 'bold', color: MUTED }} />
          <TextWidget text={flight.gate ?? '—'} style={{ fontSize: 10, color: TEXT }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

// ── Header strip with orange accent ──────────────────────────────────────────
function Header({ label }: { label?: string }) {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        flexDirection: 'column',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
      }}
      clickAction="OPEN_APP"
    >
      {/* Orange accent bar */}
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 3,
          backgroundColor: ORANGE,
        }}
      />
      <FlexWidget
        style={{
          width: 'match_parent',
          backgroundColor: HEADER_BG,
          paddingVertical: 10,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <FlexWidget
          style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ORANGE, marginRight: 8 }}
        />
        <TextWidget
          text={label ? `Turno  ${label}` : 'AeroStaff Pro'}
          style={{ fontSize: 14, fontWeight: 'bold', color: TEXT }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}

function Footer({ updatedAt }: { updatedAt: string }) {
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        backgroundColor: HEADER_BG,
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      clickAction="OPEN_APP"
    >
      <FlexWidget
        style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ORANGE, marginRight: 6 }}
      />
      <TextWidget
        text={`Aggiornato: ${updatedAt}`}
        style={{ fontSize: 10, color: MUTED }}
      />
    </FlexWidget>
  );
}

// ── Root widget ───────────────────────────────────────────────────────────────
export function ShiftWidget({ data }: { data: WidgetData }) {

  // ── Rest day ──
  if (data.state === 'rest') {
    return (
      <FlexWidget
        style={{
          height: 'match_parent', width: 'match_parent',
          backgroundColor: BG, borderRadius: 20,
          flexDirection: 'column', overflow: 'hidden',
        }}
        clickAction="OPEN_APP"
      >
        <FlexWidget style={{ width: 'match_parent', height: 3, backgroundColor: ORANGE }} />
        <FlexWidget
          style={{ flex: 1, width: 'match_parent', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}
        >
          <FlexWidget
            style={{
              backgroundColor: '#10341F',
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <FlexWidget
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#34D399', marginRight: 6 }}
            />
            <TextWidget
              text="RIPOSO"
              style={{ fontSize: 13, fontWeight: 'bold', color: '#34D399' }}
            />
          </FlexWidget>
          <FlexWidget style={{ width: 'match_parent', alignItems: 'center', marginTop: 8 }}>
            <TextWidget
              text="Giorno di Riposo"
              style={{ fontSize: 18, fontWeight: 'bold', color: TEXT, textAlign: 'center' }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ── No shift ──
  if (data.state === 'no_shift') {
    return (
      <FlexWidget
        style={{
          height: 'match_parent', width: 'match_parent',
          backgroundColor: BG, borderRadius: 20,
          flexDirection: 'column', overflow: 'hidden',
        }}
        clickAction="OPEN_APP"
      >
        <FlexWidget style={{ width: 'match_parent', height: 3, backgroundColor: ORANGE }} />
        <FlexWidget
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <TextWidget
            text="Nessun turno oggi"
            style={{ fontSize: 16, color: MUTED }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ── Error ──
  if (data.state === 'error') {
    return (
      <FlexWidget
        style={{
          height: 'match_parent', width: 'match_parent',
          backgroundColor: BG, borderRadius: 20,
          flexDirection: 'column', overflow: 'hidden',
        }}
        clickAction="REFRESH"
      >
        <FlexWidget style={{ width: 'match_parent', height: 3, backgroundColor: '#EF4444' }} />
        <FlexWidget
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}
        >
          <TextWidget
            text="Aggiornamento fallito"
            style={{ fontSize: 14, color: '#EF4444' }}
          />
          <TextWidget
            text="Tocca per riprovare"
            style={{ fontSize: 12, color: MUTED, marginTop: 4 }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ── Work shift, no flights ──
  if (data.state === 'work_empty') {
    return (
      <FlexWidget
        style={{
          height: 'match_parent', width: 'match_parent',
          backgroundColor: BG, borderRadius: 20,
          flexDirection: 'column', overflow: 'hidden',
        }}
        clickAction="OPEN_APP"
      >
        <Header label={data.shiftLabel} />
        <FlexWidget
          style={{ flex: 1, width: 'match_parent', justifyContent: 'center', alignItems: 'center' }}
        >
          <TextWidget text="Nessuna partenza" style={{ fontSize: 14, color: MUTED }} />
        </FlexWidget>
        <Footer updatedAt={data.updatedAt} />
      </FlexWidget>
    );
  }

  // ── Work shift with flights ──
  return (
    <FlexWidget
      style={{
        height: 'match_parent', width: 'match_parent',
        backgroundColor: BG, borderRadius: 20,
        flexDirection: 'column', overflow: 'hidden',
      }}
    >
      <Header label={data.shiftLabel} />
      <ListWidget style={{ height: 'match_parent', width: 'match_parent' }}>
        {data.flights.map((flight, i) => (
          <FlightRow key={`${flight.flightNumber}-${i}`} flight={flight} index={i} />
        ))}
      </ListWidget>
      <Footer updatedAt={data.updatedAt} />
    </FlexWidget>
  );
}
