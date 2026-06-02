import { useState } from "react";

// ─── 祝日 ──────────────────────────────────────────────────────────
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
function isHolidayOrWeekend(ds){
  if(HOLIDAYS.has(ds)) return true;
  const d=new Date(ds).getDay(); return d===0||d===6;
}

// ─── 定数 ──────────────────────────────────────────────────────────
const MAX_STAFF=30;
const INITIAL_STAFF=[
  {id:1,name:"田中 一郎",color:"#007AFF"},
  {id:2,name:"佐藤 花子",color:"#34C759"},
  {id:3,name:"山田 太郎",color:"#FF9500"},
  {id:4,name:"鈴木 美咲",color:"#FF3B30"},
  {id:5,name:"中村 健二",color:"#AF52DE"},
  {id:6,name:"伊藤 直子",color:"#FF2D55"},
];
const COLOR_OPTIONS=[
  "#007AFF","#34C759","#FF9500","#FF3B30","#AF52DE","#FF2D55",
  "#5AC8FA","#4CD964","#FFCC00","#FF6B6B","#BF5AF2","#FF375F",
  "#0A84FF","#30D158","#FFD60A","#FF453A","#9C27B0","#E91E63",
  "#32ADE6","#64D2FF","#F7A046","#E53935","#6D28D9","#BE185D",
  "#0071E3","#1D9BF0","#CA8A04","#DC2626","#7C3AED","#9D174D",
];
const SHIFT_DEFS={
  nisoku: {label:"日直",  color:"#FF9500", bg:"#FFF3E0", icon:"☀️"},
  junya:  {label:"準夜勤",color:"#007AFF", bg:"#EEF4FF", icon:"🌙"},
  oncallA:{label:"待機A", color:"#34C759", bg:"#EDFBF0", icon:"📗"},
  oncallB:{label:"待機B", color:"#AF52DE", bg:"#F5EEFF", icon:"📘"},
};
const WEEKDAY_SHIFTS=["junya","oncallA","oncallB"];
const WEEKEND_SHIFTS=["nisoku","junya","oncallA","oncallB"];
function getShifts(ds){ return isHolidayOrWeekend(ds)?WEEKEND_SHIFTS:WEEKDAY_SHIFTS; }

// ─── ユーティリティ ────────────────────────────────────────────────
function daysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function firstDow(y,m)   { return new Date(y,m,1).getDay(); }
function toStr(y,m,d)    { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }

function genSched(y,m,wdO,weO){
  const n=daysInMonth(y,m); const s={};
  const c={junya:0,oncallA:0,oncallB:0,nisoku:0};
  function q(o,k){ return o.filter(r=>r.shift===k).map(r=>r.staffId); }
  const wq={junya:q(wdO,"junya"),oncallA:q(wdO,"oncallA"),oncallB:q(wdO,"oncallB")};
  const eq={nisoku:q(weO,"nisoku"),junya:q(weO,"junya"),oncallA:q(weO,"oncallA"),oncallB:q(weO,"oncallB")};
  for(let d=1;d<=n;d++){
    const ds=toStr(y,m,d); const isWE=isHolidayOrWeekend(ds);
    const e={}; (isWE?WEEKEND_SHIFTS:WEEKDAY_SHIFTS).forEach(k=>{
      const qq=(isWE?eq:wq)[k]; if(!qq||!qq.length)return; e[k]=qq[c[k]%qq.length]; c[k]++;
    }); s[ds]=e;
  }
  return s;
}
function buildMaster(staff){
  const wd=[],we=[];
  staff.forEach(s=>wd.push({shift:"junya",staffId:s.id}));
  staff.forEach(s=>wd.push({shift:"oncallA",staffId:s.id}));
  staff.forEach(s=>wd.push({shift:"oncallB",staffId:s.id}));
  staff.forEach(s=>we.push({shift:"nisoku",staffId:s.id}));
  staff.forEach(s=>we.push({shift:"junya",staffId:s.id}));
  staff.forEach(s=>we.push({shift:"oncallA",staffId:s.id}));
  staff.forEach(s=>we.push({shift:"oncallB",staffId:s.id}));
  return {wd,we};
}

