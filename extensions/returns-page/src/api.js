import {APP_URL} from './config.js';

async function request(path, options = {}) {
  const token = await shopify.sessionToken.get();
  const res = await fetch(`${APP_URL}/api/returns${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(`Returns API ${res.status}`);
    error.code = body.error;
    throw error;
  }
  return res.json();
}

export const getReturnState = (orderId) =>
  request(`?orderId=${encodeURIComponent(orderId)}`);

// Resolves with the server-issued reference; a reference exists only once
// the request has been saved.
export const submitReturn = (payload) =>
  request('', {method: 'POST', body: JSON.stringify(payload)}).then(
    (r) => r.reference,
  );
