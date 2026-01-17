import React from 'react';
import { CVData } from '@/types/job';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from "sonner";
import { generateDirectPDF } from '@/utils/directPdfGenerator';

interface CVPreviewProps {
  cvData: CVData;
  onDownload: () => void;
}

export function CVPreview({ cvData, onDownload }: CVPreviewProps) {
  const [template, setTemplate] = React.useState<string>('cascade');

  const handleDirectDownload = () => {
    try {
      generateDirectPDF(cvData, template);
      toast.success("CV downloaded successfully!");
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error("Failed to generate PDF");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Professional templates inspired by Canva/EnhanceCV
  const templates = [
    { id: 'cascade', name: 'Cascade', color: '#2563eb', emoji: '📘' },
    { id: 'professional', name: 'Professional', color: '#1e293b', emoji: '📋' },
    { id: 'modern', name: 'Modern', color: '#0891b2', emoji: '✨' },
    { id: 'minimal', name: 'Minimal', color: '#374151', emoji: '📄' },
    { id: 'elegant', name: 'Elegant', color: '#7c3aed', emoji: '💎' },
    { id: 'corporate', name: 'Corporate', color: '#0f766e', emoji: '🏢' },
    { id: 'creative', name: 'Creative', color: '#db2777', emoji: '🎨' },
    { id: 'ats-friendly', name: 'ATS Friendly', color: '#000000', emoji: '✅' },
  ];

  const currentTemplate = templates.find(t => t.id === template) || templates[0];

  const renderTemplate = () => {
    const accentColor = currentTemplate.color;

    switch (template) {
      case 'cascade': // Two-column with sidebar
        return (
          <div className="flex min-h-full">
            {/* Sidebar */}
            <div className="w-1/3 text-white p-6" style={{ backgroundColor: accentColor }}>
              <div className="mb-8">
                <h1 className="text-2xl font-bold mb-2">{cvData.fullName}</h1>
                <p className="text-sm opacity-90">Professional</p>
              </div>

              {/* Contact */}
              <div className="mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider mb-3 opacity-80">Contact</h3>
                <div className="space-y-2 text-sm">
                  {cvData.email && <p>{cvData.email}</p>}
                  {cvData.phone && <p>{cvData.phone}</p>}
                  {cvData.location && <p>{cvData.location}</p>}
                </div>
              </div>

              {/* Skills */}
              {cvData.skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-3 opacity-80">Skills</h3>
                  <div className="space-y-1.5">
                    {cvData.skills.map((skill, i) => (
                      <p key={i} className="text-sm">{skill}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Main Content */}
            <div className="w-2/3 p-6 bg-white">
              {cvData.summary && (
                <section className="mb-6">
                  <h2 className="text-lg font-bold mb-3 pb-2 border-b-2" style={{ borderColor: accentColor, color: accentColor }}>Profile</h2>
                  <p className="text-sm leading-relaxed text-gray-700">{cvData.summary}</p>
                </section>
              )}

              {cvData.experience.some(e => e.title) && (
                <section className="mb-6">
                  <h2 className="text-lg font-bold mb-3 pb-2 border-b-2" style={{ borderColor: accentColor, color: accentColor }}>Experience</h2>
                  <div className="space-y-4">
                    {cvData.experience.filter(e => e.title).map((exp, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-baseline">
                          <h3 className="font-semibold">{exp.title}</h3>
                          <span className="text-sm text-gray-500">{exp.duration}</span>
                        </div>
                        <p className="text-sm font-medium" style={{ color: accentColor }}>{exp.company}</p>
                        {exp.description && <p className="text-sm text-gray-600 mt-1">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {cvData.education.some(e => e.degree) && (
                <section>
                  <h2 className="text-lg font-bold mb-3 pb-2 border-b-2" style={{ borderColor: accentColor, color: accentColor }}>Education</h2>
                  <div className="space-y-3">
                    {cvData.education.filter(e => e.degree).map((edu, i) => (
                      <div key={i} className="flex justify-between">
                        <div>
                          <h3 className="font-semibold">{edu.degree}</h3>
                          <p className="text-sm text-gray-600">{edu.institution}</p>
                        </div>
                        <span className="text-sm text-gray-500">{edu.year}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        );

      case 'professional': // Classic executive style
        return (
          <div className="p-8 bg-white">
            <header className="text-center border-b-2 border-gray-800 pb-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{cvData.fullName}</h1>
              <div className="flex justify-center gap-4 text-sm text-gray-600">
                {cvData.email && <span>{cvData.email}</span>}
                {cvData.phone && <span>• {cvData.phone}</span>}
                {cvData.location && <span>• {cvData.location}</span>}
              </div>
            </header>

            {cvData.summary && (
              <section className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide mb-3">Professional Summary</h2>
                <p className="text-gray-700 leading-relaxed">{cvData.summary}</p>
              </section>
            )}

            {cvData.experience.some(e => e.title) && (
              <section className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide mb-3">Experience</h2>
                <div className="space-y-4">
                  {cvData.experience.filter(e => e.title).map((exp, i) => (
                    <div key={i}>
                      <div className="flex justify-between">
                        <h3 className="font-bold">{exp.title}</h3>
                        <span className="text-gray-500">{exp.duration}</span>
                      </div>
                      <p className="font-medium text-gray-700">{exp.company}</p>
                      {exp.description && <p className="text-sm text-gray-600 mt-1">{exp.description}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="grid grid-cols-2 gap-6">
              {cvData.education.some(e => e.degree) && (
                <section>
                  <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide mb-3">Education</h2>
                  {cvData.education.filter(e => e.degree).map((edu, i) => (
                    <div key={i} className="mb-2">
                      <h3 className="font-semibold">{edu.degree}</h3>
                      <p className="text-sm text-gray-600">{edu.institution} • {edu.year}</p>
                    </div>
                  ))}
                </section>
              )}

              {cvData.skills.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide mb-3">Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {cvData.skills.map((skill, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded">{skill}</span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        );

      case 'modern': // Bold header with accent
        return (
          <div className="bg-white">
            <header className="p-8 text-white" style={{ backgroundColor: accentColor }}>
              <h1 className="text-4xl font-bold mb-2">{cvData.fullName}</h1>
              <div className="flex gap-4 text-sm opacity-90">
                {cvData.email && <span>{cvData.email}</span>}
                {cvData.phone && <span>• {cvData.phone}</span>}
                {cvData.location && <span>• {cvData.location}</span>}
              </div>
            </header>

            <div className="p-8">
              {cvData.summary && (
                <section className="mb-6">
                  <h2 className="text-lg font-bold mb-2" style={{ color: accentColor }}>About Me</h2>
                  <p className="text-gray-700">{cvData.summary}</p>
                </section>
              )}

              {cvData.experience.some(e => e.title) && (
                <section className="mb-6">
                  <h2 className="text-lg font-bold mb-3" style={{ color: accentColor }}>Experience</h2>
                  <div className="space-y-4">
                    {cvData.experience.filter(e => e.title).map((exp, i) => (
                      <div key={i} className="border-l-2 pl-4" style={{ borderColor: accentColor }}>
                        <h3 className="font-bold">{exp.title}</h3>
                        <p className="text-sm" style={{ color: accentColor }}>{exp.company} | {exp.duration}</p>
                        {exp.description && <p className="text-sm text-gray-600 mt-1">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="grid grid-cols-2 gap-6">
                {cvData.education.some(e => e.degree) && (
                  <section>
                    <h2 className="text-lg font-bold mb-3" style={{ color: accentColor }}>Education</h2>
                    {cvData.education.filter(e => e.degree).map((edu, i) => (
                      <div key={i} className="mb-2">
                        <h3 className="font-semibold">{edu.degree}</h3>
                        <p className="text-sm text-gray-600">{edu.institution}</p>
                        <p className="text-xs text-gray-500">{edu.year}</p>
                      </div>
                    ))}
                  </section>
                )}

                {cvData.skills.length > 0 && (
                  <section>
                    <h2 className="text-lg font-bold mb-3" style={{ color: accentColor }}>Skills</h2>
                    <div className="flex flex-wrap gap-1.5">
                      {cvData.skills.map((skill, i) => (
                        <span key={i} className="px-2 py-0.5 text-white text-xs rounded" style={{ backgroundColor: accentColor }}>{skill}</span>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        );

      case 'minimal': // Clean and simple
        return (
          <div className="p-10 bg-white font-light">
            <header className="mb-8">
              <h1 className="text-4xl mb-1">{cvData.fullName}</h1>
              <div className="text-gray-500 text-sm space-x-3">
                {cvData.email && <span>{cvData.email}</span>}
                {cvData.phone && <span>{cvData.phone}</span>}
                {cvData.location && <span>{cvData.location}</span>}
              </div>
            </header>

            {cvData.summary && (
              <section className="mb-6">
                <p className="text-gray-600 leading-relaxed">{cvData.summary}</p>
              </section>
            )}

            {cvData.experience.some(e => e.title) && (
              <section className="mb-6">
                <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Experience</h2>
                <div className="space-y-4">
                  {cvData.experience.filter(e => e.title).map((exp, i) => (
                    <div key={i}>
                      <h3 className="font-medium">{exp.title}</h3>
                      <p className="text-sm text-gray-500">{exp.company} — {exp.duration}</p>
                      {exp.description && <p className="text-sm text-gray-600 mt-1">{exp.description}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {cvData.education.some(e => e.degree) && (
              <section className="mb-6">
                <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Education</h2>
                {cvData.education.filter(e => e.degree).map((edu, i) => (
                  <div key={i} className="mb-2">
                    <span className="font-medium">{edu.degree}</span>
                    <span className="text-gray-400"> — </span>
                    <span className="text-gray-600">{edu.institution}, {edu.year}</span>
                  </div>
                ))}
              </section>
            )}

            {cvData.skills.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Skills</h2>
                <p className="text-gray-600">{cvData.skills.join(' • ')}</p>
              </section>
            )}
          </div>
        );

      case 'ats-friendly': // ATS optimized
        return (
          <div className="p-8 bg-white font-sans text-black">
            <header className="mb-6">
              <h1 className="text-2xl font-bold uppercase mb-1">{cvData.fullName}</h1>
              <p className="text-sm">{cvData.email} | {cvData.phone} | {cvData.location}</p>
            </header>

            {cvData.summary && (
              <section className="mb-5">
                <h2 className="text-base font-bold uppercase border-b border-black mb-2">Summary</h2>
                <p className="text-sm">{cvData.summary}</p>
              </section>
            )}

            {cvData.experience.some(e => e.title) && (
              <section className="mb-5">
                <h2 className="text-base font-bold uppercase border-b border-black mb-2">Experience</h2>
                {cvData.experience.filter(e => e.title).map((exp, i) => (
                  <div key={i} className="mb-3">
                    <div className="flex justify-between">
                      <strong>{exp.title}</strong>
                      <span>{exp.duration}</span>
                    </div>
                    <div>{exp.company}</div>
                    {exp.description && <p className="text-sm mt-1">{exp.description}</p>}
                  </div>
                ))}
              </section>
            )}

            {cvData.education.some(e => e.degree) && (
              <section className="mb-5">
                <h2 className="text-base font-bold uppercase border-b border-black mb-2">Education</h2>
                {cvData.education.filter(e => e.degree).map((edu, i) => (
                  <div key={i} className="mb-1">
                    <strong>{edu.degree}</strong> — {edu.institution}, {edu.year}
                  </div>
                ))}
              </section>
            )}

            {cvData.skills.length > 0 && (
              <section>
                <h2 className="text-base font-bold uppercase border-b border-black mb-2">Skills</h2>
                <p className="text-sm">{cvData.skills.join(', ')}</p>
              </section>
            )}
          </div>
        );

      default: // Elegant fallback
        return (
          <div className="p-8 bg-white">
            <header className="text-center mb-8 pb-6 border-b" style={{ borderColor: accentColor }}>
              <h1 className="text-3xl font-semibold mb-2" style={{ color: accentColor }}>{cvData.fullName}</h1>
              <div className="text-gray-600 text-sm space-x-2">
                {cvData.email && <span>{cvData.email}</span>}
                {cvData.phone && <span>• {cvData.phone}</span>}
                {cvData.location && <span>• {cvData.location}</span>}
              </div>
            </header>

            {cvData.summary && (
              <section className="mb-6">
                <h2 className="font-semibold mb-2" style={{ color: accentColor }}>Professional Profile</h2>
                <p className="text-gray-700">{cvData.summary}</p>
              </section>
            )}

            {cvData.experience.some(e => e.title) && (
              <section className="mb-6">
                <h2 className="font-semibold mb-3" style={{ color: accentColor }}>Work Experience</h2>
                <div className="space-y-4">
                  {cvData.experience.filter(e => e.title).map((exp, i) => (
                    <div key={i}>
                      <div className="flex justify-between">
                        <h3 className="font-medium">{exp.title}</h3>
                        <span className="text-gray-500 text-sm">{exp.duration}</span>
                      </div>
                      <p className="text-sm" style={{ color: accentColor }}>{exp.company}</p>
                      {exp.description && <p className="text-sm text-gray-600 mt-1">{exp.description}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="grid grid-cols-2 gap-6">
              {cvData.education.some(e => e.degree) && (
                <section>
                  <h2 className="font-semibold mb-3" style={{ color: accentColor }}>Education</h2>
                  {cvData.education.filter(e => e.degree).map((edu, i) => (
                    <div key={i} className="mb-2">
                      <h3 className="font-medium">{edu.degree}</h3>
                      <p className="text-sm text-gray-600">{edu.institution} • {edu.year}</p>
                    </div>
                  ))}
                </section>
              )}

              {cvData.skills.length > 0 && (
                <section>
                  <h2 className="font-semibold mb-3" style={{ color: accentColor }}>Skills</h2>
                  <div className="flex flex-wrap gap-1">
                    {cvData.skills.map((skill, i) => (
                      <span key={i} className="px-2 py-0.5 border rounded text-xs" style={{ borderColor: accentColor, color: accentColor }}>{skill}</span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/30 p-4 rounded-lg">
        <div className="flex items-center gap-4 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          <span className="text-sm font-medium whitespace-nowrap">Template:</span>
          <div className="flex gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-md border transition-all whitespace-nowrap flex items-center gap-1",
                  template === t.id
                    ? "text-white border-transparent"
                    : "bg-background hover:bg-accent"
                )}
                style={template === t.id ? { backgroundColor: t.color } : {}}
              >
                <span>{t.emoji}</span>
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Smart selection based on skills
              const isTech = cvData.skills.some(s => ['React', 'Python', 'Java', 'AI', 'Data', 'Developer', 'Engineer'].some(k => s.toLowerCase().includes(k.toLowerCase())));
              const isCreative = cvData.skills.some(s => ['Design', 'Art', 'Writing', 'Creative', 'UI', 'UX'].some(k => s.toLowerCase().includes(k.toLowerCase())));

              if (isTech) setTemplate('modern');
              else if (isCreative) setTemplate('creative');
              else setTemplate('professional');

              toast.info("Auto-selected best template for your profile");
            }}
          >
            Smart Select
          </Button>
          <Button variant="secondary" onClick={handlePrint} size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDirectDownload} size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* CV Document */}
      <div
        id="cv-preview"
        className="bg-white text-black rounded-lg shadow-xl max-w-[800px] mx-auto print:shadow-none min-h-[1100px] overflow-hidden"
      >
        {renderTemplate()}
      </div>
    </div>
  );
}
