import { useState } from 'react';

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
    return <button onClick={onClick} className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded">✕</button>;
}

function SectionHeader({ title, onAdd }) {
    return (
        <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-100 font-semibold text-sm uppercase">{title}</h2>
            {onAdd && <button onClick={onAdd} className="text-xs px-3 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded">+ Add</button>}
        </div>
    );
}

export function FixesTab({ data, setData }) {
    const list = data.fixes;
    const update = (i, f, v) => setData(d => { const a = [...d.fixes]; a[i] = { ...a[i], [f]: v }; return { ...d, fixes: a }; });
    const add = () => setData(d => ({ ...d, fixes: [...d.fixes, { name: '', altitude: '', abbrv: '', acList: '', font: '', box: '' }] }));
    const remove = i => setData(d => ({ ...d, fixes: d.fixes.filter((_, j) => j !== i) }));
    return (
        <div className="bg-slate-800/60 p-4 rounded-lg">
            <SectionHeader title="Adapted Fixes" onAdd={add} />
            <div className="space-y-2">
                {list.map((x, i) => (
                    <div key={i} className="flex gap-2 text-xs">
                        <Input value={x.name} onChange={v => update(i, 'name', v)} placeholder="Name" />
                        <Input value={x.altitude} onChange={v => update(i, 'altitude', v)} placeholder="Altitude" />
                        <Input value={x.abbrv} onChange={v => update(i, 'abbrv', v)} placeholder="Abbrv" />
                        <Input value={x.acList} onChange={v => update(i, 'acList', v)} placeholder="AC List" />
                        <Input value={x.font} onChange={v => update(i, 'font', v)} placeholder="Font" />
                        <Input value={x.box} onChange={v => update(i, 'box', v)} placeholder="Box" />
                        <DeleteBtn onClick={() => remove(i)} />
                    </div>
                ))}
                {list.length === 0 && <div className="text-slate-500 text-xs">No fixes added yet.</div>}
            </div>
        </div>
    );
}

