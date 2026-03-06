import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import MDBReader from "mdb-reader";
import appData from "./data.json";
import { FixesTab, HeadingsTab, AltitudesTab, RunwaysTab, AOITab, AircraftListsTab, ConfigurationsTab, STARSTab, MemoTab, DVDLabelTab } from "./ExtraTabs";

// ─── Constants & Validation Rules ────────────────────────────────────────────
const VALIDATION_RULES = {
  printer_name: { min: 1, max: 10, pattern: /^[a-zA-Z0-9_]*$/, desc: "1-10 alphanumeric + underscore" },
  fix_name: { min: 1, max: 25, desc: "1-25 chars" },
  role_id: { min: 1, max: 10, desc: "1-10 chars" },
  departure_airport: { len: 3, pattern: /^[A-Z]{3}$/, desc: "3-char IATA code" },
  runway_airport: { len: 4, pattern: /^[A-Z]{4}$/, desc: "4-char ICAO code" },
  aircraft_type: { min: 2, max: 4, pattern: /^[A-Z0-9]+$/, desc: "2-4 chars alphanumeric" },
  fix_ac_list: { allowed: ["", "1", "2", "3", "4"], desc: "List number 1-4 or empty" },
};

const BOX_OPTIONS = ["", "8A", "8B", "10", "11", "12", "13", "14", "15", "16", "17", "18", "F1"];
const FONT_OPTIONS = ["", "N", "L"];
const HEADING_ATTR_OPTIONS = ["", "NoTurn", "OnCourse"];
const AC_LIST_OPTIONS = ["", "1", "2", "3", "4"];

const TABS = ["Dashboard", "Overview", "Printers", "RoleIDs", "Fixes", "Aircraft Lists", "Headings", "Altitudes", "Runways", "AOI", "Configurations", "STARS", "Validation", "Export", "Memo", "DVD Label", "Issues", "Change Workflow", "Contacts", "Facilities", "Info"];

const INITIAL_FACILITIES = Object.entries(appData.facilities).map(([id, f]) => ({
  id,
  ...f
}));

const INITIAL_ISSUES = appData.open_issues;
const INITIAL_WORKFLOW = appData.change_workflow;
const INITIAL_CONTACTS = appData.contacts;
const INITIAL_ARTCCS = appData.artccs;

// ─── XML Parser ───────────────────────────────────────────────────────────────
function parseAdaptationXML(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const root = doc.documentElement;

  const getText = (el, tag) => {
    const found = el.querySelector(tag);
    return found ? found.textContent.trim() : "";
  };

  const data = {
    fileContext: {
      center: getText(root, "Center"),
      tracon: getText(root, "TRACON"),
      dateCreated: getText(root, "DateCreated"),
    },
    roleIDs: [],
    fixes: [],
    departureAirports: [],
    aircraftLists: { recat: { name: "", aircraft: [] }, list1: { name: "", aircraft: [] }, list2: { name: "", aircraft: [] }, list3: { name: "", aircraft: [] }, list4: { name: "", aircraft: [] } },
    printers: [],
    headings: [],
    altitudes: [],
    runways: [],
    aoi: [],
    configurations: [],
    starsPositions: [],
    starsExceptions: [],
  };

  root.querySelectorAll("AdaptedtfdmRoleID tfdmRoleID").forEach(el => data.roleIDs.push(el.textContent.trim()));
  root.querySelectorAll("AdaptedFix Fix").forEach(el => {
    data.fixes.push({
      name: el.textContent.trim(),
      altitude: el.getAttribute("FixAltitude") || "",
      abbrv: el.getAttribute("FixAbbrv") || "",
      acList: el.getAttribute("FixAcList") || "",
      font: el.getAttribute("FixFont") || "",
      box: el.getAttribute("FixBox") || "",
    });
  });

  root.querySelectorAll("AdaptedDepartureAirports DepAirport").forEach(el => data.departureAirports.push(el.textContent.trim()));

  const mapAcList = (tag, key) => {
    const el = root.querySelector(tag);
    if (el) {
      data.aircraftLists[key].name = el.getAttribute("ListName") || "";
      el.querySelectorAll("Aircraft").forEach(a => data.aircraftLists[key].aircraft.push(a.textContent.trim()));
    }
  };
  mapAcList("Recat_Unique_Aircraft", "recat");
  mapAcList("AircraftList_1", "list1");
  mapAcList("AircraftList_2", "list2");
  mapAcList("AircraftList_3", "list3");
  mapAcList("AircraftList_4", "list4");

  root.querySelectorAll("AdaptedPrinters fdtsPrinter").forEach(el => {
    data.printers.push({
      name: el.textContent.trim(),
      backup: el.getAttribute("Backup") || "",
      siteID: el.getAttribute("SiteID") || "",
    });
  });

  root.querySelectorAll("AdaptedHeadings fdtsHeading").forEach(el => {
    data.headings.push({
      value: el.textContent.trim(),
      abbrv: el.getAttribute("HeadingAbbrv") || el.textContent.trim(),
      attribute: el.getAttribute("HeadingAttribute") || "",
      font: el.getAttribute("HeadingFont") || "",
      box: el.getAttribute("HeadingBox") || "",
    });
  });

  root.querySelectorAll("AdaptedAltitudes fdtsAltitude").forEach(el => {
    data.altitudes.push({
      value: el.textContent.trim(),
      abbrv: el.getAttribute("AltitudeAbbrv") || el.textContent.trim(),
      font: el.getAttribute("AltitudeFont") || "",
      box: el.getAttribute("AltitudeBox") || "",
    });
  });

  root.querySelectorAll("AdaptedRunways fdtsRunway").forEach(el => {
    data.runways.push({
      value: el.textContent.trim(),
      airport: el.getAttribute("Airport") || "",
      abbrv: el.getAttribute("RunwayAbbrv") || el.textContent.trim(),
      font: el.getAttribute("RunwayFont") || "",
      box: el.getAttribute("RunwayBox") || "",
    });
  });

  root.querySelectorAll("AdaptedAOI AOI").forEach(el => {
    if (el.getAttribute("AOIAbbrv") !== null) {
      data.aoi.push({
        value: el.textContent.trim(),
        desc: el.getAttribute("AOIDesc") || "",
        abbrv: el.getAttribute("AOIAbbrv") || "",
        font: el.getAttribute("AOIFont") || "",
        box: el.getAttribute("AOIBox") || "",
      });
    } else {
      data.aoi.push({
        value: getText(el, "fdtsAOIAbbreviation"),
        desc: getText(el, "fdtsAOIDescription"),
        abbrv: getText(el, "fdtsAOIAbbreviation"),
        font: "",
        box: "",
      });
    }
  });

  root.querySelectorAll("AdaptedConfigurations fdtsConfiguration").forEach(el => {
    const nameEl = el.querySelector("ConfigurationName");
    const entries = [];
    el.querySelectorAll("RoutingEntry").forEach(re => {
      entries.push({
        depAirport: re.getAttribute("DepartureAirport") || "",
        roleID: re.getAttribute("tfdmRoleID") || "",
        fix: re.getAttribute("Fix") || "",
        altRange: re.getAttribute("AltitudeRange") || "",
        acList: re.getAttribute("RouteAcList") || "",
        printer1: re.getAttribute("fdtsPrinter1") || "",
        printer2: re.getAttribute("fdtsPrinter2") || "",
      });
    });
    data.configurations.push({
      name: nameEl ? nameEl.textContent.trim() : "",
      isDefault: nameEl ? (nameEl.getAttribute("Default") === "true") : false,
      description: getText(el, "ConfigurationDescription"),
      entries,
    });
  });

  root.querySelectorAll("AdaptedStarsPositions Position").forEach(el => {
    data.starsPositions.push({
      position: el.textContent.trim(),
      printer: el.getAttribute("Printer") || "",
      handoffEvent: el.getAttribute("HandoffEvent") || "",
      enroutePriority: el.getAttribute("EnroutePriority") || "",
    });
  });
  root.querySelectorAll("AdaptedStarsExceptions Exception").forEach(el => {
    data.starsExceptions.push({
      position: el.textContent.trim(),
      handoffSource: el.getAttribute("HandoffSource") || "",
    });
  });

  return data;
}

