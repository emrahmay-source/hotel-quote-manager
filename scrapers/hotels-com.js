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

const SCRAPER_NAME = 'Hotels.com';

/**
 * Hotels.com otel arama URL'si oluşturur.
 * Hotels.com, Expedia Group'un bir parçasıdır ve benzer URL yapısı kullanır.
 */
function buildSearchUrl(hotelUrl, params) {
  const url = new URL(hotelUrl);

  url.searchParams.set('chkin', params.checkIn);
  url.searchParams.set('chkout', params.checkOut);
  url.searchParams.set('x_pwa', '1');

  // Misafir parametreleri
  let rmValue = `a${params.adults || 2}`;
  if (params.children && params.children > 0 && params.childAges && params.childAges.length > 0) {
    const childPart = params.childAges.map((age) => `c${age}`).join('.');
    rmValue += `.${childPart}`;
  }
  url.searchParams.set('rm1', rmValue);
  url.searchParams.set('currency', 'TRY');

  return url.toString();
}

/**
 * Hotels.com otel sayfasından oda ve fiyat bilgilerini çeker.
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

      // React hydration için bekle
      await randomDelay(3000, 5000);

      // Cookie / consent banner'ını kapat
      try {
        const cookieBtn = await page.$(
          '#onetrust-accept-btn-handler, ' +
          'button[data-stid="one-key-message-dismiss"], ' +
          '.cookie-consent-accept'
        );
        if (cookieBtn) {
          await cookieBtn.click();
          await randomDelay(500, 1000);
        }
      } catch {
        // Yoksa devam et
      }

      // Sayfayı kaydır
      await scrollPage(page, 5, 1200);

      // Oda bölümünün yüklenmesini bekle
      // Hotels.com, Expedia altyapısını kullanır
      const roomSelectors = [
        '[data-stid="property-offer"]',
        '[data-stid="section-room-list"]',
        '#rooms-and-rates',
        '.uitk-card-content-section',
        '[data-stid="property-offers-list"]',
        '.rooms-and-rates',
        '.room-list',
        '[class*="RoomList"]',
      ];

      await waitForAnySelector(page, roomSelectors, 12000);

      const nightCount = calculateNights(params.checkIn, params.checkOut);

      const rooms = await page.evaluate((nights) => {
        const results = [];
        const seen = new Set();

        // Strateji 1: Expedia/Hotels.com ortak yapısı (data-stid)
        const offerCards = document.querySelectorAll(
          '[data-stid="property-offer"], ' +
          '[data-stid="property-offer-card"], ' +
          '.uitk-card.uitk-card-roundcorner-all, ' +
          '[data-stid="section-room-list"] [class*="uitk-card"]'
        );

        offerCards.forEach((card) => {
          // Oda adı
          const nameEl = card.querySelector(
            '[data-stid="content-hotel-title"], ' +
            'h3.uitk-heading, ' +
            'h4.uitk-heading, ' +
            '.uitk-heading-5, ' +
            '.uitk-heading-6, ' +
            'button[data-stid="open-room-details"], ' +
            '[data-stid="room-type-name"]'
          );
          const roomType = nameEl ? (nameEl.textContent || '').trim() : '';
          if (!roomType) return;

          // Fiyat
          const priceEl = card.querySelector(
            '[data-stid="price-lockup-wrapper"] .uitk-text, ' +
            '.uitk-type-500.uitk-type-bold, ' +
            '[data-test-id="price-summary"] .uitk-text, ' +
            '.price-lockup .uitk-text, ' +
            '[data-stid="price-lockup"] span'
          );
          if (!priceEl) return;

          const priceText = (priceEl.textContent || '').trim();

          // Para birimi
          let currency = 'TRY';
          if (priceText.includes('₺') || priceText.includes('TRY') || priceText.includes('TL')) currency = 'TRY';
          else if (priceText.includes('€') || priceText.includes('EUR')) currency = 'EUR';
          else if (priceText.includes('$') || priceText.includes('USD')) currency = 'USD';
          else if (priceText.includes('£') || priceText.includes('GBP')) currency = 'GBP';

          // Sayısal fiyat
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
            '.room-amenities, ' +
            '[class*="meal"], ' +
            '[class*="board"]'
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

        // Strateji 2: Geleneksel Hotels.com yapısı
        if (results.length === 0) {
          const altRooms = document.querySelectorAll(
            '.room-list .room, ' +
            '#rooms-and-rates .room, ' +
            '.rooms-table .room-row, ' +
            '[class*="RoomCard"], ' +
            '[class*="room-card"]'
          );

          altRooms.forEach((room) => {
            const nameEl = room.querySelector('h3, h4, .room-name, [class*="room-name"]');
            const roomType = nameEl ? (nameEl.textContent || '').trim() : 'Standart Oda';

            const priceEl = room.querySelector(
              '.price, [class*="price"], .room-price, .rate'
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
        await takeErrorScreenshot(page, 'hotelscom');
        await safeClosePage(page);
      }
      throw err;
    }
  }, 2);
}

module.exports = { scrape };
