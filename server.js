'use strict';
const { createParser } = require('./excel/parser-factory');
const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { getBrowser, closeBrowser } = require('./scrapers/base-scraper');
const bookingScraper = require('./scrapers/booking');
const expediaScraper = require('./scrapers/expedia');
const etsturScraper = require('./scrapers/etstur');
const tatilbudurScraper = require('./scrapers/tatilbudur');
const hotelsComScraper = require('./scrapers/hotels-com');
const MatrixParser = require('./excel/matrix-parser');
// ─── Uygulama Başlatma ──────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const DATA_DIR = path.join(__dirname, 'data');
const DEBUG_DIR = path.join(DATA_DIR, 'debug');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });
if (!fs.existsSync(path.join(__dirname, 'public'))) fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
// ─── Scraper Eşlemeleri ──────────────────────────────────────────────
const SCRAPERS = {
  booking: bookingScraper,
  expedia: expediaScraper,
  etstur: etsturScraper,
  tatilbudur: tatilbudurScraper,
  hotelscom: hotelsComScraper,
  hotels: hotelsComScraper,
};
// ─── Döviz Kuru Önbelleği ────────────────────────────────────────────
let exchangeRateCache = null;
let exchangeRateCacheTime = 0;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 saat
/**
 * TCMB XML'inden döviz kurlarını çeker.
 * Belirtilen tarih için URL oluşturur.
 */
