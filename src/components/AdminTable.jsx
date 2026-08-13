import React, { useState, useEffect } from 'react';
import { db, doc, onSnapshot, updateDoc, deleteDoc, deleteField } from '../firebase';
import Swal from 'sweetalert2';

export default function AdminTable({ user, tableId, onBackHome, onSwitchToUser }) {
  const [tableData, setTableData] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItemName, setEditItemName] = useState('');
  const [showParticipants, setShowParticipants] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "tables", tableId), (docSnap) => {
      if (docSnap.exists()) {
        setTableData(docSnap.data());
      } else {
        Swal.fire({ icon: 'error', title: 'Errore', text: 'Questo tavolo è stato eliminato.', background: '#111', color: '#fff' });
        onBackHome();
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  const copyInviteLink = () => {
    const link = window.location.origin + window.location.pathname + "?table=" + tableId;
    if (navigator.share) {
      navigator.share({
        url: link
      }).catch((error) => console.log('Condivisione annullata', error));
    } else {
      navigator.clipboard.writeText(link).then(() => {
        Swal.fire({
          icon: 'success', title: 'Link Copiato!', text: 'Incollalo su WhatsApp o Telegram.',
          confirmButtonColor: 'var(--secondary)', background: '#111', color: '#fff'
        });
      });
    }
  };

  const addItemToMenu = async () => {
    const nameVal = newItemName.trim();
    if (!nameVal || isAdding || !tableData) return;
    setIsAdding(true);
    
    try {
      const currentMenu = tableData.menu || [];
      const isDuplicate = currentMenu.some(item => item.name.toLowerCase() === nameVal.toLowerCase());
      if (isDuplicate) {
        Swal.fire({icon: 'warning', title: 'Già presente!', text: 'Questo elemento è già nel menu.', background: '#111', color: '#fff'});
        setIsAdding(false);
        return;
      }

      const newItem = { id: Date.now(), name: nameVal };
      let tempMenu = [...currentMenu, newItem];
      tempMenu.sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }));

      await updateDoc(doc(db, "tables", tableId), { menu: tempMenu });
      setNewItemName('');
    } catch (e) {
      console.error(e);
      Swal.fire({icon: 'error', title: 'Errore', text: 'Impossibile aggiungere', background: '#111', color: '#fff'});
    }
    setIsAdding(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') addItemToMenu();
  };

  const deleteItem = (itemId) => {
    Swal.fire({
      title: 'Eliminare?', text: "Sparirà anche dai carrelli degli utenti!", icon: 'warning',
      showCancelButton: true, confirmButtonColor: 'var(--danger)', cancelButtonColor: '#444', confirmButtonText: 'Sì', background: '#111', color: '#fff'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const currentMenu = tableData.menu || [];
        let tempMenu = currentMenu.filter(i => i.id !== itemId);
        
        let updates = { menu: tempMenu };
        const selections = tableData.selections || {};
        
        for (let userKey in selections) {
          if (selections[userKey].items && selections[userKey].items[itemId] !== undefined) {
            updates[`selections.${userKey}.items.${itemId}`] = deleteField();
          } 
          else if (selections[userKey][itemId] !== undefined) {
            updates[`selections.${userKey}.${itemId}`] = deleteField();
          }
        }
        await updateDoc(doc(db, "tables", tableId), updates);
      }
    });
  };

  const startEditItem = (item) => {
    setEditingItemId(item.id);
    setEditItemName(item.name);
  };

  const saveEditItem = async (itemId) => {
    const val = editItemName.trim();
    if (!val) {
      setEditingItemId(null);
      return;
    }
    const currentMenu = tableData.menu || [];
    const isDuplicate = currentMenu.some(i => i.id !== itemId && i.name.toLowerCase() === val.toLowerCase());
    if (isDuplicate) {
      Swal.fire({icon: 'warning', title: 'Già presente!', text: 'Questo elemento è già nel menu.', background: '#111', color: '#fff'});
      return;
    }
    let tempMenu = currentMenu.map(i => i.id === itemId ? { ...i, name: val } : i);
    tempMenu.sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }));
    await updateDoc(doc(db, "tables", tableId), { menu: tempMenu });
    setEditingItemId(null);
  };

  const cancelEdit = () => {
    setEditingItemId(null);
  };

  const removeUserFromTable = (uid, userName) => {
    Swal.fire({
      title: `Cacciare ${userName}?`, text: "Le sue scelte verranno cancellate.", icon: 'warning',
      showCancelButton: true, confirmButtonColor: 'var(--danger)', cancelButtonColor: '#444', confirmButtonText: 'Sì, rimuovi', cancelButtonText: 'Annulla', background: '#111', color: '#fff'
    }).then(async (result) => {
      if (result.isConfirmed) {
        let updates = {
          [`selections.${uid}`]: deleteField()
        };
        const newParticipants = (tableData.participants || []).filter(p => p !== uid);
        updates.participants = newParticipants;
        await updateDoc(doc(db, "tables", tableId), updates);
        Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Rimosso!', showConfirmButton: false, timer: 1500, background: '#111', color: '#fff'});
      }
    });
  };

  const promptDeleteTable = () => {
    Swal.fire({
      title: `Eliminare il tavolo?`, text: "Azione irreversibile.", icon: 'warning',
      showCancelButton: true, confirmButtonColor: 'var(--danger)', cancelButtonColor: '#444', confirmButtonText: 'Sì, elimina', cancelButtonText: 'Annulla', background: '#111', color: '#fff'
    }).then(async (result) => {
      if (result.isConfirmed) {
        await deleteDoc(doc(db, "tables", tableId));
        Swal.fire({toast: true, position: 'top-end', icon: 'success', title: 'Tavolo Eliminato!', showConfirmButton: false, timer: 1500, background: '#111', color: '#fff'});
        onBackHome();
      }
    });
  };

  if (!tableData) return <div style={{textAlign: 'center', marginTop: '40px'}}>Caricamento...</div>;

  const currentMenu = tableData.menu || [];
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

  return (
    <div style={{ width: '100%' }}>
      <div className="table-navbar">
        <div className="table-navbar-title">{tableData.name}</div>
      </div>

      <div className="section mb-1" style={{marginTop: '1rem'}}>
        <div className="flex-between mb-1">
          <h3 
            style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', userSelect: 'none' }}
            onClick={() => setShowParticipants(!showParticipants)}
          >
            👥 Partecipanti ({usersArray.length}) 
            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{showParticipants ? '▼' : '▶'}</span>
          </h3>
          <button className="btn-outline" style={{padding: '0.4rem 0.8rem'}} onClick={copyInviteLink}>🔗 Invita</button>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Codice Tavolo: <strong style={{color: 'var(--text-main)', letterSpacing: '1px', userSelect: 'all'}}>{tableId}</strong>
        </div>
        
        {showParticipants && usersArray.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {usersArray.map(u => (
              <div key={u.uid} style={{ background: '#1a1a1a', padding: '0.8rem', borderRadius: '8px', border: '1px solid #333', fontSize: '0.95rem' }}>
                {u.nick || "Utente anonimo"}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section mb-1" style={{ borderColor: 'var(--admin)' }}>
        <h3 style={{ margin: 0, color: 'var(--admin)' }}>🍔 Aggiungi al Menù</h3>
        <div className="input-group mt-1">
          <input 
            type="text" 
            value={newItemName} 
            onChange={e => setNewItemName(e.target.value)} 
            placeholder="Es. Costine, Birra..." 
            onKeyPress={handleKeyPress}
            disabled={isAdding}
          />
          <button className="btn-admin" onClick={addItemToMenu} disabled={isAdding}>+</button>
        </div>
      </div>

      <div className="section mb-1">
        <h3 style={{ margin: 0 }}>📋 Menù Attuale</h3>
        {currentMenu.length === 0 ? <p className="text-center" style={{marginTop: '1rem'}}>Il menu è vuoto.</p> : (
          <div className="item-list mt-1">
            {currentMenu.map(item => (
              <div key={item.id} className="item-row">
                {editingItemId === item.id ? (
                  <div style={{display:'flex', width:'100%', gap:'8px', alignItems:'center'}}>
                    <input 
                      type="text" 
                      value={editItemName} 
                      onChange={e => setEditItemName(e.target.value)} 
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && saveEditItem(item.id)}
                      onBlur={() => cancelEdit()}
                      style={{flexGrow: 1, padding: '0.6rem'}}
                    />
                    <button className="btn-admin btn-icon" onMouseDown={e => { e.preventDefault(); saveEditItem(item.id); }}>💾</button>
                  </div>
                ) : (
                  <>
                    <span className="item-name" style={{flexGrow: 1, padding: '0.5rem 0'}}>
                      {item.name}
                    </span>
                    <div style={{display: 'flex', gap: '8px'}}>
                      <button className="btn-outline btn-icon" onClick={() => startEditItem(item)} style={{border: 'none'}}>✏️</button>
                      <button className="btn-danger btn-icon" onClick={() => deleteItem(item.id)}>❌</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section mb-1">
        <h3 style={{ margin: 0 }}>👥 Chi ha scelto cosa</h3>
        
        {usersArray.length === 0 ? <p className="text-center mt-1">Nessuno ha ancora scelto nulla.</p> : (
          <div className="mt-1" style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
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
                <div key={userObj.uid} style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '12px', border: '1px solid #222' }}>
                  <div className="flex-between" style={{ borderBottom: '1px solid #222', paddingBottom: '10px', marginBottom: '10px' }}>
                    <div className="flex-row">
                      <div className="user-avatar-bubble" style={{backgroundColor: bgColor}}>{initial}</div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>{safeNick}</h4>
                        <span style={{ fontSize: '0.75rem', color: '#666' }}>Mod: {lastMod}</span>
                      </div>
                    </div>
                    <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => removeUserFromTable(userObj.uid, safeNick)}>Rimuovi</button>
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

      <div style={{ marginTop: '1rem' }}>
        <button 
          className="btn-outline btn-full" 
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: '0.6rem' }} 
          onClick={promptDeleteTable}
        >
          Elimina Questo Tavolo
        </button>
      </div>

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
          <button className="btn-outline" style={{ padding: '0.8rem', fontSize: '1rem', flex: 1 }} onClick={onBackHome}>Indietro</button>
          <button className="btn-secondary" style={{ padding: '0.8rem', fontSize: '1rem', flex: 2, boxShadow: '0 4px 15px rgba(0, 229, 255, 0.2)' }} onClick={onSwitchToUser}>Partecipa</button>
        </div>
      </div>

    </div>
  );
}
