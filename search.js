import express from "express";
import { searchDeals } from "./search-deals.js";

const app = express();
app.get("/search", async (req, res) => {
  const keyword = req.query.q || "shoes";
  const deals = await searchDeals(keyword);
  res.json(deals);
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
