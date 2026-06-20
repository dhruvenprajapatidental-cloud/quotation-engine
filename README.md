# Mayuri Enterprise – Quotation Engine

A professional, editable PDF quotation generator for Mayuri Enterprise Construction & Interior Design.

## 🚀 Live Demo (GitHub Pages)
> After deployment: `https://<your-username>.github.io/quotation-engine/`

---

## 📁 Files
```
quotation-engine/
├── index.html      ← Main app (open this in browser)
├── app.js          ← All logic (PDF generation, admin, client manager)
├── style.css       ← All styles
└── README.md       ← This file
```

---

## ✨ Features
- **Edit** company info, quote details, line items, terms, payment structure, notes
- **Editable headings** — rename any section directly in the card
- **Client Manager** — save, load, delete clients (stored in browser localStorage)
- **Admin Mode** — adjust every PDF font size, logo size, padding with live sliders
- **Drag & Drop** — reorder editor sections in Admin Mode
- **High-Quality PDF** — 4× scale render (≈288 DPI), PNG lossless, 2-page A4

---

## 🌐 Deploy to GitHub Pages (step by step)

### Step 1 — Create a GitHub repository
1. Go to [github.com](https://github.com) and sign in
2. Click **New repository**
3. Name it `quotation-engine` (or any name)
4. Set visibility to **Public**
5. Click **Create repository**

### Step 2 — Upload files
**Option A — via GitHub web (easiest)**
1. Open your new repository
2. Click **Add file → Upload files**
3. Drag and drop these 3 files:
   - `index.html`
   - `app.js`
   - `style.css`
4. Click **Commit changes**

**Option B — via Git (if you have Git installed)**
```bash
git init
git add index.html app.js style.css README.md
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/quotation-engine.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages
1. In your repository, click **Settings**
2. Click **Pages** (left sidebar)
3. Under **Source**, select `Deploy from a branch`
4. Branch: `main`, Folder: `/ (root)`
5. Click **Save**
6. Wait ~2 minutes, then visit:  
   `https://<your-username>.github.io/quotation-engine/`

---

## ⌨️ Keyboard Shortcuts
| Shortcut | Action |
|---|---|
| `Ctrl + S` | Save current client |
| `Ctrl + P` | Generate & download PDF |
| `Ctrl + Enter` | Switch to Preview tab |

---

## 💾 Client Storage
All client data is saved in your **browser's localStorage** — it stays even after closing the browser.  
Each client stores: all form data + PDF dimension settings from Admin Mode.

> ⚠️ Clearing browser data / cache will delete saved clients.
> To back up, use Save before clearing.

---

## 🔧 Admin Mode
Click the **⚙ Admin Mode** button in the sidebar to:
- **Drag & drop** section cards to reorder them
- **Adjust sliders** for every PDF dimension (font sizes, padding, logo size)
- Click **Apply & Preview** to see changes instantly
- Changes are saved when you **Save client**

---

## 📄 PDF Quality
The generated PDF uses:
- **4× canvas scale** (~288 DPI) for crisp text at any zoom
- **PNG lossless** encoding (no JPEG compression artefacts)  
- **IBM Plex Sans** + **Montserrat** + **Open Sans** fonts loaded from Google Fonts
- Canvas-drawn logo (no SVG font issues)

---

*Built with HTML · CSS · JavaScript · jsPDF · html2canvas*
