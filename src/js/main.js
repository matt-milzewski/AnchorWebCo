// Initialize smooth scroll polyfill when loaded.
if (window.smoothscroll && typeof window.smoothscroll.polyfill === 'function') {
    window.smoothscroll.polyfill();
}

// Dynamic copyright year
document.querySelectorAll('.copyright-year').forEach(function(el) {
    el.textContent = new Date().getFullYear();
});

// Mobile Menu Toggle
const mobileMenu = document.getElementById('mobile-menu');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenuClose = document.getElementById('mobile-menu-close');

if (mobileMenu && mobileMenuButton && mobileMenuClose) {
    const mobileMenuLinks = mobileMenu.querySelectorAll('a');

    function openMobileMenu() {
        mobileMenu.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        mobileMenuButton.setAttribute('aria-expanded', 'true');
    }

    function closeMobileMenu() {
        mobileMenu.classList.add('hidden');
        document.body.style.overflow = '';
        mobileMenuButton.setAttribute('aria-expanded', 'false');
    }

    mobileMenuButton.addEventListener('click', openMobileMenu);
    mobileMenuClose.addEventListener('click', closeMobileMenu);
    mobileMenuLinks.forEach((link) => link.addEventListener('click', closeMobileMenu));
}

// Scroll to Top Button
const scrollTopButton = document.getElementById('scroll-top');

if (scrollTopButton) {
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 400) {
            scrollTopButton.classList.remove('hidden');
            scrollTopButton.classList.add('visible');
        } else {
            scrollTopButton.classList.remove('visible');
            scrollTopButton.classList.add('hidden');
        }
    });

    scrollTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Testimonial Carousel
const testimonialCarousel = document.querySelector('.testimonial-carousel');
const testimonials = document.querySelectorAll('.testimonial');

if (testimonialCarousel && testimonials.length > 0) {
    document.documentElement.classList.add('js-enabled');

    let currentTestimonial = 0;

    function showTestimonial(index) {
        testimonials.forEach((testimonial, i) => {
            testimonial.classList.toggle('active', i === index);
        });
    }

    function nextTestimonial() {
        currentTestimonial = (currentTestimonial + 1) % testimonials.length;
        showTestimonial(currentTestimonial);
    }

    // Ensure a testimonial is visible immediately on page load.
    showTestimonial(currentTestimonial);

    if (testimonials.length > 1) {
        setInterval(nextTestimonial, 5000);
    }
}

// Reading Progress Bar (auto-injects on blog/article pages)
(function() {
    if (!/blog-/.test(window.location.pathname)) return;

    var progressBar = document.createElement('div');
    progressBar.id = 'reading-progress';
    progressBar.style.cssText = 'position:fixed;top:0;left:0;height:3px;width:0;background:#38bdf8;z-index:9999;transition:width 0.1s linear;pointer-events:none;';
    document.body.prepend(progressBar);

    window.addEventListener('scroll', function() {
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var scrolled = docHeight > 0 ? (window.pageYOffset / docHeight) * 100 : 0;
        progressBar.style.width = Math.min(scrolled, 100) + '%';
    });
})();

// Form Validation and Submission
const contactForm = document.getElementById('contact-form');