// ─── Validation Engine ────────────────────────────────────────────────────────
function validateData(data) {
  const errors = [];
  const warnings = [];

  // FileContext
  if (!data.fileContext.center) errors.push("FileContext: Center (ARTCC) is required");
  if (!data.fileContext.tracon) errors.push("FileContext: TRACON is required");

  // Printers
  data.printers.forEach((p, i) => {
    if (p.name.length < VALIDATION_RULES.printer_name.min || p.name.length > VALIDATION_RULES.printer_name.max) {
      errors.push(`Printer ${i + 1}: Name "${p.name}" must be ${VALIDATION_RULES.printer_name.desc}`);
    }
    if (!VALIDATION_RULES.printer_name.pattern.test(p.name)) {
      errors.push(`Printer ${i + 1}: Name "${p.name}" contains invalid characters`);
    }
  });

  // Role IDs
  data.roleIDs.forEach((r, i) => {
    if (r.length < VALIDATION_RULES.role_id.min || r.length > VALIDATION_RULES.role_id.max) {
      errors.push(`Role ID ${i + 1}: "${r}" must be ${VALIDATION_RULES.role_id.desc}`);
    }
  });

  // Fixes
  data.fixes.forEach((f, i) => {
    if (f.name.length < VALIDATION_RULES.fix_name.min || f.name.length > VALIDATION_RULES.fix_name.max) {
      errors.push(`Fix ${i + 1}: Name "${f.name}" must be ${VALIDATION_RULES.fix_name.desc}`);
    }
    if (f.acList && !VALIDATION_RULES.fix_ac_list.allowed.includes(f.acList)) {
      errors.push(`Fix "${f.name}": AC List "${f.acList}" must be 1, 2, 3, or 4`);
    }
  });

  // Departure Airports
  data.departureAirports.forEach((a, i) => {
    if (a.length !== VALIDATION_RULES.departure_airport.len || !VALIDATION_RULES.departure_airport.pattern.test(a)) {
      errors.push(`Departure Airport ${i + 1}: "${a}" must be ${VALIDATION_RULES.departure_airport.desc}`);
    }
  });

  // Configurations
  const configWithDefault = data.configurations.filter(c => c.isDefault).length;
  if (configWithDefault > 1) errors.push("Configurations: Only ONE config can have Default='true'");
  if (configWithDefault === 0 && data.configurations.length > 0) {
    warnings.push("Configurations: No default config set — first config will be treated as default");
  }

  data.configurations.forEach((cfg, ci) => {
    if (!cfg.name) errors.push(`Config ${ci + 1}: Configuration name is required`);
    if (cfg.entries.length === 0) warnings.push(`Config "${cfg.name}": Has no routing entries`);

    cfg.entries.forEach((e, ei) => {
      if (e.depAirport && e.depAirport.length !== VALIDATION_RULES.departure_airport.len) {
        errors.push(`Config "${cfg.name}" Entry ${ei + 1}: Departure airport "${e.depAirport}" must be ${VALIDATION_RULES.departure_airport.desc}`);
      }
      if (e.acList && !VALIDATION_RULES.fix_ac_list.allowed.includes(e.acList)) {
        errors.push(`Config "${cfg.name}" Entry ${ei + 1}: AC List must be 1, 2, 3, or 4`);
      }
      if (!e.printer1) warnings.push(`Config "${cfg.name}" Entry ${ei + 1}: No primary printer specified`);
    });
  });

  // Runway airports
  data.runways.forEach((r, i) => {
    if (r.airport.length !== VALIDATION_RULES.runway_airport.len || !VALIDATION_RULES.runway_airport.pattern.test(r.airport)) {
      warnings.push(`Runway ${i + 1}: Airport "${r.airport}" should be ${VALIDATION_RULES.runway_airport.desc}`);
    }
  });

  return { errors, warnings, isValid: errors.length === 0 };
}

