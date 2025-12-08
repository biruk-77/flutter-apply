
import React, { useState, useEffect } from 'react';
import { UserProfile, AppTab } from './types';
import { ProfileTab } from './components/ProfileTab';
import { GeneratorTab } from './components/GeneratorTab';
import { EmailFinderTab } from './components/EmailFinderTab';
import { LoginScreen } from './components/LoginScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { getUserProfile, saveUserProfile } from './services/dbService';
import { Layout, PenTool, UserCircle, Search, LogOut } from 'lucide-react';

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  email: '',
  yearsExperience: '',
  skills: '',
  portfolioUrl: '',
  bio: '',
  linkedinUrl: ''
};

// Internal component to handle authenticated logic
const Dashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.GENERATOR);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Load profile from Firestore when user logs in
  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      try {
        const profile = await getUserProfile(currentUser.uid);
        if (profile) {
          setUserProfile(profile);
        } else {
          // Initialize with email if new
          setUserProfile(prev => ({ ...prev, email: currentUser.email || '' }));
        }
      } catch (e) {
        console.error("Failed to fetch profile", e);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

  const handleSaveProfile = async (profile: UserProfile) => {
    if (!currentUser) return;
    setUserProfile(profile);
    // Save to Firestore
    await saveUserProfile(currentUser.uid, profile);
  };

  const hasProfileName = userProfile.name && userProfile.name.length > 0;

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-blue-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden sm:block">Flutter<span className="text-blue-600">Apply</span> AI</h1>
          </div>

          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab(AppTab.GENERATOR)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === AppTab.GENERATOR
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span className="hidden sm:inline">Write Email</span>
            </button>
            <button
              onClick={() => setActiveTab(AppTab.EMAIL_FINDER)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === AppTab.EMAIL_FINDER
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Find Emails</span>
            </button>
            <button
              onClick={() => setActiveTab(AppTab.PROFILE)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === AppTab.PROFILE
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
              {!hasProfileName && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Sign Out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Warning if no profile */}
        {activeTab === AppTab.GENERATOR && !hasProfileName && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-full text-amber-600">
                <UserCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-amber-900">Your profile is empty</p>
                <p className="text-sm text-amber-700">Set up your profile to generate personalized emails.</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab(AppTab.PROFILE)}
              className="px-4 py-2 bg-white border border-amber-300 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors"
            >
              Go to Profile
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="animate-in fade-in duration-300 slide-in-from-bottom-2 h-full">
          {activeTab === AppTab.GENERATOR && <GeneratorTab userProfile={userProfile} />}
          {activeTab === AppTab.EMAIL_FINDER && <EmailFinderTab userProfile={userProfile} />}
          {activeTab === AppTab.PROFILE && <ProfileTab initialProfile={userProfile} onSave={handleSaveProfile} />}
        </div>

      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} FlutterApply AI. Powered by Google Gemini & Firebase.</p>
        </div>
      </footer>
    </div>
  );
};

// Root App that switches between Login and Dashboard
const App: React.FC = () => {
  const { currentUser } = useAuth();
  return currentUser ? <Dashboard /> : <LoginScreen />;
};

// Wrap App in Provider
export default () => (
  <AuthProvider>
    <App />
  </AuthProvider>
);
