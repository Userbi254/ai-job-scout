import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sjrgklnamsykjqsshpso.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqcmdrbG5hbXN5a2pxc3NocHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODI3MTEsImV4cCI6MjA4NDE1ODcxMX0.20ok2iiUVH7xLWvLrW2nS0eAQQiAP6V01YkRziXtDa8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Fetching one record...');
    const { data, error } = await supabase
        .from('workflow_runs')
        .select('id, status')
        .limit(1);

    if (error) {
        console.error('Error fetching:', error);
    } else {
        console.log('Data:', data);
        if (data && data.length > 0) {
            const id = data[0].id;
            const originalStatus = data[0].status;
            console.log(`Attempting to update status to "failed" and error_message to "TRASHED" for id: ${id}`);
            const { error: updateError } = await supabase
                .from('workflow_runs')
                .update({ status: 'failed', error_message: 'TRASHED' })
                .eq('id', id);

            if (updateError) {
                console.error('Error updating:', updateError);
            } else {
                console.log('Update successful!');
                // Revert
                console.log(`Reverting to ${originalStatus}...`);
                await supabase.from('workflow_runs').update({ status: originalStatus, error_message: null }).eq('id', id);
            }
        } else {
            console.log('No records found to test update.');
        }

        console.log('Testing NEQ filter...');
        const { data: neqData, error: neqError } = await supabase
            .from('workflow_runs')
            .select('id, error_message')
            .neq('error_message', 'TRASHED')
            .limit(5);

        if (neqError) console.error('NEQ Error:', neqError);
        else console.log('NEQ Data (should include nulls if safe):', neqData);
    }
}

test();
