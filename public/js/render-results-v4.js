// ======================================================
// HOTEL QUOTE MANAGER - ULTIMATE UNIFIED LAYOUT V4
// ======================================================

"use strict";

function injectPremiumStyles() {
    if (document.getElementById("premium-mockup-styles")) return;

    const styleTag = document.createElement("style");
    styleTag.id = "premium-mockup-styles";
    styleTag.textContent = `
        :root {
            --panel-bg: #1E2A3B;
            --body-bg: #081526;
            --border-color: #34445B;
            --alt-bar-bg: #162232;
            --text-main: #F5F7FA;
            --text-muted: #AEB9C7;
            --gold: #D6B06A;
            --gold-hover: #E0BC78;
            --price-color: #FFC64D;
            --divider-color: #2D3A4F;
            --hover-bg: #243247;
        }

        .offer-card {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            background: var(--panel-bg) !important;
            border: 1px solid var(--border-color) !important;
            border-radius: 8px !important;
            margin-bottom: 12px !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2) !important;
        }

        .offer-card .card-main-body {
            display: flex !important;
            flex-direction: row !important;
            width: 100% !important;
            align-items: stretch !important;
            min-height: 165px !important;
        }

        .offer-card .source-column {
            width: 150px !important;
            min-width: 150px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 16px 8px 12px 8px !important;
            box-sizing: border-box !important;
            flex-shrink: 0 !important;
            border-right: 1px solid var(--divider-color) !important;
            text-align: center !important;
        }

        .offer-card .source-brand-wrapper {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 100% !important;
            flex-grow: 1 !important;
        }

        .offer-card .source-brand-wrapper img {
            width: 60px !important;
            height: 60px !important;
            object-fit: contain !important;
        }

        .offer-card .source-brand-wrapper svg {
            max-height: 60px !important;
            max-width: 100% !important;
            width: auto !important;
            object-fit: contain !important;
        }

        .offer-card .source-name {
            margin-top: 8px !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            color: var(--text-main) !important;
            line-height: 1.2 !important;
        }

        .offer-card .source-name small {
            display: block !important;
            font-size: 11px !important;
            font-weight: 400 !important;
            color: var(--text-muted) !important;
            margin-top: 2px !important;
        }

        .offer-card .source-footer {
            margin-top: auto !important;
            text-align: center !important;
            font-size: 10px !important;
            color: var(--text-muted) !important;
            letter-spacing: -0.2px !important;
            white-space: nowrap !important;
            line-height: 1.3 !important;
            width: 100% !important;
            padding-top: 6px !important;
        }

        .offer-card .card-details-area {
            flex: 1 !important;
            padding: 14px 18px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            gap: 6px !important;
        }

        .offer-card .best-badge {
            background: linear-gradient(90deg, var(--gold) 0%, var(--gold-hover) 100%) !important;
            color: var(--body-bg) !important;
            padding: 2px 8px !important;
            border-radius: 4px 12px 4px 12px !important;
            font-weight: 700 !important;
            font-size: 10px !important;
            text-transform: uppercase !important;
            width: max-content !important;
            margin-bottom: 2px !important;
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
        }

        .offer-card .room-title-row {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
        }

        .offer-card .room-title-row h2 {
            font-size: 16px !important;
            font-weight: 700 !important;
            color: var(--text-main) !important;
            margin: 0 !important;
            letter-spacing: -0.2px !important;
        }

        .offer-card .board-badge {
            border: 1px solid var(--gold) !important;
            color: var(--gold) !important;
            padding: 0px 4px !important;
            border-radius: 4px !important;
            font-weight: 600 !important;
            font-size: 9px !important;
        }

        .offer-card .board-sub {
            color: var(--text-muted) !important;
            font-size: 11px !important;
            margin-bottom: 2px !important;
        }

        .offer-card .room-meta-row {
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            font-size: 11px !important;
            color: var(--text-muted) !important;
            margin-top: 4px !important;
            flex-wrap: wrap !important;
        }
        .offer-card .room-meta-row span {
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
        }

        .offer-card .card-price-panel {
            width: 240px !important;
            background: transparent !important;
            padding: 14px 18px !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            position: relative !important;
            flex-shrink: 0 !important;
            border-left: 1px solid var(--divider-color) !important;
        }

        .offer-card .card-price-panel::before {
            content: "" !important;
            position: absolute !important;
            left: -1px !important;
            top: 10% !important;
            width: 2px !important;
            height: 80% !important;
            background: linear-gradient(to bottom, transparent, var(--gold), transparent) !important;
            box-shadow: 0 0 16px rgba(226, 176, 72, 0.18) !important;
        }

        .offer-card .price-per-night {
            text-align: center !important;
        }
        .offer-card .price-per-night .price-amount {
            font-size: 26px !important;
            font-weight: 700 !important;
            color: var(--price-color) !important;
            line-height: 1 !important;
        }
        .offer-card .price-per-night .price-label {
            font-size: 10px !important;
            color: var(--text-muted) !important;
            margin-top: 2px !important;
            display: block !important;
        }

        .offer-card .price-divider {
            width: 80% !important;
            height: 1px !important;
            background: var(--divider-color) !important;
            margin: 6px 0 !important;
        }

        .offer-card .price-total-block {
            text-align: center !important;
        }
        .offer-card .price-total-block .total-label {
            font-size: 9px !important;
            color: var(--text-muted) !important;
            letter-spacing: 0.5px !important;
        }
        .offer-card .price-total-block .total-amount {
            font-size: 16px !important;
            font-weight: 600 !important;
            color: var(--text-main) !important;
        }

        .offer-card .card-actions-bar {
            min-height: 42px !important;
            height: auto !important;
            background: var(--alt-bar-bg) !important;
            border-top: 1px solid var(--border-color) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            flex-wrap: wrap !important;
            padding: 6px 12px !important;
            gap: 8px !important;
        }

        .offer-card .left-actions, 
        .offer-card .right-actions {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
            align-items: center !important;
        }

        .offer-card .action-btn {
            height: 28px !important;
            padding: 0 8px !important;
            font-size: 10.5px !important;
            font-weight: 500 !important;
            border-radius: 4px !important;
            border: 1px solid var(--border-color) !important;
            background: rgba(255, 255, 255, 0.02) !important;
            color: var(--text-main) !important;
            cursor: pointer !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 4px !important;
            white-space: nowrap !important;
            transition: all 0.2s ease !important;
        }

        .offer-card .action-btn svg {
            width: 12px !important;
            height: 12px !important;
            flex-shrink: 0 !important;
        }

        .offer-card .action-btn:hover {
            background: rgba(214, 176, 106, 0.12) !important;
            border-color: var(--gold) !important;
            color: var(--text-main) !important;
        }

        .offer-card .btn-whatsapp svg { fill: #25D366 !important; }
        .offer-card .btn-mail svg { fill: var(--gold) !important; }
        .offer-card .btn-pdf svg { fill: #FF4B4B !important; }
        .offer-card .btn-voucher svg { fill: var(--gold) !important; }
        .offer-card .btn-reservation svg { fill: var(--gold) !important; }

        .empty-results-state {
            text-align: center !important;
            padding: 48px 20px !important;
            background: var(--panel-bg) !important;
            border: 1px solid var(--border-color) !important;
            border-radius: 8px !important;
            color: var(--text-muted) !important;
        }
        .empty-results-state svg {
            width: 48px !important;
            height: 48px !important;
            margin-bottom: 12px !important;
            stroke: var(--gold) !important;
            opacity: 0.6 !important;
        }
    `;
    document.head.appendChild(styleTag);
}

