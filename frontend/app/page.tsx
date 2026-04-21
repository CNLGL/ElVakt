"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Search, TrendingDown, TrendingUp } from "lucide-react";
import PriceChart from "./components/PriceChart";
import { PriceResponse, PriceRecord } from "./types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

interface AuthUser {
  id: number;
  email: string;
  postcode: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

function formatPrice(value: number) {
  return `${value.toFixed(2)} SEK`;
}

export default function Home() {
  const [postcode, setPostcode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [data, setData] = useState<PriceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedChart, setSelectedChart] = useState<"today" | "tomorrow">(
    "today"
  );

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const groupedPrices = useMemo(() => {
    if (!data) {
      return { today: [] as PriceRecord[], tomorrow: [] as PriceRecord[] };
    }

    const groups = new Map<string, PriceRecord[]>();

    for (const entry of data.prices) {
      const dayKey = entry.start_time.slice(0, 10);
      if (!groups.has(dayKey)) {
        groups.set(dayKey, []);
      }
      groups.get(dayKey)!.push(entry);
    }

    const orderedDays = Array.from(groups.keys()).sort();

    return {
      today: orderedDays[0] ? groups.get(orderedDays[0]) ?? [] : [],
      tomorrow: orderedDays[1] ? groups.get(orderedDays[1]) ?? [] : [],
    };
  }, [data]);

  const todayData = groupedPrices.today;
  const tomorrowData = groupedPrices.tomorrow;
  const selectedChartData =
    selectedChart === "today" ? todayData : tomorrowData;

  const stats = useMemo(() => {
    const prices = todayData.map((entry) => entry.price);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;

    const now = new Date();
    const currentPrice =
      todayData.find((entry) => {
        const start = new Date(entry.start_time);
        const end = new Date(entry.end_time);
        return now >= start && now < end;
      })?.price ?? 0;

    return { currentPrice, minPrice, maxPrice };
  }, [todayData]);

  async function fetchPricesForPostcode(targetPostcode: string) {
    const response = await fetch(`${API_BASE_URL}/prices/${targetPostcode}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const fallbackMessage = "Bu posta kodu icin fiyat verisi bulunamadi.";
      const payload = (await response.json().catch(() => null)) as
        | { detail?: string }
        | null;
      throw new Error(payload?.detail ?? fallbackMessage);
    }

    const payload: PriceResponse = await response.json();
    setData(payload);
    setSelectedChart("today");
  }

  async function fetchPricesForUser(user: AuthUser) {
    const response = await fetch(`${API_BASE_URL}/users/${user.id}/prices`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const fallbackMessage = "Kullanici fiyat verisi alinamadi.";
      const payload = (await response.json().catch(() => null)) as
        | { detail?: string }
        | null;
      throw new Error(payload?.detail ?? fallbackMessage);
    }

    const payload: PriceResponse = await response.json();
    setData(payload);
    setPostcode(user.postcode);
    setSelectedChart("today");
  }

  async function handleSearch() {
    if (postcode.length !== 5) {
      setErrorMessage("Lutfen 5 haneli bir Isvec posta kodu gir.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      await fetchPricesForPostcode(postcode);
    } catch (error) {
      setData(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Beklenmeyen bir hata olustu."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setErrorMessage("");
  }, [postcode]);

  useEffect(() => {
    const storedUser = localStorage.getItem("elvakt_user");
    if (!storedUser) return;

    try {
      const user = JSON.parse(storedUser) as AuthUser;
      setCurrentUser(user);
      fetchPricesForUser(user).catch(() => {
        localStorage.removeItem("elvakt_user");
      });
    } catch {
      localStorage.removeItem("elvakt_user");
    }
  }, []);

  return (
    <main className="min-h-screen text-[#111111]">
      <div className="mx-auto max-w-5xl px-6 pb-12 md:pb-20">
        <header className="mb-16 flex flex-col items-center text-center">
          <div className="mb-5 flex items-center gap-3">
            <h1 className="text-4xl font-extralight italic uppercase tracking-tight">
              El<span className="font-bold not-italic tracking-normal">Vakt</span>
            </h1>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-500">
            Free electricity lookup for Sweden
          </p>

          <p className="mt-6 max-w-2xl text-sm leading-7 text-gray-600 md:text-base">
            Enter a Swedish postcode to see today&apos;s hourly electricity prices
            in a calm, simple and clear view.
          </p>
        </header>

        <section className="mx-auto mb-14 max-w-2xl">
          <div className="rounded-full border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={postcode}
                  onChange={(event) =>
                    setPostcode(event.target.value.replace(/\D/g, ""))
                  }
                  onKeyDown={(event) =>
                    event.key === "Enter" && handleSearch()
                  }
                  placeholder="Postcode (for example 43244)"
                  className="w-full bg-transparent text-base outline-none placeholder:text-gray-400"
                />
              </div>

              <button
                type="button"
                onClick={handleSearch}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                <Search className="h-4 w-4" />
                {loading ? "Loading..." : "Search"}
              </button>
            </div>
          </div>

          <div className="mt-3 min-h-6 text-center text-sm text-rose-600">
            {errorMessage}
          </div>
        </section>

        {!data && (
          <section className="mb-16 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                Region logic
              </p>
              <p className="mt-3 text-lg font-light text-gray-900">
                Prices are matched to the right Swedish electricity region from
                your postcode.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                Hourly view
              </p>
              <p className="mt-3 text-lg font-light text-gray-900">
                See the daily rhythm of electricity prices hour by hour.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                Free access
              </p>
              <p className="mt-3 text-lg font-light text-gray-900">
                No account needed for the live postcode lookup experience.
              </p>
            </div>
          </section>
        )}

        {data && (
          <section className="space-y-8">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                  Region
                </p>
                <p className="mt-3 text-2xl font-light text-gray-900">
                  {data.region}
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                  Current
                </p>
                <p className="mt-3 text-2xl font-light text-gray-900">
                  {formatPrice(stats.currentPrice)}
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                <div className="flex items-center gap-2 text-gray-400">
                  <TrendingDown className="h-4 w-4" />
                  <p className="text-[11px] uppercase tracking-[0.3em]">
                    Lowest
                  </p>
                </div>
                <p className="mt-3 text-2xl font-light text-gray-900">
                  {formatPrice(stats.minPrice)}
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                <div className="flex items-center gap-2 text-gray-400">
                  <TrendingUp className="h-4 w-4" />
                  <p className="text-[11px] uppercase tracking-[0.3em]">
                    Highest
                  </p>
                </div>
                <p className="mt-3 text-2xl font-light text-gray-900">
                  {formatPrice(stats.maxPrice)}
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-8">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedChart("today")}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] transition ${
                        selectedChart === "today"
                          ? "bg-slate-900 text-white shadow-sm"
                          : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                      }`}
                    >
                      Today&apos;s chart
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedChart("tomorrow")}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.32em] transition ${
                        selectedChart === "tomorrow"
                          ? "bg-slate-900 text-white shadow-sm"
                          : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                      }`}
                    >
                      Tomorrow
                    </button>
                  </div>

                  <h2 className="mt-4 text-2xl font-light text-gray-900">
                    {data.city} postcode overview
                  </h2>
                </div>
              </div>

              {selectedChart === "today" && todayData.length > 0 && (
                <PriceChart data={todayData} />
              )}

              {selectedChart === "tomorrow" && tomorrowData.length > 0 && (
                <PriceChart data={tomorrowData} />
              )}

              {selectedChart === "tomorrow" && tomorrowData.length === 0 && (
                <div className="flex h-[360px] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-[#fafaf7] text-center text-slate-500 sm:h-[420px]">
                  <div className="max-w-md px-6">
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
                      Tomorrow
                    </p>
                    <p className="mt-4 text-lg font-light text-slate-700">
                      Tomorrow&apos;s data will appear here after 13:00, once
                      published.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <footer className="mt-24 text-center">
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">
            Data provided by Entso-E
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.35em] text-slate-300">
            Designed in Varberg
          </p>
        </footer>
      </div>
    </main>
  );
}
