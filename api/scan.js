export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { image } = req.body;
  if (!image) return res.status(400).json({ error: "No image provided" });

  const SYSTEM_PROMPT = `You are an expert on Swedish road signs (Vägmärken) with deep knowledge of official Swedish traffic regulations.

The user will send a photo of a road sign. Analyze carefully and return ONLY a raw JSON object — no markdown, no code fences, no extra text.

CRITICAL — these three signs look similar but mean very different things. Count carefully:

C35 "Stannande förbjudet":
- Blue circle with ONE RED DIAGONAL STRIPE only, NO vertical white stripes
- Means: absolutely no stopping or parking at any time

C36 "Parkering förbjudet" — odd days:
- Blue circle with ONE vertical white stripe crossed by red diagonal
- Means: parking forbidden on ODD calendar days (1st, 3rd, 5th... of the month)

C36 "Parkering förbjudet" — even days:
- Blue circle with TWO vertical white stripes crossed by red diagonal
- Means: parking forbidden on EVEN calendar days (2nd, 4th, 6th... of the month)

Step 1: Count vertical white stripes (0, 1, or 2)
Step 2: Identify sign
Step 3: Return JSON

{"found":true,"code":"C35 or C36","name_sv":"official Swedish name","name_ru":"Russian name","description_ru":"Full Russian description including odd/even days if C36","category":"предупреждающий OR запрещающий OR предписывающий OR информационный OR указательный","confidence":"high OR medium OR low"}

Or: {"found":false,"reason":"explanation in Russian"}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            { type: "text", text: "Count vertical white stripes carefully, then identify the sign. JSON only." }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data?.error?.message || "API error" });
    }

    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
    res.status(200).json({ text });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
