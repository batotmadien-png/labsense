// نصوص الواجهة. أي لغة غير موجودة هنا بيترجمها الذكاء الاصطناعي تلقائيًا ويحفظها.
const STRINGS = {
  en: {
    title: "Understand your lab results in plain language",
    subtitle: "Upload a photo of your test results. Get a simple explanation and questions to ask your doctor.",
    drop: "Tap to choose a photo, or drop it here",
    analyze: "Explain my results",
    privacy: "Your photo is sent only to be analyzed. Please hide your name and personal details first.",
    analyzing: "Reading your results…",
    translating: "Translating the page…",
    summary: "Summary", results: "Your results", questions: "Questions for your doctor",
    normal: "Normal", high: "High", low: "Low", unknown: "Unclear",
    range: "Normal range", again: "Analyze another test",
    urgent: "Please talk to a doctor soon",
    error: "Something went wrong. Check the photo and try again.",
    notlab: "This doesn't look like a lab report. Try a clearer photo of the results page.",
    listen: "Listen to the explanation", stop: "Stop",
    novoice: "No voice for this language is installed on this device.",
    history: "My history", close: "Close", delete: "Delete", clearAll: "Delete all history",
    historyEmpty: "No saved reports yet. Analyze a report and it will appear here.",
    pickTest: "Choose a test", needMore: "Upload another report later to see how this value changes over time.",
    saved: "Saved to your history on this device only.", confirmClear: "Delete all saved history from this device?",
    reportsLabel: "Saved reports", trend: "Trend", simple: "Use simpler words", simpler: "Explain even simpler",
    tests_n: "tests",
    disclaimer: "For education only. This is not a diagnosis and does not replace your doctor."
  },
  ar: {
    title: "افهم نتائج تحاليلك بلغة بسيطة",
    subtitle: "ارفع صورة التحليل واحصل على شرح مبسّط وأسئلة تسألها لدكتورك.",
    drop: "اضغط لاختيار صورة، أو اسحبها هنا",
    analyze: "اشرح لي النتائج",
    privacy: "الصورة بتتبعت للتحليل فقط. يفضّل تخفي اسمك وبياناتك الشخصية قبل الرفع.",
    analyzing: "جاري قراءة النتائج…",
    translating: "جاري ترجمة الصفحة…",
    summary: "الملخص", results: "نتائجك", questions: "أسئلة لدكتورك",
    normal: "طبيعي", high: "مرتفع", low: "منخفض", unknown: "غير واضح",
    range: "المعدل الطبيعي", again: "تحليل تاني",
    urgent: "كلّم دكتور في أقرب وقت",
    error: "حصلت مشكلة. اتأكد من الصورة وجرّب تاني.",
    notlab: "الصورة دي مش شبه تقرير تحاليل. جرّب صورة أوضح لصفحة النتائج.",
    listen: "اسمع الشرح", stop: "إيقاف",
    novoice: "مفيش صوت للغة دي متسطّب على الجهاز ده.",
    history: "سجل تحاليلي", close: "إغلاق", delete: "حذف", clearAll: "حذف كل السجل",
    historyEmpty: "مفيش تقارير محفوظة لسه. حلّل تقرير وهيظهر هنا.",
    pickTest: "اختار تحليل", needMore: "ارفع تقرير تاني بعدين عشان تشوف القيمة دي بتتغير إزاي مع الوقت.",
    saved: "اتحفظ في سجلك على الجهاز ده بس.", confirmClear: "تحذف كل السجل المحفوظ من الجهاز ده؟",
    reportsLabel: "التقارير المحفوظة", trend: "التغيّر", simple: "استخدم كلام أبسط", simpler: "اشرحلي بشكل أبسط",
    tests_n: "تحاليل",
    disclaimer: "للتوعية فقط. ده مش تشخيص ولا بديل عن الدكتور."
  }
};
const LANGS = {
  ar:["العربية",1], en:["English"], fr:["Français"], es:["Español"], de:["Deutsch"], it:["Italiano"],
  pt:["Português"], tr:["Türkçe"], ru:["Русский"], fa:["فارسی",1], ur:["اردو",1], he:["עברית",1],
  hi:["हिन्दी"], bn:["বাংলা"], id:["Bahasa Indonesia"], zh:["中文"], ja:["日本語"], ko:["한국어"],
  nl:["Nederlands"], sw:["Kiswahili"]
};
