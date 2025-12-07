"use client";
import { LineChart, Line, Area, AreaChart, Tooltip, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export default function _LineArea({ data }: { data: { t: number; price: number; rsi: number; sent: number }[] }) {
  const fmt = (t: number) => new Date(t).toLocaleTimeString();
  return (
    <div className="card h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(122,162,247)" stopOpacity={0.7}/>
              <stop offset="100%" stopColor="rgb(122,162,247)" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2}/>
          <XAxis dataKey="t" tickFormatter={fmt} />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip labelFormatter={(l) => fmt(l as number)} />
          <Legend />
          <Area yAxisId="left" type="monotone" dataKey="price" name="Price" stroke="#7aa2f7" fill="url(#g1)" />
          <Line yAxisId="right" type="monotone" dataKey="rsi" name="RSI" stroke="#22c55e" dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="sent" name="Sentiment" stroke="#ef4444" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
