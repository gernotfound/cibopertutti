import React, { useState, useEffect, lazy, Suspense } from 'react';
import { auth, onAuthStateChanged, signOut, db, doc, getDoc, setDoc } from './firebase';
import Swal from 'sweetalert2';

const Login = lazy(() => import('./components/Login'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const AdminTable = lazy(() => import('./components/AdminTable'));
const UserTable = lazy(() => import('./components/UserTable'));

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTableId, setCurrentTableId] = useState(null);
  const [isAdminView, setIsAdminView] = useState(false); // toggle fra capo/umile se l'utente è capo

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        let finalNick = '';
        
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists() && userDocSnap.data().nickname) {
            finalNick = userDocSnap.data().nickname;
            localStorage.setItem('cpt_nick_' + currentUser.uid, finalNick);
          } else {
            // Se non c'è su Firestore, proviamo il local storage o chiediamo
            let localNick = localStorage.getItem('cpt_nick_' + currentUser.uid);
            if (!localNick) {
              const { value: nick } = await Swal.fire({
                title: 'Benvenuto!',
                text: 'Scegli il Nickname con cui ti vedranno gli amici:',
                input: 'text',
                inputValue: currentUser.displayName || 'Amico',
                inputPlaceholder: 'Es. Marco R.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                background: '#111',
                color: '#fff',
                confirmButtonText: 'SALVA E INIZIA',
                confirmButtonColor: 'var(--primary)',
                inputValidator: (value) => {
                  if (!value.trim()) return 'Devi inserire un nickname!'
                }
              });
              localNick = nick.trim().toUpperCase();
            }
            finalNick = localNick;
            localStorage.setItem('cpt_nick_' + currentUser.uid, finalNick);
            // Salva su Firestore per la prossima volta (da un altro dispositivo)
            setDoc(userDocRef, { nickname: finalNick }, { merge: true });
          }
        } catch (e) {
          console.error("Errore recupero nick:", e);
        }

        setUser(currentUser);
        // Routing check
        checkUrlAndRoute(currentUser);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const checkUrlAndRoute = async (currentUser) => {
    const urlParams = new URLSearchParams(window.location.search);
    const tableFromUrl = urlParams.get('table');
    
    if (tableFromUrl) {
      const code = tableFromUrl.toUpperCase();
      try {
        const docRef = doc(db, 'tables', code);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCurrentTableId(code);
          setIsAdminView(data.capoUid === currentUser.uid); 
        } else {
          Swal.fire({icon: 'error', title: 'Errore', text: 'Il tavolo non esiste o è stato eliminato!', background: '#111', color: '#fff'});
          window.history.pushState({}, document.title, window.location.pathname);
          setCurrentTableId(null);
        }
      } catch (err) {
        console.error(err);
      }
    }
    setLoading(false);
  };

  const navigateToTableAsAdmin = (id) => {
    setCurrentTableId(id);
    setIsAdminView(true);
    window.history.pushState({}, document.title, "?table=" + id);
  };

  const navigateToTableAsUser = (id) => {
    setCurrentTableId(id);
    setIsAdminView(false);
    window.history.pushState({}, document.title, "?table=" + id);
  };

  const goHome = () => {
    setCurrentTableId(null);
    setIsAdminView(false);
    window.history.pushState({}, document.title, window.location.pathname);
  };

  if (loading) {
    return <div style={{marginTop: '4rem', textAlign: 'center'}}>Caricamento...</div>;
  }

  return (
    <>
      <header style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
        <img 
          src="./cibopertutti_cover.jpg" 
          alt="Logo" 
          style={{ 
            width: '45px', 
            height: '45px', 
            objectFit: 'cover', 
            mixBlendMode: 'screen',
            filter: 'contrast(1.5) brightness(0.9)',
            transform: 'scale(1.2)'
          }} 
        />
        <h1 style={{ margin: 0 }}>CiboPerTutti</h1>
      </header>
      <main>
        <Suspense fallback={<div style={{textAlign: 'center', marginTop: '2rem'}}>Caricamento in corso...</div>}>
          {!user ? (
            <Login />
          ) : !currentTableId ? (
            <Dashboard 
              user={user} 
              onOpenAdmin={navigateToTableAsAdmin} 
              onOpenUser={navigateToTableAsUser} 
            />
          ) : isAdminView ? (
            <AdminTable 
              user={user} 
              tableId={currentTableId} 
              onBackHome={goHome} 
              onSwitchToUser={() => setIsAdminView(false)} 
            />
          ) : (
            <UserTable 
              user={user} 
              tableId={currentTableId} 
              onBackHome={goHome} 
              onSwitchToAdmin={() => setIsAdminView(true)} 
            />
          )}
        </Suspense>
      </main>
    </>
  );
}
