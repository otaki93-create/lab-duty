import { useState, useEffect, useCallback } from "react";

// ─── Japanese Holidays ─────────────────────────────────────────────
const HOLIDAYS = new Set([
  "2025-01-01","2025-01-02","2025-01-03","2025-01-13","2025-02-11","2025-02-23","2025-02-24",
  "2025-03-20","2025-04-29","2025-05-03","2025-05-04","2025-05-05","2025-05-06",
  "2025-07-21","2025-08-11","2025-09-15","2025-09-22","2025-09-23","2025-10-13",
  "2025-11-03","2025-11-23","2025-11-24","2025-12-23",
  "2026-01-01","2026-01-02","2026-01-03","2026-01-12","2026-02-11","2026-02-23",
  "2026-03-20","2026-04-29","2026-05-03","2026-05-04","2026-05-05","2026-05-06",
  "2026-07-20","2026-08-11","2026-09-21","2026-09-22","2026-10-12",
  "2026-11-03","2026-11-23","2026-12-23",
]);

function isHolidayOrWeekend(ds) {
  if (HOLIDAYS.has(ds)) return true;
  const dow = new Date(ds).getDay();
  return dow === 0 || dow === 6;
}

const MAX_STAFF = 30;

const INITIAL_STAFF = [
  { id:1, name:"田中 一郎", color:"#0ea5e9" },
  { id:2, name:"佐藤 花子", color:"#10b981" },
  { id:3, name:"山田 太郎", color:"#f59e0b" },
  { id:4, name:"鈴木 美咲", color:"#ef4444" },
  { id:5, name:"中村 健二", color:"#8b5cf6" },
  { id:6, name:"伊藤 直子", color:"#ec4899" },
];

const COLOR_OPTIONS = [
  "#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899",
  "#06b6d4","#84cc16","#f97316","#6366f1","#14b8a6","#e879f9",
  "#3b82f6","#22c55e","#eab308","#f43f5e","#a855f7","#d946ef",
  "#0891b2","#16a34a","#ca8a04","#dc2626","#7c3aed","#be185d",
  "#0284c7","#15803d","#b45309","#b91c1c","#6d28d9","#9d174d",
];

const SHIFT_DEFS = {
  nisoku: { label:"日直",  short:"日直", border:"#fb923c", icon:"☀️" },
  junya:  { label:"準夜勤",short:"準夜", border:"#38bdf8", icon:"🌙" },
  oncall: { label:"待機",  short:"待機", border:"#4ade80", icon:"📞" },
};

const WEEKDAY_SHIFTS = ["junya","oncall"];
const WEEKEND_SHIFTS = ["nisoku","junya","oncall"];
function getShiftsForDate(ds) { return isHolidayOrWeekend(ds) ? WEEKEND_SHIFTS : WEEKDAY_SHIFTS; }

function daysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function firstDow(y,m)   { return new Date(y,m,1).getDay(); }
function toStr(y,m,d)    { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }

function genScheduleFromMaster(y, m, weekdayOrder, weekendOrder) {
  const days = daysInMonth(y, m);
  const sched = {};
  const cursors = { junya:0, oncall:0, nisoku:0 };
  function buildQueue(order, k) { return order.filter(r=>r.shift===k).map(r=>r.staffId); }
  const wdQ = { junya:buildQueue(weekdayOrder,"junya"), oncall:buildQueue(weekdayOrder,"oncall") };
  const weQ = { nisoku:buildQueue(weekendOrder,"nisoku"), junya:buildQueue(weekendOrder,"junya"), oncall:buildQueue(weekendOrder,"oncall") };
  for (let d=1; d<=days; d++) {
    const ds=toStr(y,m,d); const isWE=isHolidayOrWeekend(ds);
    const entry={}; const shifts=isWE?WEEKEND_SHIFTS:WEEKDAY_SHIFTS; const queues=isWE?weQ:wdQ;
    shifts.forEach(sk=>{ const q=queues[sk]; if(!q||!q.length) return; entry[sk]=q[cursors[sk]%q.length]; cursors[sk]++; });
    sched[ds]=entry;
  }
  return sched;
}

function buildDefaultMaster(staff) {
  const weekdayOrder=[]; staff.forEach(s=>weekdayOrder.push({shift:"junya",staffId:s.id})); staff.forEach(s=>weekdayOrder.push({shift:"oncall",staffId:s.id}));
  const weekendOrder=[]; staff.forEach(s=>weekendOrder.push({shift:"nisoku",staffId:s.id})); staff.forEach(s=>weekendOrder.push({shift:"junya",staffId:s.id})); staff.forEach(s=>weekendOrder.push({shift:"oncall",staffId:s.id}));
  return { weekdayOrder, weekendOrder };
}

const today    = new Date();
const todayStr = toStr(today.getFullYear(), today.getMonth(), today.getDate());
const WEEKDAYS  = ["日","月","火","水","木","金","土"];
const MONTHS_JA = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

