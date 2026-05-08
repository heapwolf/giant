import { performance, PerformanceObserver } from 'node:perf_hooks';
import { html, component } from '../../giant.js'; // Adjust path
import os from 'node:os';
import v8 from 'node:v8';

// CONFIGURATION
const SIZES = [50, 100, 200, 500, 1000, 2000, 5000, 10_000];
const WARMUP_ITERATIONS = 5;
const MEASURE_ITERATIONS = 25;
const GC_SETTLE_TIME = 100;
const OUTLIER_THRESHOLD = 3;

// MOCK COMPONENTS FOR SSR
const TodoItem = component.TodoItem(({ id, title, completed }) => {
  return html.li({ class: ['todo-item', completed && 'completed'], 'data-id': id },
    html.span({ class: 'title' }, title),
    html.button({ onclick: 'console.log', class: 'delete-btn' }, 'X')
  );
});

const TodoApp = component.TodoApp(({ todos = [] }) => {
  return html.div({ id: 'app', 'data-count': todos.length },
    html.header(html.h1('Giant.js SSR Perf')),
    html.ul({ class: 'todo-list' },
      todos.map(t => TodoItem(t))
    ),
    html.footer(html.span(`Total: ${todos.length}`))
  );
});

// UTILITIES
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const forceGC = async () => {
  if (global.gc) {
    global.gc();
    await sleep(GC_SETTLE_TIME);
  }
};

const makeTodos = count =>
  Array.from({ length: count }, (_, i) => ({
    id: i, title: `Item ${i}`, completed: i % 2 === 0
  }));

// STATISTICAL ANALYSIS
const getMedian = (arr) => {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const getMAD = (arr) => {
  const median = getMedian(arr);
  const deviations = arr.map(x => Math.abs(x - median));
  return getMedian(deviations);
};

const removeOutliers = (arr, threshold = OUTLIER_THRESHOLD) => {
  const median = getMedian(arr);
  const mad = getMAD(arr);
  if (mad === 0) return arr;
  return arr.filter(x => Math.abs(x - median) / mad < threshold);
};

const getStats = (arr) => {
  const cleaned = removeOutliers(arr);
  const median = getMedian(cleaned);
  const mad = getMAD(cleaned);
  const min = Math.min(...cleaned);
  const max = Math.max(...cleaned);
  const mean = cleaned.reduce((a, b) => a + b, 0) / cleaned.length;
  return { median, mad, min, max, mean, n: cleaned.length, outliers: arr.length - cleaned.length };
};

// TERMINAL COLORS
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m', // Red
  ok: '\x1b[32m', // Green
  blue: '\x1b[34m'
};

// PERFORMANCE MEASUREMENT
class PerformanceTest {
  constructor(name) {
    this.name = name;
    this.samples = [];
  }

  async measure(fn) {
    await forceGC();
    const memBefore = process.memoryUsage().heapUsed;

    const startJS = performance.now();

    // Run the actual test workload
    const result = await fn();

    const endJS = performance.now();
    const memAfter = process.memoryUsage().heapUsed;

    const duration = endJS - startJS;

    this.samples.push({
      duration,
      memory: Math.max(0, memAfter - memBefore), // Prevent negative jumps from background GC
      payloadSize: typeof result === 'string' ? Buffer.byteLength(result, 'utf8') : 0
    });

    return duration;
  }

  getResults() {
    const durations = this.samples.map(s => s.duration);
    const memDeltas = this.samples.map(s => s.memory);
    const sizes = this.samples.map(s => s.payloadSize);

    return {
      name: this.name,
      duration: getStats(durations),
      memoryDelta: getStats(memDeltas),
      payloadSize: getMedian(sizes),
      samples: this.samples
    };
  }
}

