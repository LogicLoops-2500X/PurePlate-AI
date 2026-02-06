import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  AlertCircle, 
  CheckCircle, 
  ShieldCheck, 
  User, 
  Trash2, 
  Activity,
  HeartPulse,
  ChevronRight,
  AlertTriangle,
  Zap,
  Clock,
  History as HistoryIcon,
  Share2,
  Leaf,
  Scale,
  Utensils,
  TrendingUp,
  LayoutGrid,
  Sparkles,
  ArrowRight
} from 'lucide-react';

// Configuration
// --- Configuration (Top of file) ---
const API_KEYS = [
  import.meta.env.VITE_GEMINI_API_KEY_1,
  import.meta.env.VITE_GEMINI_API_KEY_2,
  import.meta.env.VITE_GEMINI_API_KEY_3
].filter(key => key); // This removes any empty/undefined keys automatically
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";

const ALLERGY_OPTIONS = [
  "Gluten", "Peanuts", "Dairy", "Soy", "Shellfish", "Tree Nuts", "Eggs", "Corn"
];

const App = () => {
  const [view, setView] = useState('home'); // home, search, history, wellness
  const [allergies, setAllergies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeResultTab, setActiveResultTab] = useState('safety');

  // BMI State
  const [bmiData, setBmiData] = useState({
    weight: "",
    height: "",
    result: null,
    category: ""
  });

  // Greeting Logic
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  // --- BMI CALCULATION ---
  const calculateBMI = () => {
    if (!bmiData.weight || !bmiData.height) return;
    const h = parseFloat(bmiData.height) / 100;
    const w = parseFloat(bmiData.weight);
    const bmi = (w / (h * h)).toFixed(1);
    
    let cat = "";
    if (bmi < 18.5) cat = "Underweight";
    else if (bmi < 25) cat = "Normal weight";
    else if (bmi < 30) cat = "Overweight";
    else cat = "Obese";

    setBmiData({ ...bmiData, result: bmi, category: cat });
  };
// --- AI LOGIC (FINAL HACKATHON VERSION) ---
  const performAIAnalysis = async (query) => {
    if (!query.trim()) return;

    // 1. CACHE CHECK: Search history first to save API quota for the judges
    const cached = history.find(item => 
      item.productName.toLowerCase().includes(query.toLowerCase())
    );

    if (cached) {
      setAnalysisData(cached);
      setView('search');
      return; 
    }
    
    setLoading(true);
    setAnalysisData(null);
    setActiveResultTab('safety');
    setView('search');

    // 2. KEY ROTATION: Picks a random key from your list
    const activeKey = API_KEYS[Math.floor(Math.random() * API_KEYS.length)];

    // 3. THE PROMPT: This is what makes the AI act as an expert
    const systemPrompt = `You are PurePlate AI, an advanced food toxicity and nutritional analyzer. 
    Analyze: "${query}".
    
    Context:
    - Allergies: ${allergies.join(", ") || "None"}.
    - BMI: ${bmiData.result || "Unknown"} (${bmiData.category || "N/A"}).

    Return exactly this JSON structure:
    {
      "productName": "Name",
      "healthScore": 0-100,
      "verdict": "Safe" | "Caution" | "Avoid",
      "summary": "1-sentence personalized summary based on user BMI and allergies.",
      "composition": { "safe": 0, "questionable": 0, "harmful": 0 },
      "nutrition": { "calories": 0, "protein": 0, "carbs": 0, "fats": 0, "sugar": 0 },
      "ingredients": [{ 
        "name": "s", 
        "risk": "Low"|"Medium"|"High", 
        "impact": "Brief scientific impact", 
        "tags": ["Vegan", "Preservative", etc], 
        "alternative": "Healthier swap" 
      }],
      "allergyAlerts": []
    }`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${activeKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Analyze the food item: ${query}` }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.2 // Keeps results consistent
          }
        })
      });

      const data = await response.json();
      
      // 4. DATA EXTRACTION
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!rawText) {
        throw new Error(data.error?.message || "Quota Reached");
      }

      const parsed = JSON.parse(rawText);
      
      // 5. UPDATE STATE & HISTORY
      const historyItem = { ...parsed, id: Date.now(), timestamp: new Date().toLocaleString() };
      setHistory(prev => [historyItem, ...prev]);
      setAnalysisData(parsed);
      setSearchQuery("");
      
    } catch (error) {
      console.error("Analysis Error:", error);
      setAnalysisData({ 
        error: "Quota limit reached. Please check the Vault for previous scans.",
        productName: "Connection Error",
        summary: "The AI is currently resting. Try searching for a previously scanned item!",
        healthScore: 0,
        verdict: "Caution",
        composition: { safe: 0, questionable: 0, harmful: 0 },
        nutrition: { calories: 0, protein: 0, carbs: 0, fats: 0 },
        ingredients: []
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAllergy = (allergy) => {
    setAllergies(prev => prev.includes(allergy) ? prev.filter(a => a !== allergy) : [...prev, allergy]);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-28">
      {/* Dynamic Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2 text-indigo-600" onClick={() => setView('home')}>
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
            <ShieldCheck size={20} strokeWidth={3} />
          </div>
          <h1 className="text-xl font-black tracking-tight uppercase">PurePlate</h1>
        </div>
        <div className="flex items-center space-x-2">
          {bmiData.result && (
            <div className="hidden sm:flex bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
              BMI: {bmiData.result}
            </div>
          )}
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <User size={18} />
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 md:p-6">
        {/* --- HOME DASHBOARD VIEW --- */}
        {view === 'home' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Hero Section */}
            <section className="pt-4">
              <div className="flex items-center space-x-2 text-indigo-500 mb-1">
                <Sparkles size={16} />
                <span className="text-xs font-black uppercase tracking-widest">{greeting}</span>
              </div>
              <h2 className="text-3xl font-black text-slate-800 leading-tight">
                Ready for your <br /> next meal?
              </h2>
            </section>

            {/* Quick Search Hub */}
            <section className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Analyze any meal or chemical..."
                  className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-5 pl-12 pr-4 shadow-xl shadow-slate-200/50 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && performAIAnalysis(searchQuery)}
                />
                <button 
                  onClick={() => performAIAnalysis(searchQuery)}
                  className="absolute right-3 top-3 bottom-3 px-5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all"
                >
                  Go
                </button>
              </div>
              <div className="flex flex-wrap gap-2 px-1">
                {['Double Cheeseburger', 'Energy Drink', 'Instant Noodles', 'Diet Soda'].map(tag => (
                  <button 
                    key={tag}
                    onClick={() => performAIAnalysis(tag)}
                    className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </section>

            {/* Dashboard Grid */}
            <section className="grid grid-cols-2 gap-4">
              {/* Wellness Widget */}
              <div 
                onClick={() => setView('wellness')}
                className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Scale size={20} />
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Wellness</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                  {bmiData.result ? `BMI: ${bmiData.result}` : "Setup BMI"}
                </p>
                <div className="mt-3 flex items-center text-indigo-600 text-[10px] font-black uppercase">
                  <span>Manage</span>
                  <ArrowRight size={12} className="ml-1" />
                </div>
              </div>

              {/* Allergy Widget */}
              <div 
                onClick={() => setView('wellness')}
                className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-rose-600 group-hover:text-white transition-all">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Guard</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                  {allergies.length} Active Alerts
                </p>
                <div className="mt-3 flex items-center text-rose-600 text-[10px] font-black uppercase">
                  <span>Configure</span>
                  <ArrowRight size={12} className="ml-1" />
                </div>
              </div>

              {/* History Widget */}
              <div 
                onClick={() => setView('history')}
                className="col-span-2 bg-indigo-600 p-6 rounded-[2rem] text-white shadow-lg shadow-indigo-200 relative overflow-hidden group cursor-pointer"
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight">The Vault</h3>
                    <p className="text-indigo-100 text-xs font-medium opacity-80">
                      {history.length > 0 ? `Resume analysis of ${history[0].productName}` : "Your recent food scans will appear here."}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform">
                    <HistoryIcon size={24} />
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
              </div>
            </section>

            {/* Informational Footer */}
            <section className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 flex items-start space-x-4">
              <div className="bg-emerald-600 text-white p-2 rounded-xl">
                <Leaf size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest">Health Tip</h4>
                <p className="text-sm text-emerald-700 font-medium mt-1 leading-relaxed">
                  Avoid foods containing <b>Red 40</b> or <b>Titanium Dioxide</b>. These additives are often linked to inflammation.
                </p>
              </div>
            </section>
          </div>
        )}

        {/* --- SEARCH RESULT VIEW --- */}
        {view === 'search' && (
          <div className="space-y-6">
            <button 
              onClick={() => setView('home')}
              className="flex items-center space-x-2 text-slate-400 hover:text-indigo-600 transition-colors font-black uppercase text-[10px] tracking-widest"
            >
              <ArrowRight size={14} className="rotate-180" />
              <span>Back to Home</span>
            </button>

            {loading && <LoadingState />}

            {analysisData && !analysisData.error && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <VerdictBadge verdict={analysisData.verdict} />
                      <span className="text-xl font-black text-slate-800 truncate max-w-[150px]">{analysisData.productName}</span>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <TabBtn active={activeResultTab === 'safety'} onClick={() => setActiveResultTab('safety')} label="Safety" />
                      <TabBtn active={activeResultTab === 'nutrition'} onClick={() => setActiveResultTab('nutrition')} label="Nutrition" />
                    </div>
                  </div>

                  {activeResultTab === 'safety' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className="relative w-44 h-44 mx-auto shrink-0">
                        <DonutChart data={analysisData.composition} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-5xl font-black text-slate-800 leading-none">{analysisData.healthScore}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Safety Score</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border-l-4 border-indigo-500">
                          <p className="text-sm font-bold text-slate-700 italic leading-snug">"{analysisData.summary}"</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <LegendItem label="Safe" color="bg-emerald-500" val={analysisData.composition.safe} />
                          <LegendItem label="Caution" color="bg-amber-400" val={analysisData.composition.questionable} />
                          <LegendItem label="Avoid" color="bg-rose-500" val={analysisData.composition.harmful} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className="relative w-44 h-44 mx-auto shrink-0">
                        <MacroChart data={analysisData.nutrition} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-3xl font-black text-slate-800 leading-none">{analysisData.nutrition.calories}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">kcal</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <MacroBar label="Protein" val={analysisData.nutrition.protein} color="bg-indigo-500" max={100} unit="g" />
                        <MacroBar label="Carbs" val={analysisData.nutrition.carbs} color="bg-amber-400" max={150} unit="g" />
                        <MacroBar label="Fats" val={analysisData.nutrition.fats} color="bg-rose-500" max={100} unit="g" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="px-4 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Scientific Insights</h3>
                  {analysisData.ingredients.map((ing, idx) => (
                    <IngredientCard key={idx} ingredient={ing} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- WELLNESS VIEW --- */}
        {view === 'wellness' && (
          <div className="space-y-6 animate-in slide-in-from-right-6 duration-300">
            <div className="flex items-center space-x-2 text-slate-400 hover:text-indigo-600 transition-colors font-black uppercase text-[10px] tracking-widest" onClick={() => setView('home')}>
              <ArrowRight size={14} className="rotate-180" />
              <span>Dashboard</span>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                  <Scale className="text-indigo-400" size={32} />
                  <h2 className="text-2xl font-black uppercase tracking-tight">BMI Intelligence</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Weight (kg)</label>
                    <input type="number" className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-white placeholder-slate-600" value={bmiData.weight} onChange={(e) => setBmiData({...bmiData, weight: e.target.value})} placeholder="70" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Height (cm)</label>
                    <input type="number" className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-white placeholder-slate-600" value={bmiData.height} onChange={(e) => setBmiData({...bmiData, height: e.target.value})} placeholder="175" />
                  </div>
                </div>
                <button onClick={calculateBMI} className="w-full mt-6 bg-indigo-600 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">Update Stats</button>
              </div>
            </div>

            {bmiData.result && (
              <div className="bg-white rounded-[2rem] p-6 border border-slate-200 text-center shadow-lg">
                <div className="flex justify-around items-center mb-4">
                  <div>
                    <p className="text-4xl font-black text-slate-800">{bmiData.result}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current BMI</p>
                  </div>
                  <div className="h-12 w-px bg-slate-100" />
                  <div>
                    <p className="text-lg font-black text-indigo-600 uppercase tracking-tight">{bmiData.category}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classification</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-sm">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Biological Guard</h3>
              <div className="grid grid-cols-2 gap-3">
                {ALLERGY_OPTIONS.map(allergy => (
                  <button key={allergy} onClick={() => toggleAllergy(allergy)} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${allergies.includes(allergy) ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-sm' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}>
                    <span className="font-bold text-xs uppercase">{allergy}</span>
                    {allergies.includes(allergy) && <CheckCircle size={16} className="text-rose-600" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- HISTORY VIEW --- */}
        {view === 'history' && (
          <div className="space-y-4 animate-in slide-in-from-left-6 duration-300">
             <div className="flex items-center justify-between px-2 mb-2 pt-4">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Vault</h2>
              <button onClick={() => setHistory([])} className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Purge All</button>
            </div>
            {history.length === 0 ? (
              <div className="bg-white rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-200">
                <HistoryIcon className="mx-auto text-slate-200 mb-4" size={48} />
                <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">No History Yet</p>
              </div>
            ) : (
              history.map(item => (
                <button key={item.id} onClick={() => { setAnalysisData(item); setView('search'); }} className="w-full bg-white p-5 rounded-[1.5rem] border border-slate-200 flex items-center justify-between hover:border-indigo-500 transition-all shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${item.healthScore > 70 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {item.healthScore}
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-800">{item.productName}</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{item.timestamp.split(',')[0]}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300" />
                </button>
              ))
            )}
          </div>
        )}
      </main>

      {/* Modern Bottom Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-sm bg-slate-900 rounded-[2.5rem] px-8 py-5 flex items-center justify-around z-30 shadow-2xl border border-white/10">
        <NavBtn active={view === 'home' || (view === 'search' && !analysisData)} onClick={() => setView('home')} icon={<LayoutGrid />} />
        <NavBtn active={view === 'history'} onClick={() => setView('history')} icon={<HistoryIcon />} />
        <NavBtn active={view === 'wellness'} onClick={() => setView('wellness')} icon={<User />} />
      </nav>
    </div>
  );
};

// --- SUBCOMPONENTS ---

const LoadingState = () => (
  <div className="bg-white rounded-[2rem] p-12 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
    <div className="relative">
      <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
      <HeartPulse className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500" size={24} />
    </div>
    <div className="space-y-1">
      <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest animate-pulse">Analyzing...</h2>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cross-referencing databases</p>
    </div>
  </div>
);

const IngredientCard = ({ ingredient: ing }) => (
  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${ing.risk === 'High' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
          {ing.risk === 'High' ? <AlertCircle size={22} /> : <Leaf size={22} />}
        </div>
        <div>
          <h4 className="font-black text-slate-800 text-sm">{ing.name}</h4>
          <div className="flex flex-wrap gap-1 mt-1">
            {ing.tags?.map(tag => (
              <span key={tag} className="text-[8px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">{tag}</span>
            ))}
          </div>
        </div>
      </div>
      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${ing.risk === 'High' ? 'bg-rose-600 text-white' : 'bg-emerald-500 text-white'}`}>{ing.risk}</span>
    </div>
    <p className="text-xs text-slate-600 leading-relaxed mb-4 font-medium">{ing.impact}</p>
    {ing.alternative && (
      <div className="bg-emerald-50 p-3 rounded-2xl flex items-center space-x-3 border border-emerald-100">
        <CheckCircle size={14} className="text-emerald-600" />
        <p className="text-[10px] text-emerald-800 font-black uppercase tracking-tight leading-none">Best Alternative: <span className="underline">{ing.alternative}</span></p>
      </div>
    )}
  </div>
);

const DonutChart = ({ data }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const safe = (data.safe / 100) * circumference;
  const quest = (data.questionable / 100) * circumference;
  const harm = (data.harmful / 100) * circumference;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
      <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#f8fafc" strokeWidth="10" />
      <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#10b981" strokeWidth="10" strokeDasharray={`${safe} ${circumference}`} strokeLinecap="round" />
      <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#fbbf24" strokeWidth="10" strokeDasharray={`${quest} ${circumference}`} strokeDashoffset={-safe} />
      <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#f43f5e" strokeWidth="10" strokeDasharray={`${harm} ${circumference}`} strokeDashoffset={-(safe + quest)} />
    </svg>
  );
};

