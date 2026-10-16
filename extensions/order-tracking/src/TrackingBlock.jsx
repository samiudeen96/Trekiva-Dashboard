import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {APP_URL} from './config.js';

export default async () => {
  render(<Tracking />, document.body);
};

const t = (key, options) => shopify.i18n.translate(key, options);

// The four steps of a normal delivery, in order.
const STEPS = ['confirmed', 'shipped', 'out_for_delivery', 'delivered'];

const STAGE_ICON = {
  confirmed: 'order',
  shipped: 'delivery',
  out_for_delivery: 'delivery',
  delivered: 'check-circle',
  exception: 'alert-circle',
  returning: 'return',
  cancelled: 'alert-circle',
  unknown: 'info',
};

// Only these stages have an explanatory notice.
const NOTICE_STAGES = ['exception', 'returning', 'cancelled'];

async function fetchShipments(orderId) {
  const token = await shopify.sessionToken.get();
  const res = await fetch(
    `${APP_URL}/api/tracking?orderId=${encodeURIComponent(orderId)}`,
    {headers: {Authorization: `Bearer ${token}`}},
  );
  if (!res.ok) throw new Error(`Tracking API ${res.status}`);
  return (await res.json()).shipments;
}

function when(iso) {
  return shopify.i18n.formatDate(new Date(iso), {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// The estimate is a date, not a moment, so no time of day.
function day(iso) {
  return shopify.i18n.formatDate(new Date(iso), {dateStyle: 'medium'});
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

  // Customers only see this block when there is something to show. In the
  // editor preview the person setting things up needs to know why it is blank,
  // so it explains itself there instead of disappearing.
  const inEditor = Boolean(shopify.extension.editor);
  if (state.phase === 'ready' && !state.shipments.length) {
    return inEditor ? (
      <s-section heading={t('title')}>
        <s-text color="subdued">{t('editorNoShipments')}</s-text>
      </s-section>
    ) : null;
  }

  // Tracking is a bonus on the order page, so a failure must not put an error
  // in front of customers. It is still shown in the editor preview.
  if (state.phase === 'error' && !inEditor) return null;

  const shipments = state.shipments ?? [];
  return (
    <s-section heading={t('title')}>
      {state.phase === 'loading' && (
        <s-stack gap="base">
          <s-skeleton-paragraph />
          <s-skeleton-paragraph />
        </s-stack>
      )}
      {state.phase === 'error' && (
        <s-banner tone="critical">
          <s-stack gap="small">
            <s-text>{t('loadError')}</s-text>
            <s-text color="subdued">{t('editorOnly')}</s-text>
            <s-button click={load}>{t('retry')}</s-button>
          </s-stack>
        </s-banner>
      )}
      {state.phase === 'ready' && (
        <s-stack gap="large">
          {shipments.map((s, i) => (
            <Shipment
              key={`${s.fulfillmentId}:${s.number}`}
              shipment={s}
              index={i + 1}
              total={shipments.length}
            />
          ))}
        </s-stack>
      )}
    </s-section>
  );
}

function Shipment({shipment, index, total}) {
  const {tracking} = shipment;
  const carrier = shipment.company ?? tracking?.carrier ?? '';

  return (
    <s-box padding="base" border="base" borderRadius="large" background="subdued">
      <s-stack gap="base">
        <s-stack gap="small-300">
          {total > 1 && (
            <s-text color="subdued">
              {t('shipmentOf', {index, total})}
            </s-text>
          )}
          <s-text color="subdued">
            {[carrier, t('number', {number: shipment.number})]
              .filter(Boolean)
              .join(' · ')}
          </s-text>
        </s-stack>

        {tracking ? (
          <Live tracking={tracking} shipment={shipment} carrier={carrier} />
        ) : (
          <s-stack gap="small-200">
            <s-stack direction="inline" gap="small" alignItems="center">
              <s-icon type="info" />
              <s-heading>{t('unavailableTitle')}</s-heading>
            </s-stack>
            <s-text color="subdued">{t('unavailableBody')}</s-text>
          </s-stack>
        )}

        {shipment.carrierUrl && (
          <s-stack direction="inline">
            <s-button variant="secondary" href={shipment.carrierUrl} target="_blank">
              {t('trackOnCarrier')}
            </s-button>
          </s-stack>
        )}
      </s-stack>
    </s-box>
  );
}

function Live({tracking, shipment, carrier}) {
  const stepIndex = STEPS.indexOf(tracking.stage);
  const onTrack = stepIndex >= 0;
  const notice = NOTICE_STAGES.includes(tracking.stage)
    ? t(`notices.${tracking.stage}`)
    : null;

  return (
    <s-stack gap="base">
      <s-stack gap="small-200">
        <s-stack direction="inline" gap="small" alignItems="center">
          <s-icon type={STAGE_ICON[tracking.stage] ?? 'info'} />
          <s-heading>{t(`stages.${tracking.stage}`)}</s-heading>
        </s-stack>
        {/* The carrier's own wording, so nothing is paraphrased away. */}
        <s-text color="subdued">
          {t('carrierSays', {carrier: carrier || tracking.carrier, status: tracking.label})}
        </s-text>
      </s-stack>

      {onTrack && <Stepper events={tracking.events} at={stepIndex} />}

      {!onTrack && notice && (
        <s-banner tone={tracking.stage === 'exception' ? 'critical' : 'info'}>
          <s-text>{notice}</s-text>
        </s-banner>
      )}

      <s-grid gridTemplateColumns="repeat(auto-fit, minmax(160px, 1fr))" gap="base">
        {tracking.estimatedDelivery && tracking.stage !== 'delivered' && (
          <Fact icon="calendar" label={t('expected')} value={day(tracking.estimatedDelivery)} />
        )}
        {tracking.lastUpdate && (
          <Fact icon="clock" label={t('lastUpdated')} value={when(tracking.lastUpdate)} />
        )}
      </s-grid>

      {shipment.stale && shipment.syncedAt && (
        <s-banner tone="warning">
          <s-text>{t('stale', {date: when(shipment.syncedAt)})}</s-text>
        </s-banner>
      )}

      {tracking.events.length > 0 && <History events={tracking.events} />}
    </s-stack>
  );
}

const STEP_ICON = {
  confirmed: 'order',
  shipped: 'truck',
  out_for_delivery: 'delivery',
  delivered: 'delivered',
};

// Short date for a step, such as "13 Oct".
function shortDay(iso) {
  return shopify.i18n.formatDate(new Date(iso), {day: 'numeric', month: 'short'});
}

// The earliest event the carrier reported for a step, or null. Events are newest first.
function stepDate(events, step) {
  let found = null;
  for (const e of events ?? []) {
    if (e.stage === step && e.at) found = e.at;
  }
  return found;
}

// A thin connecting line between two steps. Thicker once that stretch is done.
function Line({show, on}) {
  if (!show) return <s-box />;
  return (
    <s-box
      border="base"
      borderWidth={on ? 'large none none none' : 'base none none none'}
      borderRadius="max"
    />
  );
}

// Four steps: a green check for each one reached, a larger icon on the current
// step, an empty circle for the ones still to come, and the carrier's real date
// under every step that has been reached.
function Stepper({events, at}) {
  const last = STEPS.length - 1;
  return (
    <s-grid
      gridTemplateColumns="repeat(4, 1fr)"
      gap="none"
      alignItems="start"
      accessibilityLabel={t('progressLabel')}
    >
      {STEPS.map((step, i) => {
        const finished = i < at || (i === at && at === last);
        const current = i === at && !finished;
        const date = i <= at ? stepDate(events, step) : null;
        return (
          <s-stack key={step} alignItems="center" gap="small-300">
            <s-grid
              gridTemplateColumns="1fr auto 1fr"
              alignItems="center"
              gap="none"
              inlineSize="100%"
            >
              <Line show={i > 0} on={i > 0 && i <= at} />
              {finished ? (
                <s-icon type="check-circle-filled" tone="success" size="large" />
              ) : current ? (
                <s-icon type={STEP_ICON[step]} tone="info" size="large-100" />
              ) : (
                <s-icon type="circle" tone="neutral" size="large" />
              )}
              <Line show={i < last} on={i < at} />
            </s-grid>
            <s-text
              type={current ? 'strong' : undefined}
              color={i <= at ? undefined : 'subdued'}
            >
              {t(`steps.${step}`)}
            </s-text>
            {date && (
              <s-text color="subdued" type="small">
                {shortDay(date)}
              </s-text>
            )}
          </s-stack>
        );
      })}
    </s-grid>
  );
}

function Fact({icon, label, value}) {
  return (
    <s-box padding="small" border="base" borderRadius="base" background="base">
      <s-stack direction="inline" gap="small" alignItems="center">
        <s-icon type={icon} />
        <s-stack gap="small-300">
          <s-text color="subdued">{label}</s-text>
          <s-text type="strong">{value}</s-text>
        </s-stack>
      </s-stack>
    </s-box>
  );
}

function History({events}) {
  return (
    <s-details>
      <s-summary>{t('history', {count: events.length})}</s-summary>
      <s-stack gap="base">
        {events.map((e, i) => (
          <s-stack key={i} direction="inline" gap="small" alignItems="start">
            <s-icon type={STAGE_ICON[e.stage] ?? 'info'} />
            <s-stack gap="small-300">
              <s-text type="strong">{e.label}</s-text>
              {e.description && <s-text>{e.description}</s-text>}
              <s-text color="subdued">
                {[e.location, e.at && when(e.at)].filter(Boolean).join(' · ')}
              </s-text>
            </s-stack>
          </s-stack>
        ))}
      </s-stack>
    </s-details>
  );
}
