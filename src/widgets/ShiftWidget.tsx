import React from 'react';
import { FlexWidget, TextWidget, ListWidget } from 'react-native-android-widget';
import type { WidgetData, WidgetFlight } from './widgetTaskHandler';
import { SHIFT_TITLE_REST, SHIFT_TITLE_WORK } from '../constants/shifts';

const BG = '#0F172A';
const HEADER_BG = '#1E293B';
const TEXT = '#F1F5F9';
const MUTED = '#94A3B8';
const ORANGE = '#F59E0B';
const BLUE = '#3B82F6';

const PILL_RADIUS = 10;
const ORANGE_BG = '#3D2800'; // dark amber for CI pill background
const BLUE_BG = '#0C1F3D';  // dark blue for Gate pill background

function FlightRow({ flight, index }: { flight: WidgetFlight; index: number }) {
  const pinned = flight.isPinned === true;
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        paddingVertical: 8,
        paddingHorizontal: 10,
        backgroundColor: pinned ? '#3D2800' : (index % 2 === 0 ? '#1E293B' : '#162032'),
        flexDirection: 'column',
        ...(pinned ? { borderLeftWidth: 3, borderLeftColor: ORANGE } : {}),
      }}
      clickAction="OPEN_APP"
    >
      {/* Top row: airline pill + destination pill + departure time */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Flight number pill with airline color */}
          <FlexWidget
            style={{
              backgroundColor: flight.airlineColor,
              borderRadius: PILL_RADIUS,
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
              backgroundColor: '#334155',
              borderRadius: PILL_RADIUS,
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
          style={{ fontSize: 15, fontWeight: 'bold', color: TEXT }}
        />
      </FlexWidget>

      {/* Bottom row: CI pill + Gate pill */}
      <FlexWidget
        style={{ width: 'match_parent', flexDirection: 'row', marginTop: 5 }}
      >
        {/* CI pill */}
        <FlexWidget
          style={{
            backgroundColor: ORANGE_BG,
            borderRadius: PILL_RADIUS,
            paddingHorizontal: 8,
            paddingVertical: 3,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="CI"
            style={{ fontSize: 12, fontWeight: 'bold', color: ORANGE }}
          />
          <TextWidget
            text={` ${flight.ciOpen}-${flight.ciClose}`}
            style={{ fontSize: 12, color: ORANGE }}
          />
        </FlexWidget>
        {/* Gate pill */}
        <FlexWidget
          style={{
            backgroundColor: BLUE_BG,
            borderRadius: PILL_RADIUS,
            paddingHorizontal: 8,
            paddingVertical: 3,
            marginLeft: 6,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text="Gate"
            style={{ fontSize: 12, fontWeight: 'bold', color: BLUE }}
          />
          <TextWidget
            text={` ${flight.gateOpen}-${flight.gateClose}`}
            style={{ fontSize: 12, color: BLUE }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

export function ShiftWidget({ data }: { data: WidgetData }) {
  // ── Rest day ──
  if (data.state === 'rest') {
    return (
      <FlexWidget
        style={{
          height: 'match_parent', width: 'match_parent',
          backgroundColor: BG, borderRadius: 20,
          justifyContent: 'center', alignItems: 'center', flexDirection: 'column',
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget text="🌴" style={{ fontSize: 40 }} />
        <TextWidget
          text={`Giorno di ${SHIFT_TITLE_REST}`}
          style={{ fontSize: 18, fontWeight: 'bold', color: TEXT, marginTop: 8 }}
        />
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
          justifyContent: 'center', alignItems: 'center', flexDirection: 'column',
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="Nessun turno oggi"
          style={{ fontSize: 16, color: MUTED }}
        />
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
          justifyContent: 'center', alignItems: 'center', flexDirection: 'column',
        }}
        clickAction="REFRESH"
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
        <FlexWidget
          style={{
            width: 'match_parent', backgroundColor: HEADER_BG,
            paddingVertical: 10, paddingHorizontal: 14,
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
          }}
        >
          <TextWidget
            text={`✈  Turno ${SHIFT_TITLE_WORK}  ${data.shiftLabel}`}
            style={{ fontSize: 14, fontWeight: 'bold', color: TEXT }}
          />
        </FlexWidget>
        <FlexWidget
          style={{ flex: 1, width: 'match_parent', justifyContent: 'center', alignItems: 'center' }}
        >
          <TextWidget text="Nessuna partenza" style={{ fontSize: 14, color: MUTED }} />
        </FlexWidget>
        <FlexWidget
          style={{
            width: 'match_parent', backgroundColor: HEADER_BG,
            paddingVertical: 6, paddingHorizontal: 14,
            borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
          }}
        >
          <TextWidget
            text={`Ultimo aggiornamento: ${data.updatedAt}`}
            style={{ fontSize: 10, color: MUTED }}
          />
        </FlexWidget>
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
      {/* Header */}
      <FlexWidget
        style={{
          width: 'match_parent', backgroundColor: HEADER_BG,
          paddingVertical: 10, paddingHorizontal: 14,
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text={`✈  Turno ${SHIFT_TITLE_WORK}  ${data.shiftLabel}`}
          style={{ fontSize: 14, fontWeight: 'bold', color: TEXT }}
        />
      </FlexWidget>

      {/* Scrollable flight list */}
      <ListWidget style={{ height: 'match_parent', width: 'match_parent' }}>
        {data.flights.map((flight, i) => (
          <FlightRow key={`${flight.flightNumber}-${i}`} flight={flight} index={i} />
        ))}
      </ListWidget>

      {/* Footer */}
      <FlexWidget
        style={{
          width: 'match_parent', backgroundColor: HEADER_BG,
          paddingVertical: 6, paddingHorizontal: 14,
          borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text={`Ultimo aggiornamento: ${data.updatedAt}`}
          style={{ fontSize: 10, color: MUTED }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
