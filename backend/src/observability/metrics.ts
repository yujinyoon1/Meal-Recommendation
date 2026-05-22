/**
 * 가벼운 in-memory 메트릭 + /metrics (Prometheus text format).
 * Phase 7 (T120). 다중 인스턴스에서는 별도 export(예: pushgateway) 또는 Redis 카운터로 교체.
 */
import { Router, Request, Response } from 'express';

interface Counter { value: number }
interface Histogram {
  count: number;
  sum: number;
  buckets: Map<number, number>; // <=ms threshold → count
}

const counters = new Map<string, Counter>();
const histograms = new Map<string, Histogram>();

const DEFAULT_BUCKETS_MS = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 30000];

export function inc(name: string, by = 1): void {
  const c = counters.get(name) ?? { value: 0 };
  c.value += by;
  counters.set(name, c);
}

export function observe(name: string, ms: number): void {
  let h = histograms.get(name);
  if (!h) {
    h = { count: 0, sum: 0, buckets: new Map(DEFAULT_BUCKETS_MS.map((b) => [b, 0])) };
    histograms.set(name, h);
  }
  h.count += 1;
  h.sum += ms;
  for (const b of DEFAULT_BUCKETS_MS) {
    if (ms <= b) h.buckets.set(b, (h.buckets.get(b) ?? 0) + 1);
  }
}

function renderPrometheus(): string {
  const lines: string[] = [];
  for (const [name, c] of counters) {
    lines.push(`# TYPE ${name} counter`);
    lines.push(`${name} ${c.value}`);
  }
  for (const [name, h] of histograms) {
    lines.push(`# TYPE ${name} histogram`);
    for (const b of DEFAULT_BUCKETS_MS) {
      lines.push(`${name}_bucket{le="${b}"} ${h.buckets.get(b) ?? 0}`);
    }
    lines.push(`${name}_bucket{le="+Inf"} ${h.count}`);
    lines.push(`${name}_sum ${h.sum}`);
    lines.push(`${name}_count ${h.count}`);
  }
  return lines.join('\n') + '\n';
}

const router = Router();
router.get('/metrics', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(renderPrometheus());
});

export default router;
