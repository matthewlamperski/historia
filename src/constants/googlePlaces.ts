/**
 * Google Places API key.
 *
 * Required for:
 *  - SetHometownScreen — city autocomplete search
 *  - SetHometownScreen — reverse geocoding when user drags the map pin
 *
 * Setup:
 *  1. Go to https://console.cloud.google.com/ → APIs & Services → Credentials
 *  2. Create (or reuse) an API key restricted to your iOS bundle ID / Android package
 *  3. Enable "Places API" and "Geocoding API" for the project
 *  4. Paste the key below
 *
 * The key is included in the client bundle (React Native), so restrict it to
 * your app's bundle ID / package name to prevent abuse.
 */
export const GOOGLE_PLACES_API_KEY = 'AIzaSyBeC7TakaBndJJI45JFa0dQR27sSWWbEMg';
