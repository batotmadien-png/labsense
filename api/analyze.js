// Vercel serverless function (Groq - free key, no card needed).
// المفتاح بيتخزن في Environment Variables باسم GROQ_API_KEY مش في الكود.
const MODELS = [process.env.GROQ_MODEL, 'qwen/qwen3.6-27b', 'qwen/qwen3.8-27b'].filter(Boolean);

async function callOne(model, userContent, system) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + process.env.GROQ_API_KEY },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_completion_tokens: 8000,
      messages: [{ role: 'system', content: system }, { role: 'user', content: userContent }]
    })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(model + ': ' + (j.error?.message || r.status));
  let text = j.choices?.[0]?.message?.content || '';
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '');
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error(model + ': no JSON in reply');
  return JSON.parse(text.slice(a, b + 1));
}

async function callGroq(userContent, system) {
  const errors = [];
  for (const m of MODELS) {
    try { return await callOne(m, userContent, system); }
    catch (e) { errors.push(e.message); }
  }
  throw new Error(errors.join(' | ').slice(0, 400));
}

const ANALYZE_SYSTEM = (lang, simple) => `You are a careful medical-education assistant that explains lab test reports to ordinary people.
Write ALL human-readable text in this language: ${lang}.
Rules:
- Read every test in the image. Copy names, values, units and reference ranges exactly as printed. Never invent numbers; if something is unreadable use an empty string.
- status must be one of: "normal", "high", "low", "unknown" (use the report's own reference range or flags; if none, use well-established adult ranges and say so in range).
- explanation: 1-2 simple sentences about what the test measures and what a high/low value can commonly mean. No diagnosis, no medication or dose advice, no scary language.${simple ? '\n- SIMPLE MODE: write for a person with little education or an older adult. Use very short sentences, everyday words, no medical jargon (or explain any term in a few plain words), and one familiar comparison where it helps. Keep the summary to 2 short sentences.' : ''}
- key: a short canonical lowercase ENGLISH name of the test (for example "hemoglobin", "glucose fasting", "ldl cholesterol"), the same for the same test in any language.
- ref_low and ref_high: the numeric reference limits as numbers (for a range like "12 - 15.5" use 12 and 15.5; for "< 200" use null and 200; for "> 50" use 50 and null). Use null if unknown.
- If any value is dangerously far outside range, set urgent=true and give a short urgent_note.
- questions: 3-5 useful questions the person can ask their doctor.
- If the image is not a lab report, return {"not_lab": true}.
Return ONLY valid JSON, no markdown:
{"not_lab":false,"summary":"","urgent":false,"urgent_note":"","tests":[{"name":"","key":"","value":"","unit":"","range":"","ref_low":null,"ref_high":null,"status":"","explanation":""}],"questions":[""]}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'Missing API key' });
  try {
    const { action, image, mediaType, langName, strings, simple } = req.body || {};
    const lang = String(langName || 'English').slice(0, 40);
    if (action === 'translate') {
      const out = await callGroq(
        'Translate the values of this JSON into ' + lang + '. Keep the keys unchanged. Return only JSON.\n' + JSON.stringify(strings),
        'You are a precise UI translator.');
      return res.status(200).json(out);
    }
    if (action === 'analyze') {
      if (!image || image.length > 5_500_000) return res.status(400).json({ error: 'Bad image' });
      const out = await callGroq(
        [{ type: 'text', text: 'Explain this lab report.' },
         { type: 'image_url', image_url: { url: `data:${mediaType || 'image/jpeg'};base64,${image}` } }],
        ANALYZE_SYSTEM(lang, !!simple));
      return res.status(200).json(out);
    }
    res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Server error', detail: e.message });
  }
}
