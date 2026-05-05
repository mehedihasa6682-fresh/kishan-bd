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
import { auth, db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Store, ShieldCheck, Github, Chrome, ArrowRight, UserPlus, LogIn, MapPin, Phone } from 'lucide-react';

export default function Auth() {
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
      await setPersistence(auth, browserLocalPersistence);
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: role === 'seller' ? storeName : (role === 'rider' ? `Rider: ${name}` : name) });

        // Create user doc with role
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
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'customer',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
      } else {
        await updateDoc(doc(db, 'users', user.uid), {
          lastLogin: serverTimestamp(),
          photoURL: user.photoURL || docSnap.data().photoURL
        });
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
        <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-4">
          {isResetting ? <Mail size={32} /> : (isLogin ? <LogIn size={32} /> : <UserPlus size={32} />)}
        </div>
        <h2 className="text-2xl font-display font-bold text-slate-900">
          {isResetting ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Account')}
        </h2>
        <p className="text-slate-400 text-xs font-medium mt-1">
          {isResetting ? 'Enter your email to receive a reset link' : (isLogin ? 'Login to your Kishan account' : 'Join our fresh food community')}
        </p>
      </div>

      {!isLogin && !isResetting && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button 
            onClick={() => setRole('customer')}
            className={`flex-1 min-w-[100px] py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
              role === 'customer' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'
            }`}
          >
            Customer
          </button>
          <button 
            onClick={() => setRole('seller')}
            className={`flex-1 min-w-[100px] py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
              role === 'seller' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-slate-400 border-slate-100'
            }`}
          >
            Seller
          </button>
          <button 
            onClick={() => setRole('rider')}
            className={`flex-1 min-w-[100px] py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
              role === 'rider' ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100' : 'bg-white text-slate-400 border-slate-100'
            }`}
          >
            Rider
          </button>
        </div>
      )}

      <form onSubmit={isResetting ? handleResetPassword : handleManualAuth} className="space-y-4">
        {!isLogin && !isResetting && (
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
            <input 
              required
              placeholder="Your Full Name"
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-3xl text-sm outline-none focus:border-primary transition-all"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
        )}

        {(role === 'seller' || role === 'rider') && !isLogin && !isResetting && (
          <>
            {role === 'seller' && (
              <div className="relative group">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  required
                  placeholder="Store Name"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-3xl text-sm outline-none focus:border-primary transition-all"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                />
              </div>
            )}
            <div className="relative group">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
              <input 
                required
                placeholder="Phone Number"
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-3xl text-sm outline-none focus:border-primary transition-all"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            {role === 'seller' && (
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  required
                  placeholder="Farm/Store Address"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-3xl text-sm outline-none focus:border-primary transition-all"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
            )}
          </>
        )}

        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
          <input 
            required
            type="email"
            placeholder="Email Address"
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-3xl text-sm outline-none focus:border-primary transition-all"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        {!isResetting && (
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
            <input 
              required
              type="password"
              placeholder="Password"
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-3xl text-sm outline-none focus:border-primary transition-all"
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
          className="w-full py-4 bg-slate-900 text-white rounded-[2rem] font-bold text-sm shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-50"
        >
          {loading ? 'Processing...' : (isResetting ? 'Send Reset Link' : (isLogin ? 'Login Account' : 'Register Now'))}
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>

        {isResetting && (
          <button 
            type="button"
            onClick={() => setIsResetting(false)}
            className="w-full text-center text-xs text-slate-400 font-bold hover:text-slate-600 transition-colors"
          >
            Back to Login
          </button>
        )}
      </form>

      <div className="my-8 flex items-center gap-4">
        <div className="flex-1 h-[1px] bg-slate-100" />
        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">or continue with</span>
        <div className="flex-1 h-[1px] bg-slate-100" />
      </div>

      <button 
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full py-4 bg-white border border-slate-100 text-slate-600 rounded-[2rem] font-bold text-sm shadow-sm hover:border-primary/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 shadow-sm rounded-full" alt="Google" />
        Google Account
      </button>

      <p className="mt-8 text-center text-xs text-slate-400 font-medium">
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
