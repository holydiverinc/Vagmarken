module.exports = async function handler(req, res) {
res.setHeader(“Access-Control-Allow-Origin”, “*”);
res.setHeader(“Access-Control-Allow-Methods”, “POST, OPTIONS”);
res.setHeader(“Access-Control-Allow-Headers”, “Content-Type”);

if (req.method === “OPTIONS”) return res.status(200).end();
if (req.method !== “POST”) return res.status(405).json({ error: “Method not allowed” });

const { image, localTime, localDay, localMonth, localWeekday, responseLang = “Ukrainian” } = req.body || {};
if (!image) return res.status(400).json({ error: “No image provided” });

const SYSTEM_PROMPT = `You are an expert on Swedish road signs (Vagmarken) with complete knowledge of all official Swedish traffic signs (VMF 2007:90).

The user sends a photo that may contain ONE sign or MULTIPLE signs on a pole.
Analyze ALL visible signs together and give a definitive parking verdict for RIGHT NOW.

Respond in ${responseLang}. Return ONLY raw JSON, no markdown, no code fences.

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
H-plates: Supplementary plates (time limits, dates, exceptions)

SUPPLEMENTARY PLATES:

- Time: “8-18”, “(8-13)” parentheses=weekends
- Days: Mon-Fri, Sat, Sun
- Season: “1 okt-15 maj” = October 1 to May 15
- “Bla biljett” = residents with blue permit exempt
- “4 tim” = max 4 hours
- “Avgift 9-18 (9-15)” = paid parking

YELLOW/ORANGE signs with red border = Snow clearing signs.
Shows C35/C36 symbol + times + season dates. Overrides parking during winter.

CURRENT CONTEXT: time=${localTime}, day=${localDay}, month=${localMonth}, weekday=${localWeekday} (1=Mon,7=Sun,6=Sat)

For C36: count white vertical stripes carefully.
1 stripe = odd days rule. 2 stripes = even days rule.

Return this exact JSON structure:
{
“found”: true,
“signs”: [{“code”:””,“name_sv”:””,“name_translated”:””,“description”:””}],
“main_code”: “”,
“main_name_sv”: “”,
“main_name_translated”: “”,
“full_description”: “practical combined explanation for driver”,
“category”: “”,
“confidence”: “high or medium or low”,
“is_parking_sign”: true,
“parking_allowed”: true,
“parking_reason”: “why allowed or forbidden RIGHT NOW”
}

If no sign: {“found”: false, “reason”: “explanation”}`;

try {
const response = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: {
“Content-Type”: “application/json”,
“x-api-key”: process.env.ANTHROPIC_API_KEY,
“anthropic-version”: “2023-06-01”,
},
body: JSON.stringify({
model: “claude-haiku-4-5-20251001”,
max_tokens: 1500,
system: SYSTEM_PROMPT,
messages: [{
role: “user”,
content: [
{ type: “image”, source: { type: “base64”, media_type: “image/jpeg”, data: image } },
{ type: “text”, text: `Analyze road signs. time=${localTime} day=${localDay} month=${localMonth} weekday=${localWeekday}. JSON only.` }
]
}]
})
});

```
const data = await response.json();

if (!response.ok) {
  return res.status(500).json({ error: `API ${response.status}: ${JSON.stringify(data).slice(0, 200)}` });
}

const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
return res.status(200).json({ text });
```

} catch (err) {
return res.status(500).json({ error: err.message });
}
}
