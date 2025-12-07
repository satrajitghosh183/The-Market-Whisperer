"use client";
import dynamic from "next/dynamic";
import React from "react";
const Recharts = dynamic(() => import("./_LineArea"), { ssr: false });

export default function LineAreaChart({ data }: { data: { t: number; price: number; rsi: number; sent: number }[] }) {
  return <Recharts data={data}/>;
}