function buildTcmbUrl(date) {
  const yy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `https://www.tcmb.gov.tr/kurlar/${yy}${mm}/${dd}${mm}${yy}.xml`;
}
function formatDateTR(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear());
  return `${dd}.${mm}.${yy}`;
}
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('İstek zaman aşımına uğradı')); });
  });
}
async function fetchExchangeRates() {
  const now = Date.now();
  if (exchangeRateCache && (now - exchangeRateCacheTime) < CACHE_DURATION_MS) {
    return exchangeRateCache;
  }
  // Bugünden başlayarak 5 gün geriye kadar dene (hafta sonu/tatil)
  for (let dayOffset = 0; dayOffset <= 5; dayOffset++) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    const url = buildTcmbUrl(date);
    // today.xml'i de dene (offset 0 ise)
    const urls = dayOffset === 0
      ? ['https://www.tcmb.gov.tr/kurlar/today.xml', url]
      : [url];
    for (const tryUrl of urls) {
      try {
        console.log(`[TCMB] Deneniyor: ${tryUrl}`);
        const xml = await fetchUrl(tryUrl);
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(xml);
        const currencies = Array.isArray(result.Tarih_Date.Currency)
          ? result.Tarih_Date.Currency
          : [result.Tarih_Date.Currency];
        const rates = {};
        const targetCodes = { USD: 'USD', EUR: 'EUR', GBP: 'GBP' };
        for (const curr of currencies) {
          const code = curr.$.CurrencyCode;
          if (targetCodes[code]) {
            rates[code] = {
              buying: parseFloat(curr.ForexBuying) || null,
              selling: parseFloat(curr.ForexSelling) || null,
            };
          }
        }
        const dateStr = result.Tarih_Date.$.Tarih || formatDateTR(date);
        exchangeRateCache = { date: dateStr, rates };
        exchangeRateCacheTime = now;
        console.log(`[TCMB] Kurlar başarıyla alındı: ${dateStr}`);
        return exchangeRateCache;
      } catch (err) {
        console.log(`[TCMB] ${tryUrl} başarısız: ${err.message}`);
      }
    }
  }
  throw new Error('TCMB döviz kurları alınamadı. Lütfen daha sonra tekrar deneyin.');
}
// ─── Excel Sütun Eşleme Tavsiyecisi ─────────────────────────────────
const COLUMN_KEYWORDS = {
  roomType: ['oda', 'room', 'tip', 'type', 'oda tipi', 'room type', 'oda adı', 'room name'],
  price: ['fiyat', 'price', 'ücret', 'tutar', 'rate', 'gecelik', 'per night', 'toplam', 'total'],
  boardType: ['pansiyon', 'konsept', 'board', 'concept', 'konaklama', 'yeme', 'meal'],
  capacity: ['kapasite', 'capacity', 'kişi', 'person', 'guest', 'misafir', 'yetişkin', 'adult'],
  features: ['özellik', 'feature', 'amenity', 'donanım', 'olanak'],
  startDate: ['tarih', 'date', 'başlangıç', 'start', 'giriş', 'check-in', 'checkin', 'geçerlilik'],
  endDate: ['bitiş', 'end', 'çıkış', 'check-out', 'checkout', 'son'],
};
function suggestColumnMapping(headers) {
  const mapping = {};
  headers.forEach((header, index) => {
    if (!header) return;
    const normalized = String(header).toLowerCase().trim();
    for (const [field, keywords] of Object.entries(COLUMN_KEYWORDS)) {
      // Aynı alan zaten eşlenmişse atla
      const alreadyMapped = Object.values(mapping).includes(field);
      if (alreadyMapped) continue;
      for (const keyword of keywords) {
        if (normalized.includes(keyword)) {
          mapping[String(index)] = field;
          break;
        }
      }
    }
  });
  return mapping;
}
// ─── Ayarlar Yönetimi ────────────────────────────────────────────────
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[Ayarlar] Okuma hatası:', err.message);
  }
  return {
    hotelName: '',
    phone: '',
    hotelUrls: {},
    proxy: '',
    customOtas: [],
    childPricing: { enabled: false, freeUnder: 0, discountUnder: 0, discountPercent: 0 },
    lastColumnMapping: {},
  };
}
function saveSettings(settings) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}
// ─── API: Döviz Kurları ──────────────────────────────────────────────
app.get('/api/exchange-rates', async (req, res, next) => {
  try {
    const data = await fetchExchangeRates();
    res.json(data);
  } catch (err) {
    next(err);
  }
});
// ─── API: Excel Ayrıştırma ──────────────────────────────────────────
app.post('/api/parse-excel', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Lütfen bir Excel dosyası yükleyin.' });
    }

    const workbook = XLSX.read(req.file.buffer, {
      type: 'buffer',
      cellDates: true
    });

    const sheetNames = workbook.SheetNames;

    if (!sheetNames.length) {
      return res.status(400).json({ error: 'Excel dosyasında sayfa bulunamadı.' });
    }

    const selectedSheet = sheetNames[0];

    const sheet = workbook.Sheets[selectedSheet];

    const jsonData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: ''
    });

    const parser = createParser(jsonData);

    const result = parser.parse(jsonData);

    console.log(result);

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'Excel dosyası boş.' });
    }

    const headers = jsonData[0].map(h =>
      h != null ? String(h).trim() : ''
    );

    const data = jsonData
      .slice(1)
      .filter(row =>
        row.some(cell => cell !== '' && cell != null)
      );

    const suggestedMapping = suggestColumnMapping(headers);

    res.json({
      sheetNames,
      selectedSheet,
      headers,
      data,
      suggestedMapping
    });

  } catch (err) {
    next(err);
  }
});
// ─── API: Fiyat Arama (SSE) ─────────────────────────────────────────
app.post('/api/search-prices', async (req, res) => {
  const { sources, hotelUrls, checkIn, checkOut, adults, children, childAges, proxy } = req.body;
  if (!sources || !Array.isArray(sources) || sources.length === 0) {
    return res.status(400).json({ error: 'En az bir kaynak seçmelisiniz.' });
  }
  // SSE başlıkları
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  function sendSSE(data) {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      // Bağlantı kapanmış olabilir
    }
  }
  let closed = false;
  req.on('close', () => { closed = true; });
  const params = {
    checkIn: checkIn || '',
    checkOut: checkOut || '',
    adults: adults || 2,
    children: children || 0,
    childAges: childAges || [],
    proxy: proxy || '',
  };
  // Her kaynak için paralel scraping başlat
  const scrapePromises = sources.map(async (source) => {
    if (closed) return;
    const scraperModule = SCRAPERS[source];
    if (!scraperModule) {
      sendSSE({ source, status: 'error', error: `Bilinmeyen kaynak: ${source}` });
      return;
    }
    const hotelUrl = hotelUrls && hotelUrls[source];
    if (!hotelUrl) {
      sendSSE({ source, status: 'error', error: 'Otel URL\'si tanımlanmamış.' });
      return;
    }
    // Yükleniyor durumu gönder
    sendSSE({ source, status: 'loading' });
    try {
      // 30 saniye zaman aşımı ile scrape et
      const result = await Promise.race([
        scraperModule.scrape(hotelUrl, params),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Zaman aşımı (30 saniye)')), 30000)
        ),
      ]);
      if (closed) return;
      if (result.status === 'success') {
       console.log("Sunucudan gönderilen oda listesi:", result.rooms);
 sendSSE({ source, status: 'success', rooms: result.rooms });
      } else {
        sendSSE({
          source,
          status: 'error',
          error: result.error || 'Bilinmeyen hata',
          manualUrl: result.manualUrl || hotelUrl,
        });
      }
    } catch (err) {
      if (closed) return;
      console.error(`[${source}] Scraping hatası:`, err.message);
      sendSSE({
        source,
        status: 'error',
        error: err.message || 'Erişilemedi',
        manualUrl: hotelUrl,
      });
    }
  });
  await Promise.allSettled(scrapePromises);
  if (!closed) {
    sendSSE({ type: 'done' });
    res.end();
  }
});
// ─── API: Ayarlar ────────────────────────────────────────────────────
app.get('/api/settings', (req, res, next) => {
  try {
    const settings = loadSettings();
    res.json(settings);
  } catch (err) {
    next(err);
  }
});
app.post('/api/settings', (req, res, next) => {
  try {
    const current = loadSettings();
    const updated = { ...current, ...req.body };
    // Güvenlik: sadece bilinen alanları kaydet
    const safe = {
      hotelName: updated.hotelName || '',
      phone: updated.phone || '',
      hotelUrls: updated.hotelUrls || {},
      proxy: updated.proxy || '',
      customOtas: Array.isArray(updated.customOtas) ? updated.customOtas : [],
      childPricing: updated.childPricing || { enabled: false, freeUnder: 0, discountUnder: 0, discountPercent: 0 },
      lastColumnMapping: updated.lastColumnMapping || {},
    };
    saveSettings(safe);
    res.json({ message: 'Ayarlar kaydedildi.', settings: safe });
  } catch (err) {
    next(err);
  }
});
// ─── Global Hata Yakalama Middleware ─────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Sunucu Hatası]', err.message);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Beklenmeyen bir sunucu hatası oluştu.',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});
// ─── Sunucuyu Başlat ─────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`[Sunucu] Otel Fiyat Teklifi Yönetim Sistemi çalışıyor: http://localhost:${PORT}`);
});
// ─── Zarif Kapatma ───────────────────────────────────────────────────
async function gracefulShutdown(signal) {
  console.log(`\n[Sunucu] ${signal} sinyali alındı. Kapatılıyor...`);
  try {
    await closeBrowser();
    console.log('[Sunucu] Puppeteer tarayıcı kapatıldı.');
  } catch (err) {
    console.error('[Sunucu] Tarayıcı kapatma hatası:', err.message);
  }
  server.close(() => {
    console.log('[Sunucu] HTTP sunucusu kapatıldı.');
    process.exit(0);
  });
  // 5 saniye içinde kapanmazsa zorla kapat
  setTimeout(() => {
    console.error('[Sunucu] Zorla kapatılıyor...');
    process.exit(1);
  }, 5000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
module.exports = app;
