
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const sampleContent = `
We are hiring for an AI Data Trainer.
Responsibilities:
- Annotate data for machine learning models.
- Review AI generated content.
- Remote work.
- Pay: $20/hr.
`;

const sampleUrl = "https://example.com/jobs/ai-trainer";

console.log("Testing extraction...");

// Mocking the request to the local function (if running locally) or just testing the logic
// Since I can't run the function directly here easily without Deno, I will create a script that simulates the logic or calls the deployed function.

// Let's call the deployed function to see if it works with this content.
// I need the anon key for this, but I can use the one from the client or just try to invoke it if I had the key.
// Since I don't have the key handy in this context (it's in .env), I'll try to simulate the logic in a small script if possible, or just rely on code analysis.

// Actually, I can use the `run_command` to invoke the function via supabase cli if I want to test it locally.
// `npx supabase functions serve` and then curl it.

console.log("To test, I will try to invoke the function using curl if possible, or just analyze the code.");
