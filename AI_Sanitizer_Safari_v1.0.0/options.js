document.addEventListener('DOMContentLoaded', loadRules);

const ruleListBody = document.getElementById('ruleList');

const DEFAULT_RULES = [
    { regex: '\\b\\d{3}-\\d{2}-\\d{4}\\b', token: '$ssn$' },        // US Social Security Number (e.g., 123-45-6789)
    { regex: '\\b4\\d{15}\\b', token: '$visa$' },                   // Visa Card
    { regex: '\\b5[1-5]\\d{14}\\b', token: '$mastercard$' },        // MasterCard
    { regex: '\\b3[47]\\d{13}\\b', token: '$amex$' },              // American Express
    { regex: '\\b6(?:011|5)\\d{12}\\b', token: '$discover$' },     // Discover Card
    { regex: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', token: '$ip$' },  // IPv4 Address
    { regex: '([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\\.[a-zA-Z]{2,})', token: '$email$' }, // Email
    { regex: 'PAT-\\d{6}', token: '$patientid$' },                  // Patient ID (e.g., PAT-123456)
    { regex: 'MRN-\\d{5,10}', token: '$mrn$' },                    // Medical Record Number (e.g., MRN-123456789)
    { regex: 'RX-\\d{7}', token: '$prescription$' },                // Prescription Number (e.g., RX-1234567)
    { regex: '[A-Z]\\d{2}(\\.\\d{1,2})?', token: '$icd10$' },      // ICD-10 Code (e.g., E11.9)
    { regex: '(?:sk|pk|api|key)_[a-zA-Z0-9]{20,40}', token: '$apikey$' }, // API Key (e.g., sk_test_4eC39HqLyjWDarjtT1zdp7dc)
    { regex: '(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}', token: '$ipv6$' }, // IPv6 Address (e.g., 2001:0db8:85a3:0000:0000:8a2e:0370:7334)
    { regex: '(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}', token: '$mac$' }, // MAC Address (e.g., 00:1A:2B:3C:4D:5E)
    { regex: 'mongodb://[a-zA-Z0-9]+:[a-zA-Z0-9]+@[a-zA-Z0-9.-]+:\\d{1,5}/[a-zA-Z0-9]+', token: '$dbconn$' }, // MongoDB Connection String
    { regex: '[A-Z]{2}\\d{2}[A-Z0-9]{11,30}', token: '$iban$' },   // IBAN (e.g., DE89370400440532013000)
    { regex: '(?:1|3|bc1)[a-zA-Z0-9]{25,34}', token: '$bitcoin$' }, // Bitcoin Wallet Address (e.g., 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa)
    { regex: 'fe80::[0-9a-fA-F]{0,4}%[a-zA-Z0-9]+', token: '$ipv6local$' } // Link-local IPv6 Address (e.g., fe80::1%eth0)
];

function loadRules() {
    // Use browser namespace with chrome fallback for cross-browser compatibility
    const browserApi = typeof browser !== 'undefined' ? browser : chrome;
    browserApi.storage.local.get('sanitize_rules', (data) => {
        let rules = data.sanitize_rules;
        if (!rules || rules.length === 0) {
            rules = DEFAULT_RULES;
            browserApi.storage.local.set({ sanitize_rules: rules }, () => {
                console.log('Initialized with default rules (Firefox):', rules);
            });
        }
        ruleListBody.innerHTML = '';
        rules.forEach((rule, index) => {
            addRuleToTable(rule.regex, rule.token, index);
        });
    });
    loadToggleState();
}

function addRule() {
    const regexInput = document.getElementById('regex');
    const tokenInput = document.getElementById('token');
    const regex = regexInput.value.trim();
    const token = tokenInput.value.trim();

    if (regex && token) {
        const browserApi = typeof browser !== 'undefined' ? browser : chrome;
        browserApi.storage.local.get('sanitize_rules', (data) => {
            const rules = data.sanitize_rules || [];
            rules.push({ regex: regex, token: token });
            browserApi.storage.local.set({ sanitize_rules: rules }, () => {
                addRuleToTable(regex, token, rules.length - 1);
                regexInput.value = '';
                tokenInput.value = '';
            });
        });
    } else {
        alert('Please enter both a regex pattern and a token.');
    }
}

function addRuleToTable(regex, token, index) {
    const row = ruleListBody.insertRow();
    const regexCell = row.insertCell();
    const tokenCell = row.insertCell();
    const actionCell = row.insertCell();

    regexCell.textContent = escapeHtml(regex);
    tokenCell.textContent = escapeHtml(token);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'delete-btn';
    deleteButton.onclick = function() {
        deleteRule(index);
    };
    actionCell.appendChild(deleteButton);
}

function deleteRule(index) {
    const browserApi = typeof browser !== 'undefined' ? browser : chrome;
    browserApi.storage.local.get('sanitize_rules', (data) => {
        let rules = data.sanitize_rules || [];
        if (index > -1 && index < rules.length) {
            const rule = rules[index];
            if (confirm(`Are you sure you want to delete the rule: ${rule.regex} -> ${rule.token}?`)) {
                rules.splice(index, 1);
                browserApi.storage.local.set({ sanitize_rules: rules }, () => {
                    loadRules();
                });
            }
        }
    });
}

function resetDefaults() {
    if (confirm('Are you sure you want to reset to default rules? This will overwrite all existing rules.')) {
        const browserApi = typeof browser !== 'undefined' ? browser : chrome;
        browserApi.storage.local.set({ sanitize_rules: DEFAULT_RULES }, () => {
            loadRules();
            alert('Rules have been reset to defaults.');
        });
    }
}

function clearAllRules() {
    if (confirm('Are you sure you want to clear all rules? This action cannot be undone.')) {
        const browserApi = typeof browser !== 'undefined' ? browser : chrome;
        browserApi.storage.local.remove('sanitize_rules', () => {
            loadRules();
            alert('All rules have been cleared.');
        });
    }
}

function loadToggleState() {
    const browserApi = typeof browser !== 'undefined' ? browser : chrome;
    browserApi.storage.local.get('sanitizationEnabled', (data) => {
        const isEnabled = data.sanitizationEnabled !== undefined ? data.sanitizationEnabled : true;
        const toggle = document.getElementById('enabled');
        const toggleSlider = document.querySelector('.toggle-slider');
        if (toggle && toggleSlider) {
            toggle.checked = isEnabled;
            toggle.dispatchEvent(new Event('change'));
            console.log('Toggle state loaded (Firefox):', isEnabled);
        } else {
            console.error('Toggle input #enabled or .toggle-slider not found in DOM (Firefox)');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('enabled');
    const toggleSlider = document.querySelector('.toggle-slider');
    const addRuleButton = document.getElementById('addRule');
    const resetDefaultsButton = document.getElementById('resetDefaults');
    const clearAllButton = document.getElementById('clearAll');

    if (toggle && toggleSlider) {
        toggle.addEventListener('change', function() {
            const isEnabled = this.checked;
            if (isEnabled) {
                toggleSlider.classList.add('active');
            } else {
                toggleSlider.classList.remove('active');
            }
            const browserApi = typeof browser !== 'undefined' ? browser : chrome;
            browserApi.storage.local.set({ sanitizationEnabled: isEnabled }, (result) => {
                if (browserApi.runtime.lastError) {
                    console.error('Storage set failed (Firefox):', browserApi.runtime.lastError);
                    alert('Failed to save toggle state. Check console for details.');
                } else {
                    console.log('Sanitization Enabled state saved (Firefox):', isEnabled);
                }
            });
        });
    } else {
        console.error('Toggle input #enabled or .toggle-slider not found when attaching event listener (Firefox)');
    }

    if (addRuleButton) addRuleButton.addEventListener('click', addRule);
    if (resetDefaultsButton) resetDefaultsButton.addEventListener('click', resetDefaults);
    if (clearAllButton) clearAllButton.addEventListener('click', clearAllRules);
});

function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")  
      .replace(/</g, "&lt;")    
      .replace(/>/g, "&gt;")   
      .replace(/"/g, "&quot;")  
      .replace(/'/g, "&#39;");  
  }

console.log("Options page script loaded (Firefox), Rule Management Enabled.");