const MacroChart = ({ data }) => {
  const total = data.protein + data.carbs + data.fats;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
      <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#f8fafc" strokeWidth="10" />
      <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#6366f1" strokeWidth="10" strokeDasharray={`${(data.protein / total) * circumference} ${circumference}`} strokeLinecap="round" />
      <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#fbbf24" strokeWidth="10" strokeDasharray={`${(data.carbs / total) * circumference} ${circumference}`} strokeDashoffset={-((data.protein / total) * circumference)} />
      <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#f43f5e" strokeWidth="10" strokeDasharray={`${(data.fats / total) * circumference} ${circumference}`} strokeDashoffset={-(((data.protein + data.carbs) / total) * circumference)} />
    </svg>
  );
};

const MacroBar = ({ label, val, color, max, unit }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
      <span>{label}</span>
      <span>{val}{unit}</span>
    </div>
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${Math.min((val/max)*100, 100)}%` }} />
    </div>
  </div>
);

const VerdictBadge = ({ verdict }) => {
  const color = verdict === 'Safe' ? 'bg-emerald-500' : verdict === 'Caution' ? 'bg-amber-400' : 'bg-rose-500';
  return <div className={`w-3 h-3 rounded-full ${color} animate-pulse shadow-lg shadow-current`} />;
};

const LegendItem = ({ label, color, val }) => (
  <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
    <div className={`w-1.5 h-1.5 mx-auto rounded-full mb-1 ${color}`} />
    <p className="text-[8px] font-black text-slate-400 uppercase leading-none">{label}</p>
    <p className="text-[10px] font-black text-slate-700">{val}%</p>
  </div>
);

const NavBtn = ({ active, onClick, icon }) => (
  <button onClick={onClick} className={`transition-all duration-300 ${active ? 'text-indigo-400 scale-125' : 'text-slate-500 hover:text-white'}`}>
    {React.cloneElement(icon, { size: 24, strokeWidth: active ? 3 : 2 })}
  </button>
);

const TabBtn = ({ active, onClick, label }) => (
  <button onClick={onClick} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${active ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
    {label}
  </button>
);

export default App;
