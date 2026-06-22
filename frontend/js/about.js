document.addEventListener('DOMContentLoaded', function() {
    // Counter Animation for Stats
    const animateCounters = () => {
        const statNumbers = document.querySelectorAll('.stat-number');
        let hasAnimated = false;

        const observerOptions = {
            threshold: 0.5,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !hasAnimated) {
                    hasAnimated = true;
                    animateStats();
                }
            });
        }, observerOptions);

        const statsContainer = document.querySelector('.stats-grid');
        if (statsContainer) {
            observer.observe(statsContainer);
        }
    };

    const animateStats = () => {
        const statNumbers = document.querySelectorAll('.stat-number');
        
        statNumbers.forEach(element => {
            const target = parseInt(element.getAttribute('data-target'));
            const duration = 2000; // 2 seconds
            const increment = target / (duration / 50);
            let current = 0;

            const counter = setInterval(() => {
                current += increment;
                if (current >= target) {
                    element.textContent = target.toLocaleString();
                    clearInterval(counter);
                } else {
                    element.textContent = Math.floor(current).toLocaleString();
                }
            }, 50);
        });
    };

    // Mouse Follow Animation on Cards
    const addMouseFollowEffect = () => {
        const cards = document.querySelectorAll('.card-3d');
        
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const rotateX = (y - rect.height / 2) / 10;
                const rotateY = -(x - rect.width / 2) / 10;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-20px)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(-20px)';
            });
        });
    };

    // Staggered Animation on Load
    const staggerElements = () => {
        const elements = document.querySelectorAll('[class*="slide-in"]');
        elements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.animation = `slide-in-up 0.8s ease-out ${index * 0.1}s forwards`;
        });
    };

    // Parallax Effect on Scroll
    const addParallaxEffect = () => {
        const blobs = document.querySelectorAll('.floating-blob');
        
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            blobs.forEach((blob, index) => {
                blob.style.transform = `translate(${scrolled * 0.1 * (index + 1)}px, ${scrolled * 0.05 * (index + 1)}px)`;
            });
        });
    };

    // Glow Effect on Hover for Quote Box
    const addQuoteGlow = () => {
        const quoteBox = document.querySelector('.quote-box');
        if (!quoteBox) return;

        quoteBox.addEventListener('mousemove', (e) => {
            const rect = quoteBox.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const distance = Math.sqrt(Math.pow(x - rect.width / 2, 2) + Math.pow(y - rect.height / 2, 2));
            const maxDistance = Math.sqrt(Math.pow(rect.width / 2, 2) + Math.pow(rect.height / 2, 2));
            
            const glow = Math.max(0, 1 - distance / maxDistance) * 0.5;
            quoteBox.style.boxShadow = `0 0 ${30 + glow * 40}px rgba(108, 99, 255, ${0.3 + glow * 0.3}), 0 15px 35px rgba(0, 0, 0, ${0.15})`;
        });

        quoteBox.addEventListener('mouseleave', () => {
            quoteBox.style.boxShadow = '0 0 20px rgba(108, 99, 255, 0.3), 0 15px 35px rgba(0, 0, 0, 0.15)';
        });
    };

    // Smooth Scroll for CTA Button
    const addSmoothScroll = () => {
        const ctaButton = document.querySelector('.cta-button');
        if (ctaButton) {
            ctaButton.addEventListener('click', (e) => {
                if (ctaButton.href === '#' || ctaButton.href.includes('index.html')) {
                    // Allow default navigation
                    return;
                }
            });
        }
    };

    // Initialize All Effects
    animateCounters();
    addMouseFollowEffect();
    addParallaxEffect();
    addQuoteGlow();
    addSmoothScroll();

    // Ripple Effect on CTA Button
    const rippleEffect = (button) => {
        button.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const ripple = document.createElement('span');
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        });
    };

    const buttons = document.querySelectorAll('.cta-button');
    buttons.forEach(button => rippleEffect(button));
});
