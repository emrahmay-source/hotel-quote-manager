let previousNightCount = 1;
 let checkOutPicker = null;
function updateNightCount() {
    "updateNightCount",
    document.getElementById("checkinDate").value,
    document.getElementById("checkoutDate").value

    const checkin = document.getElementById("checkinDate").value;
    const checkout = document.getElementById("checkoutDate").value;

    if (!checkin || !checkout) return;

    const [y1, m1, d1] = checkin.split("-").map(Number);
    const [y2, m2, d2] = checkout.split("-").map(Number);

    const start = new Date(y1, m1 - 1, d1);
    const end = new Date(y2, m2 - 1, d2);

    const diff = Math.max(
        1,
        Math.round((end - start) / 86400000)
    );

    document.getElementById("nightCount").value = diff;

    previousNightCount = diff;

}
function updateCheckoutFromNightCount() {
    const checkin = document.getElementById("checkinDate").value;
    if (!checkin) return;

    const nights = Math.max(
        1,
        parseInt(document.getElementById("nightCount").value) || 1
    );

    const [y, m, d] = checkin.split("-").map(Number);

    const checkout = new Date(y, m - 1, d);
    checkout.setDate(checkout.getDate() + nights);

    if (checkOutPicker) {
        document.getElementById("checkoutDate").value =
    checkout.getFullYear() + "-" +
    String(checkout.getMonth() + 1).padStart(2, "0") + "-" +
    String(checkout.getDate()).padStart(2, "0");
    }
    previousNightCount = nights;
}
document.addEventListener('DOMContentLoaded', () => {
    // ═══════════════════ STATE MANAGEMENT ═══════════════════
    window.AppState = {
        settings: {
            hotelName: '',
            phone: '',
            hotelUrls: {
                booking: '',
                expedia: '',
                hotels: '',
                etstur: '',
                tatilbudur: ''
            },
            proxy: '',
            customOtas: []
        },
        childPricing: [
            { minAge: 0, maxAge: 5, type: 'free', value: 0 },
            { minAge: 6, maxAge: 11, type: 'percent', value: 50 },
            { minAge: 12, maxAge: 17, type: 'full', value: 0 }
        ],
        searchParams: {
            checkIn: '',
            checkOut: '',
            adults: 2,
            children: 0,
            childAges: [],
            boardTypes: ['bed_breakfast'],
            discountPercent: 0,
            discountReason: '',
            customDiscountText: '',
            sources: ['booking', 'expedia', 'hotels']
        },
        exchangeRates: { date: '-', rates: {} },
        excelData: { headers: [], rows: [] },
        columnMapping: {},
        results: []

    };
    
const nightInput = document.getElementById("nightCount");

nightInput.addEventListener("input", updateCheckoutFromNightCount);

    updateCheckoutFromNightCount();


    // ═══════════════════ UTILS & TOASTS ═══════════════════
    const formatCurrency = (amount, currency = 'TRY') => {

    return new Intl.NumberFormat('tr-TR', {

        style: 'currency',

        currency: currency

    }).format(amount);

};
window.formatCurrency = formatCurrency;
    const formatDateTr = (dateStr) => {
        if(!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    };
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerText = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    // ═══════════════════ INITIALIZATION & SETTINGS ═══════════════════
    function initApp() {
    loadSettings();
    fetchExchangeRates();
    setupEventListeners();
    initDatePickers();
    renderChildAgeInputs();
    }

    async function loadSettings() {
        try {
            const savedSettings = localStorage.getItem('hqm_settings');
            if (savedSettings) {
                AppState.settings = JSON.parse(savedSettings);
                applySettingsToUI();
            }
            const savedChildPricing = localStorage.getItem('hqm_childPricing');
            if(savedChildPricing) {
                AppState.childPricing = JSON.parse(savedChildPricing);
            }
        } catch (e) {
            console.error('Error loading settings', e);
        }
    }
    function applySettingsToUI() {
        document.getElementById('headerHotelName').innerText = AppState.settings.hotelName || 'Otel Adı';
        document.getElementById('settingsHotelName').value = AppState.settings.hotelName;
        document.getElementById('settingsPhone').value = AppState.settings.phone;
        document.getElementById('settingsBookingUrl').value = AppState.settings.hotelUrls.booking;
        document.getElementById('settingsExpediaUrl').value = AppState.settings.hotelUrls.expedia;
        document.getElementById('settingsHotelsUrl').value = AppState.settings.hotelUrls.hotels;
        document.getElementById('settingsEtsUrl').value = AppState.settings.hotelUrls.etstur;
        document.getElementById('settingsTatilbudurUrl').value = AppState.settings.hotelUrls.tatilbudur;
        document.getElementById('settingsProxy').value = AppState.settings.proxy || '';
        
        // TODO: custom OTAs
    }
    async function saveSettings() {
        AppState.settings.hotelName = document.getElementById('settingsHotelName').value;
        AppState.settings.phone = document.getElementById('settingsPhone').value;
        AppState.settings.hotelUrls.booking = document.getElementById('settingsBookingUrl').value;
        AppState.settings.hotelUrls.expedia = document.getElementById('settingsExpediaUrl').value;
        AppState.settings.hotelUrls.hotels = document.getElementById('settingsHotelsUrl').value;
        AppState.settings.hotelUrls.etstur = document.getElementById('settingsEtsUrl').value;
        AppState.settings.hotelUrls.tatilbudur = document.getElementById('settingsTatilbudurUrl').value;
        AppState.settings.proxy = document.getElementById('settingsProxy').value;
        localStorage.setItem('hqm_settings', JSON.stringify(AppState.settings));
        
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(AppState.settings)
            });
            showToast('Ayarlar kaydedildi', 'success');
            document.getElementById('headerHotelName').innerText = AppState.settings.hotelName || 'Otel Adı';
            closeSettingsSidebar();
        } catch (e) {
            console.error('API save error', e);
            showToast('Ayarlar yerel olarak kaydedildi', 'success');
            document.getElementById('headerHotelName').innerText = AppState.settings.hotelName || 'Otel Adı';
            closeSettingsSidebar();
        }
    }
    // ═══════════════════ EXCHANGE RATES ═══════════════════
    async function fetchExchangeRates() {
        try {
            const res = await fetch('/api/exchange-rates');
            if (res.ok) {
                const data = await res.json();
                AppState.exchangeRates = data;
                document.getElementById('tickerEUR').innerHTML = `<span class="ticker-flag">🇪🇺</span> EUR <span class="ticker-value">${data.rates.EUR.selling.toFixed(2)}</span>`;
                document.getElementById('tickerUSD').innerHTML = `<span class="ticker-flag">🇺🇸</span> USD <span class="ticker-value">${data.rates.USD.selling.toFixed(2)}</span>`;
                document.getElementById('summaryRateDate').innerText = data.date;
                document.getElementById('exchangeWarningText').innerText = `Fiyatlar ${data.date} tarihli TCMB döviz kurları baz alınarak hesaplanmıştır. Rezervasyon yapıldığı günkü kurdan hesaplama yapılacaktır, fiyatlarda değişiklik olabilir.`;
                document.getElementById('headerDate').innerText = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
            }
        } catch (e) {
            console.error('Could not fetch exchange rates', e);
        }
    }

