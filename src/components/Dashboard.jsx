import React, { useState, useEffect } from 'react';
import { db, collection, query, where, getDocs, setDoc, doc, updateDoc, getDoc, auth, signOut, deleteDoc } from '../firebase';
import { deleteUser } from 'firebase/auth';
import Swal from 'sweetalert2';

export default function Dashboard({ user, onOpenAdmin, onOpenUser }) {
  const [capoTables, setCapoTables] = useState([]);
  const [joinedTables, setJoinedTables] = useState([]);
  const [nick, setNick] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const savedNick = localStorage.getItem('cpt_nick_' + user.uid) || user.displayName || 'Amico';
    setNick(savedNick);
    loadTables();
  }, [user]);

  const loadTables = async () => {
    setLoading(true);
    try {
      const capoQ = query(collection(db, "tables"), where("capoUid", "==", user.uid));
      const capoSnap = await getDocs(capoQ);
      const capos = capoSnap.docs.map(d => d.data());
      
      const joinedQ = query(collection(db, "tables"), where("participants", "array-contains", user.uid));
      const joinedSnap = await getDocs(joinedQ);
      const joined = joinedSnap.docs.map(d => d.data()).filter(t => t.capoUid !== user.uid);

      setCapoTables(capos);
      setJoinedTables(joined);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSaveGlobalNick = async () => {
    const newNick = nick.trim().toUpperCase();
    if (!newNick) return;
    
    localStorage.setItem('cpt_nick_' + user.uid, newNick);
    Swal.showLoading();
    try {
      await setDoc(doc(db, 'users', user.uid), { nickname: newNick }, { merge: true });

      const allTables = [...capoTables, ...joinedTables];
      const uniqueTableIds = [...new Set(allTables.map(t => t.id))];

      for(let tid of uniqueTableIds) {
        let tableData = allTables.find(t => t.id === tid);
        if (!tableData) {
          const docSnap = await getDoc(doc(db, 'tables', tid));
          if (docSnap.exists()) tableData = docSnap.data();
        }
        if(tableData && tableData.selections && tableData.selections[user.uid]) {
          let displayNick = newNick;
          if(tableData.capoUid === user.uid) displayNick += " (CAPO)";
          
          await updateDoc(doc(db, "tables", tid), {
            [`selections.${user.uid}.nick`]: displayNick
          });
        }
      }
      setShowSettings(false);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Nickname aggiornato ovunque!', showConfirmButton: false, timer: 2500, background: '#111', color: '#fff' });
    } catch (e) {
      console.error(e);
      Swal.close();
    }
  };

  const promptCreateTable = async () => {
    const { value: tableName } = await Swal.fire({
      title: 'Nuovo Tavolo', input: 'text', inputPlaceholder: 'Es. Grigliata di Ferragosto',
      background: '#111', color: '#fff', confirmButtonColor: 'var(--admin)', confirmButtonText: 'CREA',
      showCancelButton: true, cancelButtonText: 'Annulla'
    });

    if (tableName && tableName.trim() !== '') {
      const tableId = 'TAVOLO-' + Math.random().toString(36).substr(2, 6).toUpperCase();
      const newTable = { id: tableId, name: tableName.trim(), capoUid: user.uid, participants: [], menu: [], selections: {} };
      await setDoc(doc(db, "tables", tableId), newTable);
      Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Tavolo Creato!', showConfirmButton: false, timer: 1500, background: '#111', color: '#fff'});
      onOpenAdmin(tableId);
    }
  };

  const promptJoinTable = async () => {
    const { value: inputVal } = await Swal.fire({
      title: 'Entra in un Tavolo', input: 'text', inputPlaceholder: 'Incolla qui il codice o il Link', 
      background: '#111', color: '#fff', confirmButtonText: 'Verifica ed Entra', confirmButtonColor: 'var(--secondary)'
    });
    
    if (!inputVal) return;

    let code = inputVal.trim();
    if (code.includes('?table=')) {
      code = code.split('?table=')[1].split('&')[0];
    }
    code = code.toUpperCase();

    Swal.fire({title: 'Ricerca in corso...', allowOutsideClick: false, background: '#111', color: '#fff', didOpen: () => { Swal.showLoading() }});
    
    try {
      const docSnap = await getDoc(doc(db, 'tables', code));
      if (docSnap.exists()) {
        Swal.close();
        onOpenUser(code);
      } else {
        Swal.fire({icon: 'error', title: 'Errore', text: 'Codice o link non valido. Il tavolo non esiste!', background: '#111', color: '#fff'});
      }
    } catch(e) {
      Swal.fire({icon: 'error', title: 'Errore', text: 'Errore di connessione', background: '#111', color: '#fff'});
    }
  };

  const handleDeleteAccount = () => {
    Swal.fire({
      title: 'Eliminare Account?', text: "Tutti i tuoi tavoli andranno persi per sempre. Sicuro?", icon: 'warning',
      showCancelButton: true, confirmButtonColor: 'var(--danger)', cancelButtonColor: '#444', confirmButtonText: 'Sì, elimina tutto', cancelButtonText: 'Annulla', background: '#111', color: '#fff'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          localStorage.removeItem('cpt_nick_' + user.uid);
          
          // Elimina l'utente dal database Firestore
          await deleteDoc(doc(db, "users", user.uid));
          
          // Elimina i tavoli di cui è capo (evita tavoli orfani)
          for (let table of capoTables) {
            await deleteDoc(doc(db, "tables", table.id));
          }
          
          await user.delete(); 
          Swal.fire({icon: 'success', title: 'Eliminato', text: 'Il tuo account è stato cancellato.', background: '#111', color: '#fff'});
        } catch (error) {
          Swal.fire({ icon: 'error', title: 'Errore di Sicurezza', text: 'Scollegati e rifai il login prima di poter eliminare il tuo account in modo sicuro.', background: '#111', color: '#fff' });
        }
      }
    });
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Vuoi scollegarti?', text: "Dovrai riaccedere con Google per vedere i tuoi tavoli.", icon: 'question',
      showCancelButton: true, confirmButtonColor: 'var(--secondary)', cancelButtonColor: '#444', confirmButtonText: 'Sì, esci', cancelButtonText: 'Annulla', background: '#111', color: '#fff'
    }).then((result) => {
      if (result.isConfirmed) {
        signOut(auth);
      }
    });
  };

  const showPrivacy = () => {
    Swal.fire({
      title: 'Informativa sulla Privacy',
      html: `
        <div style="text-align: left; font-size: 0.9rem; line-height: 1.5; color: #ddd;">
          <p><strong>Dati raccolti:</strong> Questo sito salva solo i dati strettamente necessari per funzionare: il tuo Nome Google, l'Email (usata solo per l'autenticazione) e la foto profilo.</p>
          <p><strong>Scelte ai tavoli:</strong> Le tue decisioni sui menù e le quantità vengono salvate e condivise con i partecipanti del tavolo.</p>
          <p><strong>Statistiche (Analytics):</strong> Utilizziamo Google Analytics per raccogliere statistiche anonime di utilizzo e visite al sito al fine di migliorare il servizio.</p>
          <p><strong>Infrastruttura:</strong> Tutti i dati sono memorizzati in modo sicuro sui server cloud di Google Firebase.</p>
          <p><strong>Eliminazione dati:</strong> Puoi eliminare il tuo account istantaneamente in qualsiasi momento cliccando su "Elimina Account". Questa azione eliminerà anche tutti i tavoli in cui sei "Capo".</p>
        </div>
      `,
      background: '#111',
      color: '#fff',
      confirmButtonColor: 'var(--secondary)',
      confirmButtonText: 'Ho capito'
    });
  };

  const allEvents = [...capoTables.map(t => ({...t, isCapo: true})), ...joinedTables.map(t => ({...t, isCapo: false}))];

  return (
    <>
      <div className="hero-section">
        <div className="hero-profile">
          <img src={user.photoURL || 'https://via.placeholder.com/60'} alt="Avatar" className="hero-avatar" />
          <div>
            <p style={{fontSize: '0.8rem', color: '#aaa', margin: 0, fontWeight: 600}}>BENTORNATO</p>
            <h2 className="hero-greeting" style={{color: 'var(--text-main)'}}>{nick}</h2>
          </div>
        </div>
        <button className="settings-btn" onClick={() => setShowSettings(true)}>⚙️</button>
      </div>

      <div className="bento-grid">
        <div className="bento-box admin" onClick={promptCreateTable}>
          <span className="bento-icon">🍗</span>
          <span className="bento-title">Crea Tavolo</span>
        </div>
        <div className="bento-box user" onClick={promptJoinTable}>
          <span className="bento-icon">🔗</span>
          <span className="bento-title">Partecipa</span>
        </div>
      </div>

      <div className="section" style={{ padding: '1.5rem 1rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text-main)' }}>I Tuoi Eventi</h3>
        
        {loading ? <p className="text-center">Caricamento in corso...</p> : allEvents.length === 0 ? (
          <div style={{textAlign: 'center', padding: '2rem 1rem', color: '#888'}}>
            <p style={{fontSize: '3rem', margin: '0 0 1rem 0'}}>🍔</p>
            <p>Non hai ancora partecipato a nessuna grigliata.</p>
          </div>
        ) : (
          <div className="item-list mt-1">
            {allEvents.map(t => (
                <div 
                  key={t.id} 
                  className={`table-card ${t.isCapo ? 'admin' : 'user'}`} 
                  onClick={() => t.isCapo ? onOpenAdmin(t.id) : onOpenUser(t.id)}
                  style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    {t.isCapo && <div><span className="table-badge" style={{marginLeft: 0}}>👑 Capo</span></div>}
                    <span className="table-title" style={{fontSize: '1.1rem'}}>{t.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                    <span className={`table-action ${t.isCapo ? 'admin' : 'user'}`}>
                      ENTRA ➔
                    </span>
                  </div>
                </div>
            ))}
          </div>
        )}
      </div>

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Impostazioni Profilo</h3>
              <button className="close-btn" onClick={() => setShowSettings(false)}>×</button>
            </div>
            
            <div>
              <p style={{ margin: '0 0 8px 0', fontWeight: 600, fontSize: '0.9rem' }}>NICKNAME GLOBALE</p>
              <div className="nick-group">
                <input 
                  type="text" 
                  value={nick} 
                  onChange={e => setNick(e.target.value)} 
                  placeholder="Es. Marco R." 
                  style={{ textAlign: 'center', fontWeight: 'bold' }} 
                />
                <button className="btn-secondary btn-icon" onClick={handleSaveGlobalNick}>💾</button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #333', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn-outline btn-full" onClick={handleLogout}>Scollegati da Google</button>
              <button className="btn-outline btn-full" onClick={showPrivacy} style={{fontSize: '0.85rem', borderColor: '#444'}}>📄 Leggi Informativa Privacy</button>
              <button className="btn-danger btn-full" onClick={handleDeleteAccount}>❌ Elimina Account</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
