const simulateAsyncIO = async () => new Promise(resolve => setTimeout(resolve, 10));

async function sequential(items) {
  const start = Date.now();
  const results = [];
  for (const item of items) {
    const res = await simulateAsyncIO();
    results.push(res);
  }
  return Date.now() - start;
}

async function parallel(items) {
  const start = Date.now();
  const promises = items.map(async (item) => {
    return await simulateAsyncIO();
  });
  const results = await Promise.all(promises);
  return Date.now() - start;
}

async function run() {
  const items = Array.from({ length: 50 });
  const seqTime = await sequential(items);
  const parTime = await parallel(items);
  console.log(`Baseline (Sequential): ${seqTime}ms`);
  console.log(`Optimized (Parallel): ${parTime}ms`);
  console.log(`Improvement: ${((seqTime - parTime) / seqTime * 100).toFixed(2)}%`);
}

run();
