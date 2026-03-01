import { useState, useCallback } from "react";

// ─── Config ──────────────────────────────────────────────────────────────────
const APP_PASSWORD = "CariloMat123@";

const NOTION_DATABASES = {
  leader:  { id: "collection://3019f29d-8033-80cc-b149-000be988eaf7", label: "Leader",       type: "income",  color: "#4ade80" },
  spinoff: { id: "collection://3019f29d-8033-81ea-a3bf-000b5b8081f1", label: "Spin-off",     type: "income",  color: "#a78bfa" },
  other:   { id: "collection://3019f29d-8033-8122-b9be-000b5b1e6c4c", label: "Other Income",  type: "income",  color: "#60a5fa" },
  vendors: { id: "collection://3019f29d-8033-817e-bd2e-000b6a3c7e74", label: "Vendors",       type: "expense", color: "#f87171" },
};

const STATUS_OPTIONS = ["Not started", "Working On it", "Requestd", "Payed"];
const STATUS_COLORS  = { "Payed":"#4ade80","Working On it":"#fbbf24","Requestd":"#a78bfa","Not started":"#6b7280" };

const INIT_PARTNERS = [
  { id:1, name:"Matias", pct:7.5,   color:"#f59e0b" },
  { id:2, name:"Lucas",  pct:46.25, color:"#60a5fa" },
  { id:3, name:"Martin", pct:46.25, color:"#a78bfa" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt     = (n) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n||0);
const fmtDate = (d) => { if(!d) return "—"; try { return new Date(d).toLocaleDateString("es-ES",{day:"2-digit",month:"short",year:"numeric"}); } catch { return d; } };
const pctFmt  = (n) => `${Number(n).toFixed(2).replace(/\.?0+$/,"")}%`;
const BAR_COLORS = ["#4ade80","#60a5fa","#a78bfa","#f59e0b","#f87171","#34d399"];

async function callClaude(prompt) {
  const apiKey = process.env.REACT_APP_ANTHROPIC_KEY;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key": apiKey, "anthropic-version":"2023-06-01"},
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514", max_tokens:1000,
      system:`You are a Notion integration assistant for a finance pipeline.
Databases:
- Leader:   collection://3019f29d-8033-80cc-b149-000be988eaf7
- Spin-off: collection://3019f29d-8033-81ea-a3bf-000b5b8081f1
- Other:    collection://3019f29d-8033-8122-b9be-000b5b1e6c4c
- Vendors:  collection://3019f29d-8033-817e-bd2e-000b6a3c7e74
Always respond in valid JSON only. No markdown, no preamble.`,
      messages:[{role:"user",content:prompt}],
      mcp_servers:[{type:"url",url:"https://mcp.notion.com/mcp",name:"notion-mcp"}],
    }),
  });
  return res.json();
}

