'use strict';

const {
  createPage,
  randomDelay,
  waitForAnySelector,
  scrollPage,
  takeErrorScreenshot,
  scrapeWithRetry,
  calculateNights,
  safeClosePage,
} = require('./base-scraper');

const SCRAPER_NAME = 'Expedia';

/**
 * Expedia otel arama URL'si oluşturur.
 */
function buildSearchUrl(hotelUrl, params) {
  const url = new URL(hotelUrl);

  url.searchParams.set('chkin', params.checkIn);
  url.searchParams.set('chkout', params.checkOut);
  url.searchParams.set('x_pwa', '1');
  url.searchParams.set('rfrr', 'HSR');
  url.searchParams.set('pwa_ts', Date.now().toString());
  url.searchParams.set('rm1', 'a' + String(params.adults || 2));

  // Çocuk parametreleri
  if (params.children && params.children > 0 && params.childAges && params.childAges.length > 0) {
    const childPart = params.childAges.map((age) => `c${age}`).join('.');
    const rmValue = `a${params.adults || 2}.${childPart}`;
    url.searchParams.set('rm1', rmValue);
  }

  url.searchParams.set('currency', 'TRY');

  return url.toString();
}

/**
 * Expedia otel sayfasından oda ve fiyat bilgilerini çeker.
 */
