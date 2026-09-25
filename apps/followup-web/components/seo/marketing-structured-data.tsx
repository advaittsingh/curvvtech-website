import { JsonLd } from '#components/seo/json-ld'
import { softwareApplicationJsonLd, websiteJsonLd } from '#lib/seo'

export function MarketingStructuredData() {
  return <JsonLd data={[softwareApplicationJsonLd, websiteJsonLd]} />
}
