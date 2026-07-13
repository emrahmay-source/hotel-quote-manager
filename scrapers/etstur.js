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

const SCRAPER_NAME = 'EtsTur';

/**
 * ETS Tur otel arama URL'si oluşturur.
 */
function buildSearchUrl(hotelUrl, params) {
  const url = new URL(hotelUrl);

  // ETS Tur tarih formatı: dd.MM.yyyy
  const checkInParts = params.checkIn.split('-');
  const checkOutParts = params.checkOut.split('-');
  const etsCheckIn = `${checkInParts[2]}.${checkInParts[1]}.${checkInParts[0]}`;
  const etsCheckOut = `${checkOutParts[2]}.${checkOutParts[1]}.${checkOutParts[0]}`;

  url.searchParams.set('checkin', etsCheckIn);
  url.searchParams.set('checkout', etsCheckOut);
  url.searchParams.set('adult', String(params.adults || 2));

  if (params.children && params.children > 0) {
    url.searchParams.set('child', String(params.children));
    if (params.childAges && params.childAges.length > 0) {
      url.searchParams.set('childages', params.childAges.join(','));
    }
  }

  return url.toString();
}

/**
 * ETS Tur otel sayfasından oda ve fiyat bilgilerini çeker.
 */
async function scrape(hotelUrl, params) {
  const searchUrl = buildSearchUrl(hotelUrl, params);
  console.log(`[${SCRAPER_NAME}] Aranıyor: ${searchUrl}`);

  return scrapeWithRetry(async () => {
    let page = null;
    try {
      // ETS Tur Türk sitesi, proxy gerekmez
      page = await createPage(null);

      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      });

      await randomDelay(2000, 4000);

      // Cookie banner'ını kapat
      try {
        const cookieBtn = await page.$(
          '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll, ' +
          '.cookie-consent-accept, ' +
          '[data-testid="cookie-accept"], ' +
          '.cookies-accept-all'
        );
        if (cookieBtn) {
          await cookieBtn.click();
          await randomDelay(500, 800);
        }
      } catch {
        // Cookie banner yoksa devam et
      }

      // Sayfayı kaydır
      await scrollPage(page, 5, 1000);

      // Oda bölümünün yüklenmesini bekle
      const roomSelectors = [
        '.room-list',
        '.room-card',
        '.room-type-card',
        '.room-row',
        '.hotel-room-list',
        '.room-info',
        '#room-list',
        '.rooms-container',
        '.room-item',
        '.price-card',
        '.concept-price',
        '.accommodation-card',
      ];

      await waitForAnySelector(page, roomSelectors, 12000);

      const nightCount = calculateNights(params.checkIn, params.checkOut);

      const rooms = await page.evaluate((nights) => {
        const results = [];
        const seen = new Set();

        // Strateji 1: Oda kartları
        const roomCards = document.querySelectorAll(
          '.room-card, ' +
          '.room-row, ' +
          '.room-item, ' +
          '.room-type-card, ' +
          '.accommodation-card, ' +
          '.price-card, ' +
          '[class*="room-list"] > div, ' +
          '[class*="RoomCard"], ' +
          '[class*="room_card"], ' +
          '[class*="roomCard"]'
        );

        roomCards.forEach((card) => {
          // Oda adı
          const nameEl = card.querySelector(
            '.room-name, ' +
            '.room-title, ' +
            '.room-type-name, ' +
            'h3, h4, ' +
            '[class*="room-name"], ' +
            '[class*="roomName"], ' +
            '[class*="room_name"], ' +
            '.title'
          );
          const roomType = nameEl ? (nameEl.textContent || '').trim() : '';
          if (!roomType) return;

          // Fiyat
          const priceEl = card.querySelector(
            '.room-price, ' +
            '.price, ' +
            '.price-value, ' +
            '.total-price, ' +
            '[class*="price"], ' +
            '[class*="Price"], ' +
            '.amount'
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

          // Pansiyon tipi / konsept
          const boardEl = card.querySelector(
            '.concept, ' +
            '.board-type, ' +
            '.concept-name, ' +
            '[class*="concept"], ' +
            '[class*="board"], ' +
            '[class*="pension"], ' +
            '.meal-plan'
          );
          const boardType = boardEl ? (boardEl.textContent || '').trim() : 'Belirtilmemiş';

          // Özellikler
          const featureEls = card.querySelectorAll(
            '.room-feature, ' +
            '.feature, ' +
            '.amenity, ' +
            'li, ' +
            '[class*="feature"]'
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

        // Strateji 2: Tablo formatı
        if (results.length === 0) {
          const tableRows = document.querySelectorAll(
            'table tr, ' +
            '.room-list tr, ' +
            '#room-list tr'
          );

          let currentRoomName = '';
          tableRows.forEach((row) => {
            const nameCell = row.querySelector('td:first-child, .room-name, th');
            if (nameCell) {
              const name = (nameCell.textContent || '').trim();
              if (name && name.length > 2 && name.length < 100) {
                currentRoomName = name;
              }
            }

            const priceCell = row.querySelector(
              'td [class*="price"], ' +
              'td .amount, ' +
              '.price'
            );
            if (!priceCell) return;

            const priceText = (priceCell.textContent || '').trim();
            let cleanPrice = priceText.replace(/[₺€$£a-zA-ZğüşıöçĞÜŞİÖÇ\s/]/gi, '').trim();
            const ld = cleanPrice.lastIndexOf('.');
            const lc = cleanPrice.lastIndexOf(',');
            if (lc > ld) cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
            else cleanPrice = cleanPrice.replace(/,/g, '');

            const totalPrice = parseFloat(cleanPrice);
            if (isNaN(totalPrice) || totalPrice <= 0) return;

            const roomType = currentRoomName || 'Standart Oda';
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
        await takeErrorScreenshot(page, 'etstur');
        await safeClosePage(page);
      }
      throw err;
    }
  }, 2);
}

module.exports = { scrape };
