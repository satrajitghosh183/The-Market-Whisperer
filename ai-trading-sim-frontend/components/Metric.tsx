"use client";
import { ArrowDown, ArrowUp } from "lucide-react";

export default function Metric({ label, value, diff }: { label: string; value: string; diff?: number }) {
  const isUp = (diff ?? 0) >= 0;
  return (
    <div className="card">
      <div className="text-sm text-gray-300">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {diff !== undefined && (
        <div className={`mt-2 inline-flex items-center gap-1 ${isUp ? "text-up" : "text-down"}`}>
          {isUp ? <ArrowUp size={16}/> : <ArrowDown size={16}/>}
          <span className="text-sm">{(isUp ? "+" : "") + diff.toFixed(2)}%</span>
        </div>
      )}
    </div>
  );
}
