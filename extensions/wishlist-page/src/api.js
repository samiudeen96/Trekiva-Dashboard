import {APP_URL} from './config.js';

async function request(method, body) {
  // The session token proves which customer is calling; the backend reads the
  // customer from it, so no customer id is ever sent from here.
  const token = await shopify.sessionToken.get();
  const res = await fetch(`${APP_URL}/api/wishlist`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Wishlist API ${res.status}`);
  return res.json();
}

export const getWishlist = () => request('GET').then((r) => r.items);
export const removeItem = (productId) => request('DELETE', {productId});

const PRODUCTS_QUERY = `#graphql
  query WishlistProducts($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        onlineStoreUrl
        availableForSale
        featuredImage { url altText }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
  }
`;

// Fresh price and stock straight from Shopify. A null node means the product
// no longer exists, so the result stays aligned with the requested ids.
export async function getProducts(ids) {
  if (!ids.length) return [];
  const {data, errors} = await shopify.query(PRODUCTS_QUERY, {
    variables: {ids},
  });
  if (errors?.length || !data) throw new Error('Storefront query failed');
  return data.nodes;
}
