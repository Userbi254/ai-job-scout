if (isHTML) {
    console.log('[Cheerio] Detected HTML content');
    return extractFromHTML(content, pageUrl);
} else {
    console.log('[Cheerio] Detected plain text/markdown content');
    return extractFromText(content, pageUrl);
}
}

/**
 * Extract jobs from plain text/markdown content
 */
function extractFromText(text, pageUrl) {
    const jobs = [];
    const seenTitles = new Set();

    // Split content into sections by headers (## or ** headers)
    const sections = text.split(/(?=^##\s|\*\*[A-Z])/gm);

    // Job title patterns
    const jobTitlePatterns = [
        /^##\s*(.+)/m,                          // ## Job Title
        /^\*\*(.+?)\*\*/m,                      // **Job Title**
        /^\[([^\]]+)\]\(https?:\/\/[^)]+job[^)]*\)/gm,  // [Job Title](url)
    ];

    // Look for job listings in himalayas.app format
    const himalayasPattern = /\[([^\]]+)\]\(https:\/\/himalayas\.app\/companies\/[^/]+\/jobs\/[^)]+\)\s*(\d+\s*(?:day|month|week)s?\s*ago)?/g;
    let match;
    while ((match = himalayasPattern.exec(text)) !== null) {
        const title = match[1].trim();
        if (!seenTitles.has(title.toLowerCase()) && title.length > 5) {
            seenTitles.add(title.toLowerCase());

            // Get context around this match
            const start = Math.max(0, match.index - 200);
            const end = Math.min(text.length, match.index + 500);
            const context = text.substring(start, end);

            // Try to find company
            const companyMatch = context.match(/\[([^\]]+)\]\(https:\/\/himalayas\.app\/companies\/([^/]+)\)/);
            const company = companyMatch ? companyMatch[1] : null;

            // Try to find salary
            const salaryMatch = context.match(/Salary:?([\d,]+[k]?(?:-[\d,]+[k]?)?)\s*USD/i);
            const amount = salaryMatch ? salaryMatch[1] + ' USD' : null;

            // Employment details
            const employmentDetails = [];
            if (/Full[\s-]?Time/i.test(context)) employmentDetails.push('Full-time');
            if (/Part[\s-]?Time/i.test(context)) employmentDetails.push('Part-time');
            if (/Contract/i.test(context)) employmentDetails.push('Contract');
            if (/Remote/i.test(context)) employmentDetails.push('Remote');

            jobs.push({
                job_name: title,
                company: company,
                description: context.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').substring(0, 500),
                amount: amount,
                location: null,
                employment_details: employmentDetails,
                requirements: [],
                skills_needed: [],
                site_url: pageUrl,
                application_url: null
            });
        }
    }

    // Look for job titles in markdown headers
    const headerPattern = /^##\s*([^\n]+)/gm;
    while ((match = headerPattern.exec(text)) !== null) {
        const title = match[1].trim();

        // Skip navigation/meta headers
        if (/^(job requirements|key responsibilities|what we offer|related searches|find your dream)/i.test(title)) {
            continue;
        }

        if (seenTitles.has(title.toLowerCase()) || title.length < 5 || title.length > 150) {
            continue;
        }
        seenTitles.add(title.toLowerCase());

        // Get section content after this header
        const nextHeaderIndex = text.indexOf('\n##', match.index + 1);
        const sectionEnd = nextHeaderIndex > 0 ? nextHeaderIndex : Math.min(text.length, match.index + 2000);
        const sectionContent = text.substring(match.index, sectionEnd);

        // Extract requirements
        const requirements = [];
        const reqPattern = /[-•]\s*([^\n]+)/g;
        let reqMatch;
        while ((reqMatch = reqPattern.exec(sectionContent)) !== null) {
            const req = reqMatch[1].trim();
            if (req.length > 10 && req.length < 300) {
                requirements.push(req);
            }
        }

        // Extract location
        const locationMatch = sectionContent.match(/\*\*Location\*\*:\s*([^\n]+)/i) ||
            sectionContent.match(/Location:\s*([^\n]+)/i);
        const location = locationMatch ? locationMatch[1].trim() : null;

        // Extract employment type
        const typeMatch = sectionContent.match(/\*\*Type\*\*:\s*([^\n]+)/i);
        const employmentDetails = [];
        if (typeMatch) employmentDetails.push(typeMatch[1].trim());
        if (/remote/i.test(sectionContent)) employmentDetails.push('Remote');

        // Extract salary
        const salaryMatch = sectionContent.match(/\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?(?:\s*\/\s*(?:hr|hour|month|year))?/i) ||
            sectionContent.match(/Salary:?\s*([\d,]+[k]?)/i);
        const amount = salaryMatch ? salaryMatch[0] : null;

        jobs.push({
            job_name: title,
            company: null,
            description: sectionContent.substring(0, 800),
            amount: amount,
            location: location,
            employment_details: employmentDetails,
            requirements: requirements.slice(0, 10),
            skills_needed: [],
            site_url: pageUrl,
            application_url: null
        });
    }

    console.log(`[Cheerio] Extracted ${jobs.length} jobs from text`);
    return jobs;
}

