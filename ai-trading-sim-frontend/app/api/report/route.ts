import { NextResponse } from "next/server";

export async function GET() {
  // Return key KPIs used in PDF rendering on client
  const report = {
    sharpe: 1.42,
    mdd: 8.3,
    turnover: 0.38,
    winners: ["NVDA", "AAPL", "MSFT"],
    losers: ["TSLA", "XOM"],
    note: "Mock data for demo only"
  };
  return NextResponse.json(report);
}
