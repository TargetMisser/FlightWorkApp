import { buildFr24ScheduleUrl } from '../airportSettings';
import type { FlightScheduleProvider } from './types';

export const fr24Provider: FlightScheduleProvider = {
  id: 'fr24',
  label: 'FlightRadar24',
  supports: () => true,
  fetch: async ({ airportCode, signal }) => {
    const res = await fetch(buildFr24ScheduleUrl(airportCode), {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json,text/plain,*/*',
      },
      signal,
    });
    const body = await res.text();

    if (!res.ok) {
      throw new Error(`FR24_HTTP_${res.status}`);
    }
    if (/^\s*</.test(body) || /cloudflare|just a moment|enable javascript/i.test(body)) {
      throw new Error('FR24_BLOCKED_OR_HTML_RESPONSE');
    }

    let json: any;
    try {
      json = JSON.parse(body);
    } catch {
      throw new Error('FR24_INVALID_JSON_RESPONSE');
    }

    return {
      allArrivals: json.result?.response?.airport?.pluginData?.schedule?.arrivals?.data || [],
      allDepartures: json.result?.response?.airport?.pluginData?.schedule?.departures?.data || [],
    };
  },
};
