import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {getProducts, getWishlist, removeItem} from './api.js';

export default async () => {
  render(<Wishlist />, document.body);
};

const t = (key, options) => shopify.i18n.translate(key, options);

function Wishlist() {
  const [state, setState] = useState({phase: 'loading'});

  const load = async () => {
    setState({phase: 'loading'});
    try {
      const saved = await getWishlist();
      const ids = saved.map((s) => s.productId);
      const nodes = await getProducts(ids);
      setState({
        phase: 'ready',
        entries: ids.map((id, i) => ({id, product: nodes[i] ?? null})),
      });
    } catch {
      setState({phase: 'error'});
    }
  };
  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    try {
      await removeItem(id);
      setState((s) => ({...s, entries: s.entries.filter((e) => e.id !== id)}));
      shopify.toast.show(t('removed'));
    } catch {
      shopify.toast.show(t('removeError'), {isError: true});
    }
  };

  return (
    <s-page heading={t('pageTitle')}>
      <s-stack gap="large">
        <s-text color="subdued">{t('subtitle')}</s-text>
        {state.phase === 'loading' && <Loading />}
        {state.phase === 'error' && (
          <s-banner tone="critical">
            <s-stack gap="small">
              <s-text>{t('loadError')}</s-text>
              <s-button click={load}>{t('retry')}</s-button>
            </s-stack>
          </s-banner>
        )}
        {state.phase === 'ready' &&
          (state.entries.length ? (
            <s-grid gridTemplateColumns="repeat(auto-fill, minmax(220px, 1fr))" gap="base">
              {state.entries.map((e) => (
                <Card key={e.id} entry={e} onRemove={remove} />
              ))}
            </s-grid>
          ) : (
            <Empty />
          ))}
      </s-stack>
    </s-page>
  );
}

function Loading() {
  return (
    <s-section>
      <s-skeleton-paragraph />
      <s-skeleton-paragraph />
    </s-section>
  );
}

function Empty() {
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

function Card({entry, onRemove}) {
  const {product} = entry;
  if (!product) {
    return (
      <s-section>
        <s-stack gap="small">
          <s-text type="strong">{t('unavailableTitle')}</s-text>
          <s-text color="subdued">{t('unavailableBody')}</s-text>
          <s-button click={() => onRemove(entry.id)}>{t('remove')}</s-button>
        </s-stack>
      </s-section>
    );
  }
  const {amount, currencyCode} = product.priceRange.minVariantPrice;
  return (
    <s-section>
      <s-stack gap="small">
        {product.featuredImage && (
          <s-image
            src={product.featuredImage.url}
            alt={product.featuredImage.altText ?? product.title}
            aspectRatio="1"
            objectFit="cover"
          />
        )}
        <s-text type="strong">{product.title}</s-text>
        <s-text>
          {shopify.i18n.formatCurrency(Number(amount), {currency: currencyCode})}
        </s-text>
        <s-badge tone={product.availableForSale ? 'success' : 'neutral'}>
          {product.availableForSale ? t('inStock') : t('soldOut')}
        </s-badge>
        <s-stack direction="inline" gap="small-200">
          {product.onlineStoreUrl && (
            <s-button href={product.onlineStoreUrl}>{t('viewProduct')}</s-button>
          )}
          <s-button variant="secondary" click={() => onRemove(entry.id)}>
            {t('remove')}
          </s-button>
        </s-stack>
      </s-stack>
    </s-section>
  );
}