// ─── XML Generator ────────────────────────────────────────────────────────────
function generateXML(data) {
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const now = new Date().toISOString().replace("Z", "-04:00");

  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  xml += `<!-- Date Created: ${now} -->\n`;
  xml += `<fdtsadapt:fdtsAdaptation xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:fdtsadapt="http://www.faa.aero/nas/fdtsadapt">\n`;

  xml += `    <FileContextData>\n`;
  xml += `        <Center>${esc(data.fileContext.center)}</Center>\n`;
  xml += `        <TRACON>${esc(data.fileContext.tracon)}</TRACON>\n`;
  xml += `        <DateCreated>${now}</DateCreated>\n`;
  xml += `    </FileContextData>\n`;

  if (data.roleIDs.length > 0) {
    xml += `    <AdaptedtfdmRoleID>\n`;
    data.roleIDs.forEach(r => { xml += `        <tfdmRoleID>${esc(r)}</tfdmRoleID>\n`; });
    xml += `    </AdaptedtfdmRoleID>\n`;
  }

  if (data.fixes.length > 0) {
    xml += `    <AdaptedFix>\n`;
    data.fixes.forEach(f => {
      xml += `        <Fix FixAltitude="${esc(f.altitude)}" FixAbbrv="${esc(f.abbrv)}" FixAcList="${esc(f.acList)}" FixFont="${esc(f.font)}" FixBox="${esc(f.box)}">${esc(f.name)}</Fix>\n`;
    });
    xml += `    </AdaptedFix>\n`;
  }

  if (data.departureAirports.length > 0) {
    xml += `    <AdaptedDepartureAirports>\n`;
    data.departureAirports.forEach(a => { xml += `        <DepAirport>${esc(a)}</DepAirport>\n`; });
    xml += `    </AdaptedDepartureAirports>\n`;
  }

  xml += `    <AdaptedAircraftLists>\n`;
  const acListKeys = [["recat", "Recat_Unique_Aircraft"], ["list1", "AircraftList_1"], ["list2", "AircraftList_2"], ["list3", "AircraftList_3"], ["list4", "AircraftList_4"]];
  acListKeys.forEach(([key, tag]) => {
    const lst = data.aircraftLists[key];
    if (lst.aircraft.length > 0 || lst.name) {
      xml += `        <${tag} ListName="${esc(lst.name)}">\n`;
      lst.aircraft.forEach(a => { xml += `            <Aircraft>${esc(a)}</Aircraft>\n`; });
      xml += `        </${tag}>\n`;
    }
  });
  xml += `    </AdaptedAircraftLists>\n`;

  if (data.printers.length > 0) {
    xml += `    <AdaptedPrinters>\n`;
    data.printers.forEach(p => {
      xml += `        <fdtsPrinter Backup="${esc(p.backup)}">${esc(p.name)}</fdtsPrinter>\n`;
    });
    xml += `    </AdaptedPrinters>\n`;
  }

  if (data.headings.length > 0) {
    xml += `    <AdaptedHeadings>\n`;
    data.headings.forEach(h => {
      xml += `        <fdtsHeading HeadingAbbrv="${esc(h.abbrv)}" HeadingAttribute="${esc(h.attribute)}" HeadingFont="${esc(h.font)}" HeadingBox="${esc(h.box)}">${esc(h.value)}</fdtsHeading>\n`;
    });
    xml += `    </AdaptedHeadings>\n`;
  }

  if (data.altitudes.length > 0) {
    xml += `    <AdaptedAltitudes>\n`;
    data.altitudes.forEach(a => {
      xml += `        <fdtsAltitude AltitudeAbbrv="${esc(a.abbrv)}" AltitudeFont="${esc(a.font)}" AltitudeBox="${esc(a.box)}">${esc(a.value)}</fdtsAltitude>\n`;
    });
    xml += `    </AdaptedAltitudes>\n`;
  }

  if (data.runways.length > 0) {
    xml += `    <AdaptedRunways>\n`;
    data.runways.forEach(r => {
      xml += `        <fdtsRunway Airport="${esc(r.airport)}" RunwayAbbrv="${esc(r.abbrv)}" RunwayFont="${esc(r.font)}" RunwayBox="${esc(r.box)}">${esc(r.value)}</fdtsRunway>\n`;
    });
    xml += `    </AdaptedRunways>\n`;
  }

  if (data.aoi.length > 0) {
    xml += `    <AdaptedAOI>\n`;
    data.aoi.forEach(a => {
      xml += `        <AOI AOIDesc="${esc(a.desc)}" AOIAbbrv="${esc(a.abbrv)}" AOIFont="${esc(a.font)}" AOIBox="${esc(a.box)}">${esc(a.value)}</AOI>\n`;
    });
    xml += `    </AdaptedAOI>\n`;
  }

  xml += `    <AdaptedConfigurations>\n`;
  data.configurations.forEach(cfg => {
    xml += `        <fdtsConfiguration>\n`;
    xml += `            <ConfigurationName Default="${cfg.isDefault ? "true" : "false"}">${esc(cfg.name)}</ConfigurationName>\n`;
    xml += `            <ConfigurationDescription>${esc(cfg.description)}</ConfigurationDescription>\n`;
    xml += `            <ConfigurationRouting>\n`;
    cfg.entries.forEach(e => {
      xml += `                <RoutingEntry DepartureAirport="${esc(e.depAirport)}" tfdmRoleID="${esc(e.roleID)}" Fix="${esc(e.fix)}" AltitudeRange="${esc(e.altRange)}" RouteAcList="${esc(e.acList)}" fdtsPrinter1="${esc(e.printer1)}" fdtsPrinter2="${esc(e.printer2)}"></RoutingEntry>\n`;
    });
    xml += `            </ConfigurationRouting>\n`;
    xml += `        </fdtsConfiguration>\n`;
  });
  xml += `    </AdaptedConfigurations>\n`;

  if (data.starsPositions.length > 0 || data.starsExceptions.length > 0) {
    xml += `    <AdaptedStars>\n`;
    if (data.starsPositions.length > 0) {
      xml += `        <AdaptedStarsPositions>\n`;
      data.starsPositions.forEach(p => {
        xml += `            <Position Printer="${esc(p.printer)}" HandoffEvent="${esc(p.handoffEvent)}"${p.enroutePriority ? ` EnroutePriority="${esc(p.enroutePriority)}"` : ""}>${esc(p.position)}</Position>\n`;
      });
      xml += `        </AdaptedStarsPositions>\n`;
    }
    if (data.starsExceptions.length > 0) {
      xml += `        <AdaptedStarsExceptions>\n`;
      data.starsExceptions.forEach(e => {
        xml += `            <Exception HandoffSource="${esc(e.handoffSource)}">${esc(e.position)}</Exception>\n`;
      });
      xml += `        </AdaptedStarsExceptions>\n`;
    }
    xml += `    </AdaptedStars>\n`;
  }

  xml += `</fdtsadapt:fdtsAdaptation>`;
  return xml;
}

// ─── Empty/Default State ──────────────────────────────────────────────────────
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

// ─── Dashboard Components ───────────────────────────────────────────────────