function initDatePickers() {

    const today = new Date();

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    checkOutPicker = flatpickr("#checkoutDate", {

        locale: "tr",
        minDate: tomorrow,
        dateFormat: "Y-m-d",
        defaultDate: tomorrow,

        onChange: () => {
 
            updateNightCount();

        }

    });

    flatpickr("#checkinDate", {

        locale: "tr",
        minDate: "today",
        dateFormat: "Y-m-d",
        defaultDate: today,

        onChange: (selectedDates) => {

            const checkInDate = selectedDates[0];

            if (!checkInDate) return;

            const nights =
                parseInt(document.getElementById("nightCount").value) || 1;

            const minCheckout = new Date(checkInDate);
            minCheckout.setDate(minCheckout.getDate() + 1);

            checkOutPicker.set("minDate", minCheckout);

            const newCheckout = new Date(checkInDate);
            newCheckout.setDate(newCheckout.getDate() + nights);

            checkOutPicker.setDate(newCheckout, false);

            updateNightCount();

        }

    });

    checkOutPicker.setDate(tomorrow, false);

    updateNightCount();

}

function renderChildAgeInputs() {

    const container = document.getElementById("childAgeContainer");
    const inputs = document.getElementById("childAgeInputs");

    if (!container || !inputs) return;

    const childCount = AppState.searchParams.children || 0;

    if (childCount === 0) {

        container.style.display = "none";
        inputs.innerHTML = "";
        return;

    }

    container.style.display = "block";
    inputs.innerHTML = "";

    if (!AppState.searchParams.childAges) {
        AppState.searchParams.childAges = [];
    }

    for (let i = 0; i < childCount; i++) {

        const age =
            AppState.searchParams.childAges[i] ?? 5;

        const row = document.createElement("div");

        row.className = "child-age-row";

        row.innerHTML = `
            <label>👶 Çocuk ${i + 1}</label>

            <input
                type="number"
                class="form-input child-age-input"
                min="0"
                max="17"
                value="${age}">

            <span>yaş</span>
        `;

        row.querySelector("input")
            .addEventListener("input", function () {

                AppState.searchParams.childAges[i] =
                    parseInt(this.value) || 0;

            });

        inputs.appendChild(row);

    }

}

    // ═══════════════════ EVENT LISTENERS & UI ═══════════════════
    function setupEventListeners() {
        // Sidebar
        document.getElementById('btnOpenSettings').addEventListener('click', openSettingsSidebar);
        document.getElementById('btnCloseSettings').addEventListener('click', closeSettingsSidebar);
        document.getElementById('sidebarOverlay').addEventListener('click', closeSettingsSidebar);
        document.getElementById('btnSaveSettings').addEventListener('click', saveSettings);
        // Steppers
        document.querySelectorAll('.stepper-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.target.getAttribute('data-target');
                if (!targetId) return;
                const isPlus = e.target.classList.contains('stepper-plus');
                const min = parseInt(e.target.getAttribute('data-min') || 0);
                const max = parseInt(e.target.getAttribute('data-max') || 10);
                
                let val = parseInt(document.getElementById(targetId).innerText);
                if (isPlus && val < max) val++;
                if (!isPlus && val > min) val--;
                
                document.getElementById(targetId).innerText = val;
                
                if (targetId === 'adultCount') AppState.searchParams.adults = val;
               if (targetId === 'childCount') {
    AppState.searchParams.children = val;
    renderChildAgeInputs();
}
            });
        });
  // Night Selector

