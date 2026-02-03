
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppTab, UserProfile } from './types';
import { getUserProfile, saveUserProfile } from './services/dbService';
import { GeneratorTab } from './components/GeneratorTab';
import { EmailFinderTab } from './components/EmailFinderTab';
import { ProfileTab } from './components/ProfileTab';
import { LoginScreen } from './components/LoginScreen';
import { 
  Briefcase, 
  Search, 
  User, 
  LogOut, 
  LayoutDashboard, 
  Sparkles,
  ChevronLeft,
  Menu
} from 'lucide-react';

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  email: '',
  yearsExperience: '',
  skills: 'Dart, Flutter, Firebase',
  portfolioUrl: '',
  bio: '',
  linkedinUrl: ''
};

const Dashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.GENERATOR);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (currentUser) {
        setIsLoadingProfile(true);
        const data = await getUserProfile(currentUser.uid);
        if (data) {
          setProfile(data);
        } else {
          // Initialize with default if nothing found
          setProfile({ ...DEFAULT_PROFILE, email: currentUser.email || '' });
        }
        setIsLoadingProfile(false);
      }
    };
    loadProfile();
  }, [currentUser]);

  const handleSaveProfile = async (newProfile: UserProfile) => {
    if (currentUser) {
      await saveUserProfile(currentUser.uid, newProfile);
      setProfile(newProfile);
    }
  };

  const navItems = [
    { id: AppTab.GENERATOR, label: 'Job Generator', icon: Briefcase },
    { id: AppTab.EMAIL_FINDER, label: 'Email Finder', icon: Search },
    { id: AppTab.PROFILE, label: 'My Profile', icon: User },
  ];

  if (isLoadingProfile) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-20`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
            <Sparkles className="w-6 h-6 text-blue-600 shrink-0" />
            <h1 className="font-bold text-xl tracking-tight whitespace-nowrap">Flutter<span className="text-blue-600">Apply</span></h1>
          </div>
          {!isSidebarOpen && <Sparkles className="w-6 h-6 text-blue-600 mx-auto" />}
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
              title={item.label}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${activeTab === item.id ? 'text-white' : 'group-hover:text-blue-600'}`} />
              <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={() => logout()}
            className="w-full flex items-center gap-3 p-3 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all group"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className={`font-medium transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
              Logout
            </span>
          </button>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="mt-4 w-full flex items-center justify-center p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
          >
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">
            {navItems.find(n => n.id === activeTab)?.label}
          </h2>
          <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900">{profile.name || 'Set Name'}</p>
                <p className="text-[10px] text-slate-400">{currentUser?.email}</p>
             </div>
             <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 font-bold text-xs">
                {(profile.name || currentUser?.email || 'U').charAt(0).toUpperCase()}
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto h-full">
            {activeTab === AppTab.GENERATOR && <GeneratorTab userProfile={profile} />}
            {activeTab === AppTab.EMAIL_FINDER && <EmailFinderTab userProfile={profile} />}
            {activeTab === AppTab.PROFILE && <ProfileTab initialProfile={profile} onSave={handleSaveProfile} />}
          </div>
        </div>
      </main>
    </div>
  );
};

const AuthWrapper: React.FC = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return currentUser ? <Dashboard /> : <LoginScreen />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
};

export default App;
