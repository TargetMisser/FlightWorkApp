const { performance } = require('perf_hooks');

const shiftArrivals = Array.from({ length: 20 }, (_, i) => ({
  flight: {
    time: { scheduled: { arrival: 1700000000 + i * 1000 } },
    identification: { number: { default: 'AZ' + i } },
  }
}));

const shiftDepartures = Array.from({ length: 20 }, (_, i) => ({
  flight: {
    time: { scheduled: { departure: 1700000000 + i * 1000 } },
    identification: { number: { default: 'AZ' + i } },
    airline: { name: 'Alitalia' }
  }
}));

const mockScheduleNotificationAsync = async () => {
  return new Promise(resolve => setTimeout(() => resolve('id-' + Math.random()), 10));
};

async function sequential() {
  const newIds = [];
  const now = 1600000000;

  for (const item of shiftArrivals) {
    try {
      const id = await mockScheduleNotificationAsync();
      newIds.push(id);
    } catch (err) {}
  }

  for (const item of shiftDepartures) {
    try {
      const id1 = await mockScheduleNotificationAsync();
      newIds.push(id1);
      const id2 = await mockScheduleNotificationAsync();
      newIds.push(id2);
    } catch (err) {}
  }
  return newIds;
}

async function parallel() {
  const now = 1600000000;
  const arrivalPromises = shiftArrivals.map(async (item) => {
    try {
      return await mockScheduleNotificationAsync();
    } catch (err) {}
  });

  const departurePromises = shiftDepartures.map(async (item) => {
    try {
      const promises = [];
      promises.push((async () => {
        try { return await mockScheduleNotificationAsync(); } catch (err) {}
      })());
      promises.push((async () => {
        try { return await mockScheduleNotificationAsync(); } catch (err) {}
      })());
      return await Promise.all(promises);
    } catch (err) {
      return [];
    }
  });

  const allResults = await Promise.all([
    ...arrivalPromises,
    ...departurePromises
  ]);

  return allResults.flat().filter(id => typeof id === 'string');
}

async function run() {
  const startSeq = performance.now();
  await sequential();
  const endSeq = performance.now();
  console.log(`Sequential: ${(endSeq - startSeq).toFixed(2)}ms`);

  const startPar = performance.now();
  await parallel();
  const endPar = performance.now();
  console.log(`Parallel: ${(endPar - startPar).toFixed(2)}ms`);
}

run();
