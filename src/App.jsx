import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── localStorage ─────────────────────────────────────────────────
const LS_KEY = "labDutyData_v2";
const LS_SB  = "labDutySupabase";
function lsSave(d){ try{ localStorage.setItem(LS_KEY,JSON.stringify(d)); }catch(e){} }
function lsLoad(){ try{ const r=localStorage.getItem(LS_KEY); return r?JSON.parse(r):null; }catch(e){ return null; } }
function lsSaveSB(d){ try{ localStorage.setItem(LS_SB,JSON.stringify(d)); }catch(e){} }
function lsLoadSB(){ try{ const r=localStorage.getItem(LS_SB); return r?JSON.parse(r):null; }catch(e){ return null; } }

// ─── Supabase クライアント ─────────────────────────────────────────
let _sb = null;
function getSB(){
  const cfg = lsLoadSB();
  if(!cfg?.url||!cfg?.key) return null;
  if(!_sb) _sb = createClient(cfg.url, cfg.key);
  return _sb;
}
function resetSB(){ _sb = null; }

// ─── 祝日 ─────────────────────────────────────────────────────────
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
function isHol(ds){ return HOLIDAYS.has(ds)||new Date(ds).getDay()===0||new Date(ds).getDay()===6; }

// ─── 定数 ─────────────────────────────────────────────────────────
const MAX_STAFF = 30;
const INITIAL_STAFF = [
  {id:1,name:"田中 一郎",color:"#007AFF",shift班:"A",拘束分類:"A"},
  {id:2,name:"佐藤 花子",color:"#34C759",shift班:"A",拘束分類:"B"},
  {id:3,name:"山田 太郎",color:"#FF9500",shift班:"B",拘束分類:"A"},
  {id:4,name:"鈴木 美咲",color:"#FF3B30",shift班:"B",拘束分類:"B"},
  {id:5,name:"中村 健二",color:"#AF52DE",shift班:"A",拘束分類:"A"},
  {id:6,name:"伊藤 直子",color:"#FF2D55",shift班:"B",拘束分類:"B"},
];
const COLOR_OPTIONS=[
  "#007AFF","#34C759","#FF9500","#FF3B30","#AF52DE","#FF2D55",
  "#5AC8FA","#4CD964","#FFCC00","#FF6B6B","#BF5AF2","#FF375F",
  "#0A84FF","#30D158","#FFD60A","#FF453A","#9C27B0","#E91E63",
  "#32ADE6","#64D2FF","#F7A046","#E53935","#6D28D9","#BE185D",
  "#0071E3","#1D9BF0","#CA8A04","#DC2626","#7C3AED","#9D174D",
];

// シフト定義
const SHIFT_DEFS={
  nisoku:  {label:"日直",  color:"#FF9500", bg:"#FFF3E0", icon:"☀️"},
  junya:   {label:"準夜勤",color:"#007AFF", bg:"#EEF4FF", icon:"🌙"},
  oncallA: {label:"拘束A", color:"#34C759", bg:"#EDFBF0", icon:"📗"},
  oncallB: {label:"拘束B", color:"#AF52DE", bg:"#F5EEFF", icon:"📘"},
};

// ─── ペアルール ───────────────────────────────────────────────────
// 平日: 準夜勤がA班 → 拘束B担当者が拘束に入る
//       準夜勤がB班 → 拘束A担当者が拘束に入る
// 土日祝: 日直・準夜勤がA班 → 拘束B担当者が拘束に入る
//         日直・準夜勤がB班 → 拘束A担当者が拘束に入る
// 拘束の種類（A/B）は準夜勤（平日）or 日直（土日祝）の班で自動決定

function getOncallTypeForShiftBan(ban){
  // A班が勤務 → 拘束B、B班が勤務 → 拘束A
  return ban==="A" ? "B" : "A";
}
function getOncallShiftKey(ban){
  // A班が勤務 → oncallB、B班が勤務 → oncallA
  return ban==="A" ? "oncallB" : "oncallA";
}

// ─── ユーティリティ ───────────────────────────────────────────────
function daysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function firstDow(y,m)   { return new Date(y,m,1).getDay(); }
function toStr(y,m,d)    { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }

// スケジュール生成
// 拘束の割り当ては手動。マスターは準夜勤・日直・拘束A/Bの順番のみ管理。
// 平日・土日祝それぞれ独立して適用できる。
function genSchedWD(y,m,wdO,staffList){
  // 平日のみ再生成
  const n=daysInMonth(y,m); const sched={};
  function q(o,k){ return o.filter(r=>r.shift===k).map(r=>r.staffId); }
  function byAll(){ return (staffList||[]).map(s=>s.id); }
  function by拘束(t){ return (staffList||[]).filter(s=>s["拘束分類"]===t).map(s=>s.id); }
  const J  = q(wdO,"junya").length  ? q(wdO,"junya")  : byAll();
  const OCA= q(wdO,"oncallA").length? q(wdO,"oncallA"): by拘束("A");
  const OCB= q(wdO,"oncallB").length? q(wdO,"oncallB"): by拘束("B");
  let cj=0,coa=0,cob=0,oTurn=0; // oTurn: 0=拘束A 1=拘束B
  for(let d=1;d<=n;d++){
    const ds=toStr(y,m,d);
    if(isHol(ds)) continue; // 平日のみ
    const e={};
    if(J.length)  { e.junya=J[cj%J.length]; cj++; }
    // 拘束は交互（A→B→A...）手動変更可能
    if(oTurn===0){ if(OCA.length){ e.oncallA=OCA[coa%OCA.length]; coa++; } }
    else         { if(OCB.length){ e.oncallB=OCB[cob%OCB.length]; cob++; } }
    oTurn=oTurn===0?1:0;
    sched[ds]=e;
  }
  return sched;
}

function genSchedWE(y,m,weO,staffList){
  // 土日祝のみ再生成
  const n=daysInMonth(y,m); const sched={};
  function q(o,k){ return o.filter(r=>r.shift===k).map(r=>r.staffId); }
  function byAll(){ return (staffList||[]).map(s=>s.id); }
  function by拘束(t){ return (staffList||[]).filter(s=>s["拘束分類"]===t).map(s=>s.id); }
  const N  = q(weO,"nisoku").length ? q(weO,"nisoku") : byAll();
  const J  = q(weO,"junya").length  ? q(weO,"junya")  : byAll();
  const OCA= q(weO,"oncallA").length? q(weO,"oncallA"): by拘束("A");
  const OCB= q(weO,"oncallB").length? q(weO,"oncallB"): by拘束("B");
  let cn=0,cj=0,coa=0,cob=0,oTurn=0;
  for(let d=1;d<=n;d++){
    const ds=toStr(y,m,d);
    if(!isHol(ds)) continue; // 土日祝のみ
    const e={};
    if(N.length)  { e.nisoku=N[cn%N.length]; cn++; }
    if(J.length)  { e.junya=J[cj%J.length];  cj++; }
    if(oTurn===0){ if(OCA.length){ e.oncallA=OCA[coa%OCA.length]; coa++; } }
    else         { if(OCB.length){ e.oncallB=OCB[cob%OCB.length]; cob++; } }
    oTurn=oTurn===0?1:0;
    sched[ds]=e;
  }
  return sched;
}

function genSched(y,m,wdO,weO,staffList){
  return {...genSchedWD(y,m,wdO,staffList), ...genSchedWE(y,m,weO,staffList)};
}