document.getElementById("btnNightMinus")?.addEventListener("click", () => {

    const input = document.getElementById("nightCount");

    let value = parseInt(input.value) || 1;

    if (value > 1) {

        value--;

        input.value = value;

        updateCheckoutFromNightCount();

    }

});

document.getElementById("btnNightPlus")?.addEventListener("click", () => {

    const input = document.getElementById("nightCount");

    let value = parseInt(input.value) || 1;

    value++;

    input.value = value;

    updateCheckoutFromNightCount();

});

document.getElementById("nightCount")?.addEventListener("input", () => {

    updateCheckoutFromNightCount();



});
        // Discount Reason
        document.getElementById('discountReason').addEventListener('change', (e) => {
            if (e.target.value === 'other') {
                document.getElementById('customDiscountGroup').style.display = 'block';
            } else {
                document.getElementById('customDiscountGroup').style.display = 'none';
            }
        });
        // Search Button
        document.getElementById('btnSearch').addEventListener('click', performSearch);
        // Child Wizard
        document.getElementById('btnCloseChildWizard').addEventListener('click', closeChildWizard);
        document.getElementById('btnApplyChildWizard').addEventListener('click', applyChildWizard);
        document.getElementById('btnChildDefaults').addEventListener('click', applyChildDefaults);
        // Acenta Ekle
        const btnAddOta = document.getElementById('btnAddOta');
        if (btnAddOta) {
            btnAddOta.addEventListener('click', () => {
                const container = document.getElementById('customOtaContainer');
                const id = Date.now();
                const div = document.createElement('div');
                div.className = 'form-group custom-ota-item';
                div.id = `customOta_${id}`;
                div.innerHTML = `
                    <label>Özel Acenta Adı ve URL'si</label>
                    <div style="display:flex; gap:10px; margin-bottom:5px;">
                        <input type="text" class="form-input custom-ota-name" placeholder="Acenta Adı (örn: Jolly Tur)">
                        <button class="btn-icon" style="color:var(--error)" onclick="document.getElementById('customOta_${id}').remove()">🗑️</button>
                    </div>
                    <input type="url" class="form-input custom-ota-url" placeholder="https://...">
                `;
                container.appendChild(div);
            });
        }
        // Excel Upload
        const dropZone = document.getElementById('fileDropZone');
        const fileInput = document.getElementById('excelFileInput');
        
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) handleExcelUpload(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) handleExcelUpload(e.target.files[0]);
        });
        document.getElementById('btnRemoveFile').addEventListener('click', (e) => {
            e.stopPropagation();
            removeExcelFile();
        });
       // Excel Mapping & Share Modals
document.getElementById('btnCloseExcelMapping').addEventListener('click', closeExcelMappingModal);
document.getElementById('btnCancelMapping').addEventListener('click', closeExcelMappingModal);
document.getElementById('btnSaveMapping').addEventListener('click', saveExcelMapping);
document.getElementById('btnCloseShare').addEventListener('click', () => document.getElementById('shareModalOverlay').style.display = 'none');
document.getElementById('btnShareWhatsApp').addEventListener('click', shareWhatsApp);
document.getElementById('btnShareEmail').addEventListener('click', shareEmail);
document.getElementById('btnShareCopy').addEventListener('click', shareCopy);
    
    }