const today=new Date();
const todayStr=toStr(today.getFullYear(),today.getMonth(),today.getDate());
const WD=["日","月","火","水","木","金","土"];
const MJ=["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

// ════════════════════════════════════════════════════════════════════
export default function App(){
  const m0=buildMaster(INITIAL_STAFF);
  const [staff,  setStaff  ]=useState(INITIAL_STAFF);
  const [wdO,   setWdO    ]=useState(m0.wd);
  const [weO,   setWeO    ]=useState(m0.we);
  const [yr,    setYr     ]=useState(today.getFullYear());
  const [mo,    setMo     ]=useState(today.getMonth());
  const [sched, setSched  ]=useState(()=>genSched(today.getFullYear(),today.getMonth(),m0.wd,m0.we));
  const [selDs, setSelDs  ]=useState(todayStr);
  const [tab,   setTab    ]=useState("cal"); // cal | list | stats | notif
  const [notifs,setNotifs ]=useState([]);

  // モーダル類
  const [editOpen,  setEditOpen  ]=useState(false);
  const [editData,  setEditData  ]=useState({});
  const [settOpen,  setSettOpen  ]=useState(false);
  const [settTab,   setSettTab   ]=useState("member");
  const [syncOpen,  setSyncOpen  ]=useState(false);

  // メンバーフォーム
  const [editMember,setEditMember]=useState(null);
  const [mForm,     setMForm     ]=useState({name:"",color:COLOR_OPTIONS[0]});
  const [delConf,   setDelConf   ]=useState(null);

  // マスターフォーム
  const [dWD,setDWD]=useState(null);
  const [dWE,setDWE]=useState(null);

  // 同期
  const [gasUrl,   setGasUrl   ]=useState("");
  const [syncSt,   setSyncSt   ]=useState("idle");
  const [syncMsg,  setSyncMsg  ]=useState("");

  function note(msg){setNotifs(p=>[{id:Date.now(),msg,time:new Date().toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"})},...p].slice(0,20));}

  // ── 月移動 ──
  function chMo(d){
    let nm=mo+d,ny=yr;
    if(nm<0){nm=11;ny--;}else if(nm>11){nm=0;ny++;}
    setMo(nm);setYr(ny);
    setSched(prev=>({...genSched(ny,nm,wdO,weO),...prev}));
    setSelDs(toStr(ny,nm,1));
  }

  // ── シフト編集 ──
  function openEdit(ds){setEditData({...(sched[ds]||{})});setSelDs(ds);setEditOpen(true);}
  function saveEdit(){
    setSched(prev=>({...prev,[selDs]:{...editData}}));
    const names=getShifts(selDs).map(k=>{const m=staff.find(x=>x.id===editData[k]);return m?`${SHIFT_DEFS[k].icon}${m.name}`:null;}).filter(Boolean).join(" ");
    note(`${selDs} 更新 (${names})`);setEditOpen(false);
  }

  // ── メンバー管理 ──
  function startAdd(){setEditMember(null);setMForm({name:"",color:COLOR_OPTIONS[staff.length%COLOR_OPTIONS.length]});}
  function startEdit(s){setEditMember(s);setMForm({name:s.name,color:s.color});}
  function saveMember(){
    if(!mForm.name.trim())return;
    if(editMember){
      // スタッフ情報更新 → スケジュールも即反映（IDはそのまま）
      setStaff(prev=>prev.map(s=>s.id===editMember.id?{...s,name:mForm.name.trim(),color:mForm.color}:s));
      note(`「${mForm.name.trim()}」を更新しました`);
    }else{
      if(staff.length>=MAX_STAFF)return;
      const ns={id:Date.now(),name:mForm.name.trim(),color:mForm.color};
      setStaff(prev=>[...prev,ns]);
      note(`「${mForm.name.trim()}」を追加しました`);
    }
    setEditMember(null);setMForm({name:"",color:COLOR_OPTIONS[0]});
  }
  function delMember(id){
    const m=staff.find(s=>s.id===id);
    setStaff(prev=>prev.filter(s=>s.id!==id));
    setWdO(p=>p.filter(r=>r.staffId!==id));
    setWeO(p=>p.filter(r=>r.staffId!==id));
    setSched(prev=>{
      const nx={...prev};
      Object.keys(nx).forEach(ds=>{const e={...nx[ds]};Object.keys(e).forEach(k=>{if(e[k]===id)e[k]=null;});nx[ds]=e;});
      return nx;
    });
    note(`「${m?.name}」を削除しました`);setDelConf(null);
  }

  // ── マスター ──
  function openMaster(){setDWD(wdO.map(r=>({...r})));setDWE(weO.map(r=>({...r})));}
  function closeMaster(){setDWD(null);setDWE(null);}
  function addMR(type,sk,sid){if(!sid)return;(type==="wd"?setDWD:setDWE)(p=>[...p,{shift:sk,staffId:Number(sid)}]);}
  function remMR(type,i){(type==="wd"?setDWD:setDWE)(p=>p.filter((_,j)=>j!==i));}
  function movMR(type,i,d){(type==="wd"?setDWD:setDWE)(p=>{const a=[...p],n=i+d;if(n<0||n>=a.length)return a;[a[i],a[n]]=[a[n],a[i]];return a;});}
  function saveMaster(){
    setWdO(dWD);setWeO(dWE);
    setSched(prev=>({...prev,...genSched(yr,mo,dWD,dWE)}));
    note("シフトマスターを更新し今月を再生成しました");closeMaster();
  }

  // ── 同期 ──
  async function doLoad(){
    if(!gasUrl.trim()){setSyncMsg("URLを入力してください");setSyncSt("error");return;}
    setSyncSt("loading");setSyncMsg("読み込み中...");
    try{
      const r=await fetch(`${gasUrl.trim()}?action=load`);const j=await r.json();
      if(j.error)throw new Error(j.error);
      if(j.staff)setStaff(j.staff);if(j.sched)setSched(j.sched);
      if(j.wdOrder)setWdO(j.wdOrder);if(j.weOrder)setWeO(j.weOrder);
      setSyncSt("ok");setSyncMsg("✅ 読み込み完了");note("スプレッドシートから読み込みました");
    }catch(e){setSyncSt("error");setSyncMsg(`❌ ${e.message}`);}
  }
  async function doSave(){
    if(!gasUrl.trim()){setSyncMsg("URLを入力してください");setSyncSt("error");return;}
    setSyncSt("loading");setSyncMsg("保存中...");
    try{
      const r=await fetch(gasUrl.trim(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save",staff,sched,wdOrder:wdO,weOrder:weO})});
      const j=await r.json();if(j.error)throw new Error(j.error);
      setSyncSt("ok");setSyncMsg("✅ 保存完了");note("スプレッドシートに保存しました");
    }catch(e){setSyncSt("error");setSyncMsg(`❌ ${e.message}`);}
  }

  // ── レンダリング用 ──
  const days=daysInMonth(yr,mo);
  const first=firstDow(yr,mo);
  const cells=[...Array(first).fill(null),...Array.from({length:days},(_,i)=>i+1)];
  const selEntry=sched[selDs]||{};
  const selShifts=getShifts(selDs);
  const selDow=new Date(selDs).getDay();
  const selIsHol=HOLIDAYS.has(selDs);
  const selIsWE=selDow===0||selDow===6||selIsHol;
  const [sY,sM,sD]=selDs.split("-");

  // 集計
  const stats={};
  staff.forEach(s=>{stats[s.id]={nisoku:0,junya:0,oncallA:0,oncallB:0};});
  Object.entries(sched).forEach(([ds,e])=>{
    if(!ds.startsWith(`${yr}-${String(mo+1).padStart(2,"0")}`))return;
    Object.entries(e).forEach(([k,sid])=>{if(stats[sid])stats[sid][k]=(stats[sid][k]||0)+1;});
  });

  const syncColor=syncSt==="ok"?"#34C759":syncSt==="error"?"#FF3B30":syncSt==="loading"?"#FF9500":"#8E8E93";

  return(
    <div style={{fontFamily:"-apple-system,'Helvetica Neue',sans-serif",minHeight:"100vh",background:"#F2F2F7",WebkitTextSizeAdjust:"100%",overflowX:"hidden"}}>

      {/* ━━ ヘッダー ━━ */}
      <div style={{background:"white",position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 0 #E5E5EA"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px 10px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:26}}>🔬</span>
            <div>
              <div style={{fontSize:17,fontWeight:700,color:"#1C1C1E",lineHeight:1.2}}>日当直管理</div>
              <div style={{fontSize:11,color:"#8E8E93"}}>臨床検査科</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn label={syncSt==="loading"?"⏳":"☁️"} color={syncColor} onClick={()=>setSyncOpen(true)}/>
            <Btn label="設定" color="#007AFF" onClick={()=>{setSettOpen(true);setSettTab("member");startAdd();}}/>
          </div>
        </div>
        {/* タブ */}
        <div style={{display:"flex"}}>
          {[["cal","📅 カレンダー"],["list","📋 一覧"],["stats","📊 集計"],["notif","🔔 通知"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"9px 0",background:"none",border:"none",borderBottom:tab===k?"2.5px solid #007AFF":"2.5px solid transparent",color:tab===k?"#007AFF":"#8E8E93",fontSize:12,fontWeight:tab===k?700:500,cursor:"pointer",position:"relative"}}>
              {l}{k==="notif"&&notifs.length>0&&<span style={{position:"absolute",top:6,right:"26%",width:7,height:7,borderRadius:"50%",background:"#FF3B30"}}/>}
            </button>
          ))}
        </div>
      </div>

      {/* ━━ カレンダータブ ━━ */}
      {tab==="cal"&&(
        <div>
          {/* 月ナビ */}
          <div style={{background:"white",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 24px 10px",borderBottom:"1px solid #F2F2F7"}}>
            <button onClick={()=>chMo(-1)} style={{background:"none",border:"none",fontSize:26,color:"#007AFF",cursor:"pointer",lineHeight:1,padding:"0 6px"}}>‹</button>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:700,color:"#1C1C1E"}}>{yr}年 {MJ[mo]}</div>
              <div style={{fontSize:11,color:"#8E8E93",marginTop:2}}>{selIsWE?"土日祝：日直・準夜勤・待機A・待機B":"平日：準夜勤・待機A・待機B"}</div>
            </div>
            <button onClick={()=>chMo(1)} style={{background:"none",border:"none",fontSize:26,color:"#007AFF",cursor:"pointer",lineHeight:1,padding:"0 6px"}}>›</button>
          </div>

          {/* カレンダーグリッド */}
          <div style={{background:"white",padding:"6px 10px 12px"}}>
            {/* 曜日ヘッダー */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:4}}>
              {WD.map((w,i)=>(
                <div key={w} style={{textAlign:"center",fontSize:13,fontWeight:600,color:i===0?"#FF3B30":i===6?"#007AFF":"#8E8E93",padding:"4px 0"}}>{w}</div>
              ))}
            </div>
            {/* 日付グリッド */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",rowGap:6}}>
              {cells.map((d,i)=>{
                if(!d) return <div key={`e${i}`}/>;
                const ds=toStr(yr,mo,d);
                const dow=(first+d-1)%7;
                const isHol=HOLIDAYS.has(ds);
                const isToday=ds===todayStr;
                const isSel=ds===selDs;
                const entry=sched[ds]||{};
                // 担当者ドット（最大4個）
                const dots=getShifts(ds).map(sk=>staff.find(x=>x.id===entry[sk])?.color).filter(Boolean);
                return(
                  <div key={ds} onClick={()=>setSelDs(ds)}
                    style={{display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",userSelect:"none"}}>
                    <div style={{
                      width:38,height:38,borderRadius:"50%",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      background:isToday?"#007AFF":isSel?"#E8F0FE":"transparent",
                      border:isSel&&!isToday?"2px solid #007AFF":"2px solid transparent",
                    }}>
                      <span style={{
                        fontSize:17,fontWeight:isToday||isSel?700:400,
                        color:isToday?"white":isHol||dow===0?"#FF3B30":dow===6?"#007AFF":"#1C1C1E",
                      }}>{d}</span>
                    </div>
                    {/* ドット */}
                    <div style={{display:"flex",gap:2,marginTop:2,height:7,alignItems:"center"}}>
                      {dots.slice(0,4).map((c,di)=>(
                        <span key={di} style={{width:5,height:5,borderRadius:"50%",background:c,display:"inline-block"}}/>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 選択日 詳細パネル ── */}
          <div style={{margin:"12px 14px",background:"white",borderRadius:18,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
            {/* 日付ヘッダー */}
            <div style={{padding:"16px 18px 12px",borderBottom:"1px solid #F2F2F7",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:19,fontWeight:700,color:"#1C1C1E",marginBottom:4}}>
                  {parseInt(sM)}月{parseInt(sD)}日（{WD[selDow]}）
                </div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {selDs===todayStr&&<Tag label="今日" bg="#007AFF" color="white"/>}
                  {selIsHol&&<Tag label="祝日" bg="#FF3B30" color="white"/>}
                  {!selIsHol&&selDow===0&&<Tag label="日曜日" bg="#FFE5E5" color="#FF3B30"/>}
                  {!selIsHol&&selDow===6&&<Tag label="土曜日" bg="#E3F2FD" color="#007AFF"/>}
                  <Tag label={selIsWE?"土日祝シフト":"平日シフト"} bg="#F2F2F7" color="#3C3C43"/>
                </div>
              </div>
              <button onClick={()=>openEdit(selDs)}
                style={{background:"#007AFF",color:"white",border:"none",borderRadius:12,padding:"9px 18px",fontSize:15,fontWeight:700,cursor:"pointer",flexShrink:0}}>
                編集
              </button>
            </div>
            {/* シフト行 */}
            {selShifts.map((sk,idx)=>{
              const sv=SHIFT_DEFS[sk];
              const mem=staff.find(x=>x.id===selEntry[sk]);
              return(
                <div key={sk} style={{display:"flex",alignItems:"center",padding:"14px 18px",borderBottom:idx<selShifts.length-1?"1px solid #F2F2F7":"none",gap:14}}>
                  <div style={{width:44,height:44,borderRadius:12,background:sv.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{sv.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:"#8E8E93",marginBottom:3}}>{sv.label}</div>
                    <div style={{fontSize:17,fontWeight:600,color:mem?"#1C1C1E":"#C7C7CC"}}>{mem?mem.name:"未割り当て"}</div>
                  </div>
                  {mem&&<div style={{width:14,height:14,borderRadius:"50%",background:mem.color,flexShrink:0}}/>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━ 一覧タブ ━━ */}
      {tab==="list"&&(
        <div style={{padding:"8px 14px 24px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 2px 12px"}}>
            <div style={{fontSize:20,fontWeight:700,color:"#1C1C1E"}}>{yr}年 {MJ[mo]}</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>chMo(-1)} style={{background:"white",border:"1px solid #E5E5EA",borderRadius:10,padding:"6px 14px",color:"#007AFF",fontSize:15,cursor:"pointer",fontWeight:600}}>‹</button>
              <button onClick={()=>chMo(1)}  style={{background:"white",border:"1px solid #E5E5EA",borderRadius:10,padding:"6px 14px",color:"#007AFF",fontSize:15,cursor:"pointer",fontWeight:600}}>›</button>
            </div>
          </div>
          {Array.from({length:days},(_,i)=>i+1).map(d=>{
            const ds=toStr(yr,mo,d);
            const dow=(first+d-1)%7;
            const isHol=HOLIDAYS.has(ds);const isWE=dow===0||dow===6||isHol;
            const entry=sched[ds]||{};const isToday=ds===todayStr;
            const shifts=getShifts(ds);
            return(
              <div key={ds} onClick={()=>{setTab("cal");setSelDs(ds);}}
                style={{background:"white",borderRadius:14,marginBottom:8,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.07)",cursor:"pointer"}}>
                {/* 日付バー */}
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",background:isToday?"#007AFF":isWE?"#FFF8F0":"#F9F9FB",borderBottom:"1px solid rgba(0,0,0,0.04)"}}>
                  <div style={{width:42,height:42,borderRadius:11,background:isToday?"rgba(255,255,255,0.25)":isHol||dow===0?"#FFE0B2":dow===6?"#DBEAFE":"#E5E5EA",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <div style={{fontSize:11,fontWeight:600,color:isToday?"white":isHol||dow===0?"#E65100":"#8E8E93",lineHeight:1}}>{WD[dow]}</div>
                    <div style={{fontSize:19,fontWeight:700,color:isToday?"white":isHol||dow===0?"#FF3B30":dow===6?"#007AFF":"#1C1C1E",lineHeight:1.2}}>{d}</div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,color:isToday?"rgba(255,255,255,0.8)":isWE?"#FF9500":"#8E8E93",fontWeight:600,marginBottom:4}}>{isWE?"土日祝シフト":"平日シフト"}</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                      {shifts.map(sk=>{
                        const sv=SHIFT_DEFS[sk];const mem=staff.find(x=>x.id===entry[sk]);
                        return mem?(
                          <div key={sk} style={{display:"inline-flex",alignItems:"center",gap:3,background:isToday?"rgba(255,255,255,0.2)":sv.bg,borderRadius:8,padding:"3px 8px",border:isToday?"1px solid rgba(255,255,255,0.3)":`1px solid ${sv.color}33`}}>
                            <span style={{fontSize:12}}>{sv.icon}</span>
                            <span style={{fontSize:12,fontWeight:600,color:isToday?"white":sv.color}}>{sv.label}</span>
                            <span style={{fontSize:12,color:isToday?"rgba(255,255,255,0.9)":"#1C1C1E"}}>{mem.name}</span>
                          </div>
                        ):null;
                      })}
                    </div>
                  </div>
                  {isHol&&<span style={{fontSize:11,background:"#FF3B30",color:"white",borderRadius:6,padding:"2px 6px",flexShrink:0,fontWeight:600}}>祝</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ━━ 集計タブ ━━ */}
      {tab==="stats"&&(
        <div style={{padding:"8px 14px 24px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 2px 12px"}}>
            <div style={{fontSize:20,fontWeight:700,color:"#1C1C1E"}}>{yr}年 {MJ[mo]}</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>chMo(-1)} style={{background:"white",border:"1px solid #E5E5EA",borderRadius:10,padding:"6px 14px",color:"#007AFF",fontSize:15,cursor:"pointer",fontWeight:600}}>‹</button>
              <button onClick={()=>chMo(1)}  style={{background:"white",border:"1px solid #E5E5EA",borderRadius:10,padding:"6px 14px",color:"#007AFF",fontSize:15,cursor:"pointer",fontWeight:600}}>›</button>
            </div>
          </div>
          {staff.map(s=>{
            const cnt=stats[s.id]||{nisoku:0,junya:0,oncallA:0,oncallB:0};
            const total=Object.values(cnt).reduce((a,b)=>a+b,0);
            return(
              <div key={s.id} style={{background:"white",borderRadius:16,marginBottom:10,padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:s.color+"20",border:`2.5px solid ${s.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:s.color,fontWeight:800,flexShrink:0}}>{s.name[0]}</div>
                  <div>
                    <div style={{fontSize:17,fontWeight:700,color:"#1C1C1E"}}>{s.name}</div>
                    <div style={{fontSize:13,color:"#8E8E93"}}>今月合計 {total} 回</div>
                  </div>
                </div>
                {Object.entries(SHIFT_DEFS).map(([k,v])=>(
                  <div key={k} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <div style={{width:32,height:32,borderRadius:9,background:v.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{v.icon}</div>
                    <div style={{fontSize:14,color:"#3C3C43",width:58,flexShrink:0,fontWeight:500}}>{v.label}</div>
                    <div style={{flex:1,height:8,background:"#F2F2F7",borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${Math.min(100,(cnt[k]||0)/6*100)}%`,background:v.color,borderRadius:4,transition:"width 0.4s"}}/>
                    </div>
                    <div style={{fontSize:17,fontWeight:700,color:v.color,minWidth:24,textAlign:"right"}}>{cnt[k]||0}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ━━ 通知タブ ━━ */}
      {tab==="notif"&&(
        <div style={{padding:"8px 14px 24px"}}>
          <div style={{fontSize:20,fontWeight:700,color:"#1C1C1E",padding:"10px 2px 12px"}}>🔔 通知履歴</div>
          {notifs.length===0
            ?<div style={{background:"white",borderRadius:16,padding:"48px 20px",textAlign:"center",color:"#8E8E93",fontSize:15}}>通知はありません</div>
            :notifs.map(n=>(
              <div key={n.id} style={{background:"white",borderRadius:14,padding:"14px 16px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
                <span style={{fontSize:14,color:"#1C1C1E",flex:1,marginRight:10}}>✅ {n.msg}</span>
                <span style={{color:"#8E8E93",fontSize:12,flexShrink:0}}>{n.time}</span>
              </div>
            ))
          }
        </div>
      )}

      {/* ━━━━━━ 編集モーダル ━━━━━━ */}
      {editOpen&&(
        <Sheet onClose={()=>setEditOpen(false)} title="シフト編集" sub={`${parseInt(sM)}月${parseInt(sD)}日（${WD[selDow]}）${selIsWE?"・土日祝":""}`}>
          {selShifts.map(sk=>{
            const sv=SHIFT_DEFS[sk];
            return(
              <div key={sk} style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:32,height:32,borderRadius:9,background:sv.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>{sv.icon}</div>
                  <span style={{fontSize:15,fontWeight:600,color:"#1C1C1E"}}>{sv.label}</span>
                </div>
                <select value={editData[sk]||""} onChange={e=>setEditData(p=>({...p,[sk]:Number(e.target.value)||null}))}
                  style={{width:"100%",padding:"13px 14px",background:"#F2F2F7",border:"none",borderRadius:12,fontSize:15,color:"#1C1C1E",outline:"none",appearance:"none",WebkitAppearance:"none",boxSizing:"border-box"}}>
                  <option value="">— 未割り当て —</option>
                  {staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            );
          })}
          <div style={{display:"flex",gap:10,marginTop:6}}>
            <button onClick={()=>setEditOpen(false)} style={cancelBtn}>キャンセル</button>
            <button onClick={saveEdit} style={primaryBtn}>保存</button>
          </div>
        </Sheet>
      )}

      {/* ━━━━━━ 設定パネル ━━━━━━ */}
      {settOpen&&(
        <Sheet onClose={()=>{setSettOpen(false);closeMaster();}} title="設定" noPad>
          {/* タブ */}
          <div style={{display:"flex",borderBottom:"1px solid #E5E5EA",marginBottom:0}}>
            {[["member","👤 メンバー"],["master","📋 マスター"]].map(([k,l])=>(
              <button key={k} onClick={()=>{setSettTab(k);k==="master"?openMaster():closeMaster();}} style={{flex:1,padding:"11px 0",background:"none",border:"none",borderBottom:settTab===k?"2.5px solid #007AFF":"2.5px solid transparent",color:settTab===k?"#007AFF":"#8E8E93",fontSize:14,fontWeight:600,cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          <div style={{padding:"16px",overflowY:"auto",flex:1}}>

            {/* ── メンバータブ ── */}
            {settTab==="member"&&(<>
              {/* 追加・編集フォーム */}
              <div style={{background:"#F9F9FB",borderRadius:14,padding:16,marginBottom:16,border:"1px solid #E5E5EA"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#8E8E93",marginBottom:12}}>
                  {editMember?`✎ 編集中：${editMember.name}`:`＋ 新しいメンバーを追加（${staff.length}/${MAX_STAFF}名）`}
                </div>
                {!editMember&&staff.length>=MAX_STAFF
                  ?<div style={{color:"#FF3B30",fontSize:14}}>スタッフ数が上限（{MAX_STAFF}名）に達しています</div>
                  :(<>
                    <div style={{fontSize:12,color:"#8E8E93",marginBottom:5}}>氏名</div>
                    <input value={mForm.name} onChange={e=>setMForm(p=>({...p,name:e.target.value}))}
                      placeholder="例：田中 一郎"
                      style={{width:"100%",padding:"13px 14px",background:"white",border:"1px solid #E5E5EA",borderRadius:12,fontSize:15,color:"#1C1C1E",outline:"none",boxSizing:"border-box",marginBottom:14}}/>
                    <div style={{fontSize:12,color:"#8E8E93",marginBottom:8}}>カラー</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:9,marginBottom:16}}>
                      {COLOR_OPTIONS.map(c=>(
                        <div key={c} onClick={()=>setMForm(p=>({...p,color:c}))}
                          style={{width:30,height:30,borderRadius:"50%",background:c,cursor:"pointer",border:mForm.color===c?"3px solid white":"3px solid transparent",boxShadow:mForm.color===c?`0 0 0 2.5px ${c}`:"none",transition:"all 0.12s"}}/>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      {editMember&&<button onClick={()=>{setEditMember(null);setMForm({name:"",color:COLOR_OPTIONS[0]});}} style={cancelBtn}>キャンセル</button>}
                      <button onClick={saveMember} disabled={!mForm.name.trim()}
                        style={{...primaryBtn,background:mForm.name.trim()?"#007AFF":"#C7C7CC",cursor:mForm.name.trim()?"pointer":"not-allowed",flex:2}}>
                        {editMember?"更新する":"追加する"}
                      </button>
                    </div>
                  </>)
                }
              </div>
              {/* メンバーリスト */}
              <div style={{fontSize:12,color:"#8E8E93",marginBottom:8,paddingLeft:2}}>登録メンバー（{staff.length}名）</div>
              <div style={{background:"white",borderRadius:14,overflow:"hidden",border:"1px solid #E5E5EA"}}>
                {staff.map((s,idx)=>(
                  <div key={s.id} style={{display:"flex",alignItems:"center",padding:"13px 16px",borderBottom:idx<staff.length-1?"1px solid #F2F2F7":"none",gap:12}}>
                    <div style={{width:38,height:38,borderRadius:"50%",background:s.color+"20",border:`2px solid ${s.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:s.color,fontWeight:800,flexShrink:0}}>{s.name[0]}</div>
                    <div style={{flex:1,fontSize:15,fontWeight:500,color:"#1C1C1E"}}>{s.name}</div>
                    <button onClick={()=>startEdit(s)} style={{background:"#EEF4FF",color:"#007AFF",border:"none",borderRadius:9,padding:"6px 13px",fontSize:13,cursor:"pointer",fontWeight:600,marginRight:4}}>編集</button>
                    {delConf===s.id
                      ?<div style={{display:"flex",gap:5}}>
                        <button onClick={()=>delMember(s.id)} style={{background:"#FF3B30",color:"white",border:"none",borderRadius:9,padding:"6px 10px",fontSize:13,cursor:"pointer",fontWeight:600}}>削除</button>
                        <button onClick={()=>setDelConf(null)} style={{background:"#F2F2F7",color:"#8E8E93",border:"none",borderRadius:9,padding:"6px 10px",fontSize:13,cursor:"pointer"}}>戻る</button>
                      </div>
                      :<button onClick={()=>setDelConf(s.id)} style={{background:"#FFEBEE",color:"#FF3B30",border:"none",borderRadius:9,padding:"6px 10px",fontSize:13,cursor:"pointer",fontWeight:600}}>削除</button>
                    }
                  </div>
                ))}
              </div>
            </>)}

            {/* ── マスタータブ ── */}
            {settTab==="master"&&dWD&&(<>
              <div style={{background:"#FFFDE7",borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:13,color:"#795548",lineHeight:1.8,border:"1px solid #FFF176"}}>
                💡 各シフトの担当順を設定します。順番通りに繰り返し割り当てられます。
              </div>
              <MasterSec title="📅 平日シフト" color="#34C759" draft={dWD} shifts={["junya","oncallA","oncallB"]} staff={staff}
                onAdd={(sk,sid)=>addMR("wd",sk,sid)} onRem={i=>remMR("wd",i)} onMov={(i,d)=>movMR("wd",i,d)}/>
              <div style={{height:12}}/>
              <MasterSec title="🏖️ 土日祝シフト" color="#FF9500" draft={dWE} shifts={["nisoku","junya","oncallA","oncallB"]} staff={staff}
                onAdd={(sk,sid)=>addMR("we",sk,sid)} onRem={i=>remMR("we",i)} onMov={(i,d)=>movMR("we",i,d)}/>
              <div style={{display:"flex",gap:10,marginTop:14}}>
                <button onClick={closeMaster} style={cancelBtn}>キャンセル</button>
                <button onClick={saveMaster} style={{...primaryBtn,flex:2}}>✅ 今月に適用</button>
              </div>
            </>)}
          </div>
        </Sheet>
      )}

      {/* ━━━━━━ 同期パネル ━━━━━━ */}
      {syncOpen&&(
        <Sheet onClose={()=>setSyncOpen(false)} title="☁️ スプレッドシート連携">
          <div style={{background:"#F9F9FB",borderRadius:12,padding:"12px 14px",marginBottom:14,fontSize:13,color:"#3C3C43",lineHeight:1.9,border:"1px solid #E5E5EA"}}>
            <div style={{fontWeight:700,color:"#1C1C1E",marginBottom:4}}>設定手順</div>
            <div>1. Googleスプレッドシートを新規作成</div>
            <div>2. 拡張機能 → Apps Script を開く</div>
            <div>3. gas-script.gs のコードを貼り付けてデプロイ</div>
            <div>4. 「全員に公開」で発行されたURLを入力</div>
          </div>
          <div style={{fontSize:13,color:"#8E8E93",marginBottom:6}}>Apps Script URL</div>
          <input value={gasUrl} onChange={e=>setGasUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec"
            style={{width:"100%",padding:"13px 14px",background:"#F2F2F7",border:"none",borderRadius:12,fontSize:14,color:"#1C1C1E",outline:"none",boxSizing:"border-box",marginBottom:10}}/>
          {syncMsg&&(
            <div style={{padding:"9px 12px",borderRadius:10,marginBottom:10,fontSize:13,fontWeight:600,
              background:syncSt==="ok"?"#E8F5E9":syncSt==="error"?"#FFEBEE":"#FFFDE7",
              color:syncSt==="ok"?"#2E7D32":syncSt==="error"?"#C62828":"#F57F17"}}>
              {syncMsg}
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <button onClick={doLoad} disabled={syncSt==="loading"} style={{...cancelBtn,color:"#007AFF"}}>📥 読み込む</button>
            <button onClick={doSave} disabled={syncSt==="loading"} style={primaryBtn}>📤 保存する</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ── 共通コンポーネント ──────────────────────────────────────────────

function Sheet({children,onClose,title,sub,noPad}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}}>
      <div style={{background:noPad?"#F2F2F7":"white",borderRadius:"22px 22px 0 0",width:"100%",maxWidth:560,maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 -4px 30px rgba(0,0,0,0.15)"}}>
        {/* ハンドル */}
        <div style={{display:"flex",justifyContent:"center",padding:"10px 0 4px"}}>
          <div style={{width:36,height:4,borderRadius:2,background:"#E5E5EA"}}/>
        </div>
        {/* タイトル */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 20px 12px",borderBottom:"1px solid #F2F2F7"}}>
          <div>
            <div style={{fontSize:17,fontWeight:700,color:"#1C1C1E"}}>{title}</div>
            {sub&&<div style={{fontSize:12,color:"#8E8E93",marginTop:2}}>{sub}</div>}
          </div>
          <button onClick={onClose} style={{background:"#F2F2F7",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,color:"#8E8E93",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {noPad
          ?<div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>{children}</div>
          :<div style={{overflowY:"auto",flex:1,padding:"16px 20px 32px"}}>{children}</div>
        }
      </div>
    </div>
  );
}

function MasterSec({title,color,draft,shifts,staff,onAdd,onRem,onMov}){
  const [aShift,setAShift]=useState(shifts[0]);
  const [aStaff,setAStaff]=useState("");
  return(
    <div style={{background:"white",borderRadius:14,padding:14,border:"1px solid #E5E5EA"}}>
      <div style={{fontSize:14,fontWeight:700,color,marginBottom:12}}>{title}</div>
      {shifts.map(sk=>{
        const sv=SHIFT_DEFS[sk];
        const rows=draft.map((r,i)=>({...r,idx:i})).filter(r=>r.shift===sk);
        return(
          <div key={sk} style={{marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
              <div style={{width:26,height:26,borderRadius:7,background:sv.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{sv.icon}</div>
              <span style={{fontSize:13,color:"#8E8E93",fontWeight:600}}>{sv.label} の順番</span>
            </div>
            {rows.length===0&&<div style={{fontSize:13,color:"#C7C7CC",padding:"4px 8px"}}>未設定</div>}
            {rows.map((r,pos)=>{
              const mem=staff.find(x=>x.id===r.staffId);
              return(
                <div key={r.idx} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,background:"#F9F9FB",borderRadius:10,padding:"9px 12px",border:"1px solid #F0F0F0"}}>
                  <span style={{fontSize:12,color:"#C7C7CC",minWidth:18}}>{pos+1}.</span>
                  <span style={{width:9,height:9,borderRadius:"50%",background:mem?.color||"#C7C7CC",flexShrink:0}}/>
                  <span style={{flex:1,fontSize:14,color:mem?"#1C1C1E":"#FF3B30",fontWeight:500}}>{mem?mem.name:"（削除済み）"}</span>
                  <button onClick={()=>onMov(r.idx,-1)} disabled={pos===0} style={{background:"white",border:"1px solid #E5E5EA",borderRadius:7,padding:"3px 9px",cursor:pos===0?"not-allowed":"pointer",color:pos===0?"#E5E5EA":"#8E8E93",fontSize:13}}>▲</button>
                  <button onClick={()=>onMov(r.idx,1)} disabled={pos===rows.length-1} style={{background:"white",border:"1px solid #E5E5EA",borderRadius:7,padding:"3px 9px",cursor:pos===rows.length-1?"not-allowed":"pointer",color:pos===rows.length-1?"#E5E5EA":"#8E8E93",fontSize:13}}>▼</button>
                  <button onClick={()=>onRem(r.idx)} style={{background:"#FFEBEE",color:"#FF3B30",border:"none",borderRadius:7,padding:"3px 9px",cursor:"pointer",fontSize:13,fontWeight:600}}>✕</button>
                </div>
              );
            })}
          </div>
        );
      })}
      <div style={{borderTop:"1px solid #F2F2F7",paddingTop:10,display:"flex",gap:6,flexWrap:"wrap"}}>
        <select value={aShift} onChange={e=>setAShift(e.target.value)}
          style={{padding:"9px 10px",background:"#F2F2F7",border:"none",borderRadius:10,fontSize:13,color:"#1C1C1E",outline:"none"}}>
          {shifts.map(sk=><option key={sk} value={sk}>{SHIFT_DEFS[sk].icon} {SHIFT_DEFS[sk].label}</option>)}
        </select>
        <select value={aStaff} onChange={e=>setAStaff(e.target.value)}
          style={{flex:1,padding:"9px 10px",background:"#F2F2F7",border:"none",borderRadius:10,fontSize:13,color:"#1C1C1E",outline:"none"}}>
          <option value="">担当者を選択</option>
          {staff.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={()=>{onAdd(aShift,aStaff);setAStaff("");}} disabled={!aStaff}
          style={{padding:"9px 14px",background:aStaff?"#007AFF":"#C7C7CC",color:"white",border:"none",borderRadius:10,cursor:aStaff?"pointer":"not-allowed",fontSize:13,fontWeight:700}}>＋</button>
      </div>
    </div>
  );
}

function Tag({label,bg,color}){
  return <span style={{fontSize:12,background:bg,color,borderRadius:7,padding:"2px 8px",fontWeight:600}}>{label}</span>;
}
function Btn({label,color,onClick}){
  return <button onClick={onClick} style={{background:"#F2F2F7",border:"none",borderRadius:10,padding:"8px 14px",cursor:"pointer",fontSize:14,color,fontWeight:600}}>{label}</button>;
}

const primaryBtn={flex:2,padding:"14px 0",background:"#007AFF",color:"white",border:"none",borderRadius:14,cursor:"pointer",fontSize:16,fontWeight:700};
const cancelBtn={flex:1,padding:"14px 0",background:"#F2F2F7",color:"#1C1C1E",border:"none",borderRadius:14,cursor:"pointer",fontSize:16,fontWeight:500};
