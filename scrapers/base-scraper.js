'use strict';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');

puppeteer.use(StealthPlugin());

// ─── Kullanıcı Ajanları (User-Agent Havuzu) ─────────────────────────

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
];

// ─── Tarayıcı Yönetimi (Singleton) ──────────────────────────────────

let browserInstance = null;

const DEFAULT_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-web-security',
  '--disable-features=IsolateOrigins,site-per-process',
  '--disable-blink-features=AutomationControlled',
  '--disable-infobars',
  '--window-size=1920,1080',
  '--ignore-certificate-errors',
];

/**
 * Tarayıcı örneğini döndürür. Yoksa oluşturur (lazy initialization).
 */
async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  console.log('[Tarayıcı] Yeni Puppeteer tarayıcı başlatılıyor...');
  browserInstance = await puppeteer.launch({
    headless: 'new',
    channel: 'chrome',
    args: DEFAULT_LAUNCH_ARGS,
    defaultViewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });

  browserInstance.on('disconnected', () => {
    console.log('[Tarayıcı] Bağlantı kesildi.');
    browserInstance = null;
  });

  console.log('[Tarayıcı] Puppeteer tarayıcı başarıyla başlatıldı.');
  return browserInstance;
}

/**
 * Yeni sayfa oluşturur. İsteğe bağlı proxy desteği.
 */
async function createPage(proxy) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  // Rastgele User-Agent seç
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  await page.setUserAgent(ua);

  // Ekstra header'lar
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  });

  // Viewport
  await page.setViewport({ width: 1920, height: 1080 });

  // Gereksiz kaynakları engelle (performans için)
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    const blockedTypes = ['image', 'media', 'font'];
    if (blockedTypes.includes(resourceType)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  // Proxy desteği (sayfa düzeyinde authenticate ile)
  if (proxy) {
    try {
      const proxyUrl = new URL(proxy);
      if (proxyUrl.username && proxyUrl.password) {
        await page.authenticate({
          username: decodeURIComponent(proxyUrl.username),
          password: decodeURIComponent(proxyUrl.password),
        });
      }
    } catch (err) {
      console.warn('[Tarayıcı] Proxy kimlik bilgisi uygulanamadı:', err.message);
    }
  }

  return page;
}

/**
 * Tarayıcıyı ve tüm sayfaları kapatır.
 */
async function closeBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch (err) {
      console.error('[Tarayıcı] Kapatma hatası:', err.message);
    }
    browserInstance = null;
    console.log('[Tarayıcı] Tarayıcı kapatıldı.');
  }
}

// ─── Yardımcı Fonksiyonlar ───────────────────────────────────────────

/**
 * Rastgele gecikme (ms). Varsayılan: 1000-3000ms arası.
 */
function randomDelay(min = 1000, max = 3000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Seçiciye sahip elementi bekler.
 */
async function waitForSelector(page, selector, timeout = 15000) {
  try {
    await page.waitForSelector(selector, { visible: true, timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Birden fazla seçiciden ilk bulunanı bekler.
 */
async function waitForAnySelector(page, selectors, timeout = 15000) {
  const selectorStr = selectors.join(', ');
  try {
    await page.waitForSelector(selectorStr, { visible: true, timeout });
    // Hangisinin bulunduğunu belirle
    for (const sel of selectors) {
      const el = await page.$(sel);
      if (el) return sel;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Elementten metin çıkarır.
 */
async function extractText(page, selector) {
  try {
    const el = await page.$(selector);
    if (!el) return '';
    const text = await page.evaluate((e) => (e.textContent || '').trim(), el);
    return text;
  } catch {
    return '';
  }
}

/**
 * Birden fazla elementten metin çıkarır.
 */
async function extractAllTexts(page, selector) {
  try {
    return await page.$$eval(selector, (els) =>
      els.map((e) => (e.textContent || '').trim()).filter(Boolean)
    );
  } catch {
    return [];
  }
}

/**
 * Sayfayı kaydırarak tembel yüklenen içeriği yükler.
 */
async function scrollPage(page, scrolls = 3, delayMs = 800) {
  for (let i = 0; i < scrolls; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  // En üste geri dön
  await page.evaluate(() => window.scrollTo(0, 0));
}

/**
 * Hata durumunda ekran görüntüsü kaydeder.
 */
async function takeErrorScreenshot(page, scraperName) {
  try {
    const debugDir = path.join(__dirname, '..', 'data', 'debug');
    if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
    const filename = `${scraperName}_${Date.now()}.png`;
    const filepath = path.join(debugDir, filename);
    await page.screenshot({ path: filepath, fullPage: false });
    console.log(`[${scraperName}] Hata ekran görüntüsü kaydedildi: ${filepath}`);
  } catch (err) {
    console.warn(`[${scraperName}] Ekran görüntüsü alınamadı:`, err.message);
  }
}

/**
 * Fiyat metninden sayısal değer çıkarır.
 * "TRY 3.500,00" -> 3500.00
 * "€ 95.50" -> 95.50
 * "3,500" -> 3500
 */
function parsePrice(text) {
  if (!text) return null;
  // Para birimi sembollerini kaldır
  let cleaned = text.replace(/[₺€$£¥TRYUSDEURGBPa-zA-Zğüşıöç\s]/gi, '').trim();

  // Binlik ve ondalık ayırıcıları tespit et
  // Türk formatı: 3.500,00
  // İngiliz formatı: 3,500.00
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  if (lastComma > lastDot) {
    // Türk formatı: nokta binlik, virgül ondalık
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // İngiliz formatı: virgül binlik, nokta ondalık
    cleaned = cleaned.replace(/,/g, '');
  } else {
    // Tek ayırıcı veya hiç yok
    cleaned = cleaned.replace(/,/g, '');
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Fiyat metninden para birimini çıkarır.
 */
function parseCurrency(text) {
  if (!text) return 'TRY';
  if (text.includes('₺') || /TRY|TL/i.test(text)) return 'TRY';
  if (text.includes('€') || /EUR/i.test(text)) return 'EUR';
  if (text.includes('$') || /USD/i.test(text)) return 'USD';
  if (text.includes('£') || /GBP/i.test(text)) return 'GBP';
  return 'TRY';
}

/**
 * Yeniden deneme mantığı ile scrape.
 * @param {Function} scrapeFn - asenkron scrape fonksiyonu
 * @param {number} maxRetries - maksimum deneme sayısı
 */
async function scrapeWithRetry(scrapeFn, maxRetries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[BaseScraper] Yeniden deneme ${attempt}/${maxRetries}...`);
        await randomDelay(2000, 5000);
      }
      return await scrapeFn();
    } catch (err) {
      lastError = err;
      console.warn(`[BaseScraper] Deneme ${attempt + 1} başarısız: ${err.message}`);
    }
  }
  throw lastError;
}

/**
 * Gece sayısını hesaplar.
 */
function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 1;
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const diffMs = outDate - inDate;
  const nights = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 1;
}

/**
 * Sayfayı güvenli bir şekilde kapatır.
 */
async function safeClosePage(page) {
  try {
    if (page && !page.isClosed()) {
      await page.close();
    }
  } catch {
    // Sessizce geç
  }
}

module.exports = {
  getBrowser,
  createPage,
  closeBrowser,
  randomDelay,
  waitForSelector,
  waitForAnySelector,
  extractText,
  extractAllTexts,
  scrollPage,
  takeErrorScreenshot,
  parsePrice,
  parseCurrency,
  scrapeWithRetry,
  calculateNights,
  safeClosePage,
  USER_AGENTS,
};
