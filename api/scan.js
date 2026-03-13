const https = require(“https”);

function httpsPost(body) {
return new Promise((resolve, reject) => {
const data = JSON.stringify(body);
const options = {
hostname: “api.anthropic.com”,
path: “/v1/messages”,
method: “POST”,
headers: {
“Content-Type”: “application/json”,
“Content-Length”: Buffer.byteLength(data),
“x-api-key”: String(apiKey),
“anthropic-version”: “2023-06-01”,
},
};
const req = https.request(options, (res) => {
let raw = “”;
res.on(“data”, (chunk) => (raw += chunk));
res.on(“end”, () => resolve({ status: res.statusCode, body: raw }));
});
req.on(“error”, reject);
req.write(data);
req.end();
});
}

module.exports = async function handler(req, res) {
res.setHeader(“Access-Control-Allow-Origin”, “*”);
res.setHeader(“Access-Control-Allow-Methods”, “POST, OPTIONS”);
res.setHeader(“Access-Control-Allow-Headers”, “Content-Type”);

if (req.method === “OPTIONS”) return res.status(200).end();
if (req.method !== “POST”) return res.status(405).json({ error: “Method not allowed” });

let body = req.body;
if (typeof body === “string”) {
try { body = JSON.parse(body); } catch (e) { return res.status(400).json({ error: “Bad JSON: “ + e.message }); }
}
if (!body) return res.status(400).json({ error: “Empty body” });

const { image, localTime, localDay, localMonth, localWeekday, responseLang = “Ukrainian” } = body;
if (!image) return res.status(400).json({ error: “No image provided” });

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) return res.status(500).json({ error: “ANTHROPIC_API_KEY not set” });

const SYSTEM_PROMPT = `You are an expert on Swedish road signs (Vägmärken) with complete knowledge of all official Swedish traffic signs (VMF 2007:90).

The user sends a photo that may contain ONE sign or MULTIPLE signs on a pole.
Your job: analyze ALL visible signs together and give a definitive parking verdict for RIGHT NOW.

Respond in ${responseLang}. Return ONLY raw JSON — no markdown, no code fences.

SIGN SERIES:
A1-A32: Warning signs (triangle, red border, black symbol)
B1-B7: Priority signs (B1=inverted triangle, B2=STOP octagon, B4=yellow diamond)
C1-C38: Prohibitory signs (circle, red border)
C31=speed limit (white circle, red border, number)
C35=no stopping (blue circle, ONE red diagonal, NO white stripes)
C36 odd=no parking odd days (blue circle, ONE white stripe + red diagonal)
C36 even=no parking even days (blue circle, TWO white stripes + red diagonal)
D1-D11: Mandatory signs (blue circle, white symbol)
E1-E40: Information signs (blue/green, various shapes, E14=parking P)
F1-F39: Direction signs (green/blue/white/brown)
G1-G15: Local traffic signs
H-plates: Supplementary plates below main sign (time limits, dates, exceptions)

SUPPLEMENTARY PLATES (H-series):

- Time: “8-18”, “(8-13)” parentheses=weekends
- Days: “Mån-Fre”, “Lör”, “Sön”
- Season: “1 okt-15 maj” = October 1 to May 15
- “Blå biljett” = residents with blue permit exempt
- “4 tim” = max 4 hours
- “Avgift 9-18 (9-15)” = paid parking

YELLOW/ORANGE signs with red border = Snow clearing (Snöröjning):
Shows C35/C36 symbol + times + season dates. Overrides parking during winter.

CURRENT TIME: ${localTime}, Day: ${localDay}, Month: ${localMonth}, Weekday: ${localWeekday} (1=Mon,7=Sun,6=Sat)

For C36: count white vertical stripes carefully.

- 1 stripe = odd days rule (forbidden if localDay is odd)
- 2 stripes = even days rule (forbidden if localDay is even)

Return this JSON:
{
“found”: true,
“signs”: [{“code”:””,“name_sv”:””,“name_translated”:””,“description”:””}],
“main_code”: “”,
“main_name_sv”: “”,
“main_name_translated”: “”,
“full_description”: “practical explanation of all rules combined”,
“category”: “”,
“confidence”: “high|medium|low”,
“is_parking_sign”: true,
“parking_allowed”: true,
“parking_reason”: “why allowed/forbidden RIGHT NOW based on current time/day/month”
}

If no sign found: {“found”: false, “reason”: “explanation”}`;

try {
const result = await httpsPost({
model: “claude-haiku-4-5-20251001”,
max_tokens: 1500,
system: SYSTEM_PROMPT,
messages: [{
role: “user”,
content: [
{ type: “image”, source: { type: “base64”, media_type: “image/jpeg”, data: image } },
{ type: “text”, text: `Analyze ALL road signs. Time:${localTime} Day:${localDay} Month:${localMonth} Weekday:${localWeekday}. Return JSON only.` }
]
}]
});

```
if (result.status !== 200) {
  return res.status(500).json({ error: `API ${result.status}: ${result.body.slice(0, 300)}` });
}

const data = JSON.parse(result.body);
const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
return res.status(200).json({ text });
```

} catch (err) {
return res.status(500).json({ error: err.message });
}
};
