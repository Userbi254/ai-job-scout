import { useState, useRef } from 'react';
import { Upload, FileText, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { UserProfile } from '@/hooks/useUserProfile';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CVUploaderProps {
  onProfileExtracted: (profile: Partial<UserProfile>) => void;
}

export function CVUploader({ onProfileExtracted }: CVUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  // Client-side fallback extraction
  const extractFallbackInfo = (text: string): Partial<UserProfile> => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Extract name (first non-empty line)
    const fullName = lines[0] || '';

    // Extract email
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch?.[0] || '';

    // Extract phone (Kenya format)
    const phoneMatches = text.match(/(\+254\s?\d{3}\s?\d{3}\s?\d{3}|\d{10})/g);
    const phone = phoneMatches?.[0] || '';

    // Extract location
    const locationMatch = text.match(/(Nairobi|Mombasa|Kisumu|Nakuru|Eldoret|Thika|Malindi|Kitale|Garissa|Kakamega|Meru|Nyeri|Machakos|Kericho|Embu|Migori|Homa Bay|Vihiga|Bungoma|Siaya|Kilifi|Lamu|Kwale|Taita Taveta|Tana River|Wajir|Mandera|Marsabit|Isiolo|Samburu|Trans Nzoia|Uasin Gishu|Elgeyo Marakwet|Nandi|Baringo|Laikipia|Nyandarua|Nyamira|Kirinyaga|Murang'a|Kiambu|Turkana|West Pokot|Bomet|Kajiado|Kericho|Narok|Makueni|Tharaka Nithi|Meru|Embu|Kitui|Machakos|Nyandarua|Nyeri|Kirinyaga|Murang'a|Kiambu|Nairobi|Kenya)/i);
    const location = locationMatch?.[0] ? `${locationMatch[0]}, Kenya` : '';

    // Extract skills
    const skills: string[] = [];
    const skillsMatch = text.match(/(?:Skills|Technical Competencies|Core Competencies)[:\s]+([\s\S]*?)(?:\n\n|Experience|Education|$)/i);
    if (skillsMatch) {
      const skillsText = skillsMatch[1];
      const skillsList = skillsText.split(/[,•\n]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 50);
      skills.push(...skillsList);
    }

    // Extract education
    const education: Array<{ degree: string; institution: string; year: string }> = [];
    const eduKeywords = ['Bachelor', 'Master', 'Diploma', 'Certificate', 'KCSE', 'KCPE', 'PhD', 'Doctorate', 'B.Sc', 'M.Sc', 'B.A', 'M.A'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const hasEduKeyword = eduKeywords.some(keyword => line.includes(keyword));

      if (hasEduKeyword) {
        // Extract year from this line or next few lines
        let year = '';
        const yearMatch = line.match(/(19|20)\d{2}/g);
        if (yearMatch) {
          year = yearMatch[yearMatch.length - 1]; // Get the last year (end year)
        } else {
          // Check next 2 lines for year
          for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
            const nextYearMatch = lines[j].match(/(19|20)\d{2}/g);
            if (nextYearMatch) {
              year = nextYearMatch[nextYearMatch.length - 1];
              break;
            }
          }
        }

        const degree = line;
        const institution = lines[i + 1] || '';

        if (degree && year) {
          education.push({ degree, institution, year });
        }
      }
    }

    // Extract experience
    const experience: Array<{ title: string; company: string; duration: string; description: string }> = [];
    const jobTitleKeywords = ['Engineer', 'Developer', 'Manager', 'Analyst', 'Consultant', 'Specialist', 'Coordinator', 'Officer', 'Assistant', 'Director', 'Lead', 'Senior', 'Junior', 'Intern'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const hasJobKeyword = jobTitleKeywords.some(keyword => line.includes(keyword));

      if (hasJobKeyword && line.length < 100) {
        const title = line;
        const company = lines[i + 1] || '';
        const duration = lines[i + 2] || '';
        const description = lines[i + 3] || '';

        if (title && company) {
          experience.push({ title, company, duration, description });
        }
      }
    }

    console.log('--- FALLBACK EXTRACTION ---');
    console.log('Name:', fullName);
    console.log('Email:', email);
    console.log('Phone:', phone);
    console.log('Location:', location);
    console.log('Skills:', skills);
    console.table(education);
    console.table(experience);

    return {
      fullName,
      email,
      phone,
      location,
      skills,
      education: education.length > 0 ? education : [{ degree: '', institution: '', year: '' }],
      experience: experience.length > 0 ? experience : [{ title: '', company: '', duration: '', description: '' }],
      summary: ''
    };
  };

  const parseCV = async (cvText: string) => {
    setStatus('parsing');
    setError('');

    try {
      console.log('--- EXTRACTED CV TEXT START ---');
      console.log(cvText.substring(0, 500) + '...');
      console.log('--- EXTRACTED CV TEXT END ---');

      // Try AI parsing first
      const { data, error: invokeError } = await supabase.functions.invoke('parse-cv', {
        body: { cvText },
      });

      if (invokeError) {
        console.warn('AI parsing failed, using fallback:', invokeError);
        // Use fallback extraction
        const fallbackData = extractFallbackInfo(cvText);
        onProfileExtracted(fallbackData);
        setStatus('success');
        toast.success("CV parsed successfully (using fallback extraction)");
        return;
      }

      if (data?.success && data?.data) {
        const parsed = data.data;

        // Map AI response to UserProfile
        let extracted: Partial<UserProfile> = {
          fullName: parsed.full_name || '',
          email: parsed.email || '',
          phone: parsed.phone || '',
          location: parsed.location || '',
          summary: parsed.summary || '',
          skills: parsed.skills || [],
          experience: parsed.experience?.map((exp: any) => ({
            title: exp.title || '',
            company: exp.company || '',
            duration: exp.period || '',
            description: exp.description || ''
          })) || [{ title: '', company: '', duration: '', description: '' }],
          education: parsed.education?.map((edu: any) => ({
            degree: edu.degree || '',
            institution: edu.institution || '',
            year: edu.year || ''
          })) || [{ degree: '', institution: '', year: '' }]
        };

        console.log('--- AI PARSED DATA ---');
        console.log('Name:', extracted.fullName);
        console.log('Email:', extracted.email);
        console.log('Phone:', extracted.phone);
        console.table(extracted.education);

        // If AI missed critical fields, merge with fallback
        if (!extracted.fullName || !extracted.email || extracted.education.length === 0 || !extracted.education[0].degree) {
          console.log('AI parsing incomplete, merging with fallback...');
          const fallbackData = extractFallbackInfo(cvText);

          extracted = {
            fullName: extracted.fullName || fallbackData.fullName,
            email: extracted.email || fallbackData.email,
            phone: extracted.phone || fallbackData.phone,
            location: extracted.location || fallbackData.location,
            summary: extracted.summary || fallbackData.summary,
            skills: extracted.skills.length > 0 ? extracted.skills : fallbackData.skills,
            experience: (extracted.experience.length > 0 && extracted.experience[0].title) ? extracted.experience : fallbackData.experience,
            education: (extracted.education.length > 0 && extracted.education[0].degree) ? extracted.education : fallbackData.education,
          };

          console.log('--- MERGED DATA ---');
          console.log('Name:', extracted.fullName);
          console.log('Email:', extracted.email);
          console.table(extracted.education);
        }

        onProfileExtracted(extracted);
        setStatus('success');
        toast.success("CV parsed and validated successfully");
      } else {
        // AI returned error, use fallback
        console.warn('AI parsing returned no data, using fallback');
        const fallbackData = extractFallbackInfo(cvText);
        onProfileExtracted(fallbackData);
        setStatus('success');
        toast.success("CV parsed successfully (using fallback extraction)");
      }
    } catch (err) {
      console.error('CV parsing error:', err);
      // On any error, try fallback extraction
      try {
        const fallbackData = extractFallbackInfo(cvText);
        onProfileExtracted(fallbackData);
        setStatus('success');
        toast.success("CV parsed successfully (using fallback extraction)");
      } catch (fallbackErr) {
        console.error('Fallback extraction failed:', fallbackErr);
        const errorMsg = err instanceof Error ? err.message : "Failed to parse CV";
        setError(errorMsg);
        setStatus('error');
        toast.error(errorMsg);
        setFile(null);
        onProfileExtracted({});
      }
    }
  };

  const processFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setError('');
    setStatus('parsing');

    const fileType = uploadedFile.type;
    const fileName = uploadedFile.name.toLowerCase();

    try {
      let extractedText = '';

      if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
        extractedText = await uploadedFile.text();
      } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        try {
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs';

          const arrayBuffer = await uploadedFile.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            fullText += pageText + '\n';
          }
          extractedText = fullText.trim();
        } catch (pdfError) {
          console.error('PDF parsing error:', pdfError);
          setError('PDF parsing failed. Please paste your CV text manually in the text area below.');
          setStatus('error');
          toast.error('PDF parsing failed. Please paste your CV text instead.');
          return;
        }
      } else if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.docx')
      ) {
        try {
          const mammoth = await import('mammoth');
          const arrayBuffer = await uploadedFile.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          extractedText = result.value.trim();

          if (result.messages.length > 0) {
            console.log('Mammoth messages:', result.messages);
          }
        } catch (docxError) {
          console.error('DOCX parsing error:', docxError);
          setError('DOCX parsing failed. Please paste your CV text manually.');
          setStatus('error');
          toast.error('DOCX parsing failed');
          return;
        }
      } else {
        setError('Unsupported file format. Please use .txt, .pdf, .docx, or paste text directly.');
        setStatus('error');
        toast.error('Unsupported file format');
        return;
      }

      if (extractedText.length < 50) {
        setError('The file appears to be empty or too short. Please ensure your CV has content.');
        setStatus('error');
        toast.error('File content too short');
        return;
      }

      parseCV(extractedText);

    } catch (err) {
      console.error('File processing error:', err);
      setError('Failed to process file. Please try pasting your CV text instead.');
      setStatus('error');
      toast.error('File processing failed');
    }
  };

  const handleTextSubmit = () => {
    if (text.trim().length < 50) {
      toast.error('Please enter at least 50 characters');
      return;
    }
    parseCV(text);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border",
          status === 'success' && "border-green-500 bg-green-500/5",
          status === 'error' && "border-red-500 bg-red-500/5"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          {status === 'idle' && (
            <>
              <Upload className="w-12 h-12 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">Upload your CV</p>
                <p className="text-sm text-muted-foreground">
                  Drag and drop or click to browse (.pdf, .docx, .txt)
                </p>
              </div>
              <Button onClick={() => inputRef.current?.click()}>
                <FileText className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </>
          )}

          {status === 'parsing' && (
            <>
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-lg font-medium">Parsing your CV...</p>
            </>
          )}

          {status === 'success' && file && (
            <>
              <Check className="w-12 h-12 text-green-500" />
              <div>
                <p className="text-lg font-medium text-green-500">CV Parsed Successfully!</p>
                <p className="text-sm text-muted-foreground">{file.name}</p>
              </div>
              <Button variant="outline" onClick={() => {
                setFile(null);
                setStatus('idle');
                setError('');
              }}>
                Upload Another
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <X className="w-12 h-12 text-red-500" />
              <div>
                <p className="text-lg font-medium text-red-500">Parsing Failed</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" onClick={() => {
                setFile(null);
                setStatus('idle');
                setError('');
              }}>
                Try Again
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or paste your CV text</span>
        </div>
      </div>

      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your CV text here..."
          className="min-h-[200px] font-mono text-sm"
        />
        <Button
          onClick={handleTextSubmit}
          disabled={status === 'parsing' || text.trim().length < 50}
          className="w-full"
        >
          {status === 'parsing' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Parsing...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Parse CV Text
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
