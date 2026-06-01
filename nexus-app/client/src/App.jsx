import { useState, useEffect, useRef } from "react";

// ─── PALETTE ──────────────────────────────────────────────────────────────────
const C = {
  bg:"#FEFAE0", surface:"#F5EFC8", card:"#FFFFFF",
  border:"rgba(40,54,24,0.12)", borderMed:"rgba(40,54,24,0.24)",
  olive:"#606C38", forest:"#283618", caramel:"#DDA15E", copper:"#BC6C25",
  text:"#283618", muted:"#5A6632", dim:"#8A9462",
  success:"#276B1E", error:"#B52828",
  sans:"'Segoe UI', system-ui, sans-serif", display:"'Segoe UI', system-ui, sans-serif", mono:"'Segoe UI Mono', 'Consolas', monospace",
};

// ─── DOMAIN META ──────────────────────────────────────────────────────────────
const DM = {
  Employment:{ icon:"💼", color:C.olive,   label:"Employment"  },
  Finance:   { icon:"🏦", color:"#1A6B45", label:"Finance"     },
  Healthcare:{ icon:"🏥", color:C.error,   label:"Healthcare"  },
  Government:{ icon:"🏛️", color:C.copper,  label:"Government"  },
  Education: { icon:"🎓", color:"#8B6914", label:"Education"   },
};

const DOMAIN_ORDER = ["Employment","Finance","Healthcare","Government","Education"];

// ─── WHICH DOMAINS ARE PRIMARY FOR EACH OCCUPATION ────────────────────────────
const PRIMARY_DOMAINS = {
  "Salaried / Employed":         ["Employment","Finance","Healthcare"],
  "Student":                     ["Education"],
  "Fresher / Job Seeker":        ["Education","Employment"],
  "Self-employed / Business":    ["Employment","Finance"],
};

// ─── LIFE EVENTS ──────────────────────────────────────────────────────────────
const EVENTS = [
  { id:"job_change",      label:"Job Change",      icon:"💼", color:C.olive,   desc:"New employer or role change"        },
  { id:"graduation",      label:"Graduation",      icon:"🎓", color:"#8B6914", desc:"Completed a degree or course"       },
  { id:"relocation",      label:"Relocation",      icon:"🗺️", color:"#1A6B45", desc:"Moving to a new city"              },
  { id:"hospitalisation", label:"Hospitalisation", icon:"🏥", color:C.error,   desc:"Hospital admission or medical stay" },
  { id:"new_child",       label:"New Child",       icon:"🍼", color:C.copper,  desc:"Birth, adoption or guardianship"   },
];

// ─── INDIAN DATA ──────────────────────────────────────────────────────────────
const CITIES  = ["Ahmedabad","Bengaluru","Bhopal","Chennai","Delhi NCR","Hyderabad","Jaipur","Kochi","Kolkata","Lucknow","Mumbai","Nagpur","Noida","Pune","Surat","Visakhapatnam","Other"];
const STATES  = ["Andhra Pradesh","Assam","Bihar","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","Uttarakhand","West Bengal","Other"];
const DEGREES = ["B.E.","B.Tech","M.Tech","M.E.","MBA","BCA","MCA","B.Sc","M.Sc","B.Com","M.Com","MBBS","CA","LLB","Ph.D","Diploma","Other"];
const BANKS   = ["SBI","HDFC Bank","ICICI Bank","Axis Bank","Kotak Mahindra","Punjab National Bank","Bank of Baroda","Canara Bank","Union Bank","IDFC First","Yes Bank","IndusInd Bank","Other"];
const INSURERS= ["Star Health","HDFC ERGO","Bajaj Allianz","ICICI Lombard","New India Assurance","National Insurance","Oriental Insurance","Niva Bupa","Care Health","Aditya Birla Health"];
const OCC_OPTIONS = ["Salaried / Employed","Student","Fresher / Job Seeker","Self-employed / Business"];

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const sk  = e => e.toLowerCase().replace(/[^a-z0-9]/g,"_");
const ss  = {
  set: async(k,v)=>{ try{ await window.storage.set(k,JSON.stringify(v)); return true; }catch{ return false; } },
  get: async(k)  =>{ try{ const r=await window.storage.get(k); return r?JSON.parse(r.value):null; }catch{ return null; } },
};
const saveUser    = (e,d) => ss.set(`user-${sk(e)}`,d);
const loadUser    = e     => ss.get(`user-${sk(e)}`);
const saveDomains = (e,d) => ss.set(`dom-${sk(e)}`, d);
const loadDomains = e     => ss.get(`dom-${sk(e)}`);
const saveHistory = (e,h) => ss.set(`hist-${sk(e)}`,h);
const loadHistory = e     => ss.get(`hist-${sk(e)}`);

// ─── EMPTY DOMAIN TEMPLATE ────────────────────────────────────────────────────
const emptyDomains = () => ({
  Employment:{ Employer:"", Role:"", "CTC / Salary":"", Type:"", Since:"" },
  Finance:   { Bank:"", PAN:"", "Employer on Record":"", "Tax Slab":"", "Annual CTC":"" },
  Healthcare:{ Insurer:"", Plan:"", Employer:"", "Policy No.":"" },
  Government:{ Aadhaar:"", PAN:"", Address:"", "Filing Status":"", "Voter ID":"" },
  Education: { Degree:"", Institution:"", "Grad Year":"", CGPA:"", "Alumni Employer":"" },
});

const buildInitDomains = (reg, domainInputs={}) => {
  const base = emptyDomains();
  // Merge any domain inputs the user provided
  Object.entries(domainInputs).forEach(([dom,fields])=>{
    if (base[dom]) Object.assign(base[dom], fields);
  });
  // Fill Employment from registration if employed
  if (reg.occ==="Salaried / Employed") {
    if (reg.employer)  base.Employment.Employer = reg.employer;
    if (reg.role)      base.Employment.Role     = reg.role;
    if (reg.ctc)       { base.Employment["CTC / Salary"]=`₹${reg.ctc} LPA`; base.Finance["Annual CTC"]=`₹${reg.ctc} LPA`; }
    base.Employment.Type = "Full-time";
    base.Finance["Employer on Record"] = reg.employer||"";
    base.Finance["Tax Slab"] = reg.ctc ? (parseInt(reg.ctc)>15?"30%":parseInt(reg.ctc)>10?"20%":"5%") : "";
    base.Healthcare.Employer = reg.employer||"";
    base.Education["Alumni Employer"] = reg.employer||"";
  }
  if (reg.degree)   base.Education.Degree      = reg.degree;
  if (reg.inst)     base.Education.Institution  = reg.inst;
  if (reg.gradYear) base.Education["Grad Year"] = reg.gradYear;
  if (reg.city||reg.state) base.Government.Address = [reg.city,reg.state].filter(Boolean).join(", ");
  return base;
};

// ─── AFTER-EVENT DOMAIN BUILDER ───────────────────────────────────────────────
const buildAfterDomains = (eventId, form, cur) => {
  const a = JSON.parse(JSON.stringify(cur));
  switch(eventId){
    case "job_change":
      if(form.emp){a.Employment.Employer=form.emp;a.Finance["Employer on Record"]=form.emp;a.Healthcare.Employer=form.emp;a.Education["Alumni Employer"]=form.emp;}
      if(form.role) a.Employment.Role=form.role;
      if(form.ctc){a.Employment["CTC / Salary"]=`₹${form.ctc} LPA`;a.Finance["Annual CTC"]=`₹${form.ctc} LPA`;a.Finance["Tax Slab"]=parseInt(form.ctc)>15?"30%":parseInt(form.ctc)>10?"20%":"5%";}
      if(form.doj)  a.Employment.Since=new Date(form.doj).toLocaleDateString("en-IN",{month:"short",year:"numeric"});
      if(form.type) a.Employment.Type=form.type;
      a.Healthcare.Plan="Group Health Insurance";
      a.Healthcare["Policy No."]=`GRP-${new Date().getFullYear()}-${Math.floor(Math.random()*90000+10000)}`;
      break;
    case "graduation":
      a.Education.Degree=`${form.deg||"Degree"}${form.spec?" in "+form.spec:""}`;
      if(form.inst)     a.Education.Institution=form.inst;
      if(form.gradYear) a.Education["Grad Year"]=form.gradYear;
      break;
    case "relocation":
      if(form.city||form.state) a.Government.Address=`${form.addr?form.addr+", ":""}${form.city||""}${form.state?", "+form.state:""}`;
      a.Healthcare.Plan=(cur.Healthcare?.Plan||"Individual")+" (New Region)";
      break;
    case "hospitalisation":
      a.Healthcare.Plan=(cur.Healthcare?.Plan||"Individual")+" + Hospitalisation Cover";
      a.Healthcare["Policy No."]=(cur.Healthcare?.["Policy No."]||"")+(cur.Healthcare?.["Policy No."]?"-HOSP":"HOSP");
      a.Employment.Type="Medical Leave";
      break;
    case "new_child":
      a.Healthcare.Plan="Family Floater 10L";
      a.Healthcare["Policy No."]=`FAM-${new Date().getFullYear()}-${Math.floor(Math.random()*90000+10000)}`;
      a.Government["Filing Status"]="Individual with Dependent";
      a.Employment.Type="Parental Leave";
      break;
  }
  return a;
};

// ─── FALLBACK TASKS ────────────────────────────────────────────────────────────
const FALLBACK = {
  job_change:(f)=>({
    summary:`You are joining ${f.emp||"a new employer"} as ${f.role||"a new role"}${f.ctc?` at ₹${f.ctc} LPA`:""}. NEXUS will update your employment, EPF/ESIC, group insurance, and income tax records.`,
    affectedDomains:["Employment","Finance","Healthcare","Government","Education"],
    tasks:[
      {id:"t1",domain:"Employment",action:"Register new employer & role",detail:`Update employer to ${f.emp||"new co"}, designation to ${f.role||"new role"}, CTC ₹${f.ctc||"?"} LPA in HRMS`,dataFields:["Employer","Role","CTC / Salary","Since"],dependsOn:[]},
      {id:"t2",domain:"Finance",action:"Update payroll & EPFO account",detail:"Transfer PF to new employer, update CTC and TDS slab via TRACES",dataFields:["Employer on Record","Annual CTC","Tax Slab"],dependsOn:["t1"]},
      {id:"t3",domain:"Healthcare",action:"Enrol in new group insurance",detail:"Register under new employer's group mediclaim, port no-claim bonus if applicable",dataFields:["Insurer","Plan","Policy No."],dependsOn:["t1"]},
      {id:"t4",domain:"Government",action:"Notify income tax & update Form 16",detail:"Update employer TAN in ITR, sync with new Form 16 issuer via TRACES",dataFields:["Filing Status"],dependsOn:["t1"]},
      {id:"t5",domain:"Education",action:"Update alumni employer record",detail:"Update current employer in NAD/DigiLocker alumni credential network",dataFields:["Alumni Employer"],dependsOn:["t1"]},
    ],
  }),
  graduation:(f)=>({
    summary:`Congratulations on completing ${f.deg||"your degree"}${f.spec?" in "+f.spec:""} from ${f.inst||"your institution"}! NEXUS will register your credential with DigiLocker and NAD.`,
    affectedDomains:["Education","Employment","Government"],
    tasks:[
      {id:"t1",domain:"Education",action:"Register credential with NAD & DigiLocker",detail:`Upload ${f.deg||"degree"}${f.spec?" in "+f.spec:""} from ${f.inst||"institution"} to National Academic Depository`,dataFields:["Degree","Institution","Grad Year"],dependsOn:[]},
      {id:"t2",domain:"Employment",action:"Update qualification in HR profile",detail:"Add new degree to HRMS for promotion review and background verification",dataFields:["Role"],dependsOn:["t1"]},
      {id:"t3",domain:"Government",action:"Sync with Ministry of Education registry",detail:"Propagate qualification to Ministry portal, update scholarship eligibility",dataFields:["Filing Status"],dependsOn:["t1"]},
    ],
  }),
  relocation:(f)=>({
    summary:`You are relocating to ${f.city||"a new city"}${f.state?", "+f.state:""}. NEXUS will update Aadhaar, voter ID, bank KYC, insurance region, and HRA records.`,
    affectedDomains:["Government","Healthcare","Finance","Employment"],
    tasks:[
      {id:"t1",domain:"Government",action:"Update Aadhaar & voter ID address",detail:`Change address to ${f.city||""}, ${f.state||"India"} via UIDAI self-service portal`,dataFields:["Address","Voter ID"],dependsOn:[]},
      {id:"t2",domain:"Finance",action:"Update bank KYC address",detail:"Reflect new address in bank KYC for all accounts per RBI compliance",dataFields:["PAN"],dependsOn:["t1"]},
      {id:"t3",domain:"Healthcare",action:"Transfer insurance to new region",detail:"Update health policy hospital network; update TPA details for new city",dataFields:["Plan","Policy No."],dependsOn:["t1"]},
      {id:"t4",domain:"Employment",action:"Update HRA city category",detail:"Update metro/non-metro HRA classification in payroll system",dataFields:["Type"],dependsOn:[]},
    ],
  }),
  hospitalisation:(f)=>({
    summary:`${f.type||"Hospital"} admission${f.hosp?" at "+f.hosp:""}. NEXUS will activate cashless coverage, apply medical leave, and initiate the claim process.`,
    affectedDomains:["Healthcare","Employment","Finance"],
    tasks:[
      {id:"t1",domain:"Healthcare",action:"Activate cashless hospitalisation benefit",detail:`Pre-authorisation for ${f.type||"hospitalisation"} at ${f.hosp||"hospital"}, activate TPA inpatient coverage`,dataFields:["Plan","Policy No."],dependsOn:[]},
      {id:"t2",domain:"Employment",action:"Apply medical leave in HRMS",detail:"Update status to medical leave, trigger sick-leave credit or LOP per policy",dataFields:["Type"],dependsOn:[]},
      {id:"t3",domain:"Finance",action:"Initiate insurance reimbursement",detail:"Submit bills and discharge summary to insurer for reimbursement",dataFields:["Annual CTC"],dependsOn:["t1","t2"]},
    ],
  }),
  new_child:(f)=>({
    summary:`${f.ctype||"New child"}${f.name?" — "+f.name:""}. NEXUS will expand healthcare to family floater, register as tax dependent, apply parental leave, and activate Section 80C benefits.`,
    affectedDomains:["Healthcare","Government","Finance","Employment"],
    tasks:[
      {id:"t1",domain:"Healthcare",action:"Upgrade to family floater plan",detail:`Add ${f.name||"new child"} as dependent, upgrade to family floater (₹10L)`,dataFields:["Plan","Policy No."],dependsOn:[]},
      {id:"t2",domain:"Government",action:"Register dependent in IT portal",detail:"Add child as dependent in IT India portal, update filing status for Section 80C",dataFields:["Filing Status"],dependsOn:[]},
      {id:"t3",domain:"Finance",action:"Apply child tax benefits & PPF",detail:"Activate Section 80C for child education savings, apply child-care allowance",dataFields:["Tax Slab","Annual CTC"],dependsOn:["t2"]},
      {id:"t4",domain:"Employment",action:"Submit parental leave request",detail:"Apply parental leave per Maternity Benefit Act 2017 (26 weeks), update HRMS",dataFields:["Type"],dependsOn:[]},
    ],
  }),
};

