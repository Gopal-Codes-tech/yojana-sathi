/* YojanaSaathi frontend — vanilla JS, no build step.
   Privacy: the profile lives only in sessionStorage and is sent per request; the server never stores it.
   Only an anonymous random token (localStorage) identifies the reminder list. */
"use strict";

// ───────────────────────── i18n ─────────────────────────
const T = {
  en: {
    tagline: "Find welfare schemes you qualify for", mytrack: "My list",
    privacy: "🔒 We do not store Aadhaar or ID numbers. Your answers stay in this browser tab and are cleared when you close it.",
    verify: "ℹ️ Results are indicative. Always verify on the official portal before applying. Scheme data was compiled on the date shown on each scheme.",
    langBtn: "हिन्दी", voiceOn: "🔊 Voice guide: on", voiceOff: "🔊 Voice guide: off", assistOn: "🧑‍💼 Assisted mode: on", assistOff: "🧑‍💼 Assisted mode",
    welcomeH: "Which government schemes can you get?", welcomeP: "Answer 5 simple questions. We show only the schemes that fit you, with the documents you need and where to go.",
    beneficiary: "Beneficiary name (optional, for the printout)", start: "Start", resume: "Continue with my answers",
    next: "Next", back: "Back", skip: "Skip this question", show: "Show my schemes", listening: "Listening…", heard: "Heard:", notUnderstood: "Sorry, I could not understand. Please tap an option or type.",
    micUnsupported: "Voice input is not supported in this browser — please tap or type.", speak: "Speak", readAloud: "Read aloud",
    qGender: "Are you a man or a woman?", qAge: "How old are you?", qState: "Which state do you live in?", qIncome: "What is your family's yearly income (approx.)?", qOccupation: "What work do you do?",
    female: "Woman", male: "Man", other: "Other", agePh: "Age in years", incomePh: "Amount in ₹ per year", pickState: "Choose your state",
    district: "District / city (for the nearest CSC link)", inc1: "Up to ₹1 lakh", inc2: "Up to ₹2.5 lakh", inc3: "Up to ₹5 lakh", inc4: "Up to ₹9 lakh", inc5: "More than ₹9 lakh", incHint: "Type the exact amount for a more accurate result.",
    farmer: "Farmer", labourer: "Daily-wage worker", student: "Student", self_employed: "Own business / shop", street_vendor: "Street vendor", salaried: "Salaried job", homemaker: "Homemaker", retired: "Retired / senior citizen", unemployed: "Looking for work",
    resultsH: "Schemes for you", found: "found out of", ofTotal: "schemes", sureLbl: "Eligible", likelyLbl: "Likely", possLbl: "Confirm",
    eligible: "Eligible", likely: "Likely eligible", possible: "Answer a question to confirm",
    sec1: "You are eligible / likely eligible", sec2: "Answer a few more questions to confirm", none: "No scheme matched these answers. Try changing an answer or answering the extra questions.",
    refineH: "Answer these to confirm", yes: "Yes", no: "No", edit: "Change my answers", newPerson: "Next person", why: "Why you match", explain: "Explain simply", explaining: "Explaining…", aiNote: "Rephrased by AI from official scheme text — verify details on the portal.",
    howH: "How to apply", docsH: "Documents checklist", docsDone: "ready", deadline: "Deadline / timing", portal: "Official portal", csc: "Nearest CSC / office", summary: "Application summary", track: "Track & remind me",
    level_central: "Central", level_state: "State", asOf: "Data compiled", copy: "Copy", print: "Print", copied: "Copied", close: "Close",
    trackH: "Track & remind", remindOn: "Remind me on", statusLbl: "Status", save: "Save", saved: "Saved to your list", del: "Remove", cal: "Add to calendar",
    st_interested: "Interested", st_documents_ready: "Documents ready", st_applied: "Applied", st_approved: "Approved", st_rejected: "Rejected",
    trackEmpty: "Nothing saved yet. Open a scheme and tap “Track & remind me”.", trackDue: "Due", err: "Something went wrong. Please try again.",
    q_owns_land: "Does your family own farm land?", q_pregnant: "Are you pregnant or breastfeeding?", q_girl_child: "Do you have a daughter below 18?",
    q_has_pucca: "Does your family already have a pucca (concrete) house?", q_has_lpg: "Do you already have an LPG gas connection at home?", q_has_bank_account: "Do you have a savings bank account?",
    q_category: "Which category do you belong to?", general: "General", obc: "OBC", sc: "SC", st: "ST",
  },
  hi: {
    tagline: "आपके लिए सरकारी योजनाएँ खोजें", mytrack: "मेरी सूची",
    privacy: "🔒 हम आधार या पहचान संख्या सुरक्षित नहीं करते। आपके जवाब सिर्फ़ इस ब्राउज़र टैब में रहते हैं और टैब बंद होते ही मिट जाते हैं।",
    verify: "ℹ️ नतीजे सांकेतिक हैं। आवेदन से पहले आधिकारिक पोर्टल पर ज़रूर जाँच करें। योजनाओं का डेटा हर योजना पर दी तारीख़ को संकलित किया गया था।",
    langBtn: "English", voiceOn: "🔊 आवाज़ गाइड: चालू", voiceOff: "🔊 आवाज़ गाइड: बंद", assistOn: "🧑‍💼 सहायक मोड: चालू", assistOff: "🧑‍💼 सहायक मोड",
    welcomeH: "आपको कौन-सी सरकारी योजनाएँ मिल सकती हैं?", welcomeP: "5 आसान सवालों के जवाब दीजिए। हम सिर्फ़ वही योजनाएँ दिखाएँगे जो आपके लिए हैं, साथ में ज़रूरी दस्तावेज़ और कहाँ जाना है।",
    beneficiary: "लाभार्थी का नाम (वैकल्पिक, प्रिंट के लिए)", start: "शुरू करें", resume: "मेरे जवाबों के साथ आगे बढ़ें",
    next: "आगे", back: "पीछे", skip: "यह सवाल छोड़ें", show: "मेरी योजनाएँ दिखाएँ", listening: "सुन रहा हूँ…", heard: "सुना:", notUnderstood: "माफ़ कीजिए, समझ नहीं आया। कृपया विकल्प दबाएँ या लिखें।",
    micUnsupported: "इस ब्राउज़र में आवाज़ से जवाब देना उपलब्ध नहीं है — कृपया दबाएँ या लिखें।", speak: "बोलिए", readAloud: "सुनिए",
    qGender: "आप पुरुष हैं या महिला?", qAge: "आपकी उम्र कितनी है?", qState: "आप किस राज्य में रहते हैं?", qIncome: "आपके परिवार की सालाना आमदनी लगभग कितनी है?", qOccupation: "आप क्या काम करते हैं?",
    female: "महिला", male: "पुरुष", other: "अन्य", agePh: "उम्र (साल में)", incomePh: "सालाना रकम ₹ में", pickState: "अपना राज्य चुनें",
    district: "ज़िला / शहर (नज़दीकी CSC लिंक के लिए)", inc1: "₹1 लाख तक", inc2: "₹2.5 लाख तक", inc3: "₹5 लाख तक", inc4: "₹9 लाख तक", inc5: "₹9 लाख से ज़्यादा", incHint: "सटीक नतीजे के लिए सही रकम लिखें।",
    farmer: "किसान", labourer: "दिहाड़ी मज़दूर", student: "विद्यार्थी", self_employed: "अपना व्यवसाय / दुकान", street_vendor: "रेहड़ी-पटरी वाले", salaried: "नौकरीपेशा", homemaker: "गृहिणी", retired: "सेवानिवृत्त / वरिष्ठ नागरिक", unemployed: "काम की तलाश में",
    resultsH: "आपके लिए योजनाएँ", found: "मिलीं, कुल", ofTotal: "में से", sureLbl: "पात्र", likelyLbl: "संभावित", possLbl: "पुष्टि करें",
    eligible: "पात्र", likely: "संभवतः पात्र", possible: "पुष्टि के लिए एक सवाल का जवाब दें",
    sec1: "आप पात्र / संभवतः पात्र हैं", sec2: "पुष्टि के लिए कुछ और सवालों के जवाब दें", none: "इन जवाबों से कोई योजना नहीं मिली। कोई जवाब बदलकर देखें या अतिरिक्त सवालों के जवाब दें।",
    refineH: "पुष्टि के लिए ये बताइए", yes: "हाँ", no: "नहीं", edit: "जवाब बदलें", newPerson: "अगला व्यक्ति", why: "आप क्यों पात्र हैं", explain: "आसान भाषा में समझाएँ", explaining: "समझा रहा हूँ…", aiNote: "आधिकारिक योजना-पाठ को AI ने आसान भाषा में लिखा है — विवरण पोर्टल पर जाँच लें।",
    howH: "आवेदन कैसे करें", docsH: "दस्तावेज़ों की सूची", docsDone: "तैयार", deadline: "अंतिम तिथि / समय", portal: "आधिकारिक पोर्टल", csc: "नज़दीकी CSC / कार्यालय", summary: "आवेदन सारांश", track: "ट्रैक करें और याद दिलाएँ",
    level_central: "केंद्र", level_state: "राज्य", asOf: "डेटा संकलित", copy: "कॉपी", print: "प्रिंट", copied: "कॉपी हो गया", close: "बंद करें",
    trackH: "ट्रैक करें और याद दिलाएँ", remindOn: "मुझे इस तारीख़ को याद दिलाएँ", statusLbl: "स्थिति", save: "सेव करें", saved: "आपकी सूची में जुड़ गया", del: "हटाएँ", cal: "कैलेंडर में जोड़ें",
    st_interested: "रुचि है", st_documents_ready: "दस्तावेज़ तैयार", st_applied: "आवेदन किया", st_approved: "मंज़ूर", st_rejected: "अस्वीकृत",
    trackEmpty: "अभी कुछ सेव नहीं है। किसी योजना को खोलकर “ट्रैक करें और याद दिलाएँ” दबाएँ।", trackDue: "समय आ गया", err: "कुछ गड़बड़ हो गई। कृपया दोबारा कोशिश करें।",
    q_owns_land: "क्या आपके परिवार के पास खेती की ज़मीन है?", q_pregnant: "क्या आप गर्भवती हैं या स्तनपान करा रही हैं?", q_girl_child: "क्या आपकी 18 साल से कम उम्र की बेटी है?",
    q_has_pucca: "क्या आपके परिवार के पास पहले से पक्का घर है?", q_has_lpg: "क्या आपके घर में पहले से एलपीजी गैस कनेक्शन है?", q_has_bank_account: "क्या आपका बचत बैंक खाता है?",
    q_category: "आप किस वर्ग से हैं?", general: "सामान्य", obc: "ओबीसी", sc: "अनुसूचित जाति (SC)", st: "अनुसूचित जनजाति (ST)",
  },
};

