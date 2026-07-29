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
  }

  // ============================================
  // END SEARCHABLE DROPDOWN FUNCTIONS
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
  const residencySelect = document.getElementById("tResidency");

  function toggleTenantOnly(){
    const isGuest = roleSelect.value === "Guest";
    document.querySelectorAll(".tenant-only").forEach(el => el.classList.toggle("d-none", isGuest));
    if(isGuest){
      document.getElementById("tRoom").parentElement.classList.add("d-none");
      document.querySelector(".international-only").classList.add("d-none");
    } else {
      document.getElementById("tRoom").parentElement.classList.remove("d-none");
      const isNational = residencySelect.value === "National";
      document.querySelectorAll(".international-only").forEach(el => el.classList.toggle("d-none", isNational));
    }
  }
  
  function toggleFields(){
    const isNational = residencySelect.value === "National";
    const isGuest = roleSelect.value === "Guest";
    
    // Show/hide nationality-specific fields
    if(isGuest){
      document.querySelectorAll(".national-only").forEach(el => el.classList.add("d-none"));
      document.querySelectorAll(".international-only").forEach(el => el.classList.add("d-none"));
    } else {
      document.querySelectorAll(".national-only").forEach(el => el.classList.toggle("d-none", !isNational));
      document.querySelectorAll(".international-only").forEach(el => el.classList.toggle("d-none", isNational));
    }
    
    // PG selection is ALWAYS shown for tenants (both National and International)
    // Only hide for Guests
    const pgField = document.getElementById("tPg").parentElement;
    if(isGuest){
      pgField.classList.add("d-none");
    } else {
      pgField.classList.remove("d-none");
    }
    
    // Room selection is ALWAYS shown for tenants (both National and International)
    // Only hide for Guests
    const roomField = document.getElementById("tRoom").parentElement;
    if(isGuest){
      roomField.classList.add("d-none");
    } else {
      roomField.classList.remove("d-none");
    }
    
    // Set default nationality based on residency
    if (nationalityDropdownInstance) {
      if (isNational || isGuest) {
        // For National and Guest, set to Indian and disable
        nationalityDropdownInstance.setValue("Indian");
        nationalityDropdownInstance.setDisabled(true);
      } else {
        // For International, enable and set default to empty or American
        nationalityDropdownInstance.setDisabled(false);
        const currentVal = nationalityDropdownInstance.getValue();
        if (currentVal === "Indian" || !currentVal) {
          nationalityDropdownInstance.setValue("American");
        }
      }
    }
  }

  roleSelect.addEventListener("change", function(){
    toggleTenantOnly();
    toggleFields();
  });
  residencySelect.addEventListener("change", toggleFields);

  document.getElementById("tPg").addEventListener("change", function(){
    const pgId = this.value;
    if(pgId){
      populateRoomDropdown(pgId);
    } else {
      document.getElementById("tRoom").innerHTML = `<option value="">Select room...</option>`;
    }
  });

  // Reset form when modal is opened for ADD
  tenantModalEl.addEventListener('show.bs.modal', function (event) {
    const button = event.relatedTarget;
    // Only reset if it's the Add button (not Edit)
    if (button && button.getAttribute('data-bs-target') === '#addTenantModal' && !isEditMode) {
      document.getElementById("tenantModalTitle").textContent = "Add New Tenant";
      document.getElementById("tenantForm").reset();
      document.getElementById("tenantId").value = "";
      populatePgDropdown();
      document.getElementById("tRoom").innerHTML = `<option value="">Select room...</option>`;
      
      document.getElementById("tGender").value = "Male";
      document.getElementById("tResidency").value = "National";
      document.getElementById("tRole").value = "Tenant";
      
      setTimeout(() => {
        initDropdowns();
        // Set Indian as default and disable for National
        if (nationalityDropdownInstance) {
          nationalityDropdownInstance.setValue("Indian");
          nationalityDropdownInstance.setDisabled(true);
        }
        if (codeDropdownInstance) {
          codeDropdownInstance.setValue("+91");
        }
        toggleTenantOnly();
        toggleFields();
      }, 100);
    }
  });

  document.getElementById("tenantForm").addEventListener("submit", function(e){
    e.preventDefault();
    const id = document.getElementById("tenantId").value;
    const role = roleSelect.value;
    const residency = residencySelect.value;
    
    const payload = {
      name: document.getElementById("tName").value.trim(),
      email: document.getElementById("tEmail").value.trim(),
      role: role,
      residency: residency,
      nationality: document.getElementById("tNationality").value,
      countryCode: document.getElementById("tCode").value,
      phone: document.getElementById("tPhone").value.trim(),
    };

    if(role === "Tenant"){
      // For tenants, PG and room are always required (both National and International)
      const pgId = document.getElementById("tPg").value;
      const roomNo = document.getElementById("tRoom").value;
      
      if(!pgId){
        showToast("Please select a PG.", "warning");
        return;
      }
      if(!roomNo){
        showToast("Please select a room.", "warning");
        return;
      }
      
      const rent = Number(document.getElementById("tRent").value || 0);
      if(rent <= 0){
        showToast("Please enter a valid rent amount.", "warning");
        return;
      }
      
      const docs = {};
      if(residency === "National"){
        docs.photo = false;
        docs.aadhar = false;
        docs.parentAadhar = false;
        docs.universityId = false;
        docs.passport = false;
        docs.visa = false;
        docs.frro = false;
        docs.cForm = false;
        docs.arrivalStamp = false;
      } else {
        docs.photo = false;
        docs.passport = false;
        docs.visa = false;
        docs.arrivalStamp = false;
        docs.cForm = false;
        docs.universityId = false;
        docs.aadhar = false;
        docs.parentAadhar = false;
        docs.frro = false;
      }
      
      Object.assign(payload, {
        pgId: pgId,
        gender: document.getElementById("tGender").value,
        roomNo: roomNo,
        rent: rent,
        securityFee: Number(document.getElementById("tSecurityFee").value || 0),
        paymentDate: Number(document.getElementById("tPayDate").value || 1),
        paidPeriods: [{ from: document.getElementById("tPaidFrom").value, to: document.getElementById("tPaidTill").value }],
        billStatus: "unpaid",
        dueMonths: [new Date().toLocaleString('default', { month: 'long' })],
        dueAmount: rent,
        delayedDays: 0,
        fine: 0,
        paidAmount: 0,
        paidDate: null,
        nextPaymentDate: null,
        docs: docs,
        aadhar: document.getElementById("tAadhar").value || "",
        parentAadhar: document.getElementById("tParentAadhar").value || "",
        cForm: document.getElementById("tCForm").value || ""
      });
    } else {
      payload.docs = {};
      payload.joinedOn = new Date().toISOString().split('T')[0];
      payload.gender = "";
      payload.roomNo = "";
      payload.rent = 0;
      payload.securityFee = 0;
      payload.paymentDate = 0;
      payload.paidPeriods = [];
      payload.billStatus = "";
      payload.dueMonths = [];
      payload.dueAmount = 0;
      payload.delayedDays = 0;
      payload.fine = 0;
      payload.paidAmount = 0;
      payload.paidDate = null;
      payload.nextPaymentDate = null;
      payload.aadhar = "";
      payload.parentAadhar = "";
      payload.cForm = "";
      payload.pgId = "";
    }

    if(id){
      const idx = LK.tenants.findIndex(t => t.id === id);
      const existing = LK.tenants[idx];
      if(existing.docs) {
        payload.docs = { ...existing.docs, ...payload.docs };
      }
      LK.tenants[idx] = { ...existing, ...payload };
      showToast(`${payload.name}'s details were updated.`, "success");
    } else {
      payload.id = "T" + String(LK.tenants.length + 1).padStart(3, '0');
      LK.tenants.push(payload);
      if(role === "Tenant" && payload.roomNo && payload.pgId){
        const pg = LK.pgs.find(p => p.id === payload.pgId);
        if(pg){
          const room = pg.rooms.find(r => r.roomNo === payload.roomNo);
          if(room && !room.occupants.includes(payload.name)){
            room.occupants.push(payload.name);
          }
        }
      }
      showToast(`${payload.name} was added successfully.`, "success");
    }
    isEditMode = false;
    tenantModal.hide();
    renderStats(); 
    renderTable(document.getElementById("tenantSearch").value);
  });

  window.editTenant = function(id){
    const t = LK.tenants.find(x => x.id === id);
    if(!t) return;
    
    isEditMode = true;
    
    document.getElementById("tenantModalTitle").textContent = "Edit Tenant";
    document.getElementById("tenantId").value = t.id;
    
    // Set basic fields
    document.getElementById("tName").value = t.name || "";
    document.getElementById("tEmail").value = t.email || "";
    roleSelect.value = t.role || "Tenant";
    residencySelect.value = t.residency || "National";
    document.getElementById("tPhone").value = t.phone || "";
    document.getElementById("tGender").value = t.gender || "Male";
    
    // Set PG and Room (for both National and International)
    populatePgDropdown();
    if(t.pgId){
      document.getElementById("tPg").value = t.pgId;
      populateRoomDropdown(t.pgId, t.roomNo);
      document.getElementById("tRoom").value = t.roomNo || "";
    } else {
      document.getElementById("tPg").value = "";
      document.getElementById("tRoom").innerHTML = `<option value="">Select room...</option>`;
    }
    
    // Set tenant-specific fields
    document.getElementById("tRent").value = t.rent || "";
    document.getElementById("tSecurityFee").value = t.securityFee || "";
    document.getElementById("tPayDate").value = t.paymentDate || "";
    document.getElementById("tPaidFrom").value = t.paidPeriods?.[0]?.from || "";
    document.getElementById("tPaidTill").value = t.paidPeriods?.[0]?.to || "";
    document.getElementById("tAadhar").value = t.aadhar || "";
    document.getElementById("tParentAadhar").value = t.parentAadhar || "";
    document.getElementById("tCForm").value = t.cForm || "";
    
    // Initialize dropdowns and set values
    setTimeout(() => {
      initDropdowns();
      if (nationalityDropdownInstance) {
        // If National, set to Indian and disable, else set to stored nationality and enable
        if (t.residency === "National" || t.role === "Guest") {
          nationalityDropdownInstance.setValue("Indian");
          nationalityDropdownInstance.setDisabled(true);
        } else {
          nationalityDropdownInstance.setValue(t.nationality || "American");
          nationalityDropdownInstance.setDisabled(false);
        }
      }
      if (codeDropdownInstance) {
        codeDropdownInstance.setValue(t.countryCode || "+91");
      }
      toggleTenantOnly();
      toggleFields();
    }, 100);
    
    tenantModal.show();
  };

  const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
  window.deleteTenant = function(id){
    const t = LK.tenants.find(x => x.id === id);
    if(!t) return;
    document.getElementById("confirmTitle").textContent = `Delete ${t.name}?`;
    document.getElementById("confirmBody").textContent = "This will permanently remove this tenant and their documents. This action cannot be undone.";
    document.getElementById("confirmActionBtn").onclick = function(){
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
      const t = LK.tenants.find(x => x.id === tenantId);
      if(t && t.docs){
        t.docs[key] = false;
      }
      confirmModal.hide();
      showToast(`${label} deleted.`, "danger");
      window.openDocs(tenantId);
    };
    confirmModal.show();
  };

  initDropdowns();
  renderStats();
  renderTable();
});