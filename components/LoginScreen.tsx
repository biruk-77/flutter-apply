
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isConfigValid } from '../firebaseConfig';
import { Button } from './ui/Button';
import { LogIn, Sparkles, AlertTriangle, ExternalLink, Copy, HelpCircle, Mail, Lock, UserPlus } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { signInWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [currentDomain, setCurrentDomain] = useState('');
  
  // Email/Pass State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    setCurrentDomain(window.location.hostname);
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoggingIn(true);
    setError(null);

    try {
      if (isRegistering) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAuthError = (err: any) => {
    console.error(err);
    let msg = err.message;

    // Friendly error messages
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
      msg = "Invalid email or password.";
    } else if (err.code === 'auth/email-already-in-use') {
      msg = "This email is already registered.";
    } else if (err.code === 'auth/weak-password') {
      msg = "Password should be at least 6 characters.";
    } else if (err.code === 'auth/user-not-found') {
      msg = "No account found with this email.";
    } else if (err.code === 'auth/invalid-email') {
      msg = "Please enter a valid email address.";
    } else if (err.code === 'auth/popup-closed-by-user') {
      msg = "Sign in was cancelled.";
    } else if (err.code === 'auth/configuration-not-found' || err.code === 'auth/api-key-not-valid' || err.code === 'auth/internal-error') {
      msg = "Firebase configuration is missing or invalid. Please check firebaseConfig.ts.";
    } else if (err.code === 'auth/unauthorized-domain') {
      // Special complex UI for unauthorized domain
      const domain = window.location.hostname;
      setError(
        <div className="flex flex-col items-start w-full text-left bg-red-50 p-4 rounded-lg border border-red-100 animate-in fade-in zoom-in-95 duration-300">
          <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5"/>
            Action Required: Authorize Domain
          </h3>
          <p className="text-sm text-slate-700 mb-4 leading-relaxed">
            Google Security blocks sign-ins from unknown websites. You must tell Firebase that this preview URL is safe.
          </p>
          
          <div className="w-full bg-white p-4 rounded-lg border-2 border-red-100 mb-4 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-br">
              STEP 1: COPY THIS
            </div>
            <div className="flex items-center gap-2 mt-2">
              <code className="flex-1 font-mono font-bold text-slate-800 text-lg break-all select-all border-b border-dashed border-slate-300 pb-0.5">
                {domain}
              </code>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(domain);
                  const btn = document.getElementById('copy-btn-text');
                  if (btn) btn.innerText = 'Copied!';
                  setTimeout(() => { if (btn) btn.innerText = 'Copy'; }, 2000);
                }}
                className="flex items-center gap-1 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm active:scale-95"
              >
                <Copy className="w-4 h-4" /> 
                <span id="copy-btn-text">Copy</span>
              </button>
            </div>
          </div>

          <div className="w-full bg-slate-50 p-4 rounded-lg border border-slate-200">
             <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">
              STEP 2: ADD TO FIREBASE
            </div>
            <ol className="list-decimal pl-4 space-y-2 text-sm text-slate-600">
              <li>
                Open <a href="https://console.firebase.google.com/project/flutter-apply/authentication/settings" target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium hover:text-blue-800 flex items-center gap-1 inline-flex">
                  Firebase Console <ExternalLink className="w-3 h-3"/>
                </a>
              </li>
              <li>Go to <strong>Authentication</strong> &gt; <strong>Settings</strong> &gt; <strong>Authorized Domains</strong> tab.</li>
              <li>Click the blue <strong>Add domain</strong> button.</li>
              <li>Paste the domain from Step 1.</li>
            </ol>
          </div>
        </div>
      );
      return; // Return early so we don't overwrite the complex error component
    }

    setError(msg);
  };

  // If configuration is still using placeholders, show the Setup Guide
  if (!isConfigValid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-amber-500 p-6 flex items-center gap-4">
             <div className="bg-white/20 p-2 rounded-lg">
                <AlertTriangle className="w-8 h-8 text-white" />
             </div>
             <div>
               <h1 className="text-xl font-bold text-white">Setup Required</h1>
               <p className="text-amber-100 text-sm">You need to connect Firebase to use this app.</p>
             </div>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="prose prose-slate text-sm">
              <p className="text-slate-600 text-base">
                The application is running, but it's missing the <strong>API Keys</strong> needed to talk to Google's servers. 
                Follow these steps to fix it:
              </p>
            </div>
             <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <h3 className="font-semibold text-slate-800">Create a Firebase Project</h3>
                  <p className="text-slate-600 text-sm mt-1">
                    Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">console.firebase.google.com <ExternalLink className="w-3 h-3"/></a> and create a new project.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <h3 className="font-semibold text-slate-800">Enable Authentication & Firestore</h3>
                  <p className="text-slate-600 text-sm mt-1">
                    In the console, go to <strong>Build</strong> menu:
                    <ul className="list-disc ml-5 mt-1 space-y-1">
                      <li><strong>Authentication:</strong> Enable "Google" and "Email/Password" providers.</li>
                      <li><strong>Firestore Database:</strong> Create database (start in Test Mode).</li>
                    </ul>
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">3</div>
                <div>
                  <h3 className="font-semibold text-slate-800">Copy Config to Code</h3>
                  <p className="text-slate-600 text-sm mt-1">
                    Go to <strong>Project Settings</strong> (gear icon) → <strong>General</strong> → <strong>Your apps</strong>. 
                    <br/>Click the <code className="bg-slate-100 px-1 rounded">&lt;/&gt;</code> icon to register a web app.
                    <br/>Copy the <code className="text-xs bg-slate-100 px-1">firebaseConfig</code> object keys and paste them into the <code className="text-blue-600 font-mono">firebaseConfig.ts</code> file in this editor.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 mt-4">
              <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">Example of what to replace in firebaseConfig.ts:</h4>
              <pre className="text-xs text-slate-700 font-mono overflow-x-auto">
{`const firebaseConfig = {
  apiKey: "AIzaSyD...", 
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  // ... other keys
};`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-blue-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-4 backdrop-blur-sm">
             <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">FlutterApply AI</h1>
          <p className="text-blue-100">Supercharge your job search with AI.</p>
        </div>
        
        <div className="p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-slate-800">
              {isRegistering ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-slate-500 mt-1">
              {isRegistering ? 'Sign up to start crafting perfect emails.' : 'Sign in to access your profile.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 text-center text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailSubmit} className="space-y-4 mb-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit"
              isLoading={isLoggingIn}
              className="w-full py-2.5"
            >
              {isRegistering ? (
                <><UserPlus className="w-4 h-4" /> Create Account</>
              ) : (
                <><LogIn className="w-4 h-4" /> Sign In</>
              )}
            </Button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-medium">Or continue with</span>
            </div>
          </div>

          <Button 
            variant="outline"
            onClick={handleGoogleLogin} 
            isLoading={isLoggingIn}
            className="w-full py-2.5 text-slate-700 mb-6"
            type="button"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" />
              <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </Button>

          <div className="text-center text-sm">
            <span className="text-slate-500">
              {isRegistering ? "Already have an account? " : "Don't have an account? "}
            </span>
            <button 
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
                setEmail('');
                setPassword('');
              }}
              className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              {isRegistering ? "Sign In" : "Sign Up"}
            </button>
          </div>

          {/* Persistent Debug Info */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
              <HelpCircle className="w-3 h-3" />
              <span>Current Preview Domain:</span>
            </div>
            <code className="block mt-1 text-center text-xs bg-slate-100 p-2 rounded text-slate-500 font-mono select-all">
              {currentDomain || 'Loading...'}
            </code>
          </div>

        </div>
      </div>
    </div>
  );
};
