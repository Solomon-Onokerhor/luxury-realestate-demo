gsap.registerPlugin(ScrollTrigger);

/* ===================================
   0. LENIS SMOOTH SCROLL
   (replaces native scroll with
    inertia-based momentum physics)
=================================== */
const lenis = new Lenis({
    lerp: 0.07,          // Lower = smoother / slower catch-up
    smoothWheel: true,
    orientation: 'vertical',
});

// Connect Lenis to GSAP ticker for perfect sync
gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// Keep GSAP ScrollTrigger in sync with Lenis
lenis.on('scroll', ScrollTrigger.update);

/* Scroll Progress Bar */
const scrollProgress = document.getElementById('scrollProgress');
lenis.on('scroll', ({ progress }) => {
    if (scrollProgress) scrollProgress.style.width = (progress * 100) + '%';
});


/* ===================================
   1. PRELOADER
=================================== */
const preloader = document.getElementById('preloader');
const preloaderCounter = document.getElementById('preloaderCounter');

// Freeze scroll while preloading
lenis.stop();

let prog = { val: 0 };
gsap.to(prog, {
    val: 100,
    duration: 2.2,
    ease: 'power2.inOut',
    onUpdate: () => {
        if(preloaderCounter) preloaderCounter.innerText = Math.floor(prog.val) + '%';
    },
    onComplete: () => {
        gsap.to(preloader, {
            yPercent: -100,
            duration: 1.3,
            ease: 'power4.inOut',
            onComplete: () => {
                lenis.start(); // Unlock scroll
                initRevealAnimations(); // Fire reveals after preloader exits
            }
        });
    }
});


/* ===================================
   2. CUSTOM MAGNETIC CURSOR
=================================== */
const cursorDot = document.getElementById('cursorDot');
let mX = window.innerWidth / 2, mY = window.innerHeight / 2;
let cX = mX, cY = mY;

document.addEventListener('mousemove', (e) => { mX = e.clientX; mY = e.clientY; });

gsap.ticker.add(() => {
    cX += (mX - cX) * 0.12;
    cY += (mY - cY) * 0.12;
    if (cursorDot) {
        cursorDot.style.left = cX + 'px';
        cursorDot.style.top  = cY + 'px';
    }
});

document.querySelectorAll('a, button, .amenity-item, input, textarea, .gallery-item, .logo, .menu')
    .forEach(el => {
        el.addEventListener('mouseenter', () => cursorDot?.classList.add('hovered'));
        el.addEventListener('mouseleave', () => cursorDot?.classList.remove('hovered'));
    });


/* ===================================
   3. TEXT MASK REVEAL
   Lines slide up from behind a mask,
   triggered on scroll.
=================================== */
function wrapLinesForReveal(selector) {
    document.querySelectorAll(selector).forEach(el => {
        // Wrap each child line in mask+inner divs
        const lines = el.querySelectorAll('span, p, h2, h3');
        if (lines.length === 0) {
            // Fallback: wrap entire element
            const inner = document.createElement('div');
            inner.classList.add('line-inner');
            inner.innerHTML = el.innerHTML;
            el.innerHTML = '';
            const wrap = document.createElement('div');
            wrap.classList.add('line-wrap');
            wrap.appendChild(inner);
            el.appendChild(wrap);
        } else {
            lines.forEach(line => {
                const wrap = document.createElement('span');
                wrap.classList.add('line-wrap');
                const inner = document.createElement('span');
                inner.classList.add('line-inner');
                inner.innerHTML = line.innerHTML;
                wrap.appendChild(inner);
                line.innerHTML = '';
                line.appendChild(wrap);
            });
        }
    });
}

