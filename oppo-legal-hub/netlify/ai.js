// /.netlify/functions/ai
// Backend seguro — OPENAI_KEY nunca vai para o browser

exports.handler = async function(event) {

  // Only POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // CORS headers — allows the Netlify-hosted frontend to call this function
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  try {
    const { system, content } = JSON.parse(event.body);

    if (!system || !content) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "system e content são obrigatórios" }) };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 4096,
        messages: [
          { role: "system", content: system + "\nHoje: " + new Date().toLocaleDateString("pt-BR") },
          { role: "user",   content: content }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error?.message || `OpenAI HTTP ${response.status}`;
      return { statusCode: 502, headers, body: JSON.stringify({ error: msg }) };
    }

    const text = (data.choices?.[0]?.message?.content || "")
      .replace(/```json|```/g, "")
      .trim();

    if (!text) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Resposta vazia da OpenAI" }) };
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "IA retornou formato inválido. Tente novamente." }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(parsed) };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || "Erro interno no servidor" })
    };
  }
}
