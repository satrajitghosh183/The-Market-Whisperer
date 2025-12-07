"use client";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";

type Report = { sharpe: number; mdd: number; turnover: number; winners: string[]; losers: string[]; note: string };

export default function Reports() {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/report");
      const json = await res.json();
      setReport(json);
    })();
  }, []);

  const download = () => {
    if (!report) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Performance Report", 14, 20);
    doc.setFontSize(12);
    doc.text(`Sharpe: ${report.sharpe.toFixed(2)}`, 14, 36);
    doc.text(`Max Drawdown: ${report.mdd.toFixed(2)}%`, 14, 46);
    doc.text(`Turnover: ${report.turnover.toFixed(2)}`, 14, 56);
    doc.text(`Top Winners: ${report.winners.join(", ")}`, 14, 66);
    doc.text(`Top Losers: ${report.losers.join(", ")}`, 14, 76);
    doc.text(`Note: ${report.note}`, 14, 86);
    doc.save("report.pdf");
  };

  return (
    <main className="grid gap-6">
      <div className="card">
        <div className="text-lg font-semibold">Reports</div>
        <div className="text-sm text-gray-300">Generate and download a local PDF summar</div>
      </div>
      <div className="card">
        {report ? (
          <div className="grid gap-2 text-sm">
            <div>Sharpe: {report.sharpe.toFixed(2)}</div>
            <div>Max Drawdown: {report.mdd.toFixed(2)}%</div>
            <div>Turnover: {report.turnover.toFixed(2)}</div>
            <div>Top Winners: {report.winners.join(", ")}</div>
            <div>Top Losers: {report.losers.join(", ")}</div>
            <div>Note: {report.note}</div>
            <div className="mt-3">
              <button className="btn" onClick={download}>Download PDF</button>
            </div>
          </div>
        ) : (
          <div className="text-gray-400">Loading...</div>
        )}
      </div>
    </main>
  );
}
