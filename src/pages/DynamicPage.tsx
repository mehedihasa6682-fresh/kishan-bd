import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Layout, Clock, Globe, ArrowLeft, Shield } from 'lucide-react';
import { Helmet, HelmetProvider } from 'react-helmet-async';

export default function DynamicPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [page, setPage] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPage = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'pages'), where('slug', '==', slug), where('isVisible', '==', true));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    setPage({ id: snap.docs[0].id, ...snap.docs[0].data() });
                } else {
                    setPage(null);
                }
            } catch (e) {
                console.error("Error fetching page:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchPage();
        window.scrollTo(0, 0);
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050E21] flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Shield size={20} className="text-primary animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    if (!page) {
        return (
            <div className="min-h-screen bg-[#050E21] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10 shadow-2xl">
                    <Layout size={40} className="text-white/20" />
                </div>
                <h2 className="text-2xl font-display font-black text-white uppercase tracking-widest mb-4">Node Not Found</h2>
                <p className="text-white/40 text-sm max-w-xs mb-8">The requested data fragment does not exist or has been decommissioned from the matrix.</p>
                <button 
                    onClick={() => navigate('/')}
                    className="px-8 py-4 bg-white/5 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] border border-white/10 hover:bg-white/10 transition-all flex items-center gap-3"
                >
                    <ArrowLeft size={16} /> Return to Home
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050E21] pb-20">
            <Helmet>
                <title>{page.seoTitle || page.title}</title>
                <meta name="description" content={page.seoDescription} />
                <meta name="keywords" content={page.seoKeywords} />
            </Helmet>

            {/* Header / Hero */}
            <div className="relative pt-32 pb-20 px-8 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-primary/10 to-transparent blur-[100px] pointer-events-none" />
                <div className="max-w-4xl mx-auto relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full mb-6"
                    >
                        <Globe size={12} className="text-primary" />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Institutional Node</span>
                    </motion.div>
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-white uppercase tracking-tight mb-8"
                    >
                        {page.title}
                    </motion.h1>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center justify-center gap-6 text-white/40"
                    >
                        <div className="flex items-center gap-2">
                            <Clock size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Updated: {page.updatedAt?.toDate ? page.updatedAt.toDate().toLocaleDateString() : 'Recent'}</span>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-8 relative">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="p-12 md:p-20 bg-white/5 border border-white/10 rounded-[4rem] backdrop-blur-3xl shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-[100px] pointer-events-none" />
                    
                    <div className="markdown-body prose prose-invert prose-gold prose-lg max-w-none">
                        <ReactMarkdown>
                            {page.content}
                        </ReactMarkdown>
                    </div>
                </motion.div>

                {/* Back Link */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-12 text-center"
                >
                    <button 
                        onClick={() => navigate(-1)}
                        className="text-[11px] font-black text-white/20 uppercase tracking-[0.4em] hover:text-primary transition-colors flex items-center justify-center gap-4 mx-auto group"
                    >
                        <div className="w-10 h-[1px] bg-white/10 group-hover:bg-primary/40 transition-all" />
                        End of Transmission
                        <div className="w-10 h-[1px] bg-white/10 group-hover:bg-primary/40 transition-all" />
                    </button>
                </motion.div>
            </div>
            
            <style>{`
                .markdown-body {
                    color: rgba(255, 255, 255, 0.7);
                    line-height: 1.8;
                }
                .markdown-body h1, .markdown-body h2, .markdown-body h3 {
                    color: white;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: -0.02em;
                    margin-top: 2em;
                    margin-bottom: 1em;
                }
                .markdown-body p {
                    margin-bottom: 1.5em;
                }
                .markdown-body ul, .markdown-body ol {
                    margin-bottom: 1.5em;
                    list-style-position: inside;
                }
                .markdown-body li {
                    margin-bottom: 0.5em;
                }
                .markdown-body a {
                    color: #D4AF37;
                    text-decoration: underline;
                    text-underline-offset: 4px;
                }
                .prose-gold ::marker {
                    color: #D4AF37;
                }
            `}</style>
        </div>
    );
}
