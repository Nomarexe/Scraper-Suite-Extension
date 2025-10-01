let extractedLinks = [];

function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = type;
  statusEl.style.display = 'block';
}

function hideStatus() {
  document.getElementById('status').style.display = 'none';
}

function updateStats() {
  const statsEl = document.getElementById('stats');
  const linkCountEl = document.getElementById('linkCount');
  
  if (extractedLinks.length > 0) {
    linkCountEl.textContent = extractedLinks.length;
    statsEl.style.display = 'block';
  } else {
    statsEl.style.display = 'none';
  }
}

function updateButtons() {
  const hasLinks = extractedLinks.length > 0;
  document.getElementById('copyBtn').disabled = !hasLinks;
  document.getElementById('csvBtn').disabled = !hasLinks;
  document.getElementById('jsonBtn').disabled = !hasLinks;
}

// === ESTRAZIONE LINK ===
document.getElementById('extractBtn').addEventListener('click', async () => {
  const btn = document.getElementById('extractBtn');
  
  btn.disabled = true;
  showStatus('Estrazione link in corso...', 'info');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url || 
        tab.url.startsWith('chrome://') || 
        tab.url.startsWith('file://') || 
        tab.url.startsWith('edge://') ||
        tab.url === 'chrome://newtab/') {
      throw new Error('Apri un sito web (es. https://esempio.com) per usare l\'estrattore.');
    }

    const pingResponse = await chrome.tabs.sendMessage(tab.id, { action: "ping" })
      .catch(() => null);

    if (!pingResponse?.alive) {
      throw new Error('Impossibile connettersi alla pagina. Ricarica la scheda e riprova.');
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "extractLinks"
    });

    console.log('Link estratti:', response);

    if (response?.links && response.links.length > 0) {
      extractedLinks = response.links;
      updateStats();
      updateButtons();
      
      showStatus(`✅ Estrazione completata! Trovati ${response.links.length} link.`, 'success');
      
      // Mostra anteprima in console
      console.log('Anteprima link estratti:', extractedLinks.slice(0, 5));
    } else {
      showStatus('⚠️ Nessun link trovato nella pagina.', 'error');
      extractedLinks = [];
      updateStats();
      updateButtons();
    }
  } catch (err) {
    let msg = err.message || 'Errore sconosciuto';
    if (msg.includes('Receiving end does not exist') || msg.includes('Could not establish connection')) {
      msg = 'Impossibile comunicare con la pagina. Assicurati di essere su un sito web (non su chrome://, file://, ecc.) e ricarica la scheda.';
    }
    showStatus(`❌ ${msg}`, 'error');
    console.error('Errore estrazione:', err);
  } finally {
    btn.disabled = false;
  }
});

// === COPIA NEGLI APPUNTI ===
document.getElementById('copyBtn').addEventListener('click', async () => {
  if (extractedLinks.length === 0) {
    showStatus('❌ Nessun link da copiare.', 'error');
    return;
  }

  try {
    // Crea una stringa con tutti i link (uno per riga)
    const linksText = extractedLinks.map(link => link.url).join('\n');
    
    // Usa la Clipboard API per copiare
    await navigator.clipboard.writeText(linksText);
    
    showStatus(`✅ ${extractedLinks.length} link copiati negli appunti!`, 'success');
    
    // Mostra anteprima di cosa è stato copiato
    console.log('Link copiati:', extractedLinks.slice(0, 3));
  } catch (err) {
    showStatus('❌ Errore durante la copia negli appunti.', 'error');
    console.error('Errore copia:', err);
  }
});

// === ESPORTAZIONE CSV ===
document.getElementById('csvBtn').addEventListener('click', () => {
  if (extractedLinks.length === 0) return;

  const headers = ['URL', 'Testo', 'Titolo'];
  let csv = headers.join(',') + '\n';
  
  extractedLinks.forEach(link => {
    const row = [
      `"${(link.url || '').replace(/"/g, '""')}"`,
      `"${(link.text || '').replace(/"/g, '""')}"`,
      `"${(link.title || '').replace(/"/g, '""')}"`
    ];
    csv += row.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `link_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showStatus(`✅ CSV esportato con ${extractedLinks.length} link!`, 'success');
});

// === ESPORTAZIONE JSON ===
document.getElementById('jsonBtn').addEventListener('click', () => {
  if (extractedLinks.length === 0) return;

  const jsonData = {
    extractedFrom: window.location.href,
    extractionDate: new Date().toISOString(),
    totalLinks: extractedLinks.length,
    links: extractedLinks
  };

  const jsonString = JSON.stringify(jsonData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `link_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showStatus(`✅ JSON esportato con ${extractedLinks.length} link!`, 'success');
});

// === PULIZIA ===
document.getElementById('clearBtn').addEventListener('click', () => {
  extractedLinks = [];
  updateStats();
  updateButtons();
  hideStatus();
  showStatus('Risultati puliti.', 'info');
  setTimeout(hideStatus, 2000);
});

// Inizializzazione
updateButtons();
hideStatus();