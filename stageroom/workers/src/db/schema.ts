export interface User {
  id: string;
  clerk_id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
}

export interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  ticket_type: string;
  ticket_price: number;
  currency: string;
  max_tickets: number | null;
  qr_code_url: string | null;
  livekit_room: string | null;
  stream_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  event_id: string;
  user_id: string | null;
  guest_email: string | null;
  guest_name: string | null;
  status: string;
  payment_id: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: string;
  stripe_subscription_id: string | null;
  paystack_subscription_id: string | null;
  status: string;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}

export interface Donation {
  id: string;
  event_id: string;
  guest_email: string | null;
  guest_name: string | null;
  amount: number;
  type: string;
  currency: string;
  payment_id: string;
  payment_provider: string;
  created_at: string;
}

export interface DonationConfig {
  id: string;
  event_id: string;
  enabled: number;
  tithe_enabled: number;
  offering_enabled: number;
  preset_amounts: string | null;
  custom_amount_enabled: number;
}

export interface Guest {
  id: string;
  event_id: string;
  name: string;
  email: string;
  access_code: string | null;
  joined_at: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  provider: string;
  provider_payment_id: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  event_id: string | null;
  guest_id: string | null;
  metadata: string | null;
  created_at: string;
}

export interface QRCode {
  id: string;
  event_id: string;
  code: string;
  url: string;
  scan_count: number;
  created_at: string;
}

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  LIVEKIT_URL: string;
  LIVEKIT_API_KEY: string;
  LIVEKIT_API_SECRET: string;
  CLERK_SECRET_KEY: string;
  PAYSTACK_SECRET_KEY: string;
  PAYSTACK_PUBLIC_KEY: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_URL: string;
}
