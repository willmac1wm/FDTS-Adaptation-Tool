const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const MDBReader = require('mdb-reader').default || require('mdb-reader');

const WATCH_DIR = '/Users/williammacomber/Desktop/FDTS/FDTS-Work-Project/documents/FDTS/EFSTS_Adaptation/Databases';
const OUTPUT_FILE = '/Users/williammacomber/Desktop/Adaptation/src/live_data.json';

console.log(`🚀 Starting FDTS Sync Service...`);
console.log(`👀 Watching: ${WATCH_DIR}`);

const emptyData = () => ({
    fileContext: { center: "", tracon: "", dateCreated: "" },
    roleIDs: [],
    fixes: [],
    departureAirports: [],
    aircraftLists: { recat: { name: "", aircraft: [] }, list1: { name: "Low Performance", aircraft: [] }, list2: { name: "High Performance", aircraft: [] }, list3: { name: "", aircraft: [] }, list4: { name: "", aircraft: [] } },
    printers: [],
    headings: [],
    altitudes: [],
    runways: [],
    aoi: [],
    configurations: [],
    starsPositions: [],
    starsExceptions: [],
});

async function parseMDB(filePath) {
    try {
        console.log(`📝 Parsing: ${filePath}...`);
        const buffer = fs.readFileSync(filePath);
        const mdb = new MDBReader(buffer);
        const tables = mdb.getTableNames();
        const newData = emptyData();

        const findTable = (patterns) => tables.find(t => patterns.some(p => t.toLowerCase().includes(p.toLowerCase())));

        // Load Printers
        const printerTable = findTable(["Printer", "Device", "tblPrinter", "fdtsPrinter"]);
        if (printerTable) {
            const rows = mdb.getTable(printerTable).getData();
            rows.forEach(row => {
                const name = row.DeviceName || row.PrinterName || row.Name || row.fdtsPrinter;
                if (name && !newData.printers.find(p => p.name === name)) {
                    newData.printers.push({
                        name: String(name),
                        backup: String(row.BackupDevice || row.Backup || row.BackupPrinter || ""),
                        siteID: String(row.SiteID || row.Site || "")
                    });
                }
            });
        }

        // Load Role IDs
        const roleTable = findTable(["Role", "Scan", "tblRole", "tfdmRole"]);
        if (roleTable) {
            const rows = mdb.getTable(roleTable).getData();
            rows.forEach(row => {
                const id = row.RoleID || row.tfdmRoleID || row.Scanner || row.Value;
                if (id && !newData.roleIDs.includes(String(id))) {
                    newData.roleIDs.push(String(id));
                }
            });
        }

        // Load Fixes
        const fixTable = findTable(["Fix", "AdaptedFix", "tblFix"]);
        if (fixTable) {
            const rows = mdb.getTable(fixTable).getData();
            rows.forEach(row => {
                const name = row.FixName || row.Name || row.Fix;
                if (name && !newData.fixes.find(f => f.name === name)) {
                    newData.fixes.push({
                        name: String(name),
                        altitude: String(row.FixAltitude || row.Altitude || ""),
                        acList: String(row.FixAcList || row.AcList || row.TypeAC || ""),
                        abbrv: String(row.FixAbbrv || row.Abbrv || ""),
                        font: String(row.FixFont || row.Font || ""),
                        box: String(row.FixBox || row.Box || "")
                    });
                }
            });
        }

        // 7. Load HEADINGS
        const headTable = findTable(["Heading", "tblHeading"]);
        if (headTable) {
            const rows = mdb.getTable(headTable).getData();
            rows.forEach(row => {
                const val = row.Value || row.Heading || row.Deg;
                if (val && !newData.headings.find(h => h.value === String(val))) {
                    newData.headings.push({
                        value: String(val),
                        abbrv: String(row.Abbrv || ""),
                        attribute: String(row.Attribute || row.Attr || ""),
                        font: String(row.Font || ""),
                        box: String(row.Box || "")
                    });
                }
            });
        }

        // 8. Load ALTITUDES
        const altTable = findTable(["Altitude", "tblAlt"]);
        if (altTable) {
            const rows = mdb.getTable(altTable).getData();
            rows.forEach(row => {
                const val = row.Value || row.Altitude || row.Alt;
                if (val && !newData.altitudes.find(a => a.value === String(val))) {
                    newData.altitudes.push({
                        value: String(val),
                        abbrv: String(row.Abbrv || ""),
                        font: String(row.Font || ""),
                        box: String(row.Box || "")
                    });
                }
            });
        }

        // 9. Load RUNWAYS
        const rwyTable = findTable(["Runway", "tblRunway", "tblRwy"]);
        if (rwyTable) {
            const rows = mdb.getTable(rwyTable).getData();
            rows.forEach(row => {
                const val = row.Value || row.Runway || row.Rwy;
                if (val && !newData.runways.find(r => r.value === String(val))) {
                    newData.runways.push({
                        value: String(val),
                        airport: String(row.Airport || row.Apt || ""),
                        abbrv: String(row.Abbrv || ""),
                        font: String(row.Font || ""),
                        box: String(row.Box || "")
                    });
                }
            });
        }

        // 10. Load AOI
        const aoiTable = findTable(["AOI", "AreaOfInterest", "tblAOI"]);
        if (aoiTable) {
            const rows = mdb.getTable(aoiTable).getData();
            rows.forEach(row => {
                const val = row.Value || row.AOI || row.Name;
                if (val && !newData.aoi.find(a => a.value === String(val))) {
                    newData.aoi.push({
                        value: String(val),
                        desc: String(row.Description || row.Desc || ""),
                        abbrv: String(row.Abbrv || ""),
                        font: String(row.Font || ""),
                        box: String(row.Box || "")
                    });
                }
            });
        }

        // 11. Load STARS
        const starsPosTable = findTable(["StarsPosition", "tblSTARS", "tblStarsPos"]);
        if (starsPosTable) {
            const rows = mdb.getTable(starsPosTable).getData();
            rows.forEach(row => {
                const pos = row.Position || row.Pos;
                if (pos && !newData.starsPositions.find(p => p.position === String(pos))) {
                    newData.starsPositions.push({
                        position: String(pos),
                        printer: String(row.Printer || row.Device || ""),
                        handoffEvent: String(row.HandoffEvent || ""),
                        enroutePriority: String(row.EnroutePriority || "")
                    });
                }
            });
        }

        const starsExcTable = findTable(["StarsException", "tblSTARSExc"]);
        if (starsExcTable) {
            const rows = mdb.getTable(starsExcTable).getData();
            rows.forEach(row => {
                const pos = row.Position || row.Pos;
                if (pos) {
                    newData.starsExceptions.push({
                        position: String(pos),
                        handoffSource: String(row.HandoffSource || row.Source || "")
                    });
                }
            });
        }

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ ...newData, lastSynced: new Date().toISOString() }, null, 2));
        console.log(`✅ Sync Complete: ${Object.keys(newData.fixes).length} fixes, ${newData.configurations.length} configs.`);
    } catch (err) {
        console.error(`❌ Sync Error [${path.basename(filePath)}]:`, err.message);
    }
}

// Watch for changes
const watcher = chokidar.watch(WATCH_DIR, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    depth: 3
});

watcher.on('change', (path) => {
    if (path.endsWith('.mdb') || path.endsWith('.accdb')) {
        parseMDB(path);
    }
});

// Initial scan of most recent file
const getMostRecentMDB = (dir) => {
    let mostRecent = null;
    const items = fs.readdirSync(dir);
    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            const subRecent = getMostRecentMDB(fullPath);
            if (subRecent) {
                if (!mostRecent || fs.statSync(subRecent).mtime > fs.statSync(mostRecent).mtime) {
                    mostRecent = subRecent;
                }
            }
        } else if (item.endsWith('.mdb') || item.endsWith('.accdb')) {
            if (!mostRecent || stats.mtime > fs.statSync(mostRecent).mtime) {
                mostRecent = fullPath;
            }
        }
    });
    return mostRecent;
};

const initialFile = getMostRecentMDB(WATCH_DIR);
if (initialFile) {
    parseMDB(initialFile);
}