export function HeadingsTab({ data, setData }) {
    const list = data.headings;
    const update = (i, f, v) => setData(d => { const a = [...d.headings]; a[i] = { ...a[i], [f]: v }; return { ...d, headings: a }; });
    const add = () => setData(d => ({ ...d, headings: [...d.headings, { value: '', abbrv: '', attribute: '', font: '', box: '' }] }));
    const remove = i => setData(d => ({ ...d, headings: d.headings.filter((_, j) => j !== i) }));
    return (
        <div className="bg-slate-800/60 p-4 rounded-lg">
            <SectionHeader title="Adapted Headings" onAdd={add} />
            <div className="space-y-2">
                {list.map((x, i) => (
                    <div key={i} className="flex gap-2 text-xs">
                        <Input value={x.value} onChange={v => update(i, 'value', v)} placeholder="Value (e.g. 090)" />
                        <Input value={x.abbrv} onChange={v => update(i, 'abbrv', v)} placeholder="Abbrv" />
                        <Input value={x.attribute} onChange={v => update(i, 'attribute', v)} placeholder="Attribute" />
                        <Input value={x.font} onChange={v => update(i, 'font', v)} placeholder="Font" />
                        <Input value={x.box} onChange={v => update(i, 'box', v)} placeholder="Box" />
                        <DeleteBtn onClick={() => remove(i)} />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function AltitudesTab({ data, setData }) {
    const list = data.altitudes;
    const update = (i, f, v) => setData(d => { const a = [...d.altitudes]; a[i] = { ...a[i], [f]: v }; return { ...d, altitudes: a }; });
    const add = () => setData(d => ({ ...d, altitudes: [...d.altitudes, { value: '', abbrv: '', font: '', box: '' }] }));
    const remove = i => setData(d => ({ ...d, altitudes: d.altitudes.filter((_, j) => j !== i) }));
    return (
        <div className="bg-slate-800/60 p-4 rounded-lg">
            <SectionHeader title="Adapted Altitudes" onAdd={add} />
            <div className="space-y-2">
                {list.map((x, i) => (
                    <div key={i} className="flex gap-2 text-xs">
                        <Input value={x.value} onChange={v => update(i, 'value', v)} placeholder="Value (e.g. 100)" />
                        <Input value={x.abbrv} onChange={v => update(i, 'abbrv', v)} placeholder="Abbrv" />
                        <Input value={x.font} onChange={v => update(i, 'font', v)} placeholder="Font" />
                        <Input value={x.box} onChange={v => update(i, 'box', v)} placeholder="Box" />
                        <DeleteBtn onClick={() => remove(i)} />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function RunwaysTab({ data, setData }) {
    const list = data.runways;
    const update = (i, f, v) => setData(d => { const a = [...d.runways]; a[i] = { ...a[i], [f]: v }; return { ...d, runways: a }; });
    const add = () => setData(d => ({ ...d, runways: [...d.runways, { value: '', airport: '', abbrv: '', font: '', box: '' }] }));
    const remove = i => setData(d => ({ ...d, runways: d.runways.filter((_, j) => j !== i) }));
    return (
        <div className="bg-slate-800/60 p-4 rounded-lg">
            <SectionHeader title="Adapted Runways" onAdd={add} />
            <div className="space-y-2">
                {list.map((x, i) => (
                    <div key={i} className="flex gap-2 text-xs">
                        <Input value={x.value} onChange={v => update(i, 'value', v)} placeholder="Value (e.g. 01L)" />
                        <Input value={x.airport} onChange={v => update(i, 'airport', v)} placeholder="Airport" />
                        <Input value={x.abbrv} onChange={v => update(i, 'abbrv', v)} placeholder="Abbrv" />
                        <Input value={x.font} onChange={v => update(i, 'font', v)} placeholder="Font" />
                        <Input value={x.box} onChange={v => update(i, 'box', v)} placeholder="Box" />
                        <DeleteBtn onClick={() => remove(i)} />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function AOITab({ data, setData }) {
    const list = data.aoi;
    const update = (i, f, v) => setData(d => { const a = [...d.aoi]; a[i] = { ...a[i], [f]: v }; return { ...d, aoi: a }; });
    const add = () => setData(d => ({ ...d, aoi: [...d.aoi, { value: '', desc: '', abbrv: '', font: '', box: '' }] }));
    const remove = i => setData(d => ({ ...d, aoi: d.aoi.filter((_, j) => j !== i) }));
    return (
        <div className="bg-slate-800/60 p-4 rounded-lg">
            <SectionHeader title="Adapted Area of Interest (AOI)" onAdd={add} />
            <div className="space-y-2">
                {list.map((x, i) => (
                    <div key={i} className="flex gap-2 text-xs">
                        <Input value={x.value} onChange={v => update(i, 'value', v)} placeholder="Value" />
                        <Input value={x.desc} onChange={v => update(i, 'desc', v)} placeholder="Desc" />
                        <Input value={x.abbrv} onChange={v => update(i, 'abbrv', v)} placeholder="Abbrv" />
                        <Input value={x.font} onChange={v => update(i, 'font', v)} placeholder="Font" />
                        <Input value={x.box} onChange={v => update(i, 'box', v)} placeholder="Box" />
                        <DeleteBtn onClick={() => remove(i)} />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function AircraftListsTab({ data, setData }) {
    const updateName = (listKey, v) => setData(d => ({ ...d, aircraftLists: { ...d.aircraftLists, [listKey]: { ...d.aircraftLists[listKey], name: v } } }));
    const updateAircraft = (listKey, v) => setData(d => ({
        ...d,
        aircraftLists: {
            ...d.aircraftLists,
            [listKey]: {
                ...d.aircraftLists[listKey],
                aircraft: v.split(',').map(s => s.trim()).filter(Boolean)
            }
        }
    }));

    const lists = ['recat', 'list1', 'list2', 'list3', 'list4'];
    const labels = ['Recat Unique Aircraft', 'Aircraft List 1', 'Aircraft List 2', 'Aircraft List 3', 'Aircraft List 4'];

    return (
        <div className="bg-slate-800/60 p-4 rounded-lg">
            <SectionHeader title="Aircraft Lists" />
            <div className="space-y-4">
                {lists.map((key, i) => {
                    const l = data.aircraftLists[key];
                    return (
                        <div key={key} className="bg-slate-700/30 p-3 rounded border border-slate-600">
                            <div className="font-bold text-slate-200 mb-2">{labels[i]}</div>
                            <div className="flex gap-4 mb-2">
                                <div className="w-1/3">
                                    <label className="text-xs text-slate-400 block mb-1">List Name</label>
                                    <Input value={l.name} onChange={v => updateName(key, v)} placeholder="Name..." />
                                </div>
                                <div className="w-2/3">
                                    <label className="text-xs text-slate-400 block mb-1">Aircraft (comma separated)</label>
                                    <Input value={l.aircraft.join(', ')} onChange={v => updateAircraft(key, v)} placeholder="e.g. B738, A320, CRJ9" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function ConfigurationsTab({ data, setData }) {
    const configs = data.configurations;

    const updateConfig = (i, f, v) => setData(d => { const a = [...d.configurations]; a[i] = { ...a[i], [f]: v }; return { ...d, configurations: a }; });
    const addConfig = () => setData(d => ({ ...d, configurations: [...d.configurations, { name: '', isDefault: false, description: '', entries: [] }] }));
    const removeConfig = i => setData(d => ({ ...d, configurations: d.configurations.filter((_, j) => j !== i) }));

    const updateEntry = (ci, ei, f, v) => setData(d => {
        const a = [...d.configurations];
        const e = [...a[ci].entries];
        e[ei] = { ...e[ei], [f]: v };
        a[ci] = { ...a[ci], entries: e };
        return { ...d, configurations: a };
    });
    const addEntry = (ci) => setData(d => {
        const a = [...d.configurations];
        a[ci] = { ...a[ci], entries: [...a[ci].entries, { depAirport: '', roleID: '', fix: '', altRange: '', acList: '', printer1: '', printer2: '' }] };
        return { ...d, configurations: a };
    });
    const removeEntry = (ci, ei) => setData(d => {
        const a = [...d.configurations];
        a[ci] = { ...a[ci], entries: a[ci].entries.filter((_, j) => j !== ei) };
        return { ...d, configurations: a };
    });

    return (
        <div className="space-y-4">
            <SectionHeader title={`Configurations (${configs.length})`} onAdd={addConfig} />
            {configs.map((c, ci) => (
                <div key={ci} className="bg-slate-800/80 border border-slate-600 rounded-lg p-3">
                    <div className="flex gap-2 mb-2 items-center text-slate-300">
                        <Input value={c.name} onChange={v => updateConfig(ci, 'name', v)} placeholder="Config Name" className="font-bold flex-1" />
                        <label className="flex items-center gap-2 text-xs bg-slate-700/50 px-3 py-1.5 rounded cursor-pointer">
                            <input type="checkbox" checked={c.isDefault} onChange={e => updateConfig(ci, 'isDefault', e.target.checked)} className="cursor-pointer" />
                            Default Config
                        </label>
                        <DeleteBtn onClick={() => removeConfig(ci)} />
                    </div>
                    <Input value={c.description} onChange={v => updateConfig(ci, 'description', v)} placeholder="Description" className="mb-3" />

                    <div className="bg-slate-900/50 p-2 rounded border border-slate-700">
                        <h4 className="text-xs font-bold text-slate-400 mb-2 flex justify-between">
                            <span>Routing Entries ({c.entries.length})</span>
                            <button onClick={() => addEntry(ci)} className="text-blue-400 hover:text-blue-300 px-2 py-0.5 bg-blue-900/40 rounded transition-colors">+ Add Entry</button>
                        </h4>
                        <div className="space-y-1">
                            {c.entries.map((e, ei) => (
                                <div key={ei} className="flex gap-1 text-xs">
                                    <Input value={e.depAirport} onChange={v => updateEntry(ci, ei, 'depAirport', v)} placeholder="DepApt" />
                                    <Input value={e.roleID} onChange={v => updateEntry(ci, ei, 'roleID', v)} placeholder="RoleID" />
                                    <Input value={e.fix} onChange={v => updateEntry(ci, ei, 'fix', v)} placeholder="Fix" />
                                    <Input value={e.altRange} onChange={v => updateEntry(ci, ei, 'altRange', v)} placeholder="AltRange" />
                                    <Input value={e.acList} onChange={v => updateEntry(ci, ei, 'acList', v)} placeholder="AcList" />
                                    <Input value={e.printer1} onChange={v => updateEntry(ci, ei, 'printer1', v)} placeholder="Printer1" />
                                    <Input value={e.printer2} onChange={v => updateEntry(ci, ei, 'printer2', v)} placeholder="Printer2" />
                                    <DeleteBtn onClick={() => removeEntry(ci, ei)} />
                                </div>
                            ))}
                            {c.entries.length === 0 && <div className="text-slate-500 text-xs py-2">No routing entries in this configuration.</div>}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function STARSTab({ data, setData }) {
    const updateP = (i, f, v) => setData(d => { const a = [...d.starsPositions]; a[i] = { ...a[i], [f]: v }; return { ...d, starsPositions: a }; });
    const addP = () => setData(d => ({ ...d, starsPositions: [...d.starsPositions, { position: '', printer: '', handoffEvent: '', enroutePriority: '' }] }));
    const removeP = i => setData(d => ({ ...d, starsPositions: d.starsPositions.filter((_, j) => j !== i) }));

    const updateE = (i, f, v) => setData(d => { const a = [...d.starsExceptions]; a[i] = { ...a[i], [f]: v }; return { ...d, starsExceptions: a }; });
    const addE = () => setData(d => ({ ...d, starsExceptions: [...d.starsExceptions, { position: '', handoffSource: '' }] }));
    const removeE = i => setData(d => ({ ...d, starsExceptions: d.starsExceptions.filter((_, j) => j !== i) }));

    return (
        <div className="space-y-4">
            <div className="bg-slate-800/60 p-4 rounded-lg">
                <SectionHeader title="STARS Positions" onAdd={addP} />
                <div className="space-y-2">
                    {data.starsPositions.map((x, i) => (
                        <div key={i} className="flex gap-2 text-xs">
                            <Input value={x.position} onChange={v => updateP(i, 'position', v)} placeholder="Position" />
                            <Input value={x.printer} onChange={v => updateP(i, 'printer', v)} placeholder="Printer" />
                            <Input value={x.handoffEvent} onChange={v => updateP(i, 'handoffEvent', v)} placeholder="Handoff Event" />
                            <Input value={x.enroutePriority} onChange={v => updateP(i, 'enroutePriority', v)} placeholder="Enroute Priority" />
                            <DeleteBtn onClick={() => removeP(i)} />
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-slate-800/60 p-4 rounded-lg">
                <SectionHeader title="STARS Exceptions" onAdd={addE} />
                <div className="space-y-2">
                    {data.starsExceptions.map((x, i) => (
                        <div key={i} className="flex gap-2 text-xs">
                            <Input value={x.position} onChange={v => updateE(i, 'position', v)} placeholder="Position" />
                            <Input value={x.handoffSource} onChange={v => updateE(i, 'handoffSource', v)} placeholder="Handoff Source" />
                            <DeleteBtn onClick={() => removeE(i)} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function MemoTab({ data }) {
    const tracon = data.fileContext?.tracon || "FACILITY";
    const center = data.fileContext?.center || "ARTCC";
    const memoText = `MEMORANDUM

DATE: ${new Date().toLocaleDateString('en-US')}
TO: ${center} Air Traffic Manager
FROM: FDTS National Support Team
SUBJECT: Authorization to load ${tracon} FDTS Adaptation

This memorandum authorizes the loading of the attached FDTS adaptation file for ${tracon}.
Please ensure that all configurations have been verified before installing on the operational string.
`;
    return (
        <div className="bg-slate-800/60 p-4 rounded-lg h-full">
            <SectionHeader title="Authorization Memo" />
            <textarea className="w-full h-96 bg-slate-900 border border-slate-600 text-slate-300 text-sm font-mono p-4 rounded" readOnly value={memoText} />
        </div>
    );
}

export function DVDLabelTab({ data }) {
    const tracon = data.fileContext?.tracon || "FACILITY";

    const labelText = `[=============================]
|      FDTS ADAPTATION        |
|  ${tracon.padEnd(27, ' ')}|
|  Date: ${(new Date().toLocaleDateString('en-US')).padEnd(21, ' ')}|
|                             |
|      DO NOT DUPLICATE       |
[=============================]`;

    return (
        <div className="bg-slate-800/60 p-4 rounded-lg h-full">
            <SectionHeader title="DVD Label Generator" />
            <pre className="bg-slate-900 border border-slate-600 text-blue-300 text-sm font-mono p-6 rounded inline-block">
                {labelText}
            </pre>
        </div>
    );
}
