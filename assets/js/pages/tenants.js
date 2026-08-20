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
    let isEditMode = false;
    let editingTenantId = null;
    let allTenants = [];

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
    function handleDocumentUpload(file, entry) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const fileType = file.type;
                if (fileType.startsWith('image/')) {
                    const previewDiv = document.createElement('div');
                    previewDiv.className = 'doc-preview mt-2';
                    previewDiv.innerHTML = `
                        <img src="${e.target.result}" alt="Document preview" style="max-width:100%;max-height:150px;border-radius:8px;border:1px solid var(--border);">
                        <div class="text-muted-soft small mt-1">Document attached for reference only. Fields auto-filled below.</div>
                    `;

                    const container = entry.querySelector('.doc-upload-container');
                    if (container) {
                        const oldPreview = container.querySelector('.doc-preview');
                        if (oldPreview) oldPreview.remove();
                        container.appendChild(previewDiv);
                    }

                    autoFillFromDocument(file.name, entry);
                    return;
                }

                autoFillFromDocument(file.name, entry);
                showToast(`Document "${file.name}" attached. Fields auto-filled.`, "info");

            } catch (error) {
                console.error("Document processing error:", error);
                showToast("Could not auto-fill from document. Please fill manually.", "warning");
            }
        };

        if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
        } else {
            const container = entry.querySelector('.doc-upload-container');
            if (container) {
                const previewDiv = document.createElement('div');
                previewDiv.className = 'doc-preview mt-2';
                previewDiv.innerHTML = `
                    <div style="background:var(--bg);padding:0.5rem 1rem;border-radius:8px;border:1px solid var(--border);">
                        <i class="bi bi-file-earmark-text me-2"></i>
                        <span>${file.name}</span>
                        <span class="text-muted-soft small ms-2">(${(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <div class="text-muted-soft small mt-1">Document attached for reference only. Fields auto-filled below.</div>
                `;

                const oldPreview = container.querySelector('.doc-preview');
                if (oldPreview) oldPreview.remove();
                container.appendChild(previewDiv);
            }

            autoFillFromDocument(file.name, entry);
            showToast(`Document "${file.name}" attached. Fields auto-filled.`, "info");
        }
    }

    function autoFillFromDocument(fileName, entry) {
        const nameMatch = fileName.match(/^([a-zA-Z\s]+)(?=[_.-]|$)/);
        if (nameMatch && nameMatch[1]) {
            const extractedName = nameMatch[1].trim();
            const nameInput = entry.querySelector('.tenant-name');
            if (nameInput && !nameInput.value) {
                nameInput.value = extractedName;
            }
        }

        const emailMatch = fileName.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch && emailMatch[0]) {
            const emailInput = entry.querySelector('.tenant-email');
            if (emailInput && !emailInput.value) {
                emailInput.value = emailMatch[0];
            }
        }

        const phoneMatch = fileName.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        if (phoneMatch && phoneMatch[0]) {
            const phoneInput = entry.querySelector('.tenant-phone');
            if (phoneInput && !phoneInput.value) {
                phoneInput.value = phoneMatch[0].replace(/[-.\s()]/g, '');
            }
        }

        showToast("📄 Document processed. Name and email auto-filled where possible.", "info");
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
    async function loadTenants() {
        try {
            const params = {};
            if (currentPgFilter !== "all") params.pg_id = currentPgFilter;
            if (currentFilter && currentFilter !== "__EFRRO_EXPIRING__") {
                params.search = currentFilter;
            }

            const response = await API.tenants.getAll(params);
            if (response.success) {
                allTenants = (response.data || []).filter(t => t.role !== 'guest');
                window.LK_TENANTS = allTenants;
                renderTable();
                renderStats();
                populatePgFilter();
            } else {
                showToast(response.message || "Failed to load tenants", "danger");
            }
        } catch (error) {
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

        const expiringEFRRO = tenants.filter(t => {
            if (t.residency !== 'international' || !t.efrro_till) return false;
            const today = new Date();
            const expiryDate = new Date(t.efrro_till);
            const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays <= 30;
        });

        const stats = [
            { label: "Total Tenants", value: tenants.length, icon: "bi-people-fill", color: "var(--lk-green)", filter: "all" },
            { label: "National", value: national, icon: "bi-flag-fill", color: "var(--info)", filter: "residency:national" },
            { label: "International", value: international, icon: "bi-globe2", color: "var(--warning)", filter: "residency:international" },
            { label: "Male", value: male, icon: "bi-gender-male", color: "var(--lk-black)", filter: "gender:male" },
            { label: "Female", value: female, icon: "bi-gender-female", color: "var(--danger)", filter: "gender:female" },
            { label: "Expiring e-FRRO", value: expiringEFRRO.length, icon: "bi-clock-history", color: "#e74c3c", filter: "efrro-expiring" }
        ];

        document.getElementById("tenantStats").innerHTML = stats.map(s => `
            <div class="col-6 col-md-4 col-lg">
                <div class="stat-card hover-lift" onclick="filterByStat('${s.filter}')">
                    <div class="stat-icon" style="background:${s.color}22;color:${s.color};"><i class="bi ${s.icon}"></i></div>
                    <div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
                </div>
            </div>
        `).join("");
    }

    window.filterByStat = function(filter) {
        const searchInput = document.getElementById("tenantSearch");
        
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
        } else {
            searchInput.value = filter.charAt(0).toUpperCase() + filter.slice(1);
            currentFilter = searchInput.value;
            currentFilterType = "text";
        }
        renderTable();
    };

    // ============================================
    // RENDER TABLE
    // ============================================
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
        } else if (currentFilterType === "efrro") {
            tenants = tenants.filter(t => {
                if (t.residency !== 'international' || !t.efrro_till) return false;
                const today = new Date();
                const expiryDate = new Date(t.efrro_till);
                const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays <= 30;
            });
        } else if (searchVal) {
            if (searchVal === "__efrro_expiring__") {
                tenants = tenants.filter(t => {
                    if (t.residency !== 'international' || !t.efrro_till) return false;
                    const today = new Date();
                    const expiryDate = new Date(t.efrro_till);
                    const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                    return diffDays >= 0 && diffDays <= 30;
                });
            } else if (searchVal === "residency:national") {
                tenants = tenants.filter(t => t.residency === 'national');
            } else if (searchVal === "residency:international") {
                tenants = tenants.filter(t => t.residency === 'international');
            } else if (searchVal === "gender:male") {
                tenants = tenants.filter(t => t.gender === 'male');
            } else if (searchVal === "gender:female") {
                tenants = tenants.filter(t => t.gender === 'female');
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

        if (tenants.length === 0) {
            tbody.innerHTML = '';
            document.getElementById("tenantsEmpty").classList.remove("d-none");
            return;
        }
        document.getElementById("tenantsEmpty").classList.add("d-none");

        tbody.innerHTML = tenants.map(t => {
            const statusLabels = {
                'unpaid': 'Unpaid',
                'partially_paid': 'Partial',
                'paid': 'Paid',
                'delayed': 'Delayed',
                'overdue': 'Overdue'
            };
            const statusChips = {
                'unpaid': 'chip-red',
                'partially_paid': 'chip-amber',
                'paid': 'chip-green',
                'delayed': 'chip-red',
                'overdue': 'chip-red'
            };
            const status = t.bill_status || 'unpaid';
            const efrroStatus = getEFRROStatus(t);
            const arrivalDate = t.arrival_date ? formatDate(t.arrival_date) : "—";

            return `
            <tr>
                <td>
                    <span class="name-link" onclick="openDocs('${t.id}')">${t.full_name || '—'}</span>
                    <div class="small text-muted-soft">${t.email || '—'}</div>
                </td>
                <td>${t.pg_name || '—'}</td>
                <td>${t.room_number || '—'}</td>
                <td>${fmtINR(t.rent || 0)}</td>
                <td>${fmtINR(t.security_fee || 0)}</td>
                <td>${t.nationality || '—'}</td>
                <td>${t.gender || '—'}</td>
                <td>${t.payment_date ? "Day " + t.payment_date : "—"}</td>
                <td>${arrivalDate}</td>
                <td>${efrroStatus}</td>
                <td><span class="chip ${statusChips[status] || 'chip-gray'}">${statusLabels[status] || status}</span></td>
                <td class="text-end">
                    ${canEditTenants ? `<button class="btn-icon me-1" title="Edit" onclick="editTenant('${t.id}')"><i class="bi bi-pencil"></i></button>` : ''}
                    ${canDeleteTenants ? `<button class="btn-icon" title="Delete" onclick="deleteTenant('${t.id}')"><i class="bi bi-trash3"></i></button>` : ''}
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
                        options += `<option value="${pg.id}" ${selected}>${pg.name}</option>`;
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
        currentFilterType = "";
        currentFilter = "";
        renderTable();
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
                    res.data.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
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
                    available.map(r => `<option value="${r.room_number}" ${r.room_number === excludeRoom ? 'selected' : ''}>${r.room_number} (${r.occupied_count || 0}/${r.capacity})</option>`).join("");
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
                <div class="tenant-entry-number">Tenant #${i + 1}</div>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label">Full name *</label>
                        <input type="text" class="form-control tenant-name" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Email *</label>
                        <input type="email" class="form-control tenant-email" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Nationality</label>
                        <div class="searchable-dropdown tenant-nationality-dropdown">
                            <input type="text" class="dropdown-search tenant-nationality-search" placeholder="Search or select nationality..." autocomplete="off">
                            <input type="hidden" class="tenant-nationality" value="Indian">
                            <div class="dropdown-options tenant-nationality-options"></div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Residency</label>
                        <select class="form-select tenant-residency">
                            <option value="national">National</option>
                            <option value="international">International</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Country code</label>
                        <div class="searchable-dropdown tenant-code-dropdown">
                            <input type="text" class="dropdown-search tenant-code-search" placeholder="Search or select code..." autocomplete="off">
                            <input type="hidden" class="tenant-code" value="+91">
                            <div class="dropdown-options tenant-code-options"></div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Phone</label>
                        <input type="text" class="form-control tenant-phone" placeholder="9876543210">
                    </div>
                    <!-- ============================================================ -->
                    <!-- NEW: International Phone (only for international tenants) -->
                    <!-- FIX: was col-md-3 with an inline style="display:none;" that -->
                    <!-- never got cleared — the residency-toggle handler below only -->
                    <!-- looks for a closest('.col-md-4') wrapper (matching the other -->
                    <!-- international-only fields), so this field could never be -->
                    <!-- revealed. Now uses col-md-4 + d-none so it toggles correctly. -->
                    <!-- ============================================================ -->
                    <div class="col-md-4 tenant-international-only d-none">
                        <label class="form-label">International Phone</label>
                        <input type="text" class="form-control tenant-international-phone" placeholder="+1 234 567 8900">
                        <div class="form-text small text-muted">For family/emergency contact abroad</div>
                    </div>
                    <!-- ============================================================ -->
                    <div class="col-md-3">
                        <label class="form-label">Gender</label>
                        <select class="form-select tenant-gender">
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Rent (INR)</label>
                        <input type="number" class="form-control tenant-rent" placeholder="11000">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Security Fee</label>
                        <input type="number" class="form-control tenant-security-fee" placeholder="5000">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Payment Date (day)</label>
                        <input type="number" min="1" max="28" class="form-control tenant-payment-date" placeholder="5">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Arrival Date</label>
                        <input type="date" class="form-control tenant-arrival-date">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Paid From</label>
                        <input type="date" class="form-control tenant-paid-from">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Paid Till</label>
                        <input type="date" class="form-control tenant-paid-till">
                    </div>
                    <div class="col-md-4 tenant-national-only">
                        <label class="form-label">Aadhaar ID</label>
                        <input type="text" class="form-control tenant-aadhaar" placeholder="Aadhaar number">
                    </div>
                    <div class="col-md-4 tenant-national-only">
                        <label class="form-label">Parent Aadhaar</label>
                        <input type="text" class="form-control tenant-parent-aadhaar" placeholder="Parent Aadhaar">
                    </div>
                    <div class="col-md-4 tenant-international-only">
                        <label class="form-label">C-Form Number</label>
                        <input type="text" class="form-control tenant-cform" placeholder="C-Form number">
                    </div>
                    <div class="col-md-4 tenant-international-only">
                        <label class="form-label">e-FRRO From</label>
                        <input type="date" class="form-control tenant-efrro-from">
                    </div>
                    <div class="col-md-4 tenant-international-only">
                        <label class="form-label">e-FRRO Till</label>
                        <input type="date" class="form-control tenant-efrro-till">
                    </div>
                    <div class="col-12">
                        <div class="doc-upload-container">
                            <label class="form-label">Attach Document (Auto-Fill)</label>
                            <div class="d-flex gap-2">
                                <button type="button" class="btn btn-outline-brand btn-sm btn-attach-doc">
                                    <i class="bi bi-paperclip me-1"></i>Attach Document
                                </button>
                                <span class="text-muted-soft small d-flex align-items-center">Upload ID/Passport/Aadhaar for auto-fill</span>
                            </div>
                            <input type="file" class="d-none doc-file-input" accept="image/*,.pdf,.doc,.docx">
                            <small class="text-muted-soft d-block mt-1">⚠️ Document is only used for auto-filling fields. Not stored in database.</small>
                        </div>
                    </div>
                    <div class="col-12 text-end">
                        <button type="button" class="btn-remove-tenant" onclick="removeTenantEntry(this)">Remove this tenant</button>
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
                const natHidden = entry.querySelector('.tenant-nationality');
                const natSearch = entry.querySelector('.tenant-nationality-search');

                entry.querySelectorAll('.tenant-national-only').forEach(el => {
                    el.closest('.col-md-4')?.classList.toggle('d-none', !isNational);
                });
                entry.querySelectorAll('.tenant-international-only').forEach(el => {
                    el.closest('.col-md-4')?.classList.toggle('d-none', isNational);
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
                // ============================================================
                // NEW: Capture international phone
                // ============================================================
                const internationalPhone = entry.querySelector('.tenant-international-phone')?.value.trim() || '';
                const gender = entry.querySelector('.tenant-gender').value;
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
                    arrival_date: arrivalDate
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

                // ============================================================
                // NEW: Populate international phone when editing
                // ============================================================
                const intlPhoneInput = entry.querySelector('.tenant-international-phone');
                if (intlPhoneInput) intlPhoneInput.value = t.international_phone || '';

                const genderSelect = entry.querySelector('.tenant-gender');
                if (genderSelect) genderSelect.value = t.gender || 'male';

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
    // DELETE TENANT
    // ============================================
    const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
    let deleteTargetId = null;

    window.deleteTenant = function(id) {
        if (!canDeleteTenants) {
            showToast("You don't have permission to delete tenants.", "warning");
            return;
        }
        
        let tenant = allTenants.find(t => t.id === id);

        if (!tenant) {
            loadTenants().then(() => {
                tenant = allTenants.find(t => t.id === id);
                if (tenant) {
                    showDeleteConfirm(id, tenant);
                } else {
                    API.tenants.getById(id).then(res => {
                        if (res.success && res.data) {
                            tenant = res.data;
                            showDeleteConfirm(id, tenant);
                        } else {
                            showToast("Tenant not found. Please refresh and try again.", "danger");
                        }
                    }).catch(() => {
                        showToast("Unable to find tenant. Please refresh and try again.", "danger");
                    });
                }
            });
            return;
        }

        showDeleteConfirm(id, tenant);
    };

    function showDeleteConfirm(id, tenant) {
        deleteTargetId = id;
        document.getElementById("confirmTitle").textContent = `Delete ${tenant.full_name}?`;
        document.getElementById("confirmBody").textContent = "This will permanently remove this tenant and their documents. This action cannot be undone.";
        document.getElementById("confirmActionBtn").onclick = async function() {
            const btn = this;
            LOADER.show(btn, 'Deleting...');
            try {
                const res = await API.tenants.delete(deleteTargetId);
                if (res.success) {
                    showToast(res.message || "Tenant deleted successfully.", "success");
                    confirmModal.hide();
                    allTenants = allTenants.filter(t => t.id !== deleteTargetId);
                    window.LK_TENANTS = allTenants;
                    renderTable();
                    renderStats();
                } else {
                    showToast(res.message || "Failed to delete tenant.", "danger");
                }
            } catch (error) {
                showToast(error.message || "An error occurred while deleting.", "danger");
            }
            LOADER.hide(btn);
        };
        confirmModal.show();
    }

    // ============================================
    // DOCUMENTS MODAL - FIXED
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
                    ? ['passport_photo', 'tenant_aadhaar', 'parent_aadhaar', 'university_id']
                    : ['passport_photo', 'passport', 'visa', 'arrival_stamp', 'c_form', 'efrro', 'university_id'];

                const docLabels = {
                    'passport_photo': 'Passport Size Photo',
                    'tenant_aadhaar': 'Aadhaar Card',
                    'parent_aadhaar': 'Parent Aadhaar',
                    'university_id': 'University ID',
                    'passport': 'Passport',
                    'visa': 'Visa',
                    'arrival_stamp': 'Arrival Stamp',
                    'c_form': 'C-Form',
                    'efrro': 'E-FRRO'
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

                document.getElementById("docsGrid").innerHTML = docTypes.map(key => {
                    const has = uploadedTypes.includes(key);
                    const doc = docs.find(d => d.document_type === key);
                    return `
                    <div class="col-md-4 col-6">
                        <div class="doc-thumb">
                            ${has ? `<img src="${doc?.document_url || '#'}" alt="${docLabels[key]}" style="height:160px;object-fit:cover;" onerror="this.src='https://placehold.co/300x160/E1E8D8/7C8A76?text=${encodeURIComponent(docLabels[key])}'">` :
                             `<img src="https://placehold.co/300x160/E1E8D8/7C8A76?text=${encodeURIComponent(docLabels[key])}" alt="${docLabels[key]}">`}
                            <div class="doc-actions">
                                ${has ? `<button class="btn-icon" style="background:#fff;" onclick="downloadDoc('${doc?.id}')"><i class="bi bi-download"></i></button>` : ''}
                                ${has && canDeleteTenants ? `<button class="btn-icon" style="background:#fff;color:var(--danger);" onclick="deleteDoc('${doc?.id}')"><i class="bi bi-trash3"></i></button>` : ''}
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
    window.downloadDoc = function(docId) {
        const token = Auth.getTokenFromStorage();
        if (!token) {
            showToast("Please login to download documents.", "warning");
            return;
        }
        window.open(`${API_CONFIG.baseURL}/documents/admin/${docId}/download?token=${encodeURIComponent(token)}`, '_blank');
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
                if (currentDocTenantId) openDocs(currentDocTenantId);
            } else {
                showToast(res.message || "Failed to delete document.", "danger");
            }
        } catch (error) {
            showToast("Error deleting document: " + error.message, "danger");
        }
    };

    // ============================================
    // INIT
    // ============================================
    loadTenants();
});