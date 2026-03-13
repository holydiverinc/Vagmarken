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
  var responseLang = body.responseLang || "Ukrainian";

  if (!image) return res.status(400).json({ error: "No image provided" });

  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "No API key" });

  var prompt = "You are an expert on Swedish road signs. Analyze ALL signs in the image.\n\nOUTPUT LANGUAGE: You MUST write ALL text fields in " + responseLang + " language. This includes: name_translated, description, full_description, category, parking_reason, reason. DO NOT use English unless " + responseLang + " is English. The ONLY exception is name_sv which must always be in Swedish.\n\nSWEDISH TIME RULES: Main time e.g. 9-18 applies Monday-Friday. Time in parentheses e.g. (9-15) applies Saturday. Red time or no time = Sunday and holidays, usually no restriction or fee.\n\nCurrent context: time=" + localTime + " day=" + localDay + " month=" + localMonth + " weekday=" + localWeekday + " (1=Mon,6=Sat,7=Sun).\n\nReturn ONLY this raw JSON, no markdown:\n{\"found\":true,\"signs\":[{\"code\":\"\",\"name_sv\":\"Swedish only\",\"name_translated\":\"" + responseLang + " only\",\"description\":\"" + responseLang + " only\"}],\"main_code\":\"\",\"main_name_sv\":\"Swedish only\",\"main_name_translated\":\"" + responseLang + " only\",\"full_description\":\"" + responseLang + " only\",\"category\":\"" + responseLang + " only\",\"confidence\":\"high\",\"is_parking_sign\":true,\"parking_allowed\":true,\"parking_reason\":\"" + responseLang + " only\"}\nor if no sign: {\"found\":false,\"reason\":\"" + responseLang + " only\"}";

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
        max_tokens: 1500,
        system: prompt,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            { type: "text", text: "Analyze all road signs. All text fields must be in " + responseLang + ". Return JSON only." }
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
