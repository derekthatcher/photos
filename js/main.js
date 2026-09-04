let siteConfig = null;
let currentAlbumData = [];
let lightboxState = 0; // 0: Closed, 1: Fit, 2: Caption
let currentSortOrder = 'desc';
let currentPhotoIndex = 0;
let currentLayout = 'grid';

const galleryEl = document.getElementById('gallery');
const lightboxEl = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const overlayEl = document.getElementById('lightbox-overlay');

// Helper to turn album labels into clean URL slugs
function getSlug(label) {
    return label.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

// 1. App Initialization
async function init() {
    try {
        const res = await fetch('config.json?cachebust=' + Date.now());
        siteConfig = await res.json();

        if (siteConfig.bgColor) {
            document.documentElement.style.setProperty('--bg-color', siteConfig.bgColor);
        }
        if (siteConfig.textColor) {
            document.documentElement.style.setProperty('--text-color', siteConfig.textColor);
        }

        document.getElementById('site-title').innerText = siteConfig.siteTitle || 'Portfolio';
        document.title = siteConfig.siteTitle || 'Portfolio';

        if (siteConfig.about) {
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) metaDesc.setAttribute('content', siteConfig.about);
        }
        if (siteConfig.favicon) {
            const faviconLink = document.getElementById('site-favicon');
            if (faviconLink) faviconLink.setAttribute('href', siteConfig.favicon);
        }

        const aboutEl = document.getElementById('footer-about');
        const socialEl = document.getElementById('footer-social');

        aboutEl.innerText = siteConfig.about || '';
        socialEl.innerHTML = '';

        if (siteConfig.socialLinks && Array.isArray(siteConfig.socialLinks)) {
            siteConfig.socialLinks.forEach(link => {
                if (link.label && link.url) {
                    const a = document.createElement('a');
                    a.innerText = link.label;
                    a.href = link.url;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    socialEl.appendChild(a);
                }
            });
        }

        renderNavigation();

        // Hash-based initial routing lookup
        const currentHash = window.location.hash.replace('#', '');
        let initialIndex = 0;

        if (currentHash && siteConfig.navigation) {
            const foundIndex = siteConfig.navigation.findIndex(
                item => getSlug(item.label) === currentHash
            );
            if (foundIndex !== -1) initialIndex = foundIndex;
        }

        if (siteConfig.navigation && siteConfig.navigation.length > 0) {
            loadAlbum(siteConfig.navigation[initialIndex].dataFile, initialIndex, false);
        }
    } catch (err) {
        console.error('Failed to load config.json:', err);
    }
}

// 2. Navigation & Header Controls
function toggleMobileMenu(e) {
    if (e) e.stopPropagation();
    const controls = document.getElementById('header-controls');
    const toggleBtn = document.getElementById('menu-toggle');
    const isOpen = controls.classList.toggle('open');
    toggleBtn.innerText = isOpen ? '✕' : '☰';
}

function renderNavigation() {
    const navEl = document.getElementById('nav-menu');
    navEl.innerHTML = '';

    if (!siteConfig.navigation) return;

    siteConfig.navigation.forEach((item, index) => {
        const link = document.createElement('a');
        link.innerText = item.label;
        link.href = '#' + getSlug(item.label);
        link.onclick = (e) => {
            e.preventDefault();
            loadAlbum(item.dataFile, index, true);

            const controls = document.getElementById('header-controls');
            const toggleBtn = document.getElementById('menu-toggle');
            if (controls) controls.classList.remove('open');
            if (toggleBtn) toggleBtn.innerText = '☰';
        };
        if (index === 0) link.classList.add('active');
        navEl.appendChild(link);
    });
}

// 3. Album Fetching with History Control
async function loadAlbum(dataFile, navIndex, updateHistory = true) {
    const gallery = document.getElementById('gallery');
    const currentAlbum = siteConfig.navigation[navIndex];
    const slug = getSlug(currentAlbum.label);

    currentLayout = currentAlbum && currentAlbum.layout ? currentAlbum.layout : 'grid';
    gallery.className = `gallery-grid gallery-${currentLayout}`;

    const navLinks = document.querySelectorAll('#nav-menu a');
    navLinks.forEach((link, idx) => link.classList.toggle('active', idx === navIndex));

    if (updateHistory) {
        history.pushState({ navIndex }, '', '#' + slug);
    }

    galleryEl.innerHTML = '<div class="status-msg">Loading photos...</div>';

    try {
        const res = await fetch(dataFile + '?cachebust=' + Date.now());
        currentAlbumData = await res.json();
        sortAndRender();
    } catch (err) {
        console.error(`Failed to load ${dataFile}:`, err);
        galleryEl.innerHTML = `<div class="status-msg">Unable to load album file: ${dataFile}</div>`;
    }
}

// 4. Sorting & Gallery Rendering
function setSortOrder(order) {
    currentSortOrder = order;

    document.getElementById('sort-desc').classList.toggle('active', order === 'desc');
    document.getElementById('sort-asc').classList.toggle('active', order === 'asc');

    sortAndRender();
}

