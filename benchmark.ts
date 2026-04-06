import { getAirlineOps } from './src/utils/airlineOps';

const mockAirlines = ['easyJet', 'Wizz Air', 'British Airways', 'Unknown', 'easyJet', 'Wizz Air', 'Aer Lingus', 'Scandinavian Airlines', 'Unknown', 'Wizz Air'];
const iterations = 100000;

function benchWithoutCache() {
  const start = performance.now();
  let count = 0;
  for (let i = 0; i < iterations; i++) {
    for (const airline of mockAirlines) {
      const ops = getAirlineOps(airline);
      if (ops) count++;
    }
  }
  const end = performance.now();
  console.log(`Without cache: ${end - start} ms (count ${count})`);
}

function benchWithCache() {
  const start = performance.now();
  let count = 0;
  const cache = new Map();
  for (let i = 0; i < iterations; i++) {
    for (const airline of mockAirlines) {
      let ops = cache.get(airline);
      if (!ops) {
        ops = getAirlineOps(airline);
        cache.set(airline, ops);
      }
      if (ops) count++;
    }
  }
  const end = performance.now();
  console.log(`With cache: ${end - start} ms (count ${count})`);
}

benchWithoutCache();
benchWithCache();
