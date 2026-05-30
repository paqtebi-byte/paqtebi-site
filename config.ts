
// Application Configuration

export const APP_CONFIG = {
  name: "Paqtebi",
  description: "ობიექტური და ოპერატიული ინფორმაცია მსოფლიოს ნებისმიერი წერტილიდან.",
  currency: {
    usd: 2.7150,
    eur: 2.9430
  }
};

export const API_ENDPOINTS = {
  weather: 'https://api.open-meteo.com/v1/forecast?latitude=41.6941&longitude=44.8337&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto'
};

// Navigation Structure used by both Header (App.tsx) and Admin Panel (AdminDashboard.tsx)
export const NAV_ITEMS = [
  {
    title: "სიახლეები",
    links: ["საქართველო", "მსოფლიო", "პოლიტიკა", "კრიმინალი", "ეკონომიკა"]
  },
  {
    title: "სპორტი",
    links: ["ფეხბურთი", "სხვა სპორტი"]
  },
  {
    title: "კულტურა",
    links: ["კინო/მუსიკა", "ხელოვნება", "ტრადიციები"]
  },
  {
    title: "მეცნიერება",
    links: ["ტექნოლოგიები", "ჯანმრთელობა"]
  },
  {
    title: "აზრი",
    links: ["სვეტები", "ინტერვიუები", "ანალიტიკა"]
  },
  {
    title: "მედია",
    links: ["ვიდეო რეპორტაჟები", "პოდკასტები", "საინტერესო", "LIVE"]
  },
];

// Helper to transform NAV_ITEMS into a Record<string, string[]> for Admin dropdowns
export const CATEGORY_GROUPS: Record<string, string[]> = {};
NAV_ITEMS.forEach(item => {
  CATEGORY_GROUPS[item.title] = item.links;
});

// Categories for the Main Feed Filter (all subcategories flattened)
export const FEED_CATEGORIES = [
  'ყველა',
  // სიახლეები
  'საქართველო',
  'მსოფლიო',
  'პოლიტიკა',
  'კრიმინალი',
  'ეკონომიკა',
  // სპორტი
  'ფეხბურთი',
  'სხვა სპორტი',
  // კულტურა
  'კინო/მუსიკა',
  'ხელოვნება',
  'ტრადიციები',
  // მეცნიერება
  'ტექნოლოგიები',
  'ჯანმრთელობა',
  // აზრი
  'სვეტები',
  'ინტერვიუები',
  'ანალიტიკა',
  // მედია
  'ვიდეო რეპორტაჟები',
  'პოდკასტები',
  'საინტერესო',
  'LIVE',
];