// ───────────────────────── state ─────────────────────────
const store = {
  get lang() { return localStorage.getItem("ys_lang") || "hi"; }, set lang(v) { localStorage.setItem("ys_lang", v); },
  get voice() { return localStorage.getItem("ys_voice") === "1"; }, set voice(v) { localStorage.setItem("ys_voice", v ? "1" : "0"); },
  get assist() { return localStorage.getItem("ys_assist") === "1"; }, set assist(v) { localStorage.setItem("ys_assist", v ? "1" : "0"); },
  get token() {
    let t = localStorage.getItem("ys_token");
    if (!t) { const a = new Uint8Array(18); crypto.getRandomValues(a); t = btoa(String.fromCharCode(...a)).replace(/[+/=]/g, c => ({ "+": "-", "/": "_", "=": "" }[c])); localStorage.setItem("ys_token", t); }
    return t;
  },
  get profile() { try { return JSON.parse(sessionStorage.getItem("ys_profile") || "{}"); } catch { return {}; } },
  set profile(v) { sessionStorage.setItem("ys_profile", JSON.stringify(v)); },
  get meta() { try { return JSON.parse(sessionStorage.getItem("ys_meta") || "{}"); } catch { return {}; } },
  set meta(v) { sessionStorage.setItem("ys_meta", JSON.stringify(v)); },
  get docs() { try { return JSON.parse(sessionStorage.getItem("ys_docs") || "{}"); } catch { return {}; } },
  set docs(v) { sessionStorage.setItem("ys_docs", JSON.stringify(v)); },
};
const ui = { step: 0, meta: null, last: null, view: "welcome", district: sessionStorage.getItem("ys_district") || "" };
const t = k => (T[store.lang][k] ?? T.en[k] ?? k);
const $ = s => document.querySelector(s);

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v; // only used with static strings
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}
function toast(msg) { const el = $("#toast"); el.textContent = msg; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 2400); }
async function api(path, opts) {
  const r = await fetch(path, opts);
  if (!r.ok) throw new Error(r.status);
  return r.status === 204 ? null : r.json();
}
const post = (p, body, method = "POST") => api(p, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const L = obj => obj[store.lang === "hi" ? "name_hi" : "name_en"];
const pick = (o, base) => o[`${base}_${store.lang}`];

// ───────────────────────── voice ─────────────────────────
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechLang = () => (store.lang === "hi" ? "hi-IN" : "en-IN");
let recog = null;

function cancelSpeech() { if ("speechSynthesis" in window) speechSynthesis.cancel(); }
function speak(text, onend) {
  if (!("speechSynthesis" in window)) { onend && onend(); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.lang = speechLang(); u.rate = 0.95;
  if (onend) { u.onend = onend; u.onerror = onend; }
  speechSynthesis.speak(u);
}
function listen(onText, onState) {
  if (!SR) { toast(t("micUnsupported")); return; }
  stopListening();
  recog = new SR(); recog.lang = speechLang(); recog.interimResults = false; recog.maxAlternatives = 3;
  recog.onstart = () => onState && onState(true);
  recog.onend = () => onState && onState(false);
  recog.onerror = () => onState && onState(false);
  recog.onresult = e => { const alts = [...e.results[0]].map(a => a.transcript); onText(alts); };
  try { recog.start(); } catch { /* already started */ }
}
function stopListening() { try { recog && recog.abort(); } catch { /* noop */ } recog = null; }

// Spoken-answer parsing (Hindi, English and common Roman-Hindi words)
const DEV = "०१२३४५६७८९";
const normText = s => s.toLowerCase().replace(/[०-९]/g, d => DEV.indexOf(d)).replace(/(?<!\d)[.,]|[.,](?!\d)|[!?।]/g, " "); // keeps 2.5 and 1,20,000 intact
const NUMW = { "ek": 1, "एक": 1, "one": 1, "do": 2, "दो": 2, "two": 2, "teen": 3, "तीन": 3, "three": 3, "char": 4, "चार": 4, "four": 4, "paanch": 5, "panch": 5, "पांच": 5, "पाँच": 5, "five": 5, "chhe": 6, "छह": 6, "छे": 6, "six": 6, "saat": 7, "सात": 7, "seven": 7, "aath": 8, "आठ": 8, "eight": 8, "nau": 9, "नौ": 9, "nine": 9, "das": 10, "दस": 10, "ten": 10 };
function parseNumber(text) {
  const s = normText(text);
  let m = s.match(/(\d[\d,]*(?:\.\d+)?)\s*(lakh|lac|लाख|hazaar|hazar|हज़ार|हजार|thousand|k)?/);
  let n, unit;
  if (m) { n = parseFloat(m[1].replace(/,/g, "")); unit = m[2]; }
  else {
    const words = s.split(/\s+/); const hit = words.findIndex(w => NUMW[w]);
    if (hit < 0) return null;
    n = NUMW[words[hit]]; unit = words[hit + 1];
  }
  if (/lakh|lac|लाख/.test(unit || "")) n *= 100000;
  else if (/haz|हज़|हज|thousand|^k$/.test(unit || "")) n *= 1000;
  return Math.round(n);
}
function matchAlias(text, table) {
  const s = " " + normText(text) + " ";
  for (const [value, aliases] of table) if (aliases.some(a => s.includes(a))) return value;
  return null;
}
const ALIAS = {
  gender: [["female", ["female", "woman", "women", "mahila", "महिला", "औरत", "लड़की", "ladki", "aurat", "girl"]], ["male", ["male", "man", "purush", "पुरुष", "आदमी", "लड़का", "aadmi", "ladka", "boy"]], ["other", ["other", "अन्य", "transgender"]]],
  occupation: [
    ["street_vendor", ["vendor", "thela", "rehdi", "रेहड़ी", "ठेला", "पटरी", "फेरी", "hawker"]],
    ["farmer", ["farmer", "kisan", "किसान", "खेती", "kheti", "farming"]],
    ["labourer", ["labour", "mazdoor", "मज़दूर", "मजदूर", "dihadi", "दिहाड़ी", "worker", "मजदूरी"]],
    ["student", ["student", "vidyarthi", "विद्यार्थी", "छात्र", "छात्रा", "padhai", "पढ़ाई", "पढ़ रहा", "पढ़ रही"]],
    ["self_employed", ["business", "dukan", "दुकान", "व्यापार", "vyapar", "self employed", "स्वरोज़गार", "कारोबार", "व्यवसाय"]],
    ["salaried", ["job", "naukri", "नौकरी", "salaried", "employee"]],
    ["homemaker", ["homemaker", "housewife", "house wife", "गृहिणी", "घरेलू", "ghar"]],
    ["retired", ["retired", "senior", "pension", "सेवानिवृत्त", "रिटायर", "बुज़ुर्ग", "बुजुर्ग"]],
    ["unemployed", ["unemployed", "berozgar", "बेरोज़गार", "बेरोजगार", "looking for work", "काम की तलाश"]],
  ],
};
const INCOME_BANDS = [["inc1", 100000], ["inc2", 250000], ["inc3", 500000], ["inc4", 900000], ["inc5", 1500000]];

// ───────────────────────── wizard definition ─────────────────────────
const STEPS = [
  { id: "gender", q: "qGender", type: "choice", options: ["female", "male", "other"] },
  { id: "age", q: "qAge", type: "number", min: 1, max: 110, ph: "agePh" },
  { id: "state", q: "qState", type: "state" },
  { id: "income", q: "qIncome", type: "income" },
  { id: "occupation", q: "qOccupation", type: "choice", options: ["farmer", "labourer", "student", "self_employed", "street_vendor", "salaried", "homemaker", "retired", "unemployed"] },
];
// Follow-up questions shown when a scheme needs one more fact. `invert`: we ask the positive question.
const EXTRA = {
  owns_land: { q: "q_owns_land" }, pregnant: { q: "q_pregnant" }, girl_child: { q: "q_girl_child" },
  no_pucca_house: { q: "q_has_pucca", invert: true }, no_lpg: { q: "q_has_lpg", invert: true },
  has_bank_account: { q: "q_has_bank_account" }, category: { q: "q_category", options: ["general", "obc", "sc", "st"] },
};

function setProfile(patch) { const p = { ...store.profile, ...patch }; for (const k of Object.keys(p)) if (p[k] === null || p[k] === undefined || p[k] === "") delete p[k]; store.profile = p; }

// ───────────────────────── views ─────────────────────────
function chrome() {
  document.documentElement.lang = store.lang;
  document.querySelectorAll("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n));
  $("#btn-lang").textContent = t("langBtn");
  $("#btn-voice").textContent = store.voice ? t("voiceOn") : t("voiceOff");
  $("#btn-voice").setAttribute("aria-pressed", store.voice);
  $("#btn-assist").textContent = store.assist ? t("assistOn") : t("assistOff");
  $("#btn-assist").setAttribute("aria-pressed", store.assist);
}

function viewWelcome() {
  ui.view = "welcome"; stopListening();
  const has = Object.keys(store.profile).length > 0;
  const name = h("input", { type: "text", id: "benef", maxlength: 80, placeholder: t("beneficiary"), value: sessionStorage.getItem("ys_name") || "" });
  name.addEventListener("input", () => sessionStorage.setItem("ys_name", name.value));
  const app = $("#app"); app.replaceChildren(
    h("div", { class: "card" },
      h("h1", {}, t("welcomeH")), h("p", { class: "lead" }, t("welcomeP")),
      store.assist ? h("div", { style: "margin-bottom:14px" }, name) : null,
      h("div", { class: "row" },
        h("button", { class: "btn", onclick: () => { ui.step = 0; viewStep(); } }, t("start")),
        has ? h("button", { class: "btn ghost", onclick: () => viewResults() }, t("resume")) : null)));
}

function viewStep() {
  ui.view = "step"; stopListening();
  const s = STEPS[ui.step], app = $("#app");
  const val = store.profile[s.id];
  const heard = h("div", { class: "heard" });
  const mic = h("button", { class: "mic", "aria-label": t("speak"), title: t("speak") }, "🎤");
  const apply = (v) => { setProfile({ [s.id]: v }); advance(); };
  const advance = () => { if (ui.step < STEPS.length - 1) { ui.step++; viewStep(); } else viewResults(); };

  let control;
  if (s.type === "choice") {
    control = h("div", { class: "chips" }, s.options.map(o => h("button", { class: "chip" + (val === o ? " sel" : ""), onclick: () => apply(o) }, t(o))));
  } else if (s.type === "number") {
    const inp = h("input", { type: "number", inputmode: "numeric", min: s.min, max: s.max, placeholder: t(s.ph), value: val ?? "" });
    inp.addEventListener("keydown", e => e.key === "Enter" && go());
    const go = () => { const n = parseInt(inp.value, 10); if (n >= s.min && n <= s.max) apply(n); else inp.focus(); };
    control = h("div", {}, inp, h("div", { class: "row", style: "margin-top:12px" }, h("button", { class: "btn", onclick: go }, t("next"))));
    s._inp = inp; s._go = go;
  } else if (s.type === "state") {
    const sel = h("select", {}, h("option", { value: "" }, t("pickState")),
      ui.meta.states.map(x => h("option", { value: x.en, selected: val === x.en }, store.lang === "hi" ? x.hi : x.en)));
    sel.addEventListener("change", () => sel.value && apply(sel.value));
    control = sel;
  } else if (s.type === "income") {
    const inp = h("input", { type: "number", inputmode: "numeric", min: 0, placeholder: t("incomePh"), value: val ?? "" });
    const go = () => { const n = parseInt(inp.value, 10); if (n >= 0) apply(n); else inp.focus(); };
    inp.addEventListener("keydown", e => e.key === "Enter" && go());
    control = h("div", {},
      h("div", { class: "chips" }, INCOME_BANDS.map(([k, v]) => h("button", { class: "chip" + (val === v ? " sel" : ""), onclick: () => apply(v) }, t(k)))),
      h("p", { class: "lead", style: "margin:6px 0" }, t("incHint")), inp,
      h("div", { class: "row", style: "margin-top:12px" }, h("button", { class: "btn", onclick: go }, t("next"))));
  }

  const handleSpeech = (alts) => {
    let v = null;
    for (const a of alts) {
      heard.textContent = `${t("heard")} “${a}”`;
      if (s.type === "choice") v = matchAlias(a, ALIAS[s.id]);
      else if (s.type === "number") { const n = parseNumber(a); v = n >= s.min && n <= s.max ? n : null; }
      else if (s.type === "state") { const ns = normText(a); const m = ui.meta.states.find(x => ns.includes(x.en.toLowerCase()) || ns.includes(x.hi)); v = m ? m.en : null; }
      else if (s.type === "income") { const n = parseNumber(a); v = n != null ? n : null; }
      if (v != null) break;
    }
    if (v == null) { heard.textContent += " — " + t("notUnderstood"); if (store.voice) speak(t("notUnderstood")); return; }
    apply(v);
  };
  mic.addEventListener("click", () => listen(handleSpeech, on => { mic.classList.toggle("live", on); if (on) heard.textContent = t("listening"); }));
  if (!SR) { mic.disabled = true; mic.title = t("micUnsupported"); }

  app.replaceChildren(h("div", { class: "card" },
    h("div", { class: "progress" }, STEPS.map((_, i) => h("i", { class: i <= ui.step ? "on" : "" }))),
    h("div", { class: "q" }, t(s.q)),
    h("div", { class: "row" }, mic,
      h("button", { class: "pill", onclick: () => speak(t(s.q)) }, "🔊 " + t("readAloud"))),
    heard, control,
    h("div", { class: "row", style: "margin-top:14px" },
      ui.step > 0 ? h("button", { class: "btn ghost sm", onclick: () => { ui.step--; viewStep(); } }, "← " + t("back")) : h("button", { class: "btn ghost sm", onclick: viewWelcome }, "← " + t("back")),
      h("span", { class: "spacer" }),
      h("button", { class: "skip", onclick: () => { setProfile({ [s.id]: null }); advance(); } }, t("skip")))));

  if (store.voice) speak(t(s.q), () => SR && mic.click());
  else if (s.type === "number") s._inp && s._inp.focus();
}

async function viewResults() {
  ui.view = "results"; stopListening(); cancelSpeech();
  const app = $("#app"); app.replaceChildren(h("div", { class: "empty" }, "…"));
  let data;
  try { data = await post("/api/match", { profile: store.profile, district: ui.district }); }
  catch { app.replaceChildren(h("div", { class: "card" }, t("err"), h("div", { class: "actions" }, h("button", { class: "btn", onclick: viewResults }, "↻")))); return; }
  ui.last = data;
  const ms = data.matches;
  const sure = ms.filter(m => m.status !== "possible"), maybe = ms.filter(m => m.status === "possible");
  const count = k => ms.filter(m => m.status === k).length;

  // follow-up questions, de-duplicated across all matches
  const missing = [...new Set(ms.flatMap(m => m.missing))].filter(f => EXTRA[f]);
  const refine = missing.length ? h("div", { class: "refine" }, h("b", {}, t("refineH")), missing.map(refineQ)) : null;

  const nm = sessionStorage.getItem("ys_name");
  app.replaceChildren(
    h("div", { class: "row", style: "justify-content:space-between" },
      h("h1", { style: "margin:0" }, t("resultsH") + (store.assist && nm ? ` — ${nm}` : "")),
      h("div", { class: "row" },
        h("button", { class: "btn ghost sm", onclick: () => { ui.step = 0; viewStep(); } }, "✎ " + t("edit")),
        store.assist ? h("button", { class: "btn sm", onclick: () => { store.profile = {}; sessionStorage.removeItem("ys_name"); viewWelcome(); } }, "👤 " + t("newPerson")) : null)),
    h("p", { class: "lead" }, `${ms.length} ${t("found")} ${data.total_schemes} ${t("ofTotal")}`),
    h("div", { class: "stats" },
      h("div", { class: "stat" }, h("b", { style: "color:var(--ok)" }, count("eligible")), t("sureLbl")),
      h("div", { class: "stat" }, h("b", { style: "color:var(--likely)" }, count("likely")), t("likelyLbl")),
      h("div", { class: "stat" }, h("b", { style: "color:var(--maybe)" }, count("possible")), t("possLbl"))),
    h("div", { style: "margin:8px 0" }, districtInput()),
    refine,
    !ms.length ? h("div", { class: "empty" }, t("none")) : null,
    sure.length ? h("h2", {}, t("sec1")) : null, sure.map(schemeCard),
    maybe.length ? h("h2", {}, t("sec2")) : null, maybe.map(schemeCard));
}

function districtInput() {
  const i = h("input", { type: "text", maxlength: 80, placeholder: "📍 " + t("district"), value: ui.district, style: "font-size:16px" });
  i.addEventListener("change", () => { ui.district = i.value.trim(); sessionStorage.setItem("ys_district", ui.district); viewResults(); });
  return i;
}

function refineQ(field) {
  const ex = EXTRA[field], cur = store.profile[field];
  const set = v => { setProfile({ [field]: v }); viewResults(); };
  let chips;
  if (ex.options) {
    chips = ex.options.map(o => h("button", { class: "chip sm" + (cur === o ? " sel" : ""), onclick: () => set(cur === o ? null : o) }, t(o)));
  } else {
    const shown = cur === undefined ? undefined : (ex.invert ? !cur : cur);
    chips = [h("button", { class: "chip sm" + (shown === true ? " sel" : ""), onclick: () => set(ex.invert ? false : true) }, t("yes")),
             h("button", { class: "chip sm" + (shown === false ? " sel" : ""), onclick: () => set(ex.invert ? true : false) }, t("no"))];
  }
  return h("div", {}, h("div", { class: "qq" }, t(ex.q)), h("div", { class: "chips" }, chips));
}

function schemeCard(m) {
  const doneKeys = new Set(store.docs[m.slug] || []);
  const counter = h("small", {}, `${doneKeys.size}/${m.documents.length} ${t("docsDone")}`);
  const docs = h("ul", { class: "docs" }, m.documents.map(d => {
    const cb = h("input", { type: "checkbox", checked: doneKeys.has(d.key) });
    cb.addEventListener("change", () => { cb.checked ? doneKeys.add(d.key) : doneKeys.delete(d.key); const all = store.docs; all[m.slug] = [...doneKeys]; store.docs = all; counter.textContent = `${doneKeys.size}/${m.documents.length} ${t("docsDone")}`; });
    return h("li", {}, h("label", {}, cb, h("span", {}, pick(d, "name"), h("small", {}, pick(d, "how")))));
  }));
  const explainBox = h("div", { class: "note", hidden: true });
  const explainBtn = h("button", { class: "btn ghost sm", onclick: async () => {
    explainBtn.disabled = true; explainBtn.textContent = t("explaining");
    try { const r = await post("/api/explain", { slug: m.slug, lang: store.lang }); explainBox.replaceChildren(r.text, r.source === "ai" ? h("div", { style: "font-size:13px;color:var(--muted);margin-top:4px" }, t("aiNote")) : ""); explainBox.hidden = false; if (store.voice) speak(r.text); }
    catch { toast(t("err")); }
    explainBtn.disabled = false; explainBtn.textContent = "💬 " + t("explain");
  } }, "💬 " + t("explain"));

  return h("article", { class: "card scheme" },
    h("div", { class: "head" },
      h("div", {}, h("h3", {}, L(m)), h("span", { class: "tag" }, t("level_" + m.level) + (m.state ? ` · ${m.state}` : ""))),
      h("span", { class: "status s-" + m.status }, t(m.status))),
    h("p", { class: "benefit" }, pick(m, "benefit")),
    m.reasons.length ? h("div", {}, h("small", { class: "lead" }, t("why") + ":"), h("ul", { class: "reasons" }, m.reasons.map(r => h("li", {}, r[store.lang])))) : null,
    h("div", { class: "actions" }, explainBtn,
      h("button", { class: "btn ghost sm", onclick: () => speak(pick(m, "simple")) }, "🔊 " + t("readAloud"))),
    explainBox,
    h("details", {}, h("summary", {}, "📋 " + t("howH")), h("p", {}, pick(m, "how")),
      m.deadline_note_en ? h("div", { class: "note" }, h("b", {}, t("deadline") + ": "), pick(m, "deadline_note")) : null),
    h("details", {}, h("summary", {}, "📄 " + t("docsH")), counter, docs),
    h("div", { class: "actions" },
      h("a", { class: "btn sm", href: m.portal_url, target: "_blank", rel: "noopener" }, "🌐 " + t("portal")),
      h("a", { class: "btn ghost sm", href: ui.last.csc_url, target: "_blank", rel: "noopener" }, "📍 " + t("csc")),
      h("button", { class: "btn ghost sm", onclick: () => showSummary(m) }, "🖨️ " + t("summary")),
      h("button", { class: "btn ghost sm", onclick: () => showTrack(m) }, "🔔 " + t("track"))),
    h("small", { class: "lead", style: "display:block;margin-top:10px" }, `${t("asOf")}: ${m.data_as_of}`));
}

// ───────────────────────── modal views ─────────────────────────
function openModal(...kids) { $("#modal-body").replaceChildren(...kids); $("#modal").hidden = false; }
function closeModal() { $("#modal").hidden = true; }

async function showSummary(m) {
  try {
    const r = await post("/api/summary", { slug: m.slug, profile: store.profile, name: sessionStorage.getItem("ys_name") || "", district: ui.district, lang: store.lang });
    openModal(h("h2", { style: "margin-top:0" }, t("summary")), h("pre", { class: "summary" }, r.text),
      h("div", { class: "actions" },
        h("button", { class: "btn sm", onclick: async () => { try { await navigator.clipboard.writeText(r.text); toast(t("copied")); } catch { toast(t("err")); } } }, "📋 " + t("copy")),
        h("button", { class: "btn ghost sm", onclick: () => window.print() }, "🖨️ " + t("print"))));
  } catch { toast(t("err")); }
}

function showTrack(m) {
  const today = new Date().toISOString().slice(0, 10);
  const date = h("input", { type: "date", min: today });
  const status = h("select", {}, ["interested", "documents_ready", "applied", "approved", "rejected"].map(s => h("option", { value: s }, t("st_" + s))));
  openModal(h("h2", { style: "margin-top:0" }, t("trackH")), h("p", { class: "lead" }, L(m)),
    h("label", {}, t("statusLbl")), status, h("div", { style: "height:10px" }), h("label", {}, t("remindOn")), date,
    h("div", { class: "actions" }, h("button", { class: "btn", onclick: async () => {
      try {
        await post("/api/tracker", { token: store.token, slug: m.slug, status: status.value, reminder_date: date.value || null, note: store.assist ? (sessionStorage.getItem("ys_name") || "") : "" });
        closeModal(); toast(t("saved")); refreshBadge();
      } catch { toast(t("err")); }
    } }, t("save"))));
}

async function viewTracker() {
  ui.view = "track"; stopListening();
  const app = $("#app"); let rows = [];
  try { rows = await api("/api/tracker?token=" + encodeURIComponent(store.token)); } catch { toast(t("err")); }
  const today = new Date().toISOString().slice(0, 10);
  const isDue = r => r.reminder_date && r.reminder_date <= today && !["approved", "rejected"].includes(r.status);
  const item = r => {
    const sel = h("select", { style: "font-size:16px" }, ["interested", "documents_ready", "applied", "approved", "rejected"].map(s => h("option", { value: s, selected: r.status === s }, t("st_" + s))));
    sel.addEventListener("change", async () => { await post(`/api/tracker/${r.id}`, { token: store.token, status: sel.value }, "PATCH"); refreshBadge(); });
    const d = h("input", { type: "date", value: r.reminder_date || "", style: "font-size:16px" });
    d.addEventListener("change", async () => { await post(`/api/tracker/${r.id}`, { token: store.token, reminder_date: d.value || null }, "PATCH"); viewTracker(); refreshBadge(); });
    return h("div", { class: "track-item" + (isDue(r) ? " due" : "") },
      h("b", {}, L(r)), r.note ? h("span", { class: "tag", style: "margin-left:8px" }, r.note) : null,
      isDue(r) ? h("span", { class: "status s-possible", style: "margin-left:8px" }, "⏰ " + t("trackDue")) : null,
      h("div", { class: "row", style: "margin-top:8px" }, sel, d),
      h("div", { class: "actions" },
        h("a", { class: "btn sm", href: r.portal_url, target: "_blank", rel: "noopener" }, "🌐 " + t("portal")),
        r.reminder_date ? h("a", { class: "btn ghost sm", href: `/api/tracker/${r.id}/ics?token=${encodeURIComponent(store.token)}` }, "📅 " + t("cal")) : null,
        h("button", { class: "btn ghost sm", onclick: async () => { await api(`/api/tracker/${r.id}?token=${encodeURIComponent(store.token)}`, { method: "DELETE" }); viewTracker(); refreshBadge(); } }, "🗑 " + t("del"))));
  };
  app.replaceChildren(h("h1", {}, "🔔 " + t("mytrack")), rows.length ? rows.map(item) : h("div", { class: "empty" }, t("trackEmpty")),
    h("div", { class: "actions" }, h("button", { class: "btn ghost", onclick: () => (Object.keys(store.profile).length ? viewResults() : viewWelcome()) }, "← " + t("back"))));
}

async function refreshBadge() {
  try {
    const rows = await api("/api/tracker?token=" + encodeURIComponent(store.token));
    const today = new Date().toISOString().slice(0, 10);
    const due = rows.filter(r => r.reminder_date && r.reminder_date <= today && !["approved", "rejected"].includes(r.status)).length;
    const b = $("#badge"); b.textContent = due; b.hidden = !due;
  } catch { /* offline */ }
}

// ───────────────────────── boot ─────────────────────────
function rerender() { chrome(); ({ step: viewStep, results: viewResults, track: viewTracker }[ui.view] || viewWelcome)(); }

$("#btn-lang").addEventListener("click", () => { store.lang = store.lang === "hi" ? "en" : "hi"; cancelSpeech(); rerender(); });
$("#btn-voice").addEventListener("click", () => { store.voice = !store.voice; if (!store.voice) { cancelSpeech(); stopListening(); } chrome(); });
$("#btn-assist").addEventListener("click", () => { store.assist = !store.assist; chrome(); if (ui.view === "welcome") viewWelcome(); });
$("#btn-track").addEventListener("click", () => viewTracker());
$("#modal-x").addEventListener("click", closeModal);
$("#modal").addEventListener("click", e => e.target.id === "modal" && closeModal());
document.addEventListener("keydown", e => e.key === "Escape" && closeModal());

(async function boot() {
  chrome();
  try { ui.meta = await api("/api/meta"); } catch { $("#app").replaceChildren(h("div", { class: "card" }, t("err"))); return; }
  viewWelcome(); refreshBadge();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
})();
