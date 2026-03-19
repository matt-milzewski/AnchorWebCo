(function() {
    const reviewsSection = document.querySelector('[data-google-reviews]');
    const reviewData = window.ANCHOR_GOOGLE_REVIEWS_DATA;

    if (!reviewsSection || !reviewData || !Array.isArray(reviewData.reviews)) {
        return;
    }

    const reviewCount = reviewsSection.querySelector('[data-google-reviews-count]');
    const highlights = reviewsSection.querySelector('[data-google-reviews-highlights]');
    const stage = reviewsSection.querySelector('[data-google-reviews-stage]');
    const track = reviewsSection.querySelector('[data-google-reviews-track]');
    const tabs = reviewsSection.querySelector('[data-google-reviews-tabs]');
    const current = reviewsSection.querySelector('[data-google-reviews-current]');
    const total = reviewsSection.querySelector('[data-google-reviews-total]');
    const prevButton = reviewsSection.querySelector('[data-google-reviews-prev]');
    const nextButton = reviewsSection.querySelector('[data-google-reviews-next]');
    const reviews = reviewData.reviews.slice();

    if (reviewCount) {
        reviewCount.textContent = reviews.length;
    }

    if (highlights) {
        highlights.innerHTML = '';
        (reviewData.highlights || []).forEach((item) => {
            const chip = document.createElement('span');
            chip.className = 'google-review-chip';
            chip.textContent = item;
            highlights.appendChild(chip);
        });
    }

    if (!track || !tabs || reviews.length === 0) {
        return;
    }

    track.innerHTML = '';
    tabs.innerHTML = '';

    reviews.forEach((review, index) => {
        track.appendChild(buildReviewCard(review, index));
        tabs.appendChild(buildTab(review, index));
    });

    let activeIndex = 0;

    if (total) {
        total.textContent = padNumber(reviews.length);
    }

    setActiveReview(activeIndex);

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            setActiveReview(activeIndex - 1);
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            setActiveReview(activeIndex + 1);
        });
    }

    tabs.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-review-index]');

        if (!trigger) {
            return;
        }

        setActiveReview(Number(trigger.dataset.reviewIndex));
    });

    (stage || reviewsSection).addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            setActiveReview(activeIndex - 1);
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            setActiveReview(activeIndex + 1);
        }
    });

    function buildReviewCard(review, index) {
        const card = document.createElement('article');
        card.className = 'google-review-card';
        card.id = `google-review-panel-${index}`;
        card.setAttribute('role', 'tabpanel');
        card.setAttribute('aria-labelledby', `google-review-tab-${index}`);
        card.setAttribute('aria-hidden', index === 0 ? 'false' : 'true');
        card.setAttribute('tabindex', index === 0 ? '0' : '-1');

        const top = document.createElement('div');
        top.className = 'google-review-top';

        const authorBlock = document.createElement('div');

        const badge = document.createElement('p');
        badge.className = 'google-review-badge';
        badge.textContent = 'Google review';
        authorBlock.appendChild(badge);

        const name = document.createElement('h3');
        name.className = 'google-review-name';
        name.textContent = review.name;
        authorBlock.appendChild(name);

        const timeAgo = document.createElement('p');
        timeAgo.className = 'google-review-date';
        timeAgo.textContent = review.timeAgo;

        top.appendChild(authorBlock);
        top.appendChild(timeAgo);
        card.appendChild(top);

        if (review.meta) {
            const meta = document.createElement('p');
            meta.className = 'google-review-meta';
            meta.textContent = review.meta;
            card.appendChild(meta);
        }

        const quote = document.createElement('blockquote');
        quote.className = 'google-review-quote';
        quote.textContent = `"${review.text}"`;
        card.appendChild(quote);

        return card;
    }

    function buildTab(review, index) {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'google-review-tab';
        tab.dataset.reviewIndex = String(index);
        tab.textContent = review.name;
        tab.id = `google-review-tab-${index}`;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', `google-review-panel-${index}`);
        tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
        tab.setAttribute('aria-label', `Show review from ${review.name}`);
        return tab;
    }

    function setActiveReview(index) {
        if (reviews.length === 0) {
            return;
        }

        activeIndex = (index + reviews.length) % reviews.length;
        track.style.transform = `translateX(-${activeIndex * 100}%)`;

        Array.from(track.children).forEach((slide, slideIndex) => {
            slide.setAttribute('aria-hidden', slideIndex === activeIndex ? 'false' : 'true');
            slide.setAttribute('tabindex', slideIndex === activeIndex ? '0' : '-1');
        });

        Array.from(tabs.children).forEach((tab, tabIndex) => {
            tab.classList.toggle('is-active', tabIndex === activeIndex);
            tab.setAttribute('aria-selected', tabIndex === activeIndex ? 'true' : 'false');
        });

        if (current) {
            current.textContent = padNumber(activeIndex + 1);
        }
    }

    function padNumber(value) {
        return String(value).padStart(2, '0');
    }
})();
