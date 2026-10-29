// FILE: assets/js/pages/tenants.js
// Tenants Management - Full Backend Integration with Searchable Dropdowns

document.addEventListener("DOMContentLoaded", () => {
    renderLayout("tenants", "Tenants Management", "Search and manage every resident tenant of your property.");

    // ============================================
    // PERMISSION CHECKS
    // ============================================
    const canAddTenants = Permissions.canAdd('tenants');
    const canEditTenants = Permissions.canEdit('tenants');
    const canDeleteTenants = Permissions.canDelete('tenants');
    const canViewTenants = Permissions.canView('tenants');

    window.LK_TENANT_PERMS = {
        canAdd: canAddTenants,
        canEdit: canEditTenants,
        canDelete: canDeleteTenants,
        canView: canViewTenants
    };

    let currentFilter = "";
    let currentFilterType = "";
    let currentPgFilter = "all";
    let currentDocFilter = "all"; // "all" or "pending"
    let isEditMode = false;
    let editingTenantId = null;
    let allTenants = [];
    // App adoption map from existing activity-logs/users endpoint (no new API)
    let appActivityByTenantId = {};
    
    // Document status cache
    let documentStatusCache = {};
    let isDocumentCacheLoading = false;
    let documentCacheLoadComplete = false;

    // Apply URL query filters from sidebar submenus (existing filter keys only)
    (function applyUrlFilters() {
        const qs = new URLSearchParams(window.location.search);
        const f = qs.get('filter');
        const pg = qs.get('pg');
        if (pg) currentPgFilter = String(pg);
        if (!f) return;
        if (f === 'paid' || f === 'partially_paid' || f === 'unpaid') {
            currentFilter = 'status:' + f;
            currentFilterType = 'status';
        } else if (f === 'residency:national' || f === 'residency:international') {
            currentFilter = f;
            currentFilterType = 'residency';
        } else if (f === 'gender:male' || f === 'gender:female') {
            currentFilter = f;
            currentFilterType = 'gender';
        } else if (f === 'efrro-expiring') {
            currentFilter = '__EFRRO_EXPIRING__';
            currentFilterType = 'efrro';
        }
    })();

    const NATIONALITIES = [
        "Afghan", "Albanian", "Algerian", "Andorran", "Angolan", "Argentinian", "Armenian", "Australian",
        "Austrian", "Azerbaijani", "Bahamian", "Bahraini", "Bangladeshi", "Barbadian", "Belarusian", "Belgian",
        "Belizean", "Beninese", "Bhutanese", "Bolivian", "Bosnian", "Botswanan", "Brazilian", "British",
        "Bruneian", "Bulgarian", "Burkinabe", "Burmese", "Burundian", "Cambodian", "Cameroonian", "Canadian",
        "Chadian", "Chilean", "Chinese", "Colombian", "Comoran", "Congolese", "Costa Rican", "Croatian",
        "Cuban", "Cypriot", "Czech", "Danish", "Djiboutian", "Dominican", "Dutch", "Ecuadorian", "Egyptian",
        "Emirati", "English", "Eritrean", "Estonian", "Ethiopian", "Fijian", "Filipino", "Finnish", "French",
        "Gabonese", "Gambian", "Georgian", "German", "Ghanaian", "Greek", "Grenadian", "Guatemalan",
        "Guinean", "Guyanese", "Haitian", "Honduran", "Hungarian", "Icelandic", "Indonesian",
        "Iranian", "Iraqi", "Irish", "Israeli", "Italian", "Jamaican", "Japanese", "Jordanian",
        "Kazakhstani", "Kenyan", "Korean", "Kuwaiti", "Kyrgyz", "Laotian", "Latvian", "Lebanese",
        "Liberian", "Libyan", "Liechtensteiner", "Lithuanian", "Luxembourger", "Malagasy", "Malawian",
        "Malaysian", "Maldivian", "Malian", "Maltese", "Marshallese", "Mauritanian", "Mauritian",
        "Mexican", "Micronesian", "Moldovan", "Monacan", "Mongolian", "Montenegrin", "Moroccan",
        "Mozambican", "Namibian", "Nauruan", "Nepalese", "New Zealander", "Nicaraguan", "Nigerian",
        "North Korean", "Norwegian", "Omani", "Pakistani", "Palauan", "Palestinian", "Panamanian",
        "Papua New Guinean", "Paraguayan", "Peruvian", "Polish", "Portuguese", "Qatari", "Romanian",
        "Russian", "Rwandan", "Saint Lucian", "Salvadoran", "Samoan", "San Marinese", "Saudi Arabian",
        "Senegalese", "Serbian", "Seychellois", "Sierra Leonean", "Singaporean", "Slovak", "Slovenian",
        "Solomon Islander", "Somali", "South African", "South Korean", "Spanish", "Sri Lankan",
        "Sudanese", "Surinamese", "Swazi", "Swedish", "Swiss", "Syrian", "Taiwanese", "Tajik",
        "Tanzanian", "Thai", "Togolese", "Tongan", "Trinidadian", "Tunisian", "Turkish", "Turkmen",
        "Tuvaluan", "Ugandan", "Ukrainian", "Uruguayan", "Uzbek", "Vanuatuan", "Vatican",
        "Venezuelan", "Vietnamese", "Yemeni", "Zambian", "Zimbabwean"
    ];

    const COUNTRY_CODES = [
        { code: "+93", name: "Afghanistan" }, { code: "+355", name: "Albania" }, { code: "+213", name: "Algeria" },
        { code: "+376", name: "Andorra" }, { code: "+244", name: "Angola" }, { code: "+54", name: "Argentina" },
        { code: "+374", name: "Armenia" }, { code: "+61", name: "Australia" }, { code: "+43", name: "Austria" },
        { code: "+994", name: "Azerbaijan" }, { code: "+880", name: "Bangladesh" }, { code: "+375", name: "Belarus" },
        { code: "+32", name: "Belgium" }, { code: "+501", name: "Belize" }, { code: "+229", name: "Benin" },
        { code: "+975", name: "Bhutan" }, { code: "+591", name: "Bolivia" }, { code: "+387", name: "Bosnia" },
        { code: "+267", name: "Botswana" }, { code: "+55", name: "Brazil" }, { code: "+673", name: "Brunei" },
        { code: "+359", name: "Bulgaria" }, { code: "+226", name: "Burkina Faso" }, { code: "+257", name: "Burundi" },
        { code: "+855", name: "Cambodia" }, { code: "+237", name: "Cameroon" }, { code: "+1", name: "Canada/US" },
        { code: "+236", name: "CAR" }, { code: "+235", name: "Chad" }, { code: "+56", name: "Chile" },
        { code: "+86", name: "China" }, { code: "+57", name: "Colombia" }, { code: "+269", name: "Comoros" },
        { code: "+242", name: "Congo" }, { code: "+506", name: "Costa Rica" }, { code: "+385", name: "Croatia" },
        { code: "+53", name: "Cuba" }, { code: "+357", name: "Cyprus" }, { code: "+420", name: "Czech Republic" },
        { code: "+45", name: "Denmark" }, { code: "+253", name: "Djibouti" }, { code: "+1-767", name: "Dominica" },
        { code: "+1-809", name: "Dominican Republic" }, { code: "+593", name: "Ecuador" }, { code: "+20", name: "Egypt" },
        { code: "+503", name: "El Salvador" }, { code: "+240", name: "Equatorial Guinea" }, { code: "+291", name: "Eritrea" },
        { code: "+372", name: "Estonia" }, { code: "+268", name: "Eswatini" }, { code: "+251", name: "Ethiopia" },
        { code: "+679", name: "Fiji" }, { code: "+358", name: "Finland" }, { code: "+33", name: "France" },
        { code: "+241", name: "Gabon" }, { code: "+220", name: "Gambia" }, { code: "+995", name: "Georgia" },
        { code: "+49", name: "Germany" }, { code: "+233", name: "Ghana" }, { code: "+30", name: "Greece" },
        { code: "+1-473", name: "Grenada" }, { code: "+502", name: "Guatemala" }, { code: "+224", name: "Guinea" },
        { code: "+245", name: "Guinea-Bissau" }, { code: "+592", name: "Guyana" }, { code: "+509", name: "Haiti" },
        { code: "+504", name: "Honduras" }, { code: "+36", name: "Hungary" }, { code: "+354", name: "Iceland" },
        { code: "+91", name: "India" }, { code: "+62", name: "Indonesia" }, { code: "+98", name: "Iran" },
        { code: "+964", name: "Iraq" }, { code: "+353", name: "Ireland" }, { code: "+972", name: "Israel" },
        { code: "+39", name: "Italy" }, { code: "+1-876", name: "Jamaica" }, { code: "+81", name: "Japan" },
        { code: "+962", name: "Jordan" }, { code: "+7", name: "Kazakhstan" }, { code: "+254", name: "Kenya" },
        { code: "+686", name: "Kiribati" }, { code: "+850", name: "North Korea" }, { code: "+82", name: "South Korea" },
        { code: "+965", name: "Kuwait" }, { code: "+996", name: "Kyrgyzstan" }, { code: "+856", name: "Laos" },
        { code: "+371", name: "Latvia" }, { code: "+961", name: "Lebanon" }, { code: "+266", name: "Lesotho" },
        { code: "+231", name: "Liberia" }, { code: "+218", name: "Libya" }, { code: "+423", name: "Liechtenstein" },
        { code: "+370", name: "Lithuania" }, { code: "+352", name: "Luxembourg" }, { code: "+261", name: "Madagascar" },
        { code: "+265", name: "Malawi" }, { code: "+60", name: "Malaysia" }, { code: "+960", name: "Maldives" },
        { code: "+223", name: "Mali" }, { code: "+356", name: "Malta" }, { code: "+692", name: "Marshall Islands" },
        { code: "+222", name: "Mauritania" }, { code: "+230", name: "Mauritius" }, { code: "+52", name: "Mexico" },
        { code: "+691", name: "Micronesia" }, { code: "+373", name: "Moldova" }, { code: "+377", name: "Monaco" },
        { code: "+976", name: "Mongolia" }, { code: "+382", name: "Montenegro" }, { code: "+212", name: "Morocco" },
        { code: "+258", name: "Mozambique" }, { code: "+95", name: "Myanmar" }, { code: "+264", name: "Namibia" },
        { code: "+674", name: "Nauru" }, { code: "+977", name: "Nepal" }, { code: "+31", name: "Netherlands" },
        { code: "+64", name: "New Zealand" }, { code: "+505", name: "Nicaragua" }, { code: "+227", name: "Niger" },
        { code: "+234", name: "Nigeria" }, { code: "+389", name: "North Macedonia" }, { code: "+47", name: "Norway" },
        { code: "+968", name: "Oman" }, { code: "+92", name: "Pakistan" }, { code: "+680", name: "Palau" },
        { code: "+970", name: "Palestine" }, { code: "+507", name: "Panama" }, { code: "+675", name: "Papua New Guinea" },
        { code: "+595", name: "Paraguay" }, { code: "+51", name: "Peru" }, { code: "+63", name: "Philippines" },
        { code: "+48", name: "Poland" }, { code: "+351", name: "Portugal" }, { code: "+974", name: "Qatar" },
        { code: "+40", name: "Romania" }, { code: "+7", name: "Russia" }, { code: "+250", name: "Rwanda" },
        { code: "+1-869", name: "Saint Kitts" }, { code: "+1-758", name: "Saint Lucia" }, { code: "+1-784", name: "Saint Vincent" },
        { code: "+685", name: "Samoa" }, { code: "+378", name: "San Marino" }, { code: "+239", name: "Sao Tome" },
        { code: "+966", name: "Saudi Arabia" }, { code: "+221", name: "Senegal" }, { code: "+381", name: "Serbia" },
        { code: "+248", name: "Seychelles" }, { code: "+232", name: "Sierra Leone" }, { code: "+65", name: "Singapore" },
        { code: "+421", name: "Slovakia" }, { code: "+386", name: "Slovenia" }, { code: "+677", name: "Solomon Islands" },
        { code: "+252", name: "Somalia" }, { code: "+27", name: "South Africa" }, { code: "+211", name: "South Sudan" },
        { code: "+34", name: "Spain" }, { code: "+94", name: "Sri Lanka" }, { code: "+249", name: "Sudan" },
        { code: "+597", name: "Suriname" }, { code: "+46", name: "Sweden" }, { code: "+41", name: "Switzerland" },
        { code: "+963", name: "Syria" }, { code: "+886", name: "Taiwan" }, { code: "+992", name: "Tajikistan" },
        { code: "+255", name: "Tanzania" }, { code: "+66", name: "Thailand" }, { code: "+670", name: "Timor-Leste" },
        { code: "+228", name: "Togo" }, { code: "+676", name: "Tonga" }, { code: "+1-868", name: "Trinidad" },
        { code: "+216", name: "Tunisia" }, { code: "+90", name: "Turkey" }, { code: "+993", name: "Turkmenistan" },
        { code: "+688", name: "Tuvalu" }, { code: "+256", name: "Uganda" }, { code: "+380", name: "Ukraine" },
        { code: "+971", name: "UAE" }, { code: "+44", name: "UK" }, { code: "+1", name: "USA" },
        { code: "+598", name: "Uruguay" }, { code: "+998", name: "Uzbekistan" }, { code: "+678", name: "Vanuatu" },
        { code: "+379", name: "Vatican" }, { code: "+58", name: "Venezuela" }, { code: "+84", name: "Vietnam" },
        { code: "+967", name: "Yemen" }, { code: "+260", name: "Zambia" }, { code: "+263", name: "Zimbabwe" }
    ];

    const COUNTRY_CODES_DISPLAY = COUNTRY_CODES.map(c => ({
        ...c,
        display: `${c.code} ${c.name}`
    }));

    // ============================================
    // DOCUMENT STATUS CHECKING
    // ============================================
    function getRequiredDocumentTypes(residency) {
        if (residency === 'national') {
            return ['passport_photo', 'signature', 'tenant_aadhaar', 'parent_aadhaar', 'university_id', 'agreement'];
        } else {
            return ['passport_photo', 'signature', 'passport', 'visa', 'arrival_stamp', 'c_form', 'efrro', 'university_id', 'agreement'];
        }
    }

    async function checkTenantDocuments(tenantId, residency) {
        // Return from cache if available
        if (documentStatusCache[tenantId] !== undefined) {
            return documentStatusCache[tenantId];
        }

        try {
            const res = await API.documents.admin.getByTenant(tenantId);
            let docs = [];
            
            if (res.success && res.data) {
                if (Array.isArray(res.data)) {
                    docs = res.data;
                } else if (res.data.uploaded_documents && Array.isArray(res.data.uploaded_documents)) {
                    docs = res.data.uploaded_documents;
                } else if (res.data.documents && Array.isArray(res.data.documents)) {
                    docs = res.data.documents;
                }
            }
            
            const uploadedTypes = docs.map(d => d.document_type);
            const requiredTypes = getRequiredDocumentTypes(residency || 'national');
            const missing = requiredTypes.filter(type => !uploadedTypes.includes(type));
            const hasAll = missing.length === 0;
            
            // Cache the result
            documentStatusCache[tenantId] = hasAll;
            return hasAll;
        } catch (error) {
            // On error, assume documents are missing (safer for filtering)
            documentStatusCache[tenantId] = false;
            return false;
        }
    }

    async function preloadDocumentStatus(tenants) {
        if (isDocumentCacheLoading || documentCacheLoadComplete) return;
        isDocumentCacheLoading = true;
        try {
            // One request for every tenant (was: one request per tenant).
            const res = await API.documents.admin.statusSummary();
            if (res && res.success && res.data) {
                tenants.forEach(t => {
                    const row = res.data[t.id];
                    documentStatusCache[t.id] = row ? row.complete : false;
                });
            } else throw new Error('summary unavailable');
        } catch (_) {
            // Older backend: fall back to per-tenant checks, 8 at a time.
            const ids = tenants.filter(t => documentStatusCache[t.id] === undefined).map(t => t.id);
            for (let i = 0; i < ids.length; i += 8) {
                await Promise.all(ids.slice(i, i + 8).map(id => {
                    const tenant = tenants.find(t => t.id === id);
                    return checkTenantDocuments(id, tenant?.residency || 'national');
                }));
            }
        }
        isDocumentCacheLoading = false;
        documentCacheLoadComplete = true;
        updatePendingDocsBadge();
        if (currentDocFilter === 'pending') renderTable();
    }

    function updatePendingDocsBadge() {
        const pendingCount = allTenants.filter(t => {
            if (documentStatusCache[t.id] !== undefined) {
                return documentStatusCache[t.id] === false;
            }
            return false;
        }).length;
        
        const badge = document.getElementById('pendingDocsBadge');
        if (badge) {
            if (pendingCount > 0) {
                badge.textContent = pendingCount;
                badge.classList.add('show');
            } else {
                badge.classList.remove('show');
            }
        }
    }

    // ============================================
    // SEARCHABLE DROPDOWN HELPERS
    // ============================================
    function createSearchableDropdown(options, containerId, hiddenInputId, searchInputId, optionsContainerId, displayKey = null) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        const hiddenInput = document.getElementById(hiddenInputId);
        const searchInput = document.getElementById(searchInputId);
        const optionsContainer = document.getElementById(optionsContainerId);

        if (!hiddenInput || !searchInput || !optionsContainer) return null;

        let allItems = options;

        function renderOptions(filterText, openPanel = true) {
            const term = filterText ? filterText.toLowerCase().trim() : '';
            let filteredItems = allItems;

            if (term) {
                filteredItems = allItems.filter(item => {
                    const displayText = typeof item === 'string' ? item : item[displayKey];
                    return displayText.toLowerCase().includes(term);
                });
            }

            if (filteredItems.length === 0) {
                optionsContainer.innerHTML = `<div class="no-results">No results found for "${filterText || ''}"</div>`;
                if (openPanel) optionsContainer.classList.add('show');
                return;
            }

            optionsContainer.innerHTML = filteredItems.map(item => {
                const displayText = typeof item === 'string' ? item : item[displayKey];
                const isSelected = hiddenInput.value === (typeof item === 'string' ? item : item.code || item[displayKey]);
                return `<div class="option-item ${isSelected ? 'selected' : ''}" data-value="${typeof item === 'string' ? item : item.code || item[displayKey]}">${displayText}</div>`;
            }).join('');

            optionsContainer.querySelectorAll('.option-item').forEach(el => {
                el.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const value = this.dataset.value;
                    hiddenInput.value = value;
                    searchInput.value = value;
                    optionsContainer.classList.remove('show');
                    const event = new Event('change', { bubbles: true });
                    hiddenInput.dispatchEvent(event);
                    document.querySelectorAll('.dropdown-options').forEach(d => d.classList.remove('show'));
                });
            });

            if (openPanel) optionsContainer.classList.add('show');
        }

        searchInput.addEventListener('focus', function(e) {
            e.stopPropagation();
            document.querySelectorAll('.dropdown-options').forEach(d => d.classList.remove('show'));
            renderOptions(this.value, true);
        });

        searchInput.addEventListener('input', function(e) {
            e.stopPropagation();
            renderOptions(this.value, true);
        });

        searchInput.addEventListener('click', function(e) {
            e.stopPropagation();
            renderOptions(this.value, true);
        });

        document.addEventListener('click', function(e) {
            if (!container.contains(e.target)) {
                optionsContainer.classList.remove('show');
            }
        });

        searchInput.addEventListener('keydown', function(e) {
            const items = optionsContainer.querySelectorAll('.option-item');
            if (items.length === 0) return;

            let currentIndex = -1;
            items.forEach((el, i) => {
                if (el.classList.contains('selected')) currentIndex = i;
            });

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentIndex = Math.min(currentIndex + 1, items.length - 1);
                items.forEach(el => el.classList.remove('selected'));
                items[currentIndex].classList.add('selected');
                items[currentIndex].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentIndex = Math.max(currentIndex - 1, 0);
                items.forEach(el => el.classList.remove('selected'));
                items[currentIndex].classList.add('selected');
                items[currentIndex].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selected = optionsContainer.querySelector('.option-item.selected');
                if (selected) {
                    selected.click();
                } else if (items.length > 0) {
                    items[0].click();
                }
            } else if (e.key === 'Escape') {
                optionsContainer.classList.remove('show');
                this.blur();
            }
        });

        if (hiddenInput.value) {
            searchInput.value = hiddenInput.value;
        }

        renderOptions('', false);

        return {
            setValue: function(value) {
                hiddenInput.value = value;
                searchInput.value = value;
                renderOptions(value, false);
            },
            getValue: function() {
                return hiddenInput.value;
            },
            refresh: function() {
                renderOptions(searchInput.value, false);
            }
        };
    }

    function createSearchableDropdownForElement(options, container, hiddenInput, searchInput, optionsContainer, displayKey = null) {
        let allItems = options;

        function renderOptions(filterText, openPanel = true) {
            const term = filterText ? filterText.toLowerCase().trim() : '';
            let filteredItems = allItems;

            if (term) {
                filteredItems = allItems.filter(item => {
                    const displayText = typeof item === 'string' ? item : item[displayKey];
                    return displayText.toLowerCase().includes(term);
                });
            }

            if (filteredItems.length === 0) {
                optionsContainer.innerHTML = `<div class="no-results">No results found</div>`;
                if (openPanel) optionsContainer.classList.add('show');
                return;
            }

            optionsContainer.innerHTML = filteredItems.map(item => {
                const displayText = typeof item === 'string' ? item : item[displayKey];
                const isSelected = hiddenInput.value === (typeof item === 'string' ? item : item.code || item[displayKey]);
                return `<div class="option-item ${isSelected ? 'selected' : ''}" data-value="${typeof item === 'string' ? item : item.code || item[displayKey]}">${displayText}</div>`;
            }).join('');

            optionsContainer.querySelectorAll('.option-item').forEach(el => {
                el.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const value = this.dataset.value;
                    hiddenInput.value = value;
                    searchInput.value = value;
                    optionsContainer.classList.remove('show');
                    const event = new Event('change', { bubbles: true });
                    hiddenInput.dispatchEvent(event);
                    document.querySelectorAll('.dropdown-options').forEach(d => d.classList.remove('show'));
                });
            });

            if (openPanel) optionsContainer.classList.add('show');
        }

        searchInput.addEventListener('focus', function(e) {
            e.stopPropagation();
            document.querySelectorAll('.dropdown-options').forEach(d => d.classList.remove('show'));
            renderOptions(this.value, true);
        });

        searchInput.addEventListener('input', function(e) {
            e.stopPropagation();
            renderOptions(this.value, true);
        });

        searchInput.addEventListener('click', function(e) {
            e.stopPropagation();
            renderOptions(this.value, true);
        });

        document.addEventListener('click', function(e) {
            if (!container.contains(e.target)) {
                optionsContainer.classList.remove('show');
            }
        });

        searchInput.addEventListener('keydown', function(e) {
            const items = optionsContainer.querySelectorAll('.option-item');
            if (items.length === 0) return;

            let currentIndex = -1;
            items.forEach((el, i) => {
                if (el.classList.contains('selected')) currentIndex = i;
            });

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentIndex = Math.min(currentIndex + 1, items.length - 1);
                items.forEach(el => el.classList.remove('selected'));
                items[currentIndex].classList.add('selected');
                items[currentIndex].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentIndex = Math.max(currentIndex - 1, 0);
                items.forEach(el => el.classList.remove('selected'));
                items[currentIndex].classList.add('selected');
                items[currentIndex].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selected = optionsContainer.querySelector('.option-item.selected');
                if (selected) {
                    selected.click();
                } else if (items.length > 0) {
                    items[0].click();
                }
            } else if (e.key === 'Escape') {
                optionsContainer.classList.remove('show');
                this.blur();
            }
        });

        if (hiddenInput.value) {
            searchInput.value = hiddenInput.value;
        }

        renderOptions('', false);

        return {
            setValue: function(value) {
                hiddenInput.value = value;
                searchInput.value = value;
                renderOptions(value, false);
            },
            getValue: function() {
                return hiddenInput.value;
            },
            refresh: function() {
                renderOptions(searchInput.value, false);
            }
        };
    }

    // ============================================
    // DOCUMENT HANDLING
    // ============================================
    // Reads the document in the browser (OCR) and fills the tenant fields. See assets/js/doc-extract.js
    const AUTOFILL_FIELDS = {
        full_name: ['Full name', '.tenant-name'], gender: ['Gender', '.tenant-gender'], residency: ['Residency', '.tenant-residency'],
        nationality: ['Nationality', '.tenant-nationality-search'], phone_code: ['Country code', '.tenant-code-search'],
        phone: ['Phone', '.tenant-phone'], international_phone: ['International phone', '.tenant-international-phone'],
        cform: ['C-Form number', '.tenant-cform'], arrival_date: ['Arrival date', '.tenant-arrival-date'],
        period_of_stay: ['Period of stay', '.tenant-period-of-stay'], aadhaar: ['Aadhaar ID', '.tenant-aadhaar']
    };
    const AUTOFILL_ORDER = ['residency', 'full_name', 'gender', 'nationality', 'phone_code', 'phone', 'international_phone', 'cform', 'arrival_date', 'period_of_stay', 'aadhaar'];

    function setFieldValue(entry, key, value) {
        const [label, sel] = AUTOFILL_FIELDS[key];
        const el = entry.querySelector(sel);
        if (!el) return { ok: false };
        const current = (el.value || '').trim();
        if (key === 'residency') {
            if (current) return { ok: current === value, kept: current !== value };
            el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); mark(el); return { ok: true };
        }
        if (key === 'nationality' || key === 'phone_code') {
            const hidden = entry.querySelector(key === 'nationality' ? '.tenant-nationality' : '.tenant-code');
            const existing = key === 'phone_code' ? (hidden?.value === '+91' && !el.dataset.touched ? '' : current) : current;
            if (existing && existing !== value) return { ok: false, kept: true };
            el.value = value; if (hidden) hidden.value = value; mark(el); return { ok: true };
        }
        if (current && current !== value) return { ok: false, kept: true };
        if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === value)) return { ok: false };
        el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); mark(el);
        return { ok: true };
    }
    function mark(el) {
        el.classList.add('lk-autofilled');
        el.addEventListener('input', () => el.classList.remove('lk-autofilled'), { once: true });
        el.addEventListener('change', () => el.classList.remove('lk-autofilled'), { once: true });
    }
    function displayValue(key, v) {
        if (key === 'arrival_date') { const d = new Date(v + 'T00:00:00'); return isNaN(d) ? v : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
        if (key === 'period_of_stay') return v + (v === '1' ? ' month' : ' months');
        if (key === 'gender') return v.charAt(0).toUpperCase() + v.slice(1);
        if (key === 'residency') return v === 'international' ? 'International' : 'National';
        if (key === 'aadhaar') return v.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
        return v;
    }

    async function handleDocumentUpload(file, entry) {
        if (!file) return;
        const X = LKUI.esc;
        const box = entry.querySelector('.doc-upload-container');
        let panel = box.querySelector('.autofill-result');
        if (!panel) { panel = document.createElement('div'); panel.className = 'autofill-result mt-3'; box.appendChild(panel); }
        const btn = entry.querySelector('.btn-attach-doc');
        const fileChip = `<div class="ar-file"><i class="bi bi-file-earmark-text"></i><span>${X(file.name)}</span><span class="text-muted-soft">${(file.size / 1024).toFixed(0)} KB</span></div>`;
        if (file.size > 25 * 1024 * 1024) { panel.innerHTML = `${fileChip}<div class="alert alert-warning mb-0 mt-2">That file is larger than 25 MB. Please upload a smaller scan.</div>`; return; }
        btn.disabled = true;
        panel.innerHTML = `${fileChip}<div class="ar-progress mt-2"><div class="d-flex align-items-center gap-2"><span class="spinner-border spinner-border-sm"></span><span class="ar-status">Preparing…</span></div><div class="pwd-meter mt-2"><span class="ar-bar" style="width:4%;background:var(--lk-green-dark)"></span></div><div class="form-text">Reading on your device. The first scan downloads the reader (about 10 MB) and can take up to a minute.</div></div>`;
        const statusEl = panel.querySelector('.ar-status'), bar = panel.querySelector('.ar-bar');
        try {
            const res = await LKDocExtract.run(file, {
                nationalities: NATIONALITIES,
                countryCodes: COUNTRY_CODES.map(c => c.code),
                countryNames: COUNTRY_CODES.map(c => c.name),
                onStatus: (msg, pi, total) => { statusEl.textContent = msg; const m = /pass (\d) of (\d)/.exec(msg); if (m) bar.style.width = Math.min(95, 8 + (((pi || 0) + (+m[1] - 1) / +m[2]) / (total || 1)) * 85) + '%'; }
            });
            const filled = [], kept = [];
            AUTOFILL_ORDER.forEach(k => {
                if (res.fields[k] === undefined) return;
                const r = setFieldValue(entry, k, res.fields[k]);
                if (r.ok) filled.push(k); else if (r.kept) kept.push(k);
            });
            const rows = filled.map(k => `<li><span class="ar-l">${X(AUTOFILL_FIELDS[k][0])}</span><b>${X(displayValue(k, res.fields[k]))}</b>${res.confidence[k] === 'check' ? '<span class="chip chip-amber ms-auto">Check</span>' : '<span class="chip chip-green ms-auto"><i class="bi bi-check2"></i></span>'}</li>`).join('');
            const notes = [...res.notes];
            if (kept.length) notes.push(`${kept.length} field${kept.length === 1 ? ' was' : 's were'} left as you typed (${kept.map(k => AUTOFILL_FIELDS[k][0]).join(', ')}).`);
            const extra = [];
            if (res.extra.passport_no) extra.push(`Passport ${res.extra.passport_no}`);
            if (res.extra.visa_valid_till) extra.push(`Visa valid till ${displayValue('arrival_date', res.extra.visa_valid_till)}`);
            if (res.extra.dob) extra.push(`Date of birth ${displayValue('arrival_date', res.extra.dob)}`);
            panel.innerHTML = `${fileChip}
                ${filled.length ? `<div class="ar-ok"><i class="bi bi-magic"></i> Filled ${filled.length} field${filled.length === 1 ? '' : 's'} from ${X(res.kinds.join(' + ') || 'the document')}</div><ul class="ar-list">${rows}</ul>
                    <div class="form-text"><i class="bi bi-eye me-1"></i>Filled fields are highlighted. Please check them against the document before saving.</div>`
                    : `<div class="ar-warn"><i class="bi bi-exclamation-triangle"></i> Nothing could be filled automatically.</div>`}
                ${extra.length ? `<div class="form-text mt-1">Also found: ${X(extra.join(' · '))}</div>` : ''}
                ${notes.map(n => `<div class="form-text text-warning-emphasis mt-1"><i class="bi bi-info-circle me-1"></i>${X(n)}</div>`).join('')}`;
            if (filled.length) showToast(`Auto-filled ${filled.length} field${filled.length === 1 ? '' : 's'}. Please verify them.`, 'success');
            else showToast('Could not read details from that file.', 'warning');
        } catch (err) {
            console.error('Auto-fill failed:', err);
            panel.innerHTML = `${fileChip}<div class="ar-warn mt-2"><i class="bi bi-exclamation-triangle"></i> ${X(err && err.message ? err.message : 'Could not read this document.')} You can fill the form manually.</div>`;
            showToast((err && err.message) || 'Could not read this document.', 'danger');
        } finally {
            btn.disabled = false;
            entry.querySelector('.doc-file-input').value = '';
        }
    }

    function toDateInputValue(dateStr) {
        if (!dateStr) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    // ============================================
    // FETCH TENANTS
    // ============================================
    async function loadAppActivityMap() {
        // Reuse existing activity-logs/users endpoint — no new API
        try {
            if (!API.activityLogs || typeof API.activityLogs.users !== 'function') return;
            const r = await API.activityLogs.users({ role: 'tenant' });
            const list = r?.data || [];
            const map = {};
            list.forEach(u => {
                if (u && u.id != null) {
                    map[String(u.id)] = {
                        installed: !!u.installed,
                        last_app_activity: u.last_app_activity || null
                    };
                }
            });
            appActivityByTenantId = map;
        } catch (_) {
            // Non-fatal — App Status columns simply stay as unknown
        }
    }

    async function loadTenants() {
        const tbody = document.getElementById("tenantsTbody");
        PAGE_LOADER.table(tbody, 16, "Loading tenants...");
        PAGE_LOADER.hideEmpty("tenantsEmpty");
        try {
            const params = {};
            if (currentPgFilter !== "all") params.pg_id = currentPgFilter;
            // Don't send status/gender/residency filters as search — applied client-side
            if (currentFilter && currentFilter !== "__EFRRO_EXPIRING__" && currentFilterType === "text") {
                params.search = currentFilter;
            }

            // Parallel: tenants + app activity (existing endpoints only)
            const [response] = await Promise.all([
                API.tenants.getAll(params),
                loadAppActivityMap()
            ]);
            if (response.success) {
                allTenants = (response.data || []).filter(t => t.role !== 'guest');
                // Merge app status for first-look observations in Tenants Management
                allTenants.forEach(t => {
                    const a = appActivityByTenantId[String(t.id)];
                    if (a) {
                        t._app_installed = a.installed;
                        t._last_app_activity = a.last_app_activity;
                    }
                });
                window.LK_TENANTS = allTenants;
                
                // Reset document cache when tenants are reloaded
                documentStatusCache = {};
                documentCacheLoadComplete = false;
                
                // Preload document status in background
                preloadDocumentStatus(allTenants);

                // Sync search input with URL/filter state for visible feedback
                const searchInput = document.getElementById("tenantSearch");
                if (searchInput && currentFilter && currentFilterType !== "text") {
                    if (currentFilter === "__EFRRO_EXPIRING__") searchInput.value = "__EFRRO_EXPIRING__";
                    else searchInput.value = currentFilter;
                }
                
                renderTable();
                renderStats();
                populatePgFilter();
            } else {
                showToast(response.message || "Failed to load tenants", "danger");
            }
        } catch (error) {
            const tbody = document.getElementById("tenantsTbody");
            if (tbody) tbody.innerHTML = `<tr><td colspan="16" class="text-center py-5 text-danger">Failed to load tenants. Please try again.</td></tr>`;
            showToast("Error loading tenants: " + error.message, "danger");
        }
    }

    // ============================================
    // RENDER STATS
    // ============================================
    function renderStats() {
        const tenants = allTenants || [];
        const national = tenants.filter(t => t.residency === 'national').length;
        const international = tenants.filter(t => t.residency === 'international').length;
        const male = tenants.filter(t => t.gender === 'male').length;
        const female = tenants.filter(t => t.gender === 'female').length;

        // BILL STATUS is the source of truth for this column.
        // This is especially important for grouped bills: one verified payment
        // settles the shared bill for every member of the group, even though
        // only one member may have submitted the payment.
        const getBillStatus = (tenant) => {
            const status = String(tenant?.bill_status || '').toLowerCase().trim();
            if (status === 'paid' || status === 'partially_paid' || status === 'unpaid' || status === 'delayed' || status === 'overdue') {
                return status;
            }
            // Backward-compatible fallback only when the API does not provide bill_status.
            if (tenant?.paid_from && tenant?.paid_till) {
                const today = new Date();
                const paidTill = new Date(tenant.paid_till);
                if (paidTill >= today) return 'paid';
                if (Number(tenant?.total_paid_amount || 0) > 0) return 'partially_paid';
            }
            return 'unpaid';
        };

        const paid = tenants.filter(t => getBillStatus(t) === 'paid').length;
        const partiallyPaid = tenants.filter(t => getBillStatus(t) === 'partially_paid').length;
        const unpaid = tenants.filter(t => ['unpaid', 'delayed', 'overdue'].includes(getBillStatus(t))).length;

        const expiringEFRRO = tenants.filter(t => {
            if (t.residency !== 'international' || !t.efrro_till) return false;
            const today = new Date();
            const expiryDate = new Date(t.efrro_till);
            const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            return diffDays <= 30;
        });

        const stats = [
            { label: "Total Tenants", value: tenants.length, icon: "bi-people-fill", color: "var(--lk-green)", filter: "all" },
            { label: "National", value: national, icon: "bi-flag-fill", color: "var(--info)", filter: "residency:national" },
            { label: "International", value: international, icon: "bi-globe2", color: "var(--warning)", filter: "residency:international" },
            { label: "Male", value: male, icon: "bi-gender-male", color: "var(--heading)", filter: "gender:male" },
            { label: "Female", value: female, icon: "bi-gender-female", color: "var(--danger)", filter: "gender:female" },
            { label: "Paid", value: paid, icon: "bi-check-circle", color: "var(--success)", filter: "paid" },
            { label: "Partially Paid", value: partiallyPaid, icon: "bi-hourglass-split", color: "var(--warning)", filter: "partially_paid" },
            { label: "Unpaid", value: unpaid, icon: "bi-exclamation-circle", color: "var(--danger)", filter: "unpaid" },
            { label: "e-FRRO Expiring / Expired", value: expiringEFRRO.length, icon: "bi-clock-history", color: "#e74c3c", filter: "efrro-expiring" }
        ];

        document.getElementById("tenantStats").innerHTML = stats.map(s => `
            <div class="col-6 col-md-4 col-lg">
                <div class="stat-card hover-lift" onclick="filterByStat('${s.filter}')">
                    <div class="stat-icon" style="background:${s.color}22;color:${s.color};"><i class="bi ${s.icon}"></i></div>
                    <div><div class="stat-value">${s.value}</div><div class="stat-label">${lkEsc(s.label)}</div></div>
                </div>
            </div>
        `).join("");

        // Active and all-tenant counts belong to Tenants Management, not Archive.
        document.querySelectorAll("#tenantStats .tenant-extra-stat").forEach(el => el.remove());
        if (API.tenants.archiveStats) {
            API.tenants.archiveStats().then(res => {
                if (!res?.success || !res.data) return;
                const d = res.data;
                const extra = [
                    { label: "Active", value: d.active_count ?? tenants.length, icon: "bi-person-check", color: "var(--success)" },
                    { label: "All (active + inactive)", value: (Number(d.active_count) || 0) + (Number(d.checked_out_count) || 0) + (Number(d.archived_count) || 0), icon: "bi-people", color: "var(--lk-green)" }
                ];
                const container = document.getElementById("tenantStats");
                extra.forEach(item => {
                    const col = document.createElement("div");
                    col.className = "col-6 col-md-4 col-lg tenant-extra-stat";
                    col.innerHTML = `<div class="stat-card"><div class="stat-icon" style="background:${item.color}22;color:${item.color};"><i class="bi ${item.icon}"></i></div><div><div class="stat-value">${item.value}</div><div class="stat-label">${lkEsc(item.label)}</div></div></div>`;
                    container.appendChild(col);
                });
            }).catch(() => {});
        }
    }

    window.filterByStat = function(filter) {
        const searchInput = document.getElementById("tenantSearch");
        
        // Clear pending docs filter when clicking stats
        const pendingDocsBtn = document.getElementById("pendingDocsFilter");
        if (pendingDocsBtn) {
            pendingDocsBtn.classList.remove('active');
        }
        currentDocFilter = "all";
        
        currentFilterType = "";
        currentFilter = "";
        
        if (filter === "all") {
            searchInput.value = "";
            currentFilter = "";
            currentFilterType = "";
        } else if (filter === "efrro-expiring") {
            searchInput.value = "__EFRRO_EXPIRING__";
            currentFilter = "__EFRRO_EXPIRING__";
            currentFilterType = "efrro";
        } else if (filter === "residency:national") {
            searchInput.value = "residency:national";
            currentFilter = "residency:national";
            currentFilterType = "residency";
        } else if (filter === "residency:international") {
            searchInput.value = "residency:international";
            currentFilter = "residency:international";
            currentFilterType = "residency";
        } else if (filter === "gender:male") {
            searchInput.value = "gender:male";
            currentFilter = "gender:male";
            currentFilterType = "gender";
        } else if (filter === "gender:female") {
            searchInput.value = "gender:female";
            currentFilter = "gender:female";
            currentFilterType = "gender";
        } else if (filter === "paid") {
            searchInput.value = "status:paid";
            currentFilter = "status:paid";
            currentFilterType = "status";
        } else if (filter === "partially_paid") {
            searchInput.value = "status:partially_paid";
            currentFilter = "status:partially_paid";
            currentFilterType = "status";
        } else if (filter === "unpaid") {
            searchInput.value = "status:unpaid";
            currentFilter = "status:unpaid";
            currentFilterType = "status";
        } else {
            searchInput.value = filter.charAt(0).toUpperCase() + filter.slice(1);
            currentFilter = searchInput.value;
            currentFilterType = "text";
        }
        renderTable();
    };

    // ============================================
    // RENDER TABLE - FIXED: Uses paid_till as source of truth
    // ============================================
    // ============================================
    // FILTER HEADING (display only - reflects existing filter state)
    // ============================================
    function updateFilterHeading(count) {
        const box = document.getElementById("tenantFilterHeading");
        if (!box) return;
        const esc = (v) => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const tags = [];
        if (currentPgFilter !== "all") {
            const sel = document.getElementById("pgFilter");
            const name = sel && sel.selectedOptions[0] ? sel.selectedOptions[0].textContent : "Selected";
            tags.push({ icon: "bi-building", text: "PG: " + name, cls: "" });
        }
        const map = {
            "gender:male": ["bi-gender-male", "Male", "tag-info"],
            "gender:female": ["bi-gender-female", "Female", "tag-info"],
            "residency:national": ["bi-flag-fill", "National", "tag-info"],
            "residency:international": ["bi-globe2", "International", "tag-info"],
            "status:paid": ["bi-check-circle", "Status: Paid", "tag-green"],
            "status:partially_paid": ["bi-hourglass-split", "Status: Partially Paid", "tag-amber"],
            "status:unpaid": ["bi-exclamation-circle", "Status: Unpaid", "tag-red"]
        };
        if (currentFilterType === "efrro") tags.push({ icon: "bi-clock-history", text: "e-FRRO Expiring / Expired", cls: "tag-red" });
        else if (map[currentFilter]) tags.push({ icon: map[currentFilter][0], text: map[currentFilter][1], cls: map[currentFilter][2] });
        else if (currentDocFilter === "pending") tags.push({ icon: "bi-file-earmark-text", text: "Pending Docs", cls: "tag-amber" });
        else {
            const q = document.getElementById("tenantSearch")?.value?.trim();
            if (q) tags.push({ icon: "bi-search", text: 'Search: ' + q, cls: "" });
        }
        if (!tags.length) { box.classList.add("d-none"); box.innerHTML = ""; return; }
        box.innerHTML = `<h6 class="fh-title">Showing Tenants</h6>
            <div class="fh-chips">${tags.map(t => `<span class="filter-tag ${t.cls}"><i class="bi ${t.icon}"></i>${esc(t.text)}</span>`).join("")}</div>
            <span class="fh-count ms-auto">${count} Tenant${count === 1 ? "" : "s"}</span>`;
        box.classList.remove("d-none");
    }

    function renderTable() {
        let tenants = allTenants || [];
        const searchInput = document.getElementById("tenantSearch");
        const searchVal = searchInput?.value?.trim().toLowerCase() || "";

        if (currentPgFilter !== "all") {
            tenants = tenants.filter(t => t.pg_id === parseInt(currentPgFilter));
        }

        if (currentFilterType === "gender") {
            if (currentFilter === "gender:male") {
                tenants = tenants.filter(t => t.gender === 'male');
            } else if (currentFilter === "gender:female") {
                tenants = tenants.filter(t => t.gender === 'female');
            }
        } else if (currentFilterType === "residency") {
            if (currentFilter === "residency:national") {
                tenants = tenants.filter(t => t.residency === 'national');
            } else if (currentFilter === "residency:international") {
                tenants = tenants.filter(t => t.residency === 'international');
            }
        } else if (currentFilterType === "status") {
            const getBillStatus = (tenant) => {
                const status = String(tenant?.bill_status || '').toLowerCase().trim();
                if (status === 'paid' || status === 'partially_paid' || status === 'unpaid' || status === 'delayed' || status === 'overdue') {
                    return status;
                }
                if (tenant?.paid_from && tenant?.paid_till) {
                    const today = new Date();
                    const paidTill = new Date(tenant.paid_till);
                    if (paidTill >= today) return 'paid';
                    if (Number(tenant?.total_paid_amount || 0) > 0) return 'partially_paid';
                }
                return 'unpaid';
            };
            if (currentFilter === "status:paid") {
                tenants = tenants.filter(t => getBillStatus(t) === 'paid');
            } else if (currentFilter === "status:partially_paid") {
                tenants = tenants.filter(t => getBillStatus(t) === 'partially_paid');
            } else if (currentFilter === "status:unpaid") {
                tenants = tenants.filter(t => ['unpaid', 'delayed', 'overdue'].includes(getBillStatus(t)));
            }
        } else if (currentFilterType === "efrro") {
            tenants = tenants.filter(t => {
                if (t.residency !== 'international' || !t.efrro_till) return false;
                const today = new Date();
                const expiryDate = new Date(t.efrro_till);
                const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                return diffDays <= 30;
            });
        } else if (currentDocFilter === "pending") {
            // Filter tenants that are missing required documents
            tenants = tenants.filter(t => {
                if (documentStatusCache[t.id] !== undefined) {
                    return documentStatusCache[t.id] === false; // Missing documents
                }
                // If not checked yet, include them (will be filtered out once cache is populated)
                return true;
            });
        } else if (searchVal) {
            if (searchVal === "__efrro_expiring__") {
                tenants = tenants.filter(t => {
                    if (t.residency !== 'international' || !t.efrro_till) return false;
                    const today = new Date();
                    const expiryDate = new Date(t.efrro_till);
                    const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                    return diffDays <= 30;
                });
            } else if (searchVal === "residency:national") {
                tenants = tenants.filter(t => t.residency === 'national');
            } else if (searchVal === "residency:international") {
                tenants = tenants.filter(t => t.residency === 'international');
            } else if (searchVal === "gender:male") {
                tenants = tenants.filter(t => t.gender === 'male');
            } else if (searchVal === "gender:female") {
                tenants = tenants.filter(t => t.gender === 'female');
            } else if (searchVal === "status:paid") {
                tenants = tenants.filter(t => String(t.bill_status || '').toLowerCase() === 'paid');
            } else if (searchVal === "status:partially_paid") {
                tenants = tenants.filter(t => String(t.bill_status || '').toLowerCase() === 'partially_paid');
            } else if (searchVal === "status:unpaid") {
                tenants = tenants.filter(t => ['unpaid', 'delayed', 'overdue'].includes(String(t.bill_status || '').toLowerCase()));
            } else {
                tenants = tenants.filter(t =>
                    t.full_name?.toLowerCase().includes(searchVal) ||
                    t.room_number?.toLowerCase().includes(searchVal) ||
                    t.nationality?.toLowerCase().includes(searchVal) ||
                    String(t.rent).includes(searchVal) ||
                    t.gender?.toLowerCase().includes(searchVal) ||
                    t.residency?.toLowerCase().includes(searchVal)
                );
            }
        }

        const tbody = document.getElementById("tenantsTbody");
        if (!tbody) return;

        updateFilterHeading(tenants.length);

        if (tenants.length === 0) {
            tbody.innerHTML = '';
            document.getElementById("tenantsEmpty").classList.remove("d-none");
            return;
        }
        document.getElementById("tenantsEmpty").classList.add("d-none");

        tbody.innerHTML = tenants.map(t => {
            // BILL STATUS comes from the backend bill/group calculation.
            // Never derive the Bill Status badge from tenant payment dates:
            // payment dates are tenant-level metadata, while a grouped bill is
            // shared by every member.
            let status = String(t.bill_status || '').toLowerCase().trim();
            if (!['paid', 'partially_paid', 'unpaid', 'delayed', 'overdue'].includes(status)) {
                if (t.paid_from && t.paid_till) {
                    const today = new Date();
                    const paidTill = new Date(t.paid_till);
                    status = paidTill >= today ? 'paid' : (Number(t.total_paid_amount || 0) > 0 ? 'partially_paid' : 'unpaid');
                } else {
                    status = 'unpaid';
                }
            }
            let statusLabel = status === 'paid' ? 'Paid' : status === 'partially_paid' ? 'Partial' : 'Unpaid';
            let statusChip = status === 'paid' ? 'chip-green' : status === 'partially_paid' ? 'chip-amber' : 'chip-red';
            
            const efrroStatus = getEFRROStatus(t);
            const arrivalDate = t.arrival_date ? formatDate(t.arrival_date) : "—";

            // App status from merged activity-logs data (existing endpoint)
            let appChip = '<span class="chip chip-gray">—</span>';
            if (t._app_installed === true) {
                appChip = '<span class="chip chip-green"><i class="bi bi-phone"></i> Installed</span>';
            } else if (t._app_installed === false) {
                appChip = '<span class="chip chip-gray"><i class="bi bi-phone-slash"></i> Not Installed</span>';
            }
            let lastAct = '—';
            if (t._last_app_activity) {
                try {
                    lastAct = new Date(t._last_app_activity).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
                } catch (_) {
                    lastAct = String(t._last_app_activity);
                }
            }

            const X = LKUI.esc;
            return `
            <tr data-id="${X(t.id)}">
                <td>
                    <span class="name-link" onclick="openDocs('${X(t.id)}')">${X(t.full_name) || '—'}</span>
                    <div class="small text-muted-soft">${X(t.email) || '—'}</div><div class="small text-muted-soft">Parent: ${X(t.parent_phone) || '—'}</div>
                </td>
                <td>${X(t.pg_name) || '—'}</td>
                <td>${X(t.room_number) || '—'}</td>
                <td>${t.period_of_stay ? `${t.period_of_stay} Month${Number(t.period_of_stay) === 1 ? '' : 's'}` : '—'}</td>
                <td>${t.agreement_status === 'accepted' ? '<span class="chip chip-green">Accepted</span>' : t.agreement_status === 'pending' ? '<span class="chip chip-red">Pending</span>' : '<span class="chip chip-gray">Not Required</span>'}</td>
                <td>${fmtINR(t.rent || 0)}</td>
                <td>${fmtINR(t.security_fee || 0)}</td>
                <td>${X(t.nationality) || '—'}</td>
                <td style="text-transform:capitalize">${X(t.gender) || '—'}</td>
                <td>${t.payment_date ? "Day " + t.payment_date : "—"}</td>
                <td>${arrivalDate}</td>
                <td>${efrroStatus}</td>
                <td><span class="chip ${statusChip}">${statusLabel}</span></td>
                <td>${appChip}</td>
                <td>${LKUI.seen(t._last_app_activity, { never: 'Never opened' })}</td>
                <td class="text-end text-nowrap">
                    <a class="btn-icon me-1" title="View bills" href="bills.html?q=${encodeURIComponent(t.full_name || '')}"><i class="bi bi-receipt"></i></a>
                    ${t.agreement_status === 'accepted' ? `<button class="btn-icon me-1" title="Download current accepted agreement PDF" onclick="downloadTenantAgreement('${t.id}')"><i class="bi bi-file-earmark-pdf"></i></button>` : ''}
                    ${canEditTenants ? `<button class="btn-icon me-1" title="Edit" onclick="editTenant('${t.id}')"><i class="bi bi-pencil"></i></button>` : ''}
                    ${canDeleteTenants ? `<button class="btn-icon me-1" title="Check Out" onclick="checkoutTenant('${t.id}')"><i class="bi bi-box-arrow-right"></i></button>
                    <button class="btn-icon" title="Archive" onclick="archiveTenant('${t.id}')"><i class="bi bi-archive"></i></button>` : ''}
                </td>
            </tr>`;
        }).join("");
    }

    function getEFRROStatus(tenant) {
        if (tenant.residency !== 'international') {
            return `<span class="chip chip-gray">N/A</span>`;
        }
        if (!tenant.efrro_till) {
            return `<span class="chip chip-efrro-none">Not Set</span>`;
        }
        const today = new Date();
        const expiryDate = new Date(tenant.efrro_till);
        const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
            return `<span class="chip chip-efrro-expired">Expired</span>`;
        } else if (diffDays <= 7) {
            return `<span class="chip chip-efrro-urgent">⚠️ ${diffDays} days</span>`;
        } else if (diffDays <= 14) {
            return `<span class="chip chip-efrro-soon">${diffDays} days</span>`;
        } else if (diffDays <= 30) {
            return `<span class="chip chip-efrro-upcoming">${diffDays} days</span>`;
        } else {
            return `<span class="chip chip-efrro-valid">${diffDays} days</span>`;
        }
    }

    function populatePgFilter() {
        const select = document.getElementById("pgFilter");
        if (!select) return;

        API.pgs.getAll()
            .then(res => {
                if (res.success) {
                    let options = `<option value="all">All PGs</option>`;
                    res.data.forEach(pg => {
                        const selected = currentPgFilter === String(pg.id) ? "selected" : "";
                        options += `<option value="${pg.id}" ${selected}>${lkEsc(pg.name)}</option>`;
                    });
                    select.innerHTML = options;
                }
            })
            .catch(() => {
                select.innerHTML = `<option value="all">All PGs</option>`;
            });
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================
    document.getElementById("pgFilter")?.addEventListener("change", function() {
        currentPgFilter = this.value;
        renderTable();
    });

    document.getElementById("tenantSearch")?.addEventListener("input", function() {
        // Clear pending docs filter when searching
        const pendingDocsBtn = document.getElementById("pendingDocsFilter");
        if (pendingDocsBtn) {
            pendingDocsBtn.classList.remove('active');
        }
        currentDocFilter = "all";
        currentFilterType = "";
        currentFilter = "";
        renderTable();
    });

    // ============================================
    // PENDING DOCUMENTS FILTER
    // ============================================
    document.getElementById("pendingDocsFilter")?.addEventListener("click", async function() {
        const btn = this;
        const isActive = btn.classList.contains('active');
        
        if (isActive) {
            btn.classList.remove('active');
            currentDocFilter = "all";
            // Clear search input if it was set by this filter
            renderTable();
            return;
        }
        
        // If document cache is not loaded, load it now
        if (!documentCacheLoadComplete && !isDocumentCacheLoading) {
            showToast("Checking document status for all tenants...", "info");
            await preloadDocumentStatus(allTenants);
        }
        
        btn.classList.add('active');
        currentDocFilter = "pending";
        
        // Clear search input when applying this filter
        const searchInput = document.getElementById("tenantSearch");
        if (searchInput) {
            searchInput.value = "";
        }
        currentFilterType = "";
        currentFilter = "";
        
        renderTable();
        
        // Show count
        const pendingCount = allTenants.filter(t => {
            if (documentStatusCache[t.id] !== undefined) {
                return documentStatusCache[t.id] === false;
            }
            return false;
        }).length;
        
        if (pendingCount === 0) {
            showToast("All tenants have their required documents uploaded. ✅", "success");
        } else {
            showToast(`Showing ${pendingCount} tenant(s) with pending documents.`, "info");
        }
    });

    // ============================================
    // PG AND ROOM LOADING
    // ============================================
    async function loadPgDropdown(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        try {
            const res = await API.pgs.getAll();
            if (res.success) {
                select.innerHTML = `<option value="">Choose PG...</option>` +
                    res.data.map(p => `<option value="${p.id}">${lkEsc(p.name)}</option>`).join("");
            }
        } catch (error) {
            select.innerHTML = `<option value="">Error loading PGs</option>`;
        }
    }

    async function loadRoomDropdown(pgId, selectId, excludeRoom = null) {
        const select = document.getElementById(selectId);
        if (!select || !pgId) {
            select.innerHTML = `<option value="">Select room...</option>`;
            return;
        }
        try {
            const res = await API.pgs.getById(pgId);
            if (res.success && res.data) {
                const pg = res.data;
                const available = pg.floors?.flatMap(f =>
                    f.rooms?.filter(r =>
                        (r.occupied_count || 0) < r.capacity || r.room_number === excludeRoom
                    ) || []
                ) || [];
                select.innerHTML = `<option value="">Select room...</option>` +
                    available.map(r => `<option value="${lkEsc(r.room_number)}" ${r.room_number === excludeRoom ? 'selected' : ''}>${lkEsc(r.room_number)} (${r.occupied_count || 0}/${r.capacity})</option>`).join("");
            }
        } catch (error) {
            select.innerHTML = `<option value="">Error loading rooms</option>`;
        }
    }

    async function getRoomIdByNumber(pgId, roomNumber) {
        try {
            const res = await API.pgs.getById(pgId);
            if (res.success && res.data) {
                const pg = res.data;
                const floors = pg.floors || [];
                for (const floor of floors) {
                    const rooms = floor.rooms || [];
                    for (const room of rooms) {
                        if (room.room_number === roomNumber) {
                            return room.id;
                        }
                    }
                }
            }
            const tenants = allTenants || [];
            const matched = tenants.find(t => t.pg_id === parseInt(pgId) && t.room_number === roomNumber);
            if (matched && matched.room_id) {
                return matched.room_id;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    // ============================================
    // TENANT MODAL
    // ============================================
    const tenantModal = new bootstrap.Modal(document.getElementById("addTenantModal"));

    let guestNationalityDropdown = null;
    let guestCodeDropdown = null;

    function initGuestDropdowns() {
        guestNationalityDropdown = createSearchableDropdown(
            NATIONALITIES,
            'guestNationalityDropdown',
            'tGuestNationality',
            'guestNationalitySearch',
            'guestNationalityOptions'
        );

        guestCodeDropdown = createSearchableDropdown(
            COUNTRY_CODES_DISPLAY,
            'guestCodeDropdown',
            'tGuestCode',
            'guestCodeSearch',
            'guestCodeOptions',
            'display'
        );
    }

    function initTenantEntryDropdowns(entry) {
        const natContainer = entry.querySelector('.tenant-nationality-dropdown');
        if (natContainer) {
            const searchInput = natContainer.querySelector('.tenant-nationality-search');
            const hiddenInput = natContainer.querySelector('.tenant-nationality');
            const optionsContainer = natContainer.querySelector('.tenant-nationality-options');

            if (searchInput && hiddenInput && optionsContainer) {
                createSearchableDropdownForElement(
                    NATIONALITIES,
                    natContainer,
                    hiddenInput,
                    searchInput,
                    optionsContainer
                );
            }
        }

        const codeContainer = entry.querySelector('.tenant-code-dropdown');
        if (codeContainer) {
            const searchInput = codeContainer.querySelector('.tenant-code-search');
            const hiddenInput = codeContainer.querySelector('.tenant-code');
            const optionsContainer = codeContainer.querySelector('.tenant-code-options');

            if (searchInput && hiddenInput && optionsContainer) {
                createSearchableDropdownForElement(
                    COUNTRY_CODES_DISPLAY,
                    codeContainer,
                    hiddenInput,
                    searchInput,
                    optionsContainer,
                    'display'
                );
            }
        }
    }

    // ============================================
    // ADD/EDIT TENANT MODAL CONTROL
    // ============================================
    const addTenantBtn = document.querySelector('[data-bs-target="#addTenantModal"]');
    if (addTenantBtn) {
        addTenantBtn.style.display = canAddTenants ? '' : 'none';
    }

    document.querySelector('[data-bs-target="#addTenantModal"]')?.addEventListener("click", function() {
        document.getElementById("tenantModalTitle").textContent = "Add New Tenant";
        document.getElementById("tenantForm").reset();
        document.getElementById("tenantId").value = "";
        document.getElementById("editMode").value = "false";
        isEditMode = false;
        editingTenantId = null;
        document.getElementById("tenantEntriesContainer").innerHTML = "";
        loadPgDropdown("tPg");
        document.getElementById("tRole").value = "Tenant";
        toggleRoleFields();
        document.getElementById("numTenants").value = 1;
        initGuestDropdowns();
    });

    function toggleRoleFields() {
        const role = document.getElementById("tRole").value;
        const isGuest = role === "Guest";
        document.getElementById("guestFields").classList.toggle("d-none", !isGuest);
        document.getElementById("tenantFields").classList.toggle("d-none", isGuest);
        if (isGuest) {
            document.getElementById("tenantEntriesContainer").innerHTML = "";
        }
    }

    document.getElementById("tRole").addEventListener("change", toggleRoleFields);

    document.getElementById("tPg")?.addEventListener("change", function() {
        const pgId = this.value;
        if (pgId) {
            loadRoomDropdown(pgId, "tRoom");
        } else {
            document.getElementById("tRoom").innerHTML = `<option value="">Select room...</option>`;
        }
    });

    document.getElementById("generateTenantFields")?.addEventListener("click", function() {
        const numTenants = parseInt(document.getElementById("numTenants").value) || 1;
        const roomNo = document.getElementById("tRoom").value;
        const pgId = document.getElementById("tPg").value;
        if (!pgId) {
            showToast("Please select a PG first.", "warning");
            return;
        }
        if (!roomNo) {
            showToast("Please select a room first.", "warning");
            return;
        }
        generateTenantEntries(numTenants);
    });

    function generateTenantEntries(num) {
        const container = document.getElementById("tenantEntriesContainer");
        container.innerHTML = "";
        for (let i = 0; i < num; i++) {
            container.innerHTML += `
            <div class="tenant-entry" data-index="${i}">
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <div class="tenant-entry-number">Tenant #${i + 1}</div>
                    <button type="button" class="btn-remove-tenant" onclick="removeTenantEntry(this)"><i class="bi bi-x-circle me-1"></i>Remove</button>
                </div>
                <div class="row g-3">
                    <div class="col-12"><div class="fs-sub"><i class="bi bi-person"></i>Personal details</div></div>
                    <div class="col-md-6">
                        <label class="form-label">Full name <span class="text-danger">*</span></label>
                        <input type="text" class="form-control tenant-name" required placeholder="As on ID">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Email <span class="text-danger">*</span></label>
                        <input type="email" class="form-control tenant-email" required placeholder="name@example.com">
                        <div class="form-text">Login details and bills are sent here.</div>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Residency <span class="text-danger">*</span></label>
                        <select class="form-select tenant-residency" required>
                            <option value="" selected disabled>Select residency...</option>
                            <option value="national">National</option>
                            <option value="international">International</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Nationality <span class="text-danger">*</span></label>
                        <div class="searchable-dropdown tenant-nationality-dropdown">
                            <input type="text" class="dropdown-search tenant-nationality-search" placeholder="Search or select..." autocomplete="off">
                            <input type="hidden" class="tenant-nationality" value="">
                            <div class="dropdown-options tenant-nationality-options"></div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Gender</label>
                        <select class="form-select tenant-gender">
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div class="col-12"><div class="fs-sub"><i class="bi bi-telephone"></i>Contact</div></div>
                    <div class="col-md-3">
                        <label class="form-label">Country code</label>
                        <div class="searchable-dropdown tenant-code-dropdown">
                            <input type="text" class="dropdown-search tenant-code-search" placeholder="Code..." autocomplete="off">
                            <input type="hidden" class="tenant-code" value="+91">
                            <div class="dropdown-options tenant-code-options"></div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Phone</label>
                        <input type="text" class="form-control tenant-phone" inputmode="tel" placeholder="9876543210">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Parent phone</label>
                        <input type="tel" class="form-control tenant-parent-phone" placeholder="+91 9876543210">
                    </div>
                    <div class="col-md-3 tenant-international-only d-none">
                        <label class="form-label">International phone</label>
                        <input type="text" class="form-control tenant-international-phone" placeholder="+1 234 567 8900">
                        <div class="form-text">Family or emergency contact abroad</div>
                    </div>

                    <div class="col-12"><div class="fs-sub"><i class="bi bi-wallet2"></i>Stay &amp; payment</div></div>
                    <div class="col-md-3">
                        <label class="form-label">Period of stay <span class="text-danger">*</span></label>
                        <select class="form-select tenant-period-of-stay" required>
                            <option value="">Select months...</option>
                            ${Array.from({length: 12}, (_, i) => `<option value="${i + 1}">${i + 1} Month${i === 0 ? '' : 's'}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Rent (₹)</label>
                        <input type="number" min="0" class="form-control tenant-rent" placeholder="11000">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Security fee (₹)</label>
                        <input type="number" min="0" class="form-control tenant-security-fee" placeholder="5000">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Rent due day</label>
                        <input type="number" min="1" max="28" class="form-control tenant-payment-date" placeholder="5">
                        <div class="form-text">Day of month (1–28)</div>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Arrival date</label>
                        <input type="date" class="form-control tenant-arrival-date">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Paid from</label>
                        <input type="date" class="form-control tenant-paid-from">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Paid till</label>
                        <input type="date" class="form-control tenant-paid-till">
                    </div>

                    <div class="col-12"><div class="fs-sub"><i class="bi bi-person-vcard"></i>Identity &amp; compliance</div></div>
                    <div class="col-md-4 tenant-national-only">
                        <label class="form-label">Aadhaar ID</label>
                        <input type="text" class="form-control tenant-aadhaar" inputmode="numeric" placeholder="Aadhaar number">
                    </div>
                    <div class="col-md-4 tenant-national-only">
                        <label class="form-label">Parent Aadhaar</label>
                        <input type="text" class="form-control tenant-parent-aadhaar" inputmode="numeric" placeholder="Parent Aadhaar">
                    </div>
                    <div class="col-md-4 tenant-international-only">
                        <label class="form-label">C-Form number</label>
                        <input type="text" class="form-control tenant-cform" placeholder="C-Form number">
                    </div>
                    <div class="col-md-4 tenant-international-only">
                        <label class="form-label">e-FRRO from</label>
                        <input type="date" class="form-control tenant-efrro-from">
                    </div>
                    <div class="col-md-4 tenant-international-only">
                        <label class="form-label">e-FRRO till</label>
                        <input type="date" class="form-control tenant-efrro-till">
                    </div>
                    <div class="col-12 tenant-residency-hint"><div class="form-text"><i class="bi bi-info-circle me-1"></i>Choose a residency above to see the ID fields that apply.</div></div>
                    <div class="col-12">
                        <div class="doc-upload-container autofill-box">
                            <div class="d-flex flex-wrap align-items-center gap-2">
                                <button type="button" class="btn btn-outline-brand btn-sm btn-attach-doc"><i class="bi bi-magic me-1"></i>Auto-fill from a document</button>
                                <span class="text-muted-soft small">Upload a Form C, passport page or Aadhaar (PDF or photo). It is read on your device and is not stored.</span>
                            </div>
                            <input type="file" class="d-none doc-file-input" accept="image/*,.pdf">
                        </div>
                    </div>
                </div>
            </div>`;
        }

        container.querySelectorAll('.tenant-entry').forEach(entry => {
            initTenantEntryDropdowns(entry);

            const attachBtn = entry.querySelector('.btn-attach-doc');
            const fileInput = entry.querySelector('.doc-file-input');
            if (attachBtn && fileInput) {
                attachBtn.addEventListener('click', () => fileInput.click());
                fileInput.addEventListener('change', function() {
                    if (this.files.length > 0) {
                        handleDocumentUpload(this.files[0], entry);
                    }
                });
            }
        });

        container.querySelectorAll('.tenant-residency').forEach(select => {
            select.addEventListener('change', function() {
                const entry = this.closest('.tenant-entry');
                const isNational = this.value === 'national';
                entry.querySelector('.tenant-residency-hint')?.classList.add('d-none');
                const natHidden = entry.querySelector('.tenant-nationality');
                const natSearch = entry.querySelector('.tenant-nationality-search');

                entry.querySelectorAll('.tenant-international-only').forEach(el => {
                    el.classList.toggle('d-none', isNational);
                });

                entry.querySelectorAll('.tenant-national-only').forEach(el => {
                    el.closest('.col-md-4')?.classList.toggle('d-none', !isNational);
                });

                if (isNational) {
                    if (natHidden && (!natHidden.value || natHidden.value === '')) {
                        natHidden.value = 'Indian';
                    }
                    if (natSearch && (!natSearch.value || natSearch.value === '')) {
                        natSearch.value = 'Indian';
                    }

                    const codeHidden = entry.querySelector('.tenant-code');
                    const codeSearch = entry.querySelector('.tenant-code-search');
                    if (codeHidden && (!codeHidden.value || codeHidden.value === '')) {
                        codeHidden.value = '+91';
                    }
                    if (codeSearch && (!codeSearch.value || codeSearch.value === '')) {
                        codeSearch.value = '+91';
                    }
                }
            });
        });
    }

    window.removeTenantEntry = function(btn) {
        const entry = btn.closest('.tenant-entry');
        if (entry && document.querySelectorAll('.tenant-entry').length > 1) {
            entry.remove();
            document.querySelectorAll('.tenant-entry').forEach((el, idx) => {
                el.querySelector('.tenant-entry-number').textContent = `Tenant #${idx + 1}`;
            });
        } else {
            showToast("At least one tenant is required.", "warning");
        }
    };

    // ============================================
    // TENANT FORM SUBMIT
    // ============================================
    document.getElementById("tenantForm").addEventListener("submit", async function(e) {
        e.preventDefault();
        const btn = this.querySelector('button[type="submit"]');
        LOADER.show(btn, 'Saving...');

        try {
            const role = document.getElementById("tRole").value;
            const isGuest = role === "Guest";

            if (isGuest) {
                const data = {
                    role: 'guest',
                    full_name: document.getElementById("tGuestName").value.trim(),
                    email: document.getElementById("tGuestEmail").value.trim(),
                    nationality: document.getElementById("tGuestNationality").value || "Indian",
                    country_code: document.getElementById("tGuestCode").value || "+91",
                    phone: document.getElementById("tGuestPhone").value.trim(),
                    gender: 'other'
                };
                
                if (!data.full_name || !data.email) {
                    showToast("Please fill in all guest details.", "warning");
                    LOADER.hide(btn);
                    return;
                }

                const res = await API.tenants.create(data);
                
                if (res.success) {
                    showToast(res.message || "Guest registered successfully.", "success");
                    tenantModal.hide();
                    loadTenants();
                } else {
                    showToast(res.message || "Failed to register guest.", "danger");
                }
                LOADER.hide(btn);
                return;
            }

            const pgId = document.getElementById("tPg").value;
            const roomNumber = document.getElementById("tRoom").value;
            const entries = document.querySelectorAll('.tenant-entry');

            if (!pgId || !roomNumber || entries.length === 0) {
                showToast("Please select PG, room and generate tenant fields.", "warning");
                LOADER.hide(btn);
                return;
            }

            const roomId = await getRoomIdByNumber(pgId, roomNumber);
            if (!roomId) {
                showToast("Room not found. Please select a valid room.", "danger");
                LOADER.hide(btn);
                return;
            }

            const editMode = document.getElementById("editMode").value === "true";
            const tenantId = document.getElementById("tenantId").value;

            let valid = true;
            const entriesData = [];

            entries.forEach((entry, idx) => {
                const name = entry.querySelector('.tenant-name').value.trim();
                const email = entry.querySelector('.tenant-email').value.trim();
                const nationality = entry.querySelector('.tenant-nationality').value.trim();
                const residency = entry.querySelector('.tenant-residency').value;
                const countryCode = entry.querySelector('.tenant-code').value.trim() || "+91";
                const phone = entry.querySelector('.tenant-phone').value.trim();
                const internationalPhone = entry.querySelector('.tenant-international-phone')?.value.trim() || '';
                const parentPhone = entry.querySelector('.tenant-parent-phone')?.value.trim() || '';
                const gender = entry.querySelector('.tenant-gender').value;
                const periodOfStay = parseInt(entry.querySelector('.tenant-period-of-stay').value, 10) || 0;
                const rent = parseFloat(entry.querySelector('.tenant-rent').value) || 0;
                const securityFee = parseFloat(entry.querySelector('.tenant-security-fee').value) || 0;
                const paymentDate = parseInt(entry.querySelector('.tenant-payment-date').value) || 1;
                const arrivalDate = entry.querySelector('.tenant-arrival-date').value;
                const paidFrom = entry.querySelector('.tenant-paid-from').value;
                const paidTill = entry.querySelector('.tenant-paid-till').value;
                const aadhaarId = entry.querySelector('.tenant-aadhaar')?.value || '';
                const fatherAadhaarId = entry.querySelector('.tenant-parent-aadhaar')?.value || '';
                const cFormNumber = entry.querySelector('.tenant-cform')?.value || '';
                const efrroFrom = entry.querySelector('.tenant-efrro-from')?.value || '';
                const efrroTill = entry.querySelector('.tenant-efrro-till')?.value || '';

                if (!residency || !nationality) {
                    valid = false;
                    showToast(`Please select residency and nationality for Tenant #${idx + 1}.`, "warning");
                    return;
                }

                if (residency === 'national' && nationality !== 'Indian') {
                    valid = false;
                    showToast(`National tenant #${idx + 1} must have Indian nationality.`, "warning");
                    return;
                }
                if (residency === 'international' && nationality === 'Indian') {
                    valid = false;
                    showToast(`International tenant #${idx + 1} cannot have Indian nationality.`, "warning");
                    return;
                }

                if (!name || !email || !arrivalDate) {
                    valid = false;
                    showToast(`Please fill all required fields for Tenant #${idx + 1}.`, "warning");
                    return;
                }
                if (periodOfStay < 1 || periodOfStay > 12) {
                    valid = false;
                    showToast(`Please select a valid period of stay (1-12 months) for Tenant #${idx + 1}.`, "warning");
                    return;
                }
                if (rent <= 0) {
                    valid = false;
                    showToast(`Please enter valid rent for Tenant #${idx + 1}.`, "warning");
                    return;
                }

                entriesData.push({
                    full_name: name,
                    email: email,
                    nationality: nationality,
                    country_code: countryCode,
                    phone: phone,
                    international_phone: internationalPhone,
                    parent_phone: parentPhone,
                    gender: gender,
                    residency: residency,
                    aadhaar_id: aadhaarId || null,
                    father_aadhaar_id: fatherAadhaarId || null,
                    c_form_number: cFormNumber || null,
                    efrro_from: efrroFrom || null,
                    efrro_till: efrroTill || null,
                    rent: rent,
                    security_fee: securityFee,
                    payment_date: paymentDate,
                    paid_from: paidFrom || null,
                    paid_till: paidTill || null,
                    arrival_date: arrivalDate,
                    period_of_stay: periodOfStay
                });
            });

            if (!valid || entriesData.length === 0) {
                LOADER.hide(btn);
                return;
            }

            if (editMode && tenantId) {
                const data = entriesData[0];
                const payload = {
                    role: 'tenant',
                    full_name: data.full_name,
                    email: data.email,
                    nationality: data.nationality,
                    country_code: data.country_code,
                    phone: data.phone,
                    international_phone: data.international_phone,
                    parent_phone: data.parent_phone,
                    gender: data.gender,
                    pg_id: parseInt(pgId),
                    room_id: roomId,
                    residency: data.residency,
                    aadhaar_id: data.aadhaar_id,
                    father_aadhaar_id: data.father_aadhaar_id,
                    c_form_number: data.c_form_number,
                    efrro_from: data.efrro_from,
                    efrro_till: data.efrro_till,
                    rent: data.rent,
                    security_fee: data.security_fee,
                    payment_date: data.payment_date,
                    paid_from: data.paid_from,
                    paid_till: data.paid_till,
                    arrival_date: data.arrival_date,
                    period_of_stay: data.period_of_stay,
                    number_of_tenants: entriesData.length
                };

                const res = await API.tenants.update(tenantId, payload);
                if (res.success) {
                    showToast(res.message || "Tenant updated successfully.", "success");
                    tenantModal.hide();
                    loadTenants();
                } else {
                    showToast(res.message || "Failed to update tenant.", "danger");
                }
                LOADER.hide(btn);
                return;
            }

            let createdCount = 0;
            let errors = [];

            for (const data of entriesData) {
                const payload = {
                    role: 'tenant',
                    full_name: data.full_name,
                    email: data.email,
                    nationality: data.nationality,
                    country_code: data.country_code,
                    phone: data.phone,
                    international_phone: data.international_phone,
                    parent_phone: data.parent_phone,
                    gender: data.gender,
                    pg_id: parseInt(pgId),
                    room_id: roomId,
                    residency: data.residency,
                    aadhaar_id: data.aadhaar_id,
                    father_aadhaar_id: data.father_aadhaar_id,
                    c_form_number: data.c_form_number,
                    efrro_from: data.efrro_from,
                    efrro_till: data.efrro_till,
                    rent: data.rent,
                    security_fee: data.security_fee,
                    payment_date: data.payment_date,
                    paid_from: data.paid_from,
                    paid_till: data.paid_till,
                    arrival_date: data.arrival_date,
                    period_of_stay: data.period_of_stay,
                    number_of_tenants: 1
                };

                try {
                    const res = await API.tenants.create(payload);
                    if (res.success) {
                        createdCount++;
                    } else {
                        errors.push(`${data.full_name}: ${res.message}`);
                    }
                } catch (err) {
                    errors.push(`${data.full_name}: ${err.message}`);
                }
            }

            if (createdCount > 0) {
                showToast(`${createdCount} tenant(s) added successfully.${errors.length > 0 ? ` Errors: ${errors.join('; ')}` : ''}`, "success");
                tenantModal.hide();
                loadTenants();
            } else {
                showToast(`Failed to add tenants: ${errors.join('; ')}`, "danger");
            }

            LOADER.hide(btn);
        } catch (error) {
            showToast(error.message || "An error occurred.", "danger");
            LOADER.hide(btn);
        }
    });

    // ============================================
    window.downloadTenantAgreement = async function(id) {
        if (!canViewTenants) { showToast("You don't have permission to view tenant agreements.", "warning"); return; }
        try {
            const token = Auth.getToken() || Auth.getTokenFromStorage();
            if (!token) { showToast("Please login again to download the agreement.", "warning"); return; }
            const url = `${API_CONFIG.baseURL}/tenants/${encodeURIComponent(id)}/agreement.pdf`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/pdf' }
            });
            if (!response.ok) {
                let message = 'Unable to download agreement PDF.';
                const ct = (response.headers.get('content-type') || '').toLowerCase();
                if (ct.includes('application/json')) {
                    try { const body = await response.json(); message = body.message || message; } catch (_) {}
                }
                showToast(message, 'warning');
                return;
            }
            const blob = await response.blob();
            // Guard against JSON error bodies returned as blob
            if (blob.type && blob.type.includes('application/json')) {
                try {
                    const text = await blob.text();
                    const body = JSON.parse(text);
                    showToast(body.message || 'Unable to download agreement PDF.', 'warning');
                    return;
                } catch (_) {}
            }
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `LivinKey-Agreement-${id}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);
            showToast('Agreement PDF downloaded.', 'success');
        } catch (error) {
            console.error('downloadTenantAgreement error:', error);
            showToast('Unable to download agreement PDF. Please try again.', 'danger');
        }
    };

    // EDIT TENANT
    // ============================================
    window.editTenant = async function(id) {
        if (!canEditTenants) {
            showToast("You don't have permission to edit tenants.", "warning");
            return;
        }
        
        try {
            const res = await API.tenants.getById(id);
            if (!res.success || !res.data) {
                showToast("Tenant not found.", "danger");
                return;
            }
            const t = res.data;
            isEditMode = true;
            editingTenantId = id;
            document.getElementById("tenantModalTitle").textContent = "Edit Tenant";
            document.getElementById("tenantId").value = id;
            document.getElementById("editMode").value = "true";

            if (t.role === 'guest') {
                document.getElementById("tRole").value = "Guest";
                toggleRoleFields();
                document.getElementById("tGuestName").value = t.full_name || '';
                document.getElementById("tGuestEmail").value = t.email || '';
                if (guestNationalityDropdown) {
                    guestNationalityDropdown.setValue(t.nationality || 'Indian');
                }
                if (guestCodeDropdown) {
                    guestCodeDropdown.setValue(t.country_code || '+91');
                }
                document.getElementById("tGuestPhone").value = t.phone || '';
                tenantModal.show();
                return;
            }

            document.getElementById("tRole").value = "Tenant";
            toggleRoleFields();
            await loadPgDropdown("tPg");
            document.getElementById("tPg").value = t.pg_id || '';
            if (t.pg_id) {
                await loadRoomDropdown(t.pg_id, "tRoom", t.room_number);
                document.getElementById("tRoom").value = t.room_number || '';
            }

            document.getElementById("numTenants").value = 1;
            generateTenantEntries(1);

            const entry = document.querySelector('.tenant-entry');
            if (entry) {
                const nameInput = entry.querySelector('.tenant-name');
                if (nameInput) nameInput.value = t.full_name || '';

                const emailInput = entry.querySelector('.tenant-email');
                if (emailInput) emailInput.value = t.email || '';

                const natHidden = entry.querySelector('.tenant-nationality');
                const natSearch = entry.querySelector('.tenant-nationality-search');
                const residencySelect = entry.querySelector('.tenant-residency');
                const residency = t.residency || 'national';

                if (residencySelect) residencySelect.value = residency;

                if (residency === 'national') {
                    if (natHidden) natHidden.value = 'Indian';
                    if (natSearch) natSearch.value = 'Indian';
                } else {
                    if (natHidden) natHidden.value = t.nationality || '';
                    if (natSearch) natSearch.value = t.nationality || '';
                }

                const codeHidden = entry.querySelector('.tenant-code');
                const codeSearch = entry.querySelector('.tenant-code-search');
                if (codeHidden) codeHidden.value = t.country_code || '+91';
                if (codeSearch) codeSearch.value = t.country_code || '+91';

                const phoneInput = entry.querySelector('.tenant-phone');
                if (phoneInput) phoneInput.value = t.phone || '';

                const intlPhoneInput = entry.querySelector('.tenant-international-phone');
                if (intlPhoneInput) intlPhoneInput.value = t.international_phone || '';
                const parentPhoneInput = entry.querySelector('.tenant-parent-phone');
                if (parentPhoneInput) parentPhoneInput.value = t.parent_phone || '';

                const genderSelect = entry.querySelector('.tenant-gender');
                if (genderSelect) genderSelect.value = t.gender || 'male';

                const periodInput = entry.querySelector('.tenant-period-of-stay');
                if (periodInput) periodInput.value = t.period_of_stay || '';

                const rentInput = entry.querySelector('.tenant-rent');
                if (rentInput) rentInput.value = t.rent || 0;

                const securityInput = entry.querySelector('.tenant-security-fee');
                if (securityInput) securityInput.value = t.security_fee || 0;

                const paymentDateInput = entry.querySelector('.tenant-payment-date');
                if (paymentDateInput) paymentDateInput.value = t.payment_date || 1;

                const arrivalInput = entry.querySelector('.tenant-arrival-date');
                if (arrivalInput) {
                    arrivalInput.value = toDateInputValue(t.arrival_date);
                }

                const paidFromInput = entry.querySelector('.tenant-paid-from');
                if (paidFromInput) {
                    paidFromInput.value = toDateInputValue(t.paid_from);
                }

                const paidTillInput = entry.querySelector('.tenant-paid-till');
                if (paidTillInput) {
                    paidTillInput.value = toDateInputValue(t.paid_till);
                }

                const aadhaarInput = entry.querySelector('.tenant-aadhaar');
                if (aadhaarInput) aadhaarInput.value = t.aadhaar_id || '';

                const parentAadhaarInput = entry.querySelector('.tenant-parent-aadhaar');
                if (parentAadhaarInput) parentAadhaarInput.value = t.father_aadhaar_id || '';

                const cformInput = entry.querySelector('.tenant-cform');
                if (cformInput) cformInput.value = t.c_form_number || '';

                const efrroFromInput = entry.querySelector('.tenant-efrro-from');
                if (efrroFromInput) {
                    efrroFromInput.value = toDateInputValue(t.efrro_from);
                }

                const efrroTillInput = entry.querySelector('.tenant-efrro-till');
                if (efrroTillInput) {
                    efrroTillInput.value = toDateInputValue(t.efrro_till);
                }

                if (residencySelect) {
                    residencySelect.dispatchEvent(new Event('change'));

                    if (residency === 'international') {
                        if (efrroFromInput) efrroFromInput.value = toDateInputValue(t.efrro_from);
                        if (efrroTillInput) efrroTillInput.value = toDateInputValue(t.efrro_till);
                    }
                }
            }

            tenantModal.show();
        } catch (error) {
            showToast("Error loading tenant: " + error.message, "danger");
        }
    };

    // ============================================
    // CHECK OUT / ARCHIVE TENANT (soft — history preserved)
    // ============================================
    const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
    let archiveTargetId = null;
    let archiveMode = 'archive'; // 'archive' | 'checkout'

    function resolveTenant(id, cb) {
        let tenant = allTenants.find(t => String(t.id) === String(id));
        if (tenant) { cb(tenant); return; }
        loadTenants().then(() => {
            tenant = allTenants.find(t => String(t.id) === String(id));
            if (tenant) { cb(tenant); return; }
            API.tenants.getById(id).then(res => {
                if (res.success && res.data) cb(res.data);
                else showToast("Tenant not found. Please refresh and try again.", "danger");
            }).catch(() => showToast("Unable to find tenant.", "danger"));
        });
    }

    window.checkoutTenant = function(id) {
        if (!canDeleteTenants) {
            showToast("You don't have permission to check out tenants.", "warning");
            return;
        }
        resolveTenant(id, (tenant) => showArchiveConfirm(id, tenant, 'checkout'));
    };

    window.archiveTenant = function(id) {
        if (!canDeleteTenants) {
            showToast("You don't have permission to archive tenants.", "warning");
            return;
        }
        resolveTenant(id, (tenant) => showArchiveConfirm(id, tenant, 'archive'));
    };

    // backward alias
    window.deleteTenant = window.archiveTenant;

    function showArchiveConfirm(id, tenant, mode) {
        archiveTargetId = id;
        archiveMode = mode;
        const isCheckout = mode === 'checkout';
        document.getElementById("confirmTitle").textContent = isCheckout
            ? `Check out ${tenant.full_name}?`
            : `Archive ${tenant.full_name}?`;

        const extra = isCheckout
            ? `<div class="mt-3 text-start">
                 <label class="form-label">Checkout date <span class="text-danger">*</span></label>
                 <input type="date" class="form-control" id="checkoutDateInput" value="${new Date().toISOString().slice(0,10)}">
                 <label class="form-label mt-2">Note (optional)</label>
                 <textarea class="form-control" id="archiveReasonInput" rows="2" placeholder="Optional note"></textarea>
                 <p class="small text-muted mt-2 mb-0">Tenant will move to <strong>Archive</strong>. History and documents are kept. You can restore later.</p>
               </div>`
            : `<div class="mt-3 text-start">
                 <label class="form-label">Archive reason (optional)</label>
                 <textarea class="form-control" id="archiveReasonInput" rows="2" placeholder="Optional reason"></textarea>
                 <p class="small text-muted mt-2 mb-0">Tenant will move to <strong>Archive</strong>. Nothing is permanently deleted. Use permanent delete from Archive if needed.</p>
               </div>`;

        document.getElementById("confirmBody").innerHTML = extra;
        document.getElementById("confirmActionBtn").textContent = isCheckout ? 'Check Out' : 'Move to Archive';
        document.getElementById("confirmActionBtn").onclick = async function() {
            const btn = this;
            const reasonEl = document.getElementById("archiveReasonInput");
            const reason = reasonEl ? reasonEl.value.trim() : null;
            LOADER.show(btn, isCheckout ? 'Checking out...' : 'Archiving...');
            try {
                let res;
                if (isCheckout) {
                    const dateEl = document.getElementById("checkoutDateInput");
                    const checkout_date = dateEl ? dateEl.value : null;
                    if (!checkout_date) {
                        showToast("Checkout date is required.", "warning");
                        LOADER.hide(btn);
                        return;
                    }
                    res = await API.tenants.checkout(archiveTargetId, checkout_date, reason || null);
                } else {
                    res = await API.tenants.delete(archiveTargetId, reason || null);
                }
                if (res.success) {
                    showToast(res.message || (isCheckout ? "Tenant checked out." : "Tenant archived."), "success");
                    confirmModal.hide();
                    allTenants = allTenants.filter(t => String(t.id) !== String(archiveTargetId));
                    window.LK_TENANTS = allTenants;
                    renderTable();
                    renderStats();
                } else {
                    showToast(res.message || "Action failed.", "danger");
                }
            } catch (error) {
                showToast(error.message || "An error occurred.", "danger");
            }
            LOADER.hide(btn);
        };
        confirmModal.show();
    }

    // ============================================
    // DOCUMENTS MODAL
    // ============================================
    const docsModal = new bootstrap.Modal(document.getElementById("docsModal"));
    let currentDocTenantId = null;

    window.openDocs = async function(id) {
        currentDocTenantId = id;
        
        if (!Auth.isAuthenticated()) {
            const token = Auth.getTokenFromStorage();
            if (token) {
                sessionStorage.setItem('lk_token', token);
                const session = localStorage.getItem('lk_session');
                if (session) {
                    sessionStorage.setItem('lk_session', session);
                }
                if (Auth.isAuthenticated()) {
                    showToast("Session restored. Please try again.", "success");
                    openDocs(id);
                    return;
                }
            }
            showToast("Please login as admin to view documents.", "warning");
            return;
        }
        
        try {
            const res = await API.tenants.getById(id);
            if (!res.success || !res.data) {
                showToast("Tenant not found.", "danger");
                return;
            }
            const t = res.data;
            document.getElementById("docsTenantName").textContent = t.full_name || 'Tenant';

            try {
                const docRes = await API.documents.admin.getByTenant(id);
                const docTypes = t.residency === 'national'
                    ? ['passport_photo', 'signature', 'tenant_aadhaar', 'parent_aadhaar', 'university_id', 'agreement']
                    : ['passport_photo', 'signature', 'passport', 'visa', 'arrival_stamp', 'c_form', 'efrro', 'university_id', 'agreement'];

                const docLabels = {
                    'passport_photo': 'Passport Size Photo',
                    'signature': 'Signature',
                    'tenant_aadhaar': 'Aadhaar Card',
                    'parent_aadhaar': 'Parent Aadhaar',
                    'university_id': 'University ID',
                    'passport': 'Passport',
                    'visa': 'Visa',
                    'arrival_stamp': 'Arrival Stamp',
                    'c_form': 'C-Form',
                    'efrro': 'E-FRRO',
                    'agreement': 'Agreement'
                };
                let docs = [];
                
                if (docRes.success && docRes.data) {
                    if (Array.isArray(docRes.data)) {
                        docs = docRes.data;
                    } 
                    else if (docRes.data.uploaded_documents && Array.isArray(docRes.data.uploaded_documents)) {
                        docs = docRes.data.uploaded_documents;
                    } 
                    else if (docRes.data.documents && Array.isArray(docRes.data.documents)) {
                        docs = docRes.data.documents;
                    }
                }
                
                const uploadedTypes = docs.map(d => d.document_type);
                window._currentTenantDocs = docs; // keep for bulk download
                
                // Update document cache with this tenant's status
                const requiredTypes = getRequiredDocumentTypes(t.residency || 'national');
                const missing = requiredTypes.filter(type => !uploadedTypes.includes(type));
                documentStatusCache[id] = missing.length === 0;
                updatePendingDocsBadge();

                document.getElementById("docsGrid").innerHTML = docTypes.map(key => {
                    const has = uploadedTypes.includes(key);
                    const doc = docs.find(d => d.document_type === key);
                    const dUrl = (doc?.document_url || '').toLowerCase();
                    const isPdfDoc = has && (dUrl.includes('.pdf') || dUrl.includes('/raw/') || (doc?.mime_type && String(doc.mime_type).toLowerCase().includes('pdf')) ||
                        (key === 'agreement' && !dUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i)));
                    return `
                    <div class="col-md-4 col-6">
                        <div class="doc-thumb">
                            ${!has ? `<img src="https://placehold.co/300x160/E1E8D8/7C8A76?text=${encodeURIComponent(docLabels[key])}" alt="${docLabels[key]}">` :
                             (isPdfDoc ? `<div style="height:160px;display:flex;align-items:center;justify-content:center;background:#1a1a1a;cursor:pointer;" onclick="previewDoc('${(doc?.document_url || '').replace(/'/g, "\\'")}','${(docLabels[key] || key).replace(/'/g, "\\'")}','${doc?.id}')"><i class="bi bi-file-earmark-pdf" style="font-size:3rem;color:#e74c3c;"></i></div>` :
                             `<img src="${doc?.document_url || '#'}" alt="${docLabels[key]}" style="height:160px;object-fit:cover;cursor:pointer;width:100%;" onclick="previewDoc('${(doc?.document_url || '').replace(/'/g, "\\'")}','${(docLabels[key] || key).replace(/'/g, "\\'")}','${doc?.id}')" onerror="this.onerror=null;this.src='https://placehold.co/300x160/E1E8D8/7C8A76?text=${encodeURIComponent(docLabels[key])}';this.onclick=null;">`)}
                            <div class="doc-actions">
                                ${has ? `<button class="btn-icon" style="background:#fff;" title="Preview" onclick="previewDoc('${(doc?.document_url || '').replace(/'/g, "\\'")}','${(docLabels[key] || key).replace(/'/g, "\\'")}','${doc?.id}')"><i class="bi bi-eye"></i></button>` : ''}
                                ${has ? `<button class="btn-icon" style="background:#fff;" title="Download" onclick="downloadDoc('${doc?.id}')"><i class="bi bi-download"></i></button>` : ''}
                                ${has && canDeleteTenants ? `<button class="btn-icon" style="background:#fff;color:var(--danger);" title="Delete" onclick="deleteDoc('${doc?.id}')"><i class="bi bi-trash3"></i></button>` : ''}
                            </div>
                            <div class="doc-label">
                                <div class="fw-bold">${docLabels[key]}</div>
                                ${has ? '<span class="chip chip-green ms-1">Uploaded</span>' : '<span class="chip chip-gray ms-1">Missing</span>'}
                            </div>
                        </div>
                    </div>`;
                }).join("");

                docsModal.show();
            } catch (docError) {
                console.error("Document fetch error:", docError);
                if (docError.status === 401 || docError.status === 403 || 
                    docError.message?.includes('Invalid user role') || 
                    docError.message?.includes('Access denied')) {
                    
                    const token = localStorage.getItem('lk_token');
                    if (token) {
                        sessionStorage.setItem('lk_token', token);
                        const session = localStorage.getItem('lk_session');
                        if (session) {
                            sessionStorage.setItem('lk_session', session);
                        }
                        try {
                            const retryRes = await API.documents.admin.getByTenant(id);
                            if (retryRes.success) {
                                openDocs(id);
                                return;
                            }
                        } catch (retryError) {
                            Auth.clear();
                            showToast("Your session has expired. Please login again.", "warning");
                            setTimeout(() => {
                                window.location.href = 'index.html';
                            }, 1500);
                            return;
                        }
                    }
                    
                    Auth.clear();
                    showToast("Your session has expired. Please login again.", "warning");
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                } else {
                    showToast("Error loading documents: " + (docError.message || "Unknown error"), "danger");
                }
                document.getElementById("docsGrid").innerHTML = `
                    <div class="col-12 text-center py-4">
                        <i class="bi bi-file-earmark-text" style="font-size: 2rem; color: var(--muted);"></i>
                        <p class="text-muted-soft mt-2">No documents available for this tenant.</p>
                        <small class="text-muted-soft">Please refresh and try again if you believe this is an error.</small>
                    </div>
                `;
                docsModal.show();
            }
        } catch (error) {
            console.error("Error loading tenant:", error);
            showToast("Error loading tenant: " + (error.message || "Unknown error"), "danger");
        }
    };

    // ============================================
    // DOCUMENT ACTIONS
    // ============================================
    let docPreviewModalInstance = null;
    try { docPreviewModalInstance = new bootstrap.Modal(document.getElementById("docPreviewModal")); } catch (_) {}

    window.previewDoc = function(url, title, docId) {
        if (!url || url === '#' || url === 'undefined') {
            showToast("No preview available for this document.", "warning");
            return;
        }
        const body = document.getElementById("docPreviewBody");
        const titleEl = document.getElementById("docPreviewTitle");
        const dl = document.getElementById("docPreviewDownload");
        if (titleEl) titleEl.textContent = title || 'Document Preview';
        if (dl) {
            dl.href = url;
            dl.onclick = function(e) {
                e.preventDefault();
                if (docId) downloadDoc(docId);
                else window.open(url, '_blank');
            };
        }
        const lower = (url || '').toLowerCase();
        const isPdf = lower.includes('.pdf') || lower.includes('application/pdf') || lower.includes('/raw/');
        // Cloudinary raw resources and explicit pdfs → iframe; images → img
        if (isPdf || (!lower.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i) && lower.includes('cloudinary'))) {
            // Prefer direct open for PDFs that may block iframe; still try iframe first
            body.innerHTML = `<iframe src="${url}" style="width:100%;height:70vh;border:none;border-radius:8px;background:#fff;" title="Preview"></iframe>
                <p class="text-muted-soft small mt-2 mb-0">If the preview does not load, use Download.</p>`;
        } else {
            body.innerHTML = `<img src="${lkEsc(url)}" alt="${lkEsc(title || 'Document')}" style="max-width:100%;max-height:70vh;object-fit:contain;border-radius:8px;">`;
        }
        if (docPreviewModalInstance) docPreviewModalInstance.show();
        else {
            // fallback: open in new tab
            window.open(url, '_blank');
        }
    };

    window.downloadAllTenantDocs = async function() {
        if (!currentDocTenantId) {
            showToast("No tenant selected.", "warning");
            return;
        }
        const token = Auth.getTokenFromStorage();
        if (!token) {
            showToast("Please login to download documents.", "warning");
            return;
        }
        try {
            const docs = window._currentTenantDocs || [];
            const ids = docs.map(d => d.id).filter(Boolean);
            if (!ids.length) {
                showToast("No uploaded documents to download.", "info");
                return;
            }
            showToast("Preparing ZIP download...", "info");
            const response = await fetch(`${API_CONFIG.baseURL}/documents/admin/download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ documentIds: ids })
            });
            if (!response.ok) {
                let message = 'Unable to download documents.';
                try { const body = await response.json(); message = body.message || message; } catch (_) {}
                showToast(message, 'warning');
                return;
            }
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = `tenant-${currentDocTenantId}-documents.zip`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(objectUrl);
            showToast("Download started.", "success");
        } catch (error) {
            console.error(error);
            showToast("Unable to download documents. Please try again.", "danger");
        }
    };

    window.downloadDoc = function(docId) {
        const token = Auth.getTokenFromStorage();
        if (!token) {
            showToast("Please login to download documents.", "warning");
            return;
        }
        window.openAuthorizedUrl(`/documents/admin/${encodeURIComponent(docId)}/download`);
    };

    window.deleteDoc = async function(docId) {
        if (!canDeleteTenants) {
            showToast("You don't have permission to delete documents.", "warning");
            return;
        }
        if (!confirm("Delete this document?")) return;
        try {
            const res = await API.documents.admin.delete(docId);
            if (res.success) {
                showToast("Document deleted.", "success");
                // Update cache - mark as missing
                if (currentDocTenantId) {
                    documentStatusCache[currentDocTenantId] = false;
                    updatePendingDocsBadge();
                    openDocs(currentDocTenantId);
                }
            } else {
                showToast(res.message || "Failed to delete document.", "danger");
            }
        } catch (error) {
            showToast("Error deleting document: " + error.message, "danger");
        }
    };

    // ============================================
    // PG FILTER CLEAR
    // ============================================
    document.getElementById("pgFilterClear")?.addEventListener("click", function() {
        const select = document.getElementById("pgFilter");
        if (select) {
            select.value = "all";
            currentPgFilter = "all";
            renderTable();
        }
    });

    // ============================================
    // TABLE KIT: sorting, paging, column toggle, CSV, bulk selection
    // ============================================
    LKUI.table('#tenantsTable', {
        key: 'tenants', noun: 'tenant', csv: 'tenants', skipCols: [15],
        bulk: {
            idOf: tr => tr.dataset.id,
            actions: [
                { label: 'Message', icon: 'bi-megaphone', run: (ids) => {
                    sessionStorage.setItem('lk_notify_preselect', JSON.stringify(ids));
                    window.location.href = 'notifications.html?preselect=1'; return false; } },
                { label: 'Archive', icon: 'bi-archive', danger: true, visible: () => canDeleteTenants, run: async (ids) => {
                    const reason = await LKUI.prompt({ title: `Archive ${ids.length} tenant${ids.length === 1 ? '' : 's'}?`, body: 'They move to the Tenant Archive and can be restored later.', label: 'Reason (optional)', placeholder: 'e.g. Semester ended', confirmText: 'Archive', tone: 'warn', icon: 'bi-archive' });
                    if (reason === null) return false;
                    const r = await LKUI.runBatch(ids, id => API.tenants.delete(id, reason || null), { title: 'Archiving tenants…' });
                    LKUI.toast(r.failed.length ? `Archived ${r.ok}, ${r.failed.length} failed: ${r.failed[0].error}` : `Archived ${r.ok} tenant${r.ok === 1 ? '' : 's'}`, r.failed.length ? 'warning' : 'success');
                    loadTenants(); return true; } }
            ]
        }
    });

    // ============================================
    // REFRESH + DEEP LINKS (?new=1, ?docs=pending, ?q=name)
    // ============================================
    LKUI.onRefresh(() => { documentCacheLoadComplete = false; return loadTenants(); });
    (function deepLinks() {
        const qs = new URLSearchParams(window.location.search);
        if (qs.get('new') === '1' && canAddTenants) {
            setTimeout(() => bootstrap.Modal.getOrCreateInstance(document.getElementById('addTenantModal')).show(), 250);
            history.replaceState(null, '', 'tenants.html');
        }
        if (qs.get('docs') === 'pending') {
            currentDocFilter = 'pending';
            document.getElementById('pendingDocsFilter')?.classList.add('active');
        }
        const q = qs.get('q');
        if (q) { const el = document.getElementById('tenantSearch'); if (el) { el.value = q; currentFilterType = 'text'; currentFilter = q; } }
    })();

    // ============================================
    // INIT
    // ============================================
    loadTenants();
});