function getSourceInfo(source) {
    const key = String(source || "").toLowerCase().trim();

    const map = {
        excel: { 
            name: "Excel", 
            subText: "Price List", 
            svg: `<img src="excel.png" alt="Excel" onerror="this.onerror=null; this.parentElement.innerHTML='<span style=\\'color:#107C41;font-weight:bold;font-size:14px;\\'>EXCEL</span>';" />`, 
            wrapperClass: "excel" 
        },
        booking: { 
            name: "Booking.com", 
            subText: "", 
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32"><rect width="120" height="32" rx="4" fill="#003580"/><text x="60" y="21" fill="#FFFFFF" font-family="Arial, sans-serif" font-weight="800" font-size="13" text-anchor="middle">Booking<tspan fill="#00A3E0">.com</tspan></text></svg>`, 
            wrapperClass: "booking" 
        },
        expedia: { 
            name: "Expedia", 
            subText: "", 
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 32"><rect width="110" height="32" rx="4" fill="#FFCC00"/><path d="M15 16c5-6 15-6 20 0" stroke="#002D62" stroke-width="2.5" fill="none"/><text x="62" y="21" fill="#002D62" font-family="Arial, sans-serif" font-weight="900" font-size="13" text-anchor="middle">Expedia</text></svg>`, 
            wrapperClass: "expedia" 
        },
        hotels: { 
            name: "Hotels.com", 
            subText: "", 
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 32"><rect width="110" height="32" rx="4" fill="#D92228"/><circle cx="20" cy="16" r="7" fill="#FFF"/><text x="64" y="21" fill="#FFFFFF" font-family="Arial, sans-serif" font-weight="800" font-size="12" text-anchor="middle">Hotels<tspan font-size="9" baseline-shift="super">.com</tspan></text></svg>`, 
            wrapperClass: "hotels" 
        },
        etstur: { 
            name: "ETS Tur", 
            subText: "", 
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 32"><rect width="110" height="32" rx="4" fill="#0B2545"/><text x="55" y="21" fill="#FF6B00" font-family="Arial, sans-serif" font-weight="900" font-size="14" letter-spacing="1" text-anchor="middle">ETSTUR</text></svg>`, 
            wrapperClass: "etstur" 
        },
        tatilbudur: { 
            name: "TatilBudur", 
            subText: "", 
            svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 32"><rect width="110" height="32" rx="4" fill="#FF6600"/><text x="55" y="21" fill="#FFFFFF" font-family="Arial, sans-serif" font-weight="800" font-size="12" text-anchor="middle">TatilBudur</text></svg>`, 
            wrapperClass: "tatilbudur" 
        }
    };

    return map[key] || { name: source, subText: "", svg: `<img src="excel.png" alt="Excel" onerror="this.onerror=null; this.parentElement.innerHTML='<span style=\\'color:#107C41;font-weight:bold;font-size:14px;\\'>EXCEL</span>';" />`, wrapperClass: "excel" };
}

