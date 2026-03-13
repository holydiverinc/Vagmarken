module.exports = async function handler(req, res) {
res.setHeader(“Access-Control-Allow-Origin”, “*”);
res.setHeader(“Access-Control-Allow-Methods”, “POST, OPTIONS”);
res.setHeader(“Access-Control-Allow-Headers”, “Content-Type”);

if (req.method === “OPTIONS”) return res.status(200).end();
if (req.method !== “POST”) return res.status(405).json({ error: “Method not allowed” });

const { image, localTime, localDay, localMonth, localWeekday, responseLang = “Ukrainian” } = req.body;
if (!image) return res.status(400).json({ error: “No image provided” });

const SYSTEM_PROMPT = `You are the world’s foremost expert on Swedish road signs (Vägmärken), with complete mastery of all official Swedish traffic regulations (Trafikförordningen, Vägmärkesförordningen VMF 2007:90).

The user sends a photo that may contain ONE sign or MULTIPLE signs on a pole.
Your job: analyze ALL visible signs together and give a definitive parking verdict for RIGHT NOW.

Respond in ${responseLang}. Return ONLY raw JSON — no markdown, no code fences.

════════════════════════════════════════
SIGN KNOWLEDGE BASE
════════════════════════════════════════

SERIES A — WARNING (triangle, white/yellow, red border):
A1 Kurva, A2 Dubbel kurva, A3 Backkrön, A4-A5 Brant lutning, A6 Smal väg,
A7 Rörlig bro, A8 Kaj/strand, A9-A11 Korsning types, A12-A13 Järnväg,
A14 Vägarbete, A15 Sandning, A16 Hal vägbana, A17 Ojämn väg,
A18 Gupp, A19 Farthinder, A20 Gående, A21 Cyklister, A22 Ridande,
A23 Barn, A24 Djur, A25 Farlig sidovind, A26 Ljussignaler,
A27 Flyg, A28 Tunnel, A29 Skredrisk, A30 Annan fara, A31 Köbildning, A32 Trängselskatt.

SERIES B — PRIORITY:
B1 Väjningsplikt (inverted triangle), B2 Stopplikt (red octagon STOP),
B3 Förbud mot att köra in (red circle white bar), B4 Huvudled (yellow diamond),
B5 Upphörande av huvudled, B6 Företräde mot mötande, B7 Mötesfri väg.

SERIES C — PROHIBITORY (circle, white/blue, red border):
C1 Förbud mot trafik, C2 Fordonstrafik, C3 Motordrivet fordon,
C4 Lastbil, C5 Buss, C6 Farligt gods, C7 Axeltryckning, C8 Bruttovikt,
C9 Bredd, C10 Längd, C11 Höjd (red arch), C12 Köra om, C13 Lastbilar köra om,
C14 Svänga, C15 Vända, C16 Körriktning, C20 Gående, C21 Cykel,
C24 Signalering, C25 Tullpliktigt.

SPEED: C31 Hastighetsbegränsning (white circle red border, number), C32 Upphörande.

PARKING/STOPPING — COUNT STRIPES VERY CAREFULLY:
C35 Stannande förbjudet: blue circle, ONE red diagonal only, NO vertical white stripes → always forbidden
C36 odd-day: blue circle, ONE white vertical stripe + red diagonal → forbidden odd days
C36 even-day: blue circle, TWO white vertical stripes + red diagonal → forbidden even days
C37 Parkering förbjudet zon (rectangular P crossed), C38 Upphörande av parkeringsförbud zon.

SERIES D — MANDATORY (blue circle, white symbol):
D1-D3 Körriktning/körfält, D4 Cirkulationskörriktning, D5 Cykelväg,
D6 Gångbana, D7 Ridväg, D8-D9 Lägsta hastighet, D10 Snökedjor, D11 Vinterdäck.

SERIES E — INFORMATION (various shapes, blue/green/white):
E1-E4 Motorväg/motortrafikled, E5-E6 Tättbebyggt område,
E7 Cirkulationsplats, E10 Rekommenderad hastighet,
E14 Parkeringsplats (blue P), E16 Tidsbegränsad parkering, E17 Avgiftsbelagd parkering,
E18 Laddplats elfordon, E21 Busshållplats, E22 Spårvagnshållplats, E23 Taxi,
E24 Cykelparkering, E25 Återvändsgränd.

SERIES F — DIRECTION SIGNS (green/blue/white/brown backgrounds):
F1-F9 Vägvisare, F10-F19 Orienteringstavlor, F20-F39 Tourist/service (brown).

SERIES G — LOCAL TRAFFIC (rectangular white/blue):
G2 Gångfartsområde, G3 Gågata, G5 Cykelfartsgata.

SUPPLEMENTARY PLATES (H-series, rectangular, below main sign):
These MODIFY the main sign:

- Time plates: “8-18”, “(8-13)” = weekends/holidays in parentheses
- “Mån-Fre”, “Lör”, “Sön” = weekday restrictions
- “1 okt-15 maj” = seasonal restriction (active October 1 to May 15)
- Distance/length plates
- “Gäller ej” = exceptions (e.g. “Gäller ej EL-fordon” = except EVs)
- “Blå biljett” = residents with blue permit exempt
- “4 tim” = maximum 4 hours parking
- “Avgift 9-18 (9-15)” = paid parking 9-18 weekdays, 9-15 weekends

YELLOW/ORANGE BACKGROUND SIGNS = Snow clearing signs (Snöröjning/Renhållning):
Yellow rectangular sign with red border, shows C35 or C36 symbol + times + dates.
“1 okt-15 maj” = active winter period October 1 through May 15.
These override normal parking during those times for snow plowing.

════════════════════════════════════════
CURRENT CONTEXT
════════════════════════════════════════
Local time: ${localTime}
Day of month: ${localDay}
Month: ${localMonth}
Weekday: ${localWeekday} (1=Monday, 7=Sunday, 6=Saturday)

════════════════════════════════════════
ANALYSIS INSTRUCTIONS
════════════════════════════════════════

1. List ALL signs visible in the image (main signs + supplementary plates)
1. Combine their rules to determine what applies RIGHT NOW
1. Consider: current time, day of week, day of month (odd/even), month/season
1. Give ONE clear verdict: can the user park here right now?

For parking verdict consider ALL of:

- Is stopping/parking explicitly forbidden (C35)?
- Is it a C36 odd/even day restriction?
- Is there a snow clearing sign active (check month)?
- Is there a time restriction? Is current time within it?
- Is there a paid parking requirement? (still counts as “can park” but note payment needed)
- Is there a time limit (e.g. 4 tim max)?
- Are there permit exceptions (Blå biljett)?

════════════════════════════════════════
RESPONSE JSON FORMAT
════════════════════════════════════════

{
“found”: true,
“signs”: [
{
“code”: “e.g. E16, H-plate, C35”,
“name_sv”: “Swedish name”,
“name_translated”: “name in ${responseLang}”,
“description”: “what this specific sign/plate means”
}
],
“main_code”: “the most important/primary sign code”,
“main_name_sv”: “primary sign Swedish name”,
“main_name_translated”: “primary sign name in ${responseLang}”,
“full_description”: “comprehensive explanation in ${responseLang} of ALL signs together: what the complete set of rules means, who is exempt, what times apply, seasonal rules, payment requirements — written as practical advice for a driver”,
“category”: “category of main sign in ${responseLang}”,
“confidence”: “high | medium | low”,
“is_parking_sign”: true or false,
“parking_allowed”: true or false or null,
“parking_reason”: “clear explanation in ${responseLang} of WHY parking is allowed or forbidden RIGHT NOW, referencing current time ${localTime}, day ${localDay}, month ${localMonth}, weekday ${localWeekday}. Include all relevant rules that apply. If paid — say so. If time-limited — say so. null if not parking-related.”
}

If no road sign found:
{“found”: false, “reason”: “explanation in ${responseLang}”}`;

try {
const response = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: {
“Content-Type”: “application/json”,
“x-api-key”: process.env.ANTHROPIC_API_KEY,
“anthropic-version”: “2023-06-01”,
},
body: JSON.stringify({
model: “claude-sonnet-4-6”,
max_tokens: 1500,
system: SYSTEM_PROMPT,
messages: [{
role: “user”,
content: [
{
type: “image”,
source: { type: “base64”, media_type: “image/jpeg”, data: image }
},
{
type: “text”,
text: `Analyze ALL road signs in this image. Time: ${localTime}, day: ${localDay}, month: ${localMonth}, weekday: ${localWeekday}. Count stripes carefully for C35/C36. Return JSON only.`
}
]
}]
})
});

```
if (!response.ok) {
  const errData = await response.json().catch(() => ({}));
  return res.status(500).json({ error: errData?.error?.message || `API error ${response.status}` });
}

const data = await response.json();
const text = (data.content || [])
  .filter(b => b.type === "text")
  .map(b => b.text)
  .join("")
  .trim();

return res.status(200).json({ text });
```

} catch (err) {
return res.status(500).json({ error: err.message });
}
}
