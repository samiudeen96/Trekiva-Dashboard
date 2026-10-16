import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { TRACK_PAGE_HTML } from "../utils/track-page";

// Storefront address /apps/track. Shopify signs every proxied request;
// appProxy() rejects anything that isn't genuinely from the store's storefront.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { liquid } = await authenticate.public.appProxy(request);
  return liquid(TRACK_PAGE_HTML);
};