function buildMaster(staff){
  const wd=[],we=[];
  // 平日: 準夜勤（全員） + 拘束A担当 + 拘束B担当
  staff.forEach(s=>wd.push({shift:"junya",staffId:s.id}));
  staff.filter(s=>s["拘束分類"]==="A").forEach(s=>wd.push({shift:"oncallA",staffId:s.id}));
  staff.filter(s=>s["拘束分類"]==="B").forEach(s=>wd.push({shift:"oncallB",staffId:s.id}));
  // 土日祝: 日直（全員） + 準夜勤（全員） + 拘束A担当 + 拘束B担当
  staff.forEach(s=>we.push({shift:"nisoku",staffId:s.id}));
  staff.forEach(s=>we.push({shift:"junya",staffId:s.id}));
  staff.filter(s=>s["拘束分類"]==="A").forEach(s=>we.push({shift:"oncallA",staffId:s.id}));
  staff.filter(s=>s["拘束分類"]==="B").forEach(s=>we.push({shift:"oncallB",staffId:s.id}));
  return {wd,we};
}

// その日のエントリから表示用シフトリストを返す
function getDisplayShifts(ds, entry){
  const base = isHol(ds) ? ["nisoku","junya"] : ["junya"];
  if(entry?.oncallA) base.push("oncallA");
  else if(entry?.oncallB) base.push("oncallB");
  else base.push("oncallA"); // デフォルト表示
  return base;
}

