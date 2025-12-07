import { NextResponse } from "next/server";

export async function GET() {
  const pairs = [
    { a: "AAPL", b: "MSFT", rho: 0.86, hedge: 0.95 },
    { a: "NVDA", b: "AMD", rho: 0.78, hedge: 0.88 },
    { a: "XOM", b: "CVX", rho: 0.73, hedge: 1.10 },
    { a: "JPM", b: "V", rho: 0.61, hedge: 0.65 }
  ];
  return NextResponse.json({ pairs });
}
