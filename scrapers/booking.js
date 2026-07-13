'use strict';

const {
  createPage,
  randomDelay,
  waitForAnySelector,
  scrollPage,
  takeErrorScreenshot,
  parsePrice,
  parseCurrency,
  scrapeWithRetry,
  calculateNights,
  safeClosePage,
} = require('./base-scraper');

const SCRAPER_NAME = 'Booking.com';

/**
 * Booking.com otel sayfasını arama parametreleriyle URL'ye dönüştürür.
 */
function buildSearchUrl(hotelUrl, params) {
  const url = new URL(hotelUrl);

  // Mevcut parametreleri temizle
  url.searchParams.set('checkin', params.checkIn);
  url.searchParams.set('checkout', params.checkOut);
  url.searchParams.set('group_adults', String(params.adults || 2));
  url.searchParams.set('group_children', String(params.children || 0));
  url.searchParams.set('no_rooms', '1');
  url.searchParams.set('selected_currency', 'TRY');

  // Çocuk yaşlarını ekle
  if (params.childAges && params.childAges.length > 0) {
    params.childAges.forEach((age) => {
      url.searchParams.append('age', String(age));
    });
  }

  return url.toString();
}

/**
 * Booking.com otel sayfasından oda ve fiyat bilgilerini çeker.
 */
