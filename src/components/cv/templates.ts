import { CVData } from '@/types/job';

export interface CVTemplate {
    id: string;
    name: string;
    description: string;
    category: 'modern' | 'classic' | 'creative' | 'minimal';
    accentColor: string;
    preview: string;
}

// Professional templates inspired by Canva/EnhanceCV/Zety designs
export const cvTemplates: CVTemplate[] = [
    // Modern Professional Templates
    {
        id: 'cascade',
        name: 'Cascade',
        description: 'Two-column layout with sidebar for skills',
        category: 'modern',
        accentColor: '#2563eb', // Blue
        preview: '📘'
    },
    {
        id: 'professional',
        name: 'Professional',
        description: 'Clean single-column executive style',
        category: 'classic',
        accentColor: '#1e293b', // Slate
        preview: '📋'
    },
    {
        id: 'modern',
        name: 'Modern',
        description: 'Bold header with accent border',
        category: 'modern',
        accentColor: '#0891b2', // Cyan
        preview: '✨'
    },
    {
        id: 'minimal',
        name: 'Minimal',
        description: 'Simple and clean typography focus',
        category: 'minimal',
        accentColor: '#374151', // Gray
        preview: '📄'
    },
    {
        id: 'elegant',
        name: 'Elegant',
        description: 'Sophisticated design with subtle accents',
        category: 'classic',
        accentColor: '#7c3aed', // Violet
        preview: '💎'
    },
    {
        id: 'corporate',
        name: 'Corporate',
        description: 'Traditional format for business roles',
        category: 'classic',
        accentColor: '#0f766e', // Teal
        preview: '🏢'
    },
    {
        id: 'creative',
        name: 'Creative',
        description: 'Eye-catching design for creative fields',
        category: 'creative',
        accentColor: '#db2777', // Pink
        preview: '🎨'
    },
    {
        id: 'ats-friendly',
        name: 'ATS Friendly',
        description: 'Optimized for applicant tracking systems',
        category: 'minimal',
        accentColor: '#000000', // Black
        preview: '✅'
    }
];

export const getTemplateById = (id: string): CVTemplate | undefined => {
    return cvTemplates.find(t => t.id === id);
};

export const getTemplatesByCategory = (category: CVTemplate['category']): CVTemplate[] => {
    return cvTemplates.filter(t => t.category === category);
};
