import { Env } from './schema';

export async function initializePaystackPayment(env: Env, data: {
  email: string;
  amount: number;
  reference: string;
  callback_url: string;
  metadata?: Record<string, any>;
}): Promise<{ authorization_url: string; access_code: string; reference: string }> {
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: data.email,
      amount: data.amount,
      reference: data.reference,
      callback_url: data.callback_url,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Paystack initialization failed');
  }

  const result = await response.json();
  return result.data;
}

export async function verifyPaystackPayment(env: Env, reference: string): Promise<{
  status: string;
  amount: number;
  currency: string;
  customer: { email: string; first_name: string; last_name: string };
  metadata?: any;
}> {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: {
      'Authorization': `Bearer ${env.PAYSTACK_SECRET_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Paystack verification failed');
  }

  const result = await response.json();
  const data = result.data;

  return {
    status: data.status,
    amount: data.amount,
    currency: data.currency,
    customer: {
      email: data.customer.email,
      first_name: data.customer.first_name,
      last_name: data.customer.last_name,
    },
    metadata: data.metadata,
  };
}
