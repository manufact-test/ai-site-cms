import {renderPage, metadataFor, routeFromSlug} from '../../lib/runtime.js';
export const dynamic = 'force-dynamic';
export async function generateMetadata({params}) {
  return metadataFor(routeFromSlug((await params).slug));
}
export default async function Page({params}) {
  return renderPage(routeFromSlug((await params).slug), true);
}
