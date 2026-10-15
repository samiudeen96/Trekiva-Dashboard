const QUERY = `#graphql
  query SettingsSummary {
    customer {
      firstName
      lastName
      emailAddress { emailAddress }
      phoneNumber { phoneNumber }
      defaultAddress { formatted(withName: true) }
    }
  }
`;

export async function fetchSummary() {
  const res = await fetch('shopify://customer-account/api/2026-10/graphql.json', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({query: QUERY}),
  });
  if (!res.ok) throw new Error(`Customer Account API ${res.status}`);
  const {data, errors} = await res.json();
  if (errors?.length || !data?.customer) throw new Error('No customer data');
  return data.customer;
}