function openSettingsSidebar() {
    document.getElementById('settingsSidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('open');
}

function closeSettingsSidebar() {
    document.getElementById('settingsSidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
}
    function openChildWizard() {
        console.log("openChildWizard çalıştı");
        const grid = document.getElementById('childAgesGrid');
        grid.innerHTML = '';
        const count = AppState.searchParams.children;
        for (let i = 0; i < count; i++) {
            const currentAge = AppState.searchParams.childAges[i] || 0;
            grid.innerHTML += `
                <div class="form-group child-age-item">
                    <label>Çocuk ${i + 1} Yaşı</label>
                    <input type="number" class="form-input child-age-input" value="${currentAge}" min="0" max="17">
                </div>
            `;
        }
        renderAgeGroups();
        document.getElementById('childWizardOverlay').style.display = 'flex';
    }
    function closeChildWizard() {
        document.getElementById('childWizardOverlay').style.display = 'none';
    }
    function renderAgeGroups() {
        const container = document.getElementById('ageGroupsContainer');
        container.innerHTML = '';
        AppState.childPricing.forEach((group, index) => {
            container.innerHTML += `
                <div class="age-group-row">
                    <div class="age-range">
                        <input type="number" class="form-input age-min" value="${group.minAge}" data-index="${index}"> - 
                        <input type="number" class="form-input age-max" value="${group.maxAge}" data-index="${index}"> Yaş
                    </div>
                    <div class="age-policy">
                        <select class="form-select policy-type" data-index="${index}">
                            <option value="free" ${group.type === 'free' ? 'selected' : ''}>Ücretsiz</option>
                            <option value="percent" ${group.type === 'percent' ? 'selected' : ''}>% İndirimli</option>
                            <option value="fixed" ${group.type === 'fixed' ? 'selected' : ''}>Sabit Fiyat</option>
                            <option value="full" ${group.type === 'full' ? 'selected' : ''}>Tam Fiyat</option>
                        </select>
                        <input type="number" class="form-input policy-value" value="${group.value}" data-index="${index}" style="display: ${['percent', 'fixed'].includes(group.type) ? 'inline-block' : 'none'}; width: 80px;">
                    </div>
                </div>
            `;
        });
        document.querySelectorAll('.policy-type').forEach(sel => {
            sel.addEventListener('change', (e) => {
                const idx = e.target.getAttribute('data-index');
                const valInput = document.querySelector(`.policy-value[data-index="${idx}"]`);
                if (['percent', 'fixed'].includes(e.target.value)) {
                    valInput.style.display = 'inline-block';
                } else {
                    valInput.style.display = 'none';
                }
            });
        });
    }
    function applyChildWizard() {
        // Collect ages
        AppState.searchParams.childAges = [];
        document.querySelectorAll('.child-age-input').forEach(input => {
            AppState.searchParams.childAges.push(parseInt(input.value));
        });
        // Collect policies
        AppState.childPricing = [];
        document.querySelectorAll('.age-group-row').forEach(row => {
            const minAge = parseInt(row.querySelector('.age-min').value);
            const maxAge = parseInt(row.querySelector('.age-max').value);
            const type = row.querySelector('.policy-type').value;
            const value = parseFloat(row.querySelector('.policy-value').value || 0);
            AppState.childPricing.push({ minAge, maxAge, type, value });
        });
        localStorage.setItem('hqm_childPricing', JSON.stringify(AppState.childPricing));
        closeChildWizard();
    }
    function applyChildDefaults() {
        AppState.childPricing = [
            { minAge: 0, maxAge: 5, type: 'free', value: 0 },
            { minAge: 6, maxAge: 11, type: 'percent', value: 50 },
            { minAge: 12, maxAge: 17, type: 'full', value: 0 }
        ];
        renderAgeGroups();
    }
    // ═══════════════════ EXCEL UPLOAD ═══════════════════
    async function handleExcelUpload(file) {

    document.getElementById("fileName").textContent = file.name;
    document.getElementById("dropPlaceholder").style.display = "none";
    document.getElementById("dropFile").style.display = "flex";

    const formData = new FormData();
    formData.append('file', file);

    try {

        showToast('Excel işleniyor...', 'info');

        const res = await fetch('/api/parse-excel', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        // ==========================
        // MATRIX FORMAT
        // ==========================

        if (data.format === 'matrix') {

            AppState.excelData.rooms = data.rooms || [];

            showToast(
                `${AppState.excelData.rooms.length} kayıt bulundu`,
                'success'
            );

            return;
        }

        // ==========================
        // NORMAL EXCEL
        // ==========================

        AppState.excelData.sheetNames = data.sheetNames || [];
        AppState.excelData.selectedSheet = data.selectedSheet || null;
        AppState.excelData.headers = data.headers || [];
        AppState.excelData.rows = data.data || [];

        openExcelMappingModal(
            data.headers,
            data.suggestedMapping
        );

    } catch (e) {

        console.error('Excel parse error', e);

        showToast(
            'Excel yüklenirken hata oluştu',
            'error'
        );

        removeExcelFile();
    }
}
    
    function removeExcelFile() {
        const input = document.getElementById('excelFileInput');
        if (input) input.value = '';
        document.getElementById("fileName").textContent = "";

document.getElementById("dropPlaceholder").style.display = "flex";

document.getElementById("dropFile").style.display = "none";
        AppState.excelData = { headers: [], rows: [], rooms: [], sheetNames: [], selectedSheet: null };
        AppState.columnMapping = {};
    }

    function openExcelMappingModal(headers, suggestedMapping) {
        const modal = document.getElementById('excelMappingModal');
        const container = document.getElementById('mappingFieldsContainer');
        if (!modal || !container) {
            if (suggestedMapping && typeof suggestedMapping === 'object') {
                AppState.columnMapping = suggestedMapping;
                showToast('Excel sütun eşleştirmesi otomatik uygulandı', 'success');
            }
            return;
        }
        container.innerHTML = '';
        const fields = [
            { key: 'roomType', label: 'Oda Tipi', required: true },
            { key: 'price', label: 'Fiyat', required: true },
            { key: 'boardType', label: 'Pansiyon', required: false },
            { key: 'features', label: 'Özellikler', required: false },
            { key: 'currency', label: 'Para Birimi', required: false }
        ];
        fields.forEach(field => {
            const div = document.createElement('div');
            div.className = 'form-group';
            let options = '<option value="">-- Seçiniz --</option>';
            headers.forEach(h => {
                const selected = suggestedMapping && suggestedMapping[field.key] === h ? 'selected' : '';
                options += `<option value="${h}" ${selected}>${h}</option>`;
            });
            div.innerHTML = `<label>${field.label}${field.required ? ' <span style="color:var(--error)">*</span>' : ''}</label><select class="form-select mapping-field" data-field="${field.key}">${options}</select>`;
            container.appendChild(div);
        });
        modal.style.display = 'flex';
    }

    function closeExcelMappingModal() {
        const modal = document.getElementById('excelMappingModal');
        if (modal) modal.style.display = 'none';
    }

    function saveExcelMapping() {
        const selects = document.querySelectorAll('.mapping-field');
        const mapping = {};
        selects.forEach(sel => {
            const field = sel.getAttribute('data-field');
            const value = sel.value;
            if (value) mapping[field] = value;
        });
        if (!mapping.roomType || !mapping.price) {
            showToast('Oda Tipi ve Fiyat alanları zorunludur', 'error');
            return;
        }
        AppState.columnMapping = mapping;
        closeExcelMappingModal();
        showToast('Sütun eşleştirmesi kaydedildi', 'success');
    }

    // ═══════════════════ SEARCH ENGINE ═══════════════════
    function getBoardTypesMap() {
        return {
            'room_only': 'Sadece Oda',
            'bed_breakfast': 'Oda+Kahvaltı',
            'half_board': 'Yarım Pansiyon',
            'full_board': 'Tam Pansiyon',
            'all_inclusive': 'Her Şey Dahil',
            'ultra_all_inclusive': 'Ultra Her Şey Dahil'
        };
    }
    async function performSearch() {
        const checkIn = document.getElementById('checkinDate').value;
        const checkOut = document.getElementById('checkoutDate').value;
        if (!checkIn || !checkOut) {
            showToast('Lütfen giriş ve çıkış tarihlerini seçin', 'error');
            return;
        }
        AppState.searchParams.checkIn = checkIn;
        AppState.searchParams.checkOut = checkOut;
        AppState.searchParams.discountPercent = parseFloat(document.getElementById('discountPercent').value) || 0;
        
        const boardTypes = [];
        document.querySelectorAll('input[name="boardType"]:checked').forEach(cb => boardTypes.push(cb.value));
        AppState.searchParams.boardTypes = boardTypes;
        const sources = [];
        document.querySelectorAll('input[name="source"]:checked').forEach(cb => sources.push(cb.value));
        AppState.searchParams.sources = sources;
        // UI Updates
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('exchangeWarning').style.display = 'flex';
        document.getElementById('resultsGrid').innerHTML = '';
        AppState.results = [];
        // Summary update
        document.getElementById('summaryDates').innerText = `${formatDateTr(checkIn)} - ${formatDateTr(checkOut)}`;
        document.getElementById('summaryNights').innerText = document.getElementById('nightCount').innerText;
        
        let guestStr = `${AppState.searchParams.adults} Yetişkin`;
        if (AppState.searchParams.children > 0) {
            guestStr += `, ${AppState.searchParams.children} Çocuk (${AppState.searchParams.childAges.join(', ')})`;
        }
        document.getElementById('summaryGuests').innerText = guestStr;
        
        const eur = AppState.exchangeRates.rates?.EUR?.selling || 0;
        const usd = AppState.exchangeRates.rates?.USD?.selling || 0;
        document.getElementById('summaryRates').innerText = `1€=${eur.toFixed(2)}₺ | 1$=${usd.toFixed(2)}₺`;
        // Status bar setup
        const statusBar = document.getElementById('sourceStatusBar');
        statusBar.innerHTML = '';
        sources.forEach(src => {
            statusBar.innerHTML += `
                <div class="status-item" id="status-${src}">
                    <span class="status-indicator status-loading"></span>
                    <span class="status-name">${src.toUpperCase()}</span>
                    <span class="status-text">Aranıyor...</span>
                </div>
            `;
        });
       // 1. Process Excel local data if selected
if (
    sources.includes('excel') &&
    (
        AppState.excelData.rooms?.length > 0 ||
        AppState.excelData.rows?.length > 0
    )
) {

    processExcelData();

    updateSourceStatus(
        'excel',
        'success',
        `${AppState.results.length} oda bulundu`
    );

    renderResultsV4();

} else if (sources.includes('excel')) {

    updateSourceStatus(
        'excel',
        'error',
        'Excel yüklenmedi'
    );

}
        // 2. Fetch OTA data
        const otaSources = sources.filter(s => s !== 'excel');
        if (otaSources.length > 0) {
            fetchOtaPrices(otaSources);
        }
    }
    function updateSourceStatus(source, state, text) {
        const el = document.getElementById(`status-${source}`);
        if (!el) return;
        const indicator = el.querySelector('.status-indicator');
        const textEl = el.querySelector('.status-text');
        indicator.className = `status-indicator status-${state}`;
        textEl.innerText = text;
    }
   function processExcelData() {

    // Her aramada eski sonuçları temizle
    AppState.results = [];

    // ===========================
    // MATRIX FORMAT
    // ===========================
    if (AppState.excelData.rooms?.length) {

        const nights = parseInt(document.getElementById('nightCount').innerText) || 1;

        AppState.excelData.rooms.forEach(room => {

            const price =
                Number(
                    room.pricePerNight ??
                    room.price ??
                    room.totalPrice ??
                    0
                );

            if (!price) return;

            AppState.results.push({

                source: 'excel',

                roomType:
                    room.roomName ||
                    room.roomType ||
                    room.name ||
                    'Oda',

                boardType:
                    room.boardType ||
                    room.board ||
                    '',

                pricePerNight: price,

                totalPrice: price * nights,

                currency:
                    room.currency ||
                    'TRY',

                features:
                    room.features || []

            });

        });

        return;
    }

    // ===========================
    // ESKİ EXCEL SİSTEMİ
    // ===========================

    const map = AppState.columnMapping;

    if (!('price' in map) || !('roomType' in map))
        return;

    const nights = parseInt(document.getElementById('nightCount').innerText);

    const bMap = getBoardTypesMap();

    const selectedBoards =
        AppState.searchParams.boardTypes.map(b => bMap[b]);

    AppState.excelData.rows.forEach(row => {

        const roomType = row[map.roomType];

        let price = parseFloat(row[map.price]);

        if (isNaN(price))
            return;

        const boardType =
            'boardType' in map
                ? row[map.boardType]
                : selectedBoards[0] || 'Oda+Kahvaltı';

        const features =
            'features' in map
                ? String(row[map.features]).split(',').map(s => s.trim())
                : [];

        AppState.results.push({

            source: 'excel',

            roomType,

            boardType,

            pricePerNight: price,

            totalPrice: price * nights,

            currency: 'TRY',

            features

        });

    });

}
    
    async function fetchOtaPrices(sources) {
        try {
            const reqBody = {
                sources: sources,
                hotelUrls: AppState.settings.hotelUrls,
                checkIn: AppState.searchParams.checkIn,
                checkOut: AppState.searchParams.checkOut,
                adults: AppState.searchParams.adults,
                children: AppState.searchParams.children,
                childAges: AppState.searchParams.childAges,
                proxy: AppState.settings.proxy
            };
            const response = await fetch('/api/search-prices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reqBody)
            });
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop();
                
                for (const line of lines) {
                    if (line.trim().startsWith('data: ')) {
                        const dataStr = line.trim().replace('data: ', '');
                        if (!dataStr) continue;
                        try {
                            const data = JSON.parse(dataStr);
                            if (data.type === 'done') continue;
                            
                            if (data.status === 'success') {
                                if(data.rooms && data.rooms.length > 0) {
                                    data.rooms.forEach(r => {
                                        r.source = data.source;
                                        AppState.results.push(r);
                                    });
                                    updateSourceStatus(data.source, 'success', `${data.rooms.length} oda bulundu`);
                                    renderResultsV4();;
                                } else {
                                    updateSourceStatus(data.source, 'error', `Oda bulunamadı`);
                                }
                            } else if (data.status === 'loading') {
                                // already loading
                            } else {
                                updateSourceStatus(data.source, 'error', data.error || 'Hata');
                                if (data.manualUrl) {
                                    const el = document.getElementById(`status-${data.source}`);
                                    el.innerHTML += ` <a href="${data.manualUrl}" target="_blank" style="color:var(--gold)">🔗 Manuel</a>`;
                                }
                            }
                        } catch(e) {
                            console.error("SSE parse error", e, dataStr);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Fetch OTA error', e);
        }
    }
    
   // ═══════════════════ RESULTS RENDERING V3 ═══════════════════

function renderResults() {

    const grid = document.getElementById("resultsGrid");
    grid.innerHTML = "";

    if (!AppState.results.length) return;
    const nights =
    parseInt(document.getElementById("nightCount").value, 10) || 1;

    const discountPercent = AppState.searchParams.discountPercent || 0;

    const processedResults = AppState.results.map((room, idx) => {

        const originalPrice = Number(room.pricePerNight);

        const finalPrice =
            discountPercent > 0
                ? originalPrice * (1 - discountPercent / 100)
                : originalPrice;

        return {
            ...room,
            _id: idx,
            originalPrice,
            finalPrice,
            finalTotal: finalPrice * nights
        };

    });

    processedResults.sort((a, b) => a.finalTotal - b.finalTotal);

    processedResults.forEach((room, index) => {
console.log(room);
        const source = getSourceInfo(room.source);

        const isBest = index === 0;

        const checkedTime = new Date().toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit"
        });

        const checkedDate = new Date().toLocaleDateString("tr-TR");

        let featuresHtml = "";

        if (room.features && room.features.length) {

            featuresHtml = room.features
                .slice(0, 4)
                .map(f => `<span class="feature-tag">${f}</span>`)
                .join("");

        }

        let priceHtml = "";

        if (room.finalPrice < room.originalPrice) {

            priceHtml = `
    <div class="price-discounted">
        ${formatCurrency(room.finalPrice, room.currency)}
        <span>/gece</span>
    </div>


                <div class="price-discounted">
                    ${formatCurrency(room.finalPrice, room.currency)}
                    <span>/gece</span>
                </div>
            `;

        } else {

           priceHtml = `
    <div class="price-discounted">
        ${formatCurrency(room.finalPrice, room.currency)}
        <span>/gece</span>
    </div>
`;

        }

        const cardHtml = `
        <div class="offer-card glass-card ${isBest ? 'best-price' : ''}">

    ${isBest ? `
        <div class="best-price-badge">
            🥇 EN UYGUN
        </div>
    ` : ""}

    <div class="offer-main">

    <div class="offer-left">...</div>

    <div class="offer-center">...</div>

    <div class="offer-right">...</div>

</div>

    <div class="offer-actions">

        <div class="offer-group">

            <button class="btn-icon-text btn-action-share"
                    data-id="${room._id}"
                    data-type="whatsapp">

                WhatsApp

            </button>

            <button class="btn-icon-text btn-action-share"
                    data-id="${room._id}"
                    data-type="email">

                Mail

            </button>

            <button class="btn-icon-text btn-action-share"
                    data-id="${room._id}"
                    data-type="copy">

                Kopyala

            </button>

        </div>

        <div class="offer-divider"></div>

        <div class="offer-group">
                    <button class="btn-icon-text btn-action-pdf">

                PDF

            </button>

            <button class="btn-icon-text btn-action-print">

                Yazdır

            </button>

            <button class="btn-icon-text btn-action-voucher">

                Voucher

            </button>

            <button class="btn-icon-text btn-action-reservation">

                Rezervasyon

            </button>

        </div>

    </div>

</div>

`;

grid.innerHTML += cardHtml;

});
document.querySelectorAll(".btn-action-share").forEach(btn => {

    btn.addEventListener("click", (e) => {

        const id = parseInt(e.currentTarget.dataset.id);

        const type = e.currentTarget.dataset.type;

        const room = processedResults.find(r => r._id === id);

        if (room) {

            prepareShare(room, type);

        }

    });

});

}
function getSourceInfo(source) {

    const map = {

        excel: {
            name: "Excel",
            icon: "📊",
            color: "#4CAF50"
        },

        booking: {
            name: "Booking",
            icon: "🅱️",
            color: "#003580"
        },

        expedia: {
            name: "Expedia",
            icon: "✈️",
            color: "#FFB000"
        },

        hotels: {
            name: "Hotels.com",
            icon: "🏨",
            color: "#D32F2F"
        },

        etstur: {
            name: "ETS",
            icon: "🌴",
            color: "#FF9800"
        },

        tatilbudur: {
            name: "TatilBudur",
            icon: "🏖️",
            color: "#E91E63"
        }

    };

    return map[source] || {

        name: source,

        icon: "🌐",

        color: "#888"

    };

}

    // ═══════════════════ SHARE MANAGER ═══════════════════
    let currentShareText = '';
    function prepareShare(room, type) {
        const nights = parseInt(document.getElementById('nightCount').innerText);
        const checkin = document.getElementById('checkinDate').value;
        const checkout = document.getElementById('checkoutDate').value;
        const hotelName = AppState.settings.hotelName || 'Otel';
        const phone = AppState.settings.phone || '';
        
        let guestStr = `${AppState.searchParams.adults} Yetişkin`;
        if (AppState.searchParams.children > 0) {
            guestStr += `, ${AppState.searchParams.children} Çocuk (${AppState.searchParams.childAges.join(',')} yaş)`;
        }
        let discountStr = '';
        if (AppState.searchParams.discountPercent > 0) {
            const reason = document.getElementById('discountReason').options[document.getElementById('discountReason').selectedIndex].text;
            discountStr = `\n(İndirimli: %${AppState.searchParams.discountPercent} ${reason})`;
        }
        const text = `🏨 ${hotelName} - Fiyat Teklifi
📅 Giriş: ${formatDateTr(checkin)}
📅 Çıkış: ${formatDateTr(checkout)}
🌙 ${nights} Gece
👤 ${guestStr}
🛏️ Oda: ${room.roomType}
🍽️ Pansiyon: ${room.boardType || '-'}
💰 Gecelik: ${formatCurrency(room.finalPrice)}${discountStr}
💰 Toplam: ${formatCurrency(room.finalTotal)}
⚠️ Fiyatlar ${AppState.exchangeRates.date || ''} tarihli kurlara göre hesaplanmıştır. Rezervasyon yapıldığı gün kur farkı oluşabilir.
📞 Bilgi & Rezervasyon: ${phone}`;
        currentShareText = text;
        document.getElementById('sharePreviewText').innerText = text;
        document.getElementById('shareModalOverlay').style.display = 'flex';
        
        // Hide/show correct buttons based on quick action
        if(type === 'whatsapp') {
            document.getElementById('btnShareEmail').style.display = 'none';
            document.getElementById('btnShareCopy').style.display = 'none';
            document.getElementById('btnShareWhatsApp').style.display = 'flex';
        } else if(type === 'email') {
            document.getElementById('btnShareWhatsApp').style.display = 'none';
            document.getElementById('btnShareCopy').style.display = 'none';
            document.getElementById('btnShareEmail').style.display = 'flex';
        } else {
            document.getElementById('btnShareWhatsApp').style.display = 'none';
            document.getElementById('btnShareEmail').style.display = 'none';
            document.getElementById('btnShareCopy').style.display = 'flex';
        }
    }
    function shareWhatsApp() {
        const phone = document.getElementById('sharePhone').value.replace(/[^0-9]/g, '');
        const encodedText = encodeURIComponent(currentShareText);
        const url = phone ? `https://wa.me/${phone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
        window.open(url, '_blank');
        closeShareModal();
    }
    function shareEmail() {
        const subject = encodeURIComponent(`${AppState.settings.hotelName || 'Otel'} Fiyat Teklifi`);
        const encodedText = encodeURIComponent(currentShareText);
        window.open(`mailto:?subject=${subject}&body=${encodedText}`, '_self');
        closeShareModal();
    }
    function shareCopy() {
        navigator.clipboard.writeText(currentShareText).then(() => {
            showToast('Teklif panoya kopyalandı', 'success');
            closeShareModal();
        });
    }
    function closeShareModal() {
        document.getElementById('shareModalOverlay').style.display = 'none';
        // Reset buttons display
        document.querySelectorAll('.btn-share').forEach(b => b.style.display = 'flex');
    }
    // Run
    initApp();
    //renderResultsV4();
    window.formatCurrency = formatCurrency;
    window.formatDateTr = formatDateTr;
    window.prepareShare = prepareShare;
});