function initRevealAnimations() {
    // Hero title already animated via GSAP from — just reveal them
    gsap.to('.hero .massive-text .line-inner', {
        y: '0%',
        duration: 1.6,
        stagger: 0.1,
        ease: 'power4.out',
    });
    gsap.from('.hero-sub', { opacity: 0, y: 20, duration: 1, delay: 0.9, ease: 'power3.out' });

    // Scroll-triggered reveals for all section headings
    document.querySelectorAll('.scroll-step h3, .gallery-title, .contact-header h2').forEach(el => {
        gsap.to(el.querySelectorAll('.line-inner'), {
            y: '0%',
            duration: 1.2,
            stagger: 0.07,
            ease: 'power4.out',
            scrollTrigger: {
                trigger: el,
                start: 'top 85%',
            }
        });
    });

    // Paragraphs fade up
    gsap.utils.toArray('.scroll-step p, .contact-header p').forEach(el => {
        gsap.from(el, {
            opacity: 0,
            y: 30,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%' }
        });
    });

    // Amenity items stagger in
    gsap.from('.amenity-item', {
        opacity: 0,
        y: 40,
        stagger: 0.1,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.amenities-list', start: 'top 80%' }
    });

    // Footer
    gsap.to('.footer-hero .line-inner', {
        y: '0%',
        duration: 1.6,
        stagger: 0.12,
        ease: 'power4.out',
        scrollTrigger: { trigger: '.footer-hero', start: 'top 75%' }
    });
}

// Wrap lines before preloader ends so masks are ready
wrapLinesForReveal('.hero .massive-text');
wrapLinesForReveal('.scroll-step h3');
wrapLinesForReveal('.gallery-title');
wrapLinesForReveal('.contact-header h2');
wrapLinesForReveal('.footer-hero .massive-text');

/* ===================================
   4. VIDEO SCRUBBING
=================================== */
const showcase  = document.getElementById('showcase');
const video     = document.getElementById('scrubVideo');
const progressBar = document.getElementById('progressBar');

if (showcase && video) {
    video.currentTime = 0.1;

    const tlVideo = gsap.timeline({
        scrollTrigger: {
            trigger: showcase,
            start: 'top top',
            end:   'bottom bottom',
            scrub: 0.5,
        }
    });

    function setupVideoScrub() {
        const dur = video.duration || 8;
        tlVideo.to(video,       { currentTime: dur, ease: 'none', duration: 1 }, 0);
        if (progressBar)
            tlVideo.to(progressBar, { width: '100%',  ease: 'none', duration: 1 }, 0);
    }
    if (video.readyState >= 1) setupVideoScrub();
    else video.addEventListener('loadedmetadata', setupVideoScrub);
}

// Scroll step fade/scale
gsap.utils.toArray('.scroll-step').forEach(step => {
    gsap.fromTo(step,
        { opacity: 0.15, scale: 0.96 },
        {
            opacity: 1, scale: 1, duration: 1, ease: 'power3.out',
            scrollTrigger: { trigger: step, start: 'top 65%', end: 'center 40%', scrub: true }
        }
    );
});


/* ===================================
   5. HORIZONTAL GALLERY + PARALLAX
=================================== */
const gallerySection = document.getElementById('gallerySection');
const galleryTrack   = document.getElementById('galleryTrack');

if (gallerySection && galleryTrack) {
    requestAnimationFrame(() => {
        const scrollDist = galleryTrack.scrollWidth - window.innerWidth;

        gsap.to(galleryTrack, {
            x: -scrollDist,
            ease: 'none',
            scrollTrigger: {
                trigger: gallerySection,
                start: 'top top',
                end: () => `+=${scrollDist}`,
                pin: true,
                scrub: 1,
                anticipatePin: 1,
                invalidateOnRefresh: true,
            }
        });

        // Parallax: each image moves slower than its container
        document.querySelectorAll('.gallery-item img').forEach(img => {
            gsap.to(img, {
                x: -80,
                ease: 'none',
                scrollTrigger: {
                    trigger: gallerySection,
                    start: 'top top',
                    end: () => `+=${scrollDist}`,
                    scrub: 1,
                }
            });
        });
    });
}


/* ===================================
   6. HOVER REVEAL AMENITIES
=================================== */
const amenitiesSection = document.querySelector('.amenities-section');
const amenityPreview   = document.getElementById('amenityPreview');
const amenityImage     = document.getElementById('amenityImage');

if (amenitiesSection && amenityPreview) {
    amenitiesSection.addEventListener('mousemove', (e) => {
        const bounds = amenitiesSection.getBoundingClientRect();
        gsap.to(amenityPreview, {
            left: e.clientX - bounds.left,
            top:  e.clientY - bounds.top,
            duration: 0.5,
            ease: 'power2.out',
        });
    });

    document.querySelectorAll('.amenity-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
            amenityImage.src = item.getAttribute('data-img');
        });
    });
}
