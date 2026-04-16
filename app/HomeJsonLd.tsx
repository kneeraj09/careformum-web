// Server component — injects JSON-LD into <head> area for the home page
export default function HomeJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://www.careformum.com/#organization',
        name: 'Careformum',
        url: 'https://www.careformum.com',
        logo: {
          '@type': 'ImageObject',
          url: 'https://www.careformum.com/images/logo.png',
          width: 600,
          height: 400,
        },
        description:
          'UK care home directory specialising in care homes for women. Search 4,000+ homes by location and services.',
        areaServed: {
          '@type': 'Country',
          name: 'United Kingdom',
        },
      },
      {
        '@type': 'WebSite',
        '@id': 'https://www.careformum.com/#website',
        url: 'https://www.careformum.com',
        name: 'Careformum',
        description: 'UK Care Home Directory — specialising in women-only and women-friendly care homes.',
        publisher: { '@id': 'https://www.careformum.com/#organization' },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://www.careformum.com/search?city={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
        inLanguage: 'en-GB',
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
