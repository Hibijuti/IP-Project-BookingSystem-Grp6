// ===================================================
// K-SOUNDRENTALS — Clean OpenStreetMap Venue Pin-Picker
// ===================================================

const LAPU_LAPU_CENTER = [10.3115, 123.9535];

export function initVenueMap() {
  const mapContainer = document.getElementById('osm-map');
  if (!mapContainer || typeof window.L === 'undefined') return;

  const L = window.L;
  const addressInput = document.getElementById('input-address');
  const mapLinkInput = document.getElementById('input-map-link');
  const searchInput = document.getElementById('map-search-input') || addressInput;
  const searchBtn = document.getElementById('map-search-btn');
  const locateBtn = document.getElementById('map-locate-btn');

  // Initialize Leaflet Map
  const map = L.map(mapContainer, {
    center: LAPU_LAPU_CENTER,
    zoom: 13,
    scrollWheelZoom: false,
    zoomControl: true
  });

  // Official OpenStreetMap tile layer
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a>',
    maxZoom: 19
  }).addTo(map);

  // Clean pin marker
  const customPinIcon = L.divIcon({
    className: 'simple-map-pin',
    html: `
      <div class="pin-marker">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="#ff8c00" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3" fill="#ffffff"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 26]
  });

  const marker = L.marker(LAPU_LAPU_CENTER, {
    draggable: true,
    icon: customPinIcon
  }).addTo(map);

  async function updatePinDetails(lat, lng, shouldReverseGeocode = true) {
    const fixedLat = Number(lat).toFixed(6);
    const fixedLng = Number(lng).toFixed(6);
    const gmapsUrl = `https://www.google.com/maps?q=${fixedLat},${fixedLng}`;

    if (mapLinkInput) {
      mapLinkInput.value = gmapsUrl;
    }

    if (!shouldReverseGeocode) return;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${fixedLat}&lon=${fixedLng}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data.display_name && addressInput) {
        const shortAddr = data.display_name
          .split(',')
          .slice(0, 4)
          .map((s) => s.trim())
          .join(', ');
        addressInput.value = shortAddr;
        addressInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch {
      if (addressInput && !addressInput.value.trim()) {
        addressInput.value = `Pinned Venue (${fixedLat}, ${fixedLng}), Lapu-Lapu City`;
      }
    }
  }

  // Initial set
  updatePinDetails(LAPU_LAPU_CENTER[0], LAPU_LAPU_CENTER[1], false);

  // Click on map to drop pin
  map.on('click', (e) => {
    const { lat, lng } = e.latlng;
    marker.setLatLng([lat, lng]);
    updatePinDetails(lat, lng, true);
  });

  // Drag pin
  marker.on('dragend', () => {
    const pos = marker.getLatLng();
    updatePinDetails(pos.lat, pos.lng, true);
  });

  // Search for Lapu-Lapu locations using the unified input
  async function runMapSearch() {
    const query = searchInput?.value?.trim();
    if (!query) return;

    const searchQuery = /lapu|mactan|cebu/i.test(query)
      ? query
      : `${query}, Lapu-Lapu City, Cebu`;

    if (searchBtn) searchBtn.classList.add('loading');

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&countrycodes=ph&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const results = await res.json();

      if (results && results.length > 0) {
        const lat = parseFloat(results[0].lat);
        const lng = parseFloat(results[0].lon);

        map.flyTo([lat, lng], 16, { duration: 0.7 });
        marker.setLatLng([lat, lng]);

        if (addressInput) {
          addressInput.value = results[0].display_name
            .split(',')
            .slice(0, 4)
            .map((s) => s.trim())
            .join(', ');
          addressInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        updatePinDetails(lat, lng, false);
      }
    } catch {
      // Keep typed address as-is if search fails
    } finally {
      if (searchBtn) searchBtn.classList.remove('loading');
    }
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', runMapSearch);
  }

  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        runMapSearch();
      }
    });
  }

  // Floating "Use GPS" button
  if (locateBtn) {
    locateBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }
      const origHtml = locateBtn.innerHTML;
      locateBtn.innerHTML = `<span>Locating...</span>`;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.flyTo([latitude, longitude], 16, { duration: 0.7 });
          marker.setLatLng([latitude, longitude]);
          updatePinDetails(latitude, longitude, true);
          locateBtn.innerHTML = origHtml;
        },
        () => {
          locateBtn.innerHTML = origHtml;
          alert('Unable to access GPS. Tap directly on the map to pin your location.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  setTimeout(() => map.invalidateSize(), 250);
  window.refreshVenueMap = () => {
    setTimeout(() => map.invalidateSize(), 80);
  };
}