if (contactForm) {
    function reportContactError(field, reason) {
        window.dispatchEvent(new CustomEvent('anchor:form-error', {
            detail: {
                form: 'contact',
                field: field || 'unknown',
                reason: reason || 'client-validation'
            }
        }));
    }

    const startedAtField = document.getElementById('form-started-at');
    if (startedAtField) {
        startedAtField.value = String(Date.now());
    }

    const query = new URLSearchParams(window.location.search);
    const requestedPackage = query.get('package') || '';
    const requestedCare = query.get('care') || '';
    const packageField = document.getElementById('recommended-package');
    const careField = document.getElementById('recommended-care');
    const plannerSourceField = document.getElementById('planner-source');
    const selectedPlanSummary = document.getElementById('selected-plan-summary');
    const packageLabels = {
        'one-page': 'One-Page Launch',
        'local-business': 'Local Business Site',
        'growth': 'Growth Website'
    };
    const careLabels = {
        'site-care': 'Site Care',
        'care-insights': 'Care + Insights',
        'lead-monitor': 'Lead Monitor'
    };

    if (packageField) packageField.value = requestedPackage;
    if (careField) careField.value = requestedCare;
    if (plannerSourceField) plannerSourceField.value = query.get('source') || '';

    if (selectedPlanSummary && (packageLabels[requestedPackage] || careLabels[requestedCare])) {
        const parts = [];
        if (packageLabels[requestedPackage]) parts.push(packageLabels[requestedPackage]);
        if (careLabels[requestedCare]) parts.push(careLabels[requestedCare]);
        selectedPlanSummary.innerHTML = '<strong>Your saved starting point:</strong> ' + parts.join(' + ') + '. I will confirm the fit before anything is agreed.';
        selectedPlanSummary.classList.remove('hidden');
    }

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Honeypot validation - if company field is filled, it's likely spam
        const companyField = document.querySelector('input[name="company"]');
        if (companyField && companyField.value.trim()) {
            return;
        }

        // Basic form validation
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const message = document.getElementById('message').value.trim();

        // Email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Phone validation regex (Australian format)
        const phoneRegex = /^(\+61|0)[2-478]\d{8}$/;

        if (!name || !email || !message) {
            reportContactError('required', 'client-validation');
            showToast('Please fill in all required fields', 'error');
            return;
        }

        if (!emailRegex.test(email)) {
            reportContactError('email', 'client-validation');
            showToast('Please enter a valid email address', 'error');
            return;
        }

        const compactPhone = phone.replace(/[\s()-]/g, '');
        if (phone && !phoneRegex.test(compactPhone)) {
            reportContactError('phone', 'client-validation');
            showToast('Please enter a valid Australian phone number', 'error');
            return;
        }

        // Show loading state
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Sending...';
        submitButton.disabled = true;

        submitFormToFormBackend();

        async function submitFormToFormBackend() {
            try {
                const formData = new FormData(contactForm);
                const formDataObj = {};
                formData.forEach((value, key) => {
                    formDataObj[key] = value;
                });

                const formsApiBase = (window.ANCHOR_FORMS_API_BASE || '').replace(/\/$/, '');
                if (!formsApiBase) {
                    throw new Error('The enquiry service is temporarily unavailable. Please call or email Anchor Web Co.');
                }
                const endpoint = `${formsApiBase}/api/forms/anchor-web-co`;

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    },
                    body: JSON.stringify(formDataObj)
                });

                if (response.ok) {
                    const responseData = await response.json().catch(() => ({}));
                    window.dispatchEvent(new CustomEvent('anchor:form-success', {
                        detail: {
                            form: 'contact',
                            submission_id: responseData.submissionId || '',
                            project_stage: formDataObj.project_stage || '',
                            service_type: formDataObj.recommended_package || formDataObj.project_stage || '',
                            care_plan: formDataObj.recommended_care || '',
                            business_suburb: formDataObj.business_suburb || '',
                            source_page: formDataObj.source_page || window.location.pathname,
                            cta: formDataObj.cta || 'contact-form'
                        }
                    }));

                    let redirected = false;
                    const redirectToThankYou = function () {
                        if (redirected) return;
                        redirected = true;
                        window.location.replace('/thank-you.html');
                    };

                    if (typeof gtag !== 'undefined') {
                        gtag('event', 'conversion_event_submit_lead_form', {
                            event_callback: redirectToThankYou,
                            event_timeout: 1200
                        });
                        setTimeout(redirectToThankYou, 1300);
                    } else {
                        redirectToThankYou();
                    }
                } else {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || 'Failed to send message');
                }
            } catch (error) {
                reportContactError('endpoint', 'submission-failed');
                showToast(error.message || 'Error sending message. Please call or email instead.', 'error');
                console.error('Form submission error:', error);
                resetSubmitButton();
            }
        }

        function resetSubmitButton() {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    });
}

// Toast Notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg text-white ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        'bg-anchor-navy'
    } animate-fade-in`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Intersection Observer for animations
const animatedElements = document.querySelectorAll('.service-card, .process-step');

if (animatedElements.length > 0 && 'IntersectionObserver' in window) {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-slide-up');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animatedElements.forEach((element) => {
        observer.observe(element);
    });
}

// Lazy loading images with data-src
document.addEventListener('DOMContentLoaded', () => {
    const lazyImages = document.querySelectorAll('img[data-src]');

    if (lazyImages.length === 0 || !('IntersectionObserver' in window)) {
        return;
    }

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });

    lazyImages.forEach((img) => imageObserver.observe(img));
});
