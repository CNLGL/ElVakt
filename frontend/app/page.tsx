"use client";

import { useState, useEffect } from "react";
import { Zap, RefreshCw } from "lucide-react";
import PriceChart from "./components/PriceChart";
import { PriceResponse, PriceRecord } from "./types";

export default function Home() {
  const [postcode, setPostcode] = useState("");
  const [error, setError] = useState(false);
  const [data, setData] = useState<PriceResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [todayData, setTodayData] = useState<PriceRecord[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);

  const handleSearch = async () => {
    if (postcode.length !== 5) {
      setError(true);
      return;
    }
    setLoading(true);
    setError(false);

    try {
      const res = await fetch(`http://localhost:8000/prices/${postcode}`);
      if (!res.ok) throw new Error("Posta kodu bulunamadı");
      const json: PriceResponse = await res.json();
      setData(json);
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!data) return;

    const today = new Date().toISOString().split("T")[0];
    const filtered = data.prices.filter(p =>
      p.start_time.startsWith(today)
    );
    setTodayData(filtered);

    const prices = filtered.map(p => p.price);
    setMinPrice(prices.length ? Math.min(...prices) : 0);
    setMaxPrice(prices.length ? Math.max(...prices) : 0);

    const now = new Date();
    const current = filtered.find(p => {
      const start = new Date(p.start_time);
      return start.getHours() === now.getHours() && start.getMinutes() <= now.getMinutes();
    });
    setCurrentPrice(current?.price ?? 0);

  }, [data]);

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#111] font-sans">
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-24">

        {/* Logo ve Başlık */}
        <header className="flex flex-col items-center mb-16 space-y-2">
          <div className="flex items-center gap-3">
            <Zap size={28} className="text-black/70" />
            <h1 className="text-4xl font-extralight italic uppercase tracking-tight">
              El<span className="font-bold not-italic tracking-normal">Vakt</span>
            </h1>
          </div>
          <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-widest">
            Sweden Energy Dashboard
          </p>
          <p className="text-[9px] text-gray-300 uppercase font-light">
            Designed in Gothenburg
          </p>
        </header>

        {/* Posta Kodu Input */}
        <div className="max-w-md mx-auto relative mb-12">
          <input
            type="text"
            maxLength={5}
            value={postcode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setPostcode(val);
              if (val.length === 5) setError(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Posta kodu (Örn: 43244)"
            className={`w-full bg-white/10 py-3 px-4 text-lg outline-none placeholder-gray-400 rounded-full
              border border-gray-200 focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-all duration-300
              ${error ? "border-rose-300 text-rose-500" : ""}`}
          />
          {error && (
            <p className="absolute -bottom-6 left-0 text-xs text-rose-500 uppercase font-semibold">
              Geçersiz Posta Kodu
            </p>
          )}
        </div>

        {/* Dashboard */}
        {data && (
          <div className="space-y-10 relative">

            {/* Kartlar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white/20 p-6 text-center text-gray-800 shadow-none">
                <p className="text-xs uppercase text-gray-400 mb-1 font-semibold">Bölge</p>
                <p className="text-2xl font-light">{data.region}</p>
              </div>

              <div className="bg-white/20 p-6 text-center text-emerald-400 shadow-none">
                <p className="text-xs uppercase text-gray-400 mb-1 font-semibold">En Düşük</p>
                <p className="text-2xl font-light">{minPrice.toFixed(3)} SEK</p>
              </div>

              <div className="bg-white/20 p-6 text-center text-rose-400 shadow-none">
                <p className="text-xs uppercase text-gray-400 mb-1 font-semibold">En Yüksek</p>
                <p className="text-2xl font-light">{maxPrice.toFixed(3)} SEK</p>
              </div>
            </div>

            {/* Grafik */}
            <div className="bg-white/20 p-6 shadow-none relative">
              <PriceChart data={todayData} />

              {/* Current Price sağ üstte */}
              <div className="absolute top-4 right-4 bg-white/50 px-3 py-1 text-gray-700 text-sm font-medium">
                {currentPrice.toFixed(3)} SEK
              </div>
            </div>

          </div>
        )}

        {/* Footer */}
        <footer className="mt-32 text-center">
            <p className="text-[9px] tracking-[0.5em] text-slate-300 uppercase font-light">
                Data provided by Entso-E • Designed in Varberg
            </p>
        </footer>
      </div>
    </main>
  );
}