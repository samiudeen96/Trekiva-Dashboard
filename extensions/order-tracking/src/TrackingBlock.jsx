import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {APP_URL} from './config.js';

export default async () => {
  render(<Tracking />, document.body);
};

const t = (key, options) => shopify.i18n.translate(key, options);
const TONES = {
  delivered: 'success',
  exception: 'critical',
  returning: 'warning',
  cancelled: 'neutral',
};

async function fetchShipments(orderId) {
  const token = await shopify.sessionToken.get();
  const res = await fetch(
    `${APP_URL}/api/tracking?orderId=${encodeURIComponent(orderId)}`,
    {headers: {Authorization: `Bearer ${token}`}},
  );
  if (!res.ok) throw new Error(`Tracking API ${res.status}`);
  return (await res.json()).shipments;
}

function Tracking() {
  const [orderId, setOrderId] = useState(shopify.order?.value?.id);
  const [state, setState] = useState({phase: 'loading'});

  useEffect(() => {
    const unsubscribe = shopify.order?.subscribe?.((o) => setOrderId(o?.id));
    return () => unsubscribe?.();
  }, []);

  const load = async () => {
    if (!orderId) return;
    setState({phase: 'loading'});
    try {
      setState({phase: 'ready', shipments: await fetchShipments(orderId)});
    } catch {
      setState({phase: 'error'});
    }
  };
  useEffect(() => {
    load();
  }, [orderId]);

  // Nothing to show until the order has tracking numbers.
  if (state.phase === 'ready' && !state.shipments.length) return null;

  return (
    <s-section heading={t('title')}>
      {state.phase === 'loading' && <s-skeleton-paragraph />}
      {state.phase === 'error' && (
        <s-stack gap="small">
          <s-text>{t('loadError')}</s-text>
          <s-button click={load}>{t('retry')}</s-button>
        </s-stack>
      )}
      {state.phase === 'ready' && (
        <s-stack gap="large">
          {state.shipments.map((s) => (
            <Shipment key={`${s.fulfillmentId}:${s.number}`} shipment={s} />
          ))}
        </s-stack>
      )}
    </s-section>
  );
}

function when(iso) {
  return shopify.i18n.formatDate(new Date(iso), {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function day(iso) {
  return shopify.i18n.formatDate(new Date(iso), {dateStyle: 'medium'});
}

function Shipment({shipment}) {
  const {tracking} = shipment;
  return (
    <s-stack gap="small">
      <s-text type="strong">{t('shipment', {number: shipment.number})}</s-text>
      {tracking ? (
        <s-stack gap="small">
          <s-stack direction="inline" gap="small-200">
            <s-badge tone={TONES[tracking.stage] ?? 'info'}>
              {t(`stages.${tracking.stage}`)}
            </s-badge>
            {/* The carrier's own wording, so nothing is paraphrased away. */}
            <s-text>{tracking.label}</s-text>
          </s-stack>
          {tracking.lastUpdate && (
            <s-text color="subdued">
              {t('lastUpdated', {date: when(tracking.lastUpdate)})}
            </s-text>
          )}
          {tracking.estimatedDelivery && tracking.stage !== 'delivered' && (
            <s-text color="subdued">
              {t('expected', {date: day(tracking.estimatedDelivery)})}
            </s-text>
          )}
          <s-text color="subdued">
            {t('source', {carrier: shipment.company ?? tracking.carrier})}
          </s-text>
          {shipment.stale && shipment.syncedAt && (
            <s-banner tone="warning">
              <s-text>{t('stale', {date: when(shipment.syncedAt)})}</s-text>
            </s-banner>
          )}
          {tracking.events.length > 0 && (
            <s-details>
              <s-summary>{t('history')}</s-summary>
              <s-stack gap="small-200">
                {tracking.events.map((e, i) => (
                  <s-stack key={i} gap="small-300">
                    <s-text type="strong">{e.label}</s-text>
                    {e.description && <s-text>{e.description}</s-text>}
                    <s-text color="subdued">
                      {[e.location, e.at && when(e.at)].filter(Boolean).join(' · ')}
                    </s-text>
                  </s-stack>
                ))}
              </s-stack>
            </s-details>
          )}
        </s-stack>
      ) : (
        <s-text color="subdued">{t('unavailable')}</s-text>
      )}
      {shipment.carrierUrl && (
        <s-link href={shipment.carrierUrl} target="_blank">
          {t('trackOnCarrier')}
        </s-link>
      )}
    </s-stack>
  );
}
