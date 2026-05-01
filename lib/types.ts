export type ServiceValue = 'Yes' | 'No' | 'Unknown'
export type GenderFocus = 'women_only' | 'women_friendly' | 'mixed'
export type ServiceType = 'residential' | 'domiciliary' | 'sheltered_housing'

export interface CareHome {
  place_id: string
  google_id: string | null
  name: string
  street: string | null
  city: string | null
  county: string | null
  postal_code: string | null
  country: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  phone: string | null
  website: string | null
  email: string | null
  domain: string | null
  gender_focus: GenderFocus | null
  service_type: ServiceType | null
  category: string | null
  subtypes: string | null
  rating: number | null
  reviews: number | null
  data_confidence: string | null
  description: string | null
  about: string | null
  working_hours: string | null
  key_selling_points: string | null
  additional_services: string | null
  image_count: number
  representative_image_url: string | null
  weekly_fee_from: number | null
  weekly_fee_to: number | null
  // Partnership
  is_partner: boolean | null
  // CQC inspection data
  cqc_location_id: string | null
  cqc_rating: string | null
  cqc_rating_date: string | null
  cqc_beds: number | null
  cqc_safe: string | null
  cqc_effective: string | null
  cqc_caring: string | null
  cqc_responsive: string | null
  cqc_well_led: string | null
  ci_service_id: string | null
  ci_grade: string | null
  ci_grade_date: string | null
  ci_care_support: string | null
  ci_environment: string | null
  ci_staffing: string | null
  ci_management: string | null
  // Core care types
  residential_care: ServiceValue
  nursing_care: ServiceValue
  dementia_care: ServiceValue
  respite_care: ServiceValue
  palliative_care: ServiceValue
  day_care: ServiceValue
  // Specialist conditions
  parkinsons_care: ServiceValue
  stroke_care: ServiceValue
  ms_care: ServiceValue
  physical_disability: ServiceValue
  sensory_impairment: ServiceValue
  learning_disability: ServiceValue
  bariatric_care: ServiceValue
  // Support types
  personal_care: ServiceValue
  supported_living: ServiceValue
  reablement_care: ServiceValue
  live_in_care: ServiceValue
  // Amenities
  physiotherapy: ServiceValue
  occupational_therapy: ServiceValue
  hairdressing: ServiceValue
  chiropody: ServiceValue
  chef_cooked_meals: ServiceValue
  en_suite_rooms: ServiceValue
  garden: ServiceValue
  activities_programme: ServiceValue
  cinema_room: ServiceValue
  // Funding
  nhs_funded: ServiceValue
  local_authority_funded: ServiceValue
  self_funded: ServiceValue
  created_at: string
}

export interface CareHomeImage {
  id: string
  place_id: string
  supabase_url: string
  image_type: string | null
  taxonomy_tags: string[]
  vision_reason: string | null
  width: number | null
  height: number | null
}

export const SERVICE_GROUPS = {
  'Core Care Types': [
    { key: 'residential_care', label: 'Residential Care' },
    { key: 'nursing_care', label: 'Nursing Care' },
    { key: 'dementia_care', label: 'Dementia Care' },
    { key: 'respite_care', label: 'Respite Care' },
    { key: 'palliative_care', label: 'Palliative Care' },
    { key: 'day_care', label: 'Day Care' },
  ],
  'Specialist Conditions': [
    { key: 'parkinsons_care', label: "Parkinson's Care" },
    { key: 'stroke_care', label: 'Stroke Care' },
    { key: 'ms_care', label: 'MS Care' },
    { key: 'physical_disability', label: 'Physical Disability' },
    { key: 'sensory_impairment', label: 'Sensory Impairment' },
    { key: 'learning_disability', label: 'Learning Disability' },
    { key: 'bariatric_care', label: 'Bariatric Care' },
  ],
  'Support Types': [
    { key: 'personal_care', label: 'Personal Care' },
    { key: 'supported_living', label: 'Supported Living' },
    { key: 'reablement_care', label: 'Reablement Care' },
    { key: 'live_in_care', label: 'Live-in Care' },
  ],
  'On-Site Amenities': [
    { key: 'physiotherapy', label: 'Physiotherapy' },
    { key: 'occupational_therapy', label: 'Occupational Therapy' },
    { key: 'hairdressing', label: 'Hairdressing' },
    { key: 'chiropody', label: 'Chiropody' },
    { key: 'chef_cooked_meals', label: 'Chef-Cooked Meals' },
    { key: 'en_suite_rooms', label: 'En-Suite Rooms' },
    { key: 'garden', label: 'Garden' },
    { key: 'activities_programme', label: 'Activities Programme' },
    { key: 'cinema_room', label: 'Cinema Room' },
  ],
  'Funding Options': [
    { key: 'nhs_funded', label: 'NHS Funded' },
    { key: 'local_authority_funded', label: 'Local Authority Funded' },
    { key: 'self_funded', label: 'Self Funded' },
  ],
} as const