function renderResultsV4() {
    injectPremiumStyles();

    const AppState = window.AppState;
    if (!AppState) return;

    const grid = document.getElementById("resultsGrid");
    if (!grid) return;
    grid.innerHTML = "";

    if (!AppState.results || !AppState.results.length) {
        grid.innerHTML = `
            <div class="empty-results-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <div style="font-size: 14px; font-weight: 600; color: var(--text-main);">Kriterlere uygun teklif bulunamadı</div>
                <div style="font-size: 12px; margin-top: 4px;">Lütfen tarih veya filtreleri kontrol edip tekrar deneyin.</div>
            </div>
        `;
        return;
    }

    const formatCurrencyFn = window.formatCurrency || ((v) => v);
    const formatDateTrFn = window.formatDateTr || ((v) => v);

    let nights = 1;
    if (AppState.searchParams?.nights) {
        nights = parseInt(AppState.searchParams.nights, 10) || 1;
    } else if (AppState.searchParams?.checkIn && AppState.searchParams?.checkOut) {
        const d1 = new Date(AppState.searchParams.checkIn);
        const d2 = new Date(AppState.searchParams.checkOut);
        if (!isNaN(d1) && !isNaN(d2)) {
            nights = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) || 1;
        }
    }

    const discountPercent = AppState.searchParams?.discountPercent || 0;

    const processedResults = AppState.results.map((room, idx) => {
        const originalPrice = Number(room.pricePerNight || room.totalPrice || 0);
        const finalPrice = discountPercent > 0 ? originalPrice * (1 - discountPercent / 100) : originalPrice;
        return {
            ...room,
            _id: idx,
            originalPrice,
            finalPrice,
            finalTotal: finalPrice * nights
        };
    });

    processedResults.sort((a, b) => a.finalTotal - b.finalTotal);

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const timestampHtml = `Price Check<br>${day}.${month}.${year} ${hours}:${minutes}`;

    processedResults.forEach((room, index) => {
        const source = getSourceInfo(room.source);
        const isBest = index === 0;

        const svgIcons = {
            calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
            moon: `<svg viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
            user: `<svg viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
            child: `<svg viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><path d="M17 21v-1.5a2.5 2.5 0 0 0-2.5-2.5h-5A2.5 2.5 0 0 0 7 18.5V21"/><circle cx="12" cy="7" r="3.5"/></svg>`
        };

        const card = `
            <div class="offer-card">
                <div class="card-main-body">
                    
                    <div class="source-column">
                        <div class="source-brand-wrapper ${source.wrapperClass || ''}">
                            ${source.svg}
                        </div>
                        <div class="source-name">
                            ${source.name}
                            ${source.subText ? `<small>${source.subText}</small>` : ''}
                        </div>
                        <div class="source-footer">${timestampHtml}</div>
                    </div>

                    <div class="card-details-area">
                        ${isBest ? `<div class="best-badge"><span style="width:10px;height:10px;fill:currentColor;display:inline-block;"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></span> EN UYGUN FİYAT</div>` : ""}
                        
                        <div class="room-title-row">
                            <h2>${room.roomType || "Deluxe Double Room"}</h2>
                            <span class="board-badge">${room.boardType || room.board || "BB"}</span>
                        </div>
                        
                        <div class="board-sub">${room.boardText || "Bed & Breakfast"}</div>
                        
                        <div class="room-meta-row">
                            <span><div style="width:12px;height:12px;display:inline-block;">${svgIcons.calendar}</div> ${formatDateTrFn(AppState.searchParams.checkIn)} → ${formatDateTrFn(AppState.searchParams.checkOut)}</span>
                            <span><div style="width:12px;height:12px;display:inline-block;">${svgIcons.moon}</div> ${nights} Gece</span>
                            <span><div style="width:12px;height:12px;display:inline-block;">${svgIcons.user}</div> ${AppState.searchParams.adults || 2} Yetişkin</span>
                            ${AppState.searchParams.children > 0 ? `<span><div style="width:12px;height:12px;display:inline-block;">${svgIcons.child}</div> ${AppState.searchParams.children} Çocuk</span>` : ""}
                        </div>
                    </div>

                    <div class="card-price-panel">
                        <div class="price-per-night">
                            <span class="price-amount">${formatCurrencyFn(room.finalPrice, room.currency)}</span>
                            <span class="price-label">/ gece</span>
                        </div>
                        <div class="price-divider"></div>
                        <div class="price-total-block">
                            <span class="total-label">TOPLAM</span>
                            <div class="total-amount">${formatCurrencyFn(room.finalTotal, room.currency)}</div>
                        </div>
                    </div>

                </div>

                <div class="card-actions-bar">
                    <div class="left-actions">
                        <button class="action-btn btn-whatsapp btn-action-share" data-id="${room._id}" data-type="whatsapp">
                            <svg viewBox="0 0 24 24"><path d="M12.031 0C5.405 0 0 5.412 0 12.046c0 2.127.553 4.195 1.603 6.012L.15 23.46l5.568-1.465A11.97 11.97 0 0012.031 24c6.627 0 12.032-5.412 12.032-12.046C24.063 5.413 18.658 0 12.031 0zm0 22.001c-1.802 0-3.568-.485-5.116-1.403l-.367-.217-3.805 1.001 1.018-3.71-.237-.378A9.97 9.97 0 012.005 12.04c0-5.523 4.494-10.025 10.026-10.025 5.522 0 10.025 4.502 10.025 10.025 0 5.523-4.493 10.026-10.026 10.026zm5.498-7.514c-.302-.151-1.785-.881-2.062-.981-.277-.101-.479-.151-.68.151-.202.302-.78 1.002-.956 1.203-.176.202-.353.227-.655.076-1.528-.764-2.613-1.492-3.633-3.219-.176-.301.176-.282.478-.881.076-.151.038-.282-.019-.433-.057-.151-.68-1.637-.932-2.242-.246-.59-.497-.51-.68-.521-.176-.006-.378-.006-.579-.006-.201 0-.529.076-.806.378-.277.302-1.057 1.032-1.057 2.518s1.082 2.918 1.233 3.12c.151.202 2.128 3.245 5.156 4.555.719.31 1.28.495 1.718.634.721.23 1.378.197 1.895.12.58-.087 1.785-.73 2.037-1.434.252-.704.252-1.308.176-1.434-.076-.126-.277-.202-.579-.353z"/></svg>
                            WhatsApp
                        </button>
                        <button class="action-btn btn-mail btn-action-share" data-id="${room._id}" data-type="email">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            Mail
                        </button>
                        <button class="action-btn btn-copy btn-action-share" data-id="${room._id}" data-type="copy">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            Kopyala
                        </button>
                    </div>
                    <div class="right-actions">
                        <button class="action-btn btn-pdf btn-action-share" data-id="${room._id}" data-type="pdf">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            PDF
                        </button>
                        <button class="action-btn btn-print btn-action-share" data-id="${room._id}" data-type="print">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                            Yazdır
                        </button>
                        <button class="action-btn btn-voucher btn-action-share" data-id="${room._id}" data-type="voucher">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                            Voucher
                        </button>
                        <button class="action-btn btn-reserve btn-action-share btn-reservation" data-id="${room._id}" data-type="reserve">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                            Rezervasyon Formu
                        </button>
                    </div>
                </div>
            </div>
        `;

        grid.insertAdjacentHTML("beforeend", card);
    });

    document.querySelectorAll(".btn-action-share").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = parseInt(e.currentTarget.dataset.id, 10);
            const type = e.currentTarget.dataset.type;
            const room = processedResults.find(r => r._id === id);
            if (room && window.prepareShare) {
                window.prepareShare(room, type);
            }
        });
    });
}

window.renderResults = renderResultsV4;
window.renderResultsV4 = renderResultsV4;
window.getSourceInfo = getSourceInfo;