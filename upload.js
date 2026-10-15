const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("חסרים SUPABASE_URL או SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

(async () => {
  console.log("קורא את anime.json...");
  const animes = JSON.parse(fs.readFileSync("./anime.json", "utf8"));
  console.log(`נמצאו ${animes.length} אנימות בקובץ`);

  const cleaned = animes.map((a) => {
    let title = a.title || "";
    title = title.replace(/^פרקים זמינים/, "").trim();
    title = title.replace(/צפייה\s*$/, "").trim();
    title = title.replace(/\d+\+\d+\s*פרקים\s*$/, "").trim();
    title = title.replace(/\s+/g, " ").trim();

    return {
      title: title || a.title,
      url: a.url,
      search_text: (a.search_text || title)
        .replace(/^פרקים זמינים/, "")
        .trim(),
    };
  });

  console.log("דוגמאות אחרי ניקוי:");
  cleaned.slice(0, 5).forEach((a) => console.log(` - ${a.title} → ${a.url}`));

  const batchSize = 100;
  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < cleaned.length; i += batchSize) {
    const batch = cleaned.slice(i, i + batchSize);
    const { error } = await supabase
      .from("anime")
      .upsert(batch, { onConflict: "url" });

    if (error) {
      console.error(`❌ באצ' ${i / batchSize + 1}:`, error.message);
      failed += batch.length;
    } else {
      uploaded += batch.length;
      console.log(`✅ באצ' ${i / batchSize + 1}: ${batch.length} (סה"כ ${uploaded})`);
    }
  }

  console.log(`\n🎉 סיום: ${uploaded} הועלו, ${failed} נכשלו`);
})();
