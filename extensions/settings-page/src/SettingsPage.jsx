import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {fetchSummary} from './api.js';

export default async () => {
  render(<Settings />, document.body);
};

const t = (key) => shopify.i18n.translate(key);

function Settings() {
  const [state, setState] = useState({phase: 'loading'});

  const load = () => {
    setState({phase: 'loading'});
    fetchSummary()
      .then((customer) => setState({phase: 'ready', customer}))
      .catch(() => setState({phase: 'error'}));
  };
  useEffect(load, []);

  const c = state.customer;
  const fullName = c && [c.firstName, c.lastName].filter(Boolean).join(' ');
  const address = c?.defaultAddress?.formatted;

  return (
    <s-page heading={t('pageTitle')}>
      <s-grid gridTemplateColumns="minmax(auto, 720px)" justifyContent="center">
        <s-stack gap="large">
          <s-text color="subdued">{t('subtitle')}</s-text>
          {state.phase === 'error' && (
            <s-banner tone="warning">
              <s-stack gap="small">
                <s-text>{t('loadError')}</s-text>
                <s-button click={load}>{t('retry')}</s-button>
              </s-stack>
            </s-banner>
          )}
          <s-section heading={t('profile')}>
            {state.phase === 'loading' ? (
              <s-skeleton-paragraph />
            ) : (
              <s-stack gap="base">
                {c && (
                  <s-stack gap="small-200">
                    <Row label={t('name')} value={fullName} />
                    <Row label={t('email')} value={c.emailAddress?.emailAddress} />
                    <Row label={t('phone')} value={c.phoneNumber?.phoneNumber} />
                  </s-stack>
                )}
                <s-link href="shopify:customer-account/profile">
                  {t('manageProfile')}
                </s-link>
              </s-stack>
            )}
          </s-section>
          <s-section heading={t('addresses')}>
            {state.phase === 'loading' ? (
              <s-skeleton-paragraph />
            ) : (
              <s-stack gap="base">
                {c &&
                  (address?.length ? (
                    <s-stack gap="small-300">
                      {address.map((line) => (
                        <s-text key={line}>{line}</s-text>
                      ))}
                    </s-stack>
                  ) : (
                    <s-text color="subdued">{t('noAddress')}</s-text>
                  ))}
                <s-link href="shopify:customer-account/addresses">
                  {t('manageAddresses')}
                </s-link>
              </s-stack>
            )}
          </s-section>
        </s-stack>
      </s-grid>
    </s-page>
  );
}

function Row({label, value}) {
  return (
    <s-stack direction="inline" gap="base">
      <s-text color="subdued">{label}</s-text>
      <s-text>{value || t('notProvided')}</s-text>
    </s-stack>
  );
}
