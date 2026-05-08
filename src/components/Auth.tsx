import { useState, FormEvent } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Store, ShieldCheck, Github, Chrome, ArrowRight, UserPlus, LogIn, MapPin, Phone } from 'lucide-react';

import { AuthContext } from '../App';
import { useSettings } from '../context/SettingsContext';

export default function Auth() {
  const { settings } = useSettings();
  const [isLogin, setIsLogin] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [role, setRole] = useState<'customer' | 'seller' | 'rider'>('customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg('Reset link sent to your email! Please check your inbox.');
      setTimeout(() => setIsResetting(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: role === 'seller' ? storeName : (role === 'rider' ? `Rider: ${name}` : name) });

        // Create user doc with role
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: role === 'seller' ? storeName : name,
            realName: name,
            role: role,
            createdAt: serverTimestamp(),
            ...(role === 'seller' && {
              storeName,
              address,
              phone,
              isVerified: false
            }),
            ...(role === 'rider' && {
              phone,
              isVerified: false,
              status: 'offline',
              currentOrders: []
            })
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const { getDoc, doc: getDocRef } = await import('firebase/firestore');
      const docSnap = await getDoc(getDocRef(db, 'users', user.uid));
      
      if (!docSnap.exists()) {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: 'customer',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
        }
      } else {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            lastLogin: serverTimestamp(),
            photoURL: user.photoURL || docSnap.data().photoURL
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="flex flex-col items-center mb-8">
        <div className="mb-6">
          {settings.logo ? (
            <img src={settings.logo} className="w-20 h-20 object-contain drop-shadow-2xl" alt={settings.appName} />
          ) : (
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center text-primary shadow-xl">
              {isResetting ? <Mail size={32} /> : (isLogin ? <LogIn size={32} /> : <UserPlus size={32} />)}
            </div>
          )}
        </div>
        <h2 className="text-2xl font-display font-bold text-white">
          {isResetting ? 'Reset Password' : (isLogin ? `Log in to ${settings.appName || 'সদাই ভাই'}` : 'Create Account')}
        </h2>
        <p className="text-white/40 text-xs font-medium mt-1">
          {isResetting ? 'Enter your email to receive a reset link' : (isLogin ? 'Login to your account' : 'Join our grocery community')}
        </p>
      </div>

      {!isLogin && !isResetting && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button 
            onClick={() => setRole('customer')}
            className={`flex-1 min-w-[100px] py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
              role === 'customer' ? 'bg-primary text-black border-primary' : 'bg-white/5 text-white/40 border-white/5'
            }`}
          >
            Customer
          </button>
          <button 
            onClick={() => setRole('seller')}
            className={`flex-1 min-w-[100px] py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
              role === 'seller' ? 'bg-primary text-black border-primary shadow-lg shadow-primary/20' : 'bg-white/5 text-white/40 border-white/5'
            }`}
          >
            Seller
          </button>
          <button 
            onClick={() => setRole('rider')}
            className={`flex-1 min-w-[100px] py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
              role === 'rider' ? 'bg-primary text-black border-primary shadow-lg shadow-primary/20' : 'bg-white/5 text-white/40 border-white/5'
            }`}
          >
            Rider
          </button>
        </div>
      )}

      <form onSubmit={isResetting ? handleResetPassword : handleManualAuth} className="space-y-4">
        {!isLogin && !isResetting && (
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors" size={18} />
            <input 
              required
              placeholder="Your Full Name"
              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-3xl text-sm outline-none focus:border-primary transition-all text-white"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
        )}

        {(role === 'seller' || role === 'rider') && !isLogin && !isResetting && (
          <>
            {role === 'seller' && (
              <div className="relative group">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  required
                  placeholder="Store Name"
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-3xl text-sm outline-none focus:border-primary transition-all text-white"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                />
              </div>
            )}
            <div className="relative group">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors" size={18} />
              <input 
                required
                placeholder="Phone Number"
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-3xl text-sm outline-none focus:border-primary transition-all text-white"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            {role === 'seller' && (
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  required
                  placeholder="Farm/Store Address"
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-3xl text-sm outline-none focus:border-primary transition-all text-white"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
            )}
          </>
        )}

        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors" size={18} />
          <input 
            required
            type="email"
            placeholder="Email Address"
            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-3xl text-sm outline-none focus:border-primary transition-all text-white"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        {!isResetting && (
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors" size={18} />
            <input 
              required
              type="password"
              placeholder="Password"
              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-3xl text-sm outline-none focus:border-primary transition-all text-white"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
        )}

        {isLogin && !isResetting && (
          <div className="flex justify-end pr-2">
            <button 
              type="button"
              onClick={() => setIsResetting(true)}
              className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest"
            >
              Forgot Password?
            </button>
          </div>
        )}

        {error && <p className="text-red-500 text-[10px] font-bold text-center">{error}</p>}
        {successMsg && <p className="text-primary text-[10px] font-bold text-center">{successMsg}</p>}

        <button 
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-primary text-black rounded-[2rem] font-bold text-sm shadow-xl hover:bg-primary-dark transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-50"
        >
          {loading ? 'Processing...' : (isResetting ? 'Send Reset Link' : (isLogin ? 'Login Account' : 'Register Now'))}
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>

        {isResetting && (
          <button 
            type="button"
            onClick={() => setIsResetting(false)}
            className="w-full text-center text-xs text-white/40 font-bold hover:text-white transition-colors"
          >
            Back to Login
          </button>
        )}
      </form>

      <div className="my-8 flex items-center gap-4">
        <div className="flex-1 h-[1px] bg-white/5" />
        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">or continue with</span>
        <div className="flex-1 h-[1px] bg-white/5" />
      </div>

      <button 
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full py-4 bg-white/5 border border-white/5 text-white/80 rounded-[2rem] font-bold text-sm shadow-sm hover:border-primary transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 shadow-sm rounded-full" alt="Google" />
        Google Account
      </button>

      <p className="mt-8 text-center text-xs text-white/40 font-medium">
        {isLogin ? "Don't have an account?" : "Already have an account?"}
        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="ml-1 text-primary font-bold hover:underline"
        >
          {isLogin ? 'Register' : 'Login'}
        </button>
      </p>
    </div>
  );
}
