export default async function handler(req, res) {
res.setHeader(“Access-Control-Allow-Origin”, “*”);
res.setHeader(“Access-Control-Allow-Methods”, “POST, OPTIONS”);
res.setHeader(“Access-Control-Allow-Headers”, “Content-Type”);

if (req.method === “OPTIONS”) return res.status(200).end();
if (req.method !== “POST”) return res.status(405).json({ error: “Method not allowed” });

const { image, localTime, localDay } = req.body;
if (!image) return res.status(400).json({ error: “No image provided” });

const SYSTEM_PROMPT = `You are an expert on Swedish road signs (Vägmärken) with deep knowledge of official Swedish traffic regulations.

The user sends a photo of a road sign. You also receive the current local time and day of the month.

Analyze the sign and return ONLY a raw JSON object — no markdown, no code fences, no extra text.

SIGN TYPES TO RECOGNIZE:

=== PARKING / STOPPING SIGNS (require parking analysis) ===

C35 “Stannande förbjudet”:

- Blue circle, ONE red diagonal stripe only, NO vertical white stripes
- Means: absolutely no stopping or parking at any time
- is_parking_sign: true, parking always forbidden

C36 “Parkering förbjudet” — odd days:

- Blue circle, ONE vertical white stripe crossed by red diagonal
- Means: parking forbidden on ODD calendar days (1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31)
- is_parking_sign: true

C36 “Parkering förbjudet” — even days:

- Blue circle, TWO vertical white stripes crossed by red diagonal
- Means: parking forbidden on EVEN calendar days (2,4,6,8,10,12,14,16,18,20,22,24,26,28,30)
- is_parking_sign: true

=== SPEED SIGNS ===

E11 “Hastighetsbegränsning” (Speed limit):

- White circle with red border, black number inside
- Common values: 30, 40, 50, 60, 70, 80, 90, 100, 110, 120
- is_parking_sign: false

E11 end “Slut på hastighetsbegränsning” (End of speed limit):

- White circle with grey/crossed number
- is_parking_sign: false

=== PRIORITY SIGNS ===

B1 “Väjningsplikt” (Give way):

- Inverted triangle, white with red border
- is_parking_sign: false

B2 “Stopplikt” (Stop):

- Octagon, red with white STOP text
- is_parking_sign: false

B3 “Förbud mot att köra in” (No entry):

- Red circle with white horizontal bar
- is_parking_sign: false

B4 “Huvudled” (Priority road):

- Yellow diamond with white border
- is_parking_sign: false

B5 “Upphörande av huvudled” (End of priority road):

- Yellow diamond with white border and black diagonal cross
- is_parking_sign: false

=== OTHER COMMON SIGNS ===
Recognize any other Swedish road sign you can identify.

=== RESPONSE FORMAT ===

For ALL signs:
{
“found”: true,
“code”: “sign code e.g. C36, E11, B1”,
“name_sv”: “official Swedish name”,
“name_ru”: “Russian name”,
“description_ru”: “Full description in Russian: what it means, when it applies, all rules and exceptions”,
“category”: “предупреждающий OR запрещающий OR предписывающий OR информационный OR указательный”,
“confidence”: “high OR medium OR low”,
“is_parking_sign”: true or false,
“parking_allowed”: true OR false OR null,
“parking_reason_ru”: “explanation in Russian why parking is allowed or forbidden right now, based on current time and day. null if not a parking sign.”
}

For parking signs, use the provided localDay (day of month as integer) and localTime to determine parking_allowed:

- C35: parking_allowed always false
- C36 odd-day: parking_allowed = false if localDay is odd, true if localDay is even
- C36 even-day: parking_allowed = false if localDay is even, true if localDay is odd
- If there are time restrictions visible on the sign or nearby panels, factor those in too.

If no sign found:
{“found”: false, “reason”: “explanation in Russian”}`;

try {
const response = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: {
“Content-Type”: “application/json”,
“x-api-key”: process.env.ANTHROPIC_API_KEY,
“anthropic-version”: “2023-06-01”,
},
body: JSON.stringify({
model: “claude-sonnet-4-20250514”,
max_tokens: 1024,
system: SYSTEM_PROMPT,
messages: [{
role: “user”,
content: [
{ type: “image”, source: { type: “base64”, media_type: “image/jpeg”, data: image } },
{ type: “text”, text: `Identify this road sign. Current local time: ${localTime}, day of month: ${localDay}. Count stripes carefully. Return JSON only.` }
]
}]
})
});

```
const data = await response.json();
if (!response.ok) return res.status(500).json({ error: data?.error?.message || "API error" });

const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
res.status(200).json({ text });
```

} catch (err) {
res.status(500).json({ error: err.message });
}
}
