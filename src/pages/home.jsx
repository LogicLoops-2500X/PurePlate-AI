import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Camera,
    Search,
    AlertCircle,
    CheckCircle,
    ShieldCheck,
    Info,
    User,
    Trash2,
    Activity,
    HeartPulse,
    Stethoscope,
    ChevronRight,
    AlertTriangle,
    Zap,
    Clock,
    History as HistoryIcon
} from 'lucide-react';


// Configuration
// Change v1beta to v1 for better stability with Flash models
// const API_KEY = process.env.API_KEY; 
const API_KEY = "AIzaSyAJItgR5UcD2xmETGn6_tiXvGseJscR5gw";
const MODEL_NAME = "gemini-1.5-flash"; // No 'models/' prefix here
const API_URL = "https://generativelanguage.googleapis.com/v1beta";
const ALLERGY_OPTIONS = [
    "Gluten", "Peanuts", "Dairy", "Soy", "Shellfish", "Tree Nuts", "Eggs", "Corn"
];

const Home = () => {
    const [view, setView] = useState('scan');
    const [allergies, setAllergies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [analysisData, setAnalysisData] = useState(null);
    const [history, setHistory] = useState([]);
    const [imagePreview, setImagePreview] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const fileInputRef = useRef(null);

    // --- AI LOGIC WITH STRUCTURED JSON ---

    const performAIAnalysis = async (content, isImage = false) => {
        setLoading(true);
        setAnalysisData(null);

        const systemPrompt = `You are PurePlate AI, a professional food safety analyzer. 
    Analyze the provided food ingredients and return a JSON response.
    
    The user has the following allergies: ${allergies.join(", ") || "None"}.

    Return exactly this JSON structure:
    {
      "productName": "Common name of product or chemical",
      "verdict": "Safe" | "Caution" | "Avoid",
      "summary": "One sentence friendly summary of the product.",
      "composition": {
        "safe": percentage_number,
        "questionable": percentage_number,
        "harmful": percentage_number
      },
      "ingredients": [
        { "name": "string", "risk": "Low" | "Medium" | "High", "impact": "Simple explanation of side effects" }
      ],
      "allergyAlerts": ["List of any detected allergens from the user's list"]
    }

    Rules:
    - Use friendly, simple language.
    - Be strict about chemicals like Red 40, Aspartame, High Fructose Corn Syrup.
    - If it's a single chemical search, still provide the composition percentages for that chemical's general health profile.`;

        try {
            const payload = {
                contents: [{
                    parts: [{
                        text: isImage
                            ? "Analyze this food label. Return a JSON object with: verdict, score (0-100), ingredients (list), and analysis."
                            : `Analyze this ingredient and return JSON: ${content}`
                    },
                    ...(isImage ? [{
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: content.split(',')[1]
                        }
                    }] : [])]
                }]
            };

            // Change v1beta to v1
            const response = await fetch(`${API_URL}/models/${MODEL_NAME}:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            // If you see this in the browser console, the API worked!
            console.log("Response Data:", data);

            if (data.error) throw new Error(data.error.message);

            const result = JSON.parse(data.candidates[0].content.parts[0].text);
            setAnalysisData(result);
            setHistory(prev => [{ ...result, id: Date.now(), timestamp: new Date().toLocaleString() }, ...prev]);
        } catch (err) {
            console.error("Critical Error:", err.message);
            alert("API Error: " + err.message); // This will pop up on your screen to tell you what's wrong
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
                performAIAnalysis(reader.result, true);
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleAllergy = (allergy) => {
        setAllergies(prev =>
            prev.includes(allergy) ? prev.filter(a => a !== allergy) : [...prev, allergy]
        );
    };

    const openHistoryItem = (item) => {
        setAnalysisData(item);
        setImagePreview(item.image);
        setView('scan');
    };

    const clearHistory = () => {
        setHistory([]);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-2 text-emerald-600">
                    <ShieldCheck size={28} strokeWidth={2.5} />
                    <h1 className="text-xl font-black tracking-tight uppercase">PurePlate</h1>
                </div>
                <div className="flex items-center space-x-2 text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase">
                    <Activity size={14} className="text-emerald-500 animate-pulse" />
                    <span>Live Analysis</span>
                </div>
            </header>

            <main className="max-w-xl mx-auto p-4 md:p-6">
                {view === 'scan' && (
                    <div className="space-y-6">
                        {/* Search Input */}
                        <div className="relative group">
                            <Search className="absolute left-4 top-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Search a chemical or ingredient..."
                                className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 shadow-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-lg"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && performAIAnalysis(searchQuery)}
                            />
                        </div>

                        {/* Action Area */}
                        {!analysisData && !loading && (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-[4/3] bg-white border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center space-y-4 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group overflow-hidden relative"
                            >
                                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform z-10">
                                    <Camera size={40} />
                                </div>
                                <div className="text-center px-6 z-10">
                                    <p className="font-bold text-xl text-slate-800 tracking-tight">Tap to Scan Label</p>
                                    <p className="text-sm text-slate-500 mt-1">Take a clear photo of the ingredients</p>
                                </div>
                                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                            </div>
                        )}

                        {/* Loading */}
                        {loading && (
                            <div className="bg-white rounded-[2rem] p-12 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
                                <div className="relative">
                                    <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                                    <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500 fill-emerald-500" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">PurePlate is thinking...</h2>
                                    <p className="text-sm text-slate-500 mt-2">Decoding complex chemical structures</p>
                                </div>
                            </div>
                        )}

                        {/* Result Visual Dashboard */}
                        {analysisData && !analysisData.error && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Visual Chart Card */}
                                <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-lg">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Composition Analysis</h2>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <VerdictBadge verdict={analysisData.verdict} />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setAnalysisData(null); setImagePreview(null); }}
                                            className="p-2 bg-slate-100 text-slate-400 hover:text-rose-500 rounded-full transition-colors"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-center gap-8">
                                        {/* Donut Chart */}
                                        <div className="relative w-40 h-40 shrink-0">
                                            <DonutChart data={analysisData.composition} />
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                                <span className="text-3xl font-black text-slate-800 leading-none">
                                                    {analysisData.composition.safe}%
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Safe</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-4">
                                            <p className="text-lg font-medium leading-tight text-slate-700">
                                                {analysisData.summary}
                                            </p>
                                            <div className="flex flex-wrap gap-3">
                                                <LegendItem label="Safe" color="bg-emerald-500" value={analysisData.composition.safe} />
                                                <LegendItem label="Questionable" color="bg-amber-400" value={analysisData.composition.questionable} />
                                                <LegendItem label="Harmful" color="bg-rose-500" value={analysisData.composition.harmful} />
                                            </div>
                                        </div>
                                    </div>

                                    {analysisData.allergyAlerts?.length > 0 && (
                                        <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start space-x-3">
                                            <AlertTriangle className="text-rose-500 shrink-0" size={20} />
                                            <div>
                                                <p className="text-sm font-bold text-rose-800 uppercase tracking-wider">Allergy Warning</p>
                                                <p className="text-sm text-rose-700 mt-0.5">Detected: {analysisData.allergyAlerts.join(", ")}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Ingredient Breakdowns */}
                                <div className="space-y-3">
                                    <h3 className="px-2 text-sm font-bold text-slate-500 uppercase tracking-widest">Ingredient Breakdown</h3>
                                    {analysisData.ingredients.map((ing, idx) => (
                                        <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-start space-x-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ing.risk === 'High' ? 'bg-rose-100 text-rose-600' :
                                                ing.risk === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                                                }`}>
                                                {ing.risk === 'High' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2">
                                                    <h4 className="font-bold text-slate-800">{ing.name}</h4>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${ing.risk === 'High' ? 'bg-rose-100 text-rose-700' :
                                                        ing.risk === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                                        }`}>{ing.risk} Risk</span>
                                                </div>
                                                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{ing.impact}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => { setAnalysisData(null); setImagePreview(null); }}
                                    className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98]"
                                >
                                    Scan Another Product
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {view === 'history' && (
                    <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Recent Scans</h2>
                            {history.length > 0 && (
                                <button
                                    onClick={clearHistory}
                                    className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center space-x-1 uppercase tracking-widest"
                                >
                                    <Trash2 size={14} />
                                    <span>Clear All</span>
                                </button>
                            )}
                        </div>

                        {history.length === 0 ? (
                            <div className="bg-white rounded-[2rem] p-12 border border-slate-200 text-center space-y-4">
                                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                                    <Clock size={32} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">No scan history yet</p>
                                    <p className="text-sm text-slate-500">Your analyzed products will appear here.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => openHistoryItem(item)}
                                        className="w-full bg-white p-4 rounded-2xl border border-slate-200 flex items-center space-x-4 hover:border-emerald-500 hover:shadow-md transition-all text-left group"
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.verdict === 'Safe' ? 'bg-emerald-100 text-emerald-600' :
                                            item.verdict === 'Caution' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                                            }`}>
                                            <VerdictBadge verdict={item.verdict} compact />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-slate-800 truncate pr-4">{item.productName || "Analyzed Product"}</h4>
                                                <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{item.timestamp.split(',')[0]}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 truncate mt-0.5">{item.summary}</p>
                                        </div>
                                        <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {view === 'profile' && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm text-center">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800">My Allergy Guard</h2>
                            <p className="text-slate-500 mt-2">Select any ingredients PurePlate should watch out for. We'll alert you instantly during scans.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {ALLERGY_OPTIONS.map(allergy => (
                                <button
                                    key={allergy}
                                    onClick={() => toggleAllergy(allergy)}
                                    className={`flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all ${allergies.includes(allergy)
                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-md shadow-emerald-500/10'
                                        : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    <span className="font-bold">{allergy}</span>
                                    {allergies.includes(allergy) && <CheckCircle size={20} className="fill-emerald-500 text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 px-8 py-4 flex items-center justify-around z-30">
                <NavButton active={view === 'scan'} onClick={() => setView('scan')} icon={<Camera />} label="Scan" />
                <NavButton active={view === 'history'} onClick={() => setView('history')} icon={<HistoryIcon />} label="History" />
                <NavButton active={view === 'profile'} onClick={() => setView('profile')} icon={<AlertCircle />} label="Allergies" />
            </nav>
        </div>
    );
};

// --- SUBCOMPONENTS ---

const DonutChart = ({ data }) => {
    const total = data.safe + data.questionable + data.harmful;
    const safePercent = (data.safe / total) * 100;
    const questPercent = (data.questionable / total) * 100;
    const harmfulPercent = (data.harmful / total) * 100;

    const radius = 35;
    const circumference = 2 * Math.PI * radius;

    const safeDash = (safePercent / 100) * circumference;
    const questDash = (questPercent / 100) * circumference;
    const harmfulDash = (harmfulPercent / 100) * circumference;

    return (
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
            <circle
                cx="50" cy="50" r={radius} fill="transparent" stroke="#10b981" strokeWidth="12"
                strokeDasharray={`${safeDash} ${circumference}`}
                strokeLinecap="round"
            />
            <circle
                cx="50" cy="50" r={radius} fill="transparent" stroke="#fbbf24" strokeWidth="12"
                strokeDasharray={`${questDash} ${circumference}`}
                strokeDashoffset={-safeDash}
            />
            <circle
                cx="50" cy="50" r={radius} fill="transparent" stroke="#f43f5e" strokeWidth="12"
                strokeDasharray={`${harmfulDash} ${circumference}`}
                strokeDashoffset={-(safeDash + questDash)}
            />
        </svg>
    );
};

const VerdictBadge = ({ verdict, compact = false }) => {
    const styles = {
        Safe: "bg-emerald-500 text-white",
        Caution: "bg-amber-400 text-white",
        Avoid: "bg-rose-500 text-white"
    };

    if (compact) {
        return <Zap size={20} className="fill-current" />;
    }

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${styles[verdict]}`}>
            {verdict}
        </span>
    );
};

const LegendItem = ({ label, color, value }) => (
    <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-xs font-bold text-slate-500">{label}: {value}%</span>
    </div>
);

const NavButton = ({ active, onClick, icon, label, disabled = false }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex flex-col items-center space-y-1 transition-all ${active ? 'text-emerald-600' : 'text-slate-400'
            } ${disabled ? 'opacity-20' : ''}`}
    >
        {React.cloneElement(icon, { size: 24, strokeWidth: active ? 3 : 2 })}
        <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
    </button>
);

export default Home;