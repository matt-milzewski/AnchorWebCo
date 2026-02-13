// Initialize smooth scroll polyfill when loaded.
if (window.smoothscroll && typeof window.smoothscroll.polyfill === 'function') {
    window.smoothscroll.polyfill();
}

// Mobile Menu Toggle
const mobileMenu = document.getElementById('mobile-menu');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenuClose = document.getElementById('mobile-menu-close');

if (mobileMenu && mobileMenuButton && mobileMenuClose) {
    const mobileMenuLinks = mobileMenu.querySelectorAll('a');

    function openMobileMenu() {
        mobileMenu.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileMenu() {
        mobileMenu.classList.add('hidden');
        document.body.style.overflow = '';
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

// Form Validation and Submission
const contactForm = document.getElementById('contact-form');

if (contactForm) {
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
            showToast('Please fill in all required fields', 'error');
            return;
        }

        if (!emailRegex.test(email)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }

        if (phone && !phoneRegex.test(phone)) {
            showToast('Please enter a valid Australian phone number', 'error');
            return;
        }

        // Show loading state
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Sending...';
        submitButton.disabled = true;

        try {
            // Send Google Ads conversion event first, then submit.
            if (typeof gtag !== 'undefined') {
                gtag('event', 'conversion_event_submit_lead_form', {
                    event_callback: function () {
                        submitFormToFormspree();
                    },
                    event_timeout: 2000
                });
            } else {
                submitFormToFormspree();
            }
        } catch (error) {
            showToast('Error sending message. Please try again later.', 'error');
            console.error('Form submission error:', error);
            resetSubmitButton();
        }

        async function submitFormToFormspree() {
            try {
                const formData = new FormData(contactForm);
                const formDataObj = {};
                formData.forEach((value, key) => {
                    formDataObj[key] = value;
                });

                const response = await fetch('https://formspree.io/f/xdkgalak', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    },
                    body: JSON.stringify(formDataObj)
                });

                if (response.ok) {
                    window.location.replace('thank-you.html');

                    setTimeout(() => {
                        if (window.location.pathname !== '/thank-you.html') {
                            window.location.href = 'thank-you.html';
                        }
                    }, 1000);
                } else {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to send message');
                }
            } catch (error) {
                showToast('Error sending message. Please try again later.', 'error');
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
