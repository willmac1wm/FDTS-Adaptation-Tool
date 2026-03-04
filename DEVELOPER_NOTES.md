# FDTS Adaptation Tool - Developer Guide

Welcome back! If you haven't looked at this repository in a few months, here is a quick overview of how the architecture works, where everything is stored, and how to safely make modifications without breaking the system.

## 🔗 Critical Links

- **Live Hosted App:** [fdts-adaptation-tool.netlify.app](https://fdts-adaptation-tool.netlify.app/)
- **GitHub Repository:** [github.com/willmac1wm/FDTS-Adaptation-Tool](https://github.com/willmac1wm/FDTS-Adaptation-Tool)
- **Local Application Dir:** `/Users/williammacomber/Desktop/Adaptation`
- **Core FDTS Files Directory:** `/Users/williammacomber/Desktop/FDTS-Work-Project`

---

## 🏗️ Architecture & Stack

- **Framework:** React + Vite
- **Styling:** Tailwind CSS + Vanilla CSS (`src/index.css`)
- **Hosting:** Netlify (Automated manual pushes via Netlify CLI)
- **Data Source:** This application uses a massive master configuration file located at `src/data.json` to define every facility rule and validation parameter.

---

## 📂 Key Files to Know

When you need to make fundamental changes, look at these files:

### 1. `src/App.jsx`

* **What it does:** The main application container. It loads the `data.json` file, renders the Sidebar, loads the active facility, handles the "XML Parsing" logic (reading uploaded XML text and converting it to React state), and manages the generic tab switching.

### 2. `src/ExtraTabs.jsx`

* **What it does:** Every single specialized tab (Fixes, Aircraft Lists, Stars, DVD Labels, Memorandums, Runways, AOI, Configurations, Notes) lives inside this file.
- **How to edit it:** If you ever need to add a new input field to the "Fixes" tab or change how the DVD printed PDF label looks, this is the exact file you want to edit. It contains individual React components like `<FixesTab />`, `<AircraftListsTab />`, `<ConfigTab />`, etc.

### 3. `src/data.json`

* **What it does:** Acts as the database. It contains your global validation rules (e.g., locking an airport code to 3 characters), the list of Open Issues, the contacts list for your routing printed memos, and the global matrix of the 37 available facilities.

### 4. `src/update_all_facilities.cjs`

* **What it does:** A Node.js backend script that automatically scans your hard drive (`FDTS-Work-Project/documents/FDTS_Adaptation_Files`) to dynamically discover new facility folders and automatically inject them into `src/data.json` so they appear on your dashboard.
- **How to run it:** `node src/update_all_facilities.cjs`

### 5. `create_data_package.sh` (Located on Desktop)

* **What it does:** If you need to re-train the Claude Project, you need to re-run this bash script from your terminal. It natively bypasses standard directory rules, grabs exclusively production, draft, and lab XMLs along with their routing Excel sheets, and deduplicates them to hit EXACTLY ~125 files so you can bypass Claude's size limits.
- **How to run it:** `bash /Users/williammacomber/Desktop/create_data_package.sh`

---

## 🚀 How to Make and Deploy an Update

Because you are using Netlify CLI directly, you deploy manually from your terminal when you are ready. You do NOT have continuous integration hooked up through GitHub on every save.

### Make your edits

1. `cd /Users/williammacomber/Desktop/Adaptation`
2. `npm run dev` (This spins up `http://localhost:5173` so you can visually see your code changes live).
3. Make your changes in `App.jsx` or `ExtraTabs.jsx`.

### Push to GitHub (For Backup)

1. `git add .`
2. `git commit -m "Describe what you changed"`
3. `git push origin master`

### Push to Netlify (To update the live web app)

1. Stop the `npm run dev` terminal by hitting Control+C.
2. Run `npm run build` (This optimizes your code into a `/dist` folder).
3. Run `netlify deploy --prod --dir=dist` (This instantly pushes your optimized folder up to the live website).

---

## 🚑 Troubleshooting

- **App loads as a completely blank white screen:** This usually means `vite-plugin-node-polyfills` got misconfigured in `vite.config.js`. You need the `buffer` module polyfilled so that the XML parsers don't crash the browser.
- **Missing a facility:** Run `node src/update_all_facilities.cjs` to rescan your hard drive and pull it into the dashboard.
- **Claude Project says "File too large":** Make sure you are uploading right straight from `FDTS_Claude_Project_Data.md` or making a fresh export with `create_data_package.sh` located on the Desktop. Use the Bash script, do not zip the folder manually!
