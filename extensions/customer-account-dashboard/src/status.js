const DELIVERED = new Set(['DELIVERED']);

// Maps Shopify order fields to i18n keys. Labels stay text, never colour alone.
export function paymentStatus(financialStatus) {
  switch (financialStatus) {
    case 'PAID':
      return {key: 'status.paid', tone: 'success'};
    case 'PENDING':
    case 'AUTHORIZED':
    case 'PARTIALLY_PAID':
      return {key: 'status.pending', tone: 'caution'};
    case 'REFUNDED':
      return {key: 'status.refunded', tone: 'neutral'};
    case 'PARTIALLY_REFUNDED':
      return {key: 'status.partiallyRefunded', tone: 'neutral'};
    default:
      return null;
  }
}

export function fulfillmentStatus(fulfillments) {
  if (!fulfillments.length) return {key: 'status.unfulfilled', tone: 'neutral'};
  const statuses = fulfillments.map((f) => f.status);
  if (statuses.every((s) => DELIVERED.has(s))) {
    return {key: 'status.delivered', tone: 'success'};
  }
  return {key: 'status.shipped', tone: 'info'};
}

export function isOpenShipment(order) {
  const f = order.fulfillments.nodes;
  return f.length > 0 && !f.every((x) => DELIVERED.has(x.status));
}

// Order ids look like gid://shopify/Order/123?key=abc; the account route needs
// the numeric id.
export function orderUrl(gid) {
  const id = gid.split('/').pop().split('?')[0];
  return `shopify:customer-account/orders/${id}`;
}
