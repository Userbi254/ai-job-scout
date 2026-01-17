import { CVData } from '@/types/job';

export function generatePDF(cvData: CVData): void {
  // Create a printable version of the CV
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Please allow popups to download the CV');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${cvData.fullName || 'Resume'} - CV</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Georgia, 'Times New Roman', serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          font-size: 28px;
          letter-spacing: 2px;
          margin-bottom: 10px;
        }
        .contact {
          font-size: 14px;
          color: #666;
        }
        .contact span {
          margin: 0 10px;
        }
        section {
          margin-bottom: 25px;
        }
        section h2 {
          font-size: 16px;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: 1px solid #ccc;
          padding-bottom: 5px;
          margin-bottom: 15px;
        }
        .summary {
          color: #555;
        }
        .skills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .skill {
          background: #f0f0f0;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 13px;
        }
        .experience-item, .education-item {
          margin-bottom: 15px;
        }
        .experience-header, .education-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .job-title {
          font-weight: bold;
        }
        .company {
          color: #666;
        }
        .duration {
          color: #888;
          font-size: 14px;
        }
        .description {
          margin-top: 8px;
          font-size: 14px;
          color: #555;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          font-size: 11px;
          color: #999;
        }
        @media print {
          body {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${cvData.fullName || 'Your Name'}</h1>
        <div class="contact">
          ${cvData.email ? `<span>${cvData.email}</span>` : ''}
          ${cvData.phone ? `<span>• ${cvData.phone}</span>` : ''}
          ${cvData.location ? `<span>• ${cvData.location}</span>` : ''}
        </div>
      </div>

      ${cvData.summary ? `
      <section>
        <h2>Professional Summary</h2>
        <p class="summary">${cvData.summary}</p>
      </section>
      ` : ''}

      ${cvData.skills.length > 0 ? `
      <section>
        <h2>Skills</h2>
        <div class="skills">
          ${cvData.skills.map(skill => `<span class="skill">${skill}</span>`).join('')}
        </div>
      </section>
      ` : ''}

      ${cvData.experience.some(e => e.title) ? `
      <section>
        <h2>Work Experience</h2>
        ${cvData.experience.filter(e => e.title).map(exp => `
          <div class="experience-item">
            <div class="experience-header">
              <div>
                <div class="job-title">${exp.title}</div>
                <div class="company">${exp.company}</div>
              </div>
              <div class="duration">${exp.duration}</div>
            </div>
            ${exp.description ? `<p class="description">${exp.description}</p>` : ''}
          </div>
        `).join('')}
      </section>
      ` : ''}

      ${cvData.education.some(e => e.degree) ? `
      <section>
        <h2>Education</h2>
        ${cvData.education.filter(e => e.degree).map(edu => `
          <div class="education-item">
            <div class="education-header">
              <div>
                <div class="job-title">${edu.degree}</div>
                <div class="company">${edu.institution}</div>
              </div>
              <div class="duration">${edu.year}</div>
            </div>
          </div>
        `).join('')}
      </section>
      ` : ''}

      ${cvData.selectedJob ? `
      <div class="footer">
        CV tailored for: ${cvData.selectedJob.job_name} at ${cvData.selectedJob.company || 'Company'}
      </div>
      ` : ''}
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    printWindow.print();
  };
}
