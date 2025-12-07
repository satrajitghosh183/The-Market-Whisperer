"use client";
import { useEffect, useMemo, useState } from "react";

export default function AiExplainModal({ open, onClose, metrics }: { open: boolean; onClose: () => void; metrics: any }) {
  const [text, setText] = useState("");

  const summary = useMemo(() => {
    // Deterministic, on-device "AI-like" summary
    const { balance, pnl, volatility, sentiment } = metrics || {};
    const risk = volatility > 30 ? "High" : volatility > 15 ? "Medium" : "Low";
    const dir = (sentiment ?? 0) >= 50 ? "bullish" : "bearish";
    const perf = pnl >= 0 ? "solid gains" : "conrrolled drawdown";
    return `Balance ${balance?.toLocaleString?.() ?? "-"},PnL ${pnl?.toFixed?.(2) ?? "-"}%。` +
      `Current bolatility ${volatility?.toFixed?.(1) ?? "-"}(risk${risk}),sentiment ${sentiment?.toFixed?.(0) ?? "-"}（${dir}）。` +
      `Overall:${perf}.Consider adjusting position size and monitoring event-driven catalysts`;
  }, [metrics]);

  useEffect(() => { if (open) setText(summary); }, [open, summary]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
      <div className="card max-w-xl w-full">
        <div className="text-lg font-semibold mb-2">Explain with AI(local)）</div>
        <p className="text-sm text-gray-200 leading-6">{text}</p>
        <div className="mt-4 flex justify-end">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