async function scrape(hotelUrl, params) {
  const searchUrl = buildSearchUrl(hotelUrl, params);
  console.log(`[${SCRAPER_NAME}] Aranıyor: ${searchUrl}`);

  return scrapeWithRetry(async () => {
    let page = null;
    try {
      page = await createPage(params.proxy);

      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      });

     // React hydration ve dinamik içerik için bekle
await randomDelay(3000, 5000);

// 1. Cookie banner'ını kapat
try {
  const cookieBtn = await page.$('#onetrust-accept-btn-handler, button[data-stid="one-key-message-dismiss"]');
  if (cookieBtn) {
    await cookieBtn.click();
    await randomDelay(500, 1000);
  }
} catch (e) {
  // Cookie banner yoksa devam et
}

// 2. Oda seç butonuna tıkla (eğer varsa)
try {
  const selectBtn = await page.$('button[data-stid="select-room-button"]');
  if (selectBtn) {
    console.log("[Expedia] 'Oda Seç' butonuna basılıyor...");
    await selectBtn.click();
    await randomDelay(2000, 3000); 
  }
} catch (e) {
  console.log("[Expedia] 'Oda Seç' butonu bulunamadı.");
}

// 3. Sayfayı kaydır
await scrollPage(page, 5, 1200);

// 4. Oda bölümünün yüklenmesini bekle
const roomSelectors = [
  '[data-stid="property-offer"]',
  '[data-stid="section-room-list"]',
  '.uitk-card-content-section',
  '#rooms-and-rates',
  '.rooms-and-rates',
  '[data-stid="property-offers-list"]',
  '.uitk-spacing'
];

await waitForAnySelector(page, roomSelectors, 12000);

      // Oda bilgilerini çıkar
      const nightCount = calculateNights(params.checkIn, params.checkOut);

      const rooms = await page.evaluate((nights) => {
        const results = [];
        const seen = new Set();

        // Strateji 1: Modern Expedia (data-stid tabanlı)
        const offerCards = document.querySelectorAll(
          '[data-stid="property-offer"], ' +
          '[data-stid="property-offer-card"] ' 
          
        );

        offerCards.forEach((card) => {
          // Oda adı
          const nameEl = card.querySelector(
            '[data-stid="content-hotel-title"], ' +
            'h3.uitk-heading, ' +
            'h4.uitk-heading, ' +
            '.uitk-heading-5, ' +
            '.uitk-heading-6, ' +
            'button[data-stid="open-room-details"]'
          );
          const roomType = nameEl ? (nameEl.textContent || '').trim() : '';
          if (!roomType) return;

          // Fiyat
          const priceEl = card.querySelector(
            '[data-stid="price-lockup-wrapper"] .uitk-text, ' +
            '.uitk-type-500.uitk-type-bold, ' +
            '[data-test-id="price-summary"] .uitk-text, ' +
            '.price-lockup .uitk-text'
          );
          if (!priceEl) return;

          const priceText = (priceEl.textContent || '').trim();

          // Para birimi belirle
          let currency = 'TRY';
          if (priceText.includes('₺') || priceText.includes('TRY')) currency = 'TRY';
          else if (priceText.includes('€') || priceText.includes('EUR')) currency = 'EUR';
          else if (priceText.includes('$') || priceText.includes('USD')) currency = 'USD';
          else if (priceText.includes('£')) currency = 'GBP';

          // Sayısal fiyatı çıkar
          let cleanPrice = priceText.replace(/[₺€$£a-zA-Z\s]/gi, '').trim();
          const lastDot = cleanPrice.lastIndexOf('.');
          const lastComma = cleanPrice.lastIndexOf(',');
          if (lastComma > lastDot) {
            cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
          } else if (lastDot > lastComma) {
            cleanPrice = cleanPrice.replace(/,/g, '');
          } else {
            cleanPrice = cleanPrice.replace(/,/g, '');
          }
          const totalPrice = parseFloat(cleanPrice);
          if (isNaN(totalPrice) || totalPrice <= 0) return;

          // Pansiyon tipi
          const boardEl = card.querySelector(
            '[data-stid="content-hotel-meal-plan"], ' +
            '.uitk-text.uitk-type-200, ' +
            '.room-amenities'
          );
          const boardType = boardEl ? (boardEl.textContent || '').trim() : 'Belirtilmemiş';

          // Özellikler
          const featureEls = card.querySelectorAll(
            '.uitk-text.uitk-type-200, ' +
            '[data-stid="content-hotel-amenity"], ' +
            'li.uitk-typelist-default-item'
          );
          const features = [];
          featureEls.forEach((f) => {
            const t = (f.textContent || '').trim();
            if (t && t.length < 100 && t !== boardType) features.push(t);
          });

          const key = `${roomType}_${totalPrice}`;
          if (seen.has(key)) return;
          seen.add(key);

          const perNight = nights > 0 ? Math.round((totalPrice / nights) * 100) / 100 : totalPrice;
          results.push({
            roomType,
            boardType,
            pricePerNight: perNight,
            totalPrice,
            currency,
            features: features.slice(0, 8),
            imageUrl: null,
          });
        });

        // Strateji 2: Alternatif seçiciler
        if (results.length === 0) {
          const altRooms = document.querySelectorAll(
            '[data-stid="section-room-list"] > div, ' +
            '.Room, ' +
            '#rooms-and-rates .room-type-card'
          );

          altRooms.forEach((room) => {
            const nameEl = room.querySelector('h3, h4, [data-stid="room-type-name"]');
            const roomType = nameEl ? (nameEl.textContent || '').trim() : 'Standart Oda';

            const priceEl = room.querySelector(
              '[data-stid="price-lockup"] span, ' +
              '.uitk-type-500, ' +
              '.room-price'
            );
            if (!priceEl) return;

            const priceText = (priceEl.textContent || '').trim();
            let currency = 'TRY';
            if (priceText.includes('₺')) currency = 'TRY';
            else if (priceText.includes('€')) currency = 'EUR';
            else if (priceText.includes('$')) currency = 'USD';

            let cleanPrice = priceText.replace(/[₺€$£a-zA-Z\s]/gi, '').trim();
            const ld = cleanPrice.lastIndexOf('.');
            const lc = cleanPrice.lastIndexOf(',');
            if (lc > ld) cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
            else cleanPrice = cleanPrice.replace(/,/g, '');

            const totalPrice = parseFloat(cleanPrice);
            if (isNaN(totalPrice) || totalPrice <= 0) return;

            const key = `${roomType}_${totalPrice}`;
            if (seen.has(key)) return;
            seen.add(key);

            const perNight = nights > 0 ? Math.round((totalPrice / nights) * 100) / 100 : totalPrice;
            results.push({
              roomType,
              boardType: 'Belirtilmemiş',
              pricePerNight: perNight,
              totalPrice,
              currency,
              features: [],
              imageUrl: null,
            });
          });
        }

        return results;
      }, nightCount);

      await safeClosePage(page);

      if (rooms.length === 0) {
        console.log(`[${SCRAPER_NAME}] Hiç oda bulunamadı.`);
        return {
          status: 'error',
          error: 'Oda veya fiyat bilgisi bulunamadı. Lütfen manuel olarak kontrol edin.',
          manualUrl: searchUrl,
        };
      }

      console.log(`[${SCRAPER_NAME}] ${rooms.length} oda bulundu.`);
      return { status: 'success', rooms };

    } catch (err) {
      console.error(`[${SCRAPER_NAME}] Hata:`, err.message);
      if (page) {
        await takeErrorScreenshot(page, 'expedia');
        await safeClosePage(page);
      }
      throw err;
    }
  }, 2);
}

module.exports = { scrape };
