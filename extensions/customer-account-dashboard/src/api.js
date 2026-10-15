const API_VERSION = '2026-10';

const OVERVIEW_QUERY = `#graphql
  query TrekivaOverview {
    customer {
      firstName
      orders(first: 10, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          name
          processedAt
          financialStatus
          totalPrice { amount currencyCode }
          lineItems(first: 1) { nodes { title } }
          fulfillments(first: 10) { nodes { status } }
        }
      }
    }
  }
`;

// Customer Account API is reached through the shopify:// scheme, so the
// customer's own session authorizes the request. No tokens are handled here.
export async function fetchOverview() {
  const res = await fetch(
    `shopify://customer-account/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({query: OVERVIEW_QUERY}),
    },
  );
  if (!res.ok) throw new Error(`Customer Account API ${res.status}`);
  const {data, errors} = await res.json();
  if (errors?.length || !data?.customer) {
    throw new Error(errors?.[0]?.message ?? 'No customer data');
  }
  return data.customer;
}