/**
 * Extract jobs from HTML content
 */
function extractFromHTML(html, pageUrl) {
    const $ = cheerio.load(html);
    const jobs = [];
    const seenTitles = new Set();

    // Remove script and style elements
    $('script, style, noscript').remove();

    // Common job card selectors
    const jobCardSelectors = [
        '[class*="job-card"]', '[class*="job-listing"]', '[class*="job-item"]',
        '[class*="job_card"]', '[class*="job_listing"]', '[class*="job_item"]',
        '[class*="vacancy"]', '[class*="opening"]', '[class*="position"]',
        '[class*="career"]', '[class*="opportunity"]', '[class*="posting"]',
        '[data-testid*="job"]', '[data-job]', '[data-listing]',
        'article[class*="job"]', 'div[class*="job"]', 'li[class*="job"]',
        '.job', '.posting', '.career-item', '.opportunity', '.listing',
        '[role="listitem"]', '.search-result', '.result-item'
    ];

    // Patterns to EXCLUDE (navigation elements, UI text)
    const excludePatterns = [
        /^home$/i, /^about$/i, /^contact$/i, /^login$/i, /^sign/i, /^menu$/i,
        /^search$/i, /^filter$/i, /^sort$/i, /^close$/i, /^cancel$/i,
        /^cookie/i, /^privacy/i, /^terms$/i, /^next$/i, /^prev/i, /^back$/i,
        /^view all$/i, /^see more$/i, /^load more$/i, /^show more$/i
    ];

    function isValidTitle(title) {
        if (!title || title.length < 5 || title.length > 200) return false;
        if (excludePatterns.some(p => p.test(title.trim()))) return false;
        return true;
    }

    // Try each job card selector
    for (const selector of jobCardSelectors) {
        try {
            const cards = $(selector);

            if (cards.length > 0) {
                console.log(`[Cheerio] Found ${cards.length} elements with selector: ${selector}`);

                cards.each((i, card) => {
                    const $card = $(card);
                    const cardText = $card.text().trim().replace(/\s+/g, ' ');

                    if (cardText.length < 30 || cardText.length > 15000) return;

                    // Find job title
                    let title = '';
                    const titleSelectors = [
                        'h1', 'h2', 'h3', 'h4',
                        '[class*="title"]', '[class*="name"]', '[class*="heading"]',
                        'a[href*="job"]', 'a[href*="career"]', 'a[href*="apply"]',
                        'strong', 'b'
                    ];

                    for (const sel of titleSelectors) {
                        const el = $card.find(sel).first();
                        if (el.length) {
                            const text = el.text().trim();
                            if (isValidTitle(text)) {
                                title = text;
                                break;
                            }
                        }
                    }

                    if (!title) {
                        const lines = cardText.split(/[.\n]/).filter(l => l.trim().length > 5);
                        if (lines.length > 0 && isValidTitle(lines[0].trim())) {
                            title = lines[0].trim().substring(0, 150);
                        }
                    }

                    if (!title) return;
                    if (seenTitles.has(title.toLowerCase())) return;
                    seenTitles.add(title.toLowerCase());

                    // Find company
                    let company = null;
                    const companySelectors = [
                        '[class*="company"]', '[class*="employer"]', '[class*="organization"]'
                    ];
                    for (const sel of companySelectors) {
                        const el = $card.find(sel).first();
                        if (el.length && el.text().trim().length < 100) {
                            company = el.text().trim();
                            break;
                        }
                    }

                    // Find salary
                    const salaryMatch = cardText.match(/\$[\d,]+(?:\.\d+)?(?:\s*[-–]\s*\$[\d,]+)?(?:\s*\/\s*(?:hr|hour|mo|month|yr|year))?/i);
                    const amount = salaryMatch ? salaryMatch[0] : null;

                    // Find location
                    let location = null;
                    const locationEl = $card.find('[class*="location"], [class*="place"], [class*="city"]').first();
                    if (locationEl.length) {
                        location = locationEl.text().trim();
                    }

                    // Extract employment details
                    const employmentDetails = [];
                    const lowerCardText = cardText.toLowerCase();
                    if (lowerCardText.includes('remote')) employmentDetails.push('Remote');
                    if (lowerCardText.includes('hybrid')) employmentDetails.push('Hybrid');
                    if (lowerCardText.includes('full-time') || lowerCardText.includes('full time')) employmentDetails.push('Full-time');
                    if (lowerCardText.includes('part-time') || lowerCardText.includes('part time')) employmentDetails.push('Part-time');
                    if (lowerCardText.includes('contract')) employmentDetails.push('Contract');

                    // Find application URL
                    const applyLink = $card.find('a[href*="apply"], a[href*="job"], a[href*="career"]').first();
                    const applicationUrl = applyLink.length ? applyLink.attr('href') : null;

                    jobs.push({
                        job_name: title,
                        company: company,
                        description: cardText.substring(0, 800),
                        amount: amount,
                        location: location,
                        employment_details: employmentDetails,
                        requirements: [],
                        skills_needed: [],
                        site_url: pageUrl,
                        application_url: applicationUrl
                    });
                });

                if (jobs.length > 0) break;
            }
        } catch (e) {
            // Ignore selector errors
        }
    }

    // Fallback: Extract from headers
    if (jobs.length === 0) {
        console.log('[Cheerio] No job cards found, trying header-based extraction...');

        $('h1, h2, h3, h4').each((i, header) => {
            const title = $(header).text().trim();

            if (!isValidTitle(title)) return;
            if (seenTitles.has(title.toLowerCase())) return;
            seenTitles.add(title.toLowerCase());

            const parent = $(header).parent();
            const context = parent.text().trim().replace(/\s+/g, ' ').substring(0, 800);

            const employmentDetails = [];
            const lowerContext = context.toLowerCase();
            if (lowerContext.includes('remote')) employmentDetails.push('Remote');
            if (lowerContext.includes('full-time') || lowerContext.includes('full time')) employmentDetails.push('Full-time');

            jobs.push({
                job_name: title,
                company: null,
                description: context,
                amount: null,
                location: null,
                employment_details: employmentDetails,
                requirements: [],
                skills_needed: [],
                site_url: pageUrl,
                application_url: null
            });
        });
    }

    console.log(`[Cheerio] Extracted ${jobs.length} jobs from HTML`);
    return jobs;
}

/**
 * Extracts all links from HTML
 */
export function extractLinks(html, baseUrl) {
    const $ = cheerio.load(html);
    const links = [];

    $('a[href]').each((i, el) => {
        let href = $(el).attr('href');
        if (!href) return;

        if (href.startsWith('/')) {
            try {
                const url = new URL(baseUrl);
                href = `${url.origin}${href}`;
            } catch { }
        }

        if (href.startsWith('http')) {
            links.push(href);
        }
    });

    return [...new Set(links)];
}

/**
 * Extracts text content from HTML
 */
export function htmlToText(html) {
    const $ = cheerio.load(html);
    $('script, style, noscript').remove();
    return $('body').text().replace(/\s+/g, ' ').trim();
}
