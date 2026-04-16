import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'

const SITE_URL = 'https://www.careformum.com'

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

  // Fetch all care home place_ids for dynamic routes
  // Paginate in batches of 1000
  const careHomeRoutes: MetadataRoute.Sitemap = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('care_homes')
      .select('place_id, updated_at')
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

  return [...staticRoutes, ...careHomeRoutes]
}
