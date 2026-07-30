document.addEventListener("DOMContentLoaded", () => {
  renderLayout("tenants", "Tenants Management", "Search and manage every resident tenant of your property.");

  const statusMeta = {
    unpaid:     { label: "Unpaid",     chip: "chip-red"   },
    unfinished: { label: "Partial",    chip: "chip-amber" },
    paid:       { label: "Paid",       chip: "chip-green" },
    delayed:    { label: "Delayed",    chip: "chip-red"   },
    cash:       { label: "Cash Paid",  chip: "chip-blue"  }
  };

  let currentFilter = "";
  let isEditMode = false;
  let editingTenantId = null;

  // All nationalities list
  const NATIONALITIES = [
    "Afghan", "Albanian", "Algerian", "Andorran", "Angolan", "Argentinian", "Armenian", "Australian", 
    "Austrian", "Azerbaijani", "Bahamian", "Bahraini", "Bangladeshi", "Barbadian", "Belarusian", "Belgian", 
    "Belizean", "Beninese", "Bhutanese", "Bolivian", "Bosnian", "Botswanan", "Brazilian", "British", 
    "Bruneian", "Bulgarian", "Burkinabe", "Burmese", "Burundian", "Cambodian", "Cameroonian", "Canadian", 
    "Chadian", "Chilean", "Chinese", "Colombian", "Comoran", "Congolese", "Costa Rican", "Croatian", 
    "Cuban", "Cypriot", "Czech", "Danish", "Djiboutian", "Dominican", "Dutch", "Ecuadorian", "Egyptian", 
    "Emirati", "English", "Eritrean", "Estonian", "Ethiopian", "Fijian", "Filipino", "Finnish", "French", 
    "Gabonese", "Gambian", "Georgian", "German", "Ghanaian", "Greek", "Grenadian", "Guatemalan", 
    "Guinean", "Guyanese", "Haitian", "Honduran", "Hungarian", "Icelandic", "Indian", "Indonesian", 
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

  // All country codes with country names
  const COUNTRY_CODES_WITH_NAMES = {
    "+93": "Afghanistan", "+355": "Albania", "+213": "Algeria", "+376": "Andorra", "+244": "Angola",
    "+54": "Argentina", "+374": "Armenia", "+61": "Australia", "+43": "Austria", "+994": "Azerbaijan",
    "+880": "Bangladesh", "+375": "Belarus", "+32": "Belgium", "+501": "Belize", "+229": "Benin",
    "+975": "Bhutan", "+591": "Bolivia", "+387": "Bosnia", "+267": "Botswana", "+55": "Brazil",
    "+673": "Brunei", "+359": "Bulgaria", "+226": "Burkina Faso", "+257": "Burundi", "+238": "Cabo Verde",
    "+855": "Cambodia", "+237": "Cameroon", "+1": "Canada/US", "+236": "CAR", "+235": "Chad",
    "+56": "Chile", "+86": "China", "+57": "Colombia", "+269": "Comoros", "+242": "Congo",
    "+506": "Costa Rica", "+385": "Croatia", "+53": "Cuba", "+357": "Cyprus", "+420": "Czech Republic",
    "+45": "Denmark", "+253": "Djibouti", "+1-767": "Dominica", "+1-809": "Dominican Republic",
    "+593": "Ecuador", "+20": "Egypt", "+503": "El Salvador", "+240": "Equatorial Guinea",
    "+291": "Eritrea", "+372": "Estonia", "+268": "Eswatini", "+251": "Ethiopia", "+679": "Fiji",
    "+358": "Finland", "+33": "France", "+241": "Gabon", "+220": "Gambia", "+995": "Georgia",
    "+49": "Germany", "+233": "Ghana", "+30": "Greece", "+1-473": "Grenada", "+502": "Guatemala",
    "+224": "Guinea", "+245": "Guinea-Bissau", "+592": "Guyana", "+509": "Haiti", "+504": "Honduras",
    "+36": "Hungary", "+354": "Iceland", "+91": "India", "+62": "Indonesia", "+98": "Iran",
    "+964": "Iraq", "+353": "Ireland", "+972": "Israel", "+39": "Italy", "+1-876": "Jamaica",
    "+81": "Japan", "+962": "Jordan", "+7": "Kazakhstan", "+254": "Kenya", "+686": "Kiribati",
    "+850": "North Korea", "+82": "South Korea", "+965": "Kuwait", "+996": "Kyrgyzstan",
    "+856": "Laos", "+371": "Latvia", "+961": "Lebanon", "+266": "Lesotho", "+231": "Liberia",
    "+218": "Libya", "+423": "Liechtenstein", "+370": "Lithuania", "+352": "Luxembourg",
    "+261": "Madagascar", "+265": "Malawi", "+60": "Malaysia", "+960": "Maldives", "+223": "Mali",
    "+356": "Malta", "+692": "Marshall Islands", "+222": "Mauritania", "+230": "Mauritius",
    "+52": "Mexico", "+691": "Micronesia", "+373": "Moldova", "+377": "Monaco", "+976": "Mongolia",
    "+382": "Montenegro", "+212": "Morocco", "+258": "Mozambique", "+95": "Myanmar", "+264": "Namibia",
    "+674": "Nauru", "+977": "Nepal", "+31": "Netherlands", "+64": "New Zealand", "+505": "Nicaragua",
    "+227": "Niger", "+234": "Nigeria", "+389": "North Macedonia", "+47": "Norway", "+968": "Oman",
    "+92": "Pakistan", "+680": "Palau", "+970": "Palestine", "+507": "Panama", "+675": "Papua New Guinea",
    "+595": "Paraguay", "+51": "Peru", "+63": "Philippines", "+48": "Poland", "+351": "Portugal",
    "+974": "Qatar", "+40": "Romania", "+7": "Russia", "+250": "Rwanda", "+1-869": "Saint Kitts",
    "+1-758": "Saint Lucia", "+1-784": "Saint Vincent", "+685": "Samoa", "+378": "San Marino",
    "+239": "Sao Tome", "+966": "Saudi Arabia", "+221": "Senegal", "+381": "Serbia", "+248": "Seychelles",
    "+232": "Sierra Leone", "+65": "Singapore", "+421": "Slovakia", "+386": "Slovenia", "+677": "Solomon Islands",
    "+252": "Somalia", "+27": "South Africa", "+211": "South Sudan", "+34": "Spain", "+94": "Sri Lanka",
    "+249": "Sudan", "+597": "Suriname", "+46": "Sweden", "+41": "Switzerland", "+963": "Syria",
    "+886": "Taiwan", "+992": "Tajikistan", "+255": "Tanzania", "+66": "Thailand", "+670": "Timor-Leste",
    "+228": "Togo", "+676": "Tonga", "+1-868": "Trinidad", "+216": "Tunisia", "+90": "Turkey",
    "+993": "Turkmenistan", "+688": "Tuvalu", "+256": "Uganda", "+380": "Ukraine", "+971": "UAE",
    "+44": "UK", "+1": "USA", "+598": "Uruguay", "+998": "Uzbekistan", "+678": "Vanuatu",
    "+379": "Vatican", "+58": "Venezuela", "+84": "Vietnam", "+967": "Yemen", "+260": "Zambia",
    "+263": "Zimbabwe"
  };

  function getPgName(pgId){
    const pg = LK.pgs.find(p => p.id === pgId);
    return pg ? pg.name : "—";
  }

  // Get available rooms for a PG
  function getAvailableRooms(pgId, excludeRoom = null){
    const pg = LK.pgs.find(p => p.id === pgId);
    if(!pg) return [];
    return pg.rooms.filter(r => {
      const isAvailable = r.occupants.length < r.capacity;
      const isExcluded = excludeRoom && r.roomNo === excludeRoom;
      return isAvailable || isExcluded;
    }).map(r => r.roomNo);
  }

  // Get room capacity
  function getRoomCapacity(pgId, roomNo){
    const pg = LK.pgs.find(p => p.id === pgId);
    if(!pg) return 0;
    const room = pg.rooms.find(r => r.roomNo === roomNo);
    return room ? room.capacity : 0;
  }

  // ============================================
  // SEARCHABLE DROPDOWN FUNCTIONS
  // ============================================
  
  function initSearchableDropdown(inputId, optionsId, hiddenId, items, displayKey) {
    const searchInput = document.getElementById(inputId);
    const optionsContainer = document.getElementById(optionsId);
    const hiddenInput = document.getElementById(hiddenId);
    
    if (!searchInput || !optionsContainer || !hiddenInput) {
      console.error('Dropdown elements not found:', {inputId, optionsId, hiddenId});
      return null;
    }
    
    let allItems = items;
    
    function renderOptions(filterText) {
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
        return;
      }
      
      optionsContainer.innerHTML = filteredItems.map(item => {
        const displayText = typeof item === 'string' ? item : item[displayKey];
        const isSelected = hiddenInput.value === (typeof item === 'string' ? item : item[displayKey]);
        return `<div class="option-item ${isSelected ? 'selected' : ''}" data-value="${displayText}">${displayText}</div>`;
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
    }
    
    searchInput.addEventListener('focus', function(e) {
      e.stopPropagation();
      document.querySelectorAll('.dropdown-options').forEach(d => d.classList.remove('show'));
      optionsContainer.classList.add('show');
      renderOptions(this.value);
    });
    
    searchInput.addEventListener('input', function(e) {
      e.stopPropagation();
      renderOptions(this.value);
      optionsContainer.classList.add('show');
    });
    
    searchInput.addEventListener('click', function(e) {
      e.stopPropagation();
      optionsContainer.classList.add('show');
      renderOptions(this.value);
    });
    
    document.addEventListener('click', function(e) {
      const dropdown = searchInput.closest('.searchable-dropdown');
      if (dropdown && !dropdown.contains(e.target)) {
        optionsContainer.classList.remove('show');
      }
    });
    
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        optionsContainer.classList.remove('show');
        this.blur();
        return;
      }
      
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
      }
    });
    
    if (hiddenInput.value) {
      searchInput.value = hiddenInput.value;
    }
    
    renderOptions('');
    
    return {
      setValue: function(value) {
        hiddenInput.value = value;
        searchInput.value = value;
        renderOptions(value);
      },
      getValue: function() {
        return hiddenInput.value;
      },
      refresh: function() {
        renderOptions(searchInput.value);
      },
      setDisabled: function(disabled) {
        searchInput.disabled = disabled;
        if (disabled) {
          searchInput.classList.add('disabled');
        } else {
          searchInput.classList.remove('disabled');
        }
      }
    };
  }

  let nationalityDropdownInstance = null;
  let codeDropdownInstance = null;
  let guestNationalityDropdownInstance = null;
  let guestCodeDropdownInstance = null;

  function initDropdowns() {
    nationalityDropdownInstance = initSearchableDropdown(
      'nationalitySearch', 
      'nationalityOptions', 
      'tNationality', 
      NATIONALITIES,
      null
    );
    
    const codeItems = Object.entries(COUNTRY_CODES_WITH_NAMES).map(([code, name]) => ({
      code: code,
      name: name,
      display: `${code} (${name})`
    }));
    codeDropdownInstance = initSearchableDropdown(
      'codeSearch', 
      'codeOptions', 
      'tCode', 
      codeItems,
      'display'
    );

    // Guest dropdowns
    guestNationalityDropdownInstance = initSearchableDropdown(
      'guestNationalitySearch', 
      'guestNationalityOptions', 
      'tGuestNationality', 
      NATIONALITIES,
      null
    );

    guestCodeDropdownInstance = initSearchableDropdown(
      'guestCodeSearch', 
      'guestCodeOptions', 
      'tGuestCode', 
      codeItems,
      'display'
    );
  }

  // ============================================
  // TENANT FIELDS GENERATION
  // ============================================

  function generateTenantFields(numTenants, existingData = null) {
    const container = document.getElementById('tenantEntriesContainer');
    container.innerHTML = '';
    
    const pgId = document.getElementById('tPg').value;
    const roomNo = document.getElementById('tRoom').value;
    const isNational = document.getElementById('tResidency')?.value === 'National' || false;
    
    for (let i = 0; i < numTenants; i++) {
      const entryDiv = document.createElement('div');
      entryDiv.className = 'tenant-entry';
      entryDiv.dataset.index = i;
      
      const existing = existingData && existingData[i] ? existingData[i] : null;
      
      entryDiv.innerHTML = `
        <div class="tenant-entry-number">Tenant #${i + 1}</div>
        <div class="row g-3">
          <input type="hidden" class="tenant-id" value="${existing ? existing.id || '' : ''}">
          <div class="col-md-6">
            <label class="form-label">Full name</label>
            <input type="text" class="form-control tenant-name" required value="${existing ? existing.name || '' : ''}">
          </div>
          <div class="col-md-6">
            <label class="form-label">Email address</label>
            <input type="email" class="form-control tenant-email" required value="${existing ? existing.email || '' : ''}">
          </div>
          <div class="col-md-6">
            <label class="form-label">Residency</label>
            <select class="form-select tenant-residency" required>
              <option value="National" ${existing && existing.residency === 'National' ? 'selected' : ''}>National</option>
              <option value="International" ${existing && existing.residency === 'International' ? 'selected' : ''}>International</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Nationality</label>
            <div class="searchable-dropdown tenant-nationality-dropdown">
              <input type="text" class="dropdown-search tenant-nationality-search" placeholder="Search or select nationality..." autocomplete="off" value="${existing ? existing.nationality || 'Indian' : 'Indian'}">
              <input type="hidden" class="tenant-nationality" value="${existing ? existing.nationality || 'Indian' : 'Indian'}">
              <div class="dropdown-options tenant-nationality-options"></div>
            </div>
          </div>
          <!-- International fields -->
          <div class="col-md-6 tenant-international-only ${existing && existing.residency === 'International' ? '' : 'd-none'}">
            <label class="form-label">C-Form Number (Optional)</label>
            <input type="text" class="form-control tenant-cform" placeholder="C-Form number" value="${existing ? existing.cForm || '' : ''}">
          </div>
          <!-- National fields -->
          <div class="col-md-6 tenant-national-only ${existing && existing.residency === 'National' ? '' : 'd-none'}">
            <label class="form-label">Aadhar Card ID</label>
            <input type="text" class="form-control tenant-aadhar" placeholder="Aadhar number" value="${existing ? existing.aadhar || '' : ''}">
          </div>
          <div class="col-md-6 tenant-national-only ${existing && existing.residency === 'National' ? '' : 'd-none'}">
            <label class="form-label">Parent Aadhar</label>
            <input type="text" class="form-control tenant-parent-aadhar" placeholder="Parent Aadhar number" value="${existing ? existing.parentAadhar || '' : ''}">
          </div>
          <div class="col-md-3">
            <label class="form-label">Country code</label>
            <div class="searchable-dropdown tenant-code-dropdown">
              <input type="text" class="dropdown-search tenant-code-search" placeholder="Search or select code..." autocomplete="off" value="${existing ? existing.countryCode || '+91' : '+91'}">
              <input type="hidden" class="tenant-code" value="${existing ? existing.countryCode || '+91' : '+91'}">
              <div class="dropdown-options tenant-code-options"></div>
            </div>
          </div>
          <div class="col-md-3">
            <label class="form-label">Phone</label>
            <input type="text" class="form-control tenant-phone" placeholder="9876543210" required value="${existing ? existing.phone || '' : ''}">
          </div>
          <div class="col-md-4">
            <label class="form-label">Gender</label>
            <select class="form-select tenant-gender">
              <option value="Male" ${existing && existing.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${existing && existing.gender === 'Female' ? 'selected' : ''}>Female</option>
              <option value="Other" ${existing && existing.gender === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label">Rent (INR)</label>
            <input type="number" class="form-control tenant-rent" placeholder="e.g. 11000" required value="${existing ? existing.rent || '' : ''}">
          </div>
          <div class="col-md-4">
            <label class="form-label">Security Fee (INR)</label>
            <input type="number" class="form-control tenant-security-fee" placeholder="e.g. 5000" required value="${existing ? existing.securityFee || '' : ''}">
          </div>
          <div class="col-md-6">
            <label class="form-label">Payment date (day of month)</label>
            <input type="number" min="1" max="28" class="form-control tenant-payment-date" placeholder="e.g. 5" value="${existing ? existing.paymentDate || '' : ''}">
            <div class="form-text">Fines of ₹100/day apply after 7 days past this date each month.</div>
          </div>
          <div class="col-md-3">
            <label class="form-label">Paid from</label>
            <input type="date" class="form-control tenant-paid-from" value="${existing && existing.paidPeriods ? existing.paidPeriods[0]?.from || '' : ''}">
          </div>
          <div class="col-md-3">
            <label class="form-label">Paid till</label>
            <input type="date" class="form-control tenant-paid-till" value="${existing && existing.paidPeriods ? existing.paidPeriods[0]?.to || '' : ''}">
          </div>
          <div class="col-md-12">
            <label class="form-label">Date of Arrival in PG</label>
            <input type="date" class="form-control tenant-arrival-date" required value="${existing ? existing.arrivalDate || '' : ''}">
            <div class="form-text">The date when the tenant moved into the PG.</div>
          </div>
          ${numTenants > 1 ? `<div class="col-12 text-end"><button type="button" class="btn-remove-tenant" onclick="removeTenantEntry(this)">Remove this tenant</button></div>` : ''}
        </div>
      `;
      
      container.appendChild(entryDiv);
    }
    
    // Initialize dropdowns for each tenant entry
    initTenantDropdowns();
    
    // Add event listeners for residency changes
    container.querySelectorAll('.tenant-residency').forEach(select => {
      select.addEventListener('change', function() {
        const entry = this.closest('.tenant-entry');
        toggleTenantResidencyFields(entry);
      });
    });
  }

  function toggleTenantResidencyFields(entry) {
    const residency = entry.querySelector('.tenant-residency').value;
    const isNational = residency === 'National';
    
    entry.querySelectorAll('.tenant-national-only').forEach(el => {
      el.classList.toggle('d-none', !isNational);
    });
    entry.querySelectorAll('.tenant-international-only').forEach(el => {
      el.classList.toggle('d-none', isNational);
    });
  }

  function initTenantDropdowns() {
    document.querySelectorAll('.tenant-entry').forEach(entry => {
      const searchInput = entry.querySelector('.tenant-nationality-search');
      const optionsContainer = entry.querySelector('.tenant-nationality-options');
      const hiddenInput = entry.querySelector('.tenant-nationality');
      
      if (searchInput && optionsContainer && hiddenInput) {
        // Simple dropdown for each tenant
        const items = NATIONALITIES;
        
        function renderOptions(filterText) {
          const term = filterText ? filterText.toLowerCase().trim() : '';
          let filteredItems = items;
          if (term) {
            filteredItems = items.filter(item => item.toLowerCase().includes(term));
          }
          
          if (filteredItems.length === 0) {
            optionsContainer.innerHTML = `<div class="no-results">No results found</div>`;
            return;
          }
          
          optionsContainer.innerHTML = filteredItems.map(item => {
            const isSelected = hiddenInput.value === item;
            return `<div class="option-item ${isSelected ? 'selected' : ''}" data-value="${item}">${item}</div>`;
          }).join('');
          
          optionsContainer.querySelectorAll('.option-item').forEach(el => {
            el.addEventListener('click', function(e) {
              e.stopPropagation();
              const value = this.dataset.value;
              hiddenInput.value = value;
              searchInput.value = value;
              optionsContainer.classList.remove('show');
            });
          });
        }
        
        searchInput.addEventListener('focus', function(e) {
          e.stopPropagation();
          document.querySelectorAll('.dropdown-options').forEach(d => d.classList.remove('show'));
          optionsContainer.classList.add('show');
          renderOptions(this.value);
        });
        
        searchInput.addEventListener('input', function(e) {
          e.stopPropagation();
          renderOptions(this.value);
          optionsContainer.classList.add('show');
        });
        
        searchInput.addEventListener('click', function(e) {
          e.stopPropagation();
          optionsContainer.classList.add('show');
          renderOptions(this.value);
        });
        
        document.addEventListener('click', function(e) {
          const dropdown = searchInput.closest('.searchable-dropdown');
          if (dropdown && !dropdown.contains(e.target)) {
            optionsContainer.classList.remove('show');
          }
        });
        
        renderOptions('');
      }
      
      // Code dropdown
      const codeSearch = entry.querySelector('.tenant-code-search');
      const codeOptions = entry.querySelector('.tenant-code-options');
      const codeHidden = entry.querySelector('.tenant-code');
      
      if (codeSearch && codeOptions && codeHidden) {
        const codeItems = Object.entries(COUNTRY_CODES_WITH_NAMES).map(([code, name]) => ({
          code: code,
          name: name,
          display: `${code} (${name})`
        }));
        
        function renderCodeOptions(filterText) {
          const term = filterText ? filterText.toLowerCase().trim() : '';
          let filteredItems = codeItems;
          if (term) {
            filteredItems = codeItems.filter(item => 
              item.display.toLowerCase().includes(term) || 
              item.code.includes(term)
            );
          }
          
          if (filteredItems.length === 0) {
            codeOptions.innerHTML = `<div class="no-results">No results found</div>`;
            return;
          }
          
          codeOptions.innerHTML = filteredItems.map(item => {
            const isSelected = codeHidden.value === item.code;
            return `<div class="option-item ${isSelected ? 'selected' : ''}" data-value="${item.code}">${item.display}</div>`;
          }).join('');
          
          codeOptions.querySelectorAll('.option-item').forEach(el => {
            el.addEventListener('click', function(e) {
              e.stopPropagation();
              const value = this.dataset.value;
              codeHidden.value = value;
              codeSearch.value = value;
              codeOptions.classList.remove('show');
            });
          });
        }
        
        codeSearch.addEventListener('focus', function(e) {
          e.stopPropagation();
          document.querySelectorAll('.dropdown-options').forEach(d => d.classList.remove('show'));
          codeOptions.classList.add('show');
          renderCodeOptions(this.value);
        });
        
        codeSearch.addEventListener('input', function(e) {
          e.stopPropagation();
          renderCodeOptions(this.value);
          codeOptions.classList.add('show');
        });
        
        codeSearch.addEventListener('click', function(e) {
          e.stopPropagation();
          codeOptions.classList.add('show');
          renderCodeOptions(this.value);
        });
        
        renderCodeOptions('');
      }
    });
  }

  window.removeTenantEntry = function(btn) {
    const entry = btn.closest('.tenant-entry');
    if (entry) {
      entry.remove();
      // Renumber remaining entries
      document.querySelectorAll('.tenant-entry').forEach((el, idx) => {
        el.querySelector('.tenant-entry-number').textContent = `Tenant #${idx + 1}`;
      });
    }
  };

  // ============================================
  // END TENANT FIELDS GENERATION
  // ============================================

  function renderStats(){
    const tenants = LK.tenants.filter(t => t.role === "Tenant");
    const stats = [
      { label: "Total Tenants", value: tenants.length, icon: "bi-people-fill", color: "var(--lk-green)", filter: "all" },
      { label: "National", value: tenants.filter(x => x.residency === "National").length, icon: "bi-flag-fill", color: "var(--info)", filter: "national" },
      { label: "International", value: tenants.filter(x => x.residency === "International").length, icon: "bi-globe2", color: "var(--warning)", filter: "international" },
      { label: "Male", value: tenants.filter(x => x.gender === "Male").length, icon: "bi-gender-male", color: "var(--lk-black)", filter: "male" },
      { label: "Female", value: tenants.filter(x => x.gender === "Female").length, icon: "bi-gender-female", color: "var(--danger)", filter: "female" }
    ];
    document.getElementById("tenantStats").innerHTML = stats.map(s => `
      <div class="col-6 col-md-4 col-lg">
        <div class="stat-card hover-lift" onclick="filterByStat('${s.filter}')">
          <div class="stat-icon" style="background:${s.color}22;color:${s.color};"><i class="bi ${s.icon}"></i></div>
          <div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
        </div>
      </div>`).join("");
  }

  window.filterByStat = function(filter){
    const searchInput = document.getElementById("tenantSearch");
    if(filter === "all"){
      searchInput.value = "";
      currentFilter = "";
    } else {
      const filterMap = {
        "national": "Indian",
        "international": "International",
        "male": "Male",
        "female": "Female"
      };
      searchInput.value = filterMap[filter] || "";
      currentFilter = filterMap[filter] || "";
    }
    renderTable(searchInput.value);
  };

  function renderTable(filter = ""){
    const f = (filter || currentFilter || "").trim().toLowerCase();
    let rows = LK.tenants.filter(t => t.role === "Tenant");
    
    if(f){
      rows = rows.filter(t =>
        t.name.toLowerCase().includes(f) || 
        t.roomNo.toLowerCase().includes(f) ||
        t.nationality.toLowerCase().includes(f) || 
        String(t.rent).includes(f) ||
        t.gender.toLowerCase().includes(f) ||
        t.residency.toLowerCase().includes(f)
      );
    }
    
    document.getElementById("tenantsTbody").innerHTML = rows.map(t => {
      const st = statusMeta[t.billStatus] || statusMeta.paid;
      const arrivalDate = t.arrivalDate ? new Date(t.arrivalDate).toLocaleDateString('en-IN') : "—";
      return `
      <tr>
        <td><span class="name-link" onclick="openDocs('${t.id}')">${t.name}</span><div class="small text-muted-soft">${t.email}</div></td>
        <td>${getPgName(t.pgId)}</td>
        <td>${t.roomNo || "—"}</td>
        <td>${fmtINR(t.rent || 0)}</td>
        <td>${fmtINR(t.securityFee || 0)}</td>
        <td>${t.nationality}</td>
        <td>${t.gender}</td>
        <td>${t.paymentDate ? "Day " + t.paymentDate : "—"}</td>
        <td>${arrivalDate}</td>
        <td><span class="chip ${st.chip}">${st.label}</span></td>
        <td class="text-end">
          <button class="btn-icon me-1" title="Edit" onclick="editTenant('${t.id}')"><i class="bi bi-pencil"></i></button>
          <button class="btn-icon" title="Delete" onclick="deleteTenant('${t.id}')"><i class="bi bi-trash3"></i></button>
        </td>
      </tr>`;
    }).join("");
    document.getElementById("tenantsEmpty").classList.toggle("d-none", rows.length > 0);
  }

  document.getElementById("tenantSearch").addEventListener("input", (e) => {
    currentFilter = "";
    renderTable(e.target.value);
  });

  function populatePgDropdown(){
    const select = document.getElementById("tPg");
    select.innerHTML = `<option value="">Choose PG...</option>` + 
      LK.pgs.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
  }

  function populateRoomDropdown(pgId, excludeRoom = null){
    const select = document.getElementById("tRoom");
    const available = getAvailableRooms(pgId, excludeRoom);
    select.innerHTML = `<option value="">Select room...</option>` + 
      available.map(r => `<option value="${r}">${r}</option>`).join("");
  }

  const tenantModalEl = document.getElementById("addTenantModal");
  const tenantModal = new bootstrap.Modal(tenantModalEl);
  const roleSelect = document.getElementById("tRole");

  function toggleRoleFields(){
    const isGuest = roleSelect.value === "Guest";
    document.getElementById("guestFields").classList.toggle("d-none", !isGuest);
    document.getElementById("tenantFields").classList.toggle("d-none", isGuest);
    
    // Clear tenant entries when switching to guest
    if (isGuest) {
      document.getElementById('tenantEntriesContainer').innerHTML = '';
    }
  }

  roleSelect.addEventListener("change", function(){
    toggleRoleFields();
  });

  document.getElementById("tPg").addEventListener("change", function(){
    const pgId = this.value;
    if(pgId){
      populateRoomDropdown(pgId);
    } else {
      document.getElementById("tRoom").innerHTML = `<option value="">Select room...</option>`;
    }
  });

  // Generate tenant fields based on number of tenants
  document.getElementById("generateTenantFields").addEventListener("click", function() {
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
    
    // Check room capacity
    const capacity = getRoomCapacity(pgId, roomNo);
    if (numTenants > capacity) {
      showToast(`Room capacity is ${capacity}. You can add up to ${capacity} tenants.`, "warning");
      return;
    }
    
    generateTenantFields(numTenants);
  });

  // Reset form when modal is opened for ADD
  tenantModalEl.addEventListener('show.bs.modal', function (event) {
    const button = event.relatedTarget;
    // Only reset if it's the Add button (not Edit)
    if (button && button.getAttribute('data-bs-target') === '#addTenantModal' && !isEditMode) {
      document.getElementById("tenantModalTitle").textContent = "Add New Tenant";
      document.getElementById("tenantForm").reset();
      document.getElementById("tenantId").value = "";
      document.getElementById("editMode").value = "false";
      populatePgDropdown();
      document.getElementById("tRoom").innerHTML = `<option value="">Select room...</option>`;
      document.getElementById("tRole").value = "Tenant";
      document.getElementById('tenantEntriesContainer').innerHTML = '';
      
      // Reset number of tenants
      document.getElementById("numTenants").value = 1;
      
      setTimeout(() => {
        initDropdowns();
        toggleRoleFields();
      }, 100);
    }
  });

  document.getElementById("tenantForm").addEventListener("submit", function(e){
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    LOADER.show(btn, 'Saving...');
    
    const role = roleSelect.value;
    const isGuest = role === "Guest";
    
    if (isGuest) {
      // Handle Guest
      const payload = {
        id: "G" + String(LK.tenants.filter(t => t.role === "Guest").length + 1).padStart(3, '0'),
        name: document.getElementById("tGuestName").value.trim(),
        email: document.getElementById("tGuestEmail").value.trim(),
        role: "Guest",
        residency: "International",
        nationality: document.getElementById("tGuestNationality").value,
        countryCode: document.getElementById("tGuestCode").value,
        phone: document.getElementById("tGuestPhone").value.trim(),
        joinedOn: new Date().toISOString().split('T')[0]
      };
      
      if (!payload.name || !payload.email) {
        showToast("Please fill in all guest details.", "warning");
        LOADER.hide(btn);
        return;
      }
      
      LK.tenants.push(payload);
      showToast(`${payload.name} was added as a guest.`, "success");
      LOADER.hide(btn);
      tenantModal.hide();
      renderStats(); 
      renderTable(document.getElementById("tenantSearch").value);
      return;
    }
    
    // Handle Tenants
    const pgId = document.getElementById("tPg").value;
    const roomNo = document.getElementById("tRoom").value;
    const tenantEntries = document.querySelectorAll('.tenant-entry');
    
    if (!pgId) {
      showToast("Please select a PG.", "warning");
      LOADER.hide(btn);
      return;
    }
    if (!roomNo) {
      showToast("Please select a room.", "warning");
      LOADER.hide(btn);
      return;
    }
    if (tenantEntries.length === 0) {
      showToast("Please generate tenant fields first.", "warning");
      LOADER.hide(btn);
      return;
    }
    
    const tenantsData = [];
    let valid = true;
    
    tenantEntries.forEach((entry, index) => {
      const name = entry.querySelector('.tenant-name').value.trim();
      const email = entry.querySelector('.tenant-email').value.trim();
      const residency = entry.querySelector('.tenant-residency').value;
      const nationality = entry.querySelector('.tenant-nationality').value;
      const countryCode = entry.querySelector('.tenant-code').value;
      const phone = entry.querySelector('.tenant-phone').value.trim();
      const gender = entry.querySelector('.tenant-gender').value;
      const rent = Number(entry.querySelector('.tenant-rent').value || 0);
      const securityFee = Number(entry.querySelector('.tenant-security-fee').value || 0);
      const paymentDate = Number(entry.querySelector('.tenant-payment-date').value || 1);
      const arrivalDate = entry.querySelector('.tenant-arrival-date').value;
      const aadhar = entry.querySelector('.tenant-aadhar')?.value || '';
      const parentAadhar = entry.querySelector('.tenant-parent-aadhar')?.value || '';
      const cForm = entry.querySelector('.tenant-cform')?.value || '';
      const paidFrom = entry.querySelector('.tenant-paid-from').value;
      const paidTill = entry.querySelector('.tenant-paid-till').value;
      
      if (!name || !email || !arrivalDate) {
        valid = false;
        showToast(`Please fill all required fields for Tenant #${index + 1}.`, "warning");
        return;
      }
      if (rent <= 0) {
        valid = false;
        showToast(`Please enter a valid rent amount for Tenant #${index + 1}.`, "warning");
        return;
      }
      if (securityFee <= 0) {
        valid = false;
        showToast(`Please enter a valid security fee for Tenant #${index + 1}.`, "warning");
        return;
      }
      
      const docs = {};
      if (residency === "National") {
        Object.assign(docs, {
          photo: false, aadhar: false, parentAadhar: false,
          universityId: false, passport: false, visa: false,
          frro: false, cForm: false, arrivalStamp: false
        });
      } else {
        Object.assign(docs, {
          photo: false, passport: false, visa: false,
          arrivalStamp: false, cForm: false, universityId: false,
          aadhar: false, parentAadhar: false, frro: false
        });
      }
      
      const existingId = entry.querySelector('.tenant-id').value;
      
      tenantsData.push({
        id: existingId || "T" + String(LK.tenants.length + 1).padStart(3, '0'),
        name: name,
        email: email,
        role: "Tenant",
        residency: residency,
        nationality: nationality,
        countryCode: countryCode,
        phone: phone,
        gender: gender,
        pgId: pgId,
        roomNo: roomNo,
        rent: rent,
        securityFee: securityFee,
        paymentDate: paymentDate,
        paidPeriods: [{ from: paidFrom, to: paidTill }],
        billStatus: "unpaid",
        dueMonths: [new Date().toLocaleString('default', { month: 'long' })],
        dueAmount: rent,
        delayedDays: 0,
        fine: 0,
        paidAmount: 0,
        paidDate: null,
        nextPaymentDate: null,
        docs: docs,
        aadhar: aadhar,
        parentAadhar: parentAadhar,
        cForm: cForm,
        arrivalDate: arrivalDate
      });
    });
    
    if (!valid) {
      LOADER.hide(btn);
      return;
    }
    
    // Check if we're in edit mode
    const editMode = document.getElementById('editMode').value === 'true';
    
    setTimeout(() => {
      if (editMode) {
        // Remove old tenant(s) with same room
        const oldTenants = LK.tenants.filter(t => t.pgId === pgId && t.roomNo === roomNo && t.role === "Tenant");
        oldTenants.forEach(t => {
          const idx = LK.tenants.indexOf(t);
          if (idx > -1) LK.tenants.splice(idx, 1);
        });
        
        // Add new tenants
        tenantsData.forEach(t => {
          // Check if tenant already exists (by ID)
          const existingIdx = LK.tenants.findIndex(ten => ten.id === t.id);
          if (existingIdx > -1) {
            LK.tenants[existingIdx] = { ...LK.tenants[existingIdx], ...t };
          } else {
            LK.tenants.push(t);
          }
        });
        
        showToast(`Updated ${tenantsData.length} tenant(s) in room ${roomNo}.`, "success");
      } else {
        // Add new tenants
        tenantsData.forEach(t => {
          LK.tenants.push(t);
        });
        showToast(`Added ${tenantsData.length} tenant(s) in room ${roomNo}.`, "success");
      }
      
      // Update room occupants
      const pg = LK.pgs.find(p => p.id === pgId);
      if (pg) {
        const room = pg.rooms.find(r => r.roomNo === roomNo);
        if (room) {
          room.occupants = tenantsData.map(t => t.name);
        }
      }
      
      isEditMode = false;
      document.getElementById('editMode').value = 'false';
      LOADER.hide(btn);
      tenantModal.hide();
      renderStats(); 
      renderTable(document.getElementById("tenantSearch").value);
    }, 600);
  });

  window.editTenant = function(id){
    const t = LK.tenants.find(x => x.id === id);
    if(!t) return;
    
    isEditMode = true;
    document.getElementById('editMode').value = 'true';
    editingTenantId = id;
    
    document.getElementById("tenantModalTitle").textContent = "Edit Tenant";
    document.getElementById("tenantId").value = t.id;
    
    // Set role
    roleSelect.value = t.role || "Tenant";
    toggleRoleFields();
    
    // For guest, populate guest fields
    if (t.role === "Guest") {
      document.getElementById("tGuestName").value = t.name || "";
      document.getElementById("tGuestEmail").value = t.email || "";
      document.getElementById("tGuestPhone").value = t.phone || "";
      
      setTimeout(() => {
        if (guestNationalityDropdownInstance) {
          guestNationalityDropdownInstance.setValue(t.nationality || "Indian");
        }
        if (guestCodeDropdownInstance) {
          guestCodeDropdownInstance.setValue(t.countryCode || "+91");
        }
      }, 100);
      
      tenantModal.show();
      return;
    }
    
    // For tenants
    // Find all tenants in the same room
    const roomTenants = LK.tenants.filter(x => x.pgId === t.pgId && x.roomNo === t.roomNo && x.role === "Tenant");
    
    // Set PG and Room
    populatePgDropdown();
    if(t.pgId){
      document.getElementById("tPg").value = t.pgId;
      populateRoomDropdown(t.pgId, t.roomNo);
      document.getElementById("tRoom").value = t.roomNo || "";
    }
    
    // Set number of tenants
    document.getElementById("numTenants").value = roomTenants.length;
    
    // Generate tenant fields with existing data
    setTimeout(() => {
      const existingData = roomTenants.map(tenant => ({
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        residency: tenant.residency,
        nationality: tenant.nationality,
        countryCode: tenant.countryCode,
        phone: tenant.phone,
        gender: tenant.gender,
        rent: tenant.rent,
        securityFee: tenant.securityFee,
        paymentDate: tenant.paymentDate,
        paidPeriods: tenant.paidPeriods,
        arrivalDate: tenant.arrivalDate,
        aadhar: tenant.aadhar,
        parentAadhar: tenant.parentAadhar,
        cForm: tenant.cForm
      }));
      
      generateTenantFields(roomTenants.length, existingData);
    }, 200);
    
    tenantModal.show();
  };

  const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
  window.deleteTenant = function(id){
    const t = LK.tenants.find(x => x.id === id);
    if(!t) return;
    document.getElementById("confirmTitle").textContent = `Delete ${t.name}?`;
    document.getElementById("confirmBody").textContent = "This will permanently remove this tenant and their documents. This action cannot be undone.";
    document.getElementById("confirmActionBtn").onclick = function(){
      const btn = this;
      LOADER.show(btn, 'Deleting...');
      setTimeout(() => {
        if(t.pgId && t.roomNo){
          const pg = LK.pgs.find(p => p.id === t.pgId);
          if(pg){
            const room = pg.rooms.find(r => r.roomNo === t.roomNo);
            if(room){
              room.occupants = room.occupants.filter(name => name !== t.name);
            }
          }
        }
        LK.tenants = LK.tenants.filter(x => x.id !== id);
        confirmModal.hide();
        showToast(`${t.name} was deleted.`, "danger");
        renderStats(); 
        renderTable(document.getElementById("tenantSearch").value);
        LOADER.hide(btn);
      }, 500);
    };
    confirmModal.show();
  };

  const DOC_TYPES_NATIONAL = [
    { key: "photo", label: "Passport Size Photo" },
    { key: "aadhar", label: "Tenant Aadhar Card" },
    { key: "parentAadhar", label: "Parent Aadhar Card" },
    { key: "universityId", label: "University ID" }
  ];

  const DOC_TYPES_INTERNATIONAL = [
    { key: "photo", label: "Passport Size Photo" },
    { key: "passport", label: "Passport" },
    { key: "visa", label: "Visa" },
    { key: "arrivalStamp", label: "Arrival Stamp" },
    { key: "cForm", label: "C-Form" },
    { key: "universityId", label: "University ID" }
  ];

  const docsModal = new bootstrap.Modal(document.getElementById("docsModal"));
  window.openDocs = function(id){
    const t = LK.tenants.find(x => x.id === id);
    if(!t) return;
    document.getElementById("docsTenantName").textContent = t.name;
    
    const docTypes = t.residency === "National" ? DOC_TYPES_NATIONAL : DOC_TYPES_INTERNATIONAL;
    
    document.getElementById("docsGrid").innerHTML = docTypes.map(d => {
      const has = t.docs?.[d.key];
      return `
      <div class="col-md-4 col-6">
        <div class="doc-thumb">
          <img src="https://placehold.co/300x160/${has ? "92C24A" : "E1E8D8"}/${has ? "0B0F0A" : "7C8A76"}?text=${encodeURIComponent(d.label)}" alt="${d.label}">
          <div class="doc-actions">
            <button class="btn-icon" style="background:#fff;" title="Download" ${has ? "" : "disabled"} onclick="showToast('${d.label} download started.','info')"><i class="bi bi-download"></i></button>
            <button class="btn-icon" style="background:#fff;color:var(--danger);" title="Delete" ${has ? "" : "disabled"} onclick="deleteDoc('${t.id}','${d.key}','${d.label}')"><i class="bi bi-trash3"></i></button>
          </div>
          <div class="doc-label">${d.label} ${has ? '<span class="chip chip-green ms-1">Uploaded</span>' : '<span class="chip chip-gray ms-1">Missing</span>'}</div>
        </div>
      </div>`;
    }).join("");
    docsModal.show();
  };

  window.deleteDoc = function(tenantId, key, label){
    document.getElementById("confirmTitle").textContent = `Delete ${label}?`;
    document.getElementById("confirmBody").textContent = "This document will be permanently removed from the tenant's profile.";
    document.getElementById("confirmActionBtn").onclick = function(){
      const btn = this;
      LOADER.show(btn, 'Deleting...');
      setTimeout(() => {
        const t = LK.tenants.find(x => x.id === tenantId);
        if(t && t.docs){
          t.docs[key] = false;
        }
        confirmModal.hide();
        showToast(`${label} deleted.`, "danger");
        window.openDocs(tenantId);
        LOADER.hide(btn);
      }, 400);
    };
    confirmModal.show();
  };

  initDropdowns();
  renderStats();
  renderTable();
});