async function scrape(hotelUrl, params) {
  const searchUrl = buildSearchUrl(hotelUrl, params);
  console.log(`[${SCRAPER_NAME}] Aranıyor: ${searchUrl}`);

  return scrapeWithRetry(async () => {
    let page = null;
    try {
      // Booking.com Türkiye'den erişimde proxy gerekebilir
      page = await createPage(params.proxy);

      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      });

      // Sayfa yüklenmesini bekle
      await randomDelay(2000, 4000);

      // Cookie/consent popup'ını kapat
      try {
        const consentBtn = await page.$('#onetrust-accept-btn-handler');
        if (consentBtn) {
          await consentBtn.click();
          await randomDelay(500, 1000);
        }
      } catch {
        // Consent popup yoksa devam et
      }

      // Dismiss signin popup if present
      try {
        const dismissBtn = await page.$('button[aria-label="Dismiss sign-in info."]');
        if (dismissBtn) {
          await dismissBtn.click();
          await randomDelay(300, 600);
        }
      } catch {
        // İgnore
      }

      // Sayfayı kaydır (tembel yükleme)
      await scrollPage(page, 4, 1000);

      // Oda tablosunun yüklenmesini bekle
      const roomSelectors = [
        '#hprt-table',
        '[data-testid="property-section--content"]',
        '.hprt-table',
        '#rooms_table',
        '.roomstable',
        '[data-block-id]',
      ];

      const foundRoomContainer = await waitForAnySelector(page, roomSelectors, 12000);

      if (!foundRoomContainer) {
        console.log(`[${SCRAPER_NAME}] Oda tablosu bulunamadı, sayfanın HTML'ini kontrol ediyoruz...`);
        await takeErrorScreenshot(page, 'booking');

        // Sayfa tamamen yüklenmemiş olabilir, biraz daha bekle
        await randomDelay(3000, 5000);
        await scrollPage(page, 2, 500);
      }

      // ─── Oda Bilgilerini Çıkar ──────────────────────────────────

      const rooms = await page.evaluate((nightCount) => {
        const results = [];
        const seen = new Set();

        // Strateji 1: Modern Booking.com yapısı (data-testid tabanlı)
        const roomRows = document.querySelectorAll(
          '#hprt-table tr.js-rt-block-row, ' +
          '#hprt-table .hprt-table-row, ' +
          'tr[data-block-id], ' +
          '.hprt-roomtype-row, ' +
          '#rooms_table tr'
        );

        if (roomRows.length > 0) {
          let currentRoomType = '';

          roomRows.forEach((row) => {
            // Oda adını bul
            const roomNameEl = row.querySelector(
              '[data-testid="room-type-link"], ' +
              'a.hprt-roomtype-icon-link, ' +
              '.room_link span, ' +
              '.hprt-roomtype-link, ' +
              'span.hprt-roomtype-icon-link'
            );
            if (roomNameEl) {
              currentRoomType = (roomNameEl.textContent || '').trim();
            }

            // Fiyatı bul
            const priceEl = row.querySelector(
              '[data-testid="price-and-discounted-price"], ' +
              '.bui-price-display__value, ' +
              '.prco-valign-middle-helper, ' +
              '.hprt-price-price, ' +
              '.bui-f-font-display_two, ' +
              'td.hprt-table-cell-price .prco-inline-block-maker-helper'
            );

            let priceText = '';
            if (priceEl) {
              priceText = (priceEl.textContent || '').trim();
            }

            if (!priceText) return;

            // Pansiyon tipini bul
            const boardEl = row.querySelector(
              '.hprt-facilities-block, ' +
              '[data-testid="mealplan"], ' +
              '.bui-list__description, ' +
              '.hprt-roomtype-bed, ' +
              '.meal-plan'
            );
            let boardType = '';
            if (boardEl) {
              boardType = (boardEl.textContent || '').trim();
            }

            // Özellikler
            const featureEls = row.querySelectorAll(
              '.hprt-facilities-facility, ' +
              '.bui-list__item, ' +
              '[data-testid="facility"]'
            );
            const features = [];
            featureEls.forEach((f) => {
              const t = (f.textContent || '').trim();
              if (t && t.length < 100) features.push(t);
            });

            // Fiyat ayrıştır
            let cleanPrice = priceText.replace(/[^\d.,₺€$£\s]/g, '').trim();
            let totalPrice = null;
            let currency = 'TRY';

            // Para birimi belirle
            if (priceText.includes('₺') || priceText.includes('TL') || priceText.includes('TRY')) currency = 'TRY';
            else if (priceText.includes('€') || priceText.includes('EUR')) currency = 'EUR';
            else if (priceText.includes('$') || priceText.includes('USD')) currency = 'USD';
            else if (priceText.includes('£') || priceText.includes('GBP')) currency = 'GBP';

            // Sayısal değeri çıkar
            cleanPrice = priceText.replace(/[₺€$£TRYUSDEURGBPa-zA-Z\s]/gi, '').trim();
            const lastDot = cleanPrice.lastIndexOf('.');
            const lastComma = cleanPrice.lastIndexOf(',');
            if (lastComma > lastDot) {
              cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
            } else if (lastDot > lastComma) {
              cleanPrice = cleanPrice.replace(/,/g, '');
            } else {
              cleanPrice = cleanPrice.replace(/,/g, '');
            }
            totalPrice = parseFloat(cleanPrice);
            if (isNaN(totalPrice)) totalPrice = null;

            const roomType = currentRoomType || 'Standart Oda';
            const key = `${roomType}_${totalPrice}_${boardType}`;
            if (seen.has(key)) return;
            seen.add(key);

            if (totalPrice && totalPrice > 0) {
              const perNight = nightCount > 0 ? Math.round((totalPrice / nightCount) * 100) / 100 : totalPrice;
              results.push({
                roomType,
                boardType: boardType || 'Belirtilmemiş',
                pricePerNight: perNight,
                totalPrice,
                currency,
                features: features.slice(0, 10),
                imageUrl: null,
              });
            }
          });
        }

        // Strateji 2: Alternatif yapı (yeni tasarım)
        if (results.length === 0) {
          const blocks = document.querySelectorAll(
            '[data-testid="property-section--content"] [data-testid="roomtype-container"], ' +
            '.js-rt-block-row, ' +
            '.Room_room__wrapper'
          );

          blocks.forEach((block) => {
            const nameEl = block.querySelector(
              '[data-testid="room-type-link"], ' +
              '.room_link, ' +
              'h3, h4'
            );
            const roomType = nameEl ? (nameEl.textContent || '').trim() : 'Standart Oda';

            const priceEl = block.querySelector(
              '[data-testid="price-and-discounted-price"], ' +
              '.bui-price-display__value, ' +
              '.prco-valign-middle-helper'
            );
            if (!priceEl) return;

            const priceText = (priceEl.textContent || '').trim();
            let currency = 'TRY';
            if (priceText.includes('₺') || priceText.includes('TRY')) currency = 'TRY';
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

            const perNight = nightCount > 0 ? Math.round((totalPrice / nightCount) * 100) / 100 : totalPrice;
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
      }, calculateNights(params.checkIn, params.checkOut));

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
        await takeErrorScreenshot(page, 'booking');
        await safeClosePage(page);
      }
      throw err;
    }
  }, 2);
}

module.exports = { scrape };
