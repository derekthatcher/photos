let siteConfig = null;
let currentAlbumData = [];
let lightboxState = 0; // 0: Closed, 1: Fit, 2: Caption
let currentSortOrder = 'desc';
let currentPhotoIndex = 0;

const galleryEl = document.getElementById('gallery');
const lightboxEl = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const overlayEl = document.getElementById('lightbox-overlay');

// 1. App Initialization
async function init() {
    try {
        const res = await fetch('config.json?cachebust=' + Date.now());
        siteConfig = await res.json();

        // 1. Apply Dynamic Colors
        if (siteConfig.bgColor) {
            document.documentElement.style.setProperty('--bg-color', siteConfig.bgColor);
        }
        if (siteConfig.textColor) {
            document.documentElement.style.setProperty('--text-color', siteConfig.textColor);
        }

        // 2. Set Site Title
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

        // 3. Render Footer
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
        if (siteConfig.navigation && siteConfig.navigation.length > 0) {
            loadAlbum(siteConfig.navigation[0].dataFile, 0);
        }
    } catch (err) {
        console.error('Failed to load config.json:', err);
    }
}

// 2. Dynamic Navigation Rendering
// Toggle mobile menu open/close
function toggleMobileMenu(e) {
    if (e) e.stopPropagation();
    const controls = document.getElementById('header-controls');
    const toggleBtn = document.getElementById('menu-toggle');
    const isOpen = controls.classList.toggle('open');
    toggleBtn.innerText = isOpen ? '✕' : '☰';
}

// Update renderNavigation so selecting an album closes the dropdown
function renderNavigation() {
    const navEl = document.getElementById('nav-menu');
    navEl.innerHTML = '';
    siteConfig.navigation.forEach((item, index) => {
        const link = document.createElement('a');
        link.innerText = item.label;
        link.onclick = (e) => {
            e.preventDefault();
            loadAlbum(item.dataFile, index);

            // Close mobile menu when an album is clicked
            const controls = document.getElementById('header-controls');
            const toggleBtn = document.getElementById('menu-toggle');
            if (controls) controls.classList.remove('open');
            if (toggleBtn) toggleBtn.innerText = '☰';
        };
        if (index === 0) link.classList.add('active');
        navEl.appendChild(link);
    });
}


// 3. Album Fetching
async function loadAlbum(dataFile, navIndex) {
    const gallery = document.getElementById('gallery');
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach((link, idx) => link.classList.toggle('active', idx === navIndex));

    galleryEl.innerHTML = '<div class="status-msg">Loading photos...</div>';
    const currentAlbum = siteConfig.navigation[navIndex];
    const layoutStyle = currentAlbum && currentAlbum.layout ? currentAlbum.layout : 'grid';
    gallery.className = `gallery-grid gallery-${layoutStyle}`;
    
    try {
        const res = await fetch(dataFile);
        currentAlbumData = await res.json();
        sortAndRender();
    } catch (err) {
        console.error(`Failed to load ${dataFile}:`, err);
        galleryEl.innerHTML = `<div class="status-msg">Unable to load album file: ${dataFile}</div>`;
    }
}

// Toggle sort direction
function setSortOrder(order) {
    currentSortOrder = order;

    document.getElementById('sort-desc').classList.toggle('active', order === 'desc');
    document.getElementById('sort-asc').classList.toggle('active', order === 'asc');

    sortAndRender();
}

// Sort array by Date Taken before calling renderGallery()
function sortAndRender() {
    if (!currentAlbumData || currentAlbumData.length === 0) return;

    currentAlbumData.sort((a, b) => {
        const dateA = new Date(a.dateTaken || a.exif?.date || 0).getTime();
        const dateB = new Date(b.dateTaken || b.exif?.date || 0).getTime();

        return currentSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    renderGallery();
}

// 4. Masonry Grid Rendering
function renderGallery() {
    galleryEl.innerHTML = '';
    currentAlbumData.forEach((photo, index) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';

        const img = document.createElement('img');
        img.src = photo.thumbUrl;
        img.alt = photo.title || 'Photo';
        img.loading = 'lazy';
        img.onerror = () => item.remove();
        img.onclick = () => openLightbox(index); // Pass index

        item.appendChild(img);
        galleryEl.appendChild(item);
    });
}

// 5. Lightbox Interactions (3-State Logic)
function openLightbox(index) {
    currentPhotoIndex = index;
    lightboxState = 1;
    lightboxEl.className = 'active';
    updateLightboxContent();
}

// Update DOM elements for current photo (does not alter lightboxState or active classes)
function updateLightboxContent() {
    const photo = currentAlbumData[currentPhotoIndex];
    if (!photo) return;

    // Load fast-loading screen size
    lightboxImg.src = photo.displayUrl || photo.fullUrl || photo.thumbUrl;
    lightboxImg.alt = photo.title || '';

    // Populate Overlay Text
    document.getElementById('meta-title').innerText = photo.title || '';
    document.getElementById('meta-desc').innerHTML = photo.description || '';

    // Ensure links inside descriptions open in new tabs
    const descLinks = document.querySelectorAll('#meta-desc a');
    descLinks.forEach(link => {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
    });

    const exif = photo.exif || {};
    const exifParts = [exif.camera, exif.lens, exif.focalLength, exif.fStop, exif.shutter, exif.iso].filter(val => val && val !== 'N/A');
    document.getElementById('meta-exif').innerText = exifParts.join('  |  ');

    const zoomLink = document.getElementById('meta-zoom');
    if (zoomLink) zoomLink.href = photo.fullUrl || photo.displayUrl || photo.thumbUrl;
}

// Next/Previous navigation (preserves current lightboxState)
function navigateLightbox(direction) {
    if (lightboxState === 0 || !currentAlbumData.length) return;

    if (direction === 'next') {
        currentPhotoIndex = (currentPhotoIndex + 1) % currentAlbumData.length;
    } else if (direction === 'prev') {
        currentPhotoIndex = (currentPhotoIndex - 1 + currentAlbumData.length) % currentAlbumData.length;
    }

    updateLightboxContent();
}

function cycleLightboxState(e) {
    if (e.target.closest('.lightbox-close') || e.target.closest('#meta-zoom') || e.target.closest('#meta-desc a')) return;

    if (lightboxState === 1) {
        lightboxState = 2;
        lightboxEl.className = 'active state-caption';
    } else if (lightboxState === 2) {
        closeLightbox();
    }
}

function closeLightbox(e) {
    if (e) e.stopPropagation();
    lightboxState = 0;
    lightboxEl.className = '';
    lightboxImg.src = '';
}

// Keyboard Listeners (ESC, Arrow Left, Arrow Right)
document.addEventListener('keydown', (e) => {
    if (lightboxState === 0) return;
    const controls = document.getElementById('header-controls');
    const toggleBtn = document.getElementById('menu-toggle');
    if (controls && controls.classList.contains('open') && !e.target.closest('header')) {
        controls.classList.remove('open');
        if (toggleBtn) toggleBtn.innerText = '☰';
    }

    if (e.key === 'Escape') {
        closeLightbox();
    } else if (e.key === 'ArrowRight') {
        navigateLightbox('next');
    } else if (e.key === 'ArrowLeft') {
        navigateLightbox('prev');
    }
});

init();