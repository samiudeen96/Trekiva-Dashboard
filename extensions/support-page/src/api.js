import {APP_URL} from './config.js';

const ORDERS_QUERY = `#graphql
  query SupportOrders {
    customer {
      orders(first: 10, sortKey: PROCESSED_AT, reverse: true) {
        nodes { id name }
      }
    }
  }
`;

// Orders the customer can attach to a request. Failing to load them must not
// block the form, so callers treat an error as "no orders to pick from".
export async function fetchOrders() {
  const res = await fetch('shopify://customer-account/api/2026-10/graphql.json', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({query: ORDERS_QUERY}),
  });
  if (!res.ok) throw new Error(`Customer Account API ${res.status}`);
  const {data} = await res.json();
  return data?.customer?.orders?.nodes ?? [];
}

// Resolves with the server-issued reference, or throws an Error whose
// `code` is the HTTP status. The caller shows a reference only on success.
export async function submitTicket(payload) {
  const token = await shopify.sessionToken.get();
  const res = await fetch(`${APP_URL}/api/support`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = new Error(`Support API ${res.status}`);
    error.code = res.status;
    throw error;
  }
  const {reference} = await res.json();
  if (!reference) throw new Error('Missing reference');
  return reference;
}
