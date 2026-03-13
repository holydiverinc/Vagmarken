module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  var body = req.body || {};
  var image = body.image;
  var localTime = body.localTime || "";
  var localDay = body.localDay || "";
  var localMonth = body.localMonth || "";
  var localWeekday = body.localWeekday || "";

  if (!image) return res.status(400).json({ error: "No image provided" });

  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "No API key" });

  var prompt = "You are an expert on Swedish road signs. Analyze ALL signs in the image.\n\nSWEDISH TIME RULES: Main time e.g. 9-18 applies Monday-Friday. Time in parentheses e.g. (9-15) applies Saturday. Red time or no time = Sunday and holidays, usually no restriction or fee.\n\nCurrent context: time=" + localTime + " day=" + localDay + " month=" + localMonth + " weekday=" + localWeekday + " (1=Mon,6=Sat,7=Sun).\n\nReturn ONLY raw JSON, no markdown. You MUST provide translations in all three languages. Return this structure:\n{\n  \"found\": true,\n  \"signs\": [\n    {\n      \"code\": \"\",\n      \"name_sv\": \"Swedish name\",\n      \"name_uk\": \"Ukrainian name\",\n      \"name_ru\": \"Russian name\",\n      \"description_uk\": \"Ukrainian description\",\n      \"description_ru\": \"Russian description\",\n      \"description_sv\": \"Swedish description\"\n    }\n  ],\n  \"main_code\": \"\",\n  \"main_name_sv\": \"\",\n  \"main_name_uk\": \"\",\n  \"main_name_ru\": \"\",\n  \"description_uk\": \"\",\n  \"description_ru\": \"\",\n  \"description_sv\": \"\",\n  \"category_uk\": \"\",\n  \"category_ru\": \"\",\n  \"category_sv\": \"\",\n  \"confidence\": \"high\",\n  \"is_parking_sign\": true,\n  \"parking_allowed\": true,\n  \"parking_reason_uk\": \"\",\n  \"parking_reason_ru\": \"\",\n  \"parking_reason_sv\": \"\"\n}\nor if no sign found: {\"found\": false, \"reason_uk\": \"\", \"reason_ru\": \"\", \"reason_sv\": \"\"}";

  try {
    var response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: prompt,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            { type: "text", text: "Analyze all road signs. Return JSON with all three languages (uk/ru/sv) for every text field." }
          ]
        }]
      })
    });

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

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
