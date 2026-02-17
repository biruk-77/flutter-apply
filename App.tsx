
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
  Sparkles,
  ChevronLeft,
  Menu,
  LogIn
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
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (currentUser) {
        setIsLoadingProfile(true);
        try {
          const data = await getUserProfile(currentUser.uid);
          if (data) {
            setProfile(data);
          } else {
            setProfile({ ...DEFAULT_PROFILE, email: currentUser.email || '' });
          }
        } catch (e) {
          console.error("Profile load failed", e);
        } finally {
          setIsLoadingProfile(false);
        }
      } else {
        setProfile(DEFAULT_PROFILE);
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

  const renderContent = () => {
    // If user is accessing Profile but not logged in, show Login Screen
    if (activeTab === AppTab.PROFILE && !currentUser) {
      return <LoginScreen />;
    }

    switch (activeTab) {
      case AppTab.GENERATOR:
        return <GeneratorTab userProfile={profile} />;
      case AppTab.EMAIL_FINDER:
        return <EmailFinderTab userProfile={profile} />;
      case AppTab.PROFILE:
        return <ProfileTab initialProfile={profile} onSave={handleSaveProfile} />;
      default:
        return <GeneratorTab userProfile={profile} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-20 shadow-sm`}>
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
          {currentUser ? (
            <button 
              onClick={() => logout()}
              className="w-full flex items-center gap-3 p-3 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all group"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span className={`font-medium transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
                Logout
              </span>
            </button>
          ) : (
            <button 
              onClick={() => setActiveTab(AppTab.PROFILE)}
              className="w-full flex items-center gap-3 p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-all group"
            >
              <LogIn className="w-5 h-5 shrink-0" />
              <span className={`font-medium transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
                Sign In
              </span>
            </button>
          )}
          
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
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
          <h2 className="text-lg font-bold text-slate-800">
            {navItems.find(n => n.id === activeTab)?.label}
          </h2>
          <div className="flex items-center gap-3">
             {currentUser ? (
               <>
                <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-slate-900">{profile.name || 'Set Name'}</p>
                    <p className="text-[10px] text-slate-400">{currentUser?.email}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                    {(profile.name || currentUser?.email || 'U').charAt(0)}
                </div>
               </>
             ) : (
               <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-pulse"></span>
                  Guest Mode
               </div>
             )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-50/30">
          <div className="max-w-7xl mx-auto h-full">
            {isLoadingProfile ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
};

export default App;
