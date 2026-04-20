export interface PriceRecord {
  id: number;
  region: string;
  price: number;
  start_time: string;
}

export interface PriceResponse {
  city: string;
  region: string;
  prices: PriceRecord[];
}