async function run() {
    // We can just grab the exact ID since the visual test in the browser just executed it.
    // We'll just run a fresh new trigger to test against.

    const triggerRes = await fetch("http://localhost:3000/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            query: "product, manager",
            user_email: "test@demo.com",
            execution_id: "test-callback-1234",
            callback_url: "http://localhost:3000/api/callback"
        })
    });
    console.log("Trigger Status:", triggerRes.status);

    await new Promise(r => setTimeout(r, 2000));

    console.log("Simulating N8N callback...");
    const payload = {
        execution_id: "test-callback-1234",
        total_links: 15,
        relevant_links: 8,
        spreadsheet_url: "https://docs.google.com/spreadsheets/d/test-url-123",
        status: "success"
    };

    const res = await fetch("http://localhost:3000/api/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    console.log("Callback POST status:", res.status);

    await new Promise(r => setTimeout(r, 1000));

    const pollRes = await fetch("http://localhost:3000/api/poll?execution_id=test-callback-1234");
    const pollData = await pollRes.json();
    console.log("Poll Result:", pollData);
}

run();