// ─── UTILS ────────────────────────────────────────────────────────────────────
const sleep    = ms => new Promise(r=>setTimeout(r,ms));
const genToken = d  => `NXS·${d.slice(0,3).toUpperCase()}·${Math.random().toString(36).substring(2,10).toUpperCase()}`;

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
const iSt = { width:"100%", padding:"10px 13px", border:`1.5px solid ${C.border}`, borderRadius:8, fontFamily:C.sans, fontSize:14, color:C.text, background:"#FFFEF5", outline:"none", transition:"border 0.2s" };
const sSt = { ...iSt, cursor:"pointer", appearance:"none", WebkitAppearance:"none" };
const bPrim = (x={}) => ({ padding:"11px 26px", background:C.forest, border:"none", borderRadius:10, color:C.bg, fontFamily:C.display, fontSize:14, fontWeight:700, cursor:"pointer", transition:"opacity 0.2s, transform 0.15s", boxShadow:`0 4px 16px ${C.forest}28`, ...x });
const bSec  = (x={}) => ({ padding:"11px 22px", background:"transparent", border:`1.5px solid ${C.borderMed}`, borderRadius:10, color:C.muted, fontFamily:C.display, fontSize:13, fontWeight:600, cursor:"pointer", transition:"all 0.2s", ...x });
const bGhost= (x={}) => ({ padding:"9px 18px", background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, fontFamily:C.sans, fontSize:13, cursor:"pointer", transition:"all 0.2s", display:"flex", alignItems:"center", gap:6, ...x });

