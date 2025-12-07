import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker") ?? "AAPL";
  // Mock indicators
  const base = 100 + Math.random() * 50;
  const series = Array.from({ length: 120 }).map((_, i) => ({
    t: Date.now() - (120 - i) * 60_000,
    price: Number((base + Math.sin(i/5)*2 + (Math.random()-0.5)*1.5).toFixed(2)),
    rsi: Number((50 + Math.sin(i/7)*20 + (Math.random()-0.5)*10).toFixed(1)),
    sent: Number((50 + Math.cos(i/11)*25 + (Math.random()-0.5)*12).toFixed(1))
  }));
  const sma20 = series.map((_, i) => {
    const slice = series.slice(Math.max(0, i-19), i+1);
    const avg = slice.reduce((a, b) => a + b.price, 0) / slice.length;
    return Number(avg.toFixed(2));
  });
  return NextResponse.json({ ticker, series, sma20 });
}
