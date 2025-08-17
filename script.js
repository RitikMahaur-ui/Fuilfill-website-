// ====== Services Collapsible Buttons (unchanged behavior) ======
const serviceButtons = document.querySelectorAll('.service-btn');

serviceButtons.forEach(button => {
  button.addEventListener('click', () => {
    const content = button.nextElementSibling;

    // Collapse any other open service content
    serviceButtons.forEach(btn => {
      if (btn !== button) {
        btn.nextElementSibling.style.maxHeight = null;
      }
    });

    // Toggle current service content
    if (content.style.maxHeight) {
      content.style.maxHeight = null;
    } else {
      content.style.maxHeight = content.scrollHeight + "px";
    }
  });
});

// ====== Leaflet Map Initialization (single instance) ======
let map = null;
const mapDiv = document.getElementById('map');
if (mapDiv) {
  map = L.map('map').setView([20.5937, 78.9629], 5); // default India
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
}

// Keep markers in a layer group so we can clear between searches
const markersLayer = map ? L.layerGroup().addTo(map) : null;

// ====== Search Button for Map ======
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');

function showResultsBox(show) {
  if (!resultsDiv) return;
  resultsDiv.style.display = show ? 'block' : 'none';
}

if (searchBtn) {
  searchBtn.addEventListener('click', async () => {
    const inputEl = document.querySelector('.search-box input');
    const locationInput = (inputEl?.value || '').trim();

    if (!locationInput) {
      alert('Please enter a location.');
      return;
    }

    if (!map) {
      alert('Map not available on this page.');
      return;
    }

    // 1) Geocode location using Nominatim (restricted to India)
    let lat, lon;
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationInput)}&countrycodes=in&limit=1`
      );
      const geoData = await geoRes.json();
      if (!geoData || geoData.length === 0) {
        alert('Location not found.');
        return;
      }
      lat = parseFloat(geoData[0].lat);
      lon = parseFloat(geoData[0].lon);
    } catch (err) {
      alert('Geocoding failed. Try again.');
      return;
    }

    // 2) Overpass query for petrol pumps within 5km
    const query = `
      [out:json][timeout:25];
      node["amenity"="fuel"](around:5000, ${lat}, ${lon});
      out;
    `;

    let elements = [];
    try {
      const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query
      });
      const overpassData = await overpassRes.json();
      elements = overpassData.elements || [];
    } catch (err) {
      alert('Could not fetch nearby petrol pumps.');
      return;
    }

    // 3) Clear old markers & results
    if (markersLayer) markersLayer.clearLayers();
    if (resultsDiv) resultsDiv.innerHTML = "";

    // 4) Show results
    if (elements.length === 0) {
      if (resultsDiv) resultsDiv.innerHTML = "<p>No petrol pumps found nearby.</p>";
      showResultsBox(true);
      map.setView([lat, lon], 13);
      return;
    }

    elements.forEach((station, index) => {
      const name = (station.tags && station.tags.name) ? station.tags.name : "Petrol Pump";
      const brand = (station.tags && station.tags.brand) ? station.tags.brand : "";

      // Add marker
      if (markersLayer) {
        const m = L.marker([station.lat, station.lon]).bindPopup(`<b>${name}</b><br>${brand}`);
        markersLayer.addLayer(m);
      }

      // Add to results
      if (resultsDiv) {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.style.padding = '8px';
        item.style.borderBottom = '1px solid #eee';
        item.style.cursor = 'pointer';
        item.innerHTML = `<b>${index + 1}. ${name}</b> ${brand ? `- ${brand}` : ''}`;
        item.addEventListener('click', () => {
          map.setView([station.lat, station.lon], 16);
        });
        resultsDiv.appendChild(item);
      }
    });

    // Center map to searched location
    map.setView([lat, lon], 13);
    showResultsBox(true);
  });
}

// Hide results when clicking outside results or search box
document.addEventListener('click', (e) => {
  const withinResults = resultsDiv && resultsDiv.contains(e.target);
  const withinSearch = e.target.closest && e.target.closest('.search-box');
  if (!withinResults && !withinSearch) {
    showResultsBox(false);
  }
});

// ====== Chatbot (closed by default, X works) ======
const chatbotIcon = document.getElementById('chatbotIcon');
const chatbot = document.getElementById('chatbot');
const chatbotClose = document.getElementById('chatbotClose');
const chatbotSend = document.getElementById('chatbotSend');

function openChat() {
  if (chatbot) {
    chatbot.style.display = 'flex';
  }
}
function closeChat() {
  if (chatbot) {
    chatbot.style.display = 'none';
  }
}

if (chatbotIcon) chatbotIcon.addEventListener('click', openChat);
if (chatbotClose) chatbotClose.addEventListener('click', closeChat);

// Send and respond (simple mock)
function sendMessage() {
  const input = document.getElementById("chatbot-input");
  const messages = document.getElementById("chatbot-messages");
  if (!input || !messages) return;

  if (!input.value.trim()) return;

  // User message
  const userMsg = document.createElement("div");
  userMsg.className = "user-message";
  userMsg.innerText = input.value;
  messages.appendChild(userMsg);

  // Bot response (mock AI)
  const botMsg = document.createElement("div");
  botMsg.className = "bot-message";

  const q = input.value.toLowerCase();
  if (q.includes("petrol")) {
    botMsg.innerText = "⛽ I found nearby petrol pumps! Try the search above.";
  } else if (q.includes("price")) {
    botMsg.innerText = "📊 Fuel price today is around ₹98 (mock data).";
  } else {
    botMsg.innerText = "🤖 I'm still learning! Try asking about 'petrol' or 'price'.";
  }

  messages.appendChild(botMsg);
  messages.scrollTop = messages.scrollHeight;
  input.value = "";
}

if (chatbotSend) chatbotSend.addEventListener('click', sendMessage);
document.getElementById('chatbot-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// ====== Back to Top Button ======
const backBtn = document.getElementById('backToTop');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ====== Dark mode toggle (kept minimal) ======
function toggleTheme() {
  document.body.classList.toggle("dark");
  if (document.body.classList.contains("dark")) {
    localStorage.setItem("theme", "dark");
  } else {
    localStorage.setItem("theme", "light");
  }
}

// Load saved theme & ensure chatbot is closed initially
window.addEventListener('load', () => {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    const sw = document.getElementById("theme-switch");
    if (sw) sw.checked = true;
  }
  // force closed
  if (chatbot) chatbot.style.display = 'none';
});
