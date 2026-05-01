// @ts-nocheck
"use client";
import React, { useState, useEffect, useMemo } from "react";
import { signOut } from "next-auth/react";
import { Search, Plus, Filter, X, Edit2, Trash2, BookOpen, GraduationCap, Building2, Calendar, User, FileText, ChevronDown, ArrowUpDown, Check, AlertCircle, Library, Shield, Clock, CheckCircle2, XCircle, RotateCcw, Send, Eye, Users, FileCheck, AlertTriangle, ClipboardList, MessageSquare, Lock, Upload, Paperclip, File as FileIcon, Download, Landmark, TrendingUp, Activity, Globe } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

// In-session file blob cache — the prototype holds real File objects here so
// HEI users and reviewers can preview uploaded files in the same browser
// session. In production this role is filled by S3 or equivalent object
// storage; window.storage only holds the metadata (name, size, type, date).
const fileBlobs = new Map();

// ======================================================================
// SEED DATA
// ======================================================================
const SUPERVISING_MINISTRIES = [
  { code: "MoEYS", name: "Ministry of Education, Youth and Sport" },
  { code: "MoLVT", name: "Ministry of Labour and Vocational Training" },
  { code: "MoH",   name: "Ministry of Health" },
  { code: "MAFF",  name: "Ministry of Agriculture, Forestry and Fisheries" },
  { code: "MCFA",  name: "Ministry of Culture and Fine Arts" },
  { code: "MEF",   name: "Ministry of Economy and Finance" },
  { code: "MoND",  name: "Ministry of National Defence" },
  { code: "MoI",   name: "Ministry of Interior" },
];

const DEFAULT_HEIS = [
  { code: "RUPP", name: "Royal University of Phnom Penh", nameKh: "សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ", ministry: "MoEYS", type: "Public" },
  { code: "ITC",  name: "Institute of Technology of Cambodia", nameKh: "វិទ្យាស្ថានបច្ចេកវិទ្យាកម្ពុជា", ministry: "MoEYS", type: "Public" },
  { code: "RULE", name: "Royal University of Law and Economics", nameKh: "សាកលវិទ្យាល័យភូមិន្ទនីតិសាស្ត្រ និងវិទ្យាសាស្ត្រសេដ្ឋកិច្ច", ministry: "MoEYS", type: "Public" },
  { code: "RUA",  name: "Royal University of Agriculture", nameKh: "សាកលវិទ្យាល័យភូមិន្ទកសិកម្ម", ministry: "MAFF", type: "Public" },
  { code: "RUFA", name: "Royal University of Fine Arts", nameKh: "សាកលវិទ្យាល័យភូមិន្ទវិចិត្រសិល្បៈ", ministry: "MCFA", type: "Public" },
  { code: "NIE",  name: "National Institute of Education", nameKh: "វិទ្យាស្ថានជាតិអប់រំ", ministry: "MoEYS", type: "Public" },
  { code: "UHS",  name: "University of Health Sciences", nameKh: "សាកលវិទ្យាល័យវិទ្យាសាស្ត្រសុខាភិបាល", ministry: "MoH", type: "Public" },
  { code: "NUM",  name: "National University of Management", nameKh: "សាកលវិទ្យាល័យជាតិគ្រប់គ្រង", ministry: "MoEYS", type: "Public" },
  { code: "NUBB", name: "National University of Battambang", nameKh: "សាកលវិទ្យាល័យជាតិបាត់ដំបង", ministry: "MoEYS", type: "Public" },
  { code: "SRU",  name: "Svay Rieng University", nameKh: "សាកលវិទ្យាល័យស្វាយរៀង", ministry: "MoEYS", type: "Public" },
  { code: "NPIC", name: "National Polytechnic Institute of Cambodia", nameKh: "វិទ្យាស្ថានជាតិពហុបច្ចេកទេសកម្ពុជា", ministry: "MoLVT", type: "Public" },
  { code: "UC",   name: "University of Cambodia", nameKh: "", ministry: "MoEYS", type: "Private" },
  { code: "PUC",  name: "Paññāsāstra University of Cambodia", nameKh: "", ministry: "MoEYS", type: "Private" },
  { code: "AUPP", name: "American University of Phnom Penh", nameKh: "", ministry: "MoEYS", type: "Private" },
  { code: "BBU",  name: "Build Bright University", nameKh: "", ministry: "MoEYS", type: "Private" },
];

// Workflow states — inspired by DSpace's review workflow, adapted for MoEYS oversight
const STATUSES = {
  draft:             { label: "Draft",             color: "#857A70", bg: "rgba(133,122,112,0.12)", desc: "Being prepared by HEI" },
  submitted:         { label: "Submitted",         color: "#2F6F9A", bg: "rgba(47,111,154,0.12)",  desc: "Awaiting MoEYS review" },
  under_review:      { label: "Under Review",      color: "#8A5A00", bg: "rgba(138,90,0,0.12)",    desc: "Being reviewed by MoEYS" },
  revision_requested:{ label: "Revision Requested",color: "#C07020", bg: "rgba(192,112,32,0.14)",  desc: "Sent back to HEI for changes" },
  approved:          { label: "Approved",          color: "#3D6B4A", bg: "rgba(61,107,74,0.14)",   desc: "Approved, pending publication" },
  published:         { label: "Published",         color: "#3D6B4A", bg: "rgba(61,107,74,0.14)",   desc: "Live in the public archive" },
  rejected:          { label: "Rejected",          color: "#A83232", bg: "rgba(168,50,50,0.12)",   desc: "Refused by MoEYS" },
  embargoed:         { label: "Embargoed",         color: "#7A1E2E", bg: "rgba(122,30,46,0.12)",   desc: "Approved, held until future date" },
  withdrawn:         { label: "Withdrawn",         color: "#857A70", bg: "rgba(133,122,112,0.12)", desc: "Retracted by HEI" },
};

// Quality-control checklist (synthesized from Flinders copyright review + DSpace QA + ETD-MS + plagiarism norms)
const QC_CHECKLIST = [
  { id: "metadata",  label: "Metadata completeness — title, author, HEI, faculty, year, supervisor all supplied" },
  { id: "bilingual", label: "Titles provided in both English and Khmer (or justified otherwise)" },
  { id: "abstract",  label: "Abstract is present, coherent, and representative of the work" },
  { id: "keywords",  label: "At least three keywords identified and appropriate" },
  { id: "ministry",  label: "Correct HEI and supervising ministry assigned" },
  { id: "similarity",label: "Plagiarism similarity report attached; score within acceptable threshold (≤15–20%)" },
  { id: "copyright", label: "Copyright clearance confirmed for included third-party material" },
  { id: "consent",   label: "Author consent for dissemination (or embargo formally declared)" },
  { id: "format",    label: "PDF meets technical standards (searchable text, legible figures)" },
  { id: "ethics",    label: "Ethics approval referenced if research involves human or animal subjects" },
];

// Sample theses illustrating every workflow state
const SAMPLE_THESES = [
  {
    id: "s1", status: "published",
    titleEn: "Impact of Climate Change on Rice Yields in the Tonle Sap Basin", titleKh: "",
    author: "Sok Vannak", authorKh: "",
    hei: "RUA", faculty: "Faculty of Agronomy", degree: "PhD", year: 2023,
    supervisor: "Dr. Chheng Piseth",
    abstract: "This dissertation investigates the effects of shifting monsoon patterns and rising temperatures on wet-season rice productivity across four provinces bordering the Tonle Sap. Combining farmer surveys with satellite yield data from 2005 to 2022, the study identifies critical thresholds beyond which adaptation measures become necessary.",
    keywords: ["climate change", "rice", "Tonle Sap", "agriculture", "adaptation"],
    language: "English", callNumber: "RUA-PHD-2023-014",
    similarityScore: 8, accessLevel: "open",
    submittedBy: "rua.grad@rua.edu.kh", reviewedBy: "admin@moeys.gov.kh",
    submittedAt: "2024-01-02", approvedAt: "2024-01-12", publishedAt: "2024-01-15",
    history: [
      { at: "2024-01-02", by: "RUA Graduate Office", action: "Submitted to MoEYS for review" },
      { at: "2024-01-05", by: "Dr. Vanna Chea (DRI)", action: "Claimed for review" },
      { at: "2024-01-12", by: "Dr. Vanna Chea (DRI)", action: "Approved — all QC items verified" },
      { at: "2024-01-15", by: "System", action: "Published to public archive" },
    ],
  },
  {
    id: "s2", status: "under_review",
    titleEn: "Machine Learning Approaches to Khmer Text Classification", titleKh: "",
    author: "Phal Sreypov", authorKh: "",
    hei: "ITC", faculty: "Department of Information and Communication Engineering",
    degree: "Master", year: 2024, supervisor: "Dr. Ros Sokhem",
    abstract: "A comparative study of transformer-based models fine-tuned on a newly compiled corpus of 50,000 Khmer news articles. The work introduces a benchmark dataset and proposes a segmentation pipeline that improves classification F1 by 7.2 points over prior baselines.",
    keywords: ["machine learning", "NLP", "Khmer language", "text classification"],
    language: "English", callNumber: "ITC-MSC-2024-087",
    similarityScore: 12, accessLevel: "open",
    submittedBy: "itc.postgrad@itc.edu.kh",
    submittedAt: "2026-04-08",
    history: [
      { at: "2026-04-08", by: "ITC Postgraduate Office", action: "Submitted to MoEYS for review" },
      { at: "2026-04-15", by: "Dr. Vanna Chea (DRI)", action: "Claimed for review" },
    ],
  },
  {
    id: "s3", status: "submitted",
    titleEn: "Legal Framework for Foreign Direct Investment in the SEZs of Cambodia",
    titleKh: "", author: "Chan Dara", authorKh: "",
    hei: "RULE", faculty: "Faculty of Law", degree: "Master", year: 2025,
    supervisor: "Prof. Keo Puthea",
    abstract: "An examination of the regulatory regime governing Special Economic Zones, with particular attention to tax incentive structures, labor provisions, and dispute resolution mechanisms. The thesis compares Cambodian practice against ASEAN counterparts and proposes reforms.",
    keywords: ["FDI", "SEZ", "investment law", "ASEAN"],
    language: "English", callNumber: "RULE-LLM-2025-031",
    similarityScore: 14, accessLevel: "open",
    submittedBy: "rule.admin@rule.edu.kh",
    submittedAt: "2026-04-20",
    history: [
      { at: "2026-04-20", by: "RULE Administration", action: "Submitted to MoEYS for review" },
    ],
  },
  {
    id: "s4", status: "published",
    titleEn: "Reading Comprehension Strategies in Cambodian Primary Schools",
    titleKh: "យុទ្ធសាស្ត្រអានយល់នៅសាលាបឋមសិក្សានៅកម្ពុជា",
    author: "Mao Bopha", authorKh: "ម៉ៅ បុប្ផា",
    hei: "NIE", faculty: "Department of Education", degree: "PhD", year: 2024,
    supervisor: "Dr. Tan Sreyleak",
    abstract: "A mixed-methods investigation of reading instruction in grades 3–6 across urban and rural schools. Classroom observations and student assessments reveal systematic gaps in inferential comprehension. The study proposes a scaffolded instructional model validated through a six-month intervention.",
    keywords: ["education", "literacy", "primary school", "reading"],
    language: "Khmer", callNumber: "NIE-PHD-2024-009",
    similarityScore: 6, accessLevel: "open",
    submittedBy: "nie.grad@nie.edu.kh", reviewedBy: "admin@moeys.gov.kh",
    submittedAt: "2024-06-10", approvedAt: "2024-06-24", publishedAt: "2024-07-01",
    history: [
      { at: "2024-06-10", by: "NIE Graduate Office", action: "Submitted to MoEYS for review" },
      { at: "2024-06-24", by: "Dr. Vanna Chea (DRI)", action: "Approved — all QC items verified" },
      { at: "2024-07-01", by: "System", action: "Published to public archive" },
    ],
  },
  {
    id: "s5", status: "revision_requested",
    titleEn: "Urban Heat Island Effects in Phnom Penh: A GIS-Based Analysis",
    titleKh: "", author: "Lim Chanthy", authorKh: "",
    hei: "RUPP", faculty: "Department of Geography", degree: "Master", year: 2025,
    supervisor: "Dr. Men Sovan",
    abstract: "Using Landsat thermal imagery from 2015 to 2024, this study quantifies surface temperature anomalies across Phnom Penh districts and correlates them with land-cover change. Findings inform green-infrastructure recommendations for municipal planners.",
    keywords: ["urban heat", "GIS", "Phnom Penh", "remote sensing"],
    language: "English", callNumber: "RUPP-MSC-2025-102",
    similarityScore: 22, accessLevel: "open",
    submittedBy: "rupp.dean@rupp.edu.kh",
    submittedAt: "2026-03-15",
    history: [
      { at: "2026-03-15", by: "RUPP Dean's Office", action: "Submitted to MoEYS for review" },
      { at: "2026-03-22", by: "Dr. Vanna Chea (DRI)", action: "Claimed for review" },
      { at: "2026-04-02", by: "Dr. Vanna Chea (DRI)", action: "Requested revision — similarity score (22%) above acceptable threshold; sections 3.2 and 4.1 require rewriting with proper citation. Ethics statement also missing." },
    ],
    reviewFeedback: "Similarity score (22%) is above the acceptable threshold. Please rewrite sections 3.2 and 4.1 with proper citation. The ethics statement for the fieldwork phase is also missing — please add it before resubmission.",
  },
  {
    id: "s6", status: "embargoed",
    titleEn: "Pharmaceutical Regulation and Generic Drug Access in Cambodia",
    titleKh: "", author: "Keo Sophea", authorKh: "",
    hei: "UHS", faculty: "Faculty of Pharmacy", degree: "PhD", year: 2024,
    supervisor: "Prof. Chea Rotha",
    abstract: "A policy analysis of Cambodia's pharmaceutical regulatory landscape, focusing on generic drug approval pathways, pricing mechanisms, and equity of access. Includes original interviews with regulators, manufacturers, and patient advocacy groups.",
    keywords: ["pharmacy", "regulation", "health policy", "generics"],
    language: "English", callNumber: "UHS-PHD-2024-019",
    similarityScore: 9, accessLevel: "embargoed", embargoUntil: "2027-01-01",
    submittedBy: "uhs.research@uhs.edu.kh", reviewedBy: "admin@moeys.gov.kh",
    submittedAt: "2024-10-02", approvedAt: "2024-10-18",
    history: [
      { at: "2024-10-02", by: "UHS Research Office", action: "Submitted to MoEYS for review" },
      { at: "2024-10-18", by: "Dr. Vanna Chea (DRI)", action: "Approved with embargo until 2027-01-01 (pending journal publication)" },
    ],
  },
  // --- Historical records (2019–2025) to give the dashboard meaningful shape ---
  ...[
    { y: 2019, hei: "RUPP", deg: "Master", fac: "Faculty of History", t: "Memory and Identity: Oral Histories of Khmer Rouge Survivors in Kampong Cham", a: "Hun Sreypov", s: "Dr. Thuch Phaly", lang: "Khmer", kw: ["oral history","memory","Khmer Rouge","Kampong Cham"], sim: 7 },
    { y: 2019, hei: "ITC",  deg: "Master", fac: "Faculty of Civil Engineering", t: "Structural Performance of Bamboo-Reinforced Concrete for Rural Housing", a: "Chea Bora", s: "Dr. Lim Panha", lang: "English", kw: ["structural engineering","bamboo","rural housing","construction"], sim: 10 },
    { y: 2019, hei: "RULE", deg: "Master", fac: "Faculty of Law", t: "The Application of Customary Land Rights under Cambodian Land Law", a: "Oum Kimlay", s: "Prof. Heng Monychenda", lang: "English", kw: ["land law","customary rights","property"], sim: 12 },
    { y: 2020, hei: "NIE",  deg: "PhD",    fac: "Department of Educational Leadership", t: "Teacher Professional Development in Post-Conflict Cambodia: A Longitudinal Study", a: "Prak Sothea", s: "Dr. Khieu Sarin", lang: "English", kw: ["teacher education","professional development","post-conflict"], sim: 8 },
    { y: 2020, hei: "NUM",  deg: "Master", fac: "Faculty of Business Administration", t: "Microfinance Repayment Behavior in Rural Kampong Thom", a: "Ouk Navy", s: "Dr. Seng Chanthol", lang: "English", kw: ["microfinance","rural finance","repayment"], sim: 11 },
    { y: 2020, hei: "RUPP", deg: "Master", fac: "Department of Sociology", t: "Gendered Labor Migration from Prey Veng to Thailand", a: "Nhem Sreyroth", s: "Dr. Hem Sochenda", lang: "English", kw: ["migration","gender","labor","Prey Veng"], sim: 9 },
    { y: 2021, hei: "UHS",  deg: "PhD",    fac: "Faculty of Medicine", t: "Maternal Mortality Trends in Northeastern Provinces 2010–2020", a: "Chem Dany", s: "Prof. Ly Sovann", lang: "English", kw: ["maternal health","mortality","public health","epidemiology"], sim: 6 },
    { y: 2021, hei: "RUA",  deg: "Master", fac: "Faculty of Agronomy", t: "Integrated Pest Management in Cassava Production", a: "San Chanthou", s: "Dr. Peou Samnang", lang: "English", kw: ["cassava","IPM","pest management","agriculture"], sim: 13 },
    { y: 2021, hei: "ITC",  deg: "Master", fac: "Department of Information and Communication Engineering", t: "Performance Evaluation of 4G Networks in Secondary Cambodian Cities", a: "Kong Visal", s: "Dr. Ros Sokhem", lang: "English", kw: ["telecommunications","4G","network performance"], sim: 10 },
    { y: 2022, hei: "RUPP", deg: "PhD",    fac: "Faculty of Economics", t: "Trade Liberalization and Rice Farmer Welfare in Cambodia", a: "Mao Sophal", s: "Prof. Aun Porn Moniroth", lang: "English", kw: ["trade","rice","agriculture","welfare economics"], sim: 7 },
    { y: 2022, hei: "RUFA", deg: "Master", fac: "Department of Sculpture", t: "Preservation of Apsara Iconography in Contemporary Khmer Sculpture", a: "Pen Sambath", s: "Prof. Him Sophy", lang: "Khmer", kw: ["Apsara","iconography","heritage","sculpture"], sim: 8 },
    { y: 2022, hei: "NUM",  deg: "Master", fac: "Department of Accounting", t: "Audit Quality in the Cambodian SME Sector", a: "Lay Vuthy", s: "Dr. Seng Chanthol", lang: "English", kw: ["audit","SME","accounting","corporate governance"], sim: 14 },
    { y: 2023, hei: "NIE",  deg: "Master", fac: "Early Childhood Education", t: "Early Childhood Literacy Outcomes in Battambang Pre-Schools", a: "Srun Sreymom", s: "Dr. Tan Sreyleak", lang: "Khmer", kw: ["early childhood","literacy","pre-school","Battambang"], sim: 9 },
    { y: 2023, hei: "SRU",  deg: "Master", fac: "Department of Environmental Science", t: "Water Quality Assessment of Tributaries in Svay Rieng Province", a: "Mao Piseth", s: "Dr. Kong Dara", lang: "English", kw: ["water quality","environment","Svay Rieng"], sim: 11 },
    { y: 2023, hei: "UHS",  deg: "Master", fac: "Faculty of Nursing", t: "Hospital-Acquired Infections at Provincial Referral Hospitals", a: "Chan Sopheak", s: "Dr. Chhour Y Meng", lang: "English", kw: ["nursing","infection control","hospital care"], sim: 10 },
    { y: 2024, hei: "NUBB", deg: "Master", fac: "Faculty of Economics", t: "Cross-Border Trade Economics of Poipet", a: "Ly Sokhom", s: "Dr. Vong Pheakdey", lang: "English", kw: ["border trade","economics","Poipet","ASEAN"], sim: 12 },
    { y: 2024, hei: "RULE", deg: "PhD",    fac: "Faculty of Law", t: "Constitutional Reform and the Development of the Rule of Law in Cambodia", a: "Phoung Sophanna", s: "Prof. Keo Puthea", lang: "English", kw: ["constitutional law","rule of law","governance"], sim: 8 },
    { y: 2024, hei: "ITC",  deg: "PhD",    fac: "Faculty of Civil Engineering", t: "Earthquake-Resistant Design Principles for Cambodian Heritage Monuments", a: "Sok Pheakdey", s: "Dr. Lim Panha", lang: "English", kw: ["seismic engineering","heritage","Angkor","structures"], sim: 9 },
  ].map((r, i) => ({
    id: `h${i+1}`, status: "published",
    titleEn: r.t, titleKh: "",
    author: r.a, authorKh: "",
    hei: r.hei, faculty: r.fac, degree: r.deg, year: r.y,
    supervisor: r.s,
    abstract: "Full abstract in the published record. Seeded for dashboard demonstration.",
    keywords: r.kw, language: r.lang,
    callNumber: `${r.hei}-${r.deg === "PhD" ? "PHD" : "MSC"}-${r.y}-${String(i+100).slice(-3)}`,
    similarityScore: r.sim, accessLevel: "open",
    submittedBy: `${r.hei.toLowerCase()}.admin@${r.hei.toLowerCase()}.edu.kh`,
    reviewedBy: "admin@moeys.gov.kh",
    submittedAt: `${r.y}-05-01`, approvedAt: `${r.y}-05-20`, publishedAt: `${r.y}-06-01`,
    history: [
      { at: `${r.y}-05-01`, by: `${r.hei} Office`, action: "Submitted to MoEYS for review" },
      { at: `${r.y}-05-20`, by: "Dr. Vanna Chea (DRI)", action: "Approved — all QC items verified" },
      { at: `${r.y}-06-01`, by: "System", action: "Published to public archive" },
    ],
  })),
];

