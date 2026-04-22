export interface PriceRecord {
  id: number;
  region: string;
  price: number;
  start_time: string;
  end_time: string;
}

export interface PriceResponse {
  city: string;
  region: string;
  prices: PriceRecord[];
}

export interface SavedLocation {
  id: number;
  label: string;
  postcode: string;
  is_default: boolean;
  created_at: string;
}

export interface Device {
  id: number;
  user_id: number;
  saved_location_id: number | null;
  name: string;
  device_type: string;
  tuya_device_id: string | null;
  is_tuya_connected: boolean;
  created_at: string;
}

export interface DeviceReading {
  id: number;
  device_id: number;
  measured_at: string;
  power_watts: number;
  energy_kwh: number;
  price_sek_per_kwh: number | null;
  cost_sek: number | null;
  source: string;
  created_at: string;
}

export interface DeviceSummary {
  total_energy_kwh: number;
  total_cost_sek: number;
  average_power_watts: number;
  readings_count: number;
}

export interface DeviceReadingsResponse {
  readings: DeviceReading[];
  summary: DeviceSummary;
}
