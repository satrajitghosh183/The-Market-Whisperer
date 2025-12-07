import { NextResponse } from "next/server";

export async function GET() {
  const assets = Array.from({ length: 20 }).map((_, i) => ({
    ticker: ["AAPL","MSFT","GOOG","AMZN","TSLA","NVDA","META","NFLX","AMD","INTC","BA","JPM","V","MA","XOM","CVX","KO","PEP","ADBE","ORCL"][i],
    weight: Number((Math.random() * 5 + 2).toFixed(2)),
    vol: Number((Math.random() * 30 + 5).toFixed(2)),
    sentiment: Number((Math.random() * 100).toFixed(0))
  }));
  const sectors = [
    { name: "Tech", value: 42 },
    { name: "Finance", value: 18 },
    { name: "Consumer", value: 15 },
    { name: "Energy", value: 12 },
    { name: "Industrial", value: 13 }
  ];
  return NextResponse.json({ assets, sectors });
}
