# Flickr-Powered Photography Portfolio

A minimal, ultra-lightweight photography portfolio built with pure HTML5, CSS, and JavaScript. It uses Flickr as a headless CMS, pre-fetching album metadata and EXIF data into local JSON files via a browser-based admin tool. (Flickr API key required, would be easy to hold images in directory and create json files instead.)

## Features

* **Zero Build Steps:** Runs natively in any web browser without Node.js, npm, or compilers.
* **Privacy & Speed:** No Flickr API key required for site visitors. Images load directly from Flickr's global static CDN.
* **Grid Layout options:** Each Gallery can have invididual layout options 
* **3-State Lightbox UX:**
  1. **Click 1:** Expands photo to full screen.
  2. **Click 2:** Fades in a semi-transparent EXIF & caption overlay.
  3. **Click 3 / ESC:** Closes lightbox back to grid.
* **Date Sorting:** Subtle toggle to sort album photos by date taken (Newest ↓ / Oldest ↑).
* **Browser-Based Admin Panel (`admin.html`):** Drag-and-drop menu reordering, dynamic color pickers, and direct file overwrite via the File System Access API.
* **Resilient Image Loading:** Automatically removes broken links from the DOM so grid layouts remain seamless.

---

## Getting Started

### 1. Site Setup
1. Clone or download this repository.
2. Host the files on any web host, static web server, or **GitHub Pages**.

### 2. Initial Configuration (`admin.html`)
1. Open `admin.html` in a supported browser (Chrome, Edge, Brave, or Opera).
2. Click **Connect Project Directory** and grant access to your website's root folder.
3. Paste your **Flickr API Key** under *API Settings*.
4. Customize your **Site Title**, **Background Color**, **Text Color**, and **About Text**.
5. Add your **Social Links** (e.g., Instagram, Flickr, Email).
6. Map your menu items under **Navigation & Albums**:
   * **Menu Label:** Name visible in header (e.g., `Landscapes`).
   * **Flickr Album ID:** Found in your Flickr album URL (e.g., `72177720312345678`).
   * **Data File:** Destination JSON file path (e.g., `data/landscapes.json`).
7. Drag the `☰` handle on any row to reorder menu items.
8. Click **Save config.json**.

### 3. Syncing Flickr Data
1. In `admin.html`, click **Fetch & Overwrite All Album JSONs**.
2. The script will query Flickr's API for each photo's high-res URLs, dimensions, captions, and EXIF tags (Camera, Lens, F-Stop, Shutter).
3. The resulting JSON files are saved directly into your `/data/` folder.
4. Commit and push the updated `config.json` and `/data/` folder to your server or repository.

---

## Customization & Theme

Site colors apply dynamically via CSS variables:

* **Background Color (`bgColor`):** Applied to the main body and mixed into the lightbox overlay using CSS `color-mix()`.
* **Text Color (`textColor`):** Controls site titles, menu links, and overlay metadata typography contrast.

---

## License

MIT License. Free to use, modify, and distribute for personal or commercial photography portfolios.

---

## Directory Structure

```text
├── index.html          # Main portfolio site
├── admin.html          # Client-side admin & Flickr JSON sync tool
├── config.json         # Site title, theme colors, about text, navigation
└── data/
    ├── landscapes.json # Pre-fetched photo & EXIF metadata
    └── portraits.json  # Pre-fetched photo & EXIF metadata
