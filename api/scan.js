module.exports = async function handler(req, res) {
res.setHeader(“Access-Control-Allow-Origin”, “*”);
res.setHeader(“Access-Control-Allow-Methods”, “POST, OPTIONS”);
res.setHeader(“Access-Control-Allow-Headers”, “Content-Type”);

if (req.method === “OPTIONS”) return res.status(200).end();
if (req.method !== “POST”) return res.status(405).json({ error: “Method not allowed” });

var body = req.body || {};
var image = body.image;
var localTime = body.localTime || “”;
var localDay = body.localDay || “”;
var localMonth = body.localMonth || “”;
var localWeekday = body.localWeekday || “”;
var responseLang = body.responseLang || “Ukrainian”;

if (!image) return res.status(400).json({ error: “No image provided” });

var apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) return res.status(500).json({ error: “No API key” });

var prompt = “You are an expert on Swedish road signs. Analyze ALL signs in the image. Respond in “ + responseLang + “. Return ONLY raw JSON, no markdown. Current time=” + localTime + “ day=” + localDay + “ month=” + localMonth + “ weekday=” + localWeekday + “ (1=Mon,7=Sun). Return: {"found":true,"signs":[{"code":"","name_sv":"","name_translated":"","description":""}],"main_code":"","main_name_sv":"","main_name_translated":"","full_description":"","category":"","confidence":"high","is_parking_sign":true,"parking_allowed":true,"parking_reason":""} or {"found":false,"reason":""}”;

try {
var response = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: {
“Content-Type”: “application/json”,
“x-api-key”: apiKey,
“anthropic-version”: “2023-06-01”
},
body: JSON.stringify({
model: “claude-haiku-4-5-20251001”,
max_tokens: 1500,
system: prompt,
messages: [{
role: “user”,
content: [
{ type: “image”, source: { type: “base64”, media_type: “image/jpeg”, data: image } },
{ type: “text”, text: “Analyze signs. Return JSON only.” }
]
}]
})
});

```
var data = await response.json();

if (!response.ok) {
  return res.status(500).json({ error: "API " + response.status + ": " + JSON.stringify(data).slice(0, 200) });
}

var text = "";
if (data.content) {
  for (var i = 0; i < data.content.length; i++) {
    if (data.content[i].type === "text") text += data.content[i].text;
  }
}

return res.status(200).json({ text: text.trim() });
```

} catch (err) {
return res.status(500).json({ error: err.message });
}
};
