import React, { useState } from 'react';
import { SchoolDatabase, Student } from '../types';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Layers,
  BookOpen,
  FilePenLine,
  FileText,
  Clock,
  UserCheck,
  BarChart3,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  School,
  ChevronRight,
  Shield,
} from 'lucide-react';

interface LayoutProps {
  db: SchoolDatabase;
  currentUser: { name: string; role: 'DIRECTEUR' | 'ENSEIGNANT'; teacherId?: string };
  currentSection: string;
  onNavigate: (section: string) => void;
  onLogout: () => void;
  onSelectStudentProfile: (student: Student) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  db,
  currentUser,
  currentSection,
  onNavigate,
  onLogout,
  onSelectStudentProfile,
  children,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const directorMenuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'students', label: 'Élèves', icon: Users },
    { id: 'teachers', label: 'Enseignants (Admin)', icon: GraduationCap },
    { id: 'classes', label: 'Classes', icon: Layers },
    { id: 'subjects', label: 'Matières & Coeffs', icon: BookOpen },
    { id: 'grades', label: 'Saisie des notes', icon: FilePenLine },
    { id: 'bulletins', label: 'Bulletins scolaires', icon: FileText },
    { id: 'attendance-students', label: 'Présences Élèves', icon: Clock },
    { id: 'attendance-teachers', label: 'Présences Professeurs', icon: UserCheck },
    { id: 'stats', label: 'Statistiques & Rapports', icon: BarChart3 },
    { id: 'audit', label: 'Journal d\'audit', icon: History },
    { id: 'settings', label: 'Paramètres généraux (Admin)', icon: Settings },
  ];

  // Strictly limited for Enseignant: ONLY grade entry and teacher signature as requested
  const teacherMenuItems = [
    { id: 'grades', label: 'Saisie de mes notes & Signatures', icon: FilePenLine },
  ];

  const menuItems = currentUser.role === 'DIRECTEUR' ? directorMenuItems : teacherMenuItems;

  // Global search filtering
  const matchingStudents = globalSearch.trim()
    ? db.students
        .filter(
          (s) =>
            s.status === 'active' &&
            (`${s.lastName} ${s.firstName}`.toLowerCase().includes(globalSearch.toLowerCase()) ||
              s.matricule.toLowerCase().includes(globalSearch.toLowerCase()))
        )
        .slice(0, 5)
    : [];

  const handleSelectSearchResult = (student: Student) => {
    setGlobalSearch('');
    setIsSearchFocused(false);
    onSelectStudentProfile(student);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800 shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Mobile hamburger & Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-hidden"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <School className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <span className="font-extrabold text-sm text-white tracking-tight block leading-none">
                  {db.settings.schoolName || 'GESTION ÉCOLE'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5 leading-none">
                  Bulletins & Présences Officiels
                </span>
              </div>
            </div>
          </div>

          {/* Center: Global Student Search Bar */}
          <div className="flex-1 max-w-md relative hidden md:block">
            <div className="relative">
              <input
                type="text"
                value={globalSearch}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Rechercher rapidement un élève, matricule..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-800/80 text-white placeholder-slate-400 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden focus:bg-slate-800"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Instant Search Results Dropdown */}
            {isSearchFocused && matchingStudents.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in-50">
                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                  Élèves trouvés ({matchingStudents.length})
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {matchingStudents.map((stu) => {
                    const cls = db.classes.find((c) => c.id === stu.classId);
                    return (
                      <div
                        key={stu.id}
                        onMouseDown={() => handleSelectSearchResult(stu)}
                        className="p-2.5 hover:bg-indigo-50 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{stu.lastName}</span>{' '}
                          <span className="text-slate-700">{stu.firstName}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {stu.matricule} · {cls?.name}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: User Profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Firestore Temps Réel</span>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-white block leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[10px] font-semibold text-indigo-400 block leading-tight">
                {currentUser.role === 'DIRECTEUR' ? 'Direction Générale' : 'Professeur'}
              </span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="p-2 text-slate-300 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Quitter</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        {/* Desktop Sidebar Navigation */}
        <aside className="w-64 shrink-0 hidden lg:block print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 sticky top-24 space-y-1">
            <div className="px-3 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Navigation Scolaire
            </div>

            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-3 border-t border-slate-100 mt-2 px-3 text-[10px] text-slate-400 space-y-1">
              <div>Année : {db.settings.activeAcademicYear}</div>
              <div>Mode : Connecté ({currentUser.role})</div>
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold pt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Base Firestore Temps Réel</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Drawer Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div
              className="bg-white w-72 h-full p-4 space-y-2 overflow-y-auto animate-in slide-in-from-left duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <School className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-sm text-slate-900">{db.settings.schoolName}</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1 pt-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onNavigate(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
};
