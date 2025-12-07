"use client";
import { useEffect, useState } from "react";

type Pair = { a: string; b: string; rho: number; hedge: number };

export default function Hedging() {
  const [pairs, setPairs] = useState<Pair[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/hedge");
      const json = await res.json();
      setPairs(json.pairs);
    })();
  }, []);

  return (
    <main className="grid gap-6">
      <div className="card">
        <div className="text-lg font-semibold">Hedging Workbench</div>
        <div className="text-sm text-gray-300">View high-correlation pairs and hedge ratios</div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Asset A</th>
              <th>Asset B</th>
              <th>ρ (Correlation)</th>
              <th>Hedge Ratio</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((p) => (
              <tr key={p.a + p.b}>
                <td className="font-medium">{p.a}</td>
                <td>{p.b}</td>
                <td>{p.rho.toFixed(2)}</td>
                <td>{p.hedge.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
