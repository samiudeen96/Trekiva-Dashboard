import '@shopify/ui-extensions/preact';
import {render} from 'preact';

export default async () => {
  render(<Action />, document.body);
};

function Action() {
  return (
    <s-button href="extension:returns-page/">
      {shopify.i18n.translate('label')}
    </s-button>
  );
}
