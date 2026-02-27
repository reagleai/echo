import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase.from('execution_logs').select('id').order('started_at', { ascending: false }).limit(1);
    if (error || !data.length) return console.log("No logs found");

    const id = data[0].id;
    console.log(`Faking callback for ${id}`);

    const payload = {
        execution_id: id,
        total_links: 15,
        relevant_links: 8,
        spreadsheet_url: "https://docs.google.com/spreadsheets/d/test",
        status: "success"
    };

    const res = await fetch("http://localhost:3000/api/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    console.log("Callback POST status:", res.status);
}

run();