function Label({ text, required }) {
  return <label style={{ display:"block", fontFamily:C.sans, fontSize:12, fontWeight:600, color:C.muted, marginBottom:6, letterSpacing:"0.03em" }}>{text}{required&&<span style={{color:C.error}}> *</span>}</label>;
}
function Field({ label, required, children }) {
  return <div style={{ marginBottom:16 }}><Label text={label} required={required}/>{children}</div>;
}
function Inp({ fkey, val, onChange, placeholder, type="text" }) {
  return <input style={iSt} type={type} placeholder={placeholder} value={val||""} onChange={e=>onChange(fkey,e.target.value)}/>;
}
function Sel({ fkey, val, onChange, options, placeholder="Select…" }) {
  return (
    <div style={{ position:"relative" }}>
      <select style={sSt} value={val||""} onChange={e=>onChange(fkey,e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
      <div style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:C.muted, fontSize:11 }}>▼</div>
    </div>
  );
}
function ErrMsg({ msg }) {
  if(!msg) return null;
  return <div style={{ padding:"10px 14px", background:"#FFF0F0", border:`1px solid ${C.error}35`, borderRadius:8, fontFamily:C.sans, fontSize:13, color:C.error, marginBottom:14 }}>{msg}</div>;
}
function BackBtn({ onClick, label="← Back" }) {
  return (
    <button onClick={onClick} style={bGhost()}>
      <span style={{ fontSize:14 }}>←</span> {label}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// AUTH SCREEN
// ════════════════════════════════════════════════════════════════════
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [f,    setF]    = useState({});
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const handleLogin = async () => {
    if(!f.email||!f.pass){setErr("Please fill all fields.");return;}
    setBusy(true); setErr("");
    const u = await loadUser(f.email);
    if(!u){setErr("No account found. Please register first.");setBusy(false);return;}
    if(u.pass!==f.pass){setErr("Incorrect password. Please try again.");setBusy(false);return;}
    const doms = await loadDomains(f.email);
    const hist = await loadHistory(f.email)||[];
    setBusy(false);
    onLogin({...u,uid:sk(f.email)}, doms, hist, !doms);
  };

  const handleRegister = async () => {
    if(!f.name||!f.email||!f.pass||!f.phone){setErr("Please fill all required fields.");return;}
    if(f.pass.length<6){setErr("Password must be at least 6 characters.");return;}
    setBusy(true); setErr("");
    const existing = await loadUser(f.email);
    if(existing){setErr("An account already exists with this email.");setBusy(false);return;}
    const user = {...f, uid:sk(f.email)};
    await saveUser(f.email, user);
    await saveHistory(f.email, []);
    setBusy(false);
    onLogin(user, null, [], true); // null domains = trigger domain setup
  };

  const isEmp = f.occ==="Salaried / Employed";
  const isStu = f.occ==="Student"||f.occ==="Fresher / Job Seeker";

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", overflow:"hidden" }}>
      {/* Left brand strip */}
      <div style={{ width:"38%", minWidth:340, background:C.forest, display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"56px 52px 48px" }}>
        <div>
          <div style={{ fontFamily:C.display, fontWeight:800, fontSize:38, color:C.bg, letterSpacing:"0.06em", marginBottom:8 }}>NEXUS</div>
          <div style={{ width:44, height:3, background:C.caramel, borderRadius:2, marginBottom:28 }}/>
          <div style={{ fontFamily:C.sans, fontSize:15, color:`${C.bg}CC`, lineHeight:1.85, marginBottom:40 }}>
            India's AI-powered Life Orchestration Engine. When life changes, NEXUS automatically syncs your records across every connected system — with your consent at every step.
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[["💼","Employment, EPFO & Payroll"],["🏦","PAN, TDS & Banking (KYC)"],["🏥","Insurance, TPA & Claims"],["🏛️","Aadhaar, Voter ID & ITR"],["🎓","DigiLocker, NAD & Degrees"]].map(([ic,lbl])=>(
              <div key={lbl} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:`${C.bg}10`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>{ic}</div>
                <span style={{ fontFamily:C.sans, fontSize:13, color:`${C.bg}99` }}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontFamily:C.sans, fontSize:12, color:`${C.bg}44` }}>Demo · Data stored in browser session</div>
      </div>

      {/* Right form area */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 32px", overflowY:"auto" }}>
        <div style={{ width:"100%", maxWidth:480 }}>
          {/* tabs */}
          <div style={{ display:"flex", background:C.surface, borderRadius:12, padding:4, marginBottom:30 }}>
            {[["login","Sign In"],["register","Create Account"]].map(([m,l])=>(
              <button key={m} onClick={()=>{setMode(m);setF({});setErr("");}} style={{ flex:1, padding:"10px 0", border:"none", borderRadius:9, background:mode===m?C.card:"transparent", color:mode===m?C.forest:C.dim, fontFamily:C.display, fontSize:13, fontWeight:mode===m?700:500, cursor:"pointer", boxShadow:mode===m?"0 1px 8px rgba(40,54,24,0.12)":"none", transition:"all 0.2s" }}>{l}</button>
            ))}
          </div>

          <div style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:18, padding:"32px 36px", boxShadow:"0 6px 40px rgba(40,54,24,0.09)" }}>
            {mode==="login" ? (
              <>
                <div style={{ marginBottom:26 }}>
                  <h2 style={{ fontFamily:C.display, fontSize:24, fontWeight:800, color:C.forest, marginBottom:5 }}>Welcome back</h2>
                  <p style={{ fontFamily:C.sans, fontSize:14, color:C.muted }}>Sign in to your NEXUS account</p>
                </div>
                <Field label="Email Address" required><Inp fkey="email" val={f.email} onChange={set} placeholder="you@email.com" type="email"/></Field>
                <Field label="Password" required><Inp fkey="pass" val={f.pass} onChange={set} placeholder="Your password" type="password"/></Field>
              </>
            ) : (
              <>
                <div style={{ marginBottom:24 }}>
                  <h2 style={{ fontFamily:C.display, fontSize:24, fontWeight:800, color:C.forest, marginBottom:5 }}>Create your account</h2>
                  <p style={{ fontFamily:C.sans, fontSize:14, color:C.muted }}>Basic info first — you'll fill domain details after</p>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <Field label="Full Name (as per Aadhaar)" required>
                    <Inp fkey="name" val={f.name} onChange={set} placeholder="e.g. Priya Sharma"/>
                  </Field>
                  <Field label="Mobile Number" required>
                    <Inp fkey="phone" val={f.phone} onChange={set} placeholder="+91 98765 43210"/>
                  </Field>
                </div>
                <Field label="Email Address" required><Inp fkey="email" val={f.email} onChange={set} placeholder="you@email.com" type="email"/></Field>
                <Field label="Password" required><Inp fkey="pass" val={f.pass} onChange={set} placeholder="Min. 6 characters" type="password"/></Field>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <Field label="City"><Sel fkey="city" val={f.city} onChange={set} options={CITIES}/></Field>
                  <Field label="State"><Sel fkey="state" val={f.state} onChange={set} options={STATES}/></Field>
                </div>
                <Field label="Current Occupation">
                  <Sel fkey="occ" val={f.occ} onChange={set} options={OCC_OPTIONS}/>
                </Field>

                {/* Quick occupation fields — clearly visible */}
                {(isEmp||isStu) && (
                  <div style={{ borderRadius:12, border:`1.5px solid ${C.caramel}55`, background:`${C.caramel}09`, padding:"18px 18px 6px", marginBottom:16 }}>
                    <div style={{ fontFamily:C.sans, fontSize:12, fontWeight:700, color:C.copper, marginBottom:14, display:"flex", alignItems:"center", gap:7 }}>
                      <span style={{ fontSize:14 }}>{isEmp?"💼":"🎓"}</span>
                      {isEmp ? "Quick Employment Info" : "Quick Education Info"}
                      <span style={{ fontFamily:C.sans, fontSize:11, color:C.dim, fontWeight:400 }}>(you can complete this later)</span>
                    </div>
                    {isEmp && (
                      <>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                          <Field label="Current Employer"><Inp fkey="employer" val={f.employer} onChange={set} placeholder="e.g. TCS, Infosys"/></Field>
                          <Field label="Designation"><Inp fkey="role" val={f.role} onChange={set} placeholder="e.g. SDE-2"/></Field>
                        </div>
                        <Field label="Current CTC (₹ LPA)"><Inp fkey="ctc" val={f.ctc} onChange={set} placeholder="e.g. 12" type="number"/></Field>
                      </>
                    )}
                    {isStu && (
                      <>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                          <Field label="Degree"><Sel fkey="degree" val={f.degree} onChange={set} options={DEGREES}/></Field>
                          <Field label="Year of Passing"><Inp fkey="gradYear" val={f.gradYear} onChange={set} placeholder={new Date().getFullYear().toString()} type="number"/></Field>
                        </div>
                        <Field label="University / Institution"><Inp fkey="inst" val={f.inst} onChange={set} placeholder="e.g. IIT Bombay, VTU"/></Field>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            <ErrMsg msg={err}/>
            <button onClick={mode==="login"?handleLogin:handleRegister} disabled={busy} style={bPrim({width:"100%",marginTop:4,opacity:busy?0.7:1,padding:"13px 0"})}>
              {busy ? "Please wait…" : mode==="login" ? "Sign In to NEXUS" : "Create Account & Set Up Profile →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// DOMAIN SETUP SCREEN (shown after first login / register)
// ════════════════════════════════════════════════════════════════════
function DomainSetupScreen({ user, existingDomains, onComplete }) {
  const occ      = user.occ||"";
  const primary  = PRIMARY_DOMAINS[occ]||["Education"];
  const [expanded,  setExpanded]  = useState(primary);
  const [domForms,  setDomForms]  = useState({});
  const [busy,      setBusy]      = useState(false);

  const setField = (dom,k,v) => setDomForms(p=>({...p,[dom]:{...(p[dom]||{}),[k]:v}}));

  const handleSave = async () => {
    setBusy(true);
    const doms = buildInitDomains(user, domForms);
    await saveDomains(user.email, doms);
    onComplete(doms);
  };

  const toggleExpand = dom => setExpanded(p => p.includes(dom) ? p.filter(d=>d!==dom) : [...p,dom]);

  return (
    <div style={{ minHeight:"100vh", background:C.bg }}>
      <div style={{ padding:"32px 40px 20px", borderBottom:`1px solid ${C.border}`, background:"rgba(254,250,224,0.95)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontFamily:C.display, fontWeight:800, fontSize:22, color:C.forest, marginBottom:3 }}>NEXUS</div>
          <div style={{ fontFamily:C.sans, fontSize:12, color:C.muted }}>Profile Setup</div>
        </div>
        <div style={{ padding:"7px 16px", background:`${C.caramel}18`, border:`1px solid ${C.caramel}40`, borderRadius:20, fontFamily:C.sans, fontSize:12, color:C.copper }}>
          Step 2 of 2 — Domain Details
        </div>
      </div>

      <div style={{ maxWidth:860, margin:"0 auto", padding:"40px 40px 60px" }}>
        <div style={{ marginBottom:36 }}>
          <h1 style={{ fontFamily:C.display, fontSize:28, fontWeight:800, color:C.forest, marginBottom:10 }}>
            Set up your domain profile, {user.name?.split(" ")[0]}
          </h1>
          <p style={{ fontFamily:C.sans, fontSize:15, color:C.muted, lineHeight:1.7, maxWidth:600 }}>
            Based on your occupation ({occ||"—"}), we've highlighted the relevant domains. Fill what you know now — you can always update later from your profile.
          </p>
        </div>

        {/* Legend */}
        <div style={{ display:"flex", gap:16, marginBottom:28 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:C.copper }}/>
            <span style={{ fontFamily:C.sans, fontSize:12, color:C.muted }}>Recommended for you</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:C.border }}/>
            <span style={{ fontFamily:C.sans, fontSize:12, color:C.muted }}>Optional — fill anytime</span>
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {DOMAIN_ORDER.map(dom=>{
            const m       = DM[dom];
            const isPrim  = primary.includes(dom);
            const isOpen  = expanded.includes(dom);
            const df      = domForms[dom]||{};
            const setF    = (k,v) => setField(dom,k,v);
            const filled  = Object.values(df).some(v=>v);

            return (
              <div key={dom} style={{ background:C.card, border:`1.5px solid ${isOpen&&isPrim?m.color+"50":isOpen?C.borderMed:C.border}`, borderRadius:14, overflow:"hidden", transition:"all 0.3s", boxShadow:isOpen?"0 3px 20px rgba(40,54,24,0.07)":"none" }}>
                {/* Domain header */}
                <button onClick={()=>toggleExpand(dom)} style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"16px 22px", background:isOpen?`${m.color}06`:C.card, border:"none", cursor:"pointer", textAlign:"left", transition:"background 0.2s" }}>
                  <div style={{ width:40, height:40, borderRadius:11, background:`${m.color}12`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{m.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                      <span style={{ fontFamily:C.display, fontSize:15, fontWeight:700, color:isOpen?m.color:C.forest }}>{dom}</span>
                      {isPrim && <span style={{ fontFamily:C.sans, fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20, background:`${C.copper}15`, color:C.copper, border:`1px solid ${C.copper}30` }}>Recommended</span>}
                      {filled && <span style={{ fontFamily:C.sans, fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20, background:`${C.success}12`, color:C.success }}>✓ Filled</span>}
                    </div>
                    <div style={{ fontFamily:C.sans, fontSize:12, color:C.dim, marginTop:2 }}>
                      {{ Employment:"Employer, role, CTC, employment type", Finance:"Bank, PAN, tax slab, payroll details", Healthcare:"Insurance provider, plan, policy number", Government:"Aadhaar, PAN, address, voter ID", Education:"Degree, institution, year of passing" }[dom]}
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:C.muted, transform:isOpen?"rotate(180deg)":"none", transition:"transform 0.3s", flexShrink:0 }}>▼</div>
                </button>

                {/* Domain form */}
                {isOpen && (
                  <div style={{ padding:"22px 24px 18px", borderTop:`1px solid ${C.border}` }}>
                    {dom==="Employment" && (
                      <>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                          <Field label="Employer Name"><Inp fkey="Employer" val={df.Employer} onChange={setF} placeholder={occ==="Self-employed / Business"?"Your business name":"e.g. TCS, Wipro, Infosys"}/></Field>
                          <Field label="Designation / Role"><Inp fkey="Role" val={df.Role} onChange={setF} placeholder="e.g. Software Engineer"/></Field>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
                          <Field label="CTC / Salary (₹ LPA)"><Inp fkey="CTC / Salary" val={df["CTC / Salary"]} onChange={setF} placeholder="e.g. 12" type="number"/></Field>
                          <Field label="Employment Type"><Sel fkey="Type" val={df.Type} onChange={setF} options={["Full-time","Contract","Consultant","Part-time","Self-employed"]}/></Field>
                          <Field label="Working Since"><Inp fkey="Since" val={df.Since} onChange={setF} placeholder="e.g. Jan 2023" type="month"/></Field>
                        </div>
                      </>
                    )}
                    {dom==="Finance" && (
                      <>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                          <Field label="Primary Bank"><Sel fkey="Bank" val={df.Bank} onChange={setF} options={BANKS}/></Field>
                          <Field label="PAN Number"><Inp fkey="PAN" val={df.PAN} onChange={setF} placeholder="e.g. ABCDE1234F"/></Field>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                          <Field label="Tax Slab"><Sel fkey="Tax Slab" val={df["Tax Slab"]} onChange={setF} options={["5% (up to ₹10L)","20% (₹10L–₹15L)","30% (above ₹15L)","NIL (below ₹7L)"]}/></Field>
                          <Field label="Annual CTC (₹ LPA)"><Inp fkey="Annual CTC" val={df["Annual CTC"]} onChange={setF} placeholder="e.g. 12" type="number"/></Field>
                        </div>
                      </>
                    )}
                    {dom==="Healthcare" && (
                      <>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                          <Field label="Insurance Provider"><Sel fkey="Insurer" val={df.Insurer} onChange={setF} options={INSURERS}/></Field>
                          <Field label="Plan Type"><Sel fkey="Plan" val={df.Plan} onChange={setF} options={["Individual","Family Floater","Group (Employer)","Senior Citizen","Critical Illness"]}/></Field>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                          <Field label="Policy Number"><Inp fkey="Policy No." val={df["Policy No."]} onChange={setF} placeholder="e.g. HL-2024-12345"/></Field>
                          <Field label="Insured Under Employer?"><Sel fkey="Employer" val={df.Employer} onChange={setF} options={["Yes — current employer","No — self-purchased","Other"]}/></Field>
                        </div>
                      </>
                    )}
                    {dom==="Government" && (
                      <>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                          <Field label="Aadhaar Number"><Inp fkey="Aadhaar" val={df.Aadhaar} onChange={setF} placeholder="XXXX-XXXX-XXXX"/></Field>
                          <Field label="PAN Number"><Inp fkey="PAN" val={df.PAN} onChange={setF} placeholder="e.g. ABCDE1234F"/></Field>
                        </div>
                        <Field label="Residential Address"><Inp fkey="Address" val={df.Address} onChange={setF} placeholder="Flat / Area / City / Pincode"/></Field>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                          <Field label="ITR Filing Status"><Sel fkey="Filing Status" val={df["Filing Status"]} onChange={setF} options={["Individual","Individual with Dependent","Senior Citizen","HUF","Not Filing"]}/></Field>
                          <Field label="Voter ID"><Inp fkey="Voter ID" val={df["Voter ID"]} onChange={setF} placeholder="e.g. ABC1234567"/></Field>
                        </div>
                      </>
                    )}
                    {dom==="Education" && (
                      <>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                          <Field label="Highest Degree"><Sel fkey="Degree" val={df.Degree} onChange={setF} options={DEGREES}/></Field>
                          <Field label="Year of Passing"><Inp fkey="Grad Year" val={df["Grad Year"]} onChange={setF} placeholder={new Date().getFullYear().toString()} type="number"/></Field>
                        </div>
                        <Field label="University / Institution"><Inp fkey="Institution" val={df.Institution} onChange={setF} placeholder="e.g. IIT Bombay, Pune University, VTU"/></Field>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                          <Field label="CGPA / Percentage"><Inp fkey="CGPA" val={df.CGPA} onChange={setF} placeholder="e.g. 8.5 / 82%"/></Field>
                          <Field label="Current / Last Employer"><Inp fkey="Alumni Employer" val={df["Alumni Employer"]} onChange={setF} placeholder="e.g. TCS (or — if fresher)"/></Field>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:32 }}>
          <span style={{ fontFamily:C.sans, fontSize:13, color:C.dim }}>You can update any domain later from your profile</span>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>onComplete(buildInitDomains(user,{}))} style={bSec({padding:"11px 22px"})}>Skip for now</button>
            <button onClick={handleSave} disabled={busy} style={bPrim({opacity:busy?0.7:1})}>
              {busy?"Saving…":"Save & Go to Dashboard →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// HEADER
// ════════════════════════════════════════════════════════════════════
const STEPS=["Event","Details","Analysis","Consent","Sync","Done"];
const SM={dashboard:0,eventform:1,loading:2,tasks:2,consent:3,execution:4,confirmation:5};

function Header({ screen, user, onProfile, onLogout, onEditDomains }) {
  const step = SM[screen]??0;
  return (
    <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 44px", height:60, borderBottom:`1px solid ${C.border}`, background:"rgba(254,250,224,0.97)", backdropFilter:"blur(18px)", position:"sticky", top:0, zIndex:100 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ fontFamily:C.display, fontWeight:800, fontSize:19, color:C.forest, letterSpacing:"0.05em" }}>NEXUS</div>
        <div style={{ width:1, height:14, background:C.muted, opacity:0.2 }}/>
        <div style={{ fontFamily:C.sans, fontSize:13, color:C.muted }}>India</div>
      </div>

      {screen!=="dashboard" ? (
        <div style={{ display:"flex", alignItems:"center", gap:2 }}>
          {STEPS.map((s,i)=>(
            <div key={s} style={{ display:"flex", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:20, background:i===step?`${C.olive}14`:"transparent", transition:"all 0.3s" }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:i<step?C.success:i===step?C.olive:C.border, boxShadow:i===step?`0 0 6px ${C.olive}`:"none", transition:"all 0.3s", flexShrink:0 }}/>
                <span style={{ fontFamily:C.sans, fontSize:11, fontWeight:i===step?600:400, color:i===step?C.forest:i<step?C.success:C.dim }}>{s}</span>
              </div>
              {i<STEPS.length-1 && <div style={{ width:12, height:1, background:i<step?C.success:C.border, transition:"all 0.4s" }}/>}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:C.olive, boxShadow:`0 0 7px ${C.olive}` }}/>
          <span style={{ fontFamily:C.sans, fontSize:12, color:C.muted }}>System active · India</span>
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {screen==="dashboard" && (
          <button onClick={onEditDomains} style={bGhost({padding:"7px 14px",fontSize:12})}>
            <span style={{ fontSize:13 }}>✏️</span> Edit Domains
          </button>
        )}
        <button onClick={onProfile} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 13px 5px 6px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:30, cursor:"pointer", transition:"all 0.2s" }}>
          <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${C.olive},${C.forest})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:C.bg, fontFamily:C.display, fontWeight:700 }}>{user?.name?.charAt(0)||"U"}</div>
          <span style={{ fontFamily:C.sans, fontSize:14, fontWeight:600, color:C.forest }}>{user?.name?.split(" ")[0]||"User"}</span>
        </button>
        <button onClick={onLogout} style={{ padding:"6px 12px", background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontFamily:C.sans, fontSize:12, color:C.muted }}>Sign Out</button>
      </div>
    </header>
  );
}

// ════════════════════════════════════════════════════════════════════
// PROFILE MODAL
// ════════════════════════════════════════════════════════════════════
function ProfileModal({ user, domains, history, onClose, onSave, onEditDomains }) {
  const [tab, setTab]   = useState("info");
  const [edit, setEdit] = useState(false);
  const [f, setF]       = useState({name:user.name||"",phone:user.phone||"",city:user.city||"",state:user.state||""});
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const handleSave = async () => {
    const u = {...user,...f};
    await saveUser(user.email, u);
    onSave(u); setEdit(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(40,54,24,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:"100%", maxWidth:540, maxHeight:"90vh", overflowY:"auto", background:C.card, border:`1.5px solid ${C.border}`, borderRadius:20, boxShadow:"0 16px 60px rgba(40,54,24,0.2)", animation:"fadeUp 0.3s ease" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:13 }}>
            <div style={{ width:46, height:46, borderRadius:"50%", background:`linear-gradient(135deg,${C.olive},${C.forest})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, color:C.bg, fontFamily:C.display, fontWeight:800 }}>{user.name?.charAt(0)||"U"}</div>
            <div>
              <div style={{ fontFamily:C.display, fontSize:16, fontWeight:700, color:C.forest }}>{user.name}</div>
              <div style={{ fontFamily:C.sans, fontSize:12, color:C.muted }}>{user.email} · {user.occ||"—"}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:"50%", border:`1px solid ${C.border}`, background:C.surface, cursor:"pointer", fontSize:13, color:C.muted }}>✕</button>
        </div>
        <div style={{ display:"flex", borderBottom:`1px solid ${C.border}` }}>
          {[["info","My Info"],["domains","Domains"],["history","History"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:"11px 0", border:"none", background:"transparent", borderBottom:`2px solid ${tab===t?C.olive:"transparent"}`, color:tab===t?C.forest:C.muted, fontFamily:C.display, fontSize:12, fontWeight:tab===t?700:400, cursor:"pointer", transition:"all 0.2s" }}>{l}</button>
          ))}
        </div>
        <div style={{ padding:"20px 24px" }}>
          {tab==="info" && (!edit ? (
            <>
              {[["Full Name",user.name],["Email",user.email],["Mobile",user.phone||"—"],["City",user.city||"—"],["State",user.state||"—"],["Occupation",user.occ||"—"]].map(([k,v])=>(
                <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ fontFamily:C.sans, fontSize:13, color:C.muted }}>{k}</span>
                  <span style={{ fontFamily:C.sans, fontSize:13, color:C.forest, fontWeight:500 }}>{v}</span>
                </div>
              ))}
              <div style={{ display:"flex", gap:9, marginTop:18 }}>
                <button onClick={()=>setEdit(true)} style={bPrim({padding:"9px 20px",fontSize:13})}>Edit Info</button>
                <button onClick={()=>{onClose();onEditDomains();}} style={bSec({padding:"9px 20px",fontSize:13})}>Edit Domains</button>
              </div>
            </>
          ):(
            <>
              <Field label="Full Name" required><Inp fkey="name" val={f.name} onChange={set} placeholder="Full name"/></Field>
              <Field label="Mobile"><Inp fkey="phone" val={f.phone} onChange={set} placeholder="+91 XXXXX XXXXX"/></Field>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Field label="City"><Sel fkey="city" val={f.city} onChange={set} options={CITIES}/></Field>
                <Field label="State"><Sel fkey="state" val={f.state} onChange={set} options={STATES}/></Field>
              </div>
              <div style={{ display:"flex", gap:9 }}>
                <button onClick={handleSave} style={bPrim({padding:"9px 18px",fontSize:13})}>Save Changes</button>
                <button onClick={()=>setEdit(false)} style={bSec({padding:"9px 18px",fontSize:13})}>Cancel</button>
              </div>
            </>
          ))}
          {tab==="domains" && (
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {Object.entries(domains||{}).map(([dom,data])=>{
                const m=DM[dom]||{icon:"●",color:C.olive};
                return (
                  <div key={dom} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:`${m.color}08`, borderBottom:`1px solid ${C.border}` }}>
                      <span style={{ fontSize:15 }}>{m.icon}</span>
                      <span style={{ fontFamily:C.display, fontSize:13, fontWeight:700, color:m.color }}>{dom}</span>
                    </div>
                    <div style={{ padding:"10px 14px" }}>
                      {Object.entries(data).map(([k,v])=>(
                        <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${C.border}` }}>
                          <span style={{ fontFamily:C.sans, fontSize:12, color:C.muted }}>{k}</span>
                          <span style={{ fontFamily:C.mono, fontSize:11, color:v&&v!=="—"?C.forest:C.dim }}>{v||"—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <button onClick={()=>{onClose();onEditDomains();}} style={bPrim({marginTop:4,padding:"10px 20px",fontSize:13})}>✏️ Edit Domain Details</button>
            </div>
          )}
          {tab==="history" && (
            !history?.length ? (
              <div style={{ textAlign:"center", padding:"36px 0", fontFamily:C.sans, fontSize:14, color:C.dim }}>No life events processed yet.</div>
            ):(
              <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                {[...history].reverse().map((ev,i)=>{
                  const meta=EVENTS.find(e=>e.id===ev.id)||{icon:"●",color:C.olive,label:ev.id};
                  return (
                    <div key={i} style={{ padding:"13px 15px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:16 }}>{meta.icon}</span>
                        <span style={{ fontFamily:C.display, fontSize:14, fontWeight:700, color:meta.color }}>{meta.label}</span>
                        <span style={{ marginLeft:"auto", fontFamily:C.mono, fontSize:10, color:C.dim }}>{ev.date}</span>
                      </div>
                      <div style={{ fontFamily:C.sans, fontSize:12, color:C.muted }}>{ev.domains?.join(", ")||"—"} synced</div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// EDIT DOMAINS SCREEN (accessible from header button or profile)
// ════════════════════════════════════════════════════════════════════
function EditDomainsScreen({ user, domains, onSave, onBack }) {
  const [expanded,  setExpanded]  = useState([]);
  const [domForms,  setDomForms]  = useState(
    Object.fromEntries(Object.entries(domains||{}).map(([k,v])=>[k,{...v}]))
  );
  const [busy, setBusy]   = useState(false);
  const [saved, setSaved] = useState(false);

  const setField = (dom,k,v) => setDomForms(p=>({...p,[dom]:{...(p[dom]||{}),[k]:v}}));
  const toggleExpand = dom => setExpanded(p=>p.includes(dom)?p.filter(d=>d!==dom):[...p,dom]);

  const handleSave = async () => {
    setBusy(true);
    await saveDomains(user.email, domForms);
    setSaved(true); setBusy(false);
    setTimeout(()=>{ onSave(domForms); },700);
  };

  return (
    <div style={{ padding:"36px 44px 60px", maxWidth:860, margin:"0 auto", animation:"fadeUp 0.4s ease" }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:28 }}>
        <BackBtn onClick={onBack} label="Back to Dashboard"/>
        <div style={{ flex:1 }}>
          <h2 style={{ fontFamily:C.display, fontSize:24, fontWeight:800, color:C.forest }}>Edit Domain Details</h2>
          <p style={{ fontFamily:C.sans, fontSize:13, color:C.muted, marginTop:4 }}>Expand any domain to update its fields. Changes are saved to your profile.</p>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
        {DOMAIN_ORDER.map(dom=>{
          const m      = DM[dom];
          const isOpen = expanded.includes(dom);
          const df     = domForms[dom]||{};
          const setF   = (k,v) => setField(dom,k,v);
          const filled = Object.values(df).some(v=>v&&v!=="—"&&v!=="");

          return (
            <div key={dom} style={{ background:C.card, border:`1.5px solid ${isOpen?m.color+"45":C.border}`, borderRadius:14, overflow:"hidden", transition:"all 0.3s", boxShadow:isOpen?"0 3px 20px rgba(40,54,24,0.07)":"none" }}>
              <button onClick={()=>toggleExpand(dom)} style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"16px 22px", background:isOpen?`${m.color}06`:C.card, border:"none", cursor:"pointer", textAlign:"left" }}>
                <div style={{ width:40, height:40, borderRadius:11, background:`${m.color}12`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{m.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                    <span style={{ fontFamily:C.display, fontSize:15, fontWeight:700, color:isOpen?m.color:C.forest }}>{dom}</span>
                    {filled && <span style={{ fontFamily:C.sans, fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20, background:`${C.success}12`, color:C.success }}>✓ Has data</span>}
                  </div>
                  <div style={{ fontFamily:C.sans, fontSize:12, color:C.dim, marginTop:2 }}>
                    {Object.entries(df).filter(([,v])=>v&&v!=="—").slice(0,3).map(([k,v])=>`${k}: ${v}`).join("  ·  ") || "No data yet — click to add"}
                  </div>
                </div>
                <div style={{ fontSize:11, color:C.muted, transform:isOpen?"rotate(180deg)":"none", transition:"transform 0.3s", flexShrink:0 }}>▼</div>
              </button>

              {isOpen && (
                <div style={{ padding:"22px 24px 18px", borderTop:`1px solid ${C.border}` }}>
                  {dom==="Employment" && (
                    <>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                        <Field label="Employer Name"><Inp fkey="Employer" val={df.Employer} onChange={setF} placeholder="e.g. TCS, Wipro"/></Field>
                        <Field label="Designation"><Inp fkey="Role" val={df.Role} onChange={setF} placeholder="e.g. SDE-2"/></Field>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
                        <Field label="CTC / Salary (₹ LPA)"><Inp fkey="CTC / Salary" val={df["CTC / Salary"]} onChange={setF} placeholder="e.g. 12"/></Field>
                        <Field label="Employment Type"><Sel fkey="Type" val={df.Type} onChange={setF} options={["Full-time","Contract","Consultant","Part-time","Self-employed"]}/></Field>
                        <Field label="Working Since"><Inp fkey="Since" val={df.Since} onChange={setF} placeholder="e.g. Jan 2023" type="month"/></Field>
                      </div>
                    </>
                  )}
                  {dom==="Finance" && (
                    <>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                        <Field label="Primary Bank"><Sel fkey="Bank" val={df.Bank} onChange={setF} options={BANKS}/></Field>
                        <Field label="PAN Number"><Inp fkey="PAN" val={df.PAN} onChange={setF} placeholder="e.g. ABCDE1234F"/></Field>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                        <Field label="Tax Slab"><Sel fkey="Tax Slab" val={df["Tax Slab"]} onChange={setF} options={["5% (up to ₹10L)","20% (₹10L–₹15L)","30% (above ₹15L)","NIL (below ₹7L)"]}/></Field>
                        <Field label="Annual CTC (₹ LPA)"><Inp fkey="Annual CTC" val={df["Annual CTC"]} onChange={setF} placeholder="e.g. 12"/></Field>
                      </div>
                    </>
                  )}
                  {dom==="Healthcare" && (
                    <>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                        <Field label="Insurance Provider"><Sel fkey="Insurer" val={df.Insurer} onChange={setF} options={INSURERS}/></Field>
                        <Field label="Plan Type"><Sel fkey="Plan" val={df.Plan} onChange={setF} options={["Individual","Family Floater","Group (Employer)","Senior Citizen","Critical Illness"]}/></Field>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                        <Field label="Policy Number"><Inp fkey="Policy No." val={df["Policy No."]} onChange={setF} placeholder="e.g. HL-2024-12345"/></Field>
                        <Field label="Insured by"><Inp fkey="Employer" val={df.Employer} onChange={setF} placeholder="Employer name / Self"/></Field>
                      </div>
                    </>
                  )}
                  {dom==="Government" && (
                    <>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                        <Field label="Aadhaar Number"><Inp fkey="Aadhaar" val={df.Aadhaar} onChange={setF} placeholder="XXXX-XXXX-XXXX"/></Field>
                        <Field label="PAN Number"><Inp fkey="PAN" val={df.PAN} onChange={setF} placeholder="e.g. ABCDE1234F"/></Field>
                      </div>
                      <Field label="Residential Address"><Inp fkey="Address" val={df.Address} onChange={setF} placeholder="Flat / Area / City / Pincode"/></Field>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                        <Field label="ITR Filing Status"><Sel fkey="Filing Status" val={df["Filing Status"]} onChange={setF} options={["Individual","Individual with Dependent","Senior Citizen","HUF","Not Filing"]}/></Field>
                        <Field label="Voter ID"><Inp fkey="Voter ID" val={df["Voter ID"]} onChange={setF} placeholder="e.g. ABC1234567"/></Field>
                      </div>
                    </>
                  )}
                  {dom==="Education" && (
                    <>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                        <Field label="Highest Degree"><Sel fkey="Degree" val={df.Degree} onChange={setF} options={DEGREES}/></Field>
                        <Field label="Year of Passing"><Inp fkey="Grad Year" val={df["Grad Year"]} onChange={setF} placeholder={new Date().getFullYear().toString()} type="number"/></Field>
                      </div>
                      <Field label="University / Institution"><Inp fkey="Institution" val={df.Institution} onChange={setF} placeholder="e.g. IIT Bombay, Pune University"/></Field>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                        <Field label="CGPA / Percentage"><Inp fkey="CGPA" val={df.CGPA} onChange={setF} placeholder="e.g. 8.5 / 82%"/></Field>
                        <Field label="Current / Last Employer"><Inp fkey="Alumni Employer" val={df["Alumni Employer"]} onChange={setF} placeholder="e.g. TCS"/></Field>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:28 }}>
        <button onClick={onBack} style={bSec()}>Cancel</button>
        <button onClick={handleSave} disabled={busy} style={bPrim({opacity:busy||saved?0.75:1})}>
          {saved?"✓ Saved!":(busy?"Saving…":"Save Domain Details")}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════════
const DOMAIN_ADAPTERS = {
  Healthcare: { std:"HL7 FHIR R4",          icon:"H", color:"#B52828", bg:"#FFF0F0" },
  Finance:    { std:"Open Banking PSD2",     icon:"F", color:"#1A6B45", bg:"#F0FFF5" },
  Education:  { std:"xAPI / IMS Global",    icon:"E", color:"#8B6914", bg:"#FFF8E6" },
  Employment: { std:"HR-XML API",            icon:"B", color:C.olive,   bg:"#F0F4E8" },
  Government: { std:"eGov REST / DigiLocker",icon:"G", color:C.copper,  bg:"#FFF5EC" },
};

const EVENT_ACTIONS = {
  job_change:      ["Updates HRMS & EPFO","Recalculates TDS slab","Ports group insurance","Notifies IT dept","Updates DigiLocker"],
  graduation:      ["Registers degree on NAD","Syncs DigiLocker credential","Updates alumni network","Notifies employer HR"],
  relocation:      ["Updates Aadhaar address","Transfers bank KYC","Shifts insurance TPA","Updates HRA slab"],
  hospitalisation: ["Activates cashless TPA","Applies medical leave","Initiates claim process"],
  new_child:       ["Upgrades to family floater","Adds IT dependent","Activates Section 80C","Triggers parental leave"],
};

function AddEventModal({ onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(40,54,24,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:20 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:18, padding:"36px 40px", maxWidth:420, width:"100%", boxShadow:"0 20px 60px rgba(40,54,24,0.22)", animation:"fadeUp 0.25s ease" }}>
        <div style={{ fontSize:36, marginBottom:14, textAlign:"center" }}>➕</div>
        <h3 style={{ fontFamily:C.sans, fontSize:20, fontWeight:700, color:C.forest, marginBottom:8, textAlign:"center" }}>Add New Event Type</h3>
        <p style={{ fontFamily:C.sans, fontSize:14, color:C.muted, lineHeight:1.7, marginBottom:22, textAlign:"center" }}>
          Custom life events can be configured for your organisation. Contact your NEXUS administrator or raise a request to enable additional event types such as <strong>Retirement</strong>, <strong>Divorce</strong>, <strong>Business Registration</strong>, and more.
        </p>
        <div style={{ padding:"14px 16px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, marginBottom:22 }}>
          <div style={{ fontFamily:C.sans, fontSize:12, fontWeight:600, color:C.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>Coming soon</div>
          {["Retirement / VRS","Divorce / Separation","Business Registration","Death of Dependent","Property Purchase"].map((e,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:9, padding:"6px 0", borderBottom:i<4?`1px solid ${C.border}`:"none" }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:C.caramel, flexShrink:0 }}/>
              <span style={{ fontFamily:C.sans, fontSize:13, color:C.forest }}>{e}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ width:"100%", padding:"11px 0", background:C.forest, border:"none", borderRadius:10, color:C.bg, fontFamily:C.sans, fontSize:14, fontWeight:600, cursor:"pointer" }}>Got it</button>
      </div>
    </div>
  );
}

function Dashboard({ user, domains, history, onSelect }) {
  const [hov, setHov]           = useState(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const emp = domains?.Employment||{};
  const eventsProcessed = history?.length||0;
  const lastSync = history?.length ? history[history.length-1].date : "Never";

  const recentActivity = [...(history||[])].reverse().slice(0,3).map(ev=>{
    const meta = EVENTS.find(e=>e.id===ev.id)||{icon:"●",color:C.olive,label:ev.id};
    return { icon:meta.icon, color:meta.color, label:meta.label, domains:ev.domains, date:ev.date };
  });

  const domainStatus = DOMAIN_ORDER.map(dom=>{
    const data = domains?.[dom]||{};
    const filled = Object.values(data).some(v=>v&&v.trim()!=="");
    const adp = DOMAIN_ADAPTERS[dom];
    return { dom, filled, adp, status: filled?(dom==="Government"?"warn":"live"):"empty" };
  });
  const liveCount = domainStatus.filter(d=>d.status!=="empty").length;

  return (
    <>
      {showAddEvent && <AddEventModal onClose={()=>setShowAddEvent(false)}/>}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", minHeight:"calc(100vh - 60px)", animation:"fadeUp 0.5s ease" }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ padding:"32px 40px 52px", overflowY:"auto", borderRight:`1px solid ${C.border}` }}>

          {/* Greeting + last sync */}
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:22 }}>
            <div>
              <h1 style={{ fontFamily:C.sans, fontSize:30, fontWeight:700, color:C.forest, lineHeight:1.15, marginBottom:6 }}>
                Namaste, {user?.name?.split(" ")[0]}! 🙏
              </h1>
              <p style={{ fontFamily:C.sans, fontSize:14, color:C.muted, maxWidth:500, lineHeight:1.75 }}>
                Select a life event that occurred. NEXUS will generate an AI orchestration plan and sync all your connected Indian records — with your explicit consent.
              </p>
            </div>
            <div style={{ textAlign:"right", flexShrink:0, marginLeft:20, paddingTop:4 }}>
              <div style={{ fontFamily:C.sans, fontSize:10, fontWeight:600, color:C.dim, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:3 }}>Last Sync</div>
              <div style={{ fontFamily:C.sans, fontSize:14, fontWeight:700, color:C.forest }}>{lastSync}</div>
            </div>
          </div>

          {/* Stats bar */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
            {[
              { label:"Domains Connected", value:`${liveCount}/5` },
              { label:"Events Processed",  value:eventsProcessed  },
              { label:"Hours Saved",       value:`${eventsProcessed*2}h` },
            ].map(s=>(
              <div key={s.label} style={{ padding:"14px 16px", background:C.card, border:`1px solid ${C.border}`, borderRadius:12, boxShadow:"0 1px 5px rgba(40,54,24,0.04)" }}>
                <div style={{ fontFamily:C.sans, fontSize:26, fontWeight:800, color:C.forest, lineHeight:1, marginBottom:5 }}>{s.value}</div>
                <div style={{ fontFamily:C.sans, fontSize:12, color:C.muted, textTransform:"uppercase", letterSpacing:"0.04em" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Profile card */}
          <div style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 18px", marginBottom:20, background:C.card, border:`1.5px solid ${C.border}`, borderRadius:14, boxShadow:"0 1px 6px rgba(40,54,24,0.05)" }}>
            <div style={{ width:44, height:44, borderRadius:"50%", background:`linear-gradient(135deg,${C.olive},${C.forest})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:C.bg, fontWeight:800, flexShrink:0 }}>{user?.name?.charAt(0)}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:C.sans, fontSize:15, fontWeight:700, color:C.forest, marginBottom:2 }}>{user?.name}</div>
              <div style={{ fontFamily:C.sans, fontSize:13, color:C.muted, marginBottom:7 }}>
                {[emp.Role&&emp.Role.trim()?emp.Role:null, emp.Employer&&emp.Employer.trim()?emp.Employer:null, user?.city||null].filter(Boolean).join(" · ")||user?.occ||""}
              </div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {DOMAIN_ORDER.map(d=>{
                  const m=DM[d]; const data=domains?.[d];
                  const filled=data&&Object.values(data).some(v=>v&&v.trim());
                  return filled?<span key={d} style={{ fontFamily:C.sans, fontSize:11, fontWeight:600, padding:"2px 9px", borderRadius:20, background:`${m.color}10`, color:m.color, border:`1px solid ${m.color}25` }}>{d}</span>:null;
                })}
              </div>
            </div>
          </div>

          {/* Section label */}
          <div style={{ fontFamily:C.sans, fontSize:13, fontWeight:700, color:C.forest, letterSpacing:"0.04em", textTransform:"uppercase", marginBottom:13 }}>Select a Life Event</div>

          {/* Event cards — 2+3 grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            {EVENTS.slice(0,2).map(ev=><EventCard key={ev.id} ev={ev} hov={hov} setHov={setHov} onSelect={onSelect}/>)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
            {EVENTS.slice(2).map(ev=><EventCard key={ev.id} ev={ev} hov={hov} setHov={setHov} onSelect={onSelect}/>)}
          </div>

          {/* Add New Event button */}
          <button onClick={()=>setShowAddEvent(true)} style={{ width:"100%", padding:"14px 20px", background:C.forest, border:"none", borderRadius:13, color:C.bg, fontFamily:C.sans, fontSize:15, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:`0 4px 16px ${C.forest}28`, transition:"opacity 0.2s, transform 0.15s", marginBottom:26 }}>
            <span style={{ fontSize:18 }}>＋</span> Add New Event
          </button>

          {/* Recent Activity */}
          <div style={{ fontFamily:C.sans, fontSize:13, fontWeight:700, color:C.forest, letterSpacing:"0.04em", textTransform:"uppercase", marginBottom:13 }}>Recent Activity</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {recentActivity.length===0 ? (
              <div style={{ padding:"16px 18px", background:C.card, border:`1px solid ${C.border}`, borderRadius:11, fontFamily:C.sans, fontSize:13, color:C.dim }}>
                No events processed yet. Select a life event above to get started.
              </div>
            ) : recentActivity.map((a,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:C.card, border:`1px solid ${C.border}`, borderRadius:11 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:C.success, boxShadow:`0 0 5px ${C.success}`, flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:C.sans, fontSize:13, color:C.forest, fontWeight:500 }}>
                    <span style={{ color:a.color }}>{a.icon} {a.label}</span>{" — "}{a.domains?.join(", ")} synced
                  </div>
                  <div style={{ fontFamily:C.sans, fontSize:11, color:C.dim, marginTop:2 }}>{a.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ background:C.surface, padding:"28px 20px", overflowY:"auto", display:"flex", flexDirection:"column", gap:22 }}>

          {/* Domain Status header */}
          <div style={{ fontFamily:C.sans, fontSize:13, fontWeight:700, color:C.forest, letterSpacing:"0.04em", textTransform:"uppercase" }}>Domain Status</div>

          {/* summary chips */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:-10 }}>
            <div style={{ padding:"12px 14px", background:C.card, border:`1px solid ${C.border}`, borderRadius:11, textAlign:"center" }}>
              <div style={{ fontFamily:C.sans, fontSize:22, fontWeight:800, color:C.forest }}>{liveCount}/5</div>
              <div style={{ fontFamily:C.sans, fontSize:11, color:C.muted, marginTop:2 }}>Adapters Live</div>
            </div>
            <div style={{ padding:"12px 14px", background:C.card, border:`1px solid ${C.border}`, borderRadius:11, textAlign:"center" }}>
              <div style={{ fontFamily:C.sans, fontSize:22, fontWeight:800, color:C.forest }}>24 h</div>
              <div style={{ fontFamily:C.sans, fontSize:11, color:C.muted, marginTop:2 }}>Token Validity</div>
            </div>
          </div>

          {/* domain rows */}
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:-6 }}>
            {domainStatus.map(({dom,filled,adp,status})=>(
              <div key={dom} style={{ background:C.card, border:`1px solid ${status==="warn"?C.copper+"40":C.border}`, borderRadius:12, padding:"11px 13px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:adp.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:adp.color, flexShrink:0 }}>{adp.icon}</div>
                    <span style={{ fontFamily:C.sans, fontSize:14, fontWeight:700, color:C.forest }}>{dom}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:status==="live"?C.success:status==="warn"?C.copper:"#CCC", boxShadow:status==="live"?`0 0 5px ${C.success}40`:status==="warn"?`0 0 5px ${C.copper}40`:"none" }}/>
                    <span style={{ fontFamily:C.sans, fontSize:11, fontWeight:600, color:status==="live"?C.success:status==="warn"?C.copper:C.dim }}>
                      {status==="live"?"live":status==="warn"?"warn":"not set"}
                    </span>
                  </div>
                </div>
                <div style={{ fontFamily:C.sans, fontSize:12, color:C.dim, marginBottom:status!=="live"?6:0 }}>{adp.std}</div>
                {status==="warn" && <div style={{ display:"inline-block", fontFamily:C.sans, fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background:`${C.copper}12`, color:C.copper, border:`1px solid ${C.copper}30` }}>complete setup</div>}
                {status==="empty" && <div style={{ display:"inline-block", fontFamily:C.sans, fontSize:11, fontWeight:500, padding:"2px 8px", borderRadius:20, background:`${C.dim}10`, color:C.dim, border:`1px solid ${C.dim}20` }}>no data yet</div>}
              </div>
            ))}
          </div>

          {/* Privacy Summary */}
          <div>
            <div style={{ fontFamily:C.sans, fontSize:13, fontWeight:700, color:C.forest, letterSpacing:"0.04em", textTransform:"uppercase", marginBottom:12 }}>Privacy Summary</div>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
              {[
                { k:"Data shared today",    v:"0 fields",  vc:C.forest  },
                { k:"Consent model",        v:"Granular",  vc:C.olive   },
                { k:"Central data lake",    v:"None",      vc:C.success },
                { k:"Differential privacy", v:"Active",    vc:C.success },
              ].map((row,i,arr)=>(
                <div key={row.k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none" }}>
                  <span style={{ fontFamily:C.sans, fontSize:13, color:C.muted }}>{row.k}</span>
                  <span style={{ fontFamily:C.sans, fontSize:13, fontWeight:600, color:row.vc }}>{row.v}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ─── EVENT CARD ───────────────────────────────────────────────────────────────
function EventCard({ ev, hov, setHov, onSelect }) {
  const actions = EVENT_ACTIONS[ev.id]||[];
  const isHov   = hov===ev.id;
  return (
    <button onClick={()=>onSelect(ev)} onMouseEnter={()=>setHov(ev.id)} onMouseLeave={()=>setHov(null)}
      style={{ background:isHov?`${ev.color}07`:C.card, border:`1.5px solid ${isHov?ev.color+"55":C.border}`, borderRadius:14, padding:"18px 16px 16px", cursor:"pointer", textAlign:"left", transition:"all 0.22s", transform:isHov?"translateY(-4px)":"none", boxShadow:isHov?`0 10px 28px ${ev.color}14`:"0 1px 6px rgba(40,54,24,0.04)" }}>
      <div style={{ fontSize:24, marginBottom:9 }}>{ev.icon}</div>
      <div style={{ fontFamily:C.sans, fontSize:15, fontWeight:700, marginBottom:4, color:isHov?ev.color:C.forest, transition:"color 0.2s", lineHeight:1.2 }}>{ev.label}</div>
      <div style={{ fontFamily:C.sans, fontSize:12, color:C.muted, lineHeight:1.55, marginBottom:8 }}>{ev.desc}</div>
      <div style={{ fontFamily:C.sans, fontSize:12, color:C.dim }}>{actions.length} cross-domain actions</div>
      {isHov && (
        <div style={{ marginTop:11, paddingTop:9, borderTop:`1px solid ${ev.color}20` }}>
          {actions.slice(0,3).map((a,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
              <div style={{ width:4, height:4, borderRadius:"50%", background:ev.color, flexShrink:0 }}/>
              <span style={{ fontFamily:C.sans, fontSize:11, color:ev.color }}>{a}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// CANCEL CONFIRM DIALOG
// ════════════════════════════════════════════════════════════════════
function CancelDialog({ onConfirm, onStay }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(40,54,24,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:20 }}>
      <div style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:18, padding:"36px 40px", maxWidth:400, width:"100%", boxShadow:"0 20px 60px rgba(40,54,24,0.22)", animation:"fadeUp 0.25s ease", textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:16 }}>⚠️</div>
        <h3 style={{ fontFamily:C.display, fontSize:20, fontWeight:800, color:C.forest, marginBottom:10 }}>Cancel this event?</h3>
        <p style={{ fontFamily:C.sans, fontSize:14, color:C.muted, lineHeight:1.7, marginBottom:26 }}>
          No changes have been made yet. You will be returned to the dashboard and all entered details will be discarded.
        </p>
        <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <button onClick={onStay}    style={bSec({padding:"10px 22px"})}>Continue Event</button>
          <button onClick={onConfirm} style={{ ...bPrim({padding:"10px 22px"}), background:C.error }}>Yes, Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// EVENT DETAIL FORM
// ════════════════════════════════════════════════════════════════════
function EventForm({ event, domains, onSubmit, onCancel }) {
  const [f, setF]         = useState({});
  const [err, setErr]     = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const validate = () => {
    if(event.id==="job_change"  && !f.emp)  return "New employer name is required.";
    if(event.id==="graduation"  && !f.deg)  return "Please select the degree type.";
    if(event.id==="relocation"  && !f.city) return "New city is required.";
    return null;
  };
  const handleSubmit = () => { const e=validate(); if(e){setErr(e);return;} onSubmit(f); };

  return (
    <>
      {showCancel && <CancelDialog onConfirm={onCancel} onStay={()=>setShowCancel(false)}/>}
      <div style={{ padding:"36px 56px 60px", animation:"fadeUp 0.5s ease", maxWidth:1060, margin:"0 auto" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
          <BackBtn onClick={()=>setShowCancel(true)} label="Cancel & Go Back"/>
          <div style={{ fontFamily:C.sans, fontSize:12, color:C.dim }}>Step 2 of 6</div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:34 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:`${event.color}12`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, border:`1.5px solid ${event.color}28` }}>{event.icon}</div>
          <div>
            <h2 style={{ fontFamily:C.display, fontSize:26, fontWeight:800, color:C.forest, marginBottom:3 }}>{event.label}</h2>
            <p style={{ fontFamily:C.sans, fontSize:14, color:C.muted }}>{event.desc}</p>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:28 }}>
          {/* form */}
          <div style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:18, padding:"26px 28px", boxShadow:"0 2px 16px rgba(40,54,24,0.06)" }}>
            <div style={{ fontFamily:C.display, fontSize:14, fontWeight:700, color:C.forest, marginBottom:22, paddingBottom:12, borderBottom:`2px solid ${C.border}` }}>Enter Event Details</div>

            {event.id==="job_change" && <>
              <Field label="New Employer Name" required><Inp fkey="emp" val={f.emp} onChange={set} placeholder="e.g. TCS, Wipro, Amazon India"/></Field>
              <Field label="New Designation / Role"><Inp fkey="role" val={f.role} onChange={set} placeholder="e.g. Senior Software Engineer"/></Field>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <Field label="New CTC (₹ LPA)"><Inp fkey="ctc" val={f.ctc} onChange={set} placeholder="e.g. 18" type="number"/></Field>
                <Field label="Employment Type"><Sel fkey="type" val={f.type} onChange={set} options={["Full-time","Contract","Consultant","Part-time"]}/></Field>
              </div>
              <Field label="Work Location City"><Sel fkey="city" val={f.city} onChange={set} options={CITIES}/></Field>
              <Field label="Date of Joining"><Inp fkey="doj" val={f.doj} onChange={set} type="date"/></Field>
            </>}

            {event.id==="graduation" && <>
              <Field label="Degree" required><Sel fkey="deg" val={f.deg} onChange={set} options={DEGREES}/></Field>
              <Field label="Specialization / Stream"><Inp fkey="spec" val={f.spec} onChange={set} placeholder="e.g. Computer Science, Finance"/></Field>
              <Field label="University / Institution"><Inp fkey="inst" val={f.inst} onChange={set} placeholder="e.g. IIT Bombay, VTU, Pune University"/></Field>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <Field label="Year of Passing"><Inp fkey="gradYear" val={f.gradYear} onChange={set} placeholder={new Date().getFullYear().toString()} type="number"/></Field>
                <Field label="CGPA / Percentage"><Inp fkey="cgpa" val={f.cgpa} onChange={set} placeholder="e.g. 8.5 / 82%"/></Field>
              </div>
            </>}

            {event.id==="relocation" && <>
              <Field label="New City" required><Sel fkey="city" val={f.city} onChange={set} options={CITIES}/></Field>
              <Field label="New State"><Sel fkey="state" val={f.state} onChange={set} options={STATES}/></Field>
              <Field label="New Full Address"><Inp fkey="addr" val={f.addr} onChange={set} placeholder="Flat No., Area, Pincode"/></Field>
              <Field label="Reason for Relocation"><Sel fkey="reason" val={f.reason} onChange={set} options={["Job Transfer","New Job","Family","Education","Personal","Other"]}/></Field>
            </>}

            {event.id==="hospitalisation" && <>
              <Field label="Hospital Name"><Inp fkey="hosp" val={f.hosp} onChange={set} placeholder="e.g. Apollo, Fortis, AIIMS"/></Field>
              <Field label="City"><Sel fkey="city" val={f.city} onChange={set} options={CITIES}/></Field>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <Field label="Date of Admission"><Inp fkey="date" val={f.date} onChange={set} type="date"/></Field>
                <Field label="Expected Discharge"><Inp fkey="discharge" val={f.discharge} onChange={set} type="date"/></Field>
              </div>
              <Field label="Type of Admission"><Sel fkey="type" val={f.type} onChange={set} options={["Emergency","Planned Surgery","Day Care","Maternity","ICU","Other"]}/></Field>
            </>}

            {event.id==="new_child" && <>
              <Field label="Child's Name"><Inp fkey="name" val={f.name} onChange={set} placeholder="Enter name"/></Field>
              <Field label="Date of Birth"><Inp fkey="dob" val={f.dob} onChange={set} type="date"/></Field>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <Field label="Gender"><Sel fkey="gender" val={f.gender} onChange={set} options={["Boy","Girl","Other"]}/></Field>
                <Field label="Type"><Sel fkey="ctype" val={f.ctype} onChange={set} options={["Birth","Adoption","Legal Guardianship"]}/></Field>
              </div>
            </>}

            <ErrMsg msg={err}/>
            <div style={{ display:"flex", gap:10, marginTop:10 }}>
              <button onClick={handleSubmit} style={bPrim()}>Generate Orchestration Plan →</button>
              <button onClick={()=>setShowCancel(true)} style={bSec()}>Cancel</button>
            </div>
          </div>

          {/* snapshot */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:"20px 22px", height:"fit-content" }}>
            <div style={{ fontFamily:C.display, fontSize:13, fontWeight:700, color:C.forest, marginBottom:16, paddingBottom:9, borderBottom:`1px solid ${C.border}` }}>📊 Current Snapshot</div>
            {Object.entries(domains||{}).slice(0,4).map(([dom,data])=>{
              const m=DM[dom]||{icon:"●",color:C.olive};
              return (
                <div key={dom} style={{ marginBottom:15 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                    <span style={{ fontSize:12 }}>{m.icon}</span>
                    <span style={{ fontFamily:C.display, fontSize:12, fontWeight:700, color:m.color }}>{dom}</span>
                  </div>
                  {Object.entries(data).slice(0,3).map(([k,v])=>(
                    <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:`1px solid ${C.border}` }}>
                      <span style={{ fontFamily:C.sans, fontSize:11, color:C.muted }}>{k}</span>
                      <span style={{ fontFamily:C.mono, fontSize:10, color:v&&v!=="—"?C.forest:C.dim }}>{v||"—"}</span>
                    </div>
                  ))}
                </div>
              );
            })}
            <div style={{ marginTop:6, fontFamily:C.sans, fontSize:11, color:C.dim, fontStyle:"italic" }}>Will update after sync</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// LOADING
// ════════════════════════════════════════════════════════════════════
function LoadingScreen({ event }) {
  const [phase, setPhase] = useState(0);
  const [dots,  setDots]  = useState(0);
  const phases=["Parsing event context…","Mapping Indian domain dependencies…","Generating AI task tree…","Building orchestration plan…"];
  useEffect(()=>{
    const t1=setInterval(()=>setDots(d=>(d+1)%4),380);
    const t2=setInterval(()=>setPhase(p=>Math.min(p+1,phases.length-1)),900);
    return()=>{clearInterval(t1);clearInterval(t2);};
  },[]);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"calc(100vh - 60px)", animation:"fadeUp 0.4s ease" }}>
      <div style={{ position:"relative", width:80, height:80, marginBottom:30 }}>
        <div style={{ position:"absolute", inset:0, border:`2px solid ${C.border}`, borderTop:`2px solid ${C.olive}`, borderRadius:"50%", animation:"spin 1s linear infinite" }}/>
        <div style={{ position:"absolute", inset:15, border:`2px solid ${C.border}`, borderTop:`2px solid ${C.caramel}`, borderRadius:"50%", animation:"spin 1.8s linear infinite reverse" }}/>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>{event?.icon}</div>
      </div>
      <div style={{ fontFamily:C.sans, fontSize:11, fontWeight:600, color:C.olive, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:6 }}>NEXUS Analyzing</div>
      <div style={{ fontFamily:C.display, fontSize:24, fontWeight:800, color:C.forest, marginBottom:8 }}>{event?.label}</div>
      <div style={{ fontFamily:C.sans, fontSize:13, color:C.muted, minHeight:20 }}>{phases[phase]}{"·".repeat(dots)}</div>
      <div style={{ display:"flex", gap:6, marginTop:28 }}>
        {phases.map((_,i)=><div key={i} style={{ height:3, borderRadius:2, background:i<=phase?C.olive:C.border, width:i<=phase?22:6, transition:"all 0.4s" }}/>)}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// TASK TREE
// ════════════════════════════════════════════════════════════════════
function TaskTreeScreen({ event, summary, tasks, onNext, onCancel }) {
  const [showCancel, setShowCancel] = useState(false);
  const byDomain={};
  (tasks||[]).forEach(t=>{if(!byDomain[t.domain])byDomain[t.domain]=[];byDomain[t.domain].push(t);});
  return (
    <>
      {showCancel && <CancelDialog onConfirm={onCancel} onStay={()=>setShowCancel(false)}/>}
      <div style={{ padding:"36px 56px 60px", animation:"fadeUp 0.5s ease", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9 }}>
              <span style={{ fontSize:18 }}>{event?.icon}</span>
              <span style={{ fontFamily:C.sans, fontSize:11, fontWeight:600, color:C.olive, letterSpacing:"0.1em", textTransform:"uppercase" }}>AI Plan Generated</span>
            </div>
            <h2 style={{ fontFamily:C.display, fontSize:26, fontWeight:800, color:C.forest, marginBottom:7 }}>{event?.label} — Orchestration Plan</h2>
            <p style={{ fontFamily:C.sans, fontSize:14, color:C.muted, maxWidth:580, lineHeight:1.75 }}>{summary}</p>
          </div>
          <div style={{ display:"flex", gap:10, flexShrink:0 }}>
            <button onClick={()=>setShowCancel(true)} style={bSec()}>Cancel</button>
            <button onClick={onNext} style={bPrim()}>Set Consents →</button>
          </div>
        </div>

        <div style={{ display:"flex", gap:10, marginBottom:26 }}>
          {[{l:"Domains",v:Object.keys(byDomain).length},{l:"Tasks",v:tasks?.length||0},{l:"Est. Time",v:"~2 min"},{l:"Engine",v:"Claude AI"}].map(s=>(
            <div key={s.l} style={{ padding:"12px 18px", background:C.card, border:`1px solid ${C.border}`, borderRadius:11 }}>
              <div style={{ fontFamily:C.display, fontSize:21, fontWeight:800, color:C.olive, marginBottom:2 }}>{s.v}</div>
              <div style={{ fontFamily:C.sans, fontSize:11, color:C.muted }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:8 }}>
          {Object.entries(byDomain).map(([domain,dtasks])=>{
            const m=DM[domain]||{icon:"●",color:C.olive};
            return (
              <div key={domain} style={{ flex:"0 0 228px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 13px", background:`${m.color}0D`, border:`1px solid ${m.color}22`, borderRadius:"11px 11px 0 0", borderBottom:"none" }}>
                  <span style={{ fontSize:13 }}>{m.icon}</span>
                  <span style={{ fontFamily:C.display, fontSize:12, fontWeight:700, color:m.color }}>{domain}</span>
                  <span style={{ marginLeft:"auto", fontFamily:C.mono, fontSize:9, background:`${m.color}18`, color:m.color, padding:"1px 7px", borderRadius:20 }}>{dtasks.length}</span>
                </div>
                <div style={{ border:`1px solid ${m.color}14`, borderTop:"none", borderRadius:"0 0 11px 11px", overflow:"hidden" }}>
                  {dtasks.map((t,i)=>(
                    <div key={t.id} style={{ padding:"12px 13px", borderBottom:i<dtasks.length-1?`1px solid ${C.border}`:"none", background:C.card }}>
                      <div style={{ fontFamily:C.sans, fontSize:13, fontWeight:600, color:C.forest, marginBottom:4 }}>{t.action}</div>
                      <div style={{ fontFamily:C.sans, fontSize:12, color:C.muted, lineHeight:1.55, marginBottom:6 }}>{t.detail}</div>
                      <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                        {(t.dataFields||[]).map(fld=><span key={fld} style={{ fontFamily:C.mono, fontSize:9, padding:"2px 6px", borderRadius:4, background:`${m.color}10`, color:m.color, border:`1px solid ${m.color}20` }}>{fld}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// CONSENT SCREEN
// ════════════════════════════════════════════════════════════════════
function ConsentScreen({ domains, tasks, consents, setConsents, onExecute, onCancel }) {
  const [showCancel, setShowCancel] = useState(false);
  const anyGranted = domains.some(d=>consents[d]?.granted);
  const toggle = d => setConsents(p=>({...p,[d]:{...p[d],granted:!p[d]?.granted}}));
  return (
    <>
      {showCancel && <CancelDialog onConfirm={onCancel} onStay={()=>setShowCancel(false)}/>}
      <div style={{ padding:"36px 56px 60px", animation:"fadeUp 0.5s ease", maxWidth:1060, margin:"0 auto" }}>
        <div style={{ marginBottom:30 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:C.copper, boxShadow:`0 0 7px ${C.copper}` }}/>
            <span style={{ fontFamily:C.sans, fontSize:11, fontWeight:600, color:C.copper, letterSpacing:"0.1em", textTransform:"uppercase" }}>Consent Required</span>
          </div>
          <h2 style={{ fontFamily:C.display, fontSize:26, fontWeight:800, color:C.forest, marginBottom:7 }}>Authorise Domain Access</h2>
          <p style={{ fontFamily:C.sans, fontSize:14, color:C.muted, maxWidth:540, lineHeight:1.75 }}>NEXUS will not modify any record without your explicit consent. Each domain gets a unique token. Toggle to grant — or skip that domain.</p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:13, marginBottom:28 }}>
          {domains.map(domain=>{
            const m=DM[domain]||{icon:"●",color:C.olive};
            const c=consents[domain]||{};
            const fields=[...new Set((tasks||[]).filter(t=>t.domain===domain).flatMap(t=>t.dataFields||[]))];
            return (
              <div key={domain} style={{ background:C.card, border:`1.5px solid ${c.granted?m.color+"55":C.border}`, borderRadius:15, overflow:"hidden", transition:"all 0.3s", boxShadow:c.granted?`0 4px 20px ${m.color}12`:"0 1px 6px rgba(40,54,24,0.04)" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 16px", background:c.granted?`${m.color}07`:C.surface, borderBottom:`1px solid ${c.granted?m.color+"22":C.border}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                    <span style={{ fontSize:17 }}>{m.icon}</span>
                    <div>
                      <div style={{ fontFamily:C.display, fontSize:13, fontWeight:700, color:c.granted?m.color:C.forest }}>{domain}</div>
                      <div style={{ fontFamily:C.sans, fontSize:10, color:C.muted }}>{(tasks||[]).filter(t=>t.domain===domain).length} action(s)</div>
                    </div>
                  </div>
                  <div onClick={()=>toggle(domain)} style={{ width:44, height:24, borderRadius:12, cursor:"pointer", position:"relative", background:c.granted?m.color:C.dim, transition:"background 0.25s", flexShrink:0 }}>
                    <div style={{ position:"absolute", top:3, left:c.granted?22:3, width:18, height:18, borderRadius:"50%", background:"white", transition:"left 0.25s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}/>
                  </div>
                </div>
                <div style={{ padding:"14px 16px" }}>
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontFamily:C.sans, fontSize:10, fontWeight:600, color:C.muted, marginBottom:4, letterSpacing:"0.06em", textTransform:"uppercase" }}>Consent Token</div>
                    <div style={{ fontFamily:C.mono, fontSize:9, padding:"6px 10px", background:C.surface, border:`1px solid ${c.granted?m.color+"30":C.border}`, borderRadius:6, color:c.granted?m.color:C.muted, transition:"all 0.3s", letterSpacing:"0.04em" }}>{c.token||"—"}</div>
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontFamily:C.sans, fontSize:10, fontWeight:600, color:C.muted, marginBottom:5, letterSpacing:"0.06em", textTransform:"uppercase" }}>Fields</div>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {fields.map(fld=><span key={fld} style={{ fontFamily:C.mono, fontSize:9, padding:"2px 6px", borderRadius:4, background:c.granted?`${m.color}10`:`${C.muted}10`, color:c.granted?m.color:C.muted, border:`1px solid ${c.granted?m.color+"28":C.border}`, transition:"all 0.3s" }}>{fld}</span>)}
                    </div>
                  </div>
                  <div style={{ fontFamily:C.sans, fontSize:11, color:c.granted?C.success:C.muted, display:"flex", alignItems:"center", gap:5, fontWeight:c.granted?600:400 }}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:c.granted?C.success:C.muted }}/>
                    {c.granted?"Access granted":"Awaiting consent"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <button onClick={()=>setShowCancel(true)} style={bSec()}>Cancel</button>
            <span style={{ fontFamily:C.sans, fontSize:13, color:C.muted }}>{domains.filter(d=>consents[d]?.granted).length} of {domains.length} authorised</span>
          </div>
          <button onClick={onExecute} disabled={!anyGranted} style={bPrim({opacity:anyGranted?1:0.5,cursor:anyGranted?"pointer":"not-allowed"})}>
            {anyGranted?"Begin Orchestration →":"Authorise at least one domain"}
          </button>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// EXECUTION SCREEN
// ════════════════════════════════════════════════════════════════════
function ExecutionScreen({ execStatus, execLogs, consents }) {
  const logsEnd=useRef(null);
  useEffect(()=>{logsEnd.current?.scrollIntoView({behavior:"smooth"});},[execLogs]);
  const domains=Object.keys(execStatus);
  const allDone=domains.length>0&&domains.every(d=>execStatus[d]?.status==="done");
  return (
    <div style={{ padding:"36px 56px 60px", display:"grid", gridTemplateColumns:"1fr 320px", gap:26, animation:"fadeUp 0.5s ease", maxWidth:1060, margin:"0 auto" }}>
      <div>
        <div style={{ marginBottom:26 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:allDone?C.success:C.olive, boxShadow:`0 0 7px ${allDone?C.success:C.olive}`, animation:allDone?"none":"pulse 1.2s ease infinite" }}/>
            <span style={{ fontFamily:C.sans, fontSize:11, fontWeight:600, color:allDone?C.success:C.olive, letterSpacing:"0.1em", textTransform:"uppercase" }}>{allDone?"Complete":"In Progress"}</span>
          </div>
          <h2 style={{ fontFamily:C.display, fontSize:26, fontWeight:800, color:allDone?C.success:C.forest, marginBottom:5, transition:"color 0.5s" }}>{allDone?"All Domains Synchronised ✓":"Syncing Domains…"}</h2>
          <p style={{ fontFamily:C.sans, fontSize:14, color:C.muted }}>{allDone?"NEXUS has successfully orchestrated all authorised domains.":"Please wait while NEXUS applies changes across your domains."}</p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {domains.map(domain=>{
            const st=execStatus[domain]||{status:"pending",progress:0};
            const m=DM[domain]||{icon:"●",color:C.olive};
            const isDone=st.status==="done",isRun=st.status==="running";
            return (
              <div key={domain} style={{ padding:"14px 17px", background:C.card, border:`1.5px solid ${isDone?m.color+"45":isRun?m.color+"22":C.border}`, borderRadius:13, transition:"all 0.4s", boxShadow:isDone?`0 3px 16px ${m.color}10`:"0 1px 5px rgba(40,54,24,0.04)" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:9 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:15 }}>{m.icon}</span>
                    <span style={{ fontFamily:C.display, fontSize:13, fontWeight:700, color:isDone?m.color:C.forest, transition:"color 0.3s" }}>{domain}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    {isRun&&<div style={{ width:5, height:5, borderRadius:"50%", background:m.color, animation:"pulse 0.9s ease infinite" }}/>}
                    <span style={{ fontFamily:C.mono, fontSize:9, fontWeight:600, color:isDone?C.success:isRun?m.color:C.muted }}>{isDone?"✓ SYNCED":isRun?"SYNCING":"PENDING"}</span>
                    <span style={{ fontFamily:C.mono, fontSize:9, color:C.dim }}>{st.progress}%</span>
                  </div>
                </div>
                <div style={{ height:3, background:C.border, borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:2, width:`${st.progress}%`, background:isDone?`linear-gradient(90deg,${m.color},${C.success})`:m.color, transition:"width 0.6s ease" }}/>
                </div>
                {consents[domain]?.token&&<div style={{ marginTop:6, fontFamily:C.mono, fontSize:8, color:isDone?m.color+"55":C.dim }}>{consents[domain].token}</div>}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, overflow:"hidden", display:"flex", flexDirection:"column", maxHeight:480 }}>
        <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}`, background:C.surface, display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:C.olive, animation:"pulse 1.8s ease infinite" }}/>
          <span style={{ fontFamily:C.sans, fontSize:11, fontWeight:600, color:C.forest, letterSpacing:"0.06em" }}>NEXUS LOG</span>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"10px 13px" }}>
          {execLogs.length===0&&<div style={{ fontFamily:C.mono, fontSize:11, color:C.muted }}>Initialising…</div>}
          {execLogs.map((log,i)=>{
            const m=DM[log.domain]||{color:C.olive};
            return (
              <div key={i} style={{ display:"flex", gap:7, marginBottom:6, animation:"fadeUp 0.3s ease" }}>
                <span style={{ fontFamily:C.mono, fontSize:9, color:C.dim, whiteSpace:"nowrap", marginTop:2, flexShrink:0 }}>{log.time}</span>
                <span style={{ fontFamily:C.mono, fontSize:11, lineHeight:1.5, color:log.type==="success"?C.success:log.type==="action"?m.color:C.muted }}>{log.msg}</span>
              </div>
            );
          })}
          <div ref={logsEnd}/>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CONFIRMATION SCREEN
// ════════════════════════════════════════════════════════════════════
function ConfirmationScreen({ event, beforeDomains, afterDomains, affectedDomains, consents, onReset }) {
  const granted=affectedDomains.filter(d=>consents[d]?.granted);
  const [active,setActive]=useState(granted[0]||null);
  const bd=beforeDomains[active]||{};
  const ad=afterDomains[active]||{};
  return (
    <div style={{ padding:"36px 56px 60px", animation:"fadeUp 0.5s ease", maxWidth:1060, margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:36 }}>
        <div style={{ fontSize:52, marginBottom:14 }}>✅</div>
        <h2 style={{ fontFamily:C.display, fontSize:30, fontWeight:800, color:C.success, marginBottom:8 }}>Orchestration Successful</h2>
        <p style={{ fontFamily:C.sans, fontSize:15, color:C.muted, maxWidth:460, margin:"0 auto" }}>
          NEXUS synchronised <strong style={{color:C.forest}}>{granted.length} domain{granted.length!==1?"s":""}</strong> for your <strong style={{color:C.forest}}>{event?.label}</strong> event.
        </p>
      </div>

      <div style={{ display:"flex", gap:7, justifyContent:"center", marginBottom:26, flexWrap:"wrap" }}>
        {granted.map(d=>{
          const m=DM[d]||{icon:"●",color:C.olive};
          return (
            <button key={d} onClick={()=>setActive(d)} style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 15px", borderRadius:30, background:active===d?`${m.color}12`:C.card, border:`1.5px solid ${active===d?m.color+"55":C.border}`, color:active===d?m.color:C.muted, fontFamily:C.sans, fontSize:12, fontWeight:500, cursor:"pointer", transition:"all 0.2s" }}>
              <span style={{ fontSize:14 }}>{m.icon}</span>{d}
              <div style={{ width:5, height:5, borderRadius:"50%", background:C.success, boxShadow:`0 0 4px ${C.success}` }}/>
            </button>
          );
        })}
      </div>

      {active && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, maxWidth:780, margin:"0 auto 26px" }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:15, overflow:"hidden" }}>
            <div style={{ padding:"11px 16px", borderBottom:`1px solid ${C.border}`, background:C.surface }}>
              <div style={{ fontFamily:C.sans, fontSize:11, fontWeight:600, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase" }}>Before · {active}</div>
            </div>
            <div style={{ padding:"14px 16px" }}>
              {Object.entries(bd).map(([k,v])=>{
                const changed=ad[k]&&ad[k]!==v;
                return (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${C.border}`, gap:8 }}>
                    <span style={{ fontFamily:C.sans, fontSize:12, color:C.muted, flexShrink:0 }}>{k}</span>
                    <span style={{ fontFamily:C.mono, fontSize:11, color:changed?`${C.error}88`:C.forest, textDecoration:changed?"line-through":"none", textAlign:"right" }}>{v||"—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ background:C.card, border:`1.5px solid ${C.success}35`, borderRadius:15, overflow:"hidden" }}>
            <div style={{ padding:"11px 16px", borderBottom:`1px solid ${C.success}25`, background:`${C.success}07` }}>
              <div style={{ fontFamily:C.sans, fontSize:11, fontWeight:600, color:C.success, letterSpacing:"0.07em", textTransform:"uppercase" }}>After · {active} ✓</div>
            </div>
            <div style={{ padding:"14px 16px" }}>
              {Object.entries(ad).map(([k,v])=>{
                const changed=bd[k]!==undefined&&bd[k]!==v;
                return (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${C.border}`, gap:8 }}>
                    <span style={{ fontFamily:C.sans, fontSize:12, color:C.muted, flexShrink:0 }}>{k}</span>
                    <span style={{ fontFamily:C.mono, fontSize:11, color:changed?C.success:C.forest, fontWeight:changed?600:400, textAlign:"right" }}>{v||"—"}{changed?" ↑":""}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth:780, margin:"0 auto 26px", padding:"14px 18px", background:C.card, border:`1px solid ${C.border}`, borderRadius:11 }}>
        <div style={{ fontFamily:C.sans, fontSize:10, fontWeight:600, color:C.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:8 }}>Issued Consent Tokens</div>
        <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
          {granted.map(d=>{const m=DM[d]||{color:C.olive};return(<div key={d} style={{ fontFamily:C.mono, fontSize:9, padding:"3px 9px", borderRadius:5, background:`${m.color}10`, color:m.color, border:`1px solid ${m.color}25` }}>{consents[d]?.token}</div>);})}
        </div>
      </div>

      <div style={{ display:"flex", justifyContent:"center" }}>
        <button onClick={onReset} style={bPrim({padding:"13px 32px",fontSize:15})}>↺ Trigger New Life Event</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════════════
export default function App() {
  const [user,        setUser]       = useState(null);
  const [domains,     setDomains]    = useState({});
  const [history,     setHistory]    = useState([]);
  const [screen,      setScreen]     = useState("dashboard");
  const [event,       setEvent]      = useState(null);
  const [formData,    setFormData]   = useState({});
  const [tasks,       setTasks]      = useState(null);
  const [summary,     setSummary]    = useState("");
  const [affDoms,     setAffDoms]    = useState([]);
  const [consents,    setConsents]   = useState({});
  const [execStatus,  setExecStatus] = useState({});
  const [execLogs,    setExecLogs]   = useState([]);
  const [beforeSnap,  setBeforeSnap] = useState({});
  const [afterSnap,   setAfterSnap]  = useState({});
  const [showProfile, setShowProfile]= useState(false);
  const [showDomainSetup, setShowDomainSetup] = useState(false);

  const handleLogin = (u, d, h, firstTime) => {
    setUser(u); setHistory(h||[]);
    if(firstTime||!d){
      setDomains(buildInitDomains(u,{}));
      setScreen("dashboard");
      setShowDomainSetup(true);
    } else {
      setDomains(d);
      setScreen("dashboard");
    }
  };
  const handleLogout = () => { setUser(null); setScreen("dashboard"); setEvent(null); setShowDomainSetup(false); };

  const handleDomainSetupComplete = (doms) => {
    setDomains(doms);
    setShowDomainSetup(false);
  };

  const handleSelectEvent = ev => { setEvent(ev); setScreen("eventform"); };
  const handleCancelEvent = () => { setScreen("dashboard"); setEvent(null); setFormData({}); setTasks(null); setSummary(""); setAffDoms([]); setConsents({}); };

  const handleFormSubmit = async (form) => {
    setFormData(form);
    setScreen("loading");
    const fb=FALLBACK[event.id]||FALLBACK.job_change;
    const fbData=fb(form);
    try {
      const res=await fetch("http://localhost:3001/api/claude",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:1000,
          system:`You are NEXUS, an AI life orchestration engine for Indian users. Return ONLY valid JSON, no markdown.
Format: {"summary":"1-2 sentences","affectedDomains":["Employment"],"tasks":[{"id":"t1","domain":"Employment","action":"Short action","detail":"Indian regulatory context (EPFO,PAN,Aadhaar,TDS,DigiLocker,NAD,ITR,UIDAI)","dataFields":["Field"],"dependsOn":[]}]}
Domains: Employment, Finance, Healthcare, Government, Education. Generate 4-7 tasks.`,
          messages:[{role:"user",content:`Event: "${event.label}". User: ${user.name}, ${user.city||"India"}, Occupation: ${user.occ||"—"}. Details: ${JSON.stringify(form)}. Current domains: ${JSON.stringify(domains)}`}],
        }),
      });
      const data=await res.json();
      const text=data.content?.find(b=>b.type==="text")?.text||"";
      const parsed=JSON.parse(text.replace(/```json|```/g,"").trim());
      setSummary(parsed.summary);setAffDoms(parsed.affectedDomains);setTasks(parsed.tasks);
      const ic={};parsed.affectedDomains.forEach(d=>{ic[d]={granted:false,token:genToken(d)};});
      setConsents(ic);
    } catch {
      setSummary(fbData.summary);setAffDoms(fbData.affectedDomains);setTasks(fbData.tasks);
      const ic={};fbData.affectedDomains.forEach(d=>{ic[d]={granted:false,token:genToken(d)};});
      setConsents(ic);
    }
    setScreen("tasks");
  };

  const handleExecute = async () => {
    const granted=affDoms.filter(d=>consents[d]?.granted);
    if(!granted.length)return;
    const after=buildAfterDomains(event.id,formData,domains);
    setBeforeSnap(JSON.parse(JSON.stringify(domains)));
    setAfterSnap(after);
    const initSt={};granted.forEach(d=>{initSt[d]={status:"pending",progress:0};});
    setExecStatus(initSt);setExecLogs([]);setScreen("execution");
    for(const domain of granted){
      const dtasks=(tasks||[]).filter(t=>t.domain===domain);
      const addLog=(msg,type)=>setExecLogs(p=>[...p,{domain,msg,type,time:new Date().toLocaleTimeString()}]);
      setExecStatus(p=>({...p,[domain]:{status:"running",progress:0}}));
      addLog(`Initiating ${domain} domain sync…`,"info");await sleep(440);
      setExecStatus(p=>({...p,[domain]:{status:"running",progress:26}}));
      addLog(`Validating token ${consents[domain]?.token}`,"info");await sleep(500);
      setExecStatus(p=>({...p,[domain]:{status:"running",progress:55}}));
      if(dtasks[0])addLog(dtasks[0].action,"action");await sleep(280);
      if(dtasks[1]){addLog(dtasks[1].action,"action");await sleep(220);}
      setExecStatus(p=>({...p,[domain]:{status:"running",progress:85}}));
      addLog("Committing to domain registry…","action");await sleep(360);
      setExecStatus(p=>({...p,[domain]:{status:"done",progress:100}}));
      addLog(`✓ ${domain} synchronised`,"success");await sleep(300);
    }
    const newDomains={...domains};
    granted.forEach(d=>{if(after[d])newDomains[d]=after[d];});
    setDomains(newDomains);
    await saveDomains(user.email,newDomains);
    const newHist=[...history,{id:event.id,date:new Date().toLocaleDateString("en-IN"),domains:granted,form:formData}];
    setHistory(newHist);
    await saveHistory(user.email,newHist);
    await sleep(800);
    setScreen("confirmation");
  };

  const reset = () => {
    setScreen("dashboard");setEvent(null);setFormData({});setTasks(null);setSummary("");
    setAffDoms([]);setConsents({});setExecStatus({});setExecLogs([]);setBeforeSnap({});setAfterSnap({});
  };

  if(!user) return <AuthScreen onLogin={handleLogin}/>;

  if(showDomainSetup) return (
    <>
      <style>{`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}@keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}input:focus,select:focus{border-color:#606C38!important;outline:none;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:rgba(96,108,56,0.3);border-radius:2px;}`}</style>
      <div style={{ minHeight:"100vh", background:C.bg, fontFamily:C.sans }}>
        <DomainSetupScreen user={user} existingDomains={domains} onComplete={handleDomainSetupComplete}/>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:rgba(96,108,56,0.28);border-radius:2px;}
        ::-webkit-scrollbar-track{background:transparent;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.22}}
        input:focus,select:focus{border-color:#606C38!important;outline:none;}
        button:active{transform:scale(0.97);}
        body,*{font-family:'Segoe UI',system-ui,sans-serif;}
      `}</style>
      <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:C.sans }}>
        <Header screen={screen} user={user}
          onProfile={()=>setShowProfile(true)}
          onLogout={handleLogout}
          onEditDomains={()=>setScreen("editdomains")}
        />
        {screen==="dashboard"    && <Dashboard        user={user} domains={domains} history={history} onSelect={handleSelectEvent}/>}
        {screen==="editdomains"  && <EditDomainsScreen user={user} domains={domains} onSave={d=>{setDomains(d);setScreen("dashboard");}} onBack={()=>setScreen("dashboard")}/>}
        {screen==="eventform"    && <EventForm         event={event} domains={domains} onSubmit={handleFormSubmit} onCancel={handleCancelEvent}/>}
        {screen==="loading"      && <LoadingScreen     event={event}/>}
        {screen==="tasks"        && <TaskTreeScreen    event={event} summary={summary} tasks={tasks} onNext={()=>setScreen("consent")} onCancel={handleCancelEvent}/>}
        {screen==="consent"      && <ConsentScreen     domains={affDoms} tasks={tasks} consents={consents} setConsents={setConsents} onExecute={handleExecute} onCancel={handleCancelEvent}/>}
        {screen==="execution"    && <ExecutionScreen   execStatus={execStatus} execLogs={execLogs} consents={consents}/>}
        {screen==="confirmation" && <ConfirmationScreen event={event} beforeDomains={beforeSnap} afterDomains={afterSnap} affectedDomains={affDoms} consents={consents} onReset={reset}/>}
        {showProfile && <ProfileModal user={user} domains={domains} history={history}
          onClose={()=>setShowProfile(false)}
          onSave={u=>{setUser(u);setShowProfile(false);}}
          onEditDomains={()=>{setShowProfile(false);setScreen("editdomains");}}
        />}
      </div>
    </>
  );
}
