export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { path } = req.query;
  if (!path) return res.status(400).json({ error: "Missing path" });

  const notionUrl = `https://api.notion.com/v1/${path}`;

  try {
    const notionRes = await fetch(notionUrl, {
      method: req.method,
      headers: {
        "Authorization": `Bearer ${process.env.REACT_APP_NOTION_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: ["POST","PATCH"].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });
    const data = await notionRes.json();
    return res.status(notionRes.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
