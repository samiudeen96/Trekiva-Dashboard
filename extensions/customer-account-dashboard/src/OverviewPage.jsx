import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {fetchOverview} from './api.js';
import {
  fulfillmentStatus,
  isOpenShipment,
  orderUrl,
  paymentStatus,
} from './status.js';

export default async () => {
  render(<Overview />, document.body);
};

const t = (key, options) => shopify.i18n.translate(key, options);

function Overview() {
  const [state, setState] = useState({phase: 'loading'});

  const load = () => {
    setState({phase: 'loading'});
    fetchOverview()
      .then((customer) => setState({phase: 'ready', customer}))
      .catch(() => setState({phase: 'error'}));
  };
  useEffect(load, []);

  const name = state.customer?.firstName;
  return (
    // Narrow single-column layout, as Shopify recommends for full pages.
    <s-page heading={t('pageTitle')}>
      <s-grid gridTemplateColumns="minmax(auto, 720px)" justifyContent="center">
        <s-stack gap="large">
          <s-stack gap="small-300">
            <s-heading>
              {name ? t('welcome', {name}) : t('welcomeGeneric')}
            </s-heading>
            <s-text color="subdued">{t('subtitle')}</s-text>
          </s-stack>
          {state.phase === 'loading' && <Loading />}
          {state.phase === 'error' && <LoadError onRetry={load} />}
          {state.phase === 'ready' && <Content customer={state.customer} />}
        </s-stack>
      </s-grid>
    </s-page>
  );
}

function Loading() {
  return (
    <s-section>
      <s-skeleton-paragraph />
      <s-skeleton-paragraph />
      <s-skeleton-paragraph />
    </s-section>
  );
}

function LoadError({onRetry}) {
  return (
    <s-banner tone="critical">
      <s-stack gap="small">
        <s-text>{t('loadError')}</s-text>
        <s-button click={onRetry}>{t('retry')}</s-button>
      </s-stack>
    </s-banner>
  );
}

function Content({customer}) {
  const orders = customer.orders.nodes;
  if (!orders.length) return <EmptyState />;

  // Counts are derived from the orders actually loaded (latest 10) and say so.
  const openShipments = orders.filter(isOpenShipment).length;
  return (
    <s-stack gap="large">
      <s-grid gridTemplateColumns="1fr 1fr" gap="base">
        <Stat label={t('latestOrders')} value={orders.length} />
        <Stat
          label={t('openShipments')}
          value={openShipments}
          hint={t('openShipmentsHint')}
        />
      </s-grid>
      <s-section heading={t('recentOrders')}>
        <s-stack gap="base">
          {orders.slice(0, 3).map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
          <s-link href="shopify:customer-account/orders">
            {t('viewAllOrders')}
          </s-link>
        </s-stack>
      </s-section>
      <Shortcuts />
    </s-stack>
  );
}

function Stat({label, value, hint}) {
  return (
    <s-section>
      <s-stack gap="small-300">
        <s-text color="subdued">{label}</s-text>
        <s-heading>{String(value)}</s-heading>
        {hint && <s-text color="subdued">{hint}</s-text>}
      </s-stack>
    </s-section>
  );
}

function OrderRow({order}) {
  const payment = paymentStatus(order.financialStatus);
  const fulfillment = fulfillmentStatus(order.fulfillments.nodes);
  const firstItem = order.lineItems.nodes[0]?.title;
  const {amount, currencyCode} = order.totalPrice;
  return (
    <s-stack gap="small-200">
      <s-stack direction="inline" justifyContent="space-between" gap="base">
        <s-text type="strong">{order.name}</s-text>
        <s-text>
          {shopify.i18n.formatCurrency(Number(amount), {currency: currencyCode})}
        </s-text>
      </s-stack>
      <s-text color="subdued">
        {shopify.i18n.formatDate(new Date(order.processedAt), {
          dateStyle: 'medium',
        })}
        {firstItem ? ` · ${firstItem}` : ''}
      </s-text>
      <s-stack direction="inline" gap="small-200">
        <s-badge tone={fulfillment.tone}>{t(fulfillment.key)}</s-badge>
        {payment && <s-badge tone={payment.tone}>{t(payment.key)}</s-badge>}
      </s-stack>
      <s-link href={orderUrl(order.id)}>{t('viewOrder')}</s-link>
      <s-divider />
    </s-stack>
  );
}

function Shortcuts() {
  return (
    <s-section heading={t('shortcuts')}>
      <s-stack gap="small-200">
        <s-link href="shopify:customer-account/orders">{t('orders')}</s-link>
        <s-link href="shopify:customer-account/profile">{t('profile')}</s-link>
      </s-stack>
    </s-section>
  );
}

function EmptyState() {
  return (
    <s-section>
      <s-stack gap="base">
        <s-heading>{t('emptyTitle')}</s-heading>
        <s-text color="subdued">{t('emptyBody')}</s-text>
        <s-button href="/">{t('startShopping')}</s-button>
      </s-stack>
    </s-section>
  );
}