function sortAndRender() {
    if (!currentAlbumData || currentAlbumData.length === 0) return;

    currentAlbumData.sort((a, b) => {
        const dateA = new Date(a.dateTaken || a.exif?.date || 0).getTime();
        const dateB = new Date(b.dateTaken || b.exif?.date || 0).getTime();

        return currentSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    renderGallery(currentLayout);
}

function renderGallery(layout = 'grid') {
    galleryEl.innerHTML = '';

    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;

    currentAlbumData.forEach((photo, index) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';

        const imgSrc = (layout === 'panorama' && isDesktop) 
            ? (photo.fullUrl || photo.displayUrl) 
            : (photo.displayUrl || photo.thumbUrl);

        if (layout === 'justified') {
            const w = parseFloat(photo.width) || 800;
            const h = parseFloat(photo.height) || 600;
            const aspectRatio = w / h;
            
            item.style.flexGrow = aspectRatio;
            item.style.flexBasis = `${280 * aspectRatio}px`;
        }

        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = photo.title || 'Photo';
        img.loading = 'lazy';
        img.onerror = () => item.remove();
        img.onclick = () => openLightbox(index);

        item.appendChild(img);
        galleryEl.appendChild(item);
    });
}

// 5. Lightbox Logic
function openLightbox(index) {
    currentPhotoIndex = index;
    lightboxState = 1;
    lightboxEl.className = 'active';
    updateLightboxContent();
}

function updateLightboxContent() {
    const photo = currentAlbumData[currentPhotoIndex];
    if (!photo) return;

    lightboxImg.src = photo.displayUrl || photo.fullUrl || photo.thumbUrl;
    lightboxImg.alt = photo.title || '';

    document.getElementById('meta-title').innerText = photo.title || '';
    document.getElementById('meta-desc').innerHTML = photo.description || '';

    const descLinks = document.querySelectorAll('#meta-desc a');
    descLinks.forEach(link => {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
    });

    const exif = photo.exif || {};
    const exifParts = [exif.camera, exif.lens, exif.focalLength, exif.fStop, exif.shutter, exif.iso].filter(val => val && val !== 'N/A');
    document.getElementById('meta-exif').innerText = exifParts.join('  |  ');
}

// Updated Lightbox State Tracking
// 0: Closed, 1: Fit View, 2: Caption View, 3: Full Zoom

function toggleZoom(e) {
    if (e) e.stopPropagation();

    const photo = currentAlbumData[currentPhotoIndex];
    if (!photo) return;

    if (lightboxState !== 3) {
        // Switch to State 3 (Full Zoom)
        lightboxState = 3;
        lightboxEl.className = 'active state-zoom';
        
        const targetUrl = photo.fullUrl || photo.displayUrl || photo.thumbUrl;

        // Fallback gracefully if 429 (or any load error) occurs on 4K files
        lightboxImg.onerror = () => {
            console.warn('High-res image rate limited or failed to load. Falling back to display size.');
            lightboxImg.onerror = null; // Prevent infinite loop
            lightboxImg.src = photo.displayUrl || photo.thumbUrl;
        };

        lightboxImg.src = targetUrl;
    } else {
        // Return to State 2 (Caption View)
        lightboxState = 2;
        lightboxEl.className = 'active state-caption';
        lightboxImg.onerror = null;
        lightboxImg.src = photo.displayUrl || photo.fullUrl || photo.thumbUrl;
    }
}

function closeLightbox(e) {
    if (e) e.stopPropagation();
    lightboxState = 0;
    lightboxEl.className = '';
    lightboxImg.onerror = null;
    lightboxImg.src = '';
}

function cycleLightboxState(e) {
    if (e.target.closest('.lightbox-close') || e.target.closest('#meta-desc a')) return;

    if (lightboxState === 1) {
        lightboxState = 2;
        lightboxEl.className = 'active state-caption';
    } else if (lightboxState === 2) {
        closeLightbox();
    } else if (lightboxState === 3) {
        // Clicking anywhere in Zoom Mode returns to State 2 (Caption View)
        toggleZoom(e);
    }
}

function navigateLightbox(direction) {
    if (lightboxState === 0 || !currentAlbumData.length) return;

    if (direction === 'next') {
        currentPhotoIndex = (currentPhotoIndex + 1) % currentAlbumData.length;
    } else if (direction === 'prev') {
        currentPhotoIndex = (currentPhotoIndex - 1 + currentAlbumData.length) % currentAlbumData.length;
    }

    // Reset zoom state to caption state on photo change
    if (lightboxState === 3) {
        lightboxState = 2;
        lightboxEl.className = 'active state-caption';
    }

    updateLightboxContent();
}

document.addEventListener('keydown', (e) => {
    if (lightboxState === 0) return;

    if (e.key === 'Escape') {
        closeLightbox();
    } else if (e.key === 'ArrowRight') {
        navigateLightbox('next');
    } else if (e.key === 'ArrowLeft') {
        navigateLightbox('prev');
    }
});

// 6. Handle Browser Back & Forward Buttons for Hash Navigation
window.addEventListener('hashchange', () => {
    const currentHash = window.location.hash.replace('#', '');
    if (!siteConfig || !siteConfig.navigation) return;

    const index = siteConfig.navigation.findIndex(
        item => getSlug(item.label) === currentHash
    );
    const targetIndex = index >= 0 ? index : 0;
    loadAlbum(siteConfig.navigation[targetIndex].dataFile, targetIndex, false);
});

init();