// ======================================================================
// STORAGE
// ======================================================================
const STORAGE_THESES = "moeys_thesis_theses_v2";
const STORAGE_HEIS = "moeys_thesis_heis_v2";
const STORAGE_ROLE = "moeys_thesis_role_v2";

// Phase 1 storage: browser localStorage. Phase 2 will replace this with a Postgres-backed API.
async function sGet(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(key);
    if (v) return JSON.parse(v);
  } catch (e) { /* missing or unparseable */ }
  return fallback;
}
async function sSet(key, val) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(val)); }
  catch (e) { console.error("Storage set failed:", key, e); }
}

// ======================================================================
// MAIN APP
// ======================================================================
export default function AppClient({ initialTheses, initialHeis, currentUser, initialQuery }) {
  const fallbackHei = initialHeis?.[0]?.code || "RUPP";
  // Role + heiContext come from the authenticated session.
  // - Anonymous visitor (currentUser === null): role="public", read-only catalogue
  // - Admin: keeps the role switcher to preview each role
  // - Everyone else: locked to their assigned role + HEI
  const isAuthenticated = !!currentUser;
  const isAdmin = currentUser?.role === "admin";
  const [role, setRole] = useState(currentUser?.role || "public");
  const [heiContext, setHeiContext] = useState(currentUser?.heiCode || fallbackHei);
  const [theses, setTheses] = useState(initialTheses || []);
  const [heis, setHeis] = useState(initialHeis?.length ? initialHeis : DEFAULT_HEIS);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("browse");
  const [detailId, setDetailId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [submittedTitle, setSubmittedTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // Restore role/heiContext from localStorage only for admin previewing —
    // everyone else gets the values that came in as a server prop and
    // shouldn't be able to switch roles.
    if (!isAdmin) return;
    (async () => {
      const r = await sGet(STORAGE_ROLE, { role: currentUser?.role || "public", heiContext: currentUser?.heiCode || fallbackHei });
      if (r?.role) setRole(r.role);
      if (r?.heiContext) setHeiContext(r.heiContext);
    })();
  }, [isAdmin]);

  useEffect(() => {
    // Default view changes per role
    if (role === "public") setView("browse");
    else if (role === "hei") setView("hei_dashboard");
    else if (role === "reviewer") setView("review_queue");
    else if (role === "admin") setView("dashboard");
    else if (role === "minister") setView("dashboard");
  }, [role]);

  const showToast = (msg, kind = "success") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2800);
  };

  const setRoleAndSave = (r, h) => {
    setRole(r);
    if (h) setHeiContext(h);
    sSet(STORAGE_ROLE, { role: r, heiContext: h || heiContext });
  };

  // -- Write operations --------------------------------------------------
  const saveThesis = async (data, opts = {}) => {
    let updated;
    if (data.id && theses.some(t => t.id === data.id)) {
      updated = theses.map(t => t.id === data.id ? data : t);
    } else {
      const newItem = {
        ...data,
        id: `t_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      };
      updated = [newItem, ...theses];
    }
    setTheses(updated);
    await sSet(STORAGE_THESES, updated);
    if (opts.toast) showToast(opts.toast);
  };

  // Build the JSON payload sent to POST /api/theses. The form's `data` object
  // matches the prototype's shape; the server adapts it to the DB schema.
  const buildThesisPayload = (data, intent) => ({
    intent,
    titleEn: data.titleEn,
    titleKh: data.titleKh,
    author: data.author,
    authorEmail: data.authorEmail || undefined,
    hei: data.hei,
    faculty: data.faculty,
    degree: data.degree,
    year: data.year,
    supervisor: data.supervisor,
    language: data.language,
    abstract: data.abstract,
    keywords: data.keywords,
    license: data.license,
    releasePolicy: data.releasePolicy,
    releaseReason: data.releaseReason || undefined,
    releaseJustification: data.releaseJustification || undefined,
    licenseAcknowledged: !!data.licenseAcknowledged,
    authorshipConfirmed: !!data.authorshipConfirmed,
    externalInstitutionName: data.externalInstitutionName || undefined,
    externalCountry: data.externalCountry || undefined,
  });

  const submitThesis = async (data) => {
    if (submitting) return; // guard against double-click while in flight
    setSubmitting(true);

    // Resubmission (REVISION_REQUESTED) or draft promotion (DRAFT) — both
    // route to the same /resubmit endpoint, which also handles the
    // "DRAFT → UNDER_REVIEW" transition. The form's `initial` prop sets
    // data.id when an existing thesis is being edited.
    const isResubmission =
      !!data.id && (data.status === "revision_requested" || data.status === "draft");
    let thesisId = isResubmission ? data.id : null;

    try {
      // 1. Find the actual File object the user selected (held in session cache)
      const fileMeta = data.files?.thesisMaster;
      const file = fileMeta?.id ? fileBlobs.get(fileMeta.id) : null;
      if (!file) {
        showToast("Thesis PDF is missing — please re-attach it", "error");
        return;
      }

      // 2. Create or update the Thesis row in DB (status flips to UNDER_REVIEW)
      const endpoint = isResubmission ? `/api/theses/${thesisId}/resubmit` : "/api/theses";
      const createRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildThesisPayload(data, "submit")),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.error || `Submit failed (${createRes.status})`);
      }
      const created = await createRes.json();
      thesisId = created.id;

      // 3. Ask the server for a presigned R2 upload URL
      const urlRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thesisId, contentType: "application/pdf" }),
      });
      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({}));
        throw new Error(err.error || `Upload URL failed (${urlRes.status})`);
      }
      const { url: uploadUrl, key } = await urlRes.json();

      // 4. PUT the PDF directly to R2 (does not pass through Vercel)
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`R2 upload failed (${putRes.status})`);
      }

      // 5. Tell the server we're done so it sets pdfFileKey on the row
      const confirmRes = await fetch(`/api/theses/${thesisId}/confirm-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfFileKey: key }),
      });
      if (!confirmRes.ok) {
        const err = await confirmRes.json().catch(() => ({}));
        throw new Error(err.error || `Confirm failed (${confirmRes.status})`);
      }

      // Success — flow completed cleanly, don't delete the row in the catch
      thesisId = null;
      showToast("Thesis submitted to MoEYS for review");
      setEditingId(null);
      setSubmittedTitle(data.titleEn);
      setView("hei_submitted");
    } catch (e) {
      // Self-heal: if a fresh row was created (not a resubmission of an
      // existing one) before the failure, drop it so the user doesn't end
      // up with an orphan "submitted" thesis with no PDF. Never delete on
      // resubmission failure — the existing row pre-dates this attempt.
      if (thesisId && !isResubmission) {
        try {
          await fetch(`/api/theses/${thesisId}`, { method: "DELETE" });
        } catch { /* best-effort cleanup; ignore */ }
      }
      showToast(`Submission failed: ${e.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const saveDraft = async (data) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // If we're editing an existing draft, update it in place. Otherwise
      // create a new draft row. Without this, "Continue → Save as draft"
      // would orphan the original draft and create a duplicate.
      const isExistingDraft = !!data.id && data.status === "draft";
      const endpoint = isExistingDraft
        ? `/api/theses/${data.id}/resubmit`
        : "/api/theses";
      const createRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildThesisPayload(data, "draft")),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.error || `Save failed (${createRes.status})`);
      }
      showToast("Draft saved");
      setEditingId(null);
      setView("hei_dashboard");
      setTimeout(() => window.location.reload(), 700);
    } catch (e) {
      showToast(`Save failed: ${e.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const reviewDecision = async (id, decision, feedback, checklistState) => {
    const now = new Date().toISOString().slice(0,10);
    const reviewer = "MoEYS Reviewer";

    // "claim" is UI-only — the schema has no claimed-by-reviewer state, and
    // until Phase 3 auth there's no actual reviewer identity to attach.
    // Just update local state and exit.
    if (decision === "claim") {
      const t = theses.find(x => x.id === id);
      if (!t) return;
      const updated = theses.map(x => x.id === id ? {
        ...x,
        status: "under_review",
        reviewedBy: reviewer,
        history: [...(x.history || []), { at: now, by: reviewer, action: "Claimed for review" }],
      } : x);
      setTheses(updated);
      showToast("Thesis claimed for review");
      return;
    }

    // approve / revision / reject — persist to DB so the decision survives
    // a refresh (force-dynamic re-fetches state from Neon on every load).
    try {
      const res = await fetch(`/api/theses/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, feedback }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Review failed (${res.status})`);
      }
      const msgMap = {
        approve: "Thesis approved",
        revision: "Revision requested — sent back to HEI",
        reject: "Thesis rejected",
      };
      showToast(msgMap[decision] || "Decision recorded");
      setReviewingId(null);
      // Reload so SSR picks up the new status from the DB
      setTimeout(() => window.location.reload(), 700);
    } catch (e) {
      showToast(`Decision failed: ${e.message}`, "error");
    }
  };

  const deleteThesis = async (id) => {
    if (!confirm("Delete this record permanently? This will also remove the PDF from storage and cannot be undone.")) return;
    try {
      const res = await fetch(`/api/theses/${id}?mode=admin`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Delete failed (${res.status})`);
      }
      showToast("Record deleted", "warn");
      // Reload so SSR re-fetches the catalogue without the deleted row
      setTimeout(() => window.location.reload(), 700);
    } catch (e) {
      showToast(`Delete failed: ${e.message}`, "error");
    }
  };

  const addHei = async (hei) => {
    if (heis.some(h => h.code.toLowerCase() === hei.code.toLowerCase())) {
      showToast("HEI code already exists", "error"); return false;
    }
    const updated = [...heis, hei];
    setHeis(updated); await sSet(STORAGE_HEIS, updated);
    showToast("Institution added"); return true;
  };

  const editingThesis = editingId ? theses.find(t => t.id === editingId) : null;
  const detailThesis = detailId ? theses.find(t => t.id === detailId) : null;
  const reviewingThesis = reviewingId ? theses.find(t => t.id === reviewingId) : null;

  return (
    <div className="min-h-screen w-full" style={{ background: "var(--bg)" }}>
      <StyleTag />
      <RoleBanner role={role} heiContext={heiContext} heis={heis} onChangeRole={setRoleAndSave} currentUser={currentUser} isAdmin={isAdmin} isAuthenticated={isAuthenticated} />
      <Header role={role} view={view} setView={setView} theses={theses} heiContext={heiContext}/>

      <main className="max-w-7xl mx-auto px-6 md:px-10 pb-24">
        {loading ? (
          <div className="py-32 text-center">
            <div className="font-display italic text-2xl" style={{ color: "var(--ink-faint)" }}>Loading the repository…</div>
          </div>
        ) : (
          <>
            {view === "browse" && (
              <BrowseView theses={theses.filter(t => t.status === "published" || t.status === "embargoed")} heis={heis} onOpenDetail={setDetailId} publicMode={role === "public"} initialQuery={initialQuery}/>
            )}
            {view === "hei_dashboard" && role === "hei" && (
              <HEIDashboard
                theses={theses.filter(t => t.hei === heiContext)}
                hei={heis.find(h => h.code === heiContext)}
                onSubmitNew={() => { setEditingId(null); setView("hei_submit"); }}
                onEdit={(id) => { setEditingId(id); setView("hei_submit"); }}
                onOpenDetail={setDetailId}
              />
            )}
            {view === "hei_submit" && role === "hei" && (
              <SubmissionForm
                heis={heis}
                heiContext={heiContext}
                onSaveDraft={saveDraft}
                onSubmit={submitThesis}
                onCancel={() => { setEditingId(null); setView("hei_dashboard"); }}
                initial={editingThesis}
                submitting={submitting}
              />
            )}
            {view === "hei_submitted" && role === "hei" && (
              <SubmissionConfirmation
                title={submittedTitle}
                onViewSubmissions={() => { setSubmittedTitle(""); setView("hei_dashboard"); window.location.reload(); }}
                onBrowse={() => { setSubmittedTitle(""); setView("browse"); window.location.reload(); }}
              />
            )}
            {view === "review_queue" && role === "reviewer" && (
              <ReviewQueue
                theses={theses}
                heis={heis}
                onOpenReview={(id) => setReviewingId(id)}
                onOpenDetail={setDetailId}
              />
            )}
            {view === "admin_records" && role === "admin" && (
              <AdminRecords theses={theses} heis={heis}
                onEdit={(id) => { setEditingId(id); setView("hei_submit"); setRole("hei"); setHeiContext(theses.find(t=>t.id===id)?.hei || heiContext); }}
                onDelete={deleteThesis}
                onOpenDetail={setDetailId}
              />
            )}
            {view === "admin_heis" && role === "admin" && (
              <AdminHeis heis={heis} showToast={showToast}/>
            )}
            {view === "admin_users" && role === "admin" && (
              <AdminUsers heis={heis} showToast={showToast}/>
            )}
            {view === "dashboard" && (role === "admin" || role === "minister") && (
              <DashboardView theses={theses} heis={heis} role={role}/>
            )}
          </>
        )}
      </main>

      {detailThesis && (
        <DetailModal
          thesis={detailThesis}
          hei={heis.find(h => h.code === detailThesis.hei)}
          ministry={SUPERVISING_MINISTRIES.find(m => m.code === heis.find(h => h.code === detailThesis.hei)?.ministry)}
          role={role}
          onClose={() => setDetailId(null)}
        />
      )}

      {reviewingThesis && role === "reviewer" && (
        <ReviewPanel
          thesis={reviewingThesis}
          hei={heis.find(h => h.code === reviewingThesis.hei)}
          onDecision={reviewDecision}
          onClose={() => setReviewingId(null)}
        />
      )}

      {toast && (
        <div className={`toast ${toast.kind}`}>
          {toast.kind === "error" ? <AlertCircle size={16}/> : <Check size={16}/>}
          {toast.msg}
        </div>
      )}

      <Footer />
    </div>
  );
}

// ======================================================================
// STYLE — scholarly editorial with institutional gravitas
// ======================================================================
function StyleTag() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=Manrope:wght@300;400;500;600;700&family=Noto+Sans+Khmer:wght@400;500;600&display=swap');
      :root {
        /* Cambodian palette — aligned with /preview-colors and the landing page.
           Primary is the flag-derived royal navy (PMS 293), accent is royal gold
           from the Khmer royal arms / Angkor stonework. Seal red is held in
           reserve for danger states only — see palette research notes. */
        --bg: #F7F1E1; --bg-card: #FBF7EC; --bg-deep: #ECE3CA;
        --ink: #2A2018; --ink-soft: #5A4A38; --ink-faint: #8A7860;
        --line: #E3D9C2; --line-strong: #C9BDA0;
        --accent: #0A2A6B; --accent-soft: #1F3A7B; --accent-ink: #FBF7EC;
        --gold: #A8761A; --gold-soft: #C4944A;
        --green: #2E6B3E; --red: #A41E2C; --blue: #2F6F9A; --orange: #B8771A;
        --shadow: 0 1px 2px rgba(42,32,24,.04), 0 2px 6px rgba(42,32,24,.03);
        --shadow-lg: 0 4px 12px rgba(42,32,24,.06), 0 12px 32px rgba(42,32,24,.08);
      }
      html, body, #root { background: var(--bg); }
      body { font-family: 'Manrope', -apple-system, sans-serif; color: var(--ink); }
      .font-display { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; letter-spacing: -0.01em; }
      .font-body { font-family: 'Manrope', sans-serif; }
      .font-khmer { font-family: 'Noto Sans Khmer', 'Manrope', sans-serif; }
      .font-mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }

      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 10px; border: 2px solid var(--bg); }
      ::-webkit-scrollbar-thumb:hover { background: var(--ink-faint); }

      .field { width: 100%; padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--line); border-radius: 6px; color: var(--ink); font-size: 14px; font-family: 'Manrope', sans-serif; transition: border-color .15s, box-shadow .15s; }
      .field:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(122,30,46,0.08); }
      .field::placeholder { color: var(--ink-faint); }
      textarea.field { resize: vertical; min-height: 100px; }

      .btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all .15s; border: 1px solid transparent; letter-spacing: 0.01em; font-family: 'Manrope', sans-serif; }
      .btn-primary { background: var(--accent); color: var(--accent-ink); }
      .btn-primary:hover { background: var(--accent-soft); }
      .btn-ghost { background: transparent; color: var(--ink-soft); border-color: var(--line-strong); }
      .btn-ghost:hover { background: var(--bg-card); color: var(--ink); }
      .btn-success { background: var(--green); color: #fff; }
      .btn-success:hover { opacity: 0.9; }
      .btn-warn { background: var(--orange); color: #fff; }
      .btn-warn:hover { opacity: 0.9; }
      .btn-danger { background: transparent; color: var(--red); border-color: transparent; }
      .btn-danger:hover { background: rgba(168,50,50,0.08); }
      .btn-reject { background: var(--red); color: #fff; }
      .btn-reject:hover { opacity: 0.9; }

      .chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 3px; font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
      .chip-phd { background: rgba(122,30,46,0.1); color: var(--accent); }
      .chip-master { background: rgba(176,133,56,0.15); color: var(--gold); }
      .tag { display: inline-block; padding: 3px 9px; background: var(--bg); border: 1px solid var(--line); border-radius: 999px; font-size: 11px; color: var(--ink-soft); }

      .status-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; letter-spacing: 0.02em; }

      .ornate-divider { display: flex; align-items: center; justify-content: center; gap: 12px; color: var(--gold); font-size: 14px; }
      .ornate-divider::before, .ornate-divider::after { content: ""; flex: 1; height: 1px; background: var(--line-strong); }

      .thesis-card { transition: transform .15s ease, box-shadow .15s ease, border-color .15s; }
      .thesis-card:hover { border-color: var(--line-strong); box-shadow: var(--shadow-lg); }

      .nav-tab { padding: 8px 2px; margin-right: 28px; font-size: 13px; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-faint); border-bottom: 2px solid transparent; cursor: pointer; transition: all .15s; }
      .nav-tab:hover { color: var(--ink-soft); }
      .nav-tab.active { color: var(--accent); border-bottom-color: var(--accent); }

      .modal-backdrop { position: fixed; inset: 0; background: rgba(30,26,22,0.55); backdrop-filter: blur(2px); z-index: 40; display: flex; align-items: flex-start; justify-content: center; padding: 40px 16px; overflow-y: auto; animation: fadeIn .15s ease; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .modal-panel { background: var(--bg-card); border-radius: 10px; max-width: 820px; width: 100%; border: 1px solid var(--line); box-shadow: var(--shadow-lg); animation: slideUp .2s ease; }
      .modal-wide { max-width: 1040px; }

      .toast { position: fixed; bottom: 24px; right: 24px; z-index: 50; padding: 12px 18px; border-radius: 6px; background: var(--ink); color: var(--bg-card); font-size: 13px; font-weight: 500; box-shadow: var(--shadow-lg); animation: slideUp .2s ease; display: flex; align-items: center; gap: 10px; }
      .toast.warn { background: var(--gold); }
      .toast.error { background: var(--red); }

      .watermark-number { font-family: 'Fraunces', serif; font-weight: 300; font-variation-settings: "opsz" 144; color: var(--line); user-select: none; }

      .role-banner { border-bottom: 1px solid var(--line); }
      .role-banner.public { background: linear-gradient(to bottom, var(--bg-deep), var(--bg-card)); }
      .role-banner.hei { background: linear-gradient(to bottom, #E8E0D0, var(--bg-card)); }
      .role-banner.reviewer { background: linear-gradient(to bottom, #E3D5C0, var(--bg-card)); }
      .role-banner.admin { background: linear-gradient(to bottom, #DECBCB, var(--bg-card)); }

      .audit-step { position: relative; padding-left: 24px; padding-bottom: 14px; border-left: 1.5px solid var(--line-strong); margin-left: 6px; }
      .audit-step:last-child { border-left-color: transparent; padding-bottom: 0; }
      .audit-step::before { content: ""; position: absolute; left: -6px; top: 2px; width: 10px; height: 10px; border-radius: 50%; background: var(--accent); border: 2px solid var(--bg-card); }
      .audit-step.system::before { background: var(--gold); }

      .check-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; border-radius: 6px; transition: background .15s; cursor: pointer; }
      .check-row:hover { background: var(--bg); }
      .check-row.checked { background: rgba(61,107,74,0.06); }
    `}</style>
  );
}

// ======================================================================
// ROLE BANNER (demo switcher — in production this is tied to SSO)
// ======================================================================
function RoleBanner({ role, heiContext, heis, onChangeRole, currentUser, isAdmin, isAuthenticated }) {
  const roles = [
    { id: "public", label: "Public / Researcher", icon: BookOpen },
    { id: "hei", label: "HEI Submitter", icon: GraduationCap },
    { id: "reviewer", label: "MoEYS Reviewer", icon: Shield },
    { id: "admin", label: "Administrator", icon: Users },
    { id: "minister", label: "Minister", icon: Landmark },
  ];

  return (
    <div className={`role-banner ${role}`}>
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-faint)" }}>
            <span className="font-mono tracking-[0.2em] uppercase" style={{ fontSize: "10px" }}>
              {isAuthenticated ? (isAdmin ? "Viewing as" : "Signed in as") : "Browsing as"}
            </span>
            <span className="font-mono tracking-[0.15em] uppercase font-semibold" style={{ color: "var(--accent)", fontSize: "10px" }}>
              {role === "hei" ? `${heiContext} Submitter` : roles.find(r => r.id === role)?.label}
            </span>
            {currentUser && (
              <span className="ml-2 text-xs" style={{ color: "var(--ink-faint)" }}>
                · {currentUser.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Admins keep the role switcher to preview each role's view.
                Authenticated non-admins are locked to their session role.
                Anonymous visitors stay on "public" — no switching either. */}
            {isAdmin && (
              <div className="flex items-center gap-1 flex-wrap">
                {roles.map(r => {
                  const Icon = r.icon;
                  const active = role === r.id;
                  return (
                    <button key={r.id}
                      onClick={() => onChangeRole(r.id, r.id === "hei" ? heiContext : undefined)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-all"
                      style={{
                        background: active ? "var(--accent)" : "transparent",
                        color: active ? "var(--accent-ink)" : "var(--ink-soft)",
                        border: `1px solid ${active ? "var(--accent)" : "var(--line-strong)"}`,
                        fontWeight: active ? 600 : 400,
                      }}>
                      <Icon size={12}/>
                      {r.label}
                    </button>
                  );
                })}
              </div>
            )}
            {isAuthenticated ? (
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-all"
                style={{
                  background: "transparent",
                  color: "var(--ink-soft)",
                  border: "1px solid var(--line-strong)",
                }}
                title="Sign out">
                Sign out
              </button>
            ) : (
              <a
                href="/sign-in"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-all"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                  border: "1px solid var(--accent)",
                  fontWeight: 600,
                  textDecoration: "none",
                }}>
                Sign in
              </a>
            )}
          </div>
        </div>

        {/* HEI selector only meaningful for admin previewing the HEI role.
            Real HEI Coordinators are locked to their assigned institution. */}
        {role === "hei" && isAdmin && (
          <div className="mt-3 pt-3 flex items-center gap-2 flex-wrap text-xs" style={{ borderTop: "1px dashed var(--line-strong)" }}>
            <span className="font-mono tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)", fontSize: "10px" }}>
              Previewing as HEI:
            </span>
            <select value={heiContext} onChange={e => onChangeRole("hei", e.target.value)}
              className="text-xs px-2 py-1 rounded-md font-mono font-semibold"
              style={{ background: "var(--bg-card)", color: "var(--accent)", border: "1px solid var(--line-strong)" }}>
              {heis.map(h => <option key={h.code} value={h.code}>{h.code} — {h.name}</option>)}
            </select>
            <span className="italic ml-1" style={{ color: "var(--ink-faint)", fontSize: "10px" }}>
              Admin-only — real HEI Coordinators are locked to their own institution.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ======================================================================
// HEADER (adapts title/nav based on role)
// ======================================================================
function Header({ role, view, setView, theses, heiContext }) {
  const publishedCount = theses.filter(t => t.status === "published" || t.status === "embargoed").length;
  const submittedCount = theses.filter(t => t.status === "submitted" || t.status === "under_review").length;
  const myHeiCount = theses.filter(t => t.hei === heiContext).length;

  const counter = role === "reviewer" ? submittedCount : role === "hei" ? myHeiCount : publishedCount;
  const counterLabel = role === "reviewer" ? "awaiting review" : role === "hei" ? `${heiContext} records` : "records published";

  const subtitle = role === "reviewer"
    ? "Department of Research and Innovation — review queue for submitted theses from higher education institutions."
    : role === "hei"
      ? `Submit and track Master's and PhD theses from ${heiContext} through the national quality-assurance workflow.`
      : role === "admin"
        ? "System administration — manage institutions, user accounts, and full records."
        : role === "minister"
          ? "Ministerial overview — aggregate view of graduate research output across the Kingdom of Cambodia."
          : "A unified catalogue of Master's and Doctoral theses from higher education institutions across the Kingdom of Cambodia.";

  return (
    <header className="border-b" style={{ borderColor: "var(--line)", background: "var(--bg-card)" }}>
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-8 pb-4">
        <div className="flex items-start justify-between flex-wrap gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <a href="/" title="Back to landing page" className="inline-block hover:opacity-80 transition-opacity">
                <img src="/moeys-seal.png" alt="MoEYS seal — return to landing page" className="h-10 w-auto" />
              </a>
              <div className="font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: "var(--ink-faint)" }}>
                MoEYS · Department of Research & Innovation
              </div>
            </div>
            <h1 className="font-display text-4xl md:text-5xl" style={{ fontWeight: 400, lineHeight: 1.05 }}>
              <span style={{ fontStyle: "italic", fontWeight: 300 }}>The</span>{" "}
              National Thesis Archive
            </h1>
            <p className="mt-3 text-sm max-w-2xl" style={{ color: "var(--ink-soft)" }}>{subtitle}</p>
          </div>
          <div className="text-right">
            <div className="watermark-number text-[72px] md:text-[96px] leading-none">{String(counter).padStart(3,"0")}</div>
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase -mt-1" style={{ color: "var(--ink-faint)" }}>{counterLabel}</div>
          </div>
        </div>

        <nav className="mt-8 flex items-center flex-wrap">
          {role === "public" && (
            <div className={`nav-tab ${view === "browse" ? "active" : ""}`} onClick={() => setView("browse")}>Search the Archive</div>
          )}
          {role === "hei" && (
            <>
              <div className={`nav-tab ${view === "hei_dashboard" ? "active" : ""}`} onClick={() => setView("hei_dashboard")}>My Submissions</div>
              <div className={`nav-tab ${view === "hei_submit" ? "active" : ""}`} onClick={() => setView("hei_submit")}>Submit New Thesis</div>
              <div className={`nav-tab ${view === "browse" ? "active" : ""}`} onClick={() => setView("browse")}>Public Archive</div>
            </>
          )}
          {role === "reviewer" && (
            <>
              <div className={`nav-tab ${view === "review_queue" ? "active" : ""}`} onClick={() => setView("review_queue")}>Review Queue</div>
              <div className={`nav-tab ${view === "browse" ? "active" : ""}`} onClick={() => setView("browse")}>Public Archive</div>
            </>
          )}
          {role === "admin" && (
            <>
              <div className={`nav-tab ${view === "dashboard" ? "active" : ""}`} onClick={() => setView("dashboard")}>Analytics Dashboard</div>
              <div className={`nav-tab ${view === "admin_records" ? "active" : ""}`} onClick={() => setView("admin_records")}>All Records</div>
              <div className={`nav-tab ${view === "admin_heis" ? "active" : ""}`} onClick={() => setView("admin_heis")}>Institutions</div>
              <div className={`nav-tab ${view === "admin_users" ? "active" : ""}`} onClick={() => setView("admin_users")}>Users</div>
              <div className={`nav-tab ${view === "browse" ? "active" : ""}`} onClick={() => setView("browse")}>Public Archive</div>
            </>
          )}
          {role === "minister" && (
            <>
              <div className={`nav-tab ${view === "dashboard" ? "active" : ""}`} onClick={() => setView("dashboard")}>Analytics Dashboard</div>
              <div className={`nav-tab ${view === "browse" ? "active" : ""}`} onClick={() => setView("browse")}>Public Archive</div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

// ======================================================================
// STATUS BADGE
// ======================================================================
function StatusBadge({ status, size = "md" }) {
  const s = STATUSES[status];
  if (!s) return null;
  const sz = size === "sm" ? "text-[10px] px-2 py-0.5" : "text-[11px] px-2.5 py-1";
  return (
    <span className={`status-badge ${sz}`} style={{ background: s.bg, color: s.color }}>
      <span className="inline-block rounded-full" style={{ width: "6px", height: "6px", background: s.color }}/>
      {s.label}
    </span>
  );
}

// ======================================================================
// PUBLIC BROWSE (shows only published/embargoed-metadata)
// ======================================================================
function BrowseView({ theses, heis, onOpenDetail, publicMode, initialQuery }) {
  // Pre-fill the search box from the ?q= URL parameter so a search
  // submitted from the landing page lands here already filtered.
  const [query, setQuery] = useState(initialQuery || "");
  const [searchIn, setSearchIn] = useState({ title: true, author: true, abstract: true, keywords: true });
  const [selectedHeis, setSelectedHeis] = useState([]);
  const [degree, setDegree] = useState("All");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [language, setLanguage] = useState("All");
  const [selectedFaculty, setSelectedFaculty] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const facultiesInUse = useMemo(() => Array.from(new Set(theses.map(t => t.faculty).filter(Boolean))).sort(), [theses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = theses.filter(t => {
      if (degree !== "All" && t.degree !== degree) return false;
      if (selectedHeis.length && !selectedHeis.includes(t.hei)) return false;
      if (selectedFaculty !== "All" && t.faculty !== selectedFaculty) return false;
      if (language !== "All" && t.language !== language) return false;
      if (yearFrom && t.year < parseInt(yearFrom)) return false;
      if (yearTo && t.year > parseInt(yearTo)) return false;
      if (q) {
        const haystack = [
          searchIn.title ? t.titleEn : "", searchIn.title ? t.titleKh : "",
          searchIn.author ? t.author : "", searchIn.author ? t.authorKh : "",
          searchIn.abstract ? t.abstract : "",
          searchIn.keywords ? (t.keywords || []).join(" ") : "",
        ].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    if (sortBy === "newest") out.sort((a,b) => b.year - a.year);
    else if (sortBy === "oldest") out.sort((a,b) => a.year - b.year);
    else if (sortBy === "title") out.sort((a,b) => (a.titleEn || "").localeCompare(b.titleEn || ""));
    else if (sortBy === "author") out.sort((a,b) => (a.author || "").localeCompare(b.author || ""));
    return out;
  }, [theses, query, searchIn, selectedHeis, degree, selectedFaculty, yearFrom, yearTo, language, sortBy]);

  const clearFilters = () => { setQuery(""); setSelectedHeis([]); setDegree("All"); setSelectedFaculty("All"); setYearFrom(""); setYearTo(""); setLanguage("All"); setSearchIn({ title: true, author: true, abstract: true, keywords: true }); };
  const activeFilterCount = (selectedHeis.length > 0 ? 1 : 0) + (degree !== "All" ? 1 : 0) + (selectedFaculty !== "All" ? 1 : 0) + (yearFrom ? 1 : 0) + (yearTo ? 1 : 0) + (language !== "All" ? 1 : 0);

  return (
    <div className="mt-8">
      <div className="relative mb-3">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-faint)" }}/>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles, authors, abstracts, keywords…" className="field" style={{ paddingLeft: "44px", paddingRight: "16px", height: "48px", fontSize: "15px" }}/>
      </div>
      <div className="flex items-center flex-wrap gap-x-5 gap-y-2 mb-6 text-xs" style={{ color: "var(--ink-soft)" }}>
        <span className="font-mono tracking-wider uppercase text-[10px]" style={{ color: "var(--ink-faint)" }}>Search in:</span>
        {Object.entries({ title: "Title", author: "Author", abstract: "Abstract", keywords: "Keywords" }).map(([k, label]) => (
          <label key={k} className="inline-flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={searchIn[k]} onChange={e => setSearchIn({ ...searchIn, [k]: e.target.checked })} style={{ accentColor: "var(--accent)" }}/>
            {label}
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        <aside>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2"><Filter size={14} style={{ color: "var(--ink-soft)" }}/><span className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: "var(--ink-soft)" }}>Filters {activeFilterCount > 0 && <span style={{ color: "var(--accent)" }}>({activeFilterCount})</span>}</span></div>
            {activeFilterCount > 0 && <button onClick={clearFilters} className="text-xs underline-offset-2 hover:underline" style={{ color: "var(--accent)" }}>clear all</button>}
          </div>

          <div className="mb-6">
            <div className="font-display text-[13px] mb-2 font-semibold" style={{ color: "var(--ink)" }}>Degree Level</div>
            <div className="space-y-1">
              {["All", "PhD", "Master"].map(d => (
                <label key={d} className="flex items-center gap-2 text-sm cursor-pointer py-1 hover:opacity-80">
                  <input type="radio" name="degree" checked={degree === d} onChange={() => setDegree(d)} style={{ accentColor: "var(--accent)" }}/>
                  <span style={{ color: degree === d ? "var(--accent)" : "var(--ink-soft)" }}>{d === "All" ? "All degrees" : d === "PhD" ? "Doctorate (PhD)" : "Master's"}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="font-display text-[13px] mb-2 font-semibold" style={{ color: "var(--ink)" }}>Institution</div>
            <div className="max-h-72 overflow-y-auto pr-1 space-y-1" style={{ border: "1px solid var(--line)", borderRadius: "6px", padding: "10px", background: "var(--bg-card)" }}>
              {heis.map(h => (
                <label key={h.code} className="flex items-start gap-2 text-sm cursor-pointer py-0.5 hover:opacity-80">
                  <input type="checkbox" checked={selectedHeis.includes(h.code)} onChange={e => setSelectedHeis(e.target.checked ? [...selectedHeis, h.code] : selectedHeis.filter(x => x !== h.code))} style={{ accentColor: "var(--accent)", marginTop: "3px" }}/>
                  <span>
                    <span className="font-mono text-[11px] font-semibold" style={{ color: "var(--accent)" }}>{h.code}</span>
                    <span className="ml-2 text-[12px]" style={{ color: "var(--ink-soft)" }}>{h.name}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {facultiesInUse.length > 0 && (
            <div className="mb-6">
              <div className="font-display text-[13px] mb-2 font-semibold" style={{ color: "var(--ink)" }}>Faculty / Department</div>
              <select value={selectedFaculty} onChange={e => setSelectedFaculty(e.target.value)} className="field">
                <option value="All">All faculties</option>
                {facultiesInUse.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}

          <div className="mb-6">
            <div className="font-display text-[13px] mb-2 font-semibold" style={{ color: "var(--ink)" }}>Year</div>
            <div className="flex gap-2 items-center">
              <input type="number" placeholder="From" value={yearFrom} onChange={e => setYearFrom(e.target.value)} className="field"/>
              <span style={{ color: "var(--ink-faint)" }}>—</span>
              <input type="number" placeholder="To" value={yearTo} onChange={e => setYearTo(e.target.value)} className="field"/>
            </div>
          </div>

          <div className="mb-6">
            <div className="font-display text-[13px] mb-2 font-semibold" style={{ color: "var(--ink)" }}>Language</div>
            <select value={language} onChange={e => setLanguage(e.target.value)} className="field">
              <option>All</option><option>English</option><option>Khmer</option><option>French</option><option>Other</option>
            </select>
          </div>
        </aside>

        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="text-sm" style={{ color: "var(--ink-soft)" }}>
              <span className="font-display text-lg italic" style={{ color: "var(--ink)" }}>{filtered.length}</span>
              <span className="ml-2">{filtered.length === 1 ? "result" : "results"}{theses.length !== filtered.length && <span style={{ color: "var(--ink-faint)" }}> of {theses.length}</span>}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ArrowUpDown size={14} style={{ color: "var(--ink-faint)" }}/>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="field" style={{ width: "auto", padding: "6px 10px", fontSize: "13px" }}>
                <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option><option value="author">Author A–Z</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center border rounded-lg" style={{ borderColor: "var(--line)", background: "var(--bg-card)" }}>
              <div className="font-display italic text-2xl mb-2" style={{ color: "var(--ink-soft)" }}>No theses match these filters.</div>
              <div className="text-sm" style={{ color: "var(--ink-faint)" }}>Try adjusting your search or clearing filters.</div>
            </div>
          ) : (
            <div className="space-y-4">{filtered.map(t => <ThesisCard key={t.id} thesis={t} hei={heis.find(h => h.code === t.hei)} onClick={() => onOpenDetail(t.id)}/>)}</div>
          )}
        </section>
      </div>
    </div>
  );
}

// ======================================================================
// THESIS CARD (public)
// ======================================================================
function ThesisCard({ thesis, hei, onClick, showStatus }) {
  return (
    <article onClick={onClick} className="thesis-card cursor-pointer p-6 rounded-lg border" style={{ borderColor: "var(--line)", background: "var(--bg-card)", boxShadow: "var(--shadow)" }}>
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`chip ${thesis.degree === "PhD" ? "chip-phd" : "chip-master"}`}>{thesis.degree === "PhD" ? "Doctorate" : "Master's"}</span>
          <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: "var(--bg)", color: "var(--accent)", border: "1px solid var(--line)" }}>{thesis.hei}</span>
          <span className="text-xs" style={{ color: "var(--ink-faint)" }}>· {thesis.year}</span>
          {thesis.language && thesis.language !== "English" && <span className="text-xs" style={{ color: "var(--ink-faint)" }}>· {thesis.language}</span>}
          {showStatus && <StatusBadge status={thesis.status} size="sm"/>}
          {thesis.accessLevel === "embargoed" && <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: "var(--accent)" }}><Lock size={10}/> EMBARGOED</span>}
        </div>
        {thesis.callNumber && <span className="font-mono text-[10px]" style={{ color: "var(--ink-faint)" }}>{thesis.callNumber}</span>}
      </div>

      <h3 className="font-display text-xl md:text-[22px] leading-snug mb-1" style={{ color: "var(--ink)", fontWeight: 500 }}>{thesis.titleEn}</h3>
      {thesis.titleKh && <div className="font-khmer text-base mb-2" style={{ color: "var(--ink-soft)" }}>{thesis.titleKh}</div>}

      <div className="flex items-center gap-1.5 text-sm mb-3 flex-wrap" style={{ color: "var(--ink-soft)" }}>
        <User size={13} strokeWidth={1.5}/><span>{thesis.author}</span>
        {thesis.authorKh && <span className="font-khmer ml-1" style={{ color: "var(--ink-faint)" }}>· {thesis.authorKh}</span>}
        {thesis.supervisor && <span className="ml-3" style={{ color: "var(--ink-faint)" }}>supervised by {thesis.supervisor}</span>}
      </div>

      {thesis.abstract && <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--ink-soft)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{thesis.abstract}</p>}

      {thesis.keywords?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {thesis.keywords.slice(0, 6).map((kw, i) => <span key={i} className="tag">{kw}</span>)}
          {thesis.keywords.length > 6 && <span className="tag">+{thesis.keywords.length - 6}</span>}
        </div>
      )}
    </article>
  );
}

// ======================================================================
// DETAIL MODAL
// ======================================================================
function DetailModal({ thesis, hei, ministry, role, onClose }) {
  const showWorkflow = role !== "public";
  // Public users can only download once a thesis is approved AND open access.
  // Anyone working inside the platform (HEI staff, reviewers, admins, minister)
  // needs PDF access regardless of approval status — reviewers must read the
  // thesis to review it, and HEIs must verify what they uploaded.
  const canDownload = !!thesis.pdfFileKey && (role !== "public" || thesis.accessLevel === "open");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  async function handleDownload() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch("/api/download-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thesisId: thesis.id,
          // Honor-system flag while there's no real auth; Phase 3 replaces this
          // with a server-side role check on the session.
          mode: role === "public" ? "public" : "review",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Download failed (${res.status})`);
      }
      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setDownloadError(e.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel modal-wide" onClick={e => e.stopPropagation()}>
        <div className="p-8 md:p-10">
          <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`chip ${thesis.degree === "PhD" ? "chip-phd" : "chip-master"}`}>{thesis.degree === "PhD" ? "Doctorate" : "Master's Thesis"}</span>
              {showWorkflow && <StatusBadge status={thesis.status}/>}
              {thesis.callNumber && <span className="font-mono text-xs" style={{ color: "var(--ink-faint)" }}>{thesis.callNumber}</span>}
            </div>
            <div className="flex items-center gap-2">
              {canDownload && (
                <button onClick={handleDownload} disabled={downloading} className="btn btn-primary">
                  <Download size={14}/> {downloading ? "Preparing…" : "Download PDF"}
                </button>
              )}
              <button onClick={onClose} className="btn-ghost btn" style={{ padding: "6px" }}><X size={16}/></button>
            </div>
          </div>
          {downloadError && (
            <div className="mb-4 text-sm" style={{ color: "var(--red)" }}>
              <AlertCircle size={14} className="inline mr-1"/> {downloadError}
            </div>
          )}

          <h2 className="font-display text-2xl md:text-3xl leading-tight mb-2" style={{ fontWeight: 500 }}>{thesis.titleEn}</h2>
          {thesis.titleKh && <div className="font-khmer text-lg mb-6" style={{ color: "var(--ink-soft)" }}>{thesis.titleKh}</div>}
          {!thesis.titleKh && <div className="mb-6"/>}

          <div className="ornate-divider mb-6">❦</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6 text-sm">
            <DetailField icon={<User size={14}/>} label="Author" value={<>{thesis.author}{thesis.authorKh && <span className="font-khmer ml-1" style={{ color: "var(--ink-faint)" }}>({thesis.authorKh})</span>}</>}/>
            <DetailField
              icon={<Building2 size={14}/>}
              label="Institution"
              value={
                thesis.hei === "INDEP" && thesis.externalInstitutionName
                  ? <><span className="font-mono font-semibold" style={{ color: "var(--accent)" }}>Studied abroad</span> · {thesis.externalInstitutionName}{thesis.externalCountry ? `, ${thesis.externalCountry}` : ""}</>
                  : <><span className="font-mono font-semibold" style={{ color: "var(--accent)" }}>{thesis.hei}</span> · {hei?.name || thesis.hei}</>
              }
            />
            <DetailField icon={<Shield size={14}/>} label="Supervising Ministry" value={ministry ? `${ministry.code} — ${ministry.name}` : (hei?.ministry || "—")}/>
            <DetailField icon={<GraduationCap size={14}/>} label="Faculty / Department" value={thesis.faculty || "—"}/>
            <DetailField icon={<User size={14}/>} label="Supervisor" value={thesis.supervisor || "—"}/>
            <DetailField icon={<Calendar size={14}/>} label="Year of Submission" value={thesis.year}/>
            <DetailField icon={<FileText size={14}/>} label="Language" value={thesis.language || "—"}/>
            <DetailField icon={thesis.accessLevel === "embargoed" ? <Lock size={14}/> : <Eye size={14}/>} label="Access" value={thesis.accessLevel === "embargoed" ? `Embargoed until ${thesis.embargoUntil || "—"}` : "Open access"}/>
          </div>

          {thesis.abstract && (
            <div className="mb-6">
              <SectionLabel>Abstract</SectionLabel>
              <p className="text-[15px] leading-relaxed font-display" style={{ color: "var(--ink-soft)", fontWeight: 400 }}>{thesis.abstract}</p>
            </div>
          )}

          {thesis.keywords?.length > 0 && (
            <div className="mb-6">
              <SectionLabel>Keywords</SectionLabel>
              <div className="flex flex-wrap gap-1.5">{thesis.keywords.map((k, i) => <span key={i} className="tag">{k}</span>)}</div>
            </div>
          )}

          {showWorkflow && (thesis.files?.thesisMaster || thesis.files?.similarityReport) && (
            <div className="mb-6">
              <SectionLabel>Attached files</SectionLabel>
              <div className="space-y-2 mt-2">
                <AttachedFile label="Thesis — Master Copy" meta={thesis.files?.thesisMaster} tone="accent"/>
                {thesis.files?.thesisPublic && <AttachedFile label="Thesis — Public Version" meta={thesis.files.thesisPublic}/>}
                <AttachedFile label="Plagiarism Similarity Report" meta={thesis.files?.similarityReport}/>
              </div>
            </div>
          )}

          {showWorkflow && thesis.history?.length > 0 && (
            <div className="mt-8 pt-6 border-t" style={{ borderColor: "var(--line)" }}>
              <SectionLabel>Workflow History</SectionLabel>
              <div className="mt-3">
                {thesis.history.map((h, i) => (
                  <div key={i} className={`audit-step ${h.by === "System" ? "system" : ""}`}>
                    <div className="text-xs font-mono" style={{ color: "var(--ink-faint)" }}>{h.at}</div>
                    <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{h.by}</div>
                    <div className="text-sm" style={{ color: "var(--ink-soft)" }}>{h.action}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showWorkflow && thesis.similarityScore != null && (
            <div className="mt-6 flex items-center gap-6 pt-4 border-t flex-wrap" style={{ borderColor: "var(--line)" }}>
              <div>
                <div className="font-mono text-[10px] tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)" }}>Similarity Score</div>
                <div className="font-display text-xl" style={{ color: thesis.similarityScore <= 15 ? "var(--green)" : thesis.similarityScore <= 20 ? "var(--orange)" : "var(--red)", fontWeight: 500 }}>{thesis.similarityScore}%</div>
              </div>
              {thesis.submittedBy && (
                <div>
                  <div className="font-mono text-[10px] tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)" }}>Submitted By</div>
                  <div className="text-sm font-mono">{thesis.submittedBy}</div>
                </div>
              )}
              {thesis.reviewedBy && (
                <div>
                  <div className="font-mono text-[10px] tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)" }}>Reviewed By</div>
                  <div className="text-sm font-mono">{thesis.reviewedBy}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailField({ icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1 text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ color: "var(--ink-faint)" }}><span>{icon}</span>{label}</div>
      <div style={{ color: "var(--ink)" }}>{value}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div className="font-display text-sm font-semibold mb-2 tracking-wide uppercase" style={{ color: "var(--ink-faint)", fontSize: "11px", letterSpacing: "0.15em" }}>{children}</div>;
}

// ======================================================================
// HEI DASHBOARD
// ======================================================================
function HEIDashboard({ theses, hei, onSubmitNew, onEdit, onOpenDetail }) {
  const byStatus = useMemo(() => {
    const buckets = { draft: [], submitted: [], under_review: [], revision_requested: [], approved: [], published: [], embargoed: [], rejected: [] };
    theses.forEach(t => { if (buckets[t.status]) buckets[t.status].push(t); });
    return buckets;
  }, [theses]);

  return (
    <div className="mt-10">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: "var(--ink-faint)" }}>Institution dashboard</div>
          <h2 className="font-display text-3xl md:text-4xl" style={{ fontWeight: 400 }}>
            <span style={{ fontStyle: "italic", fontWeight: 300 }}>Submissions from</span>{" "}
            <span className="font-mono font-semibold" style={{ color: "var(--accent)" }}>{hei?.code}</span>
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-soft)" }}>{hei?.name}</p>
        </div>
        <button onClick={onSubmitNew} className="btn btn-primary"><Plus size={14}/> Submit new thesis</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Drafts" value={byStatus.draft.length} color="var(--ink-faint)"/>
        <StatCard label="Awaiting review" value={byStatus.submitted.length + byStatus.under_review.length} color="var(--blue)"/>
        <StatCard label="Needs revision" value={byStatus.revision_requested.length} color="var(--orange)"/>
        <StatCard label="Published" value={byStatus.published.length + byStatus.embargoed.length} color="var(--green)"/>
      </div>

      {byStatus.revision_requested.length > 0 && (
        <HEISection title="Requiring your attention" subtitle="These submissions have been sent back for revision." theses={byStatus.revision_requested} onEdit={onEdit} onOpenDetail={onOpenDetail} highlight/>
      )}
      {byStatus.draft.length > 0 && (
        <HEISection title="Drafts" subtitle="Not yet submitted to MoEYS." theses={byStatus.draft} onEdit={onEdit} onOpenDetail={onOpenDetail}/>
      )}
      {(byStatus.submitted.length + byStatus.under_review.length) > 0 && (
        <HEISection title="Under review" subtitle="Currently being assessed by the Department of Research and Innovation." theses={[...byStatus.submitted, ...byStatus.under_review]} onEdit={onEdit} onOpenDetail={onOpenDetail}/>
      )}
      {(byStatus.published.length + byStatus.embargoed.length) > 0 && (
        <HEISection title="Published" subtitle="Approved and available in the national archive." theses={[...byStatus.published, ...byStatus.embargoed]} onEdit={onEdit} onOpenDetail={onOpenDetail}/>
      )}
      {byStatus.rejected.length > 0 && (
        <HEISection title="Rejected" subtitle="Not admitted to the national archive." theses={byStatus.rejected} onEdit={onEdit} onOpenDetail={onOpenDetail}/>
      )}

      {theses.length === 0 && (
        <div className="py-16 text-center border rounded-lg" style={{ borderColor: "var(--line)", background: "var(--bg-card)" }}>
          <div className="font-display italic text-2xl mb-2" style={{ color: "var(--ink-soft)" }}>No submissions yet.</div>
          <div className="text-sm mb-4" style={{ color: "var(--ink-faint)" }}>Begin by submitting a Master's or Doctoral thesis.</div>
          <button onClick={onSubmitNew} className="btn btn-primary"><Plus size={14}/> Submit new thesis</button>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="p-4 rounded-lg border" style={{ borderColor: "var(--line)", background: "var(--bg-card)" }}>
      <div className="font-display text-3xl" style={{ color, fontWeight: 500 }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: "var(--ink-soft)" }}>{label}</div>
    </div>
  );
}

function HEISection({ title, subtitle, theses, onEdit, onOpenDetail, highlight }) {
  return (
    <section className="mb-10">
      <div className="mb-3">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-lg" style={{ fontWeight: 500, color: highlight ? "var(--orange)" : "var(--ink)" }}>{title}</h3>
          <span className="font-mono text-xs" style={{ color: "var(--ink-faint)" }}>({theses.length})</span>
        </div>
        <p className="text-xs" style={{ color: "var(--ink-faint)" }}>{subtitle}</p>
      </div>
      <div className="space-y-2">
        {theses.map(t => (
          <div key={t.id} className="p-4 rounded-lg border flex items-start justify-between gap-4 flex-wrap" style={{ borderColor: highlight ? "var(--orange)" : "var(--line)", background: "var(--bg-card)" }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <StatusBadge status={t.status} size="sm"/>
                <span className={`chip ${t.degree === "PhD" ? "chip-phd" : "chip-master"}`}>{t.degree}</span>
                <span className="text-xs" style={{ color: "var(--ink-faint)" }}>{t.year}</span>
              </div>
              <div className="font-display text-base" style={{ fontWeight: 500 }}>{t.titleEn}</div>
              <div className="text-sm mt-0.5" style={{ color: "var(--ink-soft)" }}>{t.author}</div>
              {t.status === "revision_requested" && t.reviewFeedback && (
                <div className="mt-3 p-3 rounded text-xs" style={{ background: "rgba(192,112,32,0.08)", color: "var(--orange)", borderLeft: "2px solid var(--orange)" }}>
                  <div className="font-semibold mb-1 flex items-center gap-1.5"><MessageSquare size={11}/> Reviewer feedback</div>
                  <div>{t.reviewFeedback}</div>
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => onOpenDetail(t.id)} className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "12px" }}><Eye size={12}/> View</button>
              {(t.status === "draft" || t.status === "revision_requested") && (
                <button onClick={() => onEdit(t.id)} className="btn btn-primary" style={{ padding: "5px 10px", fontSize: "12px" }}><Edit2 size={12}/> {t.status === "revision_requested" ? "Revise & resubmit" : "Continue"}</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ======================================================================
// SUBMISSION FORM (HEI)
// ======================================================================
// ======================================================================
// SUBMISSION CONFIRMATION
// Shown after a successful submit; replaces silently dropping the user
// back on the dashboard. Reassures the HEI submitter and tells them what
// happens next.
// ======================================================================
function SubmissionConfirmation({ title, onViewSubmissions, onBrowse }) {
  return (
    <div className="mt-16 max-w-2xl mx-auto text-center">
      <div className="inline-flex items-center justify-center mb-6" style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(72,140,80,0.12)", color: "var(--green, #488C50)" }}>
        <CheckCircle2 size={40} strokeWidth={1.5}/>
      </div>
      <h2 className="font-display text-3xl md:text-4xl mb-4" style={{ fontWeight: 400 }}>
        Thesis <span style={{ fontStyle: "italic", fontWeight: 300 }}>submitted</span>
      </h2>
      {title && (
        <p className="font-display text-lg italic mb-8" style={{ color: "var(--ink-soft)" }}>
          “{title}”
        </p>
      )}
      <div className="text-left p-8 rounded-lg border space-y-4" style={{ borderColor: "var(--line)", background: "var(--bg-card)" }}>
        <p className="text-[15px] leading-relaxed" style={{ color: "var(--ink)" }}>
          Your thesis is now in the MoEYS review process.
        </p>
        <p className="text-[15px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          You can check its status on this platform at any time. The MoEYS reviewing committee will approve, request revisions, or reject your submission, and you will see the decision reflected here.
        </p>
        <p className="text-[15px] leading-relaxed font-display italic" style={{ color: "var(--ink-soft)" }}>
          Have a wonderful day.
        </p>
      </div>
      <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
        <button onClick={onViewSubmissions} className="btn btn-primary">
          <ClipboardList size={14}/> View my submissions
        </button>
        <button onClick={onBrowse} className="btn btn-ghost">
          <BookOpen size={14}/> Browse the archive
        </button>
      </div>
    </div>
  );
}

// Friendly names for each form-validation error key, used by the
// "missing fields" summary banner so users see the actual field name
// instead of an internal key.
const FIELD_LABELS: Record<string, string> = {
  titleEn: "Title (English)",
  author: "Author (romanized)",
  authorEmail: "Author email",
  hei: "Institution",
  year: "Year",
  faculty: "Faculty / Department",
  supervisor: "Supervisor",
  abstract: "Abstract",
  keywords: "Keywords (minimum 3)",
  similarityScore: "Similarity Score",
  license: "License",
  releasePolicy: "Release timing",
  releaseReason: "Reason for delayed release",
  releaseJustification: "Justification",
  externalInstitutionName: "Institution name (abroad)",
  externalCountry: "Country (abroad)",
  thesisMaster: "Thesis — Master Copy (PDF)",
  similarityReport: "Plagiarism Similarity Report (PDF)",
  licenseAcknowledged: "License acknowledgement",
  authorshipConfirmed: "Authorship & copyright confirmation",
};

function SubmissionForm({ heis, heiContext, onSaveDraft, onSubmit, onCancel, initial, submitting }) {
  const [form, setForm] = useState(initial || {
    titleEn: "", titleKh: "", author: "", authorKh: "", authorEmail: "",
    hei: heiContext, faculty: "", degree: "Master", year: new Date().getFullYear(),
    supervisor: "", abstract: "", keywords: [], language: "English", callNumber: "",
    similarityScore: "",
    externalInstitutionName: "",
    externalCountry: "",
    license: "CC_BY",
    releasePolicy: "IMMEDIATE",
    releaseReason: "",
    releaseJustification: "",
    licenseAcknowledged: false,
    authorshipConfirmed: false,
    files: { thesisMaster: null, thesisPublic: null, similarityReport: null },
  });
  const [keywordInput, setKeywordInput] = useState("");
  const [errors, setErrors] = useState({});

  const setField = (k, v) => { setForm({ ...form, [k]: v }); if (errors[k]) setErrors({ ...errors, [k]: null }); };
  const addKeyword = () => {
    const k = keywordInput.trim().replace(/,+$/, "");
    if (k && !form.keywords.includes(k)) {
      const next = [...form.keywords, k];
      setForm({ ...form, keywords: next });
      if (errors.keywords) setErrors({ ...errors, keywords: null });
    }
    setKeywordInput("");
  };

  const validateFull = () => {
    const e = {};
    if (!form.titleEn.trim()) e.titleEn = "Required";
    if (!form.author.trim()) e.author = "Required";
    if (!form.authorEmail.trim()) e.authorEmail = "Required for submission";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.authorEmail.trim())) e.authorEmail = "Enter a valid email address";
    if (!form.hei) e.hei = "Required";
    if (!form.year) e.year = "Required";
    if (!form.faculty.trim()) e.faculty = "Required for submission";
    if (!form.supervisor.trim()) e.supervisor = "Required for submission";
    if (!form.abstract.trim()) e.abstract = "Required for submission";
    if (form.keywords.length < 3) e.keywords = "At least 3 keywords required";
    if (form.similarityScore === "" || form.similarityScore == null) e.similarityScore = "Similarity score required";
    if (form.hei === "INDEP") {
      if (!form.externalInstitutionName?.trim()) e.externalInstitutionName = "Institution name required for abroad submissions";
      if (!form.externalCountry?.trim()) e.externalCountry = "Country required for abroad submissions";
    }
    if (!form.license) e.license = "License choice required";
    if (!form.releasePolicy) e.releasePolicy = "Release timing required";
    if (form.releasePolicy && form.releasePolicy !== "IMMEDIATE" && !form.releaseReason) e.releaseReason = "Reason required when delaying public release";
    if (form.releaseReason === "OTHER" && !form.releaseJustification.trim()) e.releaseJustification = "Brief justification required when reason is 'Other'";
    if (!form.files?.thesisMaster) e.thesisMaster = "Thesis PDF required";
    if (!form.files?.similarityReport) e.similarityReport = "Similarity report required";
    if (!form.licenseAcknowledged) e.licenseAcknowledged = "Author must acknowledge the license terms";
    if (!form.authorshipConfirmed) e.authorshipConfirmed = "Authorship and copyright clearance must be confirmed";
    setErrors(e); return Object.keys(e).length === 0;
  };

  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const handleSubmit = () => {
    if (validateFull()) {
      setShowErrorBanner(false);
      onSubmit(form);
    } else {
      setShowErrorBanner(true);
      // Bring the user back to the top of the form so they can see what's wrong
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const handleSaveDraft = () => onSaveDraft(form);

  return (
    <div className="mt-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: "var(--ink-faint)" }}>
          {initial?.status === "revision_requested" ? "Revise and resubmit" : initial ? "Continue editing draft" : "New submission"}
        </div>
        <h2 className="font-display text-3xl md:text-4xl" style={{ fontWeight: 400 }}>
          <span style={{ fontStyle: "italic", fontWeight: 300 }}>{initial?.status === "revision_requested" ? "Revise" : "Catalogue"}</span>{" "}
          a thesis
        </h2>
        <p className="mt-3 text-sm max-w-xl" style={{ color: "var(--ink-soft)" }}>Complete all fields to submit. You may also save a partial draft and return later.</p>
      </div>

      {initial?.status === "revision_requested" && initial?.reviewFeedback && (
        <div className="mb-6 p-5 rounded-lg" style={{ background: "rgba(192,112,32,0.08)", borderLeft: "3px solid var(--orange)" }}>
          <div className="flex items-center gap-2 mb-2 font-mono text-[11px] tracking-[0.15em] uppercase font-semibold" style={{ color: "var(--orange)" }}><MessageSquare size={13}/> MoEYS reviewer feedback</div>
          <div className="text-sm" style={{ color: "var(--ink)" }}>{initial.reviewFeedback}</div>
        </div>
      )}

      {showErrorBanner && Object.keys(errors).filter(k => errors[k]).length > 0 && (
        <div className="mb-6 p-5 rounded-lg" style={{ background: "rgba(180,40,40,0.08)", borderLeft: "3px solid var(--red, #B42828)" }}>
          <div className="flex items-center gap-2 mb-2 font-mono text-[11px] tracking-[0.15em] uppercase font-semibold" style={{ color: "var(--red, #B42828)" }}>
            <AlertCircle size={13}/> Please complete {Object.keys(errors).filter(k => errors[k]).length} required field{Object.keys(errors).filter(k => errors[k]).length === 1 ? "" : "s"} before submitting
          </div>
          <ul className="text-sm mt-2 ml-1 space-y-1" style={{ color: "var(--ink)" }}>
            {Object.keys(errors).filter(k => errors[k]).map(k => (
              <li key={k}>• <strong>{FIELD_LABELS[k] || k}</strong>{errors[k] && errors[k] !== "Required" && errors[k] !== "Required for submission" ? ` — ${errors[k]}` : ""}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-5 p-8 md:p-10 rounded-lg border" style={{ borderColor: "var(--line)", background: "var(--bg-card)" }}>
        <FormSection title="Bibliographic">
          <FormRow label="Title (English) *" error={errors.titleEn}><input className="field" value={form.titleEn} onChange={e => setField("titleEn", e.target.value)} placeholder="e.g., A Study on Cambodian Monetary Policy"/></FormRow>
          <FormRow label="Title (Khmer)"><input className="field font-khmer" value={form.titleKh} onChange={e => setField("titleKh", e.target.value)} placeholder="ចំណងជើងជាភាសាខ្មែរ"/></FormRow>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormRow label="Author * (romanized)" error={errors.author}><input className="field" value={form.author} onChange={e => setField("author", e.target.value)} placeholder="e.g., Sok Dara"/></FormRow>
            <FormRow label="Author (Khmer)"><input className="field font-khmer" value={form.authorKh} onChange={e => setField("authorKh", e.target.value)} placeholder="សុខ ដារ៉ា"/></FormRow>
          </div>
          <FormRow label="Author email *" error={errors.authorEmail} hint="Used to notify the author of approval, rejection, or revision requests.">
            <input type="email" className="field" value={form.authorEmail} onChange={e => setField("authorEmail", e.target.value)} placeholder="e.g., sok.dara@rupp.edu.kh"/>
          </FormRow>
        </FormSection>

        <FormSection title="Academic">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormRow label="Institution *" error={errors.hei} hint={form.hei === "INDEP" ? "Use this only if the author studied abroad and is not represented by a Cambodian HEI." : undefined}>
              <select className="field" value={form.hei} onChange={e => setField("hei", e.target.value)}>
                <option value="">Select…</option>
                {heis.map(h => <option key={h.code} value={h.code}>{h.code} — {h.name}</option>)}
              </select>
            </FormRow>
            <FormRow label="Degree *">
              <div className="flex gap-2">
                {["Master", "PhD"].map(d => (
                  <button key={d} type="button" onClick={() => setField("degree", d)} className="flex-1 py-2.5 rounded-md text-sm font-medium transition-all border"
                    style={{ background: form.degree === d ? "var(--accent)" : "var(--bg-card)", color: form.degree === d ? "var(--accent-ink)" : "var(--ink-soft)", borderColor: form.degree === d ? "var(--accent)" : "var(--line)" }}>
                    {d === "Master" ? "Master's" : "Doctorate (PhD)"}
                  </button>
                ))}
              </div>
            </FormRow>
          </div>
          {form.hei === "INDEP" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-md" style={{ background: "var(--bg)", borderLeft: "2px solid var(--accent)" }}>
              <FormRow label="Foreign institution name *" error={errors.externalInstitutionName}>
                <input className="field" value={form.externalInstitutionName} onChange={e => setField("externalInstitutionName", e.target.value)} placeholder="e.g., Massachusetts Institute of Technology"/>
              </FormRow>
              <FormRow label="Country *" error={errors.externalCountry}>
                <input className="field" value={form.externalCountry} onChange={e => setField("externalCountry", e.target.value)} placeholder="e.g., United States"/>
              </FormRow>
            </div>
          )}
          <FormRow label="Faculty / Department *" error={errors.faculty}><input className="field" value={form.faculty} onChange={e => setField("faculty", e.target.value)} placeholder="e.g., Faculty of Engineering"/></FormRow>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FormRow label="Supervisor *" error={errors.supervisor}><input className="field" value={form.supervisor} onChange={e => setField("supervisor", e.target.value)} placeholder="e.g., Dr. Chan Bora"/></FormRow>
            <FormRow label="Year *" error={errors.year}><input type="number" className="field" value={form.year} onChange={e => setField("year", parseInt(e.target.value) || "")} min="1950" max="2100"/></FormRow>
            <FormRow label="Language"><select className="field" value={form.language} onChange={e => setField("language", e.target.value)}><option>English</option><option>Khmer</option><option>French</option><option>Other</option></select></FormRow>
          </div>
          <FormRow label="Call Number / Accession No."><input className="field font-mono" value={form.callNumber} onChange={e => setField("callNumber", e.target.value)} placeholder="e.g., RUPP-PHD-2024-042"/></FormRow>
        </FormSection>

        <FormSection title="Content">
          <FormRow label="Abstract *" error={errors.abstract}><textarea className="field" rows={6} value={form.abstract} onChange={e => setField("abstract", e.target.value)} placeholder="Paste or type the thesis abstract here…"/></FormRow>
          <FormRow label={`Keywords * (${form.keywords.length} of 3 minimum)`} error={errors.keywords}>
            <div>
              <div className="flex gap-2">
                <input
                  className="field"
                  value={keywordInput}
                  onChange={e => {
                    const v = e.target.value;
                    if (v.endsWith(",")) {
                      setKeywordInput(v.slice(0, -1));
                      addKeyword();
                    } else {
                      setKeywordInput(v);
                    }
                  }}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                  onBlur={() => { if (keywordInput.trim()) addKeyword(); }}
                  placeholder="Type a keyword, then press Enter or comma to add"
                />
                <button type="button" onClick={addKeyword} className="btn btn-primary">Add keyword</button>
              </div>
              <div className="text-xs mt-2" style={{ color: "var(--ink-faint)" }}>
                Press <kbd className="font-mono">Enter</kbd> or <kbd className="font-mono">,</kbd> after each keyword. Each one becomes a removable pill below.
              </div>
              {form.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {form.keywords.map((k, i) => (
                    <span key={i} className="tag inline-flex items-center gap-1">{k}<button type="button" onClick={() => setField("keywords", form.keywords.filter(x => x !== k))} className="hover:text-red-600"><X size={11}/></button></span>
                  ))}
                </div>
              )}
            </div>
          </FormRow>
        </FormSection>

        <FormSection title="Files">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileUpload
              label="Thesis — Master Copy (PDF) *"
              hint="The complete examined thesis. Max 25 MB."
              accept="application/pdf"
              value={form.files?.thesisMaster}
              onChange={(meta) => setField("files", { ...form.files, thesisMaster: meta })}
              error={errors.thesisMaster}
              required
            />
            <FileUpload
              label="Thesis — Public Version (PDF)"
              hint="Optional redacted version for open access. Use this if the master copy contains confidential or third-party material that must be removed before public release."
              accept="application/pdf"
              value={form.files?.thesisPublic}
              onChange={(meta) => setField("files", { ...form.files, thesisPublic: meta })}
            />
          </div>
          <FileUpload
            label="Plagiarism Similarity Report (PDF) *"
            hint="The full report from iThenticate, Turnitin, or equivalent."
            accept="application/pdf"
            value={form.files?.similarityReport}
            onChange={(meta) => setField("files", { ...form.files, similarityReport: meta })}
            error={errors.similarityReport}
            required
          />
        </FormSection>

        <FormSection title="Quality">
          <FormRow label="Similarity Score (%) * — from iThenticate, Turnitin, or equivalent" error={errors.similarityScore}>
            <input type="number" min="0" max="100" className="field" value={form.similarityScore} onChange={e => setField("similarityScore", e.target.value === "" ? "" : parseInt(e.target.value))} placeholder="e.g., 12"/>
          </FormRow>
        </FormSection>

        <FormSection title="Author rights & release">
          <FormRow label="License *" error={errors.license} hint="The author chooses how their work may be reused. CC BY is the most open and most-cited.">
            <select className="field" value={form.license} onChange={e => setField("license", e.target.value)}>
              <option value="CC_BY">CC BY — attribution only (most open)</option>
              <option value="CC_BY_NC">CC BY-NC — non-commercial use only</option>
              <option value="CC_BY_NC_ND">CC BY-NC-ND — non-commercial, no derivatives</option>
              <option value="ALL_RIGHTS_RESERVED">All rights reserved (most restrictive)</option>
            </select>
          </FormRow>

          <FormRow label="Release timing *" error={errors.releasePolicy} hint="When the full PDF becomes publicly available. Metadata (title, abstract, keywords) is always public from approval.">
            <select className="field" value={form.releasePolicy} onChange={e => setField("releasePolicy", e.target.value === "IMMEDIATE" ? e.target.value : e.target.value)}>
              <option value="IMMEDIATE">Immediate — release on approval (recommended)</option>
              <option value="DELAY_6M">Delay 6 months</option>
              <option value="DELAY_1Y">Delay 1 year</option>
              <option value="DELAY_2Y">Delay 2 years</option>
              <option value="DELAY_3Y">Delay 3 years</option>
              <option value="DELAY_5Y">Delay 5 years (maximum)</option>
            </select>
          </FormRow>

          {form.releasePolicy && form.releasePolicy !== "IMMEDIATE" && (
            <>
              <FormRow label="Reason for delay *" error={errors.releaseReason}>
                <select className="field" value={form.releaseReason} onChange={e => setField("releaseReason", e.target.value)}>
                  <option value="">Select…</option>
                  <option value="PATENT">Pending patent application</option>
                  <option value="PUBLICATION">Pending journal publication</option>
                  <option value="COMMERCIAL">Commercial sensitivity</option>
                  <option value="SENSITIVE">Sensitive content (ethics, personal data)</option>
                  <option value="OTHER">Other</option>
                </select>
              </FormRow>
              {form.releaseReason === "OTHER" && (
                <FormRow label="Justification *" error={errors.releaseJustification} hint="Briefly describe why public release is being delayed.">
                  <textarea className="field" rows={3} value={form.releaseJustification} onChange={e => setField("releaseJustification", e.target.value)} placeholder="e.g., Thesis contains unpublished interview transcripts subject to participant consent agreements."/>
                </FormRow>
              )}
            </>
          )}

          <div className="p-5 rounded-md text-sm space-y-3" style={{ background: "var(--bg)", borderLeft: "2px solid var(--line-strong)" }}>
            <div className="flex items-center gap-2 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--ink-faint)" }}>
              <AlertCircle size={12}/> Submission declarations
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.licenseAcknowledged}
                onChange={e => setField("licenseAcknowledged", e.target.checked)}
                className="mt-0.5 flex-shrink-0"
                style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
              />
              <div>
                <div style={{ color: "var(--ink)" }}>
                  The author has reviewed and agreed to the chosen license and release timing.
                </div>
                {errors.licenseAcknowledged && <div className="text-xs mt-1" style={{ color: "var(--red)" }}>{errors.licenseAcknowledged}</div>}
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.authorshipConfirmed}
                onChange={e => setField("authorshipConfirmed", e.target.checked)}
                className="mt-0.5 flex-shrink-0"
                style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
              />
              <div>
                <div style={{ color: "var(--ink)" }}>
                  The HEI confirms the thesis has passed institutional examination and that copyright clearance has been obtained for all third-party material (figures, quotes, datasets).
                </div>
                {errors.authorshipConfirmed && <div className="text-xs mt-1" style={{ color: "var(--red)" }}>{errors.authorshipConfirmed}</div>}
              </div>
            </label>
          </div>
        </FormSection>

        <div className="flex items-center justify-between gap-3 pt-4 border-t flex-wrap" style={{ borderColor: "var(--line)" }}>
          <button onClick={onCancel} disabled={submitting} className="btn btn-ghost">Cancel</button>
          <div className="flex gap-2">
            <button onClick={handleSaveDraft} disabled={submitting} className="btn btn-ghost"><FileText size={14}/> Save as draft</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary">
              {submitting ? <><Clock size={14}/> Uploading…</> : <><Send size={14}/> Submit to MoEYS</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileUpload({ label, hint, accept, value, onChange, error, required }) {
  const [dragging, setDragging] = useState(false);
  const inputId = `file_${label.replace(/[^a-z0-9]/gi, "_")}_${Math.random().toString(36).slice(2,6)}`;

  const handleFile = (file) => {
    if (!file) return;
    // Basic validation: type
    if (accept && accept.includes("pdf") && file.type !== "application/pdf") {
      alert("Only PDF files are accepted for this field.");
      return;
    }
    // Soft size warning at 25 MB
    if (file.size > 25 * 1024 * 1024) {
      alert("File is larger than 25 MB. Please compress or redact before uploading.");
      return;
    }
    const id = `f_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    fileBlobs.set(id, file); // keep the actual File in session cache for preview
    onChange({
      id,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString().slice(0, 10),
    });
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const preview = () => {
    const blob = value?.id ? fileBlobs.get(value.id) : null;
    if (!blob) {
      alert("This file was uploaded in a previous session; the actual file content is not available in this prototype. In production, it would be retrieved from object storage.");
      return;
    }
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const remove = () => {
    if (value?.id) fileBlobs.delete(value.id);
    onChange(null);
  };

  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--ink-soft)" }}>
        {label}
        {error && <span className="ml-2 font-normal" style={{ color: "var(--red)" }}>— {error}</span>}
      </label>

      {value ? (
        <div className="flex items-center gap-3 p-3 rounded-md border" style={{ background: "var(--bg)", borderColor: "var(--line-strong)" }}>
          <div className="flex-shrink-0 p-2 rounded" style={{ background: "rgba(122,30,46,0.08)", color: "var(--accent)" }}>
            <FileIcon size={18} strokeWidth={1.5}/>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate font-medium" style={{ color: "var(--ink)" }}>{value.name}</div>
            <div className="text-[11px] font-mono" style={{ color: "var(--ink-faint)" }}>
              {formatBytes(value.size)} · uploaded {value.uploadedAt}
            </div>
          </div>
          <button type="button" onClick={preview} className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "12px" }} title="Preview in new tab">
            <Eye size={12}/>
          </button>
          <button type="button" onClick={remove} className="btn btn-danger" style={{ padding: "5px 10px", fontSize: "12px" }} title="Remove file">
            <Trash2 size={12}/>
          </button>
        </div>
      ) : (
        <>
          <label
            htmlFor={inputId}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className="flex flex-col items-center justify-center gap-2 p-6 rounded-md border-2 border-dashed cursor-pointer transition-all"
            style={{
              borderColor: dragging ? "var(--accent)" : error ? "var(--red)" : "var(--line-strong)",
              background: dragging ? "rgba(122,30,46,0.04)" : "var(--bg)",
            }}
          >
            <Upload size={22} strokeWidth={1.5} style={{ color: dragging ? "var(--accent)" : "var(--ink-faint)" }}/>
            <div className="text-sm text-center" style={{ color: "var(--ink-soft)" }}>
              <span className="font-semibold" style={{ color: "var(--accent)" }}>Click to upload</span>
              <span> or drag a file here</span>
            </div>
            {hint && <div className="text-[11px] text-center max-w-xs" style={{ color: "var(--ink-faint)" }}>{hint}</div>}
          </label>
          <input id={inputId} type="file" accept={accept} className="hidden"
            onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}/>
        </>
      )}
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Read-only file viewer used by the Review Panel and Detail Modal
function AttachedFile({ label, meta, tone = "default" }) {
  const open = () => {
    const blob = meta?.id ? fileBlobs.get(meta.id) : null;
    if (!blob) {
      alert("This file was uploaded in a previous session; its content is not available in this prototype. In production the file would be served from object storage.");
      return;
    }
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  if (!meta) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-md border text-xs" style={{ borderColor: "var(--line)", background: "var(--bg)", color: "var(--ink-faint)" }}>
        <FileIcon size={14} strokeWidth={1.5}/>
        <div className="flex-1">
          <div className="font-semibold" style={{ color: "var(--ink-soft)" }}>{label}</div>
          <div className="italic">Not attached</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-md border" style={{ borderColor: tone === "accent" ? "var(--accent)" : "var(--line-strong)", background: "var(--bg-card)" }}>
      <div className="flex-shrink-0 p-2 rounded" style={{ background: "rgba(122,30,46,0.08)", color: "var(--accent)" }}>
        <FileIcon size={16} strokeWidth={1.5}/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-mono tracking-[0.12em] uppercase" style={{ color: "var(--ink-faint)" }}>{label}</div>
        <div className="text-sm truncate font-medium" style={{ color: "var(--ink)" }}>{meta.name}</div>
        <div className="text-[11px] font-mono" style={{ color: "var(--ink-faint)" }}>{formatBytes(meta.size)} · {meta.uploadedAt}</div>
      </div>
      <button type="button" onClick={open} className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "12px" }}>
        <Eye size={12}/> Open
      </button>
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[0.2em] uppercase mb-4 pb-2 border-b" style={{ color: "var(--accent)", borderColor: "var(--line)" }}>· {title} ·</div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function FormRow({ label, error, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--ink-soft)" }}>{label}{error && <span className="ml-2 font-normal" style={{ color: "var(--red)" }}>— {error}</span>}</label>
      {children}
      {hint && !error && <div className="text-[11px] mt-1" style={{ color: "var(--ink-faint)" }}>{hint}</div>}
    </div>
  );
}

// ======================================================================
// REVIEW QUEUE (MoEYS)
// ======================================================================
function ReviewQueue({ theses, heis, onOpenReview, onOpenDetail }) {
  const [filter, setFilter] = useState("pending"); // pending | all
  const [heiFilter, setHeiFilter] = useState("All");
  const [q, setQ] = useState("");

  const pending = theses.filter(t => t.status === "submitted" || t.status === "under_review");
  const revisionReq = theses.filter(t => t.status === "revision_requested");
  const approved = theses.filter(t => t.status === "published" || t.status === "embargoed" || t.status === "approved");
  const rejected = theses.filter(t => t.status === "rejected");

  let list = filter === "pending" ? pending : theses;
  if (heiFilter !== "All") list = list.filter(t => t.hei === heiFilter);
  if (q.trim()) {
    const s = q.toLowerCase();
    list = list.filter(t => (t.titleEn + " " + t.author + " " + t.hei).toLowerCase().includes(s));
  }
  list = [...list].sort((a,b) => (a.submittedAt || "").localeCompare(b.submittedAt || ""));

  return (
    <div className="mt-10">
      <div className="mb-8">
        <div className="font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: "var(--ink-faint)" }}>Department of Research and Innovation</div>
        <h2 className="font-display text-3xl md:text-4xl" style={{ fontWeight: 400 }}>
          <span style={{ fontStyle: "italic", fontWeight: 300 }}>Review</span> queue
        </h2>
        <p className="mt-3 text-sm max-w-2xl" style={{ color: "var(--ink-soft)" }}>Review, approve, or request revision on theses submitted by HEIs. Each decision is recorded on the workflow ledger and visible to the submitting institution.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Pending review" value={pending.length} color="var(--blue)"/>
        <StatCard label="Awaiting HEI revision" value={revisionReq.length} color="var(--orange)"/>
        <StatCard label="Approved / Published" value={approved.length} color="var(--green)"/>
        <StatCard label="Rejected" value={rejected.length} color="var(--red)"/>
      </div>

      <div className="flex items-center gap-3 flex-wrap mb-5">
        <div className="flex gap-1 p-1 rounded-md border" style={{ borderColor: "var(--line)", background: "var(--bg-card)" }}>
          {[{ id: "pending", label: `Pending (${pending.length})` }, { id: "all", label: `All (${theses.length})` }].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="px-3 py-1.5 text-xs rounded"
              style={{ background: filter === f.id ? "var(--accent)" : "transparent", color: filter === f.id ? "var(--accent-ink)" : "var(--ink-soft)", fontWeight: filter === f.id ? 600 : 400 }}>
              {f.label}
            </button>
          ))}
        </div>
        <select value={heiFilter} onChange={e => setHeiFilter(e.target.value)} className="field" style={{ width: "auto", padding: "7px 10px", fontSize: "13px" }}>
          <option value="All">All institutions</option>
          {heis.map(h => <option key={h.code} value={h.code}>{h.code}</option>)}
        </select>
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-faint)" }}/>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search title, author, HEI…" className="field" style={{ paddingLeft: "32px", padding: "7px 10px 7px 32px", fontSize: "13px" }}/>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="py-20 text-center border rounded-lg" style={{ borderColor: "var(--line)", background: "var(--bg-card)" }}>
          <div className="font-display italic text-2xl mb-2" style={{ color: "var(--ink-soft)" }}>The queue is clear.</div>
          <div className="text-sm" style={{ color: "var(--ink-faint)" }}>No submissions match these filters.</div>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--line)", background: "var(--bg-card)" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--bg)" }}>
              <tr className="font-mono text-[10px] tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)" }}>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Thesis</th>
                <th className="text-left px-4 py-3">HEI</th>
                <th className="text-left px-4 py-3">Submitted</th>
                <th className="text-left px-4 py-3">Similarity</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map(t => (
                <tr key={t.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                  <td className="px-4 py-3"><StatusBadge status={t.status} size="sm"/></td>
                  <td className="px-4 py-3 max-w-sm">
                    <div className="truncate cursor-pointer hover:underline underline-offset-2" onClick={() => onOpenDetail(t.id)} style={{ color: "var(--ink)" }}>{t.titleEn}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: "var(--ink-faint)" }}>{t.author} · {t.degree} · {t.year}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: "var(--accent)" }}>{t.hei}</td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: "var(--ink-soft)" }}>{t.submittedAt || "—"}</td>
                  <td className="px-4 py-3">
                    {t.similarityScore != null ? (
                      <span className="font-mono text-sm font-semibold" style={{ color: t.similarityScore <= 15 ? "var(--green)" : t.similarityScore <= 20 ? "var(--orange)" : "var(--red)" }}>{t.similarityScore}%</span>
                    ) : <span className="text-xs" style={{ color: "var(--ink-faint)" }}>—</span>}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {(t.status === "submitted" || t.status === "under_review") ? (
                      <button onClick={() => onOpenReview(t.id)} className="btn btn-primary" style={{ padding: "5px 12px", fontSize: "12px" }}><ClipboardList size={12}/> Review</button>
                    ) : (
                      <button onClick={() => onOpenDetail(t.id)} className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "12px" }}><Eye size={12}/> View</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ======================================================================
