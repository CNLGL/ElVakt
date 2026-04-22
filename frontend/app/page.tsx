"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cpu,
  MapPin,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import PriceChart from "./components/PriceChart";
import DeviceChart from "./components/DeviceChart";
import {
  Device,
  DeviceReadingsResponse,
  PriceRecord,
  PriceResponse,
  SavedLocation,
} from "./types";

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

type ViewMode = "location" | "device";

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

  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    null
  );
  const [locationLabel, setLocationLabel] = useState("");
  const [locationPostcode, setLocationPostcode] = useState("");
  const [locationError, setLocationError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);

  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [deviceReadings, setDeviceReadings] =
    useState<DeviceReadingsResponse | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [deviceType, setDeviceType] = useState("smart_plug");
  const [deviceLocationId, setDeviceLocationId] = useState("");
  const [deviceError, setDeviceError] = useState("");
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [showAddDevice, setShowAddDevice] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("location");

  const selectedDevice = devices.find((device) => device.id === selectedDeviceId);

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
    setViewMode("location");
    setSelectedDeviceId(null);
  }

  async function fetchUserLocations(user: AuthUser) {
    const response = await fetch(`${API_BASE_URL}/users/${user.id}/locations`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("Saved locations could not be loaded.");
    }

    const payload: SavedLocation[] = await response.json();
    setLocations(payload);

    const defaultLocation = payload.find((location) => location.is_default);
    const firstLocation = defaultLocation ?? payload[0];

    if (firstLocation) {
      setSelectedLocationId(firstLocation.id);
      setPostcode(firstLocation.postcode);
      await fetchPricesForPostcode(firstLocation.postcode);
    }
  }

  async function fetchUserDevices(user: AuthUser) {
    const response = await fetch(`${API_BASE_URL}/users/${user.id}/devices`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("Devices could not be loaded.");
    }

    const payload: Device[] = await response.json();
    setDevices(payload);
  }

  async function fetchDeviceReadings(device: Device) {
    if (!currentUser) return;

    setDeviceLoading(true);
    setDeviceError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${currentUser.id}/devices/${device.id}/readings?period=day`,
        { headers: { Accept: "application/json" } }
      );

      if (!response.ok) {
        throw new Error("Device readings could not be loaded.");
      }

      const payload: DeviceReadingsResponse = await response.json();

      if (payload.readings.length === 0) {
        const seedResponse = await fetch(
          `${API_BASE_URL}/users/${currentUser.id}/devices/${device.id}/test-readings`,
          {
            method: "POST",
            headers: { Accept: "application/json" },
          }
        );

        if (!seedResponse.ok) {
          throw new Error("Test device data could not be created.");
        }

        const seededPayload: DeviceReadingsResponse = await seedResponse.json();
        setDeviceReadings(seededPayload);
      } else {
        setDeviceReadings(payload);
      }

      setSelectedDeviceId(device.id);
      setViewMode("device");
    } catch (error) {
      setDeviceError(
        error instanceof Error ? error.message : "Device data could not be loaded."
      );
    } finally {
      setDeviceLoading(false);
    }
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
      setSelectedLocationId(null);
    } catch (error) {
      setData(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Beklenmeyen bir hata olustu."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectLocation(location: SavedLocation) {
    setLoading(true);
    setErrorMessage("");
    setSelectedLocationId(location.id);
    setPostcode(location.postcode);

    try {
      await fetchPricesForPostcode(location.postcode);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Lokasyon verisi alinamadi."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAddLocation() {
    if (!currentUser) return;

    const cleanPostcode = locationPostcode.trim().replace(/\D/g, "");

    if (!locationLabel.trim()) {
      setLocationError("Location name is required.");
      return;
    }

    if (cleanPostcode.length !== 5) {
      setLocationError("Please enter a valid 5-digit postcode.");
      return;
    }

    setLocationLoading(true);
    setLocationError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${currentUser.id}/locations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            label: locationLabel,
            postcode: cleanPostcode,
            is_default: locations.length === 0,
          }),
        }
      );

      const payload = (await response.json().catch(() => null)) as
        | SavedLocation
        | { detail?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload && "detail" in payload
            ? payload.detail ?? "Location could not be saved."
            : "Location could not be saved."
        );
      }

      const location = payload as SavedLocation;
      setLocations((current) => [...current, location]);
      setLocationLabel("");
      setLocationPostcode("");
      setShowAddLocation(false);
      await handleSelectLocation(location);
    } catch (error) {
      setLocationError(
        error instanceof Error ? error.message : "Location could not be saved."
      );
    } finally {
      setLocationLoading(false);
    }
  }

  async function handleDeleteLocation(location: SavedLocation) {
    if (!currentUser) return;

    const confirmed = window.confirm(`Delete ${location.label}?`);
    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${currentUser.id}/locations/${location.id}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("Location could not be deleted.");
      }

      setLocations((current) => current.filter((item) => item.id !== location.id));

      if (selectedLocationId === location.id) {
        setSelectedLocationId(null);
        setData(null);
      }
    } catch (error) {
      setLocationError(
        error instanceof Error ? error.message : "Location could not be deleted."
      );
    }
  }

  async function handleAddDevice() {
    if (!currentUser) return;

    if (!deviceName.trim()) {
      setDeviceError("Device name is required.");
      return;
    }

    setDeviceLoading(true);
    setDeviceError("");

    try {
      const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: deviceName,
          device_type: deviceType,
          saved_location_id: deviceLocationId ? Number(deviceLocationId) : null,
          tuya_device_id: null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | Device
        | { detail?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload && "detail" in payload
            ? payload.detail ?? "Device could not be saved."
            : "Device could not be saved."
        );
      }

      const device = payload as Device;
      setDevices((current) => [...current, device]);
      setDeviceName("");
      setDeviceType("smart_plug");
      setDeviceLocationId("");
      setShowAddDevice(false);
      await fetchDeviceReadings(device);
    } catch (error) {
      setDeviceError(
        error instanceof Error ? error.message : "Device could not be saved."
      );
    } finally {
      setDeviceLoading(false);
    }
  }

  async function handleDeleteDevice(device: Device) {
    if (!currentUser) return;

    const confirmed = window.confirm(`Delete ${device.name}?`);
    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${currentUser.id}/devices/${device.id}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error("Device could not be deleted.");
      }

      setDevices((current) => current.filter((item) => item.id !== device.id));

      if (selectedDeviceId === device.id) {
        setSelectedDeviceId(null);
        setDeviceReadings(null);
        setViewMode("location");
      }
    } catch (error) {
      setDeviceError(
        error instanceof Error ? error.message : "Device could not be deleted."
      );
    }
  }

  useEffect(() => {
    setErrorMessage("");
  }, [postcode]);

  useEffect(() => {
    function syncUser() {
      const storedUser = localStorage.getItem("elvakt_user");

      if (!storedUser) {
        setCurrentUser(null);
        setLocations([]);
        setDevices([]);
        setSelectedLocationId(null);
        setSelectedDeviceId(null);
        setShowAddLocation(false);
        setShowAddDevice(false);
        setViewMode("location");
        return;
      }

      try {
        const user = JSON.parse(storedUser) as AuthUser;
        setCurrentUser(user);
        fetchUserLocations(user).catch(() => {
          fetchPricesForPostcode(user.postcode).catch(() => null);
        });
        fetchUserDevices(user).catch(() => null);
      } catch {
        localStorage.removeItem("elvakt_user");
        setCurrentUser(null);
        setLocations([]);
        setDevices([]);
        setSelectedLocationId(null);
        setSelectedDeviceId(null);
        setShowAddLocation(false);
        setShowAddDevice(false);
        setViewMode("location");
      }
    }

    syncUser();

    window.addEventListener("elvakt-auth-changed", syncUser);

    return () => {
      window.removeEventListener("elvakt-auth-changed", syncUser);
    };
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

        <section className="mx-auto mb-8 max-w-2xl">
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

          {currentUser ? (
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {locations.map((location) => (
                    <div
                      key={location.id}
                      className={`inline-flex items-center overflow-hidden rounded-full text-sm shadow-sm transition ${
                        viewMode === "location" && selectedLocationId === location.id
                          ? "bg-black text-white"
                          : "bg-white text-gray-600 ring-1 ring-black/5"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectLocation(location)}
                        className="px-4 py-2 hover:opacity-80"
                      >
                        {location.label} · {location.postcode}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLocation(location)}
                        className={`px-3 py-2 ${
                          viewMode === "location" && selectedLocationId === location.id
                            ? "text-white/70 hover:text-white"
                            : "text-gray-400 hover:text-rose-500"
                        }`}
                        aria-label={`Delete ${location.label}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setShowAddLocation((value) => !value)}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-gray-600 shadow-sm ring-1 ring-black/5 transition hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4" />
                    Add location
                  </button>
                </div>

                {showAddLocation ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      placeholder="Name, for example Work"
                      value={locationLabel}
                      onChange={(event) => setLocationLabel(event.target.value)}
                      className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm outline-none"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      placeholder="Postcode"
                      value={locationPostcode}
                      onChange={(event) =>
                        setLocationPostcode(event.target.value.replace(/\D/g, ""))
                      }
                      className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm outline-none sm:w-36"
                    />
                    <button
                      type="button"
                      onClick={handleAddLocation}
                      disabled={locationLoading}
                      className="rounded-full bg-black px-5 py-2 text-sm text-white transition hover:bg-black/85 disabled:bg-gray-400"
                    >
                      {locationLoading ? "Saving..." : "Save"}
                    </button>
                  </div>
                ) : null}

                <div className="mt-2 min-h-5 text-center text-sm text-rose-600">
                  {locationError}
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {devices.map((device) => (
                    <div
                      key={device.id}
                      className={`inline-flex items-center overflow-hidden rounded-full text-sm shadow-sm transition ${
                        viewMode === "device" && selectedDeviceId === device.id
                          ? "bg-black text-white"
                          : "bg-white text-gray-600 ring-1 ring-black/5"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => fetchDeviceReadings(device)}
                        className="inline-flex items-center gap-2 px-4 py-2 hover:opacity-80"
                      >
                        <Cpu className="h-4 w-4" />
                        {device.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDevice(device)}
                        className={`px-3 py-2 ${
                          viewMode === "device" && selectedDeviceId === device.id
                            ? "text-white/70 hover:text-white"
                            : "text-gray-400 hover:text-rose-500"
                        }`}
                        aria-label={`Delete ${device.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setShowAddDevice((value) => !value)}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-gray-600 shadow-sm ring-1 ring-black/5 transition hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4" />
                    Add device
                  </button>
                </div>

                {showAddDevice ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      placeholder="Device name"
                      value={deviceName}
                      onChange={(event) => setDeviceName(event.target.value)}
                      className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm outline-none"
                    />
                    <select
                      value={deviceType}
                      onChange={(event) => setDeviceType(event.target.value)}
                      className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm outline-none"
                    >
                      <option value="smart_plug">Smart plug</option>
                      <option value="ev_charger">EV charger</option>
                      <option value="lamp">Lamp</option>
                      <option value="heater">Heater</option>
                      <option value="appliance">Appliance</option>
                    </select>
                    <select
                      value={deviceLocationId}
                      onChange={(event) => setDeviceLocationId(event.target.value)}
                      className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm outline-none"
                    >
                      <option value="">No location</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddDevice}
                      disabled={deviceLoading}
                      className="rounded-full bg-black px-5 py-2 text-sm text-white transition hover:bg-black/85 disabled:bg-gray-400"
                    >
                      {deviceLoading ? "Saving..." : "Save"}
                    </button>
                  </div>
                ) : null}

                <div className="mt-2 min-h-5 text-center text-sm text-rose-600">
                  {deviceError}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {!data && viewMode === "location" && (
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

        {data && viewMode === "location" && (
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

        {viewMode === "device" && selectedDevice && deviceReadings && (
          <section className="space-y-8">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                  Device
                </p>
                <p className="mt-3 text-2xl font-light text-gray-900">
                  {selectedDevice.name}
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                  Energy today
                </p>
                <p className="mt-3 text-2xl font-light text-gray-900">
                  {deviceReadings.summary.total_energy_kwh.toFixed(2)} kWh
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                  Cost today
                </p>
                <p className="mt-3 text-2xl font-light text-gray-900">
                  {deviceReadings.summary.total_cost_sek.toFixed(2)} SEK
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                  Average power
                </p>
                <p className="mt-3 text-2xl font-light text-gray-900">
                  {deviceReadings.summary.average_power_watts.toFixed(0)} W
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-8">
              <div className="mb-6">
                <p className="text-[11px] uppercase tracking-[0.35em] text-gray-400">
                  Device consumption
                </p>
                <h2 className="mt-2 text-2xl font-light text-gray-900">
                  {selectedDevice.name} usage overview
                </h2>
              </div>

              <DeviceChart data={deviceReadings.readings} />
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
