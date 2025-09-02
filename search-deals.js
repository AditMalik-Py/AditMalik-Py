
import { createClient } from "@supabase/supabase-js";
import amazonPaapi from "amazon-paapi";
import axios from "axios";

// ------------------ CONFIG ------------------

// Supabase
const supabaseUrl = "https://YOUR_PROJECT.supabase.co"; // replace with your Supabase URL
const supabaseKey = "YOUR_SUPABASE_SERVICE_ROLE_KEY";  // use service role key
const supabase = createClient(supabaseUrl, supabaseKey);

// Geniuslink
const GENIUSLINK_BASE = "https://geni.us/yourGenieID?url=";

// Amazon PAAPI Config
const amazonParams = {
  AccessKey: "YOUR_AMAZON_ACCESS_KEY",
  SecretKey: "YOUR_AMAZON_SECRET_KEY",
  PartnerTag: "yourtag-21", // affiliate tag
  PartnerType: "Associates",
  Marketplace: "www.amazon.in",
};

// Flipkart Config
const FLIPKART_AFFILIATE_ID = "YOUR_AFFILIATE_ID";
const FLIPKART_AFFILIATE_TOKEN = "YOUR_AFFILIATE_TOKEN";

// Meesho Affiliate
const MEESHO_AFFILIATE_ID = "yourID"; // replace with your Meesho partner ID

// ------------------ FUNCTIONS ------------------

async function fetchAmazonDeals(keyword) {
  const requestParams = {
    Keywords: keyword,
    ItemCount: 10,
    Resources: [
      "Images.Primary.Small",
      "ItemInfo.Title",
      "Offers.Listings.Price",
      "Offers.Listings.SavingBasis",
    ],
  };

  try {
    const data = await amazonPaapi.SearchItems(amazonParams, requestParams);

    return data.SearchResult.Items
      .map(item => {
        const url = item.DetailPageURL;
        const price = item.Offers.Listings[0].Price.Amount;
        const savingsBasis = item.Offers.Listings[0].SavingBasis;

        let discount = 0;
        if (savingsBasis) {
          const basis = savingsBasis.Amount;
          discount = Math.round(((basis - price) / basis) * 100);
        }

        return {
          site: "Amazon",
          title: item.ItemInfo.Title.DisplayValue,
          discount,
          original_url: url,
          genius_url: GENIUSLINK_BASE + encodeURIComponent(url),
        };
      })
      .filter(p => p.discount >= 80);
  } catch (err) {
    console.error("Amazon API error:", err.message);
    return [];
  }
}

async function fetchFlipkartDeals(keyword) {
  try {
    // Flipkart API returns full offer list (no keyword search),
    // so we filter by keyword manually
    const { data } = await axios.get(
      "https://affiliate-api.flipkart.net/affiliate/offers/v1/all/json",
      {
        headers: {
          "Fk-Affiliate-Id": FLIPKART_AFFILIATE_ID,
          "Fk-Affiliate-Token": FLIPKART_AFFILIATE_TOKEN,
        },
      }
    );

    return data.allOffersList
      .filter(item => item.discountPercentage >= 80 && item.title.toLowerCase().includes(keyword.toLowerCase()))
      .map(item => ({
        site: "Flipkart",
        title: item.title,
        discount: item.discountPercentage,
        original_url: item.url,
        genius_url: GENIUSLINK_BASE + encodeURIComponent(item.url),
      }));
  } catch (err) {
    console.error("Flipkart API error:", err.message);
    return [];
  }
}

function fetchMeeshoDeals(keyword) {
  // ⚠️ Example only — replace with Meesho partner feed
  const sampleDeals = [
    {
      title: "Red Saree 80% off",
      url: "https://www.meesho.com/product123",
      discount: 85,
    },
    {
      title: "Casual Shoes 82% off",
      url: "https://www.meesho.com/product456",
      discount: 82,
    },
  ];

  return sampleDeals
    .filter(item => item.title.toLowerCase().includes(keyword.toLowerCase()) && item.discount >= 80)
    .map(item => {
      const affiliateUrl = `${item.url}?utm_source=affiliates&utm_medium=${MEESHO_AFFILIATE_ID}`;
      return {
        site: "Meesho",
        title: item.title,
        discount: item.discount,
        original_url: item.url,
        genius_url: GENIUSLINK_BASE + encodeURIComponent(affiliateUrl),
      };
    });
}

async function saveDealsToSupabase(deals) {
  if (!deals.length) return;
  const { error } = await supabase.from("deals").insert(deals);
  if (error) {
    console.error("Supabase insert error:", error.message);
  } else {
    console.log(`✅ Saved ${deals.length} deals to Supabase`);
  }
}

// ------------------ MAIN FUNCTION ------------------

export async function searchDeals(keyword) {
  console.log(`🔎 Searching deals for: "${keyword}"`);

  const amazon = await fetchAmazonDeals(keyword);
  const flipkart = await fetchFlipkartDeals(keyword);
  const meesho = fetchMeeshoDeals(keyword);

  const allDeals = [...amazon, ...flipkart, ...meesho];
  console.log(`Found ${allDeals.length} deals with ≥80% discount`);

  await saveDealsToSupabase(allDeals);

  return allDeals;
}

// ------------------ RUN DIRECTLY ------------------
// if run directly: node deals-search.js "shoes"

if (process.argv[2]) {
  const keyword = process.argv.slice(2).join(" ");
  searchDeals(keyword).then(deals => {
    deals.forEach((d, i) => {
      console.log(`\n${i + 1}. [${d.site}] ${d.title} - ${d.discount}% off`);
      console.log(`   Original: ${d.original_url}`);
      console.log(`   Genius:   ${d.genius_url}`);
    });
  });
}
