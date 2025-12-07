export type Tick = { t: number; price: number; rsi: number; sent: number };

export function genSeries(n = 60, start = 100) {
  const arr: Tick[] = [];
  let price = start;
  let rsi = 50;
  let sent = 50;
  const now = Date.now() - n * 1000;
  for (let i = 0; i < n; i++) {
    const drift = (Math.random() - 0.5) * 0.8;
    price = Math.max(1, price + drift);
    rsi = Math.min(100, Math.max(0, rsi + (Math.random()-0.5)*5));
    sent = Math.min(100, Math.max(0, sent + (Math.random()-0.5)*6));
    arr.push({ t: now + i * 1000, price: Number(price.toFixed(2)), rsi: Number(rsi.toFixed(1)), sent: Number(sent.toFixed(1)) });
  }
  return arr;
}

export function metricsFromSeries(series: Tick[]) {
  const last = series[series.length - 1];
  const first = series[0];
  const pnl = ((last.price - first.price) / first.price) * 100;
  const vols = series.slice(1).map((p, i) => Math.abs(p.price - series[i].price));
  const volatility = vols.reduce((a, b) => a + b, 0) / vols.length * 10;
  const sentiment = last.sent;
  const balance = 1000000 + (pnl / 100) * 1000000 * 0.2;
  return { balance, pnl, volatility, sentiment };
}