// REVIEW PANEL (MoEYS reviewer decision surface)
// ======================================================================
function ReviewPanel({ thesis, hei, onDecision, onClose }) {
  const [checklist, setChecklist] = useState(
    thesis.qcChecklist || Object.fromEntries(QC_CHECKLIST.map(c => [c.id, false]))
  );
  const [feedback, setFeedback] = useState("");
  const [mode, setMode] = useState(null); // null | approve | revision | reject
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const toggle = (id) => setChecklist({ ...checklist, [id]: !checklist[id] });
  const allChecked = QC_CHECKLIST.every(c => checklist[c.id]);
  const checkedCount = QC_CHECKLIST.filter(c => checklist[c.id]).length;

  async function handleDownload() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch("/api/download-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thesisId: thesis.id, mode: "review" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Download failed (${res.status})`);
      }
      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setDownloadError(e.message);
    } finally {
      setDownloading(false);
    }
  }

  const submit = () => {
    if (!mode) return;
    if ((mode === "revision" || mode === "reject") && !feedback.trim()) {
      alert("Please provide feedback before " + (mode === "revision" ? "requesting revision" : "rejecting") + ".");
      return;
    }
    onDecision(thesis.id, mode, feedback, checklist);
  };

  const claim = () => onDecision(thesis.id, "claim");
  const isClaimed = thesis.status === "under_review";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel modal-wide" onClick={e => e.stopPropagation()}>
        <div className="p-8 md:p-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: "var(--accent)" }}>· Review panel ·</span>
              <StatusBadge status={thesis.status}/>
            </div>
            <button onClick={onClose} className="btn-ghost btn" style={{ padding: "6px" }}><X size={16}/></button>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`chip ${thesis.degree === "PhD" ? "chip-phd" : "chip-master"}`}>{thesis.degree === "PhD" ? "Doctorate" : "Master's"}</span>
              <span className="font-mono text-[11px] font-semibold" style={{ color: "var(--accent)" }}>{thesis.hei}</span>
              <span className="text-xs" style={{ color: "var(--ink-faint)" }}>· {thesis.year}</span>
              {thesis.callNumber && <span className="font-mono text-[10px]" style={{ color: "var(--ink-faint)" }}>{thesis.callNumber}</span>}
            </div>
            <h2 className="font-display text-2xl leading-tight" style={{ fontWeight: 500 }}>{thesis.titleEn}</h2>
            {thesis.titleKh && <div className="font-khmer text-base mt-1" style={{ color: "var(--ink-soft)" }}>{thesis.titleKh}</div>}
            <div className="text-sm mt-2" style={{ color: "var(--ink-soft)" }}>{thesis.author} · {thesis.faculty} · supervised by {thesis.supervisor}</div>
          </div>

          {thesis.abstract && (
            <div className="mb-6">
              <SectionLabel>Abstract</SectionLabel>
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>{thesis.abstract}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3 rounded-md border" style={{ borderColor: "var(--line)", background: "var(--bg)" }}>
              <div className="font-mono text-[10px] tracking-[0.15em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Similarity</div>
              <div className="font-display text-xl" style={{ color: thesis.similarityScore <= 15 ? "var(--green)" : thesis.similarityScore <= 20 ? "var(--orange)" : "var(--red)", fontWeight: 500 }}>{thesis.similarityScore ?? "—"}%</div>
            </div>
            <div className="p-3 rounded-md border" style={{ borderColor: "var(--line)", background: "var(--bg)" }}>
              <div className="font-mono text-[10px] tracking-[0.15em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Access</div>
              <div className="text-sm font-semibold">{thesis.accessLevel === "embargoed" ? `Embargoed until ${thesis.embargoUntil}` : "Open"}</div>
            </div>
            <div className="p-3 rounded-md border" style={{ borderColor: "var(--line)", background: "var(--bg)" }}>
              <div className="font-mono text-[10px] tracking-[0.15em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Submitted</div>
              <div className="text-sm font-semibold font-mono">{thesis.submittedAt}</div>
            </div>
          </div>

          <div className="mb-6">
            <SectionLabel>Thesis PDF</SectionLabel>
            {thesis.pdfFileKey ? (
              <div className="mt-2">
                <button onClick={handleDownload} disabled={downloading} className="btn btn-primary">
                  <Download size={14}/> {downloading ? "Preparing…" : "Download thesis PDF"}
                </button>
                {downloadError && (
                  <div className="mt-2 text-sm" style={{ color: "var(--red)" }}>
                    <AlertCircle size={14} className="inline mr-1"/> {downloadError}
                  </div>
                )}
              </div>
            ) : (thesis.files?.thesisMaster || thesis.files?.similarityReport) ? (
              // Legacy in-session uploads (sample data only) — kept so the
              // demo prototype still works for the seed theses
              <div className="space-y-2 mt-2">
                <AttachedFile label="Thesis — Master Copy" meta={thesis.files?.thesisMaster} tone="accent"/>
                {thesis.files?.thesisPublic && <AttachedFile label="Thesis — Public Version" meta={thesis.files.thesisPublic}/>}
                <AttachedFile label="Plagiarism Similarity Report" meta={thesis.files?.similarityReport}/>
              </div>
            ) : (
              <div className="mt-2 text-sm" style={{ color: "var(--ink-faint)" }}>
                No PDF available for this thesis.
              </div>
            )}
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Quality-control checklist</SectionLabel>
              <span className="font-mono text-xs" style={{ color: allChecked ? "var(--green)" : "var(--ink-faint)" }}>{checkedCount} / {QC_CHECKLIST.length}</span>
            </div>
            <div className="space-y-1">
              {QC_CHECKLIST.map(item => (
                <div key={item.id} className={`check-row ${checklist[item.id] ? "checked" : ""}`} onClick={() => toggle(item.id)}>
                  <input type="checkbox" checked={!!checklist[item.id]} onChange={() => toggle(item.id)} style={{ accentColor: "var(--green)", marginTop: "3px" }}/>
                  <span className="text-sm" style={{ color: checklist[item.id] ? "var(--ink)" : "var(--ink-soft)" }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {!isClaimed && thesis.status === "submitted" && (
            <div className="mb-5 p-4 rounded-md" style={{ background: "var(--bg)", border: "1px solid var(--line-strong)" }}>
              <div className="text-sm mb-2" style={{ color: "var(--ink-soft)" }}>This submission is in the queue but has not yet been claimed.</div>
              <button onClick={claim} className="btn btn-primary"><ClipboardList size={14}/> Claim this review</button>
            </div>
          )}

          {isClaimed && (
            <>
              {!mode && (
                <div className="flex items-center gap-2 pt-4 border-t flex-wrap" style={{ borderColor: "var(--line)" }}>
                  <div className="text-sm font-mono uppercase tracking-[0.15em] text-[11px] mr-auto" style={{ color: "var(--ink-faint)" }}>Decision</div>
                  <button onClick={() => setMode("revision")} className="btn btn-warn"><RotateCcw size={14}/> Request revision</button>
                  <button onClick={() => setMode("reject")} className="btn btn-reject"><XCircle size={14}/> Reject</button>
                  <button onClick={() => setMode("approve")} disabled={!allChecked} className="btn btn-success" style={{ opacity: allChecked ? 1 : 0.5, cursor: allChecked ? "pointer" : "not-allowed" }}><CheckCircle2 size={14}/> Approve & publish</button>
                </div>
              )}
              {!mode && !allChecked && (
                <div className="mt-3 text-xs flex items-center gap-1.5" style={{ color: "var(--orange)" }}>
                  <AlertTriangle size={12}/> Approval requires all quality-control items to be confirmed.
                </div>
              )}

              {mode && (
                <div className="pt-4 border-t" style={{ borderColor: "var(--line)" }}>
                  <div className="mb-3">
                    <SectionLabel>
                      {mode === "approve" ? "Approval note (optional)" : mode === "revision" ? "Revision feedback (required)" : "Rejection reason (required)"}
                    </SectionLabel>
                    <textarea className="field mt-2" rows={4}
                      value={feedback} onChange={e => setFeedback(e.target.value)}
                      placeholder={
                        mode === "revision" ? "Explain what needs to change for the HEI to resubmit. E.g., 'Similarity score above threshold. Please rewrite sections 3.2 and 4.1 with proper citation.'" :
                        mode === "reject" ? "State the grounds for rejection. This will be visible to the submitting HEI." :
                        "Optional note attached to the approval record."
                      }/>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setMode(null); setFeedback(""); }} className="btn btn-ghost">Back</button>
                    <button onClick={submit} className={`btn ${mode === "approve" ? "btn-success" : mode === "revision" ? "btn-warn" : "btn-reject"}`}>
                      Confirm {mode === "approve" ? "approval" : mode === "revision" ? "revision request" : "rejection"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {thesis.history?.length > 0 && (
            <div className="mt-8 pt-6 border-t" style={{ borderColor: "var(--line)" }}>
              <SectionLabel>Workflow history</SectionLabel>
              <div className="mt-3">
                {thesis.history.map((h, i) => (
                  <div key={i} className={`audit-step ${h.by === "System" ? "system" : ""}`}>
                    <div className="text-xs font-mono" style={{ color: "var(--ink-faint)" }}>{h.at}</div>
                    <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{h.by}</div>
                    <div className="text-sm" style={{ color: "var(--ink-soft)" }}>{h.action}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ======================================================================
// ADMIN — records & institutions
// ======================================================================
function AdminRecords({ theses, heis, onEdit, onDelete, onOpenDetail }) {
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("All");
  const filtered = theses.filter(t => {
    if (statusF !== "All" && t.status !== statusF) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (t.titleEn + " " + t.author + " " + t.hei + " " + (t.callNumber || "")).toLowerCase().includes(s);
  });

  return (
    <div className="mt-10">
      <div className="mb-8">
        <div className="font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: "var(--ink-faint)" }}>System administration</div>
        <h2 className="font-display text-3xl md:text-4xl" style={{ fontWeight: 400 }}>
          <span style={{ fontStyle: "italic", fontWeight: 300 }}>All</span> records
        </h2>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-faint)" }}/>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search records…" className="field" style={{ paddingLeft: "32px" }}/>
        </div>
        <select value={statusF} onChange={e => setStatusF(e.target.value)} className="field" style={{ width: "auto" }}>
          <option value="All">All statuses</option>
          {Object.entries(STATUSES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--line)", background: "var(--bg-card)" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "var(--bg)" }}>
            <tr className="font-mono text-[10px] tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)" }}>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Author</th>
              <th className="text-left px-4 py-3">HEI</th>
              <th className="text-left px-4 py-3">Year</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 font-display italic" style={{ color: "var(--ink-faint)" }}>No records.</td></tr>
            ) : filtered.map(t => (
              <tr key={t.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                <td className="px-4 py-3"><StatusBadge status={t.status} size="sm"/></td>
                <td className="px-4 py-3 max-w-sm">
                  <div className="truncate cursor-pointer hover:underline underline-offset-2" onClick={() => onOpenDetail(t.id)} style={{ color: "var(--ink)" }}>{t.titleEn}</div>
                </td>
                <td className="px-4 py-3" style={{ color: "var(--ink-soft)" }}>{t.author}</td>
                <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: "var(--accent)" }}>{t.hei}</td>
                <td className="px-4 py-3 font-mono" style={{ color: "var(--ink-soft)" }}>{t.year}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => onEdit(t.id)} className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "12px" }}><Edit2 size={12}/></button>
                  <button onClick={() => onDelete(t.id)} className="btn btn-danger ml-1" style={{ padding: "5px 10px", fontSize: "12px" }}><Trash2 size={12}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminHeis({ heis, showToast }) {
  const [users, setUsers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  // Coordinators per HEI — fetched once on mount and again after any
  // create/edit so the table reflects the current assignment state.
  const refreshUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch { /* best-effort */ }
  };
  useEffect(() => { refreshUsers(); }, []);

  const coordinatorsByHeiId = useMemo(() => {
    const map = {};
    for (const u of users) {
      if (u.role === "HEI_COORDINATOR" && u.hei?.id && u.isActive) {
        if (!map[u.hei.id]) map[u.hei.id] = [];
        map[u.hei.id].push(u);
      }
    }
    return map;
  }, [users]);

  return (
    <div className="mt-10">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: "var(--ink-faint)" }}>Registered institutions</div>
          <h2 className="font-display text-3xl md:text-4xl" style={{ fontWeight: 400 }}>
            <span style={{ fontStyle: "italic", fontWeight: 300 }}>Higher Education</span> Institutions
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--ink-soft)" }}>{heis.length} institutions registered. Click Edit on any row to update its details, or add an HEI / abroad scholar below.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary"><Plus size={14}/> Add HEI or Scholar</button>
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--line)", background: "var(--bg-card)" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "var(--bg)" }}>
            <tr className="font-mono text-[10px] tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)" }}>
              <th className="text-left px-4 py-3">Code</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Ministry</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Coordinators</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {heis.map(h => {
              const coords = coordinatorsByHeiId[h.id] || [];
              return (
                <tr key={h.code} className="border-t" style={{ borderColor: "var(--line)" }}>
                  <td className="px-4 py-3 font-mono text-sm font-semibold align-top" style={{ color: "var(--accent)" }}>{h.code}</td>
                  <td className="px-4 py-3 align-top" style={{ color: "var(--ink)" }}>
                    <div>{h.name}</div>
                    {h.nameKh && <div className="font-khmer text-xs mt-0.5" style={{ color: "var(--ink-soft)" }}>{h.nameKh}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs align-top" style={{ color: "var(--ink-soft)" }}>{h.ministry || "—"}</td>
                  <td className="px-4 py-3 text-xs align-top">
                    <span className="px-2 py-0.5 rounded" style={{ background: h.type === "Public" ? "rgba(61,107,74,0.1)" : h.type === "International" ? "rgba(10,42,107,0.10)" : "rgba(176,133,56,0.1)", color: h.type === "Public" ? "var(--green)" : h.type === "International" ? "var(--accent)" : "var(--gold)", fontWeight: 600 }}>{h.type || "—"}</span>
                  </td>
                  <td className="px-4 py-3 align-top" style={{ color: "var(--ink-soft)" }}>
                    {coords.length === 0 ? (
                      <span className="text-xs italic" style={{ color: "var(--ink-faint)" }}>None assigned</span>
                    ) : (
                      <div className="space-y-0.5">
                        {coords.map(c => (
                          <div key={c.id} className="text-xs">
                            {c.name && <span style={{ color: "var(--ink)" }}>{c.name}</span>}
                            {c.name && <span style={{ color: "var(--ink-faint)" }}> · </span>}
                            <span className="font-mono" style={{ color: "var(--ink-faint)" }}>{c.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <button onClick={() => setEditing(h)} className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "12px" }}>
                      <Edit2 size={12}/> Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddHeiOrScholarModal
          heis={heis}
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); showToast("Created"); setTimeout(() => window.location.reload(), 700); }}
          showToast={showToast}
        />
      )}
      {editing && (
        <EditHeiModal
          hei={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); showToast("Institution updated"); setTimeout(() => window.location.reload(), 700); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function AddHeiOrScholarModal({ heis, onClose, onCreated, showToast }) {
  const [kind, setKind] = useState("hei"); // hei | scholar
  const [submitting, setSubmitting] = useState(false);

  // HEI fields
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [nameKh, setNameKh] = useState("");
  const [ministry, setMinistry] = useState("MoEYS");
  const [type, setType] = useState("Public");
  const [city, setCity] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Scholar fields
  const [sEmail, setSEmail] = useState("");
  const [sName, setSName] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (kind === "hei") {
        const res = await fetch("/api/heis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shortCode: code,
            name,
            nameKhmer: nameKh || undefined,
            ministry,
            type,
            city: city || undefined,
            contactEmail: contactEmail || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Create failed (${res.status})`);
        }
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: sEmail,
            name: sName || undefined,
            role: "HEI_COORDINATOR",
            heiCode: "INDEP",
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Create failed (${res.status})`);
        }
      }
      onCreated();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <form onSubmit={submit} className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="font-display text-2xl mb-1" style={{ fontWeight: 500 }}>Add HEI or Scholar</h3>
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>Choose what you&apos;re adding below.</p>
            </div>
            <button type="button" onClick={onClose} className="btn-ghost btn" style={{ padding: 6 }}><X size={16}/></button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button type="button" onClick={() => setKind("hei")} className="text-left p-4 rounded-md border transition-all" style={{
              borderColor: kind === "hei" ? "var(--accent)" : "var(--line)",
              background: kind === "hei" ? "rgba(10,42,107,0.05)" : "var(--bg)",
            }}>
              <div className="text-xs font-mono tracking-wider uppercase mb-1" style={{ color: kind === "hei" ? "var(--accent)" : "var(--ink-faint)", fontWeight: 600 }}>
                Higher Education Institution
              </div>
              <div className="text-sm" style={{ color: "var(--ink-soft)" }}>A new university or institute (e.g., RUFA, NUM)</div>
            </button>
            <button type="button" onClick={() => setKind("scholar")} className="text-left p-4 rounded-md border transition-all" style={{
              borderColor: kind === "scholar" ? "var(--accent)" : "var(--line)",
              background: kind === "scholar" ? "rgba(10,42,107,0.05)" : "var(--bg)",
            }}>
              <div className="text-xs font-mono tracking-wider uppercase mb-1" style={{ color: kind === "scholar" ? "var(--accent)" : "var(--ink-faint)", fontWeight: 600 }}>
                Individual Scholar (Abroad)
              </div>
              <div className="text-sm" style={{ color: "var(--ink-soft)" }}>A Cambodian who studied at a foreign institution. Auto-assigned to INDEP.</div>
            </button>
          </div>

          {kind === "hei" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <FormRow label="Code (short) *" hint="3–6 letters; uppercase. e.g., RUPP">
                  <input required className="field font-mono uppercase" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={10} placeholder="RUFA"/>
                </FormRow>
                <FormRow label="Type">
                  <select className="field" value={type} onChange={e => setType(e.target.value)}>
                    <option>Public</option><option>Private</option><option>International</option>
                  </select>
                </FormRow>
                <FormRow label="Ministry">
                  <select className="field" value={ministry} onChange={e => setMinistry(e.target.value)}>
                    {SUPERVISING_MINISTRIES.map(m => <option key={m.code} value={m.code}>{m.code}</option>)}
                  </select>
                </FormRow>
              </div>
              <FormRow label="Full name *">
                <input required className="field" value={name} onChange={e => setName(e.target.value)} placeholder="Royal University of Fine Arts"/>
              </FormRow>
              <FormRow label="Khmer name (optional)">
                <input className="field font-khmer" value={nameKh} onChange={e => setNameKh(e.target.value)}/>
              </FormRow>
              <div className="grid grid-cols-2 gap-3">
                <FormRow label="City (optional)">
                  <input className="field" value={city} onChange={e => setCity(e.target.value)} placeholder="Phnom Penh"/>
                </FormRow>
                <FormRow label="Contact email (optional)">
                  <input type="email" className="field" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="library@example.edu.kh"/>
                </FormRow>
              </div>
              <p className="text-xs italic" style={{ color: "var(--ink-faint)" }}>
                After registering, use the Users tab to assign a coordinator to this institution.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <FormRow label="Email *" hint="Where the scholar will receive sign-in links and notifications.">
                <input type="email" required className="field" value={sEmail} onChange={e => setSEmail(e.target.value)} placeholder="dara@stanford.edu"/>
              </FormRow>
              <FormRow label="Full name (optional)">
                <input className="field" value={sName} onChange={e => setSName(e.target.value)} placeholder="Sok Dara"/>
              </FormRow>
              <p className="text-xs italic p-3 rounded" style={{ color: "var(--ink-faint)", background: "var(--bg)", borderLeft: "2px solid var(--line-strong)" }}>
                The scholar will be added as an HEI Coordinator assigned to <strong>INDEP</strong> (Independent / Studied Abroad). They&apos;ll fill in their foreign institution name and country on their submission form.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-8 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? "Adding…" : kind === "hei" ? "Register institution" : "Add scholar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditHeiModal({ hei, onClose, onSaved, showToast }) {
  const [code, setCode] = useState(hei.code || "");
  const [name, setName] = useState(hei.name || "");
  const [nameKh, setNameKh] = useState(hei.nameKh || "");
  const [ministry, setMinistry] = useState(hei.ministry || "MoEYS");
  const [type, setType] = useState(hei.type || "Public");
  const [city, setCity] = useState(hei.city || "");
  const [contactEmail, setContactEmail] = useState(hei.contactEmail || "");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/heis/${hei.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shortCode: code,
          name,
          nameKhmer: nameKh,
          ministry,
          type,
          city,
          contactEmail,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Save failed (${res.status})`);
      }
      onSaved();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <form onSubmit={submit} className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="font-display text-2xl mb-1" style={{ fontWeight: 500 }}>Edit institution</h3>
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>Update the details of <span className="font-mono font-semibold" style={{ color: "var(--accent)" }}>{hei.code}</span>.</p>
            </div>
            <button type="button" onClick={onClose} className="btn-ghost btn" style={{ padding: 6 }}><X size={16}/></button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <FormRow label="Code (short) *" hint="Changing this is safe — theses link by ID, not code.">
                <input required className="field font-mono uppercase" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={10}/>
              </FormRow>
              <FormRow label="Type">
                <select className="field" value={type} onChange={e => setType(e.target.value)}>
                  <option>Public</option><option>Private</option><option>International</option>
                </select>
              </FormRow>
              <FormRow label="Ministry">
                <select className="field" value={ministry} onChange={e => setMinistry(e.target.value)}>
                  {SUPERVISING_MINISTRIES.map(m => <option key={m.code} value={m.code}>{m.code}</option>)}
                </select>
              </FormRow>
            </div>
            <FormRow label="Full name *">
              <input required className="field" value={name} onChange={e => setName(e.target.value)}/>
            </FormRow>
            <FormRow label="Khmer name">
              <input className="field font-khmer" value={nameKh} onChange={e => setNameKh(e.target.value)}/>
            </FormRow>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="City">
                <input className="field" value={city} onChange={e => setCity(e.target.value)}/>
              </FormRow>
              <FormRow label="Contact email">
                <input type="email" className="field" value={contactEmail} onChange={e => setContactEmail(e.target.value)}/>
              </FormRow>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-8 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ======================================================================
// ADMIN USERS — manage who can sign in and what role they have
// ======================================================================
function AdminUsers({ heis, showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      showToast(`Failed to load users: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function toggleActive(u) {
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Update failed (${res.status})`);
      }
      showToast(u.isActive ? "User deactivated" : "User activated");
      refresh();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.email || "").toLowerCase().includes(q) ||
      (u.name || "").toLowerCase().includes(q) ||
      (u.hei?.shortCode || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const roleLabel = (r) => r === "ADMIN" ? "Admin" : r === "REVIEWER" ? "Reviewer" : "HEI Coordinator";

  return (
    <div className="mt-10">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: "var(--ink-faint)" }}>Administrator</div>
          <h2 className="font-display text-3xl md:text-4xl" style={{ fontWeight: 400 }}>
            <span style={{ fontStyle: "italic", fontWeight: 300 }}>User</span> management
          </h2>
          <p className="mt-2 text-sm max-w-2xl" style={{ color: "var(--ink-soft)" }}>
            Provision MoEYS staff, HEI Coordinators, and abroad-scholar accounts. Inactive users cannot sign in. Sign-in is invitation-only — no one can access the platform without a row here.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary"><Plus size={14}/> Add user</button>
      </div>

      <div className="mb-4 relative max-w-md">
        <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-faint)" }}/>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by email, name, or HEI…"
          className="field"
          style={{ paddingLeft: 32 }}
        />
      </div>

      {loading ? (
        <div className="py-16 text-center font-display italic text-lg" style={{ color: "var(--ink-faint)" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center border rounded-lg" style={{ borderColor: "var(--line)", background: "var(--bg-card)", color: "var(--ink-faint)" }}>
          <div className="font-display italic text-lg">No users match your search.</div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden" style={{ borderColor: "var(--line)", background: "var(--bg-card)" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--bg)" }}>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                <th className="text-left px-4 py-3 font-mono text-[10px] tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)" }}>Email</th>
                <th className="text-left px-4 py-3 font-mono text-[10px] tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)" }}>Name</th>
                <th className="text-left px-4 py-3 font-mono text-[10px] tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)" }}>Role</th>
                <th className="text-left px-4 py-3 font-mono text-[10px] tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)" }}>Institution</th>
                <th className="text-left px-4 py-3 font-mono text-[10px] tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)" }}>Status</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-3">{u.name || <span style={{ color: "var(--ink-faint)" }}>—</span>}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: u.role === "ADMIN" ? "rgba(168,118,26,0.15)" : u.role === "REVIEWER" ? "rgba(10,42,107,0.15)" : "var(--bg)", color: u.role === "ADMIN" ? "var(--gold)" : u.role === "REVIEWER" ? "var(--accent)" : "var(--ink-soft)" }}>
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{u.hei?.shortCode || <span style={{ color: "var(--ink-faint)" }}>—</span>}</td>
                  <td className="px-4 py-3">
                    {u.isActive ? (
                      <span className="text-xs font-semibold" style={{ color: "var(--green)" }}>● Active</span>
                    ) : (
                      <span className="text-xs font-semibold" style={{ color: "var(--ink-faint)" }}>○ Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggleActive(u)} className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "12px" }}>
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddUserModal
          heis={heis}
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); refresh(); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function AddUserModal({ heis, onClose, onCreated, showToast }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("HEI_COORDINATOR");
  const [heiCode, setHeiCode] = useState(heis[0]?.code || "");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || undefined,
          role,
          heiCode: role === "HEI_COORDINATOR" ? heiCode : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Create failed (${res.status})`);
      }
      const data = await res.json();
      showToast(data.reactivated ? "Existing user reactivated" : "User created");
      onCreated();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <form onSubmit={submit} className="p-8">
          <div className="flex items-start justify-between mb-6">
            <h2 className="font-display text-2xl" style={{ fontWeight: 500 }}>Add user</h2>
            <button type="button" onClick={onClose} className="btn-ghost btn" style={{ padding: 6 }}><X size={16}/></button>
          </div>

          <div className="space-y-5">
            <FormRow label="Email *">
              <input type="email" required className="field" value={email} onChange={e => setEmail(e.target.value)} placeholder="dara@stanford.edu"/>
            </FormRow>
            <FormRow label="Full name" hint="As you'd like it shown in the system. Optional.">
              <input className="field" value={name} onChange={e => setName(e.target.value)} placeholder="Sok Dara"/>
            </FormRow>
            <FormRow label="Role *">
              <select className="field" value={role} onChange={e => setRole(e.target.value)}>
                <option value="HEI_COORDINATOR">HEI Coordinator</option>
                <option value="REVIEWER">MoEYS Reviewer</option>
                <option value="ADMIN">MoEYS Admin</option>
              </select>
            </FormRow>
            {role === "HEI_COORDINATOR" && (
              <FormRow label="Institution *" hint="For abroad scholars, choose INDEP.">
                <select className="field" value={heiCode} onChange={e => setHeiCode(e.target.value)}>
                  {heis.map(h => <option key={h.code} value={h.code}>{h.code} — {h.name}</option>)}
                </select>
              </FormRow>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 mt-8 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? "Adding…" : "Add user"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ======================================================================
// DASHBOARD (visible to Administrator & Minister only)
// ======================================================================
function DashboardView({ theses, heis, role }) {
  const [range, setRange] = useState("all"); // all | 5y | year

  const metrics = useMemo(() => {
    const published = theses.filter(t => t.status === "published" || t.status === "embargoed");
    const currentYear = new Date().getFullYear();

    const scoped = range === "all"
      ? published
      : range === "5y"
        ? published.filter(t => t.year >= currentYear - 4)
        : published.filter(t => t.year === currentYear);

    const byYear = {}, byDegree = { Master: 0, PhD: 0 }, byLanguage = {};
    const byHei = {}, byMinistry = {}, keywordCounts = {};
    let simTotal = 0, simCount = 0;

    scoped.forEach(t => {
      byYear[t.year] = (byYear[t.year] || 0) + 1;
      if (byDegree[t.degree] != null) byDegree[t.degree]++;
      byLanguage[t.language || "Unknown"] = (byLanguage[t.language || "Unknown"] || 0) + 1;
      byHei[t.hei] = (byHei[t.hei] || 0) + 1;
      const hei = heis.find(h => h.code === t.hei);
      if (hei?.ministry) byMinistry[hei.ministry] = (byMinistry[hei.ministry] || 0) + 1;
      (t.keywords || []).forEach(kw => {
        const k = kw.toLowerCase();
        keywordCounts[k] = (keywordCounts[k] || 0) + 1;
      });
      if (t.similarityScore != null) { simTotal += t.similarityScore; simCount++; }
    });

    const totalProcessed = theses.filter(t => ["published", "embargoed", "rejected"].includes(t.status)).length;
    const rejectedCount = theses.filter(t => t.status === "rejected").length;
    const revisionCount = theses.filter(t => t.status === "revision_requested").length;
    const approvalRate = totalProcessed > 0
      ? Math.round(((totalProcessed - rejectedCount) / totalProcessed) * 100)
      : 100;

    const activeYears = Object.keys(byYear).sort();
    const yearSeries = activeYears.map(y => ({ year: y, count: byYear[y] }));

    const pipeline = {
      submitted: theses.filter(t => t.status === "submitted").length,
      underReview: theses.filter(t => t.status === "under_review").length,
      revisionRequested: revisionCount,
      rejected: rejectedCount,
    };

    return {
      total: scoped.length,
      totalAllTime: published.length,
      thisYear: published.filter(t => t.year === currentYear).length,
      activeInstitutions: Object.keys(byHei).length,
      totalInstitutions: heis.length,
      yearSeries,
      byDegree: [
        { name: "Master's", value: byDegree.Master || 0 },
        { name: "Doctorate", value: byDegree.PhD || 0 },
      ],
      byLanguage: Object.entries(byLanguage).map(([k, v]) => ({ name: k, value: v })),
      topHeis: Object.entries(byHei).sort(([,a],[,b]) => b - a).slice(0, 10).map(([hei, count]) => ({ hei, count })),
      byMinistry: Object.entries(byMinistry).map(([k, v]) => ({ name: k, value: v })).sort((a,b) => b.value - a.value),
      topKeywords: Object.entries(keywordCounts).sort(([,a],[,b]) => b - a).slice(0, 12),
      avgSimilarity: simCount > 0 ? (simTotal / simCount).toFixed(1) : "—",
      pipeline,
      approvalRate,
      phdShare: scoped.length > 0 ? Math.round(((byDegree.PhD || 0) / scoped.length) * 100) : 0,
    };
  }, [theses, heis, range]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mt-10">
      {/* Header strip */}
      <div className="flex items-start justify-between mb-10 flex-wrap gap-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase mb-2" style={{ color: "var(--ink-faint)" }}>
            {role === "minister" ? "Ministerial briefing" : "Analytics dashboard"}
          </div>
          <h2 className="font-display text-3xl md:text-4xl" style={{ fontWeight: 400 }}>
            <span style={{ fontStyle: "italic", fontWeight: 300 }}>State of</span>{" "}
            Graduate Research
          </h2>
          <p className="mt-2 text-sm max-w-2xl" style={{ color: "var(--ink-soft)" }}>
            An aggregate view of Master's and Doctoral theses admitted to the National Thesis Archive. Data reflects records through <span className="font-mono">{today}</span>.
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-md border" style={{ borderColor: "var(--line)", background: "var(--bg-card)" }}>
          {[{ id: "all", label: "All time" }, { id: "5y", label: "Last 5 years" }, { id: "year", label: "This year" }].map(r => (
            <button key={r.id} onClick={() => setRange(r.id)}
              className="px-3 py-1.5 text-xs rounded"
              style={{ background: range === r.id ? "var(--accent)" : "transparent", color: range === r.id ? "var(--accent-ink)" : "var(--ink-soft)", fontWeight: range === r.id ? 600 : 400 }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top KPI band */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <KpiBig label="Theses in view" value={metrics.total} sublabel={range === "all" ? `of ${metrics.totalAllTime} total` : `of ${metrics.totalAllTime} all-time`}/>
        <KpiBig label="This year" value={metrics.thisYear} sublabel={`new in ${new Date().getFullYear()}`}/>
        <KpiBig label="Active HEIs" value={metrics.activeInstitutions} sublabel={`of ${metrics.totalInstitutions} registered`}/>
        <KpiBig label="Doctoral share" value={`${metrics.phdShare}%`} sublabel="of selected set"/>
        <KpiBig label="Approval rate" value={`${metrics.approvalRate}%`} sublabel="processed records"/>
      </div>

      <OrnamentalDivider/>

      {/* Publication trend */}
      <DashCard title="Annual Publication Trend" subtitle="Theses admitted to the archive by year of submission.">
        {metrics.yearSeries.length === 0 ? (
          <EmptyChart/>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={metrics.yearSeries} margin={{ top: 16, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--line)" vertical={false}/>
              <XAxis dataKey="year" stroke="var(--ink-faint)" fontSize={11} tickLine={false} axisLine={{ stroke: "var(--line-strong)" }}/>
              <YAxis stroke="var(--ink-faint)" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false}/>
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(122,30,46,0.06)" }}/>
              <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} barSize={36}/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </DashCard>

      {/* Two-column: Degree + Language */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <DashCard title="Degree Composition" subtitle="Balance of Master's and Doctoral output.">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie data={metrics.byDegree} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={3} stroke="var(--bg-card)" strokeWidth={2}>
                  <Cell fill="var(--accent)"/>
                  <Cell fill="var(--gold)"/>
                </Pie>
                <Tooltip contentStyle={tooltipStyle}/>
              </PieChart>
            </ResponsiveContainer>
            <LegendList items={[
              { label: "Master's", value: metrics.byDegree[0].value, color: "var(--accent)" },
              { label: "Doctorate", value: metrics.byDegree[1].value, color: "var(--gold)" },
            ]}/>
          </div>
        </DashCard>

        <DashCard title="Language of Thesis" subtitle="Working language declared at submission.">
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie data={metrics.byLanguage} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={3} stroke="var(--bg-card)" strokeWidth={2}>
                  {metrics.byLanguage.map((_, i) => (
                    <Cell key={i} fill={[`var(--accent)`, `var(--gold)`, `var(--blue)`, `var(--green)`, `var(--orange)`][i % 5]}/>
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle}/>
              </PieChart>
            </ResponsiveContainer>
            <LegendList items={metrics.byLanguage.map((l, i) => ({
              label: l.name, value: l.value,
              color: [`var(--accent)`, `var(--gold)`, `var(--blue)`, `var(--green)`, `var(--orange)`][i % 5],
            }))}/>
          </div>
        </DashCard>
      </div>

      {/* Institutional output */}
      <DashCard title="Institutional Contribution" subtitle="Top-producing higher education institutions." className="mt-6">
        {metrics.topHeis.length === 0 ? (
          <EmptyChart/>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(240, metrics.topHeis.length * 32)}>
            <BarChart data={metrics.topHeis} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--line)" horizontal={false}/>
              <XAxis type="number" stroke="var(--ink-faint)" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false}/>
              <YAxis type="category" dataKey="hei" stroke="var(--ink-faint)" fontSize={12} width={62} tickLine={false} axisLine={false} tick={{ fontFamily: "ui-monospace, monospace", fontWeight: 600 }}/>
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(122,30,46,0.06)" }}/>
              <Bar dataKey="count" fill="var(--accent)" radius={[0, 6, 6, 0]} barSize={20}/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </DashCard>

      {/* Ministry distribution + Top keywords */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <DashCard title="Supervising Ministry" subtitle={`Distribution across the ${SUPERVISING_MINISTRIES.length} ministries overseeing higher education.`}>
          {metrics.byMinistry.length === 0 ? (
            <EmptyChart/>
          ) : (
            <div className="space-y-2">
              {metrics.byMinistry.map(m => {
                const pct = Math.round((m.value / metrics.total) * 100);
                return (
                  <div key={m.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-semibold" style={{ color: "var(--accent)" }}>{m.name}</span>
                      <span style={{ color: "var(--ink-soft)" }}>{m.value} <span style={{ color: "var(--ink-faint)" }}>· {pct}%</span></span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                      <div className="h-full" style={{ width: `${pct}%`, background: "var(--accent)" }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashCard>

        <DashCard title="Leading Research Themes" subtitle="Most frequent keywords across the archive.">
          {metrics.topKeywords.length === 0 ? (
            <EmptyChart/>
          ) : (
            <div className="flex flex-wrap gap-2">
              {metrics.topKeywords.map(([kw, count], i) => {
                const max = metrics.topKeywords[0][1];
                const size = 11 + Math.round((count / max) * 9);
                return (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full"
                    style={{
                      fontSize: `${size}px`,
                      background: i < 3 ? "rgba(122,30,46,0.08)" : "var(--bg)",
                      color: i < 3 ? "var(--accent)" : "var(--ink-soft)",
                      border: "1px solid var(--line)",
                      fontWeight: i < 3 ? 600 : 400,
                    }}>
                    {kw}
                    <span className="font-mono text-[10px]" style={{ color: "var(--ink-faint)", fontWeight: 400 }}>{count}</span>
                  </span>
                );
              })}
            </div>
          )}
        </DashCard>
      </div>

      {/* Workflow health */}
      <DashCard title="Workflow & Quality Health" subtitle="Operational indicators from the review process." className="mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <WorkflowStat label="Pending review" value={metrics.pipeline.submitted + metrics.pipeline.underReview} sublabel="awaiting MoEYS decision" color="var(--blue)"/>
          <WorkflowStat label="Out for revision" value={metrics.pipeline.revisionRequested} sublabel="returned to HEI" color="var(--orange)"/>
          <WorkflowStat label="Rejected (all time)" value={metrics.pipeline.rejected} sublabel="not admitted" color="var(--red)"/>
          <WorkflowStat label="Avg. similarity" value={`${metrics.avgSimilarity}%`} sublabel="across approved theses" color={metrics.avgSimilarity === "—" ? "var(--ink-faint)" : (parseFloat(metrics.avgSimilarity) <= 15 ? "var(--green)" : parseFloat(metrics.avgSimilarity) <= 20 ? "var(--orange)" : "var(--red)")}/>
        </div>
      </DashCard>

      {/* Closing note */}
      <div className="mt-10 pt-6 border-t text-xs italic" style={{ borderColor: "var(--line)", color: "var(--ink-faint)" }}>
        This dashboard is generated from the live contents of the National Thesis Archive. Source of record: MoEYS Department of Research and Innovation. Figures refresh automatically as new theses are approved.
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--bg-card)",
  border: "1px solid var(--line-strong)",
  borderRadius: "6px",
  fontSize: "12px",
  fontFamily: "'Manrope', sans-serif",
  boxShadow: "var(--shadow-lg)",
};

function KpiBig({ label, value, sublabel }) {
  return (
    <div className="p-5 rounded-lg border" style={{ borderColor: "var(--line)", background: "var(--bg-card)" }}>
      <div className="font-mono text-[10px] tracking-[0.15em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>{label}</div>
      <div className="font-display leading-none" style={{ fontSize: "44px", fontWeight: 400, color: "var(--ink)", letterSpacing: "-0.02em" }}>{value}</div>
      {sublabel && <div className="text-[11px] mt-1.5" style={{ color: "var(--ink-soft)" }}>{sublabel}</div>}
    </div>
  );
}

function DashCard({ title, subtitle, children, className = "" }) {
  return (
    <section className={`p-6 md:p-7 rounded-lg border ${className}`} style={{ borderColor: "var(--line)", background: "var(--bg-card)", boxShadow: "var(--shadow)" }}>
      <div className="mb-5">
        <h3 className="font-display text-lg md:text-xl" style={{ fontWeight: 500, color: "var(--ink)" }}>{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: "var(--ink-faint)" }}>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function LegendList({ items }) {
  return (
    <div className="flex-1 space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="inline-block rounded-sm" style={{ width: "10px", height: "10px", background: item.color }}/>
          <span className="flex-1 text-sm" style={{ color: "var(--ink-soft)" }}>{item.label}</span>
          <span className="font-display text-base font-semibold" style={{ color: "var(--ink)" }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function WorkflowStat({ label, value, sublabel, color }) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[0.15em] uppercase mb-1" style={{ color: "var(--ink-faint)" }}>{label}</div>
      <div className="font-display leading-none" style={{ fontSize: "32px", fontWeight: 500, color }}>{value}</div>
      {sublabel && <div className="text-[11px] mt-1" style={{ color: "var(--ink-soft)" }}>{sublabel}</div>}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="py-12 text-center font-display italic" style={{ color: "var(--ink-faint)" }}>
      No data in the selected period.
    </div>
  );
}

function OrnamentalDivider() {
  return <div className="ornate-divider mb-10" style={{ color: "var(--gold)" }}>❦</div>;
}

// ======================================================================
// FOOTER
// ======================================================================
function Footer() {
  return (
    <footer className="border-t mt-20" style={{ borderColor: "var(--line)" }}>
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 text-xs flex flex-wrap items-center justify-between gap-4" style={{ color: "var(--ink-faint)" }}>
        <div className="font-mono tracking-wider uppercase">Kingdom of Cambodia · MoEYS · Department of Research & Innovation</div>
        <div className="font-display italic">Custodians of scholarship, keepers of memory.</div>
      </div>
    </footer>
  );
}
