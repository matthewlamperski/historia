const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { parse } = require('papaparse');

// Initialize Firebase Admin SDK
const serviceAccount = require('./historia-application-firebase-adminsdk-fbsvc-5232516847.json'); // You'll need to add this file
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'historia-application'
});

const db = admin.firestore();

// Function to convert strings to camelCase
const convertToCamelCase = (str) => {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[^a-zA-Z0-9]+/, '');
};

// Function to geocode an address using Nominatim (OpenStreetMap)
const geocodeAddress = async (address, city, state, county) => {
  return new Promise(async (resolve) => {
    // Skip if address is restricted or empty
    if (!address || address.toLowerCase().includes('restricted') || address.trim() === '') {
      resolve({ latitude: null, longitude: null, geocoded: false, reason: 'No valid address' });
      return;
    }

    // Clean up state format (ALABAMA -> Alabama)
    const cleanState = state ? state.charAt(0).toUpperCase() + state.slice(1).toLowerCase() : '';
    const cleanCity = city ? city.trim() : '';
    const cleanAddress = address ? address.trim() : '';

    // Try multiple geocoding strategies
    const strategies = [
      // Strategy 1: Full address as provided
      [cleanAddress, cleanCity, cleanState].filter(Boolean).join(', '),
      
      // Strategy 2: Just city and state for descriptive locations
      [cleanCity, cleanState].filter(Boolean).join(', '),
      
      // Strategy 3: Try with property name if it looks like a specific building
      // Strategy 4: For multiple addresses, try just the first one
      cleanAddress.includes(',') ? 
        [cleanAddress.split(',')[0].trim(), cleanCity, cleanState].filter(Boolean).join(', ') : null,
        
      // Strategy 5: Remove descriptive parts and try simpler location
      cleanAddress.includes('mi.') || cleanAddress.includes('km') ?
        [cleanCity, cleanState].filter(Boolean).join(', ') : null
    ].filter(Boolean);

    console.log(`  🌐 Trying ${strategies.length} geocoding strategies`);

    for (let i = 0; i < strategies.length; i++) {
      const query = strategies[i];
      const encodedQuery = encodeURIComponent(query);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1&countrycodes=us`;
      
      console.log(`  📡 Strategy ${i + 1}: "${query}"`);
      
      try {
        const result = await makeGeocodingRequest(url);
        if (result.success && result.data.length > 0) {
          console.log(`  ✅ Success with strategy ${i + 1}`);
          resolve({
            latitude: parseFloat(result.data[0].lat),
            longitude: parseFloat(result.data[0].lon),
            geocoded: true,
            displayName: result.data[0].display_name,
            strategy: i + 1
          });
          return;
        }
      } catch (error) {
        console.log(`  ❌ Strategy ${i + 1} failed: ${error.message}`);
      }
      
      // Add small delay between attempts
      await delay(200);
    }

    resolve({ latitude: null, longitude: null, geocoded: false, reason: 'All geocoding strategies failed' });
  });
};

// Helper function to make HTTP requests
const makeGeocodingRequest = (url) => {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Historia App Landmark Geocoder (contact@historia-app.com)'
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const results = JSON.parse(data);
          resolve({ success: true, data: results });
        } catch (error) {
          reject(new Error('Parse error'));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
};

// Add delay to respect API rate limits
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function uploadLandmarks() {
  try {
    // Read the CSV file
    const csvPath = path.join(__dirname, 'src', 'National-Historic-Landmarks_20250624.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    console.log('Reading CSV file...');
    
    // Parse CSV
    const results = parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    console.log(`Found ${results.data.length} records to process`);

    let successCount = 0;
    let errorCount = 0;
    let geocodedCount = 0;
    let batch = db.batch();
    const batchSize = 50; // Smaller batches for better progress tracking
    let batchCount = 0;

    for (let i = 0; i < results.data.length; i++) {
      try {
        const row = results.data[i];
        const document = {};
        
        // Convert each column to camelCase and filter out empty values
        Object.entries(row).forEach(([key, value]) => {
          if (value && value.toString().trim() !== '') {
            const camelKey = convertToCamelCase(key);
            document[camelKey] = value.toString().trim();
          }
        });

        // Add document to batch if it has content
        if (Object.keys(document).length > 0) {
          // Try to geocode the address - note the trailing space in "City " column
          const address = row['Street & Number'];
          const city = row['City ']; // Note the trailing space in CSV header
          const state = row.State;
          const county = row.County;
          
          console.log(`\n📍 Processing ${i + 1}/${results.data.length}: ${document.propertyName || 'Unknown'}`);
          console.log(`  📍 Address: "${address}"`);
          console.log(`  🏙️  City: "${city}"`);
          console.log(`  🗺️  State: "${state}"`);
          
          // Geocode the address
          const geoResult = await geocodeAddress(address, city, state, county);
          
          // Add geocoding results to document
          if (geoResult.geocoded) {
            document.latitude = geoResult.latitude;
            document.longitude = geoResult.longitude;
            document.geocodedAddress = geoResult.displayName;
            document.geocoded = true;
            geocodedCount++;
            console.log(`  ✅ Geocoded: ${geoResult.latitude}, ${geoResult.longitude}`);
          } else {
            document.geocoded = false;
            document.geocodingFailureReason = geoResult.reason;
            console.log(`  ❌ Failed to geocode: ${geoResult.reason}`);
          }
          
          const docRef = db.collection('landmarks').doc();
          batch.set(docRef, document);
          batchCount++;
          
          // Execute batch when it reaches the limit
          if (batchCount >= batchSize) {
            await batch.commit();
            successCount += batchCount;
            console.log(`\n📦 Uploaded batch: ${successCount} total records processed, ${geocodedCount} geocoded\n`);
            batchCount = 0;
            batch = db.batch(); // Create a new batch after committing
          }
          
          // Add delay to respect Nominatim rate limits (allow faster processing with multiple strategies)
          await delay(800);
        }
      } catch (rowError) {
        console.error('Error processing row:', rowError);
        errorCount++;
      }
    }

    // Commit any remaining documents in the batch
    if (batchCount > 0) {
      await batch.commit();
      successCount += batchCount;
    }
    
    console.log(`\n🎉 Upload completed!`);
    console.log(`✅ Success: ${successCount} landmarks uploaded`);
    console.log(`🌍 Geocoded: ${geocodedCount} landmarks with coordinates`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📍 Geocoding success rate: ${((geocodedCount / successCount) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('Error uploading landmarks:', error);
  } finally {
    process.exit(0);
  }
}

// Run the upload
uploadLandmarks();