async function runPerf() {
  const tests = {};
  const getTest = (name) => tests[name] ??= new PerformanceTest(name);

  console.log(`${colors.blue} -> Warming up V8 JIT compiler...${colors.reset}`);

  // WARMUP PHASE
  for (let warmup = 0; warmup < WARMUP_ITERATIONS; warmup++) {
    for (const size of [50, 500]) {
      const todos = makeTodos(size);
      TodoApp({ todos }).toString();
    }
  }

  await forceGC();
  console.log(`${colors.ok}OK Warmup complete, starting SSR measurements...${colors.reset}\n`);

  // MEASUREMENT PHASE
  for (let iteration = 1; iteration <= MEASURE_ITERATIONS; iteration++) {
    process.stdout.write(`\r->  Running iteration ${iteration}/${MEASURE_ITERATIONS}...`);

    for (const size of SIZES) {
      const todos = makeTodos(size);
      let vnodeTree;

      // Test 1: VNode Tree Generation (No Serialization)
      await getTest(`${size} todos: generate VNodes`).measure(() => {
        vnodeTree = TodoApp({ todos });
      });

      // Test 2: Serialization to String (HTML generation)
      await getTest(`${size} todos: serialize toString()`).measure(() => {
        return vnodeTree.toString();
      });

      // Test 3: End-to-End SSR (Generate + Serialize)
      await getTest(`${size} todos: full SSR lifecycle`).measure(() => {
        return TodoApp({ todos: makeTodos(size) }).toString();
      });
    }

    // SSR Batch Test: Simulating multiple concurrent requests
    await getTest('Batched 100 concurrent SSR requests (50 items each)').measure(async () => {
      const requests = Array.from({ length: 100 }, () => TodoApp({ todos: makeTodos(50) }).toString());
      return requests.join('');
    });
  }

  // ANALYSIS & REPORTING
  console.log(`\n\n${colors.blue}📈 Analyzing results...${colors.reset}`);
  const results = Object.values(tests).map(t => t.getResults());

  let report = `\nGIANT NodeJS SSR Performance Analysis (${MEASURE_ITERATIONS} iterations, ${WARMUP_ITERATIONS} warmup)\n`;
  report += `${'='.repeat(90)}\n\n`;
  report += `Environment:\n`;
  report += `  Node.js: ${process.version} (${process.arch}-${process.platform})\n`;
  report += `  V8 Engine: ${process.versions.v8}\n`;
  report += `  Available CPUs: ${os.cpus().length}\n`;
  report += `  Max Heap Size: ${Math.round(v8.getHeapStatistics().heap_size_limit / 1024 / 1024)} MB\n`;
  report += `  GC Control: ${typeof global.gc !== 'undefined' ? `${colors.ok}YES${colors.reset}` : `${colors.error}NO (run with --expose-gc)${colors.reset}`}\n\n`;

  const byType = {};
  results.forEach(r => {
    const match = r.name.match(/^(\d+) todos: (.+)$/);
    if (match) {
      const [, size, test] = match;
      byType[test] ??= {};
      byType[test][size] = r;
    }
  });

  // FORMATTING THE TABLE
  for (const [testName, sizes] of Object.entries(byType)) {
    report += `\n${testName.toUpperCase()}\n${'-'.repeat(90)}\n`;
    report += `${'Size'.padEnd(10)} | ${'Time (ms)'.padEnd(15)} | ${'Mem Allocated'.padEnd(15)} | ${'String Payload'.padEnd(15)}\n`;

    Object.entries(sizes).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([size, result]) => {
      // Thresholds: SSR should ideally be < 5ms for medium payloads
      const warn = result.duration.median > 10 ? colors.warn : (result.duration.median > 25 ? colors.error : colors.reset);

      const timeStr = `${result.duration.median.toFixed(2)} ms`;
      const memStr = `${(result.memoryDelta.median / 1024).toFixed(1)} KB`;
      const sizeStr = result.payloadSize > 0 ? `${(result.payloadSize / 1024).toFixed(1)} KB` : 'N/A';

      report += `${warn}${size.padEnd(10)} | ${timeStr.padEnd(15)} | ${memStr.padEnd(15)} | ${sizeStr.padEnd(15)}${colors.reset}\n`;
    });
  }

  // Batch test
  const batchTest = results.find(r => r.name.includes('Batched'));
  if (batchTest) {
    report += `\n\nCONCURRENCY SIMULATION (100 parallel SSR renders of 50 items)\n${'-'.repeat(90)}\n`;
    report += `Total Time: ${batchTest.duration.median.toFixed(2)}ms (${batchTest.duration.mad.toFixed(2)}ms MAD)\n`;
    report += `Memory Allocated: ${(batchTest.memoryDelta.median / 1024 / 1024).toFixed(2)} MB\n`;
    const rps = Math.round(100 / (batchTest.duration.median / 1000));
    report += `Estimated Throughput: ${rps} Requests/sec (per CPU core)\n`;
  }

  report += `\n\nPERFORMANCE ASSESSMENT\n${'='.repeat(90)}\n`;

  const e2eResults = Object.values(byType['full SSR lifecycle'] || {});
  const worstE2E = Math.max(...e2eResults.map(r => r.duration.median));

  const statusColor = worstE2E < 20 ? colors.ok : worstE2E < 50 ? colors.warn : colors.error;
  report += `Worst case 10k item SSR: ${statusColor}${worstE2E.toFixed(2)}ms${colors.reset}\n`;
  report += `Statistical confidence: ${results[0].duration.n}/${MEASURE_ITERATIONS} samples (${results[0].duration.outliers} outliers removed)\n`;

  console.log(report);
}

runPerf().catch(err => {
  console.error(`\n${colors.error}Benchmark failed:${colors.reset}`, err);
  process.exit(1);
});
