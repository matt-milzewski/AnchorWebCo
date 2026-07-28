(function () {
    'use strict';

    var buildSelect = document.getElementById('calculator-build');
    var careSelect = document.getElementById('calculator-care');
    if (!buildSelect || !careSelect) return;

    var buildPrice = document.getElementById('calculator-build-price');
    var carePrice = document.getElementById('calculator-care-price');
    var firstYear = document.getElementById('calculator-first-year');
    var ongoing = document.getElementById('calculator-ongoing');
    var cta = document.getElementById('calculator-cta');
    var builds = {
        'one-page': { price: 1970, label: '$1,970', from: false },
        'local-business': { price: 3850, label: '$3,850', from: false },
        growth: { price: 5950, label: 'From $5,950', from: true }
    };
    var care = {
        'site-care': { monthly: 69, annual: 690 },
        'care-insights': { monthly: 129, annual: 1290 },
        'lead-monitor': { monthly: 229, annual: 2290 }
    };

    function money(value) {
        return '$' + new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 }).format(value);
    }

    function update() {
        var selectedBuild = builds[buildSelect.value];
        var selectedCare = care[careSelect.value];
        var prefix = selectedBuild.from ? 'From ' : '';
        buildPrice.textContent = selectedBuild.label;
        carePrice.textContent = money(selectedCare.annual);
        firstYear.textContent = prefix + money(selectedBuild.price + selectedCare.annual);
        ongoing.textContent = 'Then ' + money(selectedCare.monthly) + '/month or ' + money(selectedCare.annual) + '/year for ongoing hosting and care.';
        cta.href = '/contact.html?package=' + encodeURIComponent(buildSelect.value)
            + '&care=' + encodeURIComponent(careSelect.value)
            + '&source=pricing-calculator';
    }

    buildSelect.addEventListener('change', update);
    careSelect.addEventListener('change', update);
    update();
})();
