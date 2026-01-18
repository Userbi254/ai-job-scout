// Test CV Generation Edge Function
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sjrgklnamsykjqsshpso.supabase.co';
const supabaseKey = 'sb_publishable_eiFWsuoVHaXbIRYGs8iHdg_5pDcjKnr';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCVGeneration() {
    console.log('Testing CV Generation with Authentication...\n');

    // 1. Sign up/Sign in a test user to get a valid session
    const email = `test_${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    console.log(`Creating test user: ${email}...`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.error('❌ Auth Error:', authError.message);
        // Try signing in if user exists (unlikely with timestamp but good practice)
        if (authError.message.includes('already registered')) {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (signInError) {
                console.error('❌ Sign In Error:', signInError.message);
                return;
            }
            console.log('✅ Signed in successfully');
        } else {
            return;
        }
    } else {
        console.log('✅ Test user created successfully');
    }

    // Check if we have a session (might need email confirmation if enabled)
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        console.warn('⚠️ No active session. Email confirmation might be required.');
        console.warn('Attempting to call function anyway (might fail with 401)...');
    } else {
        console.log('✅ Active session confirmed');
    }

    const testProfile = {
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '+254700000000',
        location: 'Nairobi, Kenya',
        skills: ['Data Annotation', 'AI Training', 'English Fluency'],
        experience: [{
            title: 'Data Annotator',
            company: 'Test Company',
            duration: '2023-Present',
            description: 'Annotated data for AI models'
        }],
        education: [{
            degree: 'Bachelor of Science',
            institution: 'University of Nairobi',
            year: '2022'
        }],
        summary: 'Experienced data annotator'
    };

    const testJob = {
        job_name: 'AI Training Specialist',
        company: 'Remotasks',
        skills_needed: ['Data Annotation', 'Attention to Detail', 'English'],
        requirements: ['Bachelor\'s degree', 'Strong English skills']
    };

    try {
        console.log('Calling generate-cv function...');
        // The supabase client automatically includes the Auth header if a session exists
        const { data, error } = await supabase.functions.invoke('generate-cv', {
            body: {
                userProfile: testProfile,
                job: testJob
            }
        });

        if (error) {
            console.error('❌ Function Error:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));

            if (error instanceof Error && error.message.includes('401')) {
                console.error('\n⚠️ 401 Unauthorized confirmed. This is likely because Email Confirmation is enabled in your Supabase project.');
                console.error('To fix this for testing: Go to Supabase Auth Settings -> Disable "Confirm email"');
            }
            return;
        }

        console.log('✅ Success! CV Generated.');
        console.log('Summary Preview:', data.data?.summary?.substring(0, 100) + '...');
    } catch (err) {
        console.error('❌ Exception:', err);
    }
}

testCVGeneration();
