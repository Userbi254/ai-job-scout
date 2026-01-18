async function test() {
    const content = `
    We are hiring a Senior Software Engineer at TechCorp.
    Location: Remote.
    Salary: $120k - $150k.
    Requirements: React, Node.js, TypeScript.
    Apply at example.com/apply
  `;

    try {
        console.log('Sending request to scraper...');
        const response = await fetch('http://localhost:3001/extract-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pageContent: content,
                pageUrl: 'http://example.com'
            })
        });

        const data = await response.json();
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

test();
