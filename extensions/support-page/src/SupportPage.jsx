import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {fetchOrders, submitTicket} from './api.js';

export default async () => {
  render(<Support />, document.body);
};

const t = (key, options) => shopify.i18n.translate(key, options);
const SUBJECTS = ['order', 'shipping', 'return', 'product', 'other'];
const MIN = 10;
const MAX = 2000;

function Support() {
  const settings = shopify.settings.value ?? {};
  const email = settings.support_email?.trim();
  const whatsapp = settings.whatsapp_number?.replace(/\D/g, '');
  const faq = settings.faq_url?.trim();
  const responseTime = settings.response_time_text?.trim();

  return (
    <s-page heading={t('pageTitle')}>
      <s-grid gridTemplateColumns="minmax(auto, 720px)" justifyContent="center">
        <s-stack gap="large">
          <s-stack gap="small-300">
            <s-text color="subdued">{t('subtitle')}</s-text>
            {responseTime && <s-text color="subdued">{responseTime}</s-text>}
          </s-stack>
          {(email || whatsapp || faq) && (
            <s-grid gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap="base">
              {email && (
                <Channel title={t('email')} href={`mailto:${email}`} label={email} />
              )}
              {whatsapp && (
                <Channel
                  title={t('whatsapp')}
                  href={`https://wa.me/${whatsapp}`}
                  label={t('whatsappAction')}
                />
              )}
              {faq && <Channel title={t('faqs')} href={faq} label={t('faqsAction')} />}
            </s-grid>
          )}
          <ContactForm />
        </s-stack>
      </s-grid>
    </s-page>
  );
}

function Channel({title, href, label}) {
  return (
    <s-section>
      <s-stack gap="small-200">
        <s-text type="strong">{title}</s-text>
        <s-link href={href}>{label}</s-link>
      </s-stack>
    </s-section>
  );
}

function ContactForm() {
  const [orders, setOrders] = useState([]);
  const [subject, setSubject] = useState('order');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState({phase: 'idle'});

  useEffect(() => {
    fetchOrders().then(setOrders).catch(() => setOrders([]));
  }, []);

  const messageValid =
    message.trim().length >= MIN && message.trim().length <= MAX;

  const send = async () => {
    setTouched(true);
    if (!messageValid || !consent) return;
    setStatus({phase: 'sending'});
    try {
      const reference = await submitTicket({
        subject,
        orderId: orderId || null,
        message: message.trim(),
        consent,
      });
      setStatus({phase: 'done', reference});
    } catch (error) {
      setStatus({
        phase: 'error',
        messageKey: error.code === 429 ? 'rateLimited' : 'submitError',
      });
    }
  };

  const reset = () => {
    setMessage('');
    setOrderId('');
    setConsent(false);
    setTouched(false);
    setStatus({phase: 'idle'});
  };

  if (status.phase === 'done') {
    return (
      <s-section heading={t('sent')}>
        <s-stack gap="base">
          <s-banner tone="success">
            <s-text>{t('sentBody', {reference: status.reference})}</s-text>
          </s-banner>
          <s-button variant="secondary" click={reset}>
            {t('another')}
          </s-button>
        </s-stack>
      </s-section>
    );
  }

  return (
    <s-section heading={t('formTitle')}>
      <s-stack gap="base">
        {status.phase === 'error' && (
          <s-banner tone="critical">
            <s-text>{t(status.messageKey)}</s-text>
          </s-banner>
        )}
        <s-select
          label={t('subject')}
          value={subject}
          onChange={(e) => setSubject(e.currentTarget.value)}
        >
          {SUBJECTS.map((s) => (
            <s-option key={s} value={s}>
              {t(`subjects.${s}`)}
            </s-option>
          ))}
        </s-select>
        <s-select
          label={t('relatedOrder')}
          value={orderId}
          onChange={(e) => setOrderId(e.currentTarget.value)}
        >
          <s-option value="">{t('noOrder')}</s-option>
          {orders.map((o) => (
            <s-option key={o.id} value={o.id}>
              {o.name}
            </s-option>
          ))}
        </s-select>
        <s-text-area
          label={t('message')}
          details={t('messageHelp')}
          rows={5}
          maxLength={MAX}
          value={message}
          error={touched && !messageValid ? t('messageError') : undefined}
          onInput={(e) => setMessage(e.currentTarget.value)}
        />
        <s-checkbox
          label={t('consent')}
          checked={consent}
          error={touched && !consent ? t('consentError') : undefined}
          onChange={(e) => setConsent(e.currentTarget.checked)}
        />
        <s-button
          loading={status.phase === 'sending'}
          disabled={status.phase === 'sending'}
          click={send}
        >
          {t('send')}
        </s-button>
      </s-stack>
    </s-section>
  );
}
