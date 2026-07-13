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

const SCRAPER_NAME = 'Tatilbudur';

/**
 * Tatilbudur otel arama URL'si oluşturur.
 */
function buildSearchUrl(hotelUrl, params) {
  const url = new URL(hotelUrl);

  // Tatilbudur tarih formatı: dd.MM.yyyy
  const checkInParts = params.checkIn.split('-');
  const checkOutParts = params.checkOut.split('-');
  const tbCheckIn = `${checkInParts[2]}.${checkInParts[1]}.${checkInParts[0]}`;
  const tbCheckOut = `${checkOutParts[2]}.${checkOutParts[1]}.${checkOutParts[0]}`;

  url.searchParams.set('checkin', tbCheckIn);
  url.searchParams.set('checkout', tbCheckOut);
  url.searchParams.set('adult', String(params.adults || 2));
  url.searchParams.set('adultcount', String(params.adults || 2));

  if (params.children && params.children > 0) {
    url.searchParams.set('child', String(params.children));
    url.searchParams.set('childcount', String(params.children));
    if (params.childAges && params.childAges.length > 0) {
      params.childAges.forEach((age, i) => {
        url.searchParams.set(`childage${i + 1}`, String(age));
      });
      url.searchParams.set('childages', params.childAges.join(','));
    }
  }

  return url.toString();
}

/**
 * Tatilbudur otel sayfasından oda ve fiyat bilgilerini çeker.
 */
async function scrape(hotelUrl, params) {
  const searchUrl = buildSearchUrl(hotelUrl, params);
  console.log(`[${SCRAPER_NAME}] Aranıyor: ${searchUrl}`);

  return scrapeWithRetry(async () => {
    let page = null;
    try {
      // Tatilbudur Türk sitesi, proxy gerekmez
      page = await createPage(null);

      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      });

      await randomDelay(2000, 4000);

      // Cookie popup'ını kapat
      try {
        const cookieBtn = await page.$(
          '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll, ' +
          '.cookie-accept, ' +
          '.cookie-consent-accept, ' +
          '[class*="cookie"] button, ' +
          '.gdpr-accept'
        );
        if (cookieBtn) {
          await cookieBtn.click();
          await randomDelay(500, 800);
        }
      } catch {
        // Yoksa devam et
      }

      // Sayfayı kaydır
      await scrollPage(page, 5, 1000);

      // Oda bölümünün yüklenmesini bekle
      const roomSelectors = [
        '.room-list',
        '.room-card',
        '.room-table',
        '.room-item',
        '.room-type',
        '.price-card',
        '.concept-card',
        '.accommodation-list',
        '#room-section',
        '[class*="RoomList"]',
        '[class*="roomList"]',
        '[class*="room-list"]',
        '.hotel-rooms',
        '.rooms-section',
      ];

      await waitForAnySelector(page, roomSelectors, 12000);

      const nightCount = calculateNights(params.checkIn, params.checkOut);

      const rooms = await page.evaluate((nights) => {
        const results = [];
        const seen = new Set();

        // Strateji 1: Oda kartları / listesi
        const roomCards = document.querySelectorAll(
          '.room-card, ' +
          '.room-item, ' +
          '.room-type, ' +
          '.price-card, ' +
          '.concept-card, ' +
          '.accommodation-card, ' +
          '[class*="RoomCard"], ' +
          '[class*="roomCard"], ' +
          '[class*="room-card"], ' +
          '[class*="room_card"], ' +
          '.hotel-rooms .card, ' +
          '.rooms-section .card'
        );

        roomCards.forEach((card) => {
          // Oda adı
          const nameEl = card.querySelector(
            '.room-name, ' +
            '.room-title, ' +
            '.card-title, ' +
            'h3, h4, h5, ' +
            '[class*="room-name"], ' +
            '[class*="roomName"], ' +
            '[class*="title"]'
          );
          const roomType = nameEl ? (nameEl.textContent || '').trim() : '';
          if (!roomType) return;

          // Fiyat
          const priceEl = card.querySelector(
            '.price, ' +
            '.room-price, ' +
            '.total-price, ' +
            '.price-value, ' +
            '[class*="price"], ' +
            '[class*="Price"], ' +
            '.amount, ' +
            '.cost'
          );
          if (!priceEl) return;

          const priceText = (priceEl.textContent || '').trim();

          // Para birimi
          let currency = 'TRY';
          if (priceText.includes('€') || priceText.includes('EUR')) currency = 'EUR';
          else if (priceText.includes('$') || priceText.includes('USD')) currency = 'USD';

          // Sayısal fiyat
          let cleanPrice = priceText.replace(/[₺€$£a-zA-ZğüşıöçĞÜŞİÖÇ\s/]/gi, '').trim();
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

          // Pansiyon / konsept
          const boardEl = card.querySelector(
            '.concept, ' +
            '.concept-name, ' +
            '.board-type, ' +
            '.pension, ' +
            '[class*="concept"], ' +
            '[class*="board"], ' +
            '[class*="pension"], ' +
            '.meal-plan, ' +
            '.accommodation-type'
          );
          const boardType = boardEl ? (boardEl.textContent || '').trim() : 'Belirtilmemiş';

          // Özellikler
          const featureEls = card.querySelectorAll(
            '.feature, ' +
            '.amenity, ' +
            '.room-feature, ' +
            'li, ' +
            '[class*="feature"], ' +
            '[class*="amenity"]'
          );
          const features = [];
          featureEls.forEach((f) => {
            const t = (f.textContent || '').trim();
            if (t && t.length > 2 && t.length < 80) features.push(t);
          });

          const key = `${roomType}_${totalPrice}_${boardType}`;
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

        // Strateji 2: Genel div yapısı
        if (results.length === 0) {
          const allDivs = document.querySelectorAll('div[class]');
          const priceDivs = [];
          allDivs.forEach((div) => {
            const cls = div.className || '';
            if (
              cls.match(/room|oda|price|fiyat|concept|konsept/i) &&
              div.querySelector('[class*="price"], [class*="fiyat"], .amount')
            ) {
              priceDivs.push(div);
            }
          });

          priceDivs.forEach((div) => {
            const nameEl = div.querySelector('h3, h4, h5, [class*="name"], [class*="title"]');
            const roomType = nameEl ? (nameEl.textContent || '').trim() : 'Standart Oda';

            const priceEl = div.querySelector('[class*="price"], [class*="fiyat"], .amount');
            if (!priceEl) return;

            const priceText = (priceEl.textContent || '').trim();
            let cleanPrice = priceText.replace(/[₺€$£a-zA-ZğüşıöçĞÜŞİÖÇ\s/]/gi, '').trim();
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
              currency: 'TRY',
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
        await takeErrorScreenshot(page, 'tatilbudur');
        await safeClosePage(page);
      }
      throw err;
    }
  }, 2);
}

module.exports = { scrape };
