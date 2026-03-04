const fs = require('fs');
const path = require('path');

const ADAPT_ROOT = '/Users/williammacomber/Desktop/FDTS-Work-Project/documents/FDTS/FDTS_Adaptation_Files';
const DATA_FILE = '/Users/williammacomber/Desktop/Adaptation/src/data.json';

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// The user mentioned exactly 37 facilities across 20 ARTCCs.
// We will scan the ADAPT_ROOT for directories that look like facilities.
const list = fs.readdirSync(ADAPT_ROOT);
let addedCount = 0;

list.forEach(file => {
    const fullPath = path.join(ADAPT_ROOT, file);
    if (fs.statSync(fullPath).isDirectory() && file !== 'Archive' && file !== 'Tools' && file !== '_Definitions') {
        // e.g., 'ABQ', 'A80', 'PCT', 'NCT', 'SCT'
        // Some are groups like NCT/SFO_OAK. Let's just add the top-level ones if they are 3 chars
        let fac = file;

        if (fac.length >= 3) {
            // Check if it's not already in data.facilities
            let exists = false;
            Object.values(data.facilities).forEach(f => {
                if ((f.airports && f.airports.includes(fac.substring(0, 3))) || f.label.includes(fac)) {
                    exists = true;
                }
            });

            if (!data.facilities[fac] && !exists) {
                data.facilities[fac] = {
                    "label": fac,
                    "full_name": fac + " Facility",
                    "airports": [fac.substring(0, 3)],
                    "artcc": "TBD",
                    "latest_version": "1.00",
                    "latest_date": "2024-01-01",
                    "schema": "pcrcu"
                };
                addedCount++;
            }
        }
    }
});

// Since some facilities are nested (e.g., NCT/SJC, NCT/SFO_OAK), let's find all XMLs and extract their directory names.
function getFiles(dir, ext) {
    let results = [];
    try {
        const dlist = fs.readdirSync(dir);
        dlist.forEach(f => {
            const fPath = path.join(dir, f);
            if (fs.statSync(fPath).isDirectory()) {
                if (f !== 'Archive' && f !== 'Tools') {
                    results = results.concat(getFiles(fPath, ext));
                }
            } else if (f.endsWith(ext)) {
                results.push(fPath);
            }
        });
    } catch (e) { }
    return results;
}

const allXmls = getFiles(ADAPT_ROOT, '.xml');
allXmls.forEach(file => {
    const dirName = path.basename(path.dirname(file));
    // If it's not Archive, it's likely a facility name
    if (dirName !== 'Archive' && dirName.length >= 3 && dirName !== 'FDTS_Adaptation_Files') {
        let fac = dirName;
        // Some are like SFO_OAK, some are like ABQ
        let exists = false;
        Object.values(data.facilities).forEach(f => {
            if ((f.airports && f.airports.includes(fac.substring(0, 3))) || f.label.includes(fac)) {
                exists = true;
            }
        });
        if (!data.facilities[fac] && !exists) {
            data.facilities[fac] = {
                "label": fac,
                "full_name": fac + " Facility",
                "airports": [fac.substring(0, 3)],
                "artcc": "TBD",
                "latest_version": "1.00",
                "latest_date": "2024-01-01",
                "schema": "pcrcu"
            };
            addedCount++;
        }
    }
});

fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
console.log('Total facilities in data.json:', Object.keys(data.facilities).length);
console.log('Added new facilities:', addedCount);
