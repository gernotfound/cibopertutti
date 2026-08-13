import React, { useState, useEffect, useRef } from 'react';
import { db, doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, deleteField } from '../firebase';
import Swal from 'sweetalert2';

export default function UserTable({ user, tableId, onBackHome, onSwitchToAdmin }) {
  const [tableData, setTableData] = useState(null);
  const [localChoices, setLocalChoices] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "tables", tableId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTableData(data);
        
        if (!hasInitialized.current) {
          const baseNick = localStorage.getItem('cpt_nick_' + user.uid) || user.displayName || "Amico";
          let displayNick = baseNick;
          if (data.capoUid === user.uid) displayNick += " (CAPO)";
          
          const selections = data.selections || {};
          let choices = {};
          
          if (selections[user.uid] && selections[user.uid].items) {
            choices = { ...selections[user.uid].items };
          } 
          else if (selections[displayNick] && selections[displayNick].items === undefined) {
            choices = { ...selections[displayNick] };
          }
          
          setLocalChoices(choices);
          hasInitialized.current = true;
        }
      } else {
        Swal.fire({ icon: 'error', title: 'Errore', text: 'Questo tavolo è stato eliminato dal Capo.', background: '#111', color: '#fff' });
        onBackHome();
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  const changeQty = (itemId, change) => {
    setLocalChoices(prev => {
      let newQty = (prev[itemId] || 0) + change;
      if (newQty < 0) newQty = 0;
      return { ...prev, [itemId]: newQty };
    });
  };

  const saveSelection = async () => {
    setIsSaving(true);
    
    let baseNick = localStorage.getItem('cpt_nick_' + user.uid) || user.displayName || "Amico";
    if (tableData.capoUid === user.uid) baseNick += " (CAPO)";

    const timestamp = new Date().toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });

    let updates = {};

    updates[`selections.${user.uid}`] = {
      nick: baseNick,
      items: localChoices,
      lastUpdate: timestamp
    };
    updates['participants'] = arrayUnion(user.uid);

    try {
      await updateDoc(doc(db, "tables", tableId), updates);
      Swal.fire({
        icon: 'success', title: 'SCELTE SALVATE!',
        text: 'Le tue quantità sono registrate sul tavolo.',
        background: '#111', color: '#fff', confirmButtonColor: 'var(--secondary)', timer: 2000
      });
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Errore', text: 'Non è stato possibile salvare le scelte.', background: '#111', color: '#fff' });
    }
    setIsSaving(false);
  };

  const handleLeaveTable = () => {
    Swal.fire({
      title: 'Sei sicuro?',
      text: "Verrai rimosso dal tavolo e le tue scelte verranno cancellate.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--danger)',
      cancelButtonColor: '#333',
      confirmButtonText: 'Sì, eliminami',
      cancelButtonText: 'Annulla',
      background: '#111',
      color: '#fff'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const updates = {};
          updates[`selections.${user.uid}`] = deleteField();
          updates['participants'] = arrayRemove(user.uid);
          
          await updateDoc(doc(db, "tables", tableId), updates);
          
          Swal.fire({
            icon: 'success',
            title: 'Rimosso',
            text: 'Sei stato rimosso dal tavolo.',
            background: '#111', color: '#fff', timer: 1500, showConfirmButton: false
          });
          onBackHome();
        } catch (e) {
          console.error(e);
          Swal.fire({ icon: 'error', title: 'Errore', text: 'Impossibile rimuoverti dal tavolo.', background: '#111', color: '#fff' });
        }
      }
    });
  };

  if (!tableData) return <div style={{textAlign: 'center', marginTop: '40px'}}>Caricamento...</div>;

  const currentMenu = tableData.menu || [];
  const baseNick = localStorage.getItem('cpt_nick_' + user.uid) || user.displayName || "Amico";
  const displayNick = tableData.capoUid === user.uid ? baseNick + " (CAPO)" : baseNick;

  // Recap Logic
  const selections = tableData.selections || {};
  let usersArray = [];
  
  for(let key in selections) {
    let val = selections[key];
    if (val.items !== undefined) {
      usersArray.push({ uid: key, ...val }); 
    } else {
      usersArray.push({ uid: key, nick: key, items: val, lastUpdate: "Vecchio Salvataggio" }); 
    }
  }
  usersArray.sort((a, b) => (a.nick || "").localeCompare((b.nick || ""), 'it', { sensitivity: 'base' }));

  let itemTotals = {}; 
  usersArray.forEach(userObj => {
    const items = userObj.items || {};
    for (let itemId in items) {
      if (!itemTotals[itemId]) itemTotals[itemId] = 0;
      itemTotals[itemId] += items[itemId];
    }
  });

  const generateColorFromName = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  if (showRecap) {
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', paddingBottom: '2rem' }}>
        <div className="table-navbar">
          <button className="nav-back" onClick={() => setShowRecap(false)}>Indietro</button>
          <div className="table-navbar-title">Riepilogo Tavolo</div>
          <div style={{width: '70px'}}></div>
        </div>

        <div className="section mb-1" style={{marginTop: '1rem'}}>
          <h3 style={{ margin: 0, marginBottom: '1rem' }}>👥 Chi ha scelto cosa</h3>
          {usersArray.length === 0 ? <p className="text-center mt-1">Nessuno ha ancora scelto nulla.</p> : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              {usersArray.map(userObj => {
                const safeNick = userObj.nick || "Utente";
                const lastMod = userObj.lastUpdate || "Sconosciuta";
                const initial = safeNick.charAt(0).toUpperCase();
                const bgColor = generateColorFromName(safeNick);
                
                const userItems = currentMenu.map(item => {
                  const qty = (userObj.items && userObj.items[item.id]) ? userObj.items[item.id] : 0;
                  if (qty > 0) return (
                    <div key={item.id} className="flex-between" style={{marginTop:'8px', fontSize: '0.95rem'}}>
                      <span>{item.name}</span> 
                      <span style={{color: 'var(--secondary)', fontWeight: 800}}>x {qty}</span>
                    </div>
                  );
                  return null;
                }).filter(Boolean);

                return (
                  <div key={userObj.uid} style={{ background: '#1a1a1a', padding: '1rem', borderRadius: '12px', border: '1px solid #333' }}>
                    <div className="flex-between" style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '10px' }}>
                      <div className="flex-row">
                        <div className="user-avatar-bubble" style={{backgroundColor: bgColor}}>{initial}</div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>{safeNick}</h4>
                          <span style={{ fontSize: '0.75rem', color: '#666' }}>Mod: {lastMod}</span>
                        </div>
                      </div>
                    </div>
                    {userItems.length > 0 ? userItems : <p style={{fontSize: '0.9rem', color: '#666'}}>Carrello vuoto.</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="receipt-card mb-1">
          <h3 style={{ margin: 0, color: 'var(--secondary)', textAlign: 'center', marginBottom: '1.5rem' }}>🧾 TOTALE</h3>
          {Object.keys(itemTotals).length === 0 ? <p className="text-center">Nessun elemento da comprare.</p> : (
            <div className="item-list">
              {currentMenu.map(item => {
                const totalQty = itemTotals[item.id] || 0;
                if (totalQty > 0) {
                  return (
                    <div key={item.id} className="item-row" style={{ borderBottom: '1px dashed #444', padding: '0.5rem 0' }}>
                      <span className="item-name" style={{fontWeight: 400}}>{item.name}</span>
                      <span style={{ color: 'var(--secondary)', fontSize: '1.2rem', fontWeight: 800 }}>{totalQty}</span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      
      <div className="table-navbar">
        <div className="table-navbar-title">{tableData.name}</div>
      </div>

      {tableData.capoUid === user.uid ? (
        <div style={{marginBottom: '1rem'}}>
          <button className="btn-secondary btn-full" onClick={onSwitchToAdmin}>
            Gestisci
          </button>
        </div>
      ) : (
        <div style={{marginBottom: '1rem'}}>
          <button 
            className="btn-primary btn-full" 
            style={{ fontWeight: 800, padding: '0.8rem', letterSpacing: '1px' }}
            onClick={() => setShowRecap(true)}
          >
            Vedi Scelte di tutti e Totale
          </button>
        </div>
      )}

      <div className="text-center mb-1" style={{marginTop: '1rem'}}>
        <h2 style={{ margin: 0, color: 'var(--secondary)', border: 'none', fontSize: '0.9rem', letterSpacing: '2px' }}>BENVENUTO</h2>
        <h1 style={{ marginTop: '0.2rem', marginBottom: '0.5rem', color: '#fff', fontSize: '1.8rem' }}>{displayNick} 🥩</h1>
        <p style={{fontSize: '0.9rem'}}>Scegli le quantità e ricordati di salvare!</p>
      </div>

      <div className="section mb-1" style={{flexGrow: 1}}>
        <h3 style={{ margin: 0 }}>📋 Menù</h3>
        {currentMenu.length === 0 ? <p className="text-center mt-1">Il menu è vuoto. In attesa del Capo...</p> : (
          <div className="item-list mt-1" style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            {currentMenu.map(item => {
              const qty = localChoices[item.id] || 0;
              const isActive = qty > 0;
              return (
                <div key={item.id} className="flex-between" style={{background: '#0a0a0a', padding: '12px', borderRadius: '12px', border: '1px solid #222'}}>
                  <span className="item-name" style={{fontSize: '1.1rem'}}>{item.name}</span>
                  <div className={`qty-pill ${isActive ? 'active' : ''}`}>
                    <button onClick={() => changeQty(item.id, -1)}>-</button>
                    <span>{qty}</span>
                    <button onClick={() => changeQty(item.id, 1)}>+</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {tableData.capoUid !== user.uid && (
        <div style={{ marginTop: '1rem' }}>
          <button 
            className="btn-outline btn-full" 
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: '0.6rem' }} 
            onClick={handleLeaveTable}
          >
            Eliminami dal tavolo
          </button>
        </div>
      )}

      <div style={{
        position: 'sticky', 
        bottom: 0, 
        zIndex: 10, 
        marginTop: '2rem', 
        background: 'rgba(5, 5, 5, 0.9)', 
        backdropFilter: 'blur(12px)',
        padding: '1rem',
        margin: '2rem -1.5rem -1.5rem -1.5rem',
        borderTop: '1px solid var(--card-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem'
      }}>
        <div style={{display: 'flex', gap: '0.8rem'}}>
          <button 
            className="btn-outline" 
            style={{ padding: '0.8rem', fontSize: '1rem', flex: 1 }} 
            onClick={onBackHome}
          >
            Indietro
          </button>
          <button 
            className="btn-secondary" 
            style={{ padding: '0.8rem', fontSize: '1rem', flex: 2, boxShadow: '0 4px 15px rgba(0, 229, 255, 0.2)' }} 
            onClick={saveSelection} 
            disabled={isSaving}
          >
            {isSaving ? "SALVATAGGIO..." : "SALVA"}
          </button>
        </div>
      </div>

    </div>
  );
}