const today=new Date();
const todayStr=toStr(today.getFullYear(),today.getMonth(),today.getDate());
const WD=["日","月","火","水","木","金","土"];
const MJ=["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

// ════════════════════════════════════════════════════════════════════
export default function App(){
  const saved=lsLoad();
  const m0=buildMaster(saved?.staff||INITIAL_STAFF);
  const initStaff=saved?.staff||INITIAL_STAFF;

  const [staff,  setStaff ]=useState(initStaff);
  const [wdO,    setWdO   ]=useState(saved?.wdO||m0.wd);
  const [weO,    setWeO   ]=useState(saved?.weO||m0.we);
  const [yr,     setYr    ]=useState(today.getFullYear());
  const [mo,     setMo    ]=useState(today.getMonth());
  const [sched,  setSched ]=useState(()=>{
    const base=genSched(today.getFullYear(),today.getMonth(),saved?.wdO||m0.wd,saved?.weO||m0.we,initStaff);
    return saved?.sched?{...base,...saved.sched}:base;
  });
  const [selDs,  setSelDs ]=useState(todayStr);
  const [tab,    setTab   ]=useState("cal");
  const [notifs, setNotifs]=useState([]);
  const [editOpen,  setEditOpen ]=useState(false);
  const [editData,  setEditData ]=useState({});
  const [settOpen,  setSettOpen ]=useState(false);
  const [settTab,   setSettTab  ]=useState("member");
  const [syncOpen,  setSyncOpen ]=useState(false);
  const [editMember,setEditMember]=useState(null);
  const [mForm,  setMForm ]=useState({name:"",color:COLOR_OPTIONS[0],"shift班":"A","拘束分類":"A"});
  const [delConf,setDelConf]=useState(null);
  const [dWD,    setDWD   ]=useState(null);
  const [dWE,    setDWE   ]=useState(null);
  const [syncSt,  setSyncSt ]=useState("idle"); // idle|loading|ok|error|live
  const [syncMsg, setSyncMsg]=useState("");
  const [sbUrl,   setSbUrl  ]=useState(()=>lsLoadSB()?.url||"");
  const [sbKey,   setSbKey  ]=useState(()=>lsLoadSB()?.key||"");
  const [liveOn,  setLiveOn ]=useState(false);
  const [clearConf,setClearConf]=useState(false);
  const savingRef=useRef(false);
  const subRef=useRef(null);

  function note(msg){setNotifs(p=>[{id:Date.now(),msg,time:new Date().toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"})},...p].slice(0,20));}

  // localStorage自動保存
  useEffect(()=>{ lsSave({staff,sched,wdO,weO}); },[staff,sched,wdO,weO]);
  // Supabase設定保存
  useEffect(()=>{ lsSaveSB({url:sbUrl,key:sbKey}); },[sbUrl,sbKey]);
  // 起動時にSupabase接続
  useEffect(()=>{
    if(sbUrl&&sbKey){ loadFromSB(); startRealtime(); }
    return ()=>{ if(subRef.current){ subRef.current.unsubscribe(); } };
  },[]);

  function chMo(d){
    let nm=mo+d,ny=yr;
    if(nm<0){nm=11;ny--;} else if(nm>11){nm=0;ny++;}
    setMo(nm);setYr(ny);
    setSched(prev=>({...genSched(ny,nm,wdO,weO,staff),...prev}));
    setSelDs(toStr(ny,nm,1));
  }

  function openEdit(ds){setEditData({...(sched[ds]||{})});setSelDs(ds);setEditOpen(true);}

  function saveEdit(){
    const newSched={...sched,[selDs]:{...editData}};
    setSched(newSched);
    const keys=["nisoku","junya","oncallA","oncallB"];
    const names=keys.map(k=>{const m=staff.find(x=>x.id===editData[k]);return m?`${SHIFT_DEFS[k].icon}${m.name}`:null;}).filter(Boolean).join(" ");
    note(`${selDs} 更新 (${names})`);setEditOpen(false);
    saveToDB({sched:newSched});
  }

  function startAdd(){setEditMember(null);setMForm({name:"",color:COLOR_OPTIONS[staff.length%COLOR_OPTIONS.length],"shift班":"A","拘束分類":"A"});}
  function startEdit(s){setEditMember(s);setMForm({name:s.name,color:s.color,"shift班":s["shift班"]||"A","拘束分類":s["拘束分類"]||"A"});}

  function saveMember(){
    if(!mForm.name.trim())return;
    let newStaff;
    if(editMember){
      newStaff=staff.map(s=>s.id===editMember.id?{...s,...mForm,name:mForm.name.trim()}:s);
      note(`「${mForm.name.trim()}」を更新しました`);
    } else {
      if(staff.length>=MAX_STAFF)return;
      newStaff=[...staff,{id:Date.now(),...mForm,name:mForm.name.trim()}];
      note(`「${mForm.name.trim()}」を追加しました`);
    }
    setStaff(newStaff);
    setEditMember(null);
    setMForm({name:"",color:COLOR_OPTIONS[0],"shift班":"A","拘束分類":"A"});
    saveToDB({staff:newStaff});
  }

  function delMember(id){
    const m=staff.find(s=>s.id===id);
    const newStaff=staff.filter(s=>s.id!==id);
    setStaff(newStaff);
    setWdO(p=>p.filter(r=>r.staffId!==id));
    setWeO(p=>p.filter(r=>r.staffId!==id));
    setSched(prev=>{
      const nx={...prev};
      Object.keys(nx).forEach(ds=>{const e={...nx[ds]};Object.keys(e).forEach(k=>{if(e[k]===id)e[k]=null;});nx[ds]=e;});
      return nx;
    });
    note(`「${m?.name}」を削除しました`);setDelConf(null);
  }

  function openMaster(){setDWD(wdO.map(r=>({...r})));setDWE(weO.map(r=>({...r})));}
  function closeMaster(){setDWD(null);setDWE(null);}
  function addMR(type,sk,sid){if(!sid)return;(type==="wd"?setDWD:setDWE)(p=>[...p,{shift:sk,staffId:Number(sid)}]);}
  function remMR(type,i){(type==="wd"?setDWD:setDWE)(p=>p.filter((_,j)=>j!==i));}
  function movMR(type,i,d){(type==="wd"?setDWD:setDWE)(p=>{const a=[...p],n=i+d;if(n<0||n>=a.length)return a;[a[i],a[n]]=[a[n],a[i]];return a;});}
  function saveMasterWD(){
    const ns={...sched,...genSchedWD(yr,mo,dWD,staff)};
    setWdO(dWD);setSched(ns);
    note("平日シフトのマスターを適用しました");
    saveToDB({wdO:dWD,sched:ns});
  }
  function saveMasterWE(){
    const ns={...sched,...genSchedWE(yr,mo,dWE,staff)};
    setWeO(dWE);setSched(ns);
    note("土日祝シフトのマスターを適用しました");
    saveToDB({weO:dWE,sched:ns});
  }
  function saveMaster(){
    const ns={...sched,...genSched(yr,mo,dWD,dWE,staff)};
    setWdO(dWD);setWeO(dWE);setSched(ns);
    note("マスターを更新し今月を再生成しました");closeMaster();
    saveToDB({wdO:dWD,weO:dWE,sched:ns});
  }

  function clearAllShifts(){
    const empty={};
    for(let d=1;d<=daysInMonth(yr,mo);d++) empty[toStr(yr,mo,d)]={};
    const ns={...sched,...empty};
    setSched(ns);
    note(`${yr}年${MJ[mo]}のシフトをクリアしました`);setClearConf(false);
    saveToDB({sched:ns});
  }

  // ── Supabase: データ読み込み ──
  async function loadFromSB(){
    try{
      const sb=getSB(); if(!sb){ setSyncMsg("❌ 接続情報が不正です"); setSyncSt("error"); return; }
      setSyncSt("loading"); setSyncMsg("読み込み中...");
      const {data,error}=await sb.from("duty_data").select("*").eq("id","main").single();
      if(error){
        // データがまだない場合はOK（初回）
        if(error.code==="PGRST116"){ setSyncSt("ok"); setSyncMsg("✅ 接続OK（データはまだありません）"); return; }
        throw error;
      }
      if(!data){ setSyncSt("ok"); setSyncMsg("✅ 接続OK（データなし）"); return; }
      if(data.staff&&Array.isArray(data.staff)&&data.staff.length>0) setStaff(data.staff);
      if(data.sched&&Object.keys(data.sched).length>0) setSched(data.sched);
      if(data.wd_order&&Array.isArray(data.wd_order)&&data.wd_order.length>0) setWdO(data.wd_order);
      if(data.we_order&&Array.isArray(data.we_order)&&data.we_order.length>0) setWeO(data.we_order);
      setSyncSt("ok"); setSyncMsg("✅ 読み込み完了");
      note("Supabaseから最新データを読み込みました");
    }catch(e){
      console.error("loadFromSB error:",e);
      setSyncSt("error"); setSyncMsg(`❌ ${e.message||"接続エラー"}`);
    }
  }

  // ── Supabase: データ保存 ──
  async function saveToDB(ov={}){
    try{
      const sb=getSB(); if(!sb) return;
      if(savingRef.current) return;
      savingRef.current=true; setSyncSt("loading");
      const payload={
        id:"main",
        staff:    ov.staff  ||staff,
        sched:    ov.sched  ||sched,
        wd_order: ov.wdO    ||wdO,
        we_order: ov.weO    ||weO,
        updated_at: new Date().toISOString(),
      };
      const {error}=await sb.from("duty_data").upsert(payload);
      if(error) throw error;
      setSyncSt("live"); setSyncMsg("✅ 保存完了");
    }catch(e){
      console.error("saveToDB error:",e);
      setSyncSt("error"); setSyncMsg(`❌ ${e.message||"保存エラー"}`);
    } finally{ savingRef.current=false; }
  }

  // ── Supabase: リアルタイム購読 ──
  function startRealtime(){
    try{
      const sb=getSB(); if(!sb) return;
      if(subRef.current){ try{ subRef.current.unsubscribe(); }catch(e){} }
      subRef.current = sb.channel("duty_data_changes")
        .on("postgres_changes",{event:"UPDATE",schema:"public",table:"duty_data"},
          payload=>{
            try{
              if(savingRef.current) return;
              const d=payload.new;
              if(d.staff&&Array.isArray(d.staff)&&d.staff.length>0)   setStaff(d.staff);
              if(d.sched&&Object.keys(d.sched).length>0)   setSched(d.sched);
              if(d.wd_order&&Array.isArray(d.wd_order)&&d.wd_order.length>0) setWdO(d.wd_order);
              if(d.we_order&&Array.isArray(d.we_order)&&d.we_order.length>0) setWeO(d.we_order);
              note("🔄 他のメンバーがシフトを更新しました");
              setSyncSt("live"); setSyncMsg("🟢 リアルタイム同期中");
            }catch(e){ console.error("realtime payload error:",e); }
          })
        .subscribe(status=>{
          if(status==="SUBSCRIBED"){
            setLiveOn(true); setSyncSt("live"); setSyncMsg("🟢 リアルタイム同期中");
          } else if(status==="CHANNEL_ERROR"){
            setSyncSt("error"); setSyncMsg("⚠️ リアルタイム接続エラー");
          }
        });
    }catch(e){
      console.error("startRealtime error:",e);
      setSyncSt("error"); setSyncMsg(`❌ ${e.message||"リアルタイム接続エラー"}`);
    }
  }

  // 手動読み込み・保存（syncパネルのボタン用）
  async function doLoad(){ await loadFromSB(); }
  async function doSave(){ await saveToDB(); note("Supabaseに保存しました"); }

  const days=daysInMonth(yr,mo);
  const first=firstDow(yr,mo);
  const cells=[...Array(first).fill(null),...Array.from({length:days},(_,i)=>i+1)];
  const selEntry=sched[selDs]||{};
  const selDow=new Date(selDs).getDay();
  const selIsWE=isHol(selDs);
  const [sY,sM,sD]=selDs.split("-");
  const selDisplayShifts=getDisplayShifts(selDs,selEntry);

  // 集計
  const stats={};
  staff.forEach(s=>{stats[s.id]={nisoku:0,junya:0,oncallA:0,oncallB:0};});
  Object.entries(sched).forEach(([ds,e])=>{
    if(!ds.startsWith(`${yr}-${String(mo+1).padStart(2,"0")}`))return;
    Object.entries(e).forEach(([k,sid])=>{if(stats[sid]&&stats[sid][k]!==undefined)stats[sid][k]=(stats[sid][k]||0)+1;});
  });

  const syncColor=syncSt==="live"?"#34C759":syncSt==="ok"?"#34C759":syncSt==="error"?"#FF3B30":syncSt==="loading"?"#FF9500":"#8E8E93";

  // 拘束は手動選択のため自動判定なし

  return(
    <div style={{fontFamily:"-apple-system,'Helvetica Neue',sans-serif",minHeight:"100vh",background:"#F2F2F7",WebkitTextSizeAdjust:"100%",overflowX:"hidden"}}>

      {/* ━━ ヘッダー ━━ */}
      <div style={{background:"white",position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 0 #E5E5EA"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px 8px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:24}}>🔬</span>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:"#1C1C1E"}}>日当直管理</div>
              <div style={{fontSize:10,color:"#8E8E93"}}>臨床検査科</div>
            </div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <HBtn label={syncSt==="loading"?"⏳":syncSt==="live"?"🟢":"☁️"} color={syncColor} onClick={()=>setSyncOpen(true)}/>
            <HBtn label="📂" color="#FF9500" onClick={()=>document.getElementById('importFile').click()}/>
            <HBtn label="🗑️" color="#FF3B30" onClick={()=>setClearConf(true)}/>
            <HBtn label="設定" color="#007AFF" onClick={()=>{setSettOpen(true);setSettTab("member");startAdd();}}/>
          </div>
          {/* 隠しファイル入力 */}
          <input id="importFile" type="file" accept=".json" style={{display:"none"}}
            onChange={e=>{
              const file=e.target.files[0]; if(!file) return;
              const reader=new FileReader();
              reader.onload=ev=>{
                try{
                  const data=JSON.parse(ev.target.result);
                  if(data.staff) setStaff(data.staff);
                  if(data.sched) setSched(prev=>({...prev,...data.sched}));
                  if(data.wdO&&data.wdO.length) setWdO(data.wdO);
                  if(data.weO&&data.weO.length) setWeO(data.weO);
                  note(`📂 インポート完了：${data.staff?.length||0}名・${Object.keys(data.sched||{}).length}日分のデータを読み込みました`);
                }catch(err){ note("❌ インポート失敗：JSONファイルの形式が正しくありません"); }
              };
              reader.readAsText(file);
              e.target.value=""; // リセット
            }}/>
        </div>
        <div style={{display:"flex"}}>
          {[["cal","📅 カレンダー"],["list","📋 一覧"],["stats","📊 集計"],["notif","🔔 通知"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"9px 0",background:"none",border:"none",borderBottom:tab===k?"2.5px solid #007AFF":"2.5px solid transparent",color:tab===k?"#007AFF":"#8E8E93",fontSize:12,fontWeight:tab===k?700:500,cursor:"pointer",position:"relative"}}>
              {l}{k==="notif"&&notifs.length>0&&<span style={{position:"absolute",top:6,right:"26%",width:7,height:7,borderRadius:"50%",background:"#FF3B30"}}/>}
            </button>
          ))}
        </div>
      </div>

      {/* ━━ カレンダー ━━ */}
      {tab==="cal"&&(
        <div>
          <div style={{background:"white",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px 10px",borderBottom:"1px solid #F2F2F7"}}>
            <button onClick={()=>chMo(-1)} style={arrowBtn}>‹</button>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:700,color:"#1C1C1E"}}>{yr}年 {MJ[mo]}</div>
              <div style={{fontSize:10,color:"#8E8E93",marginTop:2}}>
                平日：準夜勤＋拘束　土日祝：日直＋準夜勤＋拘束
              </div>
            </div>
            <button onClick={()=>chMo(1)} style={arrowBtn}>›</button>
          </div>

          {/* カレンダーグリッド */}
          <div style={{background:"white",padding:"6px 8px 10px"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:2}}>
              {WD.map((w,i)=>(
                <div key={w} style={{textAlign:"center",fontSize:12,fontWeight:600,color:i===0?"#FF3B30":i===6?"#007AFF":"#8E8E93",padding:"4px 0"}}>{w}</div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",rowGap:4}}>
              {cells.map((d,i)=>{
                if(!d) return <div key={`e${i}`}/>;
                const ds=toStr(yr,mo,d);
                const dow=(first+d-1)%7;
                const holiday=HOLIDAYS.has(ds);
                const isToday=ds===todayStr;
                const isSel=ds===selDs;
                const entry=sched[ds]||{};
                const dots=[
                  staff.find(x=>x.id===entry.nisoku)?.color,
                  staff.find(x=>x.id===entry.junya)?.color,
                  (entry.oncallA||entry.oncallB)?staff.find(x=>x.id===(entry.oncallA||entry.oncallB))?.color:null,
                ].filter(Boolean);
                return(
                  <div key={ds} onClick={()=>setSelDs(ds)} style={{display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer"}}>
                    <div style={{width:36,height:36,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:isToday?"#007AFF":isSel?"#E8F0FE":"transparent",border:isSel&&!isToday?"2px solid #007AFF":"2px solid transparent"}}>
                      <span style={{fontSize:16,fontWeight:isToday||isSel?700:400,color:isToday?"white":holiday||dow===0?"#FF3B30":dow===6?"#007AFF":"#1C1C1E"}}>{d}</span>
                    </div>
                    <div style={{display:"flex",gap:2,marginTop:1,height:6}}>
                      {dots.slice(0,3).map((c,di)=><span key={di} style={{width:5,height:5,borderRadius:"50%",background:c}}/>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 選択日 詳細パネル */}
          <div style={{margin:"10px 12px",background:"white",borderRadius:18,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
            <div style={{padding:"14px 16px 10px",borderBottom:"1px solid #F2F2F7",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:18,fontWeight:700,color:"#1C1C1E",marginBottom:4}}>
                  {parseInt(sM)}月{parseInt(sD)}日（{WD[selDow]}）
                </div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {selDs===todayStr&&<Tag label="今日" bg="#007AFF" color="white"/>}
                  {HOLIDAYS.has(selDs)&&<Tag label="祝日" bg="#FF3B30" color="white"/>}
                  {!HOLIDAYS.has(selDs)&&selDow===0&&<Tag label="日曜" bg="#FFE5E5" color="#FF3B30"/>}
                  {!HOLIDAYS.has(selDs)&&selDow===6&&<Tag label="土曜" bg="#E3F2FD" color="#007AFF"/>}
                  <Tag label={selIsWE?"土日祝シフト":"平日シフト"} bg="#F2F2F7" color="#3C3C43"/>
                </div>
              </div>
              <button onClick={()=>openEdit(selDs)} style={{background:"#007AFF",color:"white",border:"none",borderRadius:12,padding:"9px 18px",fontSize:15,fontWeight:700,cursor:"pointer"}}>編集</button>
            </div>
            {selDisplayShifts.map((sk,idx)=>{
              const sv=SHIFT_DEFS[sk];
              const mem=staff.find(x=>x.id===selEntry[sk]);
              const banLabel=sk==="junya"||sk==="nisoku" ? (mem?`${mem["shift班"]}班`:"") : (mem?`拘束${sk==="oncallA"?"A":"B"}担当`:"");
              return(
                <div key={sk} style={{display:"flex",alignItems:"center",padding:"13px 16px",borderBottom:idx<selDisplayShifts.length-1?"1px solid #F2F2F7":"none",gap:12}}>
                  <div style={{width:42,height:42,borderRadius:12,background:sv.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{sv.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,color:"#8E8E93",marginBottom:2}}>{sv.label}</div>
                    <div style={{fontSize:16,fontWeight:600,color:mem?"#1C1C1E":"#C7C7CC"}}>{mem?mem.name:"未割り当て"}</div>
                    {mem&&banLabel&&<div style={{fontSize:11,color:"#8E8E93",marginTop:1}}>{banLabel}</div>}
                  </div>
                  {mem&&<div style={{width:12,height:12,borderRadius:"50%",background:mem.color}}/>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━ 一覧 ━━ */}
      {tab==="list"&&(
        <div style={{padding:"8px 12px 24px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 2px 10px"}}>
            <div style={{fontSize:18,fontWeight:700,color:"#1C1C1E"}}>{yr}年 {MJ[mo]}</div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>chMo(-1)} style={navSmBtn}>‹</button>
              <button onClick={()=>chMo(1)}  style={navSmBtn}>›</button>
            </div>
          </div>
          {Array.from({length:days},(_,i)=>i+1).map(d=>{
            const ds=toStr(yr,mo,d);
            const dow=(first+d-1)%7;
            const holiday=HOLIDAYS.has(ds);
            const isWE=isHol(ds);
            const entry=sched[ds]||{};
            const isToday=ds===todayStr;
            const dispShifts=getDisplayShifts(ds,entry);
            return(
              <div key={ds} onClick={()=>{setTab("cal");setSelDs(ds);}} style={{background:"white",borderRadius:14,marginBottom:7,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.07)",cursor:"pointer"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:isToday?"#007AFF":isWE?"#FFF8F0":"#F9F9FB",borderBottom:"1px solid rgba(0,0,0,0.04)"}}>
                  <div style={{width:40,height:40,borderRadius:10,background:isToday?"rgba(255,255,255,0.2)":holiday||dow===0?"#FFE0B2":dow===6?"#DBEAFE":"#E5E5EA",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <div style={{fontSize:10,fontWeight:600,color:isToday?"white":holiday||dow===0?"#E65100":"#8E8E93",lineHeight:1}}>{WD[dow]}</div>
                    <div style={{fontSize:18,fontWeight:700,color:isToday?"white":holiday||dow===0?"#FF3B30":dow===6?"#007AFF":"#1C1C1E",lineHeight:1.2}}>{d}</div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                      {dispShifts.map(sk=>{
                        const sv=SHIFT_DEFS[sk];
                        const mem=staff.find(x=>x.id===entry[sk]);
                        return mem?(
                          <div key={sk} style={{display:"inline-flex",alignItems:"center",gap:3,background:isToday?"rgba(255,255,255,0.2)":sv.bg,borderRadius:8,padding:"3px 8px",border:isToday?"1px solid rgba(255,255,255,0.3)":`1px solid ${sv.color}33`}}>
                            <span style={{fontSize:11}}>{sv.icon}</span>
                            <span style={{fontSize:11,fontWeight:600,color:isToday?"white":sv.color}}>{sv.label}</span>
                            <span style={{fontSize:11,color:isToday?"rgba(255,255,255,0.9)":"#1C1C1E"}}>{mem.name}</span>
                          </div>
                        ):null;
                      })}
                    </div>
                  </div>
                  {holiday&&<span style={{fontSize:10,background:"#FF3B30",color:"white",borderRadius:5,padding:"2px 5px",flexShrink:0,fontWeight:600}}>祝</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ━━ 集計 ━━ */}
      {tab==="stats"&&(
        <div style={{padding:"8px 12px 24px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 2px 10px"}}>
            <div style={{fontSize:18,fontWeight:700,color:"#1C1C1E"}}>{yr}年 {MJ[mo]}</div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>chMo(-1)} style={navSmBtn}>‹</button>
              <button onClick={()=>chMo(1)}  style={navSmBtn}>›</button>
            </div>
          </div>
          {staff.map(s=>{
            const cnt=stats[s.id]||{nisoku:0,junya:0,oncallA:0,oncallB:0};
            const total=Object.values(cnt).reduce((a,b)=>a+b,0);
            return(
              <div key={s.id} style={{background:"white",borderRadius:16,marginBottom:10,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:s.color+"20",border:`2px solid ${s.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:s.color,fontWeight:800,flexShrink:0}}>{s.name[0]}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontWeight:700,color:"#1C1C1E"}}>{s.name}</div>
                    <div style={{display:"flex",gap:6,marginTop:2}}>
                      <Tag label={`${s["shift班"]}班`} bg={s["shift班"]==="A"?"#E3F2FD":"#FFF3E0"} color={s["shift班"]==="A"?"#007AFF":"#FF9500"}/>
                      <Tag label={`拘束${s["拘束分類"]}`} bg={s["拘束分類"]==="A"?"#EDFBF0":"#F5EEFF"} color={s["拘束分類"]==="A"?"#34C759":"#AF52DE"}/>
                    </div>
                  </div>
                  <div style={{fontSize:12,color:"#8E8E93"}}>合計 {total} 回</div>
                </div>
                {Object.entries(SHIFT_DEFS).map(([k,v])=>(
                  <div key={k} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{width:30,height:30,borderRadius:8,background:v.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{v.icon}</div>
                    <div style={{fontSize:13,color:"#3C3C43",width:56,flexShrink:0}}>{v.label}</div>
                    <div style={{flex:1,height:7,background:"#F2F2F7",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${Math.min(100,(cnt[k]||0)/6*100)}%`,background:v.color,borderRadius:3}}/>
                    </div>
                    <div style={{fontSize:16,fontWeight:700,color:v.color,minWidth:22,textAlign:"right"}}>{cnt[k]||0}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ━━ 通知 ━━ */}
      {tab==="notif"&&(
        <div style={{padding:"8px 12px 24px"}}>
          <div style={{fontSize:18,fontWeight:700,color:"#1C1C1E",padding:"8px 2px 12px"}}>🔔 通知履歴</div>
          {notifs.length===0
            ?<div style={{background:"white",borderRadius:16,padding:"40px 20px",textAlign:"center",color:"#8E8E93",fontSize:14}}>通知はありません</div>
            :notifs.map(n=>(
              <div key={n.id} style={{background:"white",borderRadius:12,padding:"12px 14px",marginBottom:7,display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
                <span style={{fontSize:13,color:"#1C1C1E",flex:1,marginRight:8}}>✅ {n.msg}</span>
                <span style={{color:"#8E8E93",fontSize:11,flexShrink:0}}>{n.time}</span>
              </div>
            ))
          }
        </div>
      )}

      {/* ━━━━━━ 全クリア確認 ━━━━━━ */}
      {clearConf&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:24}}>
          <div style={{background:"white",borderRadius:20,width:"100%",maxWidth:320,padding:26,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:10}}>🗑️</div>
            <div style={{fontSize:17,fontWeight:700,color:"#1C1C1E",marginBottom:8}}>シフトをクリア</div>
            <div style={{fontSize:13,color:"#8E8E93",marginBottom:20,lineHeight:1.6}}>{yr}年{MJ[mo]}のシフトを<br/>すべて削除します。</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setClearConf(false)} style={cancelBtn}>キャンセル</button>
              <button onClick={clearAllShifts} style={{...primaryBtn,background:"#FF3B30"}}>クリア</button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━ 編集モーダル ━━━━━━ */}
      {editOpen&&(
        <Sheet onClose={()=>setEditOpen(false)} title="シフト編集" sub={`${parseInt(sM)}月${parseInt(sD)}日（${WD[selDow]}）${selIsWE?"・土日祝":""}`}>
          {/* 日直（土日祝のみ） */}
          {selIsWE&&(
            <ShiftRow sv={SHIFT_DEFS.nisoku} label="日直" val={editData.nisoku||""} staff={staff}
              filterLabel="shift班" onChange={v=>{
                const id=Number(v)||null;
                setEditData(p=>({...p,nisoku:id}));
              }}/>
          )}
          {/* 準夜勤 */}
          <ShiftRow sv={SHIFT_DEFS.junya} label="準夜勤" val={editData.junya||""} staff={staff}
            filterLabel="shift班" onChange={v=>{
              const id=Number(v)||null;
              setEditData(p=>({...p,junya:id}));
            }}/>
          {/* 拘束A（手動選択） */}
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
              <div style={{width:30,height:30,borderRadius:8,background:"#EDFBF0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>📗</div>
              <span style={{fontSize:14,fontWeight:600,color:"#1C1C1E"}}>拘束A</span>
            </div>
            <select value={editData.oncallA||""}
              onChange={e=>setEditData(p=>({...p,oncallA:Number(e.target.value)||null}))}
              style={{width:"100%",padding:"11px 12px",background:"#F2F2F7",border:"none",borderRadius:10,fontSize:14,color:"#1C1C1E",outline:"none",appearance:"none",WebkitAppearance:"none",boxSizing:"border-box"}}>
              <option value="">— 未割り当て —</option>
              <optgroup label="── 拘束A担当 ──">
                {staff.filter(s=>s["拘束分類"]==="A").map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </optgroup>
              <optgroup label="── その他 ──">
                {staff.filter(s=>s["拘束分類"]!=="A").map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </optgroup>
            </select>
          </div>
          {/* 拘束B（手動選択） */}
          <div style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
              <div style={{width:30,height:30,borderRadius:8,background:"#F5EEFF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>📘</div>
              <span style={{fontSize:14,fontWeight:600,color:"#1C1C1E"}}>拘束B</span>
            </div>
            <select value={editData.oncallB||""}
              onChange={e=>setEditData(p=>({...p,oncallB:Number(e.target.value)||null}))}
              style={{width:"100%",padding:"11px 12px",background:"#F2F2F7",border:"none",borderRadius:10,fontSize:14,color:"#1C1C1E",outline:"none",appearance:"none",WebkitAppearance:"none",boxSizing:"border-box"}}>
              <option value="">— 未割り当て —</option>
              <optgroup label="── 拘束B担当 ──">
                {staff.filter(s=>s["拘束分類"]==="B").map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </optgroup>
              <optgroup label="── その他 ──">
                {staff.filter(s=>s["拘束分類"]!=="B").map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </optgroup>
            </select>
          </div>
          <div style={{display:"flex",gap:10,marginTop:6}}>
            <button onClick={()=>setEditOpen(false)} style={cancelBtn}>キャンセル</button>
            <button onClick={saveEdit} style={primaryBtn}>保存</button>
          </div>
        </Sheet>
      )}

      {/* ━━━━━━ 設定パネル ━━━━━━ */}
      {settOpen&&(
        <Sheet onClose={()=>{setSettOpen(false);closeMaster();}} title="設定" noPad>
          <div style={{display:"flex",borderBottom:"1px solid #E5E5EA"}}>
            {[["member","👤 メンバー"],["master","📋 マスター"]].map(([k,l])=>(
              <button key={k} onClick={()=>{setSettTab(k);k==="master"?openMaster():closeMaster();}} style={{flex:1,padding:"10px 0",background:"none",border:"none",borderBottom:settTab===k?"2.5px solid #007AFF":"2.5px solid transparent",color:settTab===k?"#007AFF":"#8E8E93",fontSize:13,fontWeight:600,cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          <div style={{padding:"14px 16px",overflowY:"auto",flex:1}}>

            {/* メンバータブ */}
            {settTab==="member"&&(<>
              <div style={{background:"#F9F9FB",borderRadius:14,padding:14,marginBottom:14,border:"1px solid #E5E5EA"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#8E8E93",marginBottom:10}}>
                  {editMember?`✎ 編集中：${editMember.name}`:`＋ 追加（${staff.length}/${MAX_STAFF}名）`}
                </div>
                {!editMember&&staff.length>=MAX_STAFF
                  ?<div style={{color:"#FF3B30",fontSize:13}}>上限に達しています</div>
                  :(<>
                    <input value={mForm.name} onChange={e=>setMForm(p=>({...p,name:e.target.value}))} placeholder="氏名を入力"
                      style={{width:"100%",padding:"11px 12px",background:"white",border:"1px solid #E5E5EA",borderRadius:10,fontSize:14,color:"#1C1C1E",outline:"none",boxSizing:"border-box",marginBottom:10}}/>
                    {/* カラー */}
                    <div style={{fontSize:11,color:"#8E8E93",marginBottom:6}}>カラー</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:12}}>
                      {COLOR_OPTIONS.map(c=>(
                        <div key={c} onClick={()=>setMForm(p=>({...p,color:c}))}
                          style={{width:26,height:26,borderRadius:"50%",background:c,cursor:"pointer",border:mForm.color===c?"3px solid white":"3px solid transparent",boxShadow:mForm.color===c?`0 0 0 2px ${c}`:"none"}}/>
                      ))}
                    </div>
                    {/* 勤務班 */}
                    <div style={{fontSize:11,color:"#8E8E93",marginBottom:6}}>勤務班（準夜勤・日直に使用）</div>
                    <div style={{display:"flex",gap:8,marginBottom:12}}>
                      {["A","B"].map(t=>(
                        <button key={t} onClick={()=>setMForm(p=>({...p,"shift班":t}))}
                          style={{flex:1,padding:"10px 0",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",border:"none",
                            background:mForm["shift班"]===t?(t==="A"?"#007AFF":"#FF9500"):"#F2F2F7",
                            color:mForm["shift班"]===t?"white":"#8E8E93"}}>
                          {t}班
                        </button>
                      ))}
                    </div>
                    {/* 拘束分類 */}
                    <div style={{fontSize:11,color:"#8E8E93",marginBottom:6}}>拘束分類（拘束担当に使用）</div>
                    <div style={{display:"flex",gap:8,marginBottom:14}}>
                      {["A","B"].map(t=>(
                        <button key={t} onClick={()=>setMForm(p=>({...p,"拘束分類":t}))}
                          style={{flex:1,padding:"10px 0",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",border:"none",
                            background:mForm["拘束分類"]===t?(t==="A"?"#34C759":"#AF52DE"):"#F2F2F7",
                            color:mForm["拘束分類"]===t?"white":"#8E8E93"}}>
                          拘束{t}
                        </button>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      {editMember&&<button onClick={()=>{setEditMember(null);setMForm({name:"",color:COLOR_OPTIONS[0],"shift班":"A","拘束分類":"A"});}} style={cancelBtn}>キャンセル</button>}
                      <button onClick={saveMember} disabled={!mForm.name.trim()} style={{...primaryBtn,background:mForm.name.trim()?"#007AFF":"#C7C7CC",cursor:mForm.name.trim()?"pointer":"not-allowed",flex:2}}>
                        {editMember?"更新する":"追加する"}
                      </button>
                    </div>
                  </>)
                }
              </div>
              <div style={{fontSize:11,color:"#8E8E93",marginBottom:8}}>メンバー一覧（{staff.length}名）</div>
              <div style={{background:"white",borderRadius:14,overflow:"hidden",border:"1px solid #E5E5EA"}}>
                {staff.map((s,idx)=>(
                  <div key={s.id} style={{display:"flex",alignItems:"center",padding:"11px 14px",borderBottom:idx<staff.length-1?"1px solid #F2F2F7":"none",gap:10}}>
                    <div style={{width:34,height:34,borderRadius:"50%",background:s.color+"20",border:`2px solid ${s.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:s.color,fontWeight:800,flexShrink:0}}>{s.name[0]}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:600,color:"#1C1C1E"}}>{s.name}</div>
                      <div style={{display:"flex",gap:5,marginTop:2}}>
                        <Tag label={`${s["shift班"]}班`} bg={s["shift班"]==="A"?"#E3F2FD":"#FFF3E0"} color={s["shift班"]==="A"?"#007AFF":"#FF9500"}/>
                        <Tag label={`拘束${s["拘束分類"]}`} bg={s["拘束分類"]==="A"?"#EDFBF0":"#F5EEFF"} color={s["拘束分類"]==="A"?"#34C759":"#AF52DE"}/>
                      </div>
                    </div>
                    <button onClick={()=>startEdit(s)} style={{background:"#EEF4FF",color:"#007AFF",border:"none",borderRadius:8,padding:"5px 10px",fontSize:12,cursor:"pointer",fontWeight:600}}>編集</button>
                    {delConf===s.id
                      ?<div style={{display:"flex",gap:4}}>
                        <button onClick={()=>delMember(s.id)} style={{background:"#FF3B30",color:"white",border:"none",borderRadius:8,padding:"5px 8px",fontSize:12,cursor:"pointer",fontWeight:600}}>削除</button>
                        <button onClick={()=>setDelConf(null)} style={{background:"#F2F2F7",color:"#8E8E93",border:"none",borderRadius:8,padding:"5px 8px",fontSize:12,cursor:"pointer"}}>戻る</button>
                      </div>
                      :<button onClick={()=>setDelConf(s.id)} style={{background:"#FFEBEE",color:"#FF3B30",border:"none",borderRadius:8,padding:"5px 8px",fontSize:12,cursor:"pointer",fontWeight:600}}>削除</button>
                    }
                  </div>
                ))}
              </div>
            </>)}

            {/* マスタータブ */}
            {settTab==="master"&&dWD&&(<>
              <div style={{background:"#FFF8E1",borderRadius:10,padding:"10px 12px",marginBottom:12,fontSize:12,color:"#795548",lineHeight:1.7,border:"1px solid #FFF176"}}>
                💡 各シフトの担当順を設定。「今月に適用」で再生成されます。
              </div>
              {/* 平日シフト */}
              <MasterSec title="📅 平日シフト" color="#34C759" draft={dWD}
                shifts={[
                  {key:"junya",  label:"準夜勤",    icon:"🌙"},
                  {key:"oncallA",label:"拘束A担当順番",icon:"📗"},
                  {key:"oncallB",label:"拘束B担当順番",icon:"📘"},
                ]}
                staff={staff} onAdd={(sk,sid)=>addMR("wd",sk,sid)} onRem={i=>remMR("wd",i)} onMov={(i,d)=>movMR("wd",i,d)}/>
              <div style={{display:"flex",gap:8,marginTop:10,marginBottom:16}}>
                <button onClick={closeMaster} style={{...cancelBtn,flex:1,padding:"11px 0",fontSize:13}}>キャンセル</button>
                <button onClick={saveMasterWD} style={{flex:2,padding:"11px 0",background:"#34C759",color:"white",border:"none",borderRadius:12,cursor:"pointer",fontSize:13,fontWeight:700}}>
                  ✅ 平日シフトを今月に適用
                </button>
              </div>

              <div style={{height:4,background:"#E5E5EA",borderRadius:2,marginBottom:16}}/>

              {/* 土日祝シフト */}
              <MasterSec title="🏖️ 土日祝シフト" color="#FF9500" draft={dWE}
                shifts={[
                  {key:"nisoku", label:"日直",        icon:"☀️"},
                  {key:"junya",  label:"準夜勤",      icon:"🌙"},
                  {key:"oncallA",label:"拘束A担当順番",icon:"📗"},
                  {key:"oncallB",label:"拘束B担当順番",icon:"📘"},
                ]}
                staff={staff} onAdd={(sk,sid)=>addMR("we",sk,sid)} onRem={i=>remMR("we",i)} onMov={(i,d)=>movMR("we",i,d)}/>
              <div style={{display:"flex",gap:8,marginTop:10,marginBottom:8}}>
                <button onClick={closeMaster} style={{...cancelBtn,flex:1,padding:"11px 0",fontSize:13}}>キャンセル</button>
                <button onClick={saveMasterWE} style={{flex:2,padding:"11px 0",background:"#FF9500",color:"white",border:"none",borderRadius:12,cursor:"pointer",fontSize:13,fontWeight:700}}>
                  ✅ 土日祝シフトを今月に適用
                </button>
              </div>
            </>)}
          </div>
        </Sheet>
      )}

      {/* ━━━━━━ 同期パネル ━━━━━━ */}
      {syncOpen&&(
        <Sheet onClose={()=>setSyncOpen(false)} title="🟢 リアルタイム同期設定">
          {/* 接続状態 */}
          <div style={{background:liveOn?"#E8F5E9":"#F9F9FB",borderRadius:12,padding:"12px 14px",marginBottom:14,border:`1px solid ${liveOn?"#34C759":"#E5E5EA"}`}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:liveOn?"#34C759":"#C7C7CC",flexShrink:0}}/>
              <div style={{fontSize:14,fontWeight:700,color:liveOn?"#2E7D32":"#8E8E93"}}>
                {liveOn?"リアルタイム同期中 🎉":"未接続"}
              </div>
            </div>
            {liveOn&&<div style={{fontSize:11,color:"#4CAF50",marginTop:4}}>誰かが編集すると全員の画面が自動更新されます</div>}
          </div>
          {/* URL入力 */}
          <div style={{fontSize:12,color:"#8E8E93",marginBottom:5}}>Project URL</div>
          <input value={sbUrl} onChange={e=>{setSbUrl(e.target.value);resetSB();}}
            placeholder="https://xxxxxx.supabase.co"
            style={{width:"100%",padding:"11px 12px",background:"#F2F2F7",border:"none",borderRadius:10,fontSize:13,color:"#1C1C1E",outline:"none",boxSizing:"border-box",marginBottom:10}}/>
          {/* APIキー入力 */}
          <div style={{fontSize:12,color:"#8E8E93",marginBottom:5}}>anon public key</div>
          <input value={sbKey} onChange={e=>{setSbKey(e.target.value);resetSB();}}
            placeholder="eyJxxxxxx..."
            style={{width:"100%",padding:"11px 12px",background:"#F2F2F7",border:"none",borderRadius:10,fontSize:13,color:"#1C1C1E",outline:"none",boxSizing:"border-box",marginBottom:14}}/>
          {/* 接続ボタン */}
          <button onClick={async()=>{
              resetSB();
              setSyncMsg("接続中..."); setSyncSt("loading");
              const sb=getSB();
              if(!sb){ setSyncMsg("❌ URL・キーを確認してください"); setSyncSt("error"); return; }
              try{
                const {data,error}=await sb.from("duty_data").select("*").eq("id","main").single();
                if(error) throw error;
                const hasSBData=data?.staff&&Array.isArray(data.staff)&&data.staff.length>0;
                if(hasSBData){
                  setStaff(data.staff);
                  if(data.sched) setSched(data.sched);
                  if(data.wd_order&&data.wd_order.length) setWdO(data.wd_order);
                  if(data.we_order&&data.we_order.length) setWeO(data.we_order);
                  note("Supabaseから最新データを読み込みました");
                } else {
                  const {error:uErr}=await sb.from("duty_data").upsert({
                    id:"main", staff, sched,
                    wd_order:wdO, we_order:weO,
                    updated_at:new Date().toISOString()
                  });
                  if(uErr) throw uErr;
                  note("アプリのデータをSupabaseに保存しました");
                }
                startRealtime();
                setSyncMsg("🟢 リアルタイム同期中"); setSyncSt("live");
                setSyncOpen(false);
              }catch(e){ setSyncMsg(`❌ ${e.message}`); setSyncSt("error"); }
            }}
            disabled={!sbUrl||!sbKey}
            style={{width:"100%",padding:"13px 0",background:sbUrl&&sbKey?"#34C759":"#C7C7CC",color:"white",border:"none",borderRadius:14,cursor:sbUrl&&sbKey?"pointer":"not-allowed",fontSize:15,fontWeight:700,marginBottom:10}}>
            🟢 接続してリアルタイム同期を開始
          </button>
          {syncMsg&&<div style={{padding:"8px 10px",borderRadius:9,marginBottom:10,fontSize:12,fontWeight:600,
            background:syncSt==="live"||syncSt==="ok"?"#E8F5E9":syncSt==="error"?"#FFEBEE":"#FFFDE7",
            color:syncSt==="live"||syncSt==="ok"?"#2E7D32":syncSt==="error"?"#C62828":"#F57F17"}}>{syncMsg}</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <button onClick={doLoad} disabled={syncSt==="loading"} style={{...cancelBtn,color:"#007AFF",fontSize:13}}>📥 手動読み込み</button>
            <button onClick={doSave} disabled={syncSt==="loading"} style={{...primaryBtn,fontSize:13}}>📤 手動保存</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ─── 共通コンポーネント ───────────────────────────────────────────
function Sheet({children,onClose,title,sub,noPad}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}}>
      <div style={{background:noPad?"#F2F2F7":"white",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:560,maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 -4px 30px rgba(0,0,0,0.15)"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"10px 0 4px"}}>
          <div style={{width:36,height:4,borderRadius:2,background:"#E5E5EA"}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"2px 18px 12px",borderBottom:"1px solid #F2F2F7"}}>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:"#1C1C1E"}}>{title}</div>
            {sub&&<div style={{fontSize:11,color:"#8E8E93",marginTop:2}}>{sub}</div>}
          </div>
          <button onClick={onClose} style={{background:"#F2F2F7",border:"none",borderRadius:"50%",width:30,height:30,cursor:"pointer",fontSize:15,color:"#8E8E93",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {noPad
          ?<div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>{children}</div>
          :<div style={{overflowY:"auto",flex:1,padding:"14px 18px 32px"}}>{children}</div>
        }
      </div>
    </div>
  );
}

function ShiftRow({sv,label,val,staff,filterLabel,onChange}){
  return(
    <div style={{marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
        <div style={{width:30,height:30,borderRadius:8,background:sv.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{sv.icon}</div>
        <span style={{fontSize:14,fontWeight:600,color:"#1C1C1E"}}>{label}</span>
      </div>
      <select value={val} onChange={e=>onChange(e.target.value)}
        style={{width:"100%",padding:"11px 12px",background:"#F2F2F7",border:"none",borderRadius:10,fontSize:14,color:"#1C1C1E",outline:"none",appearance:"none",WebkitAppearance:"none",boxSizing:"border-box"}}>
        <option value="">— 未割り当て —</option>
        <optgroup label="── A班 ──">
          {staff.filter(s=>s[filterLabel]==="A").map(s=><option key={s.id} value={s.id}>{s.name}（A班）</option>)}
        </optgroup>
        <optgroup label="── B班 ──">
          {staff.filter(s=>s[filterLabel]==="B").map(s=><option key={s.id} value={s.id}>{s.name}（B班）</option>)}
        </optgroup>
      </select>
    </div>
  );
}

function MasterSec({title,color,draft,shifts,staff,onAdd,onRem,onMov}){
  const [aShift,setAShift]=useState(shifts[0].key);
  const [aStaff,setAStaff]=useState("");
  return(
    <div style={{background:"white",borderRadius:14,padding:14,border:"1px solid #E5E5EA"}}>
      <div style={{fontSize:13,fontWeight:700,color,marginBottom:12}}>{title}</div>
      {shifts.map(({key,label,icon})=>{
        const rows=draft.map((r,i)=>({...r,idx:i})).filter(r=>r.shift===key);
        return(
          <div key={key} style={{marginBottom:12}}>
            <div style={{fontSize:11,color:"#8E8E93",fontWeight:600,marginBottom:5}}>{icon} {label}</div>
            {rows.length===0&&<div style={{fontSize:12,color:"#C7C7CC",padding:"3px 0"}}>未設定</div>}
            {rows.map((r,pos)=>{
              const mem=staff.find(x=>x.id===r.staffId);
              return(
                <div key={r.idx} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,background:"#F9F9FB",borderRadius:9,padding:"7px 10px"}}>
                  <span style={{fontSize:11,color:"#C7C7CC",minWidth:16}}>{pos+1}.</span>
                  <span style={{width:8,height:8,borderRadius:"50%",background:mem?.color||"#C7C7CC",flexShrink:0}}/>
                  <span style={{flex:1,fontSize:13,color:mem?"#1C1C1E":"#FF3B30"}}>{mem?mem.name:"（削除済み）"}</span>
                  <button onClick={()=>onMov(r.idx,-1)} disabled={pos===0} style={movBtn(pos===0)}>▲</button>
                  <button onClick={()=>onMov(r.idx,1)} disabled={pos===rows.length-1} style={movBtn(pos===rows.length-1)}>▼</button>
                  <button onClick={()=>onRem(r.idx)} style={{background:"#FFEBEE",color:"#FF3B30",border:"none",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11,fontWeight:600}}>✕</button>
                </div>
              );
            })}
          </div>
        );
      })}
      <div style={{borderTop:"1px solid #F2F2F7",paddingTop:10,display:"flex",gap:6,flexWrap:"wrap"}}>
        <select value={aShift} onChange={e=>setAShift(e.target.value)} style={{padding:"7px 9px",background:"#F2F2F7",border:"none",borderRadius:8,fontSize:12,color:"#1C1C1E",outline:"none"}}>
          {shifts.map(({key,label})=><option key={key} value={key}>{label}</option>)}
        </select>
        <select value={aStaff} onChange={e=>setAStaff(e.target.value)} style={{flex:1,padding:"7px 9px",background:"#F2F2F7",border:"none",borderRadius:8,fontSize:12,color:"#1C1C1E",outline:"none"}}>
          <option value="">担当者を選択</option>
          {staff.map(s=><option key={s.id} value={s.id}>{s.name}（{s["shift班"]}班/拘束{s["拘束分類"]}）</option>)}
        </select>
        <button onClick={()=>{onAdd(aShift,aStaff);setAStaff("");}} disabled={!aStaff}
          style={{padding:"7px 12px",background:aStaff?"#007AFF":"#C7C7CC",color:"white",border:"none",borderRadius:8,cursor:aStaff?"pointer":"not-allowed",fontSize:12,fontWeight:700}}>＋</button>
      </div>
    </div>
  );
}

function Tag({label,bg,color}){ return <span style={{fontSize:11,background:bg,color,borderRadius:6,padding:"2px 7px",fontWeight:600}}>{label}</span>; }
function HBtn({label,color,onClick}){ return <button onClick={onClick} style={{background:"#F2F2F7",border:"none",borderRadius:10,padding:"7px 12px",cursor:"pointer",fontSize:13,color,fontWeight:600}}>{label}</button>; }

const primaryBtn={flex:2,padding:"13px 0",background:"#007AFF",color:"white",border:"none",borderRadius:14,cursor:"pointer",fontSize:15,fontWeight:700};
const cancelBtn={flex:1,padding:"13px 0",background:"#F2F2F7",color:"#1C1C1E",border:"none",borderRadius:14,cursor:"pointer",fontSize:15,fontWeight:500};
const arrowBtn={background:"none",border:"none",fontSize:24,color:"#007AFF",cursor:"pointer",padding:"0 8px",lineHeight:1};
const navSmBtn={background:"white",border:"1px solid #E5E5EA",borderRadius:9,padding:"6px 14px",color:"#007AFF",fontSize:15,cursor:"pointer",fontWeight:600};
function movBtn(disabled){ return {background:"white",border:"1px solid #E5E5EA",borderRadius:6,padding:"2px 7px",cursor:disabled?"not-allowed":"pointer",color:disabled?"#E5E5EA":"#8E8E93",fontSize:11}; }
