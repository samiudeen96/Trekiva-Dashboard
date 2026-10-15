import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {getReturnState, submitReturn} from './api.js';

export default async () => {
  render(<ReturnsPage />, document.body);
};

const t = (key, options) => shopify.i18n.translate(key, options);
const REASONS = ['size', 'damaged', 'wrong_item', 'other'];

function ReturnsPage() {
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
      setState({phase: 'ready', data: await getReturnState(orderId)});
    } catch {
      setState({phase: 'error'});
    }
  };
  useEffect(() => {
    load();
  }, [orderId]);

  return (
    <s-page heading={t('pageTitle')}>
      <s-grid gridTemplateColumns="minmax(auto, 720px)" justifyContent="center">
        <s-stack gap="large">
          {state.phase === 'loading' && (
            <s-section>
              <s-skeleton-paragraph />
              <s-skeleton-paragraph />
            </s-section>
          )}
          {state.phase === 'error' && (
            <s-banner tone="critical">
              <s-stack gap="small">
                <s-text>{t('loadError')}</s-text>
                <s-button click={load}>{t('retry')}</s-button>
              </s-stack>
            </s-banner>
          )}
          {state.phase === 'ready' && (
            <Content data={state.data} orderId={orderId} onChanged={load} />
          )}
        </s-stack>
      </s-grid>
    </s-page>
  );
}

function Content({data, orderId, onChanged}) {
  const {eligibility, requests} = data;
  return (
    <s-stack gap="large">
      <s-text color="subdued">{t('forOrder', {order: data.orderName})}</s-text>
      {eligibility.open ? (
        <RequestForm
          data={data}
          orderId={orderId}
          lines={eligibility.lines}
          onChanged={onChanged}
        />
      ) : (
        <s-banner tone="info">
          <s-text>{t(`closed.${eligibility.reason}`)}</s-text>
        </s-banner>
      )}
      {requests.length > 0 && (
        <s-section heading={t('previous')}>
          <s-stack gap="base">
            {requests.map((r) => (
              <s-stack key={r.reference} gap="small-200">
                <s-text type="strong">
                  {r.reference} · {t(`types.${r.type}`)}
                </s-text>
                {r.items.map((i) => (
                  <s-text key={i.title}>
                    {i.quantity} × {i.title}
                  </s-text>
                ))}
                <s-badge tone={r.status === 'approved' ? 'success' : 'neutral'}>
                  {t(`status.${r.status}`)}
                </s-badge>
              </s-stack>
            ))}
          </s-stack>
        </s-section>
      )}
    </s-stack>
  );
}

function RequestForm({data, orderId, lines, onChanged}) {
  const [type, setType] = useState('return');
  const [reason, setReason] = useState('size');
  const [details, setDetails] = useState('');
  const [quantities, setQuantities] = useState({});
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState({phase: 'idle'});

  const chosen = Object.entries(quantities)
    .filter(([, q]) => q > 0)
    .map(([lineItemId, quantity]) => ({lineItemId, quantity}));

  const send = async () => {
    setTouched(true);
    if (!chosen.length) return;
    setStatus({phase: 'sending'});
    try {
      const reference = await submitReturn({
        orderId,
        type,
        reason,
        details: details.trim(),
        items: chosen,
      });
      setStatus({phase: 'done', reference});
    } catch (error) {
      setStatus({phase: 'error', key: error.code in t_errors ? error.code : 'generic'});
    }
  };

  if (status.phase === 'done') {
    return (
      <s-section heading={t('sent')}>
        <s-stack gap="base">
          <s-banner tone="success">
            <s-text>{t('sentBody', {reference: status.reference})}</s-text>
          </s-banner>
          <s-button variant="secondary" click={onChanged}>
            OK
          </s-button>
        </s-stack>
      </s-section>
    );
  }

  return (
    <s-section>
      <s-stack gap="base">
        <s-banner tone="info">
          <s-text>{t('reviewNotice')}</s-text>
        </s-banner>
        {status.phase === 'error' && (
          <s-banner tone="critical">
            <s-text>{t(`errors.${status.key}`)}</s-text>
          </s-banner>
        )}
        {data.exchangesEnabled && (
          <s-select
            label={t('type')}
            value={type}
            onChange={(e) => setType(e.currentTarget.value)}
          >
            <s-option value="return">{t('types.return')}</s-option>
            <s-option value="exchange">{t('types.exchange')}</s-option>
          </s-select>
        )}
        <s-stack gap="small">
          <s-text type="strong">{t('items')}</s-text>
          {lines.map((line) =>
            line.available > 0 ? (
              <s-number-field
                key={line.id}
                label={line.title}
                details={t('quantity', {max: line.available})}
                min={0}
                max={line.available}
                step={1}
                value={String(quantities[line.id] ?? 0)}
                onInput={(e) => {
                  const n = Math.min(
                    line.available,
                    Math.max(0, Math.floor(Number(e.currentTarget.value) || 0)),
                  );
                  setQuantities((q) => ({...q, [line.id]: n}));
                }}
              />
            ) : (
              <s-stack key={line.id} gap="small-300">
                <s-text>{line.title}</s-text>
                <s-text color="subdued">
                  {line.reason === 'final_sale' ? t('finalSale') : t('noneLeft')}
                </s-text>
              </s-stack>
            ),
          )}
          {touched && !chosen.length && (
            <s-text tone="critical">{t('noneSelected')}</s-text>
          )}
        </s-stack>
        <s-select
          label={t('reason')}
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
        >
          {REASONS.map((r) => (
            <s-option key={r} value={r}>
              {t(`reasons.${r}`)}
            </s-option>
          ))}
        </s-select>
        <s-text-area
          label={t('details')}
          rows={3}
          maxLength={1000}
          value={details}
          onInput={(e) => setDetails(e.currentTarget.value)}
        />
        <s-button
          loading={status.phase === 'sending'}
          disabled={status.phase === 'sending'}
          click={send}
        >
          {t('submit')}
        </s-button>
      </s-stack>
    </s-section>
  );
}

const t_errors = {ineligible: 1, invalid: 1, exchange_disabled: 1};