// ════════════════════════════════════════════════════════════════════
export default function App() {
  const initMaster = buildDefaultMaster(INITIAL_STAFF);

  const [staff,        setStaff]        = useState(INITIAL_STAFF);
  const [weekdayOrder, setWeekdayOrder] = useState(initMaster.weekdayOrder);
  const [weekendOrder, setWeekendOrder] = useState(initMaster.weekendOrder);
  const [yr,  setYr]  = useState(today.getFullYear());
  const [mo,  setMo]  = useState(today.getMonth());
  const [sched, setSched] = useState(() => genScheduleFromMaster(today.getFullYear(), today.getMonth(), initMaster.weekdayOrder, initMaster.weekendOrder));
  const [view,      setView]      = useState("calendar");
  const [modal,     setModal]     = useState(null);
  const [editData,  setEditData]  = useState({});
  const [notifs,    setNotifs]    = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab,  setSettingsTab]  = useState("member");
  const [editingMember, setEditingMember] = useState(null);
  const [memberForm,    setMemberForm]    = useState({ name:"", color:COLOR_OPTIONS[0] });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [draftWD, setDraftWD] = useState(null);
  const [draftWE, setDraftWE] = useState(null);

  // ── Google Sheets 連携 ──
  const [gasUrl,    setGasUrl]    = useState(""); // Apps Script URL
  const [syncStatus,setSyncStatus]= useState("idle"); // idle | loading | ok | error
  const [syncMsg,   setSyncMsg]   = useState("");
  const [showSync,  setShowSync]  = useState(false); // sync設定パネル

  function pushNotif(msg){ setNotifs(p=>[{id:Date.now(),msg,time:new Date().toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"})},...p].slice(0,15)); }

  function changeMonth(delta) {
    let nm=mo+delta, ny=yr;
    if(nm<0){nm=11;ny--;} else if(nm>11){nm=0;ny++;}
    setMo(nm); setYr(ny);
    setSched(prev=>({...genScheduleFromMaster(ny,nm,weekdayOrder,weekendOrder),...prev}));
  }

  function openModal(ds){ setEditData({...(sched[ds]||{})}); setModal(ds); }
  function saveModal(){
    setSched(prev=>({...prev,[modal]:{...editData}}));
    const names=getShiftsForDate(modal).map(sk=>{ const m=staff.find(x=>x.id===editData[sk]); return m?`${SHIFT_DEFS[sk].icon}${m.name}`:null; }).filter(Boolean).join("、");
    pushNotif(`${modal} のシフトを更新しました（${names}）`);
    setModal(null);
  }

  function openAddMember(){ setEditingMember(null); setMemberForm({name:"",color:COLOR_OPTIONS[staff.length%COLOR_OPTIONS.length]}); }
  function openEditMember(s){ setEditingMember(s); setMemberForm({name:s.name,color:s.color}); }
  function saveMember(){
    if(!memberForm.name.trim()) return;
    if(editingMember){ setStaff(prev=>prev.map(s=>s.id===editingMember.id?{...s,name:memberForm.name.trim(),color:memberForm.color}:s)); pushNotif(`メンバー「${memberForm.name.trim()}」を更新しました`); }
    else { if(staff.length>=MAX_STAFF) return; setStaff(prev=>[...prev,{id:Date.now(),name:memberForm.name.trim(),color:memberForm.color}]); pushNotif(`メンバー「${memberForm.name.trim()}」を追加しました`); }
    setEditingMember(null); setMemberForm({name:"",color:COLOR_OPTIONS[0]});
  }
  function deleteMember(id){
    const member=staff.find(s=>s.id===id);
    setStaff(prev=>prev.filter(s=>s.id!==id));
    setWeekdayOrder(p=>p.filter(r=>r.staffId!==id));
    setWeekendOrder(p=>p.filter(r=>r.staffId!==id));
    setSched(prev=>{ const next={...prev}; Object.keys(next).forEach(ds=>{ const e={...next[ds]}; Object.keys(e).forEach(k=>{ if(e[k]===id) e[k]=null; }); next[ds]=e; }); return next; });
    pushNotif(`メンバー「${member?.name}」を削除しました`);
    setDeleteConfirm(null);
  }

  function openMasterEditor(){ setDraftWD(weekdayOrder.map(r=>({...r}))); setDraftWE(weekendOrder.map(r=>({...r}))); }
  function closeMasterEditor(){ setDraftWD(null); setDraftWE(null); }
  function addMasterRow(type,sk,sid){ if(!sid) return; (type==="wd"?setDraftWD:setDraftWE)(p=>[...p,{shift:sk,staffId:Number(sid)}]); }
  function removeMasterRow(type,idx){ (type==="wd"?setDraftWD:setDraftWE)(p=>p.filter((_,i)=>i!==idx)); }
  function moveMasterRow(type,idx,dir){ (type==="wd"?setDraftWD:setDraftWE)(p=>{ const a=[...p],ni=idx+dir; if(ni<0||ni>=a.length) return a; [a[idx],a[ni]]=[a[ni],a[idx]]; return a; }); }
  function saveMaster(){
    setWeekdayOrder(draftWD); setWeekendOrder(draftWE);
    setSched(prev=>({...prev,...genScheduleFromMaster(yr,mo,draftWD,draftWE)}));
    pushNotif("シフトマスターを更新し、今月のスケジュールを再生成しました");
    closeMasterEditor();
  }

  // ── Google Sheets: データ読み込み ──
  async function loadFromSheets() {
    if (!gasUrl.trim()) { setSyncMsg("Apps Script の URL を設定してください"); setSyncStatus("error"); return; }
    setSyncStatus("loading"); setSyncMsg("読み込み中...");
    try {
      const res = await fetch(`${gasUrl.trim()}?action=load`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (json.staff)        setStaff(json.staff);
      if (json.sched)        setSched(json.sched);
      if (json.weekdayOrder) setWeekdayOrder(json.weekdayOrder);
      if (json.weekendOrder) setWeekendOrder(json.weekendOrder);
      setSyncStatus("ok"); setSyncMsg(`✅ 読み込み完了（${new Date().toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"})}）`);
      pushNotif("スプレッドシートからデータを読み込みました");
    } catch(e) {
      setSyncStatus("error"); setSyncMsg(`❌ 読み込み失敗: ${e.message}`);
    }
  }

  // ── Google Sheets: データ保存 ──
  async function saveToSheets() {
    if (!gasUrl.trim()) { setSyncMsg("Apps Script の URL を設定してください"); setSyncStatus("error"); return; }
    setSyncStatus("loading"); setSyncMsg("保存中...");
    try {
      const payload = { action:"save", staff, sched, weekdayOrder, weekendOrder };
      const res = await fetch(gasUrl.trim(), {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSyncStatus("ok"); setSyncMsg(`✅ 保存完了（${new Date().toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"})}）`);
      pushNotif("スプレッドシートにデータを保存しました");
    } catch(e) {
      setSyncStatus("error"); setSyncMsg(`❌ 保存失敗: ${e.message}`);
    }
  }

  const days  = daysInMonth(yr,mo);
  const first = firstDow(yr,mo);
  const cells = [...Array(first).fill(null), ...Array.from({length:days},(_,i)=>i+1)];
  const summary={};
  staff.forEach(s=>{ summary[s.id]={nisoku:0,junya:0,oncall:0}; });
  Object.entries(sched).forEach(([ds,entry])=>{
    if(!ds.startsWith(`${yr}-${String(mo+1).padStart(2,"0")}`)) return;
    Object.entries(entry).forEach(([shift,sid])=>{ if(summary[sid]) summary[sid][shift]=(summary[sid][shift]||0)+1; });
  });

  const syncColor = syncStatus==="ok"?"#4ade80":syncStatus==="error"?"#f87171":syncStatus==="loading"?"#fbbf24":"#64748b";

  return (
    <div style={{fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif",minHeight:"100vh",background:"#0d1b2a",color:"#e2e8f0"}}>

      {/* Header */}
      <header style={{background:"linear-gradient(90deg,#0d1b2a,#1a3a5c)",borderBottom:"1px solid #1e3a5f",padding:"0 16px",height:58,display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>🔬</span>
          <div>
            <div style={{fontWeight:800,fontSize:14,color:"#e0f2fe"}}>臨床検査科 日当直管理</div>
            <div style={{fontSize:9,color:"#64748b"}}>CLINICAL LABORATORY DUTY SCHEDULER</div>
          </div>
        </div>
        <nav style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          {[["calendar","📅"],["list","📋"],["summary","📊"],["notify","🔔"]].map(([k,icon])=>(
            <button key={k} onClick={()=>setView(k)} title={k} style={{background:view===k?"#0ea5e9":"transparent",color:view===k?"white":"#94a3b8",border:view===k?"none":"1px solid #1e3a5f",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:14,position:"relative"}}>
              {icon}
              {k==="notify"&&notifs.length>0&&<span style={{position:"absolute",top:2,right:2,width:7,height:7,borderRadius:"50%",background:"#ef4444",display:"block"}}/>}
            </button>
          ))}
          {/* Sync button */}
          <button onClick={()=>setShowSync(true)} title="スプレッドシート連携" style={{background:"#1e3a5f",color:syncColor,border:`1px solid ${syncColor}44`,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:13}}>
            {syncStatus==="loading"?"⏳":"☁️"}
          </button>
          <button onClick={()=>{setSettingsOpen(true);setSettingsTab("member");}} style={{background:"#1e3a5f",color:"#94a3b8",border:"1px solid #2d4f73",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:13}}>⚙️</button>
        </nav>
      </header>

      <main style={{maxWidth:1140,margin:"0 auto",padding:"16px 12px"}}>

        {/* Month nav */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <button onClick={()=>changeMonth(-1)} style={navBtnStyle}>‹</button>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:800,color:"#e0f2fe"}}>{yr}年 {MONTHS_JA[mo]}</div>
            <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:3,flexWrap:"wrap"}}>
              {Object.entries(SHIFT_DEFS).map(([k,v])=>(
                <span key={k} style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:"#94a3b8"}}>
                  <span style={{width:7,height:7,borderRadius:"50%",background:v.border,display:"inline-block"}}/>{v.icon}{v.label}
                </span>
              ))}
            </div>
          </div>
          <button onClick={()=>changeMonth(1)} style={navBtnStyle}>›</button>
        </div>

        {/* ── Calendar ── */}
        {view==="calendar"&&(
          <div style={{background:"#111f30",borderRadius:14,overflow:"hidden",border:"1px solid #1e3a5f"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",background:"#0a1628"}}>
              {WEEKDAYS.map((w,i)=><div key={w} style={{textAlign:"center",padding:"8px 0",fontSize:11,fontWeight:700,color:i===0?"#f87171":i===6?"#60a5fa":"#64748b"}}>{w}</div>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,background:"#0a1628"}}>
              {cells.map((d,i)=>{
                if(!d) return <div key={`e${i}`} style={{background:"#0d1b2a",minHeight:110}}/>;
                const ds=toStr(yr,mo,d); const dow=(first+d-1)%7;
                const isHol=HOLIDAYS.has(ds); const shifts=getShiftsForDate(ds); const entry=sched[ds]||{}; const isToday=ds===todayStr;
                return (
                  <div key={ds} onClick={()=>openModal(ds)}
                    style={{background:isToday?"#0c2a45":"#111f30",minHeight:110,padding:"5px 6px",cursor:"pointer",borderTop:isToday?"2px solid #0ea5e9":isHol?"2px solid #f87171":"2px solid transparent"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#162d44"}
                    onMouseLeave={e=>e.currentTarget.style.background=isToday?"#0c2a45":"#111f30"}>
                    <div style={{display:"flex",alignItems:"center",gap:3,marginBottom:4}}>
                      <span style={{fontWeight:700,fontSize:13,color:isHol?"#f87171":dow===0?"#f87171":dow===6?"#60a5fa":"#cbd5e1"}}>{d}</span>
                      {isHol&&<span style={{fontSize:8,background:"#7f1d1d",color:"#fca5a5",borderRadius:3,padding:"1px 3px"}}>祝</span>}
                      {isToday&&<span style={{fontSize:8,background:"#0ea5e9",color:"white",borderRadius:3,padding:"1px 3px"}}>今日</span>}
                    </div>
                    {shifts.map(sk=>{ const sv=SHIFT_DEFS[sk]; const mem=staff.find(x=>x.id===entry[sk]); return (
                      <div key={sk} style={{borderLeft:`3px solid ${sv.border}`,background:"rgba(255,255,255,0.03)",borderRadius:3,padding:"2px 5px",marginBottom:2,display:"flex",alignItems:"center",gap:3}}>
                        <span style={{fontSize:9}}>{sv.icon}</span>
                        <span style={{fontSize:9,color:sv.border,fontWeight:700,minWidth:18}}>{sv.short}</span>
                        <span style={{fontSize:9,color:mem?"#cbd5e1":"#475569",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{mem?mem.name.split(" ")[0]:"未定"}</span>
                      </div>
                    ); })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── List ── */}
        {view==="list"&&(
          <div style={{background:"#111f30",borderRadius:14,overflow:"auto",border:"1px solid #1e3a5f"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
              <thead>
                <tr style={{background:"#0a1628"}}>
                  <th style={thStyle}>日付</th><th style={thStyle}>曜</th><th style={thStyle}>区分</th>
                  <th style={thStyle}>☀️日直</th><th style={thStyle}>🌙準夜</th><th style={thStyle}>📞待機</th>
                  <th style={thStyle}>編集</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({length:days},(_,i)=>i+1).map(d=>{
                  const ds=toStr(yr,mo,d); const dow=(first+d-1)%7;
                  const isHol=HOLIDAYS.has(ds); const isWE=dow===0||dow===6;
                  const entry=sched[ds]||{}; const isToday=ds===todayStr; const type=(isWE||isHol)?"weekend":"weekday";
                  return (
                    <tr key={ds} style={{background:isToday?"#0c2a45":d%2===0?"#0e1e2f":"#111f30",borderBottom:"1px solid #1a3050"}}>
                      <td style={{...tdStyle,fontWeight:700,color:isHol?"#f87171":dow===0?"#f87171":dow===6?"#60a5fa":"#e2e8f0"}}>
                        {mo+1}/{d}{isHol&&<span style={{marginLeft:3,fontSize:8,background:"#7f1d1d",color:"#fca5a5",borderRadius:3,padding:"1px 3px"}}>祝</span>}
                        {isToday&&<span style={{marginLeft:3,fontSize:8,background:"#0ea5e9",color:"white",borderRadius:3,padding:"1px 3px"}}>今日</span>}
                      </td>
                      <td style={{...tdStyle,color:dow===0?"#f87171":dow===6?"#60a5fa":"#64748b"}}>{WEEKDAYS[dow]}</td>
                      <td style={tdStyle}><span style={{fontSize:10,borderRadius:5,padding:"2px 6px",fontWeight:700,background:type==="weekend"?"#431407":"#052e16",color:type==="weekend"?"#fb923c":"#4ade80"}}>{type==="weekend"?"土日祝":"平日"}</span></td>
                      <td style={tdStyle}>{(isWE||isHol)?<StaffBadge id={entry.nisoku} shift="nisoku" staff={staff}/>:<span style={{color:"#334155"}}>—</span>}</td>
                      <td style={tdStyle}><StaffBadge id={entry.junya}  shift="junya"  staff={staff}/></td>
                      <td style={tdStyle}><StaffBadge id={entry.oncall} shift="oncall" staff={staff}/></td>
                      <td style={tdStyle}><button onClick={()=>openModal(ds)} style={{background:"#0ea5e920",color:"#0ea5e9",border:"1px solid #0ea5e944",borderRadius:5,padding:"3px 8px",fontSize:11,cursor:"pointer"}}>✎</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Summary ── */}
        {view==="summary"&&(
          <div>
            <h3 style={{color:"#e0f2fe",marginBottom:14,fontSize:15}}>{yr}年{MONTHS_JA[mo]}の担当回数</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
              {staff.map(s=>{ const cnt=summary[s.id]||{nisoku:0,junya:0,oncall:0}; const total=(cnt.nisoku||0)+(cnt.junya||0)+(cnt.oncall||0); return (
                <div key={s.id} style={{background:"#111f30",border:`1px solid ${s.color}33`,borderRadius:12,padding:14,borderTop:`3px solid ${s.color}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <span style={{width:32,height:32,borderRadius:"50%",background:s.color+"22",border:`2px solid ${s.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:s.color,fontWeight:800,flexShrink:0}}>{s.name[0]}</span>
                    <div><div style={{fontWeight:700,color:"#e2e8f0",fontSize:13}}>{s.name}</div><div style={{fontSize:10,color:"#64748b"}}>合計 {total} 回</div></div>
                  </div>
                  {Object.entries(SHIFT_DEFS).map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <span style={{fontSize:11,color:"#94a3b8"}}>{v.icon} {v.label}</span>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{height:5,width:60,background:"#1e3a5f",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,(cnt[k]||0)/5*100)}%`,background:v.border,borderRadius:3}}/></div>
                        <span style={{fontSize:12,fontWeight:700,color:v.border,minWidth:16,textAlign:"right"}}>{cnt[k]||0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ); })}
            </div>
          </div>
        )}

        {/* ── Notifications ── */}
        {view==="notify"&&(
          <div style={{background:"#111f30",borderRadius:14,border:"1px solid #1e3a5f",padding:20}}>
            <h3 style={{marginTop:0,color:"#e0f2fe",fontSize:15}}>🔔 更新通知</h3>
            {notifs.length===0?<p style={{color:"#475569",textAlign:"center",padding:30}}>まだ通知はありません</p>
              :notifs.map(n=>(
                <div key={n.id} style={{border:"1px solid #1e3a5f",borderRadius:8,padding:"9px 14px",marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center",background:"#0e1e2f"}}>
                  <span style={{fontSize:12,color:"#cbd5e1"}}>✅ {n.msg}</span>
                  <span style={{color:"#475569",fontSize:11,minWidth:44}}>{n.time}</span>
                </div>
              ))
            }
          </div>
        )}

        {/* Staff strip */}
        <div style={{marginTop:14,background:"#111f30",borderRadius:12,border:"1px solid #1e3a5f",padding:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:11,fontWeight:700,color:"#475569"}}>👤 スタッフ（{staff.length}/{MAX_STAFF}名）{staff.length>=MAX_STAFF&&<span style={{marginLeft:6,fontSize:10,color:"#f87171"}}>上限</span>}</div>
            {staff.length<MAX_STAFF&&<button onClick={()=>{setSettingsOpen(true);setSettingsTab("member");openAddMember();}} style={{background:"#0ea5e920",color:"#0ea5e9",border:"1px solid #0ea5e944",borderRadius:5,padding:"2px 10px",fontSize:11,cursor:"pointer",fontWeight:700}}>＋</button>}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {staff.map(s=>(
              <div key={s.id} onClick={()=>{setSettingsOpen(true);setSettingsTab("member");openEditMember(s);}}
                style={{display:"flex",alignItems:"center",gap:5,background:"#0e1e2f",border:`1px solid ${s.color}44`,borderRadius:7,padding:"3px 9px",cursor:"pointer"}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:s.color,display:"inline-block"}}/>
                <span style={{fontSize:11,color:"#cbd5e1",fontWeight:600}}>{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ══════════ Sync Panel ══════════ */}
      {showSync&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400}}>
          <div style={{background:"#0f1e2f",border:"1px solid #1e3a5f",borderRadius:18,width:480,maxWidth:"95vw",padding:26,boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontSize:16,fontWeight:800,color:"#e0f2fe"}}>☁️ Googleスプレッドシート連携</div>
              <button onClick={()=>setShowSync(false)} style={{background:"transparent",border:"none",color:"#64748b",fontSize:20,cursor:"pointer"}}>✕</button>
            </div>

            <div style={{background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:10,padding:14,marginBottom:18,fontSize:12,color:"#64748b",lineHeight:1.8}}>
              <div style={{color:"#94a3b8",fontWeight:700,marginBottom:6}}>📋 設定手順</div>
              <div>1. Googleスプレッドシートを新規作成</div>
              <div>2. 拡張機能 → Apps Script を開く</div>
              <div>3. 別ファイル <span style={{color:"#0ea5e9",fontWeight:700}}>gas-script.gs</span> のコードを貼り付け</div>
              <div>4. デプロイ → 新しいデプロイ → ウェブアプリ</div>
              <div>5. 「アクセスできるユーザー」を <span style={{color:"#fb923c"}}>全員</span> に設定</div>
              <div>6. 発行されたURLを下に貼り付ける</div>
            </div>

            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,color:"#64748b",display:"block",marginBottom:6}}>Apps Script デプロイURL</label>
              <input value={gasUrl} onChange={e=>setGasUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/xxxxx/exec"
                style={{width:"100%",padding:"9px 12px",background:"#0a1628",border:"1.5px solid #1e3a5f",borderRadius:8,fontSize:12,color:"#e2e8f0",outline:"none",boxSizing:"border-box"}}/>
            </div>

            {syncMsg&&(
              <div style={{marginBottom:14,padding:"8px 12px",borderRadius:8,background:syncStatus==="ok"?"#052e16":syncStatus==="error"?"#450a0a":"#1c1c00",border:`1px solid ${syncColor}44`,fontSize:12,color:syncColor}}>
                {syncMsg}
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <button onClick={loadFromSheets} disabled={syncStatus==="loading"} style={{padding:"11px 0",background:"#0ea5e920",color:"#0ea5e9",border:"1px solid #0ea5e944",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:700}}>
                {syncStatus==="loading"?"⏳ 処理中...":"📥 読み込む"}
              </button>
              <button onClick={saveToSheets} disabled={syncStatus==="loading"} style={{padding:"11px 0",background:"#0ea5e9",color:"white",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:700}}>
                {syncStatus==="loading"?"⏳ 処理中...":"📤 保存する"}
              </button>
            </div>
            <div style={{marginTop:10,fontSize:11,color:"#334155",textAlign:"center"}}>
              ※ 読み込みはスプレッドシートの内容でアプリを上書きします
            </div>
          </div>
        </div>
      )}

      {/* ══════════ Settings Panel ══════════ */}
      {settingsOpen&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
          <div style={{background:"#0f1e2f",border:"1px solid #1e3a5f",borderRadius:18,width:540,maxWidth:"96vw",maxHeight:"92vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}>
            <div style={{padding:"16px 22px 0",borderBottom:"1px solid #1e3a5f"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:16,fontWeight:800,color:"#e0f2fe"}}>⚙️ 設定</div>
                <button onClick={()=>{setSettingsOpen(false);closeMasterEditor();}} style={{background:"transparent",border:"none",color:"#64748b",fontSize:20,cursor:"pointer"}}>✕</button>
              </div>
              <div style={{display:"flex",gap:4}}>
                {[["member","👤 メンバー"],["master","📋 マスター"]].map(([k,l])=>(
                  <button key={k} onClick={()=>{setSettingsTab(k);k==="master"?openMasterEditor():closeMasterEditor();}} style={{padding:"7px 16px",background:settingsTab===k?"#111f30":"transparent",color:settingsTab===k?"#e0f2fe":"#64748b",border:"none",borderRadius:"8px 8px 0 0",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:settingsTab===k?"2px solid #0ea5e9":"2px solid transparent"}}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{overflowY:"auto",flex:1,padding:"18px 22px"}}>

              {settingsTab==="member"&&(<>
                <div style={{background:"#111f30",border:"1px solid #1e3a5f",borderRadius:12,padding:16,marginBottom:18}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:12}}>{editingMember?`✎ 編集中：${editingMember.name}`:`＋ 追加（${staff.length}/${MAX_STAFF}名）`}</div>
                  {!editingMember&&staff.length>=MAX_STAFF
                    ?<div style={{color:"#f87171",fontSize:12}}>上限（{MAX_STAFF}名）に達しています</div>
                    :(<>
                      <input value={memberForm.name} onChange={e=>setMemberForm(p=>({...p,name:e.target.value}))} placeholder="氏名を入力"
                        style={{width:"100%",padding:"8px 12px",background:"#0a1628",border:"1.5px solid #1e3a5f",borderRadius:8,fontSize:13,color:"#e2e8f0",outline:"none",boxSizing:"border-box",marginBottom:12}}/>
                      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                        {COLOR_OPTIONS.map(c=>(
                          <div key={c} onClick={()=>setMemberForm(p=>({...p,color:c}))}
                            style={{width:24,height:24,borderRadius:"50%",background:c,cursor:"pointer",border:memberForm.color===c?"3px solid white":"3px solid transparent",boxShadow:memberForm.color===c?`0 0 0 2px ${c}`:"none"}}/>
                        ))}
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        {editingMember&&<button onClick={()=>{setEditingMember(null);setMemberForm({name:"",color:COLOR_OPTIONS[0]});}} style={{padding:"7px 14px",background:"transparent",border:"1px solid #1e3a5f",color:"#64748b",borderRadius:7,cursor:"pointer",fontSize:12}}>キャンセル</button>}
                        <button onClick={saveMember} disabled={!memberForm.name.trim()} style={{flex:1,padding:"8px 0",background:memberForm.name.trim()?"#0ea5e9":"#1e3a5f",color:memberForm.name.trim()?"white":"#475569",border:"none",borderRadius:7,cursor:memberForm.name.trim()?"pointer":"not-allowed",fontSize:13,fontWeight:700}}>
                          {editingMember?"💾 更新":"➕ 追加"}
                        </button>
                      </div>
                    </>)
                  }
                </div>
                <div style={{fontSize:11,fontWeight:700,color:"#475569",marginBottom:8}}>メンバー一覧（{staff.length}/{MAX_STAFF}名）</div>
                {staff.map(s=>(
                  <div key={s.id} style={{background:"#111f30",border:`1px solid ${s.color}33`,borderRadius:9,padding:"9px 12px",marginBottom:7,display:"flex",alignItems:"center",gap:9}}>
                    <span style={{width:28,height:28,borderRadius:"50%",background:s.color+"22",border:`2px solid ${s.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:s.color,fontWeight:800,flexShrink:0}}>{s.name[0]}</span>
                    <span style={{flex:1,fontWeight:600,color:"#e2e8f0",fontSize:13}}>{s.name}</span>
                    <button onClick={()=>openEditMember(s)} style={{background:"#0ea5e920",color:"#0ea5e9",border:"1px solid #0ea5e944",borderRadius:5,padding:"3px 9px",fontSize:11,cursor:"pointer"}}>編集</button>
                    {deleteConfirm===s.id
                      ?<div style={{display:"flex",gap:5,alignItems:"center"}}><span style={{fontSize:10,color:"#f87171"}}>削除？</span><button onClick={()=>deleteMember(s.id)} style={{background:"#ef444430",color:"#f87171",border:"1px solid #ef444455",borderRadius:5,padding:"3px 7px",fontSize:11,cursor:"pointer"}}>はい</button><button onClick={()=>setDeleteConfirm(null)} style={{background:"transparent",border:"1px solid #1e3a5f",color:"#64748b",borderRadius:5,padding:"3px 7px",fontSize:11,cursor:"pointer"}}>戻る</button></div>
                      :<button onClick={()=>setDeleteConfirm(s.id)} style={{background:"#ef444415",color:"#f87171",border:"1px solid #ef444433",borderRadius:5,padding:"3px 9px",fontSize:11,cursor:"pointer"}}>削除</button>
                    }
                  </div>
                ))}
              </>)}

              {settingsTab==="master"&&draftWD&&(<>
                <div style={{fontSize:11,color:"#64748b",marginBottom:14,lineHeight:1.7,background:"#0a1628",padding:"10px 12px",borderRadius:8,border:"1px solid #1e3a5f"}}>
                  💡 シフトの担当順を設定します。順番通りに繰り返して自動割り当てされます。
                </div>
                <MasterSection title="📅 平日（準夜勤・待機）" accentColor="#4ade80" draft={draftWD} shifts={["junya","oncall"]} staff={staff} onAdd={(sk,sid)=>addMasterRow("wd",sk,sid)} onRemove={idx=>removeMasterRow("wd",idx)} onMove={(idx,dir)=>moveMasterRow("wd",idx,dir)}/>
                <div style={{height:14}}/>
                <MasterSection title="🏖️ 土日祝（日直・準夜勤・待機）" accentColor="#fb923c" draft={draftWE} shifts={["nisoku","junya","oncall"]} staff={staff} onAdd={(sk,sid)=>addMasterRow("we",sk,sid)} onRemove={idx=>removeMasterRow("we",idx)} onMove={(idx,dir)=>moveMasterRow("we",idx,dir)}/>
                <div style={{display:"flex",gap:10,marginTop:18}}>
                  <button onClick={closeMasterEditor} style={{flex:1,padding:"9px 0",background:"transparent",border:"1px solid #1e3a5f",color:"#64748b",borderRadius:9,cursor:"pointer",fontSize:13}}>キャンセル</button>
                  <button onClick={saveMaster} style={{flex:2,padding:"9px 0",background:"#0ea5e9",color:"white",border:"none",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:800}}>✅ 今月に適用・保存</button>
                </div>
              </>)}
            </div>
          </div>
        </div>
      )}

      {/* ══════════ Shift Edit Modal ══════════ */}
      {modal&&(()=>{
        const shifts=getShiftsForDate(modal); const dow=new Date(modal).getDay(); const isHol=HOLIDAYS.has(modal); const isWE=dow===0||dow===6;
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
            <div style={{background:"#111f30",border:"1px solid #1e3a5f",borderRadius:18,padding:22,width:340,maxWidth:"94vw",boxShadow:"0 24px 60px rgba(0,0,0,0.5)"}}>
              <div style={{fontSize:16,fontWeight:800,color:"#e0f2fe",marginBottom:4}}>✎ シフト編集</div>
              <div style={{fontSize:11,color:"#64748b",marginBottom:14}}>{modal}（{(isWE||isHol)?"土日祝":"平日"}）</div>
              {shifts.map(sk=>{ const sv=SHIFT_DEFS[sk]; return (
                <div key={sk} style={{marginBottom:12}}>
                  <label style={{display:"block",fontSize:12,fontWeight:700,color:sv.border,marginBottom:4}}>{sv.icon} {sv.label}</label>
                  <select value={editData[sk]||""} onChange={e=>setEditData(p=>({...p,[sk]:Number(e.target.value)||null}))}
                    style={{width:"100%",padding:"8px 10px",background:"#0a1628",border:`1.5px solid ${sv.border}55`,borderRadius:7,fontSize:13,color:"#e2e8f0",outline:"none"}}>
                    <option value="">— 未割り当て —</option>
                    {staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              ); })}
              <div style={{display:"flex",gap:8,marginTop:16}}>
                <button onClick={()=>setModal(null)} style={{flex:1,padding:"9px 0",background:"transparent",border:"1px solid #1e3a5f",color:"#94a3b8",borderRadius:9,cursor:"pointer",fontSize:13}}>キャンセル</button>
                <button onClick={saveModal} style={{flex:2,padding:"9px 0",background:"#0ea5e9",color:"white",border:"none",borderRadius:9,cursor:"pointer",fontSize:13,fontWeight:700}}>💾 保存</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function MasterSection({ title, accentColor, draft, shifts, staff, onAdd, onRemove, onMove }) {
  const [addShift, setAddShift] = useState(shifts[0]);
  const [addStaff, setAddStaff] = useState("");
  return (
    <div style={{background:"#111f30",border:`1px solid ${accentColor}33`,borderRadius:12,padding:14}}>
      <div style={{fontSize:12,fontWeight:800,color:accentColor,marginBottom:12}}>{title}</div>
      {shifts.map(sk=>{ const sv=SHIFT_DEFS[sk]; const rows=draft.map((r,i)=>({...r,idx:i})).filter(r=>r.shift===sk); return (
        <div key={sk} style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:sv.border,marginBottom:6}}>{sv.icon} {sv.label} の担当順</div>
          {rows.length===0&&<div style={{fontSize:11,color:"#334155",padding:"3px 0"}}>（未設定）</div>}
          {rows.map((r,pos)=>{ const mem=staff.find(x=>x.id===r.staffId); return (
            <div key={r.idx} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,background:"#0e1e2f",borderRadius:6,padding:"5px 8px",border:`1px solid ${sv.border}22`}}>
              <span style={{fontSize:10,color:"#475569",minWidth:16,textAlign:"right"}}>{pos+1}</span>
              <span style={{width:6,height:6,borderRadius:"50%",background:mem?.color||"#475569",flexShrink:0,display:"inline-block"}}/>
              <span style={{flex:1,fontSize:12,color:mem?"#e2e8f0":"#f87171"}}>{mem?mem.name:"（削除済み）"}</span>
              <button onClick={()=>onMove(r.idx,-1)} disabled={pos===0} style={{background:"transparent",border:"1px solid #1e3a5f",color:pos===0?"#334155":"#94a3b8",borderRadius:4,padding:"1px 5px",cursor:pos===0?"not-allowed":"pointer",fontSize:10}}>▲</button>
              <button onClick={()=>onMove(r.idx,1)} disabled={pos===rows.length-1} style={{background:"transparent",border:"1px solid #1e3a5f",color:pos===rows.length-1?"#334155":"#94a3b8",borderRadius:4,padding:"1px 5px",cursor:pos===rows.length-1?"not-allowed":"pointer",fontSize:10}}>▼</button>
              <button onClick={()=>onRemove(r.idx)} style={{background:"#ef444415",color:"#f87171",border:"1px solid #ef444433",borderRadius:4,padding:"1px 6px",cursor:"pointer",fontSize:10}}>✕</button>
            </div>
          ); })}
        </div>
      ); })}
      <div style={{borderTop:"1px solid #1e3a5f",paddingTop:10,display:"flex",gap:6,flexWrap:"wrap"}}>
        <select value={addShift} onChange={e=>setAddShift(e.target.value)} style={{padding:"5px 8px",background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:6,fontSize:11,color:"#e2e8f0",outline:"none"}}>
          {shifts.map(sk=><option key={sk} value={sk}>{SHIFT_DEFS[sk].icon} {SHIFT_DEFS[sk].label}</option>)}
        </select>
        <select value={addStaff} onChange={e=>setAddStaff(e.target.value)} style={{flex:1,padding:"5px 8px",background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:6,fontSize:11,color:"#e2e8f0",outline:"none"}}>
          <option value="">— 担当者を選択 —</option>
          {staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={()=>{onAdd(addShift,addStaff);setAddStaff("");}} disabled={!addStaff} style={{padding:"5px 10px",background:addStaff?"#0ea5e9":"#1e3a5f",color:addStaff?"white":"#475569",border:"none",borderRadius:6,cursor:addStaff?"pointer":"not-allowed",fontSize:11,fontWeight:700}}>＋ 追加</button>
      </div>
    </div>
  );
}

function StaffBadge({id,shift,staff}){
  const s=staff.find(x=>x.id===id); const sv=SHIFT_DEFS[shift];
  if(!s) return <span style={{color:"#334155",fontSize:11}}>未定</span>;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(255,255,255,0.03)",border:`1px solid ${sv.border}44`,borderRadius:5,padding:"2px 7px",fontSize:11}}>
      <span style={{width:5,height:5,borderRadius:"50%",background:s.color,display:"inline-block"}}/>
      <span style={{color:"#cbd5e1"}}>{s.name}</span>
    </span>
  );
}

const navBtnStyle={background:"#0ea5e910",color:"#0ea5e9",border:"1px solid #0ea5e944",borderRadius:8,padding:"7px 16px",cursor:"pointer",fontSize:16,fontWeight:700};
const thStyle={padding:"9px 10px",textAlign:"left",fontSize:11,fontWeight:700,color:"#64748b",borderBottom:"1px solid #1a3050"};
const tdStyle={padding:"8px 10px",fontSize:12,verticalAlign:"middle",color:"#cbd5e1"};
