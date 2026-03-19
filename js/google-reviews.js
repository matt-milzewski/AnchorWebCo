(function() {
    const reviewsSection = document.querySelector('[data-google-reviews]');
    const reviewData = window.ANCHOR_GOOGLE_REVIEWS_DATA;

    if (!reviewsSection || !reviewData || !Array.isArray(reviewData.reviews)) {
        return;
    }

    const reviewCount = reviewsSection.querySelector('[data-google-reviews-count]');
    const highlights = reviewsSection.querySelector('[data-google-reviews-highlights]');
    const list = reviewsSection.querySelector('[data-google-reviews-list]');

    if (reviewCount) {
        reviewCount.textContent = reviewData.reviews.length;
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

    if (!list) {
        return;
    }

    list.innerHTML = '';

    reviewData.reviews.forEach((review) => {
        list.appendChild(buildReviewCard(review));
    });

    function buildReviewCard(review) {
        const card = document.createElement('article');
        card.className = `google-review-card${review.featured ? ' google-review-card--featured' : ''}`;

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

        const quote = document.createElement('p');
        quote.className = 'google-review-quote';
        quote.textContent = `"${review.text}"`;
        card.appendChild(quote);

        return card;
    }
})();
