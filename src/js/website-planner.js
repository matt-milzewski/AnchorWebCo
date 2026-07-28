(function () {
    'use strict';

    var form = document.getElementById('website-planner-form');
    var result = document.getElementById('website-plan-result');
    if (!form || !result) return;

    var builds = {
        'one-page': {
            name: 'One-Page Launch',
            price: 1970,
            priceLabel: '$1,970',
            pages: 'One conversion-focused page with service, proof, coverage and enquiry sections.'
        },
        'local-business': {
            name: 'Local Business Site',
            price: 3850,
            priceLabel: '$3,850',
            pages: 'Up to five planned pages covering the offer, services, proof, business and contact path.'
        },
        growth: {
            name: 'Growth Website',
            price: 5950,
            priceLabel: 'From $5,950',
            pages: 'Eight or more planned pages for deeper services, locations, proof and selected integrations.'
        }
    };

    var carePlans = {
        essential: {
            id: 'site-care',
            name: 'Site Care',
            monthly: 79,
            annual: 790,
            label: '$79/month or $790/year'
        },
        insights: {
            id: 'care-insights',
            name: 'Care + Insights',
            monthly: 129,
            annual: 1290,
            label: '$129/month or $1,290/year'
        },
        visibility: {
            id: 'lead-monitor',
            name: 'Lead Monitor',
            monthly: 229,
            annual: 2290,
            label: '$229/month or $2,290/year'
        }
    };

    function currency(value) {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            maximumFractionDigits: 0
        }).format(value);
    }

    function chooseBuild(values) {
        if (values.scope === 'many' || values.goal === 'growth') return 'growth';
        if (values.scope === 'one' && values.goal === 'presence') return 'one-page';
        return 'local-business';
    }

    function reasonFor(buildId, values) {
        if (buildId === 'one-page') {
            return 'A focused launch gives the business a credible presence without paying for pages the offer does not need yet.';
        }
        if (buildId === 'growth') {
            return 'The service or location depth needs a larger structure so important topics have enough room to be useful and searchable.';
        }
        if (values.start === 'new') {
            return 'A five-page foundation gives a new business enough room to explain its services, build trust and create a clear enquiry path.';
        }
        return 'A five-page rebuild is the leanest useful structure for clearer services, proof and local enquiry pathways.';
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!form.reportValidity()) return;

        var values = Object.fromEntries(new FormData(form).entries());
        var buildId = chooseBuild(values);
        var build = builds[buildId];
        var care = carePlans[values.care];
        var firstYear = build.price + care.annual;
        var fromPrefix = buildId === 'growth' ? 'From ' : '';
        var contactUrl = '/contact.html?package=' + encodeURIComponent(buildId)
            + '&care=' + encodeURIComponent(care.id)
            + '&source=website-planner';

        result.innerHTML = ''
            + '<p class="pricing-card__label">Recommended starting point</p>'
            + '<h2 class="h2" style="font-size:clamp(28px,4vw,38px);margin:12px 0 8px;">' + build.name + ' + ' + care.name + '</h2>'
            + '<p class="planner-result__why">' + reasonFor(buildId, values) + '</p>'
            + '<div class="planner-price-grid">'
            + '<div><span>One-off build</span><strong>' + build.priceLabel + '</strong></div>'
            + '<div><span>Ongoing care</span><strong>' + care.label + '</strong></div>'
            + '<div><span>First year, annual care</span><strong>' + fromPrefix + currency(firstYear) + '</strong></div>'
            + '</div>'
            + '<h3>Suggested structure</h3>'
            + '<p class="body-muted">' + build.pages + '</p>'
            + '<p class="planner-result__note">Annual care is priced as ten months. The ongoing plan starts when the website launches. Final scope and any GST that legally applies are confirmed before acceptance.</p>'
            + '<div class="flex flex-col sm:flex-row gap-4">'
            + '<a class="btn-primary" href="' + contactUrl + '" data-track="cta-quote" data-track-prop-button-location="planner-result">Send this plan with my brief</a>'
            + '<a class="btn-secondary" href="/pricing.html#price-calculator">Compare every combination</a>'
            + '</div>';

        result.classList.add('planner-result--ready');
        result.focus({ preventScroll: true });
        result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        window.dispatchEvent(new CustomEvent('anchor:planner-complete', {
            detail: {
                build: buildId,
                care_plan: care.id,
                starting_point: values.start,
                scope: values.scope,
                goal: values.goal
            }
        }));
    });
})();
