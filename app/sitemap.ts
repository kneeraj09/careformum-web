import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { cityToSlug } from '@/app/care-homes/in/[city]/page'
import { cityToSlug as homeCareSlug } from '@/app/home-care/in/[city]/page'

const SITE_URL = 'https://www.careformum.com'

const TOP_CITIES = [
  'London','Birmingham','Nottingham','Liverpool','Bristol','Leicester',
  'Southampton','Glasgow','Manchester','Leeds','Sheffield','Coventry',
  'Norwich','Wolverhampton','Preston','Stoke-on-Trent','Newcastle upon Tyne',
  'Derby','Bradford','Cambridge','Reading','Poole','Ipswich','Edinburgh',
  'Walsall','Stockport','Oxford','Chelmsford','Bournemouth','Aylesbury',
  'Dudley','Solihull','Doncaster','Colchester','Worthing','Eastbourne',
  'Lincoln','Worcester','York','Swansea','Blackpool','Exeter','Wigan',
  'Northampton','Southport','Bedford','Chesterfield','Leamington Spa',
  'Hull','Huddersfield','Slough','Sunderland','Plymouth','Milton Keynes',
  'Oldham','Warrington','Belfast','Stockton-on-Tees','Barnsley','Watford',
  'Cardiff','Portsmouth','Maidstone','Harrow','Ilford','Shrewsbury',
  'Aberdeen','Luton','Harrogate','Newport','Wirral','Romford','Telford',
  'Gravesend','Salisbury','Chester','Cheltenham','Enfield',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  // Care home city landing pages
  const cityRoutes: MetadataRoute.Sitemap = TOP_CITIES.map(city => ({
    url: `${SITE_URL}/care-homes/in/${cityToSlug(city)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }))

  // Home care section
  const homeCareRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/home-care`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/home-care/search`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.85,
    },
    ...TOP_CITIES.map(city => ({
      url: `${SITE_URL}/home-care/in/${homeCareSlug(city)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]

  // Fetch all care home place_ids for dynamic routes
  // Paginate in batches of 1000
  const careHomeRoutes: MetadataRoute.Sitemap = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('care_homes')
      .select('place_id, updated_at')
      .eq('service_type', 'residential')
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error || !data || data.length === 0) break

    for (const row of data) {
      careHomeRoutes.push({
        url: `${SITE_URL}/care-homes/${row.place_id}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    }

    if (data.length < pageSize) break
    page++
  }

  return [...staticRoutes, ...cityRoutes, ...homeCareRoutes, ...careHomeRoutes]
}
