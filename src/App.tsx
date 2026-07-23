import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, startOfWeek, addWeeks, subWeeks, eachDayOfInterval, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { motion, useSpring, useTransform } from 'framer-motion';
import { Drawer } from 'vaul';
import { Settings, ChevronLeft, ChevronRight, Share, Trash2, Calendar, TrendingUp, Award, Moon, Sun, Download, Plus, BookOpen, ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

// --- Types ---
interface DayData {
  income: string;
  expense: string;
  note: string;
}
type WeekData = Record<string, DayData>;
type AppData = Record<string, WeekData>;

interface KhataPage {
  id: string;
  name: string;
  text: string;
  createdAt: number;
}

// --- Hooks ---
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}

// --- Components ---
const AnimatedNumber = ({ value, formatter }: { value: number; formatter: (v: number) => string }) => {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => formatter(Math.round(current)));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
};

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

const currencySymbols: Record<string, string> = { PKR: "₨", USD: "$", AED: "د.إ" };

const generateId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// --- Main App ---
export default function App() {
  const [data, setData] = useLocalStorage<AppData>('weekly_profit_v2', {});
  const [goal, setGoal] = useLocalStorage<number>('weeklyGoal', 5000);
  const [currency, setCurrency] = useLocalStorage<string>('currency', 'USD');
  const [darkMode, setDarkMode] = useLocalStorage<boolean>('darkMode', false);
  
  const [currentDate, setCurrentDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [drawerType, setDrawerType] = useState<'menu' | 'chart' | 'compare' | null>(null);
  
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(goal.toString());
  const [copied, setCopied] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const [view, setView] = useState<'weekly' | 'monthly'>('weekly');
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));

  const [showNotebook, setShowNotebook] = useState(false);
  const [khataPages, setKhataPages] = useLocalStorage<KhataPage[]>('khata_pages', []);
  const [activeKhataId, setActiveKhataId] = useState<string | null>(null);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [draftText, setDraftText] = useState('');

  const openKhataList = () => {
    vibrate(10);
    setActiveKhataId(null);
    setShowNotebook(true);
  };

  const closeNotebook = () => {
    vibrate(10);
    setShowNotebook(false);
    setActiveKhataId(null);
    setShowNameDialog(false);
  };

  const startNewKhata = () => {
    vibrate(10);
    setNameInput('');
    setShowNameDialog(true);
  };

  const confirmNewKhataName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    const newPage: KhataPage = { id: generateId(), name: trimmed, text: '', createdAt: Date.now() };
    setKhataPages((prev) => [...prev, newPage]);
    setActiveKhataId(newPage.id);
    setDraftText('');
    setShowNameDialog(false);
    vibrate(10);
  };

  const openKhataPage = (page: KhataPage) => {
    vibrate(10);
    setDraftText(page.text);
    setActiveKhataId(page.id);
  };

  const backToKhataList = () => {
    vibrate(10);
    setActiveKhataId(null);
  };

  const saveKhataPage = () => {
    if (!activeKhataId) return;
    vibrate(15);
    setKhataPages((prev) => prev.map((p) => (p.id === activeKhataId ? { ...p, text: draftText } : p)));
    setActiveKhataId(null);
  };

  useEffect(() => {
    if (showNotebook) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showNotebook]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choice: any) => {
        if (choice.outcome === 'accepted') setInstallPrompt(null);
      });
    }
  };

  const weekKey = format(currentDate, 'yyyy-MM-dd');

  const weekDays = useMemo(() => {
    const end = new Date(currentDate);
    end.setDate(end.getDate() + 6);
    return eachDayOfInterval({ start: currentDate, end });
  }, [currentDate]);

  const updateDay = (dateStr: string, field: keyof DayData, value: string) => {
    setData((prev: AppData) => {
      const next = { ...prev };
      if (!next[weekKey]) next[weekKey] = {};
      if (!next[weekKey][dateStr]) next[weekKey][dateStr] = { income: '', expense: '', note: '' };
      next[weekKey][dateStr][field] = value;
      return next;
    });
  };

  // Calculations
  const weekData = data[weekKey] || {};
  let weekIncome = 0;
  let weekExpense = 0;
  Object.values(weekData).forEach((d: DayData) => {
    weekIncome += Number(d.income) || 0;
    weekExpense += Number(d.expense) || 0;
  });
  const weekProfit = weekIncome - weekExpense;

  const isWeekEmpty = weekIncome === 0 && weekExpense === 0 && weekDays.every(d => !data[weekKey]?.[format(d, 'yyyy-MM-dd')]?.note);

  const getStreak = useCallback(() => {
    let streak = 0;
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    
    for (let i = 0; i < 104; i++) {
      const d = subWeeks(start, i);
      const k = format(d, 'yyyy-MM-dd');
      const wD = data[k] || {};
      let inc = 0; let exp = 0;
      Object.values(wD).forEach((day: any) => {
        inc += Number(day.income) || 0;
        exp += Number(day.expense) || 0;
      });
      const p = inc - exp;
      const hasData = Object.keys(wD).length > 0;
      
      if (i === 0) {
        if (p > 0) streak++;
        else if (hasData) return 0;
      } else {
        if (!hasData && streak === 0) continue;
        if (!hasData) break;
        if (p > 0) streak++;
        else break;
      }
    }
    return streak;
  }, [data]);

  const streak = getStreak();

  const formatC = (val: number) => `${currencySymbols[currency] || currency} ${val.toLocaleString('en-US')}`;
  const formatProfit = (val: number) => `${val >= 0 ? '+' : ''}${val.toLocaleString('en-US')}`;

  // Monthly calculations
  const monthlyData = useMemo(() => {
    const firstDay = startOfMonth(currentMonth);
    const lastDay = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: firstDay, end: lastDay });

    let totalIncome = 0;
    let totalExpense = 0;
    let profitDays = 0;
    let lossDays = 0;

    const weekMap: Record<string, { income: number; expense: number; weekStart: Date }> = {};

    days.forEach(day => {
      const weekStart = startOfWeek(day, { weekStartsOn: 1 });
      const weekK = format(weekStart, 'yyyy-MM-dd');
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayData = data[weekK]?.[dateStr];
      const inc = Number(dayData?.income) || 0;
      const exp = Number(dayData?.expense) || 0;
      const dayProfit = inc - exp;

      totalIncome += inc;
      totalExpense += exp;

      if (inc > 0 || exp > 0) {
        if (dayProfit >= 0) profitDays++;
        else lossDays++;
      }

      if (!weekMap[weekK]) weekMap[weekK] = { income: 0, expense: 0, weekStart };
      weekMap[weekK].income += inc;
      weekMap[weekK].expense += exp;
    });

    const weeks = Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, w]) => ({
        key,
        weekStart: w.weekStart,
        income: w.income,
        expense: w.expense,
        profit: w.income - w.expense,
      }));

    return { totalIncome, totalExpense, totalProfit: totalIncome - totalExpense, profitDays, lossDays, weeks };
  }, [currentMonth, data]);

  // Nav Handlers
  const handlePrevWeek = () => { vibrate(10); setCurrentDate(prev => subWeeks(prev, 1)); };
  const handleNextWeek = () => { vibrate(10); setCurrentDate(prev => addWeeks(prev, 1)); };
  const handleToday = () => { vibrate(10); setCurrentDate(startOfWeek(new Date(), { weekStartsOn: 1 })); };

  // Swipe Handlers
  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) handleNextWeek();
    else if (distance < -minSwipeDistance) handlePrevWeek();
  };

  const copySummary = () => {
    vibrate(10);
    let text = `Week of ${format(currentDate, 'MMM d, yyyy')}\n`;
    text += `Income: ${formatC(weekIncome)}\n`;
    text += `Expense: ${formatC(weekExpense)}\n`;
    text += `Net Profit: ${formatProfit(weekProfit)}\n\n`;
    
    weekDays.forEach(day => {
      const dStr = format(day, 'yyyy-MM-dd');
      const dData = data[weekKey]?.[dStr];
      if (dData && (Number(dData.income) > 0 || Number(dData.expense) > 0 || dData.note)) {
        text += `${format(day, 'EEE')}: `;
        if (Number(dData.income) > 0) text += `+${Number(dData.income)} `;
        if (Number(dData.expense) > 0) text += `-${Number(dData.expense)} `;
        if (dData.note) text += `(${dData.note})`;
        text += '\n';
      }
    });
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearWeek = () => {
    if (window.confirm("Are you sure you want to clear all data for this week?")) {
      vibrate([10, 50, 10]);
      setData((prev: AppData) => {
        const next = { ...prev };
        delete next[weekKey];
        return next;
      });
      setDrawerType(null);
    }
  };

  const MenuContent = () => (
    <div className="space-y-6 pb-6">
      <h2 className="text-xl font-bold px-1">Settings & Actions</h2>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
          <div className="flex items-center gap-3">
            {darkMode ? <Moon size={20} className="text-primary" /> : <Sun size={20} className="text-primary" />}
            <span className="font-medium text-foreground">Dark Mode</span>
          </div>
          <button 
            onClick={() => { vibrate(10); setDarkMode(!darkMode); }}
            className={`w-12 h-6 rounded-full p-1 transition-colors relative ${darkMode ? 'bg-primary' : 'bg-muted-foreground'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${darkMode ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        <div className="p-4 bg-muted/30 rounded-xl space-y-3">
          <div className="text-sm font-medium text-muted-foreground">Currency Symbol</div>
          <div className="flex bg-muted/50 p-1 rounded-lg">
            {['PKR', 'USD', 'AED'].map(c => (
              <button 
                key={c}
                onClick={() => { vibrate(10); setCurrency(c); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${currency === c ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setDrawerType('chart')} className="p-4 bg-muted/30 rounded-xl flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors active:scale-[0.98]">
          <TrendingUp size={24} className="text-primary" />
          <span className="text-sm font-medium">Weekly Chart</span>
        </button>
        <button onClick={() => setDrawerType('compare')} className="p-4 bg-muted/30 rounded-xl flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors active:scale-[0.98]">
          <Calendar size={24} className="text-primary" />
          <span className="text-sm font-medium">4-Week Compare</span>
        </button>
      </div>

      <div className="space-y-3 pt-2">
        <button onClick={copySummary} data-testid="button-copy-summary" className="w-full py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform">
          <Share size={18} />
          {copied ? "Copied!" : "Copy Summary"}
        </button>

        {installPrompt && (
          <button onClick={handleInstall} data-testid="button-install-pwa" className="w-full py-3.5 bg-card border border-primary/20 text-primary font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform">
            <Download size={18} />
            Install App
          </button>
        )}

        <button onClick={handleClearWeek} data-testid="button-clear-week" className="w-full py-3.5 text-destructive font-semibold flex items-center justify-center gap-2 bg-destructive/10 rounded-xl active:scale-[0.98] transition-transform">
          <Trash2 size={18} />
          Clear Current Week
        </button>
      </div>
    </div>
  );

  const ChartContent = () => {
    const chartData = weekDays.map(date => {
      const ds = format(date, 'yyyy-MM-dd');
      const d = data[weekKey]?.[ds] || {};
      const inc = Number(d.income) || 0;
      const exp = Number(d.expense) || 0;
      return {
        name: format(date, 'EEE'),
        Income: inc,
        Expense: exp,
        Profit: inc - exp
      };
    });

    return (
      <div className="space-y-6 pb-6">
        <div>
          <h2 className="text-xl font-bold px-1">Weekly Chart</h2>
          <p className="text-sm text-muted-foreground px-1 mt-1">{format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d, yyyy')}</p>
        </div>
        <div className="h-[300px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val === 0 ? '0' : val >= 1000 ? `${val/1000}k` : val} />
              <Tooltip 
                cursor={{ fill: 'hsl(var(--muted)/0.4)' }} 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, fontSize: '14px' }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Bar dataKey="Income" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expense" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Profit" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const CompareContent = () => {
    const compareData = [0, 1, 2, 3].map(i => {
      const d = subWeeks(currentDate, i);
      const k = format(d, 'yyyy-MM-dd');
      let inc = 0;
      let exp = 0;
      const wD = data[k] || {};
      Object.values(wD).forEach((day: any) => {
        inc += Number(day.income) || 0;
        exp += Number(day.expense) || 0;
      });
      return {
        weekStart: d,
        key: k,
        income: inc,
        expense: exp,
        profit: inc - exp
      };
    });

    const bestProfit = Math.max(...compareData.map(d => d.profit));

    return (
      <div className="space-y-6 pb-6">
        <div>
          <h2 className="text-xl font-bold px-1">4-Week Comparison</h2>
          <p className="text-sm text-muted-foreground px-1 mt-1">Recent performance</p>
        </div>
        
        <div className="space-y-3">
          {compareData.map((w, i) => {
            const isBest = w.profit === bestProfit && w.profit > 0;
            const isCurrent = i === 0;
            const weekEnd = new Date(w.weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            return (
              <div key={w.key} className={`p-4 rounded-xl border flex flex-col gap-3 ${isCurrent ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {format(w.weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
                    </span>
                    {isCurrent && <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Current</span>}
                  </div>
                  {isBest && <Award size={18} className="text-amber-500" />}
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">In</span>
                    <span className="text-sm font-medium">{formatC(w.income)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Out</span>
                    <span className="text-sm font-medium">{formatC(w.expense)}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Net</span>
                    <span className={`text-sm font-bold ${w.profit < 0 ? 'text-destructive' : 'text-[hsl(var(--profit-pos))]'}`}>
                      {formatProfit(w.profit)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Monthly View Component
  const MonthlyView = () => {
    const sym = currencySymbols[currency] || currency;
    const fmtAbs = (v: number) => `${sym} ${Math.abs(v).toLocaleString('en-US')}`;
    const isCurrentMonth = format(currentMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM');
    const currentWeekKey = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const chartData = monthlyData.weeks.map(w => {
      const weekEnd = new Date(w.weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return {
        name: format(w.weekStart, 'MMM d'),
        Income: w.income,
        Expense: w.expense,
        Profit: w.profit,
      };
    });

    const maxBar = Math.max(...monthlyData.weeks.map(w => Math.max(w.income, w.expense)), 1);
    const hasData = monthlyData.totalIncome > 0 || monthlyData.totalExpense > 0;

    return (
      <div className="flex-1 overflow-y-auto pb-[100px]">
        {/* Month Navigator */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-border bg-card">
          <button
            onClick={() => { vibrate(10); setCurrentMonth(m => subMonths(m, 1)); }}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted active:bg-muted transition-colors"
          >
            <ChevronLeft size={20} className="text-foreground" />
          </button>
          <button
            onClick={() => { vibrate(10); setCurrentMonth(startOfMonth(new Date())); }}
            className="text-[13px] font-bold tracking-wide uppercase px-4 py-1.5 bg-muted/50 rounded-full text-foreground/80 hover:text-foreground hover:bg-muted/80 transition-colors flex items-center gap-2"
          >
            {format(currentMonth, 'MMMM yyyy')}
            {isCurrentMonth && <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />}
          </button>
          <button
            onClick={() => { vibrate(10); setCurrentMonth(m => addMonths(m, 1)); }}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted active:bg-muted transition-colors"
          >
            <ChevronRight size={20} className="text-foreground" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="px-4 pt-4 pb-3 grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-3 flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-widest font-bold text-emerald-600 dark:text-emerald-400">Income</span>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300 leading-tight">{fmtAbs(monthlyData.totalIncome)}</span>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-3 flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-widest font-bold text-red-500 dark:text-red-400">Expense</span>
            <span className="text-sm font-bold text-red-600 dark:text-red-300 leading-tight">{fmtAbs(monthlyData.totalExpense)}</span>
          </div>
          <div className={`${monthlyData.totalProfit >= 0 ? 'bg-primary/10' : 'bg-destructive/10'} rounded-2xl p-3 flex flex-col gap-1`}>
            <span className={`text-[9px] uppercase tracking-widest font-bold ${monthlyData.totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>Net</span>
            <span className={`text-sm font-bold leading-tight ${monthlyData.totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {monthlyData.totalProfit >= 0 ? '+' : ''}{monthlyData.totalProfit.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        {/* Profit / Loss day pills */}
        <div className="px-4 pb-4 flex gap-2 flex-wrap">
          <span className="text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full">
            ✓ {monthlyData.profitDays} profit days
          </span>
          <span className="text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1 rounded-full">
            ✗ {monthlyData.lossDays} loss days
          </span>
        </div>

        {/* Empty state */}
        {!hasData && (
          <div className="mx-4 my-2 p-8 rounded-xl border border-dashed border-border bg-muted/20 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground shadow-inner">
              <Calendar size={22} />
            </div>
            <div>
              <p className="text-[15px] font-bold text-foreground">کوئی ڈیٹا نہیں</p>
              <p className="text-sm text-muted-foreground mt-1">اس مہینے کا ابھی تک کوئی ریکارڈ نہیں ہے۔</p>
            </div>
          </div>
        )}

        {/* Chart */}
        {hasData && chartData.length > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-bold mb-4 text-foreground">Weekly Breakdown — Chart</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, fontSize: '12px' }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" />
                    <Bar dataKey="Income" fill="hsl(var(--chart-1))" radius={[3,3,0,0]} />
                    <Bar dataKey="Expense" fill="hsl(var(--chart-2))" radius={[3,3,0,0]} />
                    <Bar dataKey="Profit" fill="hsl(var(--chart-3))" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Week-by-week table */}
        {hasData && (
          <div className="px-4 pb-6 space-y-2">
            <h3 className="text-sm font-bold text-foreground mb-3">ہفتہ وار تفصیل</h3>
            {monthlyData.weeks.map(w => {
              const weekEnd = new Date(w.weekStart);
              weekEnd.setDate(weekEnd.getDate() + 6);
              const isCurrentW = format(w.weekStart, 'yyyy-MM-dd') === currentWeekKey;
              const incWidth = maxBar > 0 ? (w.income / maxBar) * 100 : 0;

              return (
                <div
                  key={w.key}
                  className={`rounded-2xl border p-4 cursor-pointer active:scale-[0.99] transition-all ${
                    isCurrentW ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/20'
                  }`}
                  onClick={() => {
                    vibrate(10);
                    setCurrentDate(w.weekStart);
                    setView('weekly');
                  }}
                >
                  {/* Header row */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">
                        {format(w.weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
                      </span>
                      {isCurrentW && (
                        <span className="text-[9px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Current
                        </span>
                      )}
                    </div>
                    <span className={`text-base font-bold ${w.profit < 0 ? 'text-destructive' : 'text-[hsl(var(--profit-pos))]'}`}>
                      {w.profit >= 0 ? '+' : ''}{w.profit.toLocaleString('en-US')}
                    </span>
                  </div>

                  {/* Income / Expense row */}
                  <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Income</span>
                      <span className="font-semibold text-foreground">{fmtAbs(w.income)}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Expense</span>
                      <span className="font-semibold text-foreground">{fmtAbs(w.expense)}</span>
                    </div>
                  </div>

                  {/* Mini bar */}
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${w.profit >= 0 ? 'bg-[hsl(var(--chart-1))]' : 'bg-destructive'}`}
                      style={{ width: `${incWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] w-full bg-muted/20 flex justify-center pb-[100px]">
      <div className="w-full max-w-[520px] bg-card min-h-[100dvh] sm:border-x border-border flex flex-col relative shadow-2xl shadow-black/5">
        
        {/* Header */}
        <div className="px-4 pt-4 sm:pt-5 pb-3 flex flex-col gap-3 bg-card sticky top-0 z-20 border-b border-border shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Profit <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{currency}</span>
              </h1>
              {streak > 1 && (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                  🔥 {streak}-week streak
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={openKhataList}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted active:bg-muted transition-colors"
                data-testid="button-notebook"
              >
                <BookOpen size={20} className="text-secondary-foreground" />
              </button>
              <button 
                onClick={() => { vibrate(10); setDrawerType('menu'); }}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted active:bg-muted transition-colors"
                data-testid="button-menu"
              >
                <Settings size={20} className="text-secondary-foreground" />
              </button>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex bg-muted/50 p-1 rounded-xl">
            <button
              onClick={() => { vibrate(10); setView('weekly'); }}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${view === 'weekly' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Weekly
            </button>
            <button
              onClick={() => { vibrate(10); setView('monthly'); }}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${view === 'monthly' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* === MONTHLY VIEW === */}
        {view === 'monthly' && <MonthlyView />}

        {/* === WEEKLY VIEW === */}
        {view === 'weekly' && <>
        {/* Week Nav */}
        <div className="px-4 py-3 flex items-center justify-between bg-card border-b border-border relative z-10">
          <button onClick={handlePrevWeek} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted active:bg-muted transition-colors" data-testid="button-prev-week">
            <ChevronLeft size={20} className="text-foreground" />
          </button>
          
          <div className="flex-1 flex justify-center items-center cursor-pointer" onClick={handleToday} data-testid="button-today">
            <span className="text-[13px] font-bold tracking-wide uppercase px-4 py-1.5 bg-muted/50 rounded-full text-foreground/80 hover:text-foreground hover:bg-muted/80 transition-colors">
              Week • {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'd')}
            </span>
          </div>

          <button onClick={handleNextWeek} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted active:bg-muted transition-colors" data-testid="button-next-week">
            <ChevronRight size={20} className="text-foreground" />
          </button>
        </div>

        {/* Goal Progress */}
        <div className="px-4 py-3 bg-card border-b border-border z-10 relative">
          <div className="flex justify-between items-end mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Weekly Target</span>
              {isEditingGoal ? (
                <div className="flex items-center gap-1">
                  <input 
                    type="number" 
                    value={tempGoal} 
                    onChange={e => setTempGoal(e.target.value)} 
                    className="w-20 px-2 py-0.5 text-sm bg-muted rounded outline-none no-arrows text-foreground font-medium"
                    autoFocus
                  />
                  <button 
                    onClick={() => { setGoal(Number(tempGoal) || 0); setIsEditingGoal(false); }}
                    className="text-[11px] uppercase tracking-wider bg-primary text-primary-foreground px-2 py-1 rounded font-bold"
                  >
                    Set
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => { setTempGoal(goal.toString()); setIsEditingGoal(true); }}
                  className="text-sm text-primary font-bold border-b border-primary/30 border-dashed pb-0.5"
                >
                  {formatC(goal)}
                </button>
              )}
            </div>
            <span className="text-xs font-bold text-muted-foreground">
              {goal > 0 ? `${Math.min(100, Math.round((weekProfit / goal) * 100))}%` : '0%'}
            </span>
          </div>
          
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden relative">
            <motion.div 
              className={`absolute left-0 top-0 bottom-0 ${weekProfit >= goal && goal > 0 ? 'bg-amber-400' : 'bg-primary'}`}
              initial={{ width: 0 }}
              animate={{ width: `${goal > 0 ? Math.min(100, Math.max(0, (weekProfit / goal) * 100)) : 0}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          {weekProfit >= goal && goal > 0 && (
            <p className="text-[10px] text-amber-500 font-bold mt-2 uppercase tracking-widest animate-pulse">
              Goal Achieved!
            </p>
          )}
        </div>

        {/* Grid Container */}
        <div 
          className="flex-1 flex flex-col touch-pan-y bg-card"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEndHandler}
        >
          {isWeekEmpty && (
            <div className="mx-4 my-6 p-6 rounded-xl border border-dashed border-border bg-muted/20 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground shadow-inner">
                <Plus size={24} />
              </div>
              <div>
                <p className="text-[15px] font-bold text-foreground">A fresh new week</p>
                <p className="text-sm text-muted-foreground mt-1 font-medium">Start entering today's numbers to build your profit.</p>
              </div>
            </div>
          )}

          {!isWeekEmpty && (
            <div className="flex items-center px-4 py-2 border-b border-border bg-muted/20">
              <div className="w-10 shrink-0"></div>
              <div className="flex-1 grid grid-cols-2 gap-2 text-right pr-2">
                <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Income</span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Expense</span>
              </div>
              <div className="w-20 sm:w-24 shrink-0 text-right pr-1">
                <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Profit</span>
              </div>
            </div>
          )}

          {weekDays.map(dayDate => {
            const dateStr = format(dayDate, 'yyyy-MM-dd');
            const dayData = data[weekKey]?.[dateStr] || { income: '', expense: '', note: '' };
            const incNum = Number(dayData.income) || 0;
            const expNum = Number(dayData.expense) || 0;
            const profit = incNum - expNum;
            const isLoss = profit < 0;
            const isToday = format(dayDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

            const tags = (dayData.note.match(/#[a-zA-Z0-9_]+/g) || []);

            return (
              <div 
                key={dateStr}
                className={`p-3 sm:p-4 border-b border-border transition-colors ${
                  isLoss ? 'border-l-[3px] border-l-destructive bg-destructive/[0.03]' : 'border-l-[3px] border-l-transparent hover:bg-muted/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 shrink-0 flex flex-col items-center pt-1.5">
                    <span className={`text-xs font-bold tracking-wider ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                      {format(dayDate, 'EEE').toUpperCase()}
                    </span>
                    <span className={`text-[10px] mt-0.5 ${isToday ? 'text-primary/80 font-bold' : 'text-muted-foreground/60 font-medium'}`}>
                      {format(dayDate, 'dd')}
                    </span>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-2 gap-2 text-right pr-2">
                    <input
                      type="number"
                      value={dayData.income}
                      onChange={(e) => updateDay(dateStr, 'income', e.target.value)}
                      className="w-full bg-muted/60 border border-border rounded-xl text-left outline-none text-[15px] sm:text-base font-bold text-foreground focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all no-arrows px-3 py-2 placeholder:text-muted-foreground/50"
                      placeholder="0"
                      dir="ltr"
                      data-testid={`input-income-${dateStr}`}
                    />
                    <input
                      type="number"
                      value={dayData.expense}
                      onChange={(e) => updateDay(dateStr, 'expense', e.target.value)}
                      className="w-full bg-muted/60 border border-border rounded-xl text-left outline-none text-[15px] sm:text-base font-bold text-foreground focus:border-destructive focus:bg-background focus:ring-2 focus:ring-destructive/20 transition-all no-arrows px-3 py-2 placeholder:text-muted-foreground/50"
                      placeholder="0"
                      data-testid={`input-expense-${dateStr}`}
                    />
                  </div>

                  <div className="w-20 sm:w-24 shrink-0 flex justify-end items-center pt-2.5 pr-1">
                    {profit !== 0 ? (
                      <span className={`text-sm font-bold tracking-tight ${isLoss ? 'text-destructive' : 'text-[hsl(var(--profit-pos))]'}`}>
                        {formatProfit(profit)}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground/30">—</span>
                    )}
                  </div>
                </div>

                <div className="pl-[3.25rem] mt-1">
                  <input
                    type="text"
                    value={dayData.note}
                    onChange={(e) => updateDay(dateStr, 'note', e.target.value)}
                    className="w-full bg-transparent outline-none text-sm text-foreground/80 font-medium placeholder:text-muted-foreground/40 py-1"
                    placeholder="Notes & #tags..."
                    data-testid={`input-note-${dateStr}`}
                  />
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {tags.map((t, i) => (
                        <span key={i} className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full tracking-wide">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </>}
      </div>

      {/* Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 pointer-events-none z-30 flex justify-center">
        <div className="w-full max-w-[520px] pointer-events-auto">
          <div className="bg-gradient-to-r from-[hsl(var(--summary-start))] to-[hsl(var(--summary-end))] rounded-2xl p-4 sm:p-5 shadow-2xl text-white/90 flex justify-between items-center relative overflow-hidden backdrop-blur-md">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-0.5">Income</span>
              <span className="text-sm sm:text-base font-bold tracking-wide">
                <AnimatedNumber value={weekIncome} formatter={formatC} />
              </span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-0.5">Expense</span>
              <span className="text-sm sm:text-base font-bold tracking-wide">
                <AnimatedNumber value={weekExpense} formatter={formatC} />
              </span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 mb-0.5">Net Profit</span>
              <span className="text-lg sm:text-xl font-black text-white tracking-tight">
                <AnimatedNumber value={weekProfit} formatter={formatC} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sheet Modal */}
      <Drawer.Root open={!!drawerType} onOpenChange={(v) => !v && setDrawerType(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity" />
          <Drawer.Content className="bg-card flex flex-col rounded-t-[1.5rem] mt-24 fixed bottom-0 left-0 right-0 z-50 max-h-[92vh] shadow-2xl">
            <div className="p-5 flex-1 overflow-y-auto w-full max-w-[520px] mx-auto pb-safe">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mb-6" />
              {drawerType === 'menu' && <MenuContent />}
              {drawerType === 'chart' && <ChartContent />}
              {drawerType === 'compare' && <CompareContent />}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Khata Notebook */}
      {showNotebook && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          transition={{ type: 'tween', duration: 0.28, ease: 'easeOut' }}
          className="fixed inset-0 z-50 bg-card flex justify-center"
          style={{ fontFamily: "'Lateef', serif" }}
        >
          <div className="w-full max-w-[520px] flex flex-col h-full relative">
            {activeKhataId === null ? (
              <>
                <div className="px-4 pt-4 sm:pt-5 pb-3 flex items-center gap-3 bg-card border-b border-border shadow-sm shrink-0">
                  <button
                    onClick={closeNotebook}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted active:bg-muted transition-colors shrink-0"
                    data-testid="button-close-notebook"
                  >
                    <ArrowLeft size={20} className="text-foreground" />
                  </button>
                  <h2 className="text-lg font-bold text-foreground flex-1">کھاتہ کتاب</h2>
                  <button
                    onClick={startNewKhata}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:opacity-90 active:opacity-80 transition-opacity shrink-0"
                    data-testid="button-new-khata"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {khataPages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-16">
                      <BookOpen size={36} className="text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">ابھی کوئی کھاتا موجود نہیں</p>
                      <p className="text-xs text-muted-foreground/70">نیا کھاتا بنانے کے لیے اوپر + دبائیں</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {khataPages.map((page) => (
                        <button
                          key={page.id}
                          onClick={() => openKhataPage(page)}
                          className="w-full text-right px-4 py-3.5 rounded-2xl border border-border bg-background hover:bg-muted active:bg-muted transition-colors flex items-center justify-between gap-3"
                          data-testid={`button-khata-${page.id}`}
                        >
                          <span className="font-semibold text-foreground">{page.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{format(new Date(page.createdAt), 'd MMM')}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (() => {
              const activePage = khataPages.find((p) => p.id === activeKhataId);
              return (
                <>
                  <div className="px-4 pt-4 sm:pt-5 pb-3 flex items-center gap-3 bg-card border-b border-border shadow-sm shrink-0">
                    <button
                      onClick={backToKhataList}
                      className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted active:bg-muted transition-colors shrink-0"
                      data-testid="button-back-khata-list"
                    >
                      <ArrowLeft size={20} className="text-foreground" />
                    </button>
                    <h2 className="text-lg font-bold text-foreground flex-1 truncate">{activePage?.name}</h2>
                    <button
                      onClick={saveKhataPage}
                      className="px-4 h-10 rounded-full flex items-center justify-center bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:opacity-80 transition-opacity shrink-0"
                      data-testid="button-save-khata"
                    >
                      محفوظ کریں
                    </button>
                  </div>

                  <div
                    className="flex-1 relative overflow-hidden"
                    style={{
                      backgroundColor: 'hsl(var(--paper-bg))',
                      backgroundImage: `linear-gradient(to bottom, transparent 39px, hsl(var(--paper-margin)) 39px, hsl(var(--paper-margin)) 40.5px, transparent 40.5px), linear-gradient(to left, hsl(var(--paper-bg)), hsl(var(--paper-bg)) 47px, hsl(var(--paper-margin)) 47px, hsl(var(--paper-margin) / 0.6) 48.5px, hsl(var(--paper-bg)) 48.5px), repeating-linear-gradient(to bottom, transparent, transparent 31px, hsl(var(--paper-line)) 31px, hsl(var(--paper-line)) 32px)`,
                      backgroundSize: '100% 100%, 100% calc(100% - 41px), 100% calc(100% - 41px)',
                      backgroundPosition: '0 0, 0 41px, 0 41px',
                      backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
                    }}
                  >
                    <textarea
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      dir="rtl"
                      autoFocus
                      placeholder="یہاں حساب کتاب لکھیں..."
                      className="w-full h-full resize-none outline-none bg-transparent text-foreground placeholder:text-muted-foreground/50"
                      style={{
                        lineHeight: '32px',
                        fontSize: '19px',
                        paddingTop: '47px',
                        paddingRight: '60px',
                        paddingLeft: '16px',
                      }}
                      data-testid="textarea-khata"
                    />
                  </div>
                </>
              );
            })()}

            {showNameDialog && (
              <div
                className="absolute inset-0 z-10 bg-black/40 flex items-center justify-center px-6"
                onClick={() => setShowNameDialog(false)}
              >
                <div
                  className="w-full max-w-[360px] bg-card rounded-2xl border border-border shadow-lg p-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-base font-bold text-foreground mb-3">کھاتے والے کا نام</h3>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmNewKhataName(); }}
                    dir="rtl"
                    autoFocus
                    placeholder="نام لکھیں"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground outline-none focus:border-primary transition-colors mb-4"
                    data-testid="input-khata-name"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowNameDialog(false)}
                      className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors"
                      data-testid="button-cancel-khata-name"
                    >
                      منسوخ
                    </button>
                    <button
                      onClick={confirmNewKhataName}
                      disabled={!nameInput.trim()}
                      className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
                      data-testid="button-confirm-khata-name"
                    >
                      اگلا
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