function DashboardOverview({ facilities, artccs, onLoad }) {
  const groups = useMemo(() => {
    const g = {};
    facilities.forEach(f => {
      const center = f.artcc || "UNKNOWN";
      if (!g[center]) g[center] = [];
      g[center].push(f);
    });
    return g;
  }, [facilities]);

  return (
    <div className="space-y-8 pb-20">
      {Object.entries(groups).map(([artccId, facs]) => {
        const center = artccs[artccId] || { name: artccId, location: "" };
        return (
          <div key={artccId} className="center-group">
            <div className="flex items-center gap-4 mb-6 border-b border-slate-700/50 pb-3">
              <span className="bg-blue-900/40 text-blue-400 border border-blue-700/50 px-2 py-1 rounded text-xs font-bold font-mono">{artccId}</span>
              <h2 className="text-xl font-bold text-slate-100">{center.name}</h2>
              <span className="text-sm text-slate-400 font-mono italic">{center.location}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {facs.map(f => (
                <div key={f.id} onClick={() => onLoad(f)} className="group relative bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-900/20 glass">
                  <div className="absolute top-4 right-4 bg-green-900/40 text-green-400 text-[10px] px-2 py-0.5 rounded border border-green-700/50 uppercase font-bold tracking-tight">Live</div>
                  <h3 className="text-lg font-bold text-slate-100 mb-1 leading-tight group-hover:text-blue-400 transition-colors">{f.full_name || f.label}</h3>
                  <div className="text-xs font-semibold text-blue-400 mb-4 font-mono">{f.label}</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Airports:</span> <span className="text-slate-300">{f.airports.join(", ")}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Version:</span> <span className="text-slate-300">{f.latest_version}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Date:</span> <span className="text-slate-300">{f.latest_date}</span></div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-700/30 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-mono opacity-60 uppercase">{f.schema}</span>
                    <span className="text-[10px] text-blue-400 group-hover:underline italic">Load Editor →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IssuesTab({ issues }) {
  return (
    <div className="space-y-4">
      {issues.map(issue => (
        <div key={issue.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 flex justify-between items-center group hover:border-slate-600 transition-colors">
          <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${issue.type === 'Software' ? 'bg-rose-500' : 'bg-amber-500'} shadow-[0_0_8px_rgba(244,63,94,0.4)]`}></div>
            <div>
              <h4 className="text-slate-200 font-semibold text-sm">{issue.title}</h4>
              <p className="text-xs text-slate-500">{issue.facility} • {issue.date}</p>
            </div>
          </div>
          <Badge color={issue.status === 'Open' ? 'red' : 'amber'}>{issue.status}</Badge>
        </div>
      ))}
    </div>
  );
}

function WorkflowTab({ steps }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-8">
      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-4 items-start">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-900/50 text-blue-400 border border-blue-700/50 flex items-center justify-center text-xs font-bold font-mono">{i + 1}</span>
            <span className="text-sm text-slate-300 leading-relaxed pt-1.5">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ContactsTab({ contacts }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(contacts).map(([name, info]) => (
        <div key={name} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5 font-mono group hover:border-blue-500/50 transition-colors">
          <h3 className="text-blue-400 font-bold text-xs mb-3 uppercase tracking-wider">{name.replace(/_/g, ' ')}</h3>
          <p className="text-xs text-slate-300 mb-1.5 flex justify-between"><span className="text-slate-500">ROLE:</span> <span className="text-right">{info.role || 'N/A'}</span></p>
          <p className="text-xs text-slate-300 flex justify-between"><span className="text-slate-500">EMAIL:</span> <span className="text-right">{info.email || 'N/A'}</span></p>
        </div>
      ))}
    </div>
  );
}

function InfoTab() {
  return (
    <div className="space-y-8 pb-20">
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-8 glass">
        <h2 className="text-2xl font-bold text-blue-400 mb-6 flex items-center gap-3">
          <span className="p-2 bg-blue-900/30 rounded-lg">📖</span>
          System Documentation Hub
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <section>
              <h3 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                System Flow (End-to-End)
              </h3>
              <ol className="space-y-3">
                {[
                  "National Dashboard: Unified view of all facility adapts.",
                  "Facility Context: Loading ZDC/PCT/IAD etc. into memory.",
                  "XML Validation: Real-time checks against FAA policy.",
                  "Export Engine: Clean XML serialization for production.",
                  "Safety Guardrails: Pre-export check to prevent data corruption."
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-300">
                    <span className="text-blue-500 font-mono font-bold">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-green-500 rounded-full"></span>
                AI Independence & Security
              </h3>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                <p className="text-sm text-slate-300 leading-relaxed">
                  This tool operates **100% independently** of AI once deployed. All validation
                  logic is rule-based and resides in the local browser context. No data is sent
                  to external LLMs for processing, ensuring full compliance with secure NAS environments.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                MDB to FDTS Workflow
              </h3>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                <p className="text-[11px] text-slate-400 mb-2 font-mono uppercase tracking-wider">Step-by-Step Conversion:</p>
                <ol className="space-y-2 text-xs text-slate-300">
                  <li className="flex gap-2">
                    <span className="text-purple-400 font-bold">1.</span>
                    <span>Open <strong>.mdb</strong> file in Microsoft Access.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400 font-bold">2.</span>
                    <span>Export relevant tables (Fixes, Printers, etc.) to <strong>Excel (.xlsx)</strong>.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400 font-bold">3.</span>
                    <span>Map data to the <strong>FDTS Worksheet Template</strong> columns.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400 font-bold">4.</span>
                    <span>Use the <strong>"Import Worksheet"</strong> button in this tool to ingest.</span>
                  </li>
                </ol>
              </div>
            </section>
          </div>

          <section>
            <h3 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
              Excel Import Mapping (Source of Truth)
            </h3>
            <div className="bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700/30">
              <table className="w-full text-[10px] text-left">
                <thead className="bg-slate-800 text-slate-400">
                  <tr>
                    <th className="p-2 border-b border-slate-700">Worksheet Column</th>
                    <th className="p-2 border-b border-slate-700">XML Tag / Field</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300 divide-y divide-slate-700/30">
                  {[
                    ["Departure Point", "DepartureAirport"],
                    ["Scanner", "tfdmRoleID"],
                    ["Fix Name", "Fix"],
                    ["Altitude", "AltitudeRange"],
                    ["Printer #1 / #2", "fdtsPrinter1 / 2"]
                  ].map(([ws, xml]) => (
                    <tr key={ws} className="hover:bg-slate-800/20">
                      <td className="p-2 font-semibold text-amber-400/80">{ws}</td>
                      <td className="p-2 font-mono">{xml}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ children, color = "blue" }) {
  const colors = {
    blue: "bg-blue-900 text-blue-200 border-blue-700",
    green: "bg-green-900 text-green-200 border-green-700",
    amber: "bg-amber-900 text-amber-200 border-amber-700",
    red: "bg-red-900 text-red-200 border-red-700",
    slate: "bg-slate-700 text-slate-200 border-slate-600",
  };
  return <span className={`inline-block text-xs px-2 py-0.5 rounded border font-mono ${colors[color]}`}>{children}</span>;
}

function SectionHeader({ title, count, onAdd }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h2 className="text-slate-100 font-semibold text-sm uppercase tracking-widest">{title}</h2>
        {count !== undefined && <Badge color="slate">{count}</Badge>}
      </div>
      {onAdd && (
        <button onClick={onAdd} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-white transition-colors font-mono">
          + Add
        </button>
      )}
    </div>
  );
}

function Input({ value, onChange, placeholder, className = "", ...props }) {
  return (
    <input
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`bg-slate-800 border border-slate-600 text-slate-100 text-xs rounded px-2 py-1.5 w-full focus:outline-none focus:border-blue-500 font-mono placeholder-slate-500 ${className}`}
      {...props}
    />
  );
}

function Select({ value, onChange, options, className = "" }) {
  return (
    <select
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      className={`bg-slate-800 border border-slate-600 text-slate-100 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 font-mono ${className}`}
    >
      {options.map(o => <option key={o} value={o}>{o || "—"}</option>)}
    </select>
  );
}

function DeleteBtn({ onClick }) {
  return (
    <button onClick={onClick} className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-red-900/30 transition-colors font-mono">✕</button>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function OverviewTab({ data, setData }) {
  const { fileContext } = data;
  const update = (field, val) => setData(d => ({ ...d, fileContext: { ...d.fileContext, [field]: val } }));

  const stats = [
    { label: "Fixes", val: data.fixes.length, max: 1000 },
    { label: "Headings", val: data.headings.length, max: 1080 },
    { label: "Altitudes", val: data.altitudes.length, max: 50 },
    { label: "Runways", val: data.runways.length, max: 30 },
    { label: "Printers", val: data.printers.length, max: 50 },
    { label: "AOI", val: data.aoi.length, max: 50 },
    { label: "Role IDs", val: data.roleIDs.length, max: 50 },
    { label: "Configs", val: data.configurations.length, max: 99 },
    { label: "Routing Entries", val: data.configurations.reduce((s, c) => s + c.entries.length, 0), max: 2000 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
        <SectionHeader title="File Context" />
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-xs text-slate-400 block mb-1">Center (ARTCC)</label><Input value={fileContext.center} onChange={v => update("center", v)} placeholder="ZDC" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">TRACON</label><Input value={fileContext.tracon} onChange={v => update("tracon", v)} placeholder="RDU" /></div>
          <div><label className="text-xs text-slate-400 block mb-1">Date Created</label><Input value={fileContext.dateCreated} onChange={v => update("dateCreated", v)} placeholder="auto-generated on export" /></div>
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
        <SectionHeader title="Adaptation Summary" />
        <div className="grid grid-cols-3 gap-3">
          {stats.map(s => (
            <div key={s.label} className="bg-slate-700/40 rounded p-3">
              <div className="text-2xl font-mono font-bold text-blue-400">{s.val}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
              <div className="mt-1 bg-slate-600 rounded-full h-1">
                <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${Math.min(100, (s.val / s.max) * 100)}%` }} />
              </div>
              <div className="text-xs text-slate-500 mt-0.5">max {s.max}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── VALIDATION TAB (NEW) ──────────────────────────────────────────────────────
function ValidationTab({ data }) {
  const validation = validateData(data);

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
        <SectionHeader title="Pre-Export Validation" />
        <div className="text-xs text-slate-400 mb-4">Review all validation errors and warnings before exporting. Errors must be fixed; warnings are advisory.</div>

        {validation.isValid ? (
          <div className="bg-green-900/40 border border-green-700 text-green-300 rounded p-3 text-sm font-mono">
            ✓ All validation checks passed! Ready to export.
          </div>
        ) : (
          <div className="space-y-3">
            {validation.errors.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-red-400 mb-2">🚫 ERRORS ({validation.errors.length}) — Must Fix Before Export</div>
                <div className="space-y-2">
                  {validation.errors.map((err, i) => (
                    <div key={i} className="bg-red-900/40 border border-red-700 text-red-300 rounded p-2 text-xs font-mono">
                      {err}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-amber-400 mb-2">⚠️  WARNINGS ({validation.warnings.length}) — Advisory</div>
                <div className="space-y-2">
                  {validation.warnings.map((warn, i) => (
                    <div key={i} className="bg-amber-900/40 border border-amber-700 text-amber-300 rounded p-2 text-xs font-mono">
                      {warn}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
        <SectionHeader title="Validation Rules Reference" />
        <div className="space-y-2 text-xs text-slate-300">
          {Object.entries(VALIDATION_RULES).map(([key, rule]) => (
            <div key={key} className="bg-slate-700/30 rounded p-2 flex justify-between">
              <span className="font-mono font-bold text-blue-400">{key}:</span>
              <span>{rule.desc || JSON.stringify(rule)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FACILITIES TAB (NEW) ──────────────────────────────────────────────────────
function FacilitiesTab({ facilities, setFacilities, setData, setActiveTab }) {
  const [newFacility, setNewFacility] = useState({
    id: "",
    label: "",
    center: "ZDC",
    airports: "",
    schema: "pcrcu",
  });

  const addFacility = () => {
    if (!newFacility.id || !newFacility.label) {
      alert("ID and Label are required");
      return;
    }
    const airports = newFacility.airports.split(",").map(a => a.trim()).filter(a => a);
    setFacilities(f => [...f, { ...newFacility, airports }]);
    setNewFacility({ id: "", label: "", center: "ZDC", airports: "", schema: "pcrcu" });
  };

  const removeFacility = (id) => {
    setFacilities(f => f.filter(fac => fac.id !== id));
  };

  const loadFacility = (facility) => {
    setData(emptyData());
    setData(d => ({
      ...d,
      fileContext: { ...d.fileContext, center: facility.center, tracon: facility.label },
    }));
    setActiveTab("Overview");
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
        <SectionHeader title="Registered Facilities" count={facilities.length} />
        <div className="text-xs text-slate-400 mb-4">Register FAA facilities to quickly switch context. Each facility is a separate adaptation file.</div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-400 block">Facility ID (e.g. PCTa, RDU)</label>
            <Input value={newFacility.id} onChange={v => setNewFacility(f => ({ ...f, id: v.toUpperCase() }))} placeholder="PCTa" />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-400 block">Facility Label</label>
            <Input value={newFacility.label} onChange={v => setNewFacility(f => ({ ...f, label: v }))} placeholder="PCT-IAD" />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-400 block">Center (ARTCC)</label>
            <Input value={newFacility.center} onChange={v => setNewFacility(f => ({ ...f, center: v }))} placeholder="ZDC" />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-400 block">Airports (comma-separated)</label>
            <Input value={newFacility.airports} onChange={v => setNewFacility(f => ({ ...f, airports: v }))} placeholder="IAD, DCA" />
          </div>
        </div>
        <button onClick={addFacility} className="text-xs px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded font-mono">+ Register Facility</button>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
        <SectionHeader title="Your Facilities" />
        <div className="grid grid-cols-1 gap-3">
          {facilities.map(fac => (
            <div key={fac.id} className="bg-slate-700/40 border border-slate-600 rounded p-3 flex items-center justify-between">
              <div className="flex-1">
                <div className="font-mono font-bold text-blue-400">{fac.label}</div>
                <div className="text-xs text-slate-400">{fac.center} • {fac.airports.join(", ")}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => loadFacility(fac)} className="text-xs px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded font-mono">Load</button>
                <button onClick={() => removeFacility(fac.id)} className="text-xs px-2 py-1 text-red-400 hover:text-red-300">✕</button>
              </div>
            </div>
          ))}
          {facilities.length === 0 && <div className="text-slate-500 text-xs text-center py-4">No facilities registered</div>}
        </div>
      </div>
    </div>
  );
}

// ─── EXPORT TAB (ENHANCED) ────────────────────────────────────────────────────
function ExportTab({ data, facilities }) {
  const [xml, setXml] = useState("");
  const [validated, setValidated] = useState(null);
  const [exportStatus, setExportStatus] = useState(null);

  const validation = validateData(data);

  const generate = () => {
    if (!validation.isValid) {
      setExportStatus({ ok: false, msg: "⚠️  Fix validation errors before exporting" });
      return;
    }

    try {
      const out = generateXML(data);
      setXml(out);
      const parser = new DOMParser();
      const doc = parser.parseFromString(out, "application/xml");
      const err = doc.querySelector("parsererror");
      setValidated(err ? { ok: false, msg: err.textContent } : { ok: true, msg: "XML is well-formed ✓" });
      setExportStatus({ ok: true, msg: "✓ XML generated successfully" });
    } catch (e) {
      setValidated({ ok: false, msg: e.message });
      setExportStatus({ ok: false, msg: `Generation error: ${e.message}` });
    }
  };

  const download = () => {
    const tracon = data.fileContext.tracon || "FACILITY";
    const center = data.fileContext.center || "ZDC";
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const blob = new Blob([xml], { type: "application/xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tracon}_FDTS_PCRCU_Adaptation_${date}.xml`;
    a.click();
  };

  const getFilename = () => {
    const tracon = data.fileContext.tracon || "FACILITY";
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `${tracon}_FDTS_PCRCU_Adaptation_${date}.xml`;
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
        <SectionHeader title="Pre-Export Checklist" />
        <div className="space-y-2 text-xs font-mono">
          <div className={`flex items-center gap-2 ${data.fileContext.center ? "text-green-400" : "text-red-400"}`}>
            <span>{data.fileContext.center ? "✓" : "✗"}</span> Center (ARTCC) is set
          </div>
          <div className={`flex items-center gap-2 ${data.fileContext.tracon ? "text-green-400" : "text-red-400"}`}>
            <span>{data.fileContext.tracon ? "✓" : "✗"}</span> TRACON/Facility is set
          </div>
          <div className={`flex items-center gap-2 ${data.configurations.length > 0 ? "text-green-400" : "text-red-400"}`}>
            <span>{data.configurations.length > 0 ? "✓" : "✗"}</span> At least one configuration exists ({data.configurations.length})
          </div>
          <div className={`flex items-center gap-2 ${data.configurations.filter(c => c.isDefault).length === 1 ? "text-green-400" : "text-amber-400"}`}>
            <span>{data.configurations.filter(c => c.isDefault).length === 1 ? "✓" : "?"}</span> Exactly one default config
          </div>
          <div className={`flex items-center gap-2 ${!validation.isValid ? "text-red-400" : "text-green-400"}`}>
            <span>{!validation.isValid ? "✗" : "✓"}</span> All validation checks pass
          </div>
        </div>

        <div className="mt-4 p-3 bg-slate-700/30 rounded text-xs text-slate-300 font-mono">
          <strong>Proposed filename:</strong> {getFilename()}
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
        <SectionHeader title="Generate & Export XML" />
        <div className="flex gap-3 mb-4">
          <button onClick={generate} disabled={!validation.isValid} className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white text-sm rounded font-mono transition-colors">
            Generate XML
          </button>
          {xml && <button onClick={download} className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm rounded font-mono transition-colors">⬇ Download XML</button>}
          {xml && <button onClick={() => navigator.clipboard.writeText(xml)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded font-mono transition-colors">Copy to Clipboard</button>}
        </div>
        {exportStatus && (
          <div className={`text-xs px-3 py-2 rounded mb-3 font-mono ${exportStatus.ok ? "bg-green-900/40 text-green-300 border border-green-700" : "bg-red-900/40 text-red-300 border border-red-700"}`}>
            {exportStatus.msg}
          </div>
        )}
        {validated && (
          <div className={`text-xs px-3 py-2 rounded mb-3 font-mono ${validated.ok ? "bg-green-900/40 text-green-300 border border-green-700" : "bg-red-900/40 text-red-300 border border-red-700"}`}>
            {validated.msg}
          </div>
        )}
        {xml && (
          <textarea readOnly value={xml} className="w-full h-96 bg-slate-900 border border-slate-600 text-slate-300 text-xs rounded p-3 font-mono resize-none focus:outline-none" />
        )}
      </div>
    </div>
  );
}

// ─── Placeholder Tabs ──────────────────────────────────────────────────────────
// (Printers, RoleIDs, Fixes, Aircraft Lists, Headings, Altitudes, Runways, AOI, Configurations, STARS, Memo, DVD Label, Issues, Compare)
// Using original implementations from FDTS_Adaptation_Tool.jsx — abbreviated here for space

function PrintersTab({ data, setData }) {
  const printers = data.printers;
  const update = (i, field, val) => setData(d => { const p = [...d.printers]; p[i] = { ...p[i], [field]: val }; return { ...d, printers: p }; });
  const add = () => setData(d => ({ ...d, printers: [...d.printers, { name: "", backup: "", siteID: "" }] }));
  const remove = i => setData(d => ({ ...d, printers: d.printers.filter((_, j) => j !== i) }));

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
      <SectionHeader title="FDTS Printers" count={printers.length} onAdd={add} />
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-700">
            <th className="pb-2 font-normal">Printer Name</th>
            <th className="pb-2 font-normal">Backup Printer</th>
            <th className="pb-2 font-normal">Site ID</th>
            <th className="pb-2 w-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {printers.map((p, i) => (
            <tr key={i} className="group">
              <td className="py-1 pr-2"><Input value={p.name} onChange={v => update(i, "name", v)} placeholder="NDR" /></td>
              <td className="py-1 pr-2"><Input value={p.backup} onChange={v => update(i, "backup", v)} placeholder="SDR" /></td>
              <td className="py-1 pr-2"><Input value={p.siteID} onChange={v => update(i, "siteID", v)} placeholder="optional" /></td>
              <td className="py-1"><DeleteBtn onClick={() => remove(i)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoleIDsTab({ data, setData }) {
  const roleIDs = data.roleIDs;
  const [newVal, setNewVal] = useState("");
  const add = () => { if (newVal.trim()) { setData(d => ({ ...d, roleIDs: [...d.roleIDs, newVal.trim()] })); setNewVal(""); } };
  const remove = i => setData(d => ({ ...d, roleIDs: d.roleIDs.filter((_, j) => j !== i) }));

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
      <SectionHeader title="TFDM Role IDs" count={roleIDs.length} />
      <div className="flex gap-2 mb-4">
        <Input value={newVal} onChange={setNewVal} placeholder="e.g. CD" className="w-32" onKeyDown={e => e.key === "Enter" && add()} />
        <button onClick={add} className="text-xs px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded font-mono">+ Add</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {roleIDs.map((r, i) => (
          <div key={i} className="flex items-center gap-1 bg-slate-700 border border-slate-600 rounded px-2 py-1">
            <span className="font-mono text-sm">{r}</span>
            <DeleteBtn onClick={() => remove(i)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// [REMAINING TABS: Fixes, Aircraft Lists, Headings, Altitudes, Runways, AOI, Configurations, STARS, Memo, DVD Label, Issues, Compare — SAME AS ORIGINAL]
// (Abbreviated here, but full implementations available in original FDTS_Adaptation_Tool.jsx)

function PlaceholderTab({ tabName }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
      <SectionHeader title={tabName} />
      <div className="text-slate-400 text-xs text-center py-8">
        {tabName} tab — [Same implementation as original tool]
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function FDTSAdaptationTool() {
  const [data, setData] = useState(emptyData());
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [loadStatus, setLoadStatus] = useState(null);
  const [facilities, setFacilities] = useState(INITIAL_FACILITIES);
  const fileRef = useRef();
  const xlsxRef = useRef();
  const mdbRef = useRef();

  // Load live synced data if available (Polling every 5s)
  useEffect(() => {
    const checkSync = () => {
      fetch("/src/live_data.json?t=" + Date.now()) // nocache
        .then(res => res.json())
        .then(syncedData => {
          setData(d => {
            // Only update if data is actually new
            if (syncedData.lastSynced !== d.lastSynced) {
              setLoadStatus({ ok: true, msg: "Background auto-sync updated! ✓" });
              return syncedData;
            }
            return d;
          });
        })
        .catch(() => { });
    };
    const timer = setInterval(checkSync, 5000);
    checkSync();
    return () => clearInterval(timer);
  }, []);

  const handleFacilityLoad = (facility) => {
    setData(emptyData());
    setData(d => ({
      ...d,
      fileContext: { ...d.fileContext, center: facility.artcc, tracon: facility.label },
    }));
    setActiveTab("Overview");
  };

  const handleFileLoad = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseAdaptationXML(ev.target.result);
        setData(parsed);
        setLoadStatus({ ok: true, msg: `Loaded: ${file.name}` });
        setActiveTab("Overview");
      } catch (err) {
        setLoadStatus({ ok: false, msg: `Parse error: ${err.message}` });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const handleXLSXLoad = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "array" });
        const getSheet = (names) => {
          for (const n of names) {
            const found = wb.SheetNames.find(s => s.toLowerCase().includes(n.toLowerCase()));
            if (found) return XLSX.utils.sheet_to_json(wb.Sheets[found], { header: 1, defval: "" });
          }
          return null;
        };

        const newData = emptyData();

        // Instructions — Center, Site, TRACON
        const inst = getSheet(["Instruction"]);
        if (inst) {
          inst.forEach(row => {
            const key = String(row[0] || "").trim().toLowerCase().replace(":", "");
            const val = String(row[1] || "").trim();
            if (key === "center") newData.fileContext.center = val;
            if (key === "tracon") newData.fileContext.tracon = val;
          });
        }

        // Departure points
        const dep = getSheet(["Departure"]);
        if (dep) {
          dep.slice(2).forEach(row => {
            const v = String(row[0] || "").trim();
            if (v && v.length === 3 && /^[A-Z]{3}$/.test(v)) newData.departureAirports.push(v);
          });
        }

        // Scanners / Role IDs
        const scanners = getSheet(["Scanner", "Role"]);
        if (scanners) {
          scanners.slice(1).forEach(row => {
            const v = String(row[0] || "").trim();
            if (v && v.length >= 1 && v.length <= 10 && !v.toLowerCase().includes("scanner") && !v.toLowerCase().includes("value")) newData.roleIDs.push(v);
          });
        }

        // Fixes
        const fixes = getSheet(["Fix"]);
        if (fixes) {
          fixes.slice(2).forEach(row => {
            const name = String(row[0] || "").trim();
            if (!name || name.toLowerCase().includes("value") || name.toLowerCase().includes("fix name")) return;
            const altRaw = String(row[1] || "").trim();
            const acRaw = String(row[2] || "").trim();
            const abbrv = String(row[3] || "").trim();
            const font = String(row[4] || "").trim();
            const box = String(row[5] || "").trim();
            newData.fixes.push({
              name,
              altitude: altRaw === "<ALL>" ? "" : altRaw,
              acList: acRaw === "<ALL>" ? "" : acRaw,
              abbrv: abbrv || "",
              font: font || "",
              box: box || "",
            });
          });
        }

        // Printers
        const printers = getSheet(["Printer"]);
        if (printers) {
          printers.slice(2).forEach(row => {
            const name = String(row[0] || "").trim();
            const backup = String(row[1] || "").trim();
            if (!name || name.toLowerCase().includes("fdts") || name.toLowerCase().includes("1-10")) return;
            newData.printers.push({ name, backup, siteID: "" });
          });
        }

        // Aircraft lists
        const acSheet = getSheet(["Aircraft List"]);
        if (acSheet) {
          const header = acSheet[0] || [];
          const listKeys = ["list1", "list2", "list3", "list4"];
          header.slice(0, 4).forEach((h, i) => {
            if (h && newData.aircraftLists[listKeys[i]]) {
              newData.aircraftLists[listKeys[i]].name = String(h).replace(/\n/g, " ").trim();
            }
          });
          acSheet.slice(1).forEach(row => {
            row.slice(0, 4).forEach((cell, i) => {
              const v = String(cell || "").trim().toUpperCase();
              if (v && /^[A-Z][A-Z0-9]{1,3}$/.test(v) && newData.aircraftLists[listKeys[i]]) {
                newData.aircraftLists[listKeys[i]].aircraft.push(v);
              }
            });
          });
        }

        // Routing configs
        const configSheets = wb.SheetNames.filter(n => n.toLowerCase().startsWith("config"));
        configSheets.forEach((sheetName, ci) => {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "" });
          let configName = sheetName.replace(/^Config\s*/i, "").replace(/[()]/g, "").trim();
          let isDefault = false;
          const entries = [];

          rows.forEach((row) => {
            const col0 = String(row[0] || "").trim();
            const col2 = String(row[2] || "").trim();
            if (col0.toLowerCase().includes("configuration name")) configName = col2 || configName;
            if (col0.toLowerCase().includes("default")) isDefault = col2.toLowerCase().includes("yes");
            const depApt = String(row[0] || "").trim();
            const fix = String(row[2] || "").trim();
            const p1 = String(row[5] || row[6] || "").trim();
            if (depApt && fix !== undefined && p1 && !depApt.toLowerCase().includes("departure") && depApt.length <= 3) {
              entries.push({
                depAirport: depApt === "<ALL>" ? "" : depApt,
                roleID: String(row[1] || "").trim() === "<ALL>" ? "" : String(row[1] || "").trim(),
                fix: fix === "<ALL>" ? "" : fix,
                altRange: String(row[3] || "").trim() === "<ALL>" ? "" : String(row[3] || "").trim(),
                acList: String(row[4] || "").trim() === "<ALL>" ? "" : String(row[4] || "").trim(),
                printer1: p1,
                printer2: String(row[6] || "").trim() || "",
              });
            }
          });
          if (configName || entries.length > 0) {
            newData.configurations.push({ name: configName, isDefault: isDefault || ci === 0, description: "", entries });
          }
        });

        setData(newData);
        setLoadStatus({ ok: true, msg: `Imported Worksheet: ${file.name}` });
        setActiveTab("Overview");
      } catch (err) {
        setLoadStatus({ ok: false, msg: `Worksheet error: ${err.message}` });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }, []);

  const handleMDBLoad = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const buffer = ev.target.result;
        const mdb = new MDBReader(buffer);
        const tables = mdb.getTableNames();
        const newData = emptyData();

        const findTable = (patterns) => tables.find(t => patterns.some(p => t.toLowerCase().includes(p.toLowerCase())));

        // 1. Load PRINTERS
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

        // 2. Load ROLE IDS
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

        // 3. Load FIXES
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

        // 4. Load HEADINGS
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

        // 5. Load ALTITUDES
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

        // 6. Load RUNWAYS
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

        // 7. Load AOI
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

        // 8. Load DEPARTURE AIRPORTS
        const depTable = findTable(["DepApt", "Departure", "tblDep"]);
        if (depTable) {
          const rows = mdb.getTable(depTable).getData();
          rows.forEach(row => {
            const apt = row.DepApt || row.Airport || row.DepAirport || row.Key;
            if (apt && String(apt).length === 3 && !newData.departureAirports.includes(String(apt))) {
              newData.departureAirports.push(String(apt).toUpperCase());
            }
          });
        }

        // 8. Load STARS
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

        // 9. Load CONFIGURATIONS
        const routingTable = findTable(["Routing", "ConfigEntry", "tblRouting", "AdaptedConfiguration"]);
        if (routingTable) {
          const rows = mdb.getTable(routingTable).getData();
          const configField = ["ConfigName", "Configuration", "PlanName"].find(f => rows[0] && rows[0][f] !== undefined);
          if (configField) {
            const configNames = [...new Set(rows.map(r => r[configField]).filter(Boolean))];
            configNames.forEach((name, ci) => {
              const entries = rows.filter(r => r[configField] === name).map(r => ({
                depAirport: String(r.DepAirport || r.DepPt || r.DepartureAirport || ""),
                roleID: String(r.tfdmRoleID || r.RoleID || ""),
                fix: String(r.Fix || r.FixName || ""),
                altRange: String(r.AltitudeRange || r.Altitude || ""),
                acList: String(r.RouteAcList || r.AcList || r.TypeAC || ""),
                printer1: String(r.fdtsPrinter1 || r.Printer1 || r.Device1 || r.DeviceName || ""),
                printer2: String(r.fdtsPrinter2 || r.Printer2 || r.Device2 || "")
              }));
              newData.configurations.push({
                name: String(name),
                isDefault: ci === 0 || String(rows.find(r => r[configField] === name)?.Default).toLowerCase() === "true",
                description: `Imported from MDB: ${file.name}`,
                entries
              });
            });
          }
        }

        // 11. Success reporting
        const summary = [
          newData.fixes.length > 0 && `${newData.fixes.length} fixes`,
          newData.printers.length > 0 && `${newData.printers.length} printers`,
          newData.configurations.length > 0 && `${newData.configurations.length} configs`,
          newData.headings.length > 0 && `${newData.headings.length} headings`,
          newData.runways.length > 0 && `${newData.runways.length} runways`,
          newData.aoi.length > 0 && `${newData.aoi.length} AOIs`,
          newData.departureAirports.length > 0 && `${newData.departureAirports.length} airports`,
          newData.starsPositions.length > 0 && `${newData.starsPositions.length} STARS`
        ].filter(Boolean).join(", ");

        setData(newData);
        setLoadStatus({ ok: true, msg: `MDB Parsed: ${file.name}. Found: ${summary || "No relevant data"}` });
        setActiveTab("Overview");
      } catch (err) {
        console.error("MDB Error:", err);
        setLoadStatus({ ok: false, msg: `MDB Import Error: ${err.message}` });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }, []);

  const tabComponents = {
    Dashboard: <DashboardOverview facilities={facilities} artccs={INITIAL_ARTCCS} onLoad={handleFacilityLoad} />,
    Overview: <OverviewTab data={data} setData={setData} />,
    Printers: <PrintersTab data={data} setData={setData} />,
    RoleIDs: <RoleIDsTab data={data} setData={setData} />,
    Fixes: <FixesTab data={data} setData={setData} />,
    "Aircraft Lists": <AircraftListsTab data={data} setData={setData} />,
    Headings: <HeadingsTab data={data} setData={setData} />,
    Altitudes: <AltitudesTab data={data} setData={setData} />,
    Runways: <RunwaysTab data={data} setData={setData} />,
    AOI: <AOITab data={data} setData={setData} />,
    Configurations: <ConfigurationsTab data={data} setData={setData} />,
    STARS: <STARSTab data={data} setData={setData} />,
    Validation: <ValidationTab data={data} />,
    Export: <ExportTab data={data} facilities={facilities} />,
    Memo: <MemoTab data={data} />,
    "DVD Label": <DVDLabelTab data={data} />,
    Issues: <IssuesTab issues={INITIAL_ISSUES} />,
    "Change Workflow": <WorkflowTab steps={INITIAL_WORKFLOW} />,
    Contacts: <ContactsTab contacts={INITIAL_CONTACTS} />,
    Facilities: <FacilitiesTab facilities={facilities} setFacilities={setFacilities} setData={setData} setActiveTab={setActiveTab} />,
    Info: <InfoTab />,
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100" style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/95 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-sm font-bold">✈</div>
            <div>
              <div className="text-sm font-bold text-slate-100 tracking-wide">FDTS ADAPTATION TOOL — NATIONAL</div>
              <div className="text-xs text-slate-400">
                FDIO PC-RCU | PCRCU Schema v1.01 | Phase 1 Enhanced
                {data.lastSynced && <span className="ml-3 text-green-400 font-mono">Sync: {new Date(data.lastSynced).toLocaleTimeString()} ✓</span>}
              </div>
            </div>
            {data.fileContext.tracon && <Badge color="blue">{data.fileContext.center} / {data.fileContext.tracon}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {loadStatus && (
              <span className={`text-xs font-mono ${loadStatus.ok ? "text-green-400" : "text-red-400"}`}>{loadStatus.msg}</span>
            )}
            <input ref={fileRef} type="file" accept=".xml" onChange={handleFileLoad} className="hidden" />
            <input ref={xlsxRef} type="file" accept=".xlsx,.xls" onChange={handleXLSXLoad} className="hidden" />
            <input ref={mdbRef} type="file" accept=".mdb,.accdb" onChange={handleMDBLoad} className="hidden" />
            <button onClick={() => fileRef.current.click()} className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-mono transition-colors">⬆ Import XML</button>
            <button onClick={() => xlsxRef.current.click()} className="text-xs px-3 py-1.5 bg-green-800 hover:bg-green-700 text-white rounded font-mono transition-colors">📊 Import Worksheet</button>
            <button onClick={() => mdbRef.current.click()} className="text-xs px-3 py-1.5 bg-purple-800 hover:bg-purple-700 text-white rounded font-mono transition-colors">🗄️ Import MDB</button>
            <button onClick={() => { setData(emptyData()); setLoadStatus(null); }} className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-mono transition-colors">New</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto gap-0">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`text-xs px-3 py-2 whitespace-nowrap border-b-2 transition-colors font-mono ${activeTab === tab ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {tabComponents[activeTab]}
      </div>
    </div>
  );
}