// ─── UI Primitives ────────────────────────────────────────────────────────────
function Input({label,...p}){return(
  <div>
    {label&&<label style={{fontSize:10,color:"#444",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.08em"}}>{label}</label>}
    <input {...p} style={{width:"100%",background:"#0d0d14",border:"1px solid #1e1e2e",color:"#e2e8f0",padding:"9px 12px",borderRadius:6,fontSize:13,outline:"none",fontFamily:"inherit",...p.style}}/>
  </div>
);}
function Select({label,children,...p}){return(
  <div>
    {label&&<label style={{fontSize:10,color:"#444",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.08em"}}>{label}</label>}
    <select {...p} style={{width:"100%",background:"#0d0d14",border:"1px solid #1e1e2e",color:"#e2e8f0",padding:"9px 12px",borderRadius:6,fontSize:13,outline:"none",fontFamily:"inherit"}}>{children}</select>
  </div>
);}
function Btn({children,variant="ghost",...p}){
  const s={primary:{background:"#4ade80",border:"none",color:"#0a0a0f",fontWeight:700},blue:{background:"#60a5fa",border:"none",color:"#0a0a0f",fontWeight:700},ghost:{background:"transparent",border:"1px solid #1e1e2e",color:"#555"},danger:{background:"transparent",border:"1px solid #f8717144",color:"#f87171"}};
  return <button {...p} style={{padding:"9px 18px",borderRadius:6,fontSize:13,fontFamily:"inherit",cursor:"pointer",...s[variant],...p.style}}>{children}</button>;
}
function Modal({open,onClose,title,children}){
  if(!open) return null;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div className="fade-in" style={{background:"#0f0f18",border:"1px solid #1e1e2e",borderRadius:12,padding:28,width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:17,color:"#fff"}}>{title}</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"#444",fontSize:22,cursor:"pointer",lineHeight:1}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════
function LoginScreen({onLogin}){
  const [pwd,setPwd] = useState("");
  const [err,setErr] = useState(false);
  const [show,setShow] = useState(false);

  const attempt = () => {
    if(pwd === APP_PASSWORD){ onLogin(); }
    else { setErr(true); setPwd(""); setTimeout(()=>setErr(false),2000); }
  };

  return(
    <div style={{minHeight:"100vh",background:"#0a0a0f",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:360}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:40,marginBottom:12}}>📈</div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:26,color:"#fff",marginBottom:6}}>Finance Dashboard</div>
          <div style={{fontSize:12,color:"#333"}}>Ingresá la contraseña para acceder</div>
        </div>
        <div style={{background:"#0f0f18",border:`1px solid ${err?"#f87171":"#1e1e2e"}`,borderRadius:12,padding:28,transition:"border-color 0.2s"}}>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:10,color:"#444",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Contraseña</label>
            <div style={{position:"relative"}}>
              <input
                type={show?"text":"password"}
                placeholder="••••••••••"
                value={pwd}
                onChange={e=>{setPwd(e.target.value);setErr(false);}}
                onKeyDown={e=>e.key==="Enter"&&attempt()}
                style={{width:"100%",background:"#111",border:`1px solid ${err?"#f87171":"#1e1e2e"}`,color:"#e2e8f0",padding:"11px 44px 11px 14px",borderRadius:8,fontSize:15,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}
              />
              <button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#333",cursor:"pointer",fontSize:14}}>
                {show?"🙈":"👁"}
              </button>
            </div>
            {err&&<div style={{fontSize:11,color:"#f87171",marginTop:6}}>Contraseña incorrecta</div>}
          </div>
          <button onClick={attempt} style={{width:"100%",background:"#4ade80",border:"none",color:"#0a0a0f",padding:"12px",borderRadius:8,fontSize:14,fontWeight:700,fontFamily:"inherit",cursor:"pointer"}}>
            Ingresar
          </button>
        </div>
        <div style={{textAlign:"center",marginTop:20,fontSize:11,color:"#1e1e2e"}}>
          Compartí el link y la contraseña con tus socios
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// REPARTIJA
// ═══════════════════════════════════════════════════════════════════════════
function RepartijaSection() {
  const [partners,   setPartners]   = useState(INIT_PARTNERS);
  const [editPct,    setEditPct]    = useState(false);
  const [draftPct,   setDraftPct]   = useState(null);
  const [incoming,   setIncoming]   = useState("");
  const [deductions, setDeductions] = useState([{id:1,label:"",amount:"",who:""}]);
  const [result,     setResult]     = useState(null);
  const [copyFlash,  setCopyFlash]  = useState(false);

  const totalPct = (draftPct||partners).reduce((s,p)=>s+Number(p.pct||0),0);
  const pctOk    = Math.abs(totalPct-100)<0.01;
  const totalDed = deductions.filter(d=>d.label.trim()).reduce((s,d)=>s+(parseFloat(d.amount)||0),0);
  const toSplit  = Math.max(0,(parseFloat(incoming)||0)-totalDed);

  const addDed = ()=>setDeductions(ds=>[...ds,{id:Date.now(),label:"",amount:"",who:""}]);
  const rmDed  = (id)=>setDeductions(ds=>ds.length>1?ds.filter(d=>d.id!==id):ds);
  const upDed  = (id,k,v)=>setDeductions(ds=>ds.map(d=>d.id===id?{...d,[k]:v}:d));

  const calculate = ()=>{
    const total=parseFloat(incoming)||0; if(total<=0) return;
    const deds=deductions.filter(d=>d.label.trim()&&parseFloat(d.amount)>0).map(d=>({label:d.label.trim(),amount:parseFloat(d.amount),who:d.who}));
    const ded=deds.reduce((s,d)=>s+d.amount,0);
    const dist=Math.max(0,total-ded);
    const splits=partners.map(p=>({...p,amount:dist*(Number(p.pct)/100)}));
    setResult({total,deductions:deds,totalDed:ded,distributable:dist,splits,date:new Date()});
  };

  const reset = ()=>{setResult(null);setIncoming("");setDeductions([{id:1,label:"",amount:"",who:""}]);};

  const copyText = ()=>{
    if(!result) return;
    const lines=[`💸 REPARTIJA — ${result.date.toLocaleDateString("es-ES")}`,`━━━━━━━━━━━━━━━━━━━━━━━━`,`Monto recibido: ${fmt(result.total)}`,
      result.deductions.length?"Deducciones:":null,...result.deductions.map(d=>`  • ${d.label}${d.who?` (→${d.who})`:""}: -${fmt(d.amount)}`),
      result.totalDed>0?`Total deducido: -${fmt(result.totalDed)}`:null,`━━━━━━━━━━━━━━━━━━━━━━━━`,`A distribuir: ${fmt(result.distributable)}`,"",
      ...result.splits.map(p=>`${p.name} (${pctFmt(p.pct)}): ${fmt(p.amount)}`)
    ].filter(v=>v!==null).join("\n");
    navigator.clipboard.writeText(lines).then(()=>{setCopyFlash(true);setTimeout(()=>setCopyFlash(false),1800);}).catch(()=>{});
  };

  const openEditPct = ()=>{setDraftPct(partners.map(p=>({...p,pct:p.pct.toString()})));setEditPct(true);};
  const savePct     = ()=>{if(!pctOk)return;setPartners(draftPct.map(p=>({...p,pct:parseFloat(p.pct)})));setEditPct(false);setDraftPct(null);};

  return(
    <div style={{padding:"24px 20px",maxWidth:860,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:"#fff",marginBottom:4}}>💸 Calculadora de Repartija</div>
          <div style={{fontSize:12,color:"#2e2e4a"}}>Ingresá el pago, descontá lo que corresponde y distribuí entre los socios</div>
        </div>
        <Btn variant="ghost" onClick={openEditPct} style={{fontSize:12}}>⚙ Editar porcentajes</Btn>
      </div>

      {/* Partners preview */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:24}}>
        {partners.map((p,i)=>(
          <div key={p.id} style={{background:"#0d0d14",border:"1px solid #1a1a2a",borderRadius:10,padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontSize:13,color:"#e2e8f0",fontWeight:500}}>{p.name}</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:17,color:BAR_COLORS[i]}}>{pctFmt(p.pct)}</div>
            </div>
            <div style={{fontSize:result?14:12,color:result?BAR_COLORS[i]:"#2a2a3a",fontFamily:"'Syne',sans-serif",fontWeight:result?700:400}}>
              {result ? fmt(result.splits.find(s=>s.id===p.id)?.amount||0) : `≈ ${fmt(toSplit*(Number(p.pct)/100))}`}
            </div>
          </div>
        ))}
      </div>

      {/* Input card */}
      <div style={{background:"#0d0d14",border:"1px solid #1a1a2a",borderRadius:12,padding:22,marginBottom:14}}>
        {/* Monto */}
        <div style={{marginBottom:18}}>
          <label style={{fontSize:10,color:"#444",textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:6}}>Monto recibido (USD)</label>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:"#333",fontSize:16,pointerEvents:"none"}}>$</span>
            <input type="number" placeholder="0.00" value={incoming} onChange={e=>setIncoming(e.target.value)}
              style={{width:"100%",background:"#111",border:"1px solid #222",color:"#fff",padding:"11px 14px 11px 28px",borderRadius:8,fontSize:20,outline:"none",fontFamily:"'Syne',sans-serif",fontWeight:700,boxSizing:"border-box"}}/>
          </div>
        </div>

        {/* Deducciones */}
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <label style={{fontSize:10,color:"#444",textTransform:"uppercase",letterSpacing:"0.08em"}}>Deducciones</label>
            <button onClick={addDed} style={{background:"transparent",border:"1px dashed #2a2a3a",color:"#444",padding:"3px 10px",borderRadius:4,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>+ agregar</button>
          </div>
          <div style={{display:"grid",gap:8}}>
            {deductions.map(d=>(
              <div key={d.id} style={{display:"grid",gridTemplateColumns:"1fr 110px 110px 24px",gap:6,alignItems:"end"}}>
                <Input placeholder="Concepto / Deuda a Lucas..." value={d.label} onChange={e=>upDed(d.id,"label",e.target.value)} style={{padding:"7px 10px",fontSize:12}}/>
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"#333",fontSize:12,pointerEvents:"none"}}>$</span>
                  <input type="number" placeholder="0.00" value={d.amount} onChange={e=>upDed(d.id,"amount",e.target.value)}
                    style={{width:"100%",background:"#0d0d14",border:"1px solid #1e1e2e",color:"#e2e8f0",padding:"7px 8px 7px 18px",borderRadius:6,fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                </div>
                <select value={d.who} onChange={e=>upDed(d.id,"who",e.target.value)}
                  style={{background:"#0d0d14",border:"1px solid #1e1e2e",color:d.who?"#e2e8f0":"#333",padding:"7px 8px",borderRadius:6,fontSize:12,outline:"none",fontFamily:"inherit"}}>
                  <option value="">¿A quién?</option>
                  {partners.map(p=><option key={p.id} value={p.name} style={{color:"#fff"}}>{p.name}</option>)}
                  <option value="Proveedor" style={{color:"#fff"}}>Proveedor</option>
                  <option value="Cuenta" style={{color:"#fff"}}>Dejar en cuenta</option>
                </select>
                <button onClick={()=>rmDed(d.id)} style={{background:"transparent",border:"none",color:"#2a2a3a",cursor:"pointer",fontSize:18,padding:0,lineHeight:1}}>×</button>
              </div>
            ))}
          </div>
          {totalDed>0&&(
            <div style={{marginTop:8,padding:"7px 12px",background:"#f8717110",border:"1px solid #f8717130",borderRadius:6,display:"flex",justifyContent:"space-between",fontSize:12}}>
              <span style={{color:"#666"}}>Total deducido</span>
              <span style={{color:"#f87171",fontWeight:600}}>-{fmt(totalDed)}</span>
            </div>
          )}
        </div>

        {/* Bar preview */}
        {parseFloat(incoming)>0&&(
          <div style={{marginBottom:18}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:11,color:"#444"}}>
              <span style={{textTransform:"uppercase",letterSpacing:"0.08em"}}>A distribuir</span>
              <span style={{color:"#4ade80",fontWeight:700,fontFamily:"'Syne',sans-serif",fontSize:14}}>{fmt(toSplit)}</span>
            </div>
            <div style={{height:5,background:"#1a1a2a",borderRadius:3,overflow:"hidden",display:"flex"}}>
              {partners.map((p,i)=><div key={p.id} style={{height:"100%",width:`${p.pct}%`,background:BAR_COLORS[i]}}/>)}
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:8}}>
          <Btn variant="primary" onClick={calculate} style={{flex:2,padding:"11px"}}>Calcular distribución</Btn>
          {result&&<Btn variant="ghost" onClick={reset} style={{padding:"11px 14px"}}>Limpiar</Btn>}
        </div>
      </div>

      {/* Result */}
      {result&&(
        <div className="fade-in" style={{background:"#0a0f0a",border:"1px solid #1a3a1a",borderRadius:12,padding:22,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#4ade80"}}>✓ Distribución calculada</div>
            <button onClick={copyText} style={{background:copyFlash?"#4ade8022":"transparent",border:"1px solid #1e3e1e",color:copyFlash?"#4ade80":"#444",padding:"5px 12px",borderRadius:5,fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>
              {copyFlash?"✓ Copiado!":"Copiar para WhatsApp"}
            </button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
            {[{l:"Recibido",v:fmt(result.total),c:"#e2e8f0"},{l:"Deducido",v:`-${fmt(result.totalDed)}`,c:"#f87171"},{l:"Distribuido",v:fmt(result.distributable),c:"#4ade80"}].map((s,i)=>(
              <div key={i} style={{background:"#0d140d",border:"1px solid #1a2a1a",borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:9,color:"#2a4a2a",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3}}>{s.l}</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:s.c}}>{s.v}</div>
              </div>
            ))}
          </div>
          {result.deductions.length>0&&(
            <div style={{marginBottom:14,padding:"10px 12px",background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:8}}>
              <div style={{fontSize:9,color:"#333",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Deducciones</div>
              {result.deductions.map((d,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0",borderBottom:i<result.deductions.length-1?"1px solid #111":"none"}}>
                  <span style={{color:"#555"}}>{d.label}{d.who&&<span style={{color:"#333"}}> → {d.who}</span>}</span>
                  <span style={{color:"#f87171"}}>-{fmt(d.amount)}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{display:"grid",gap:8}}>
            {result.splits.map((p,i)=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",background:"#0f140f",border:`1px solid ${BAR_COLORS[i]}22`,borderRadius:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:BAR_COLORS[i],flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:14,color:"#d4d4d8",fontWeight:500}}>{p.name}</div>
                    <div style={{fontSize:10,color:"#333"}}>{pctFmt(p.pct)} del distribuible</div>
                  </div>
                </div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,color:BAR_COLORS[i]}}>{fmt(p.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit % modal */}
      <Modal open={editPct} onClose={()=>{setEditPct(false);setDraftPct(null);}} title="⚙ Editar porcentajes">
        <div style={{display:"grid",gap:12,marginBottom:16}}>
          {(draftPct||partners).map((p,i)=>(
            <div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,alignItems:"end"}}>
              <Input label={`Socio #${i+1}`} type="text" value={p.name} onChange={e=>setDraftPct(dp=>dp.map(x=>x.id===p.id?{...x,name:e.target.value}:x))}/>
              <div>
                <label style={{fontSize:10,color:"#444",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.08em"}}>Porcentaje %</label>
                <div style={{position:"relative"}}>
                  <input type="number" step="0.01" min="0" max="100" value={p.pct}
                    onChange={e=>setDraftPct(dp=>dp.map(x=>x.id===p.id?{...x,pct:e.target.value}:x))}
                    style={{width:"100%",background:"#0d0d14",border:"1px solid #1e1e2e",color:"#e2e8f0",padding:"9px 28px 9px 12px",borderRadius:6,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                  <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",color:"#333",fontSize:13}}>%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{padding:"9px 12px",background:pctOk?"#0a140a":"#140a0a",border:`1px solid ${pctOk?"#1a3a1a":"#3a1a1a"}`,borderRadius:7,marginBottom:14,display:"flex",justifyContent:"space-between",fontSize:12}}>
          <span style={{color:"#444"}}>Total</span>
          <span style={{color:pctOk?"#4ade80":"#f87171",fontWeight:700}}>{totalPct.toFixed(2)}%{pctOk?" ✓":" ← debe sumar 100%"}</span>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <button onClick={()=>setDraftPct(dp=>[...dp,{id:Date.now(),name:"Nuevo socio",pct:"0",color:"#34d399"}])}
            style={{background:"transparent",border:"1px dashed #2a2a3a",color:"#444",padding:"6px 12px",borderRadius:6,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>+ Agregar socio</button>
          {(draftPct||partners).length>2&&(
            <button onClick={()=>setDraftPct(dp=>dp.slice(0,-1))}
              style={{background:"transparent",border:"1px solid #3a1a1a",color:"#f87171",padding:"6px 12px",borderRadius:6,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>− Quitar último</button>
          )}
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="ghost" onClick={()=>{setEditPct(false);setDraftPct(null);}} style={{flex:1}}>Cancelar</Btn>
          <Btn variant="primary" onClick={savePct} style={{flex:2,opacity:pctOk?1:0.4}}>Guardar</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE SECTION
// ═══════════════════════════════════════════════════════════════════════════
function PipelineSection({notify}) {
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [loadMsg,  setLoadMsg]  = useState("");
  const [tab,      setTab]      = useState("all");
  const [search,   setSearch]   = useState("");
  const [showAdd,  setShowAdd]  = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [newEntry, setNewEntry] = useState({budget:"",amount:"",businessUnit:"Leader",expectedDate:"",notes:"",status:"Not started",category:"leader"});

  const catColor = {leader:"#4ade80",spinoff:"#a78bfa",other:"#60a5fa",vendors:"#f87171"};
  const catLabel = {leader:"Leader",spinoff:"Spin-off",other:"Other",vendors:"Vendors"};

  const load = useCallback(async()=>{
    setLoading(true); setLoadMsg("Conectando con Notion...");
    try{
      const prompt=`Fetch all pages from all 4 data sources and return a JSON array.
Sources: collection://3019f29d-8033-80cc-b149-000be988eaf7, collection://3019f29d-8033-81ea-a3bf-000b5b8081f1, collection://3019f29d-8033-8122-b9be-000b5b1e6c4c, collection://3019f29d-8033-817e-bd2e-000b6a3c7e74
Per page: {"id":"...","budget":"...","amount":0,"businessUnit":"...","expectedDate":"YYYY-MM-DD","notes":"...","status":"...","category":"leader|spinoff|other|vendors"}
Return ONLY a JSON array.`;
      setLoadMsg("Cargando pipeline...");
      const data = await callClaude(prompt);
      const text = data.content?.filter(b=>b.type==="text").map(b=>b.text).join("")||"";
      const m = text.match(/\[[\s\S]*\]/);
      if(m){ try{ setEntries(JSON.parse(m[0])); }catch{} }
      notify("✅ Datos actualizados");
    }catch(e){ notify("❌ "+e.message,"error"); }
    setLoading(false); setLoadMsg("");
  },[notify]);

  const updateStatus = async(entry,status)=>{
    const prev=[...entries];
    setEntries(es=>es.map(e=>e.id===entry.id?{...e,status}:e));
    try{
      await callClaude(`Update Notion page "${entry.id}" set status="${status}". notion-update-page update_properties. Return {"success":true}`);
      notify(`✅ Estado → "${status}"`);
    }catch{ setEntries(prev); notify("❌ Error","error"); }
  };

  const addEntry = async()=>{
    if(!newEntry.budget.trim()) return;
    setLoading(true); setLoadMsg("Guardando...");
    try{
      const db=NOTION_DATABASES[newEntry.category];
      const amt=parseFloat(newEntry.amount)||0;
      const props={Budget:newEntry.budget,Amount:amt,status:newEntry.status,Notes:newEntry.notes||""};
      if(newEntry.expectedDate){props["date:Expected Date:start"]=newEntry.expectedDate;props["date:Expected Date:is_datetime"]=0;}
      if(newEntry.businessUnit) props["Business Unit"]=newEntry.businessUnit;
      await callClaude(`Create page in "${db.id.replace("collection://","")}" with: ${JSON.stringify(props)}. notion-create-pages. Return {"success":true}`);
      setEntries(es=>[...es,{id:"tmp-"+Date.now(),...newEntry,amount:amt}]);
      setShowAdd(false);
      setNewEntry({budget:"",amount:"",businessUnit:"Leader",expectedDate:"",notes:"",status:"Not started",category:"leader"});
      notify("✅ Guardado en Notion");
    }catch(e){ notify("❌ "+e.message,"error"); }
    setLoading(false); setLoadMsg("");
  };

  const saveEdit = async()=>{
    const prev=[...entries];
    setEntries(es=>es.map(e=>e.id===editing.id?editing:e));
    setEditing(null);
    try{
      const p={Budget:editing.budget,status:editing.status,Notes:editing.notes||"",Amount:editing.amount};
      if(editing.expectedDate){p["date:Expected Date:start"]=editing.expectedDate.slice(0,10);p["date:Expected Date:is_datetime"]=0;}
      await callClaude(`Update Notion page "${editing.id}" with: ${JSON.stringify(p)}. notion-update-page update_properties. Return {"success":true}`);
      notify("✅ Cambios guardados");
    }catch{ setEntries(prev); notify("❌ Error","error"); }
  };

  const TABS=[{id:"all",l:"Todo"},{id:"income",l:"Ingresos"},{id:"expense",l:"Gastos"},{id:"leader",l:"Leader"},{id:"spinoff",l:"Spin-off"},{id:"other",l:"Other"},{id:"vendors",l:"Vendors"}];
  const filtered=entries.filter(e=>{
    const mt=tab==="all"||(tab==="income"&&e.category!=="vendors")||(tab==="expense"&&e.category==="vendors")||tab===e.category;
    const ms=!search||e.budget?.toLowerCase().includes(search.toLowerCase())||e.notes?.toLowerCase().includes(search.toLowerCase());
    return mt&&ms;
  });
  const incomeTotal=entries.filter(e=>e.category!=="vendors").reduce((s,e)=>s+(e.amount||0),0);
  const expTotal=entries.filter(e=>e.category==="vendors").reduce((s,e)=>s+(e.amount||0),0);
  const pendingIncome=entries.filter(e=>e.category!=="vendors"&&e.status!=="Payed").reduce((s,e)=>s+(e.amount||0),0);

  return(
    <>
      {loading&&(
        <div style={{position:"fixed",inset:0,background:"rgba(10,10,15,0.9)",zIndex:9998,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
          <div style={{width:26,height:26,border:"2px solid #1a1a2a",borderTop:"2px solid #4ade80",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
          <div style={{color:"#4ade80",fontSize:13}}>{loadMsg}</div>
        </div>
      )}

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",borderBottom:"1px solid #1a1a2a"}}>
        {[
          {l:"Total Ingresos",v:fmt(incomeTotal),c:"#4ade80",s:`${entries.filter(e=>e.category!=="vendors").length} registros`},
          {l:"Por Cobrar",v:fmt(pendingIncome),c:"#fbbf24",s:`${entries.filter(e=>e.category!=="vendors"&&e.status!=="Payed").length} pendientes`},
          {l:"Total Gastos",v:fmt(expTotal),c:"#f87171",s:`${entries.filter(e=>e.category==="vendors").length} proveedores`},
          {l:"Pagados",v:`${entries.filter(e=>e.status==="Payed").length}`,c:"#60a5fa",s:`de ${entries.length} total`},
        ].map((s,i)=>(
          <div key={i} style={{padding:"14px 18px",borderRight:i%2===0?"1px solid #1a1a2a":"none",borderBottom:i<2?"1px solid #1a1a2a":"none"}}>
            <div style={{fontSize:9,color:"#2a2a3a",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{s.l}</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:18,color:s.c}}>{s.v}</div>
            <div style={{fontSize:9,color:"#1e1e2e",marginTop:2}}>{s.s}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{padding:"12px 16px",borderBottom:"1px solid #1a1a2a",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?"#1a1a2a":"transparent",border:tab===t.id?"1px solid #2a2a3a":"1px solid transparent",color:tab===t.id?"#fff":"#444",padding:"4px 10px",borderRadius:5,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
              {t.l}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:6}}>
          <input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{background:"#0d0d14",border:"1px solid #1a1a2a",color:"#ccc",padding:"5px 10px",borderRadius:5,fontSize:11,width:130,outline:"none",fontFamily:"inherit"}}/>
          <Btn variant="ghost" onClick={load} style={{fontSize:11,padding:"5px 10px"}}>🔄</Btn>
          <Btn variant="primary" onClick={()=>setShowAdd(true)} style={{fontSize:11,padding:"5px 12px"}}>+ Agregar</Btn>
        </div>
      </div>

      {/* Table / Cards */}
      <div style={{padding:"0 16px 40px"}}>
        {filtered.length===0?(
          <div style={{textAlign:"center",padding:"50px 0"}}>
            {entries.length===0?(<>
              <div style={{fontSize:28,marginBottom:8}}>📊</div>
              <div style={{color:"#222",marginBottom:14,fontSize:13}}>Sin datos — sincronizá con Notion</div>
              <Btn variant="primary" onClick={load}>Cargar desde Notion</Btn>
            </>):<span style={{fontSize:13,color:"#222"}}>Sin resultados</span>}
          </div>
        ):(
          /* Mobile-friendly cards */
          <div style={{display:"grid",gap:6,marginTop:10}}>
            {filtered.map(e=>(
              <div key={e.id} style={{background:"#0d0d14",border:"1px solid #111",borderRadius:8,padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{flex:1,marginRight:10}}>
                    <div style={{fontSize:13,color:"#d4d4d8",fontWeight:500,marginBottom:2}}>{e.budget||"—"}</div>
                    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      <span style={{background:catColor[e.category]+"15",color:catColor[e.category],padding:"2px 6px",borderRadius:3,fontSize:10}}>{catLabel[e.category]}</span>
                      {e.expectedDate&&<span style={{fontSize:10,color:"#333"}}>{fmtDate(e.expectedDate)}</span>}
                    </div>
                  </div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:e.category==="vendors"?"#f87171":"#4ade80",whiteSpace:"nowrap"}}>
                    {e.category==="vendors"?"-":""}{fmt(e.amount)}
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <select value={e.status||"Not started"} onChange={ev=>updateStatus(e,ev.target.value)}
                    style={{background:STATUS_COLORS[e.status]+"15",border:`1px solid ${STATUS_COLORS[e.status]}40`,color:STATUS_COLORS[e.status],padding:"3px 7px",borderRadius:4,fontSize:10,outline:"none",cursor:"pointer",fontFamily:"inherit"}}>
                    {STATUS_OPTIONS.map(s=><option key={s} value={s} style={{background:"#111",color:"#ccc"}}>{s}</option>)}
                  </select>
                  <button onClick={()=>setEditing(e)} style={{background:"transparent",border:"1px solid #1a1a2a",color:"#333",padding:"3px 9px",borderRadius:4,fontSize:10,fontFamily:"inherit",cursor:"pointer"}}>Editar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add modal */}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="Nuevo Registro">
        <div style={{display:"grid",gap:12}}>
          <Input label="Concepto *" type="text" placeholder="Ej: CCH 2025 - Cobro 4" value={newEntry.budget} onChange={e=>setNewEntry(n=>({...n,budget:e.target.value}))}/>
          <Input label="Monto (USD)" type="number" placeholder="0.00" value={newEntry.amount} onChange={e=>setNewEntry(n=>({...n,amount:e.target.value}))}/>
          <Input label="Fecha Estimada" type="date" value={newEntry.expectedDate} onChange={e=>setNewEntry(n=>({...n,expectedDate:e.target.value}))}/>
          <Input label="Notas" type="text" placeholder="Opcional" value={newEntry.notes} onChange={e=>setNewEntry(n=>({...n,notes:e.target.value}))}/>
          <Select label="Categoría" value={newEntry.category} onChange={e=>setNewEntry(n=>({...n,category:e.target.value}))}>
            {Object.entries(NOTION_DATABASES).map(([k,v])=><option key={k} value={k} style={{background:"#111"}}>{v.label} ({v.type==="income"?"Ingreso":"Gasto"})</option>)}
          </Select>
          <Select label="Estado" value={newEntry.status} onChange={e=>setNewEntry(n=>({...n,status:e.target.value}))}>
            {STATUS_OPTIONS.map(s=><option key={s} value={s} style={{background:"#111"}}>{s}</option>)}
          </Select>
        </div>
        <div style={{display:"flex",gap:8,marginTop:18}}>
          <Btn variant="ghost" onClick={()=>setShowAdd(false)} style={{flex:1}}>Cancelar</Btn>
          <Btn variant="primary" onClick={addEntry} style={{flex:2}}>Guardar en Notion</Btn>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={()=>setEditing(null)} title="Editar Registro">
        {editing&&(<>
          <div style={{display:"grid",gap:12}}>
            <Input label="Concepto" type="text" value={editing.budget||""} onChange={e=>setEditing(v=>({...v,budget:e.target.value}))}/>
            <Input label="Monto (USD)" type="number" value={editing.amount||""} onChange={e=>setEditing(v=>({...v,amount:parseFloat(e.target.value)||0}))}/>
            <Select label="Estado" value={editing.status||"Not started"} onChange={e=>setEditing(v=>({...v,status:e.target.value}))}>
              {STATUS_OPTIONS.map(s=><option key={s} value={s} style={{background:"#111"}}>{s}</option>)}
            </Select>
            <Input label="Fecha Estimada" type="date" value={editing.expectedDate?editing.expectedDate.slice(0,10):""} onChange={e=>setEditing(v=>({...v,expectedDate:e.target.value}))}/>
            <Input label="Notas" type="text" value={editing.notes||""} onChange={e=>setEditing(v=>({...v,notes:e.target.value}))}/>
          </div>
          <div style={{display:"flex",gap:8,marginTop:18}}>
            <Btn variant="ghost" onClick={()=>setEditing(null)} style={{flex:1}}>Cancelar</Btn>
            <Btn variant="blue" onClick={saveEdit} style={{flex:2}}>Guardar Cambios</Btn>
          </div>
        </>)}
      </Modal>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [authed,  setAuthed]  = useState(false);
  const [section, setSection] = useState("pipeline");
  const [notif,   setNotif]   = useState(null);

  const notify = useCallback((msg,type="success")=>{
    setNotif({msg,type});
    setTimeout(()=>setNotif(null),3500);
  },[]);

  if(!authed) return <LoginScreen onLogin={()=>setAuthed(true)}/>;

  return(
    <div style={{fontFamily:"'DM Mono','Courier New',monospace",background:"#0a0a0f",minHeight:"100vh",color:"#e2e8f0"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;}
        input,select,textarea,button{font-family:inherit;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:#0a0a0f;}::-webkit-scrollbar-thumb{background:#1e1e2e;border-radius:2px;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
        .fade-in{animation:fadeIn 0.25s ease}.slide-in{animation:slideIn 0.25s ease}
      `}</style>

      {/* Toast */}
      {notif&&(
        <div className="slide-in" style={{position:"fixed",top:16,right:16,zIndex:9999,background:notif.type==="error"?"#2a0a0a":"#0a1a0a",border:`1px solid ${notif.type==="error"?"#f87171":"#4ade80"}`,color:notif.type==="error"?"#f87171":"#4ade80",padding:"9px 16px",borderRadius:7,fontSize:12,boxShadow:"0 4px 20px rgba(0,0,0,0.6)"}}>
          {notif.msg}
        </div>
      )}

      {/* Header */}
      <div style={{borderBottom:"1px solid #1a1a2a",padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"#fff"}}>📈 Finance Dashboard</div>
            <div style={{fontSize:9,color:"#1e1e2e",textTransform:"uppercase",letterSpacing:"0.08em"}}>Sincronizado con Notion</div>
          </div>
          <div style={{width:1,height:28,background:"#1a1a2a"}}/>
          <nav style={{display:"flex",gap:3}}>
            {[{id:"pipeline",icon:"📊",l:"Pipeline"},{id:"repartija",icon:"💸",l:"Repartija"}].map(n=>(
              <button key={n.id} onClick={()=>setSection(n.id)} style={{background:section===n.id?"#1a1a2a":"transparent",border:section===n.id?"1px solid #2a2a3a":"1px solid transparent",color:section===n.id?"#fff":"#444",padding:"6px 12px",borderRadius:6,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5,transition:"all 0.15s"}}>
                <span>{n.icon}</span>{n.l}
              </button>
            ))}
          </nav>
        </div>
        <button onClick={()=>setAuthed(false)} style={{background:"transparent",border:"none",color:"#222",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>salir</button>
      </div>

      {section==="pipeline"  && <PipelineSection notify={notify}/>}
      {section==="repartija" && <RepartijaSection/>}
    </div>
  );
}
