let columns = [
  { columnName: "Nome", selector: "h3" }
];

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderColumns() {
  const container = document.getElementById('columns');
  container.innerHTML = '';

  columns.forEach((col, i) => {
    const div = document.createElement('div');
    div.className = 'column';
    div.innerHTML = `
      <input type="text" placeholder="Nome colonna (es. Titolo, Testo)"
             value="${escapeHtml(col.columnName)}" data-id="${i}" class="col-name">
      <input type="text" placeholder="Classe CSS (es. mio-titolo) o Tag HTML (es. h1, p)"
             value="${escapeHtml(col.selector)}" data-id="${i}" class="col-selector">
      <button class="remove" data-id="${i}">🗑️ Rimuovi</button>
      <small>Inserisci solo il nome della classe (senza il punto) oppure il tag HTML</small>
      ${columns.length === 1 ? '<small style="color: #4361ee;">🔍 Modalità singola colonna: estrarrà TUTTI gli elementi</small>' : ''}
    `;
    container.appendChild(div);
  });

  document.querySelectorAll('.col-name').forEach(el => {
    el.addEventListener('input', (e) => {
      const i = e.target.dataset.id;
      columns[i].columnName = e.target.value;
    });
  });

  document.querySelectorAll('.col-selector').forEach(el => {
    el.addEventListener('input', (e) => {
      const i = e.target.dataset.id;
      columns[i].selector = e.target.value.trim();
    });
  });

  document.querySelectorAll('.remove').forEach(el => {
    el.addEventListener('click', (e) => {
      const i = e.target.dataset.id;
      columns.splice(i, 1);
      renderColumns();
    });
  });
}

renderColumns();

document.getElementById('addCol').addEventListener('click', () => {
  columns.push({ columnName: "Nuova Colonna", selector: "" });
  renderColumns();
});

// === FUNZIONE DI SCRAPING MIGLIORATA ===
document.getElementById('scrapeBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('status');
  const btn = document.getElementById('scrapeBtn');
  
  btn.disabled = true;
  statusEl.textContent = 'Verifica pagina...';
  statusEl.className = '';

  const validColumns = columns.filter(c => 
    c.columnName.trim() !== '' && c.selector.trim() !== ''
  );

  if (validColumns.length === 0) {
    statusEl.textContent = '❌ Specifica almeno una colonna valida.';
    statusEl.className = 'error';
    btn.disabled = false;
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url || 
        tab.url.startsWith('chrome://') || 
        tab.url.startsWith('file://') || 
        tab.url.startsWith('edge://') ||
        tab.url === 'chrome://newtab/') {
      throw new Error('Apri un sito web (es. https://esempio.com) per usare lo scraper.');
    }

    const pingResponse = await chrome.tabs.sendMessage(tab.id, { action: "ping" })
      .catch(() => null);

    if (!pingResponse?.alive) {
      throw new Error('Impossibile connettersi alla pagina. Ricarica la scheda e riprova.');
    }

    // 🟢 Esegui lo scraping con timeout più lungo
    statusEl.textContent = 'Estrazione in corso... (controlla la console per i dettagli)';
    
    const response = await Promise.race([
      chrome.tabs.sendMessage(tab.id, {
        action: "scrapeAuto",
        columns: validColumns
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: estrazione troppo lunga')), 10000)
      )
    ]);

    console.log('Risposta scraping completa:', response);

    if (response?.data) {
      window.scrapedData = response.data;
      
      if (response.data.length === 0) {
        statusEl.textContent = '⚠️ Nessun elemento trovato. Prova con un selettore diverso.';
        statusEl.className = 'error';
      } else {
        statusEl.textContent = `✅ Estratti ${response.data.length} elementi!`;
        statusEl.className = 'success';
        
        // Mostra anteprima in console
        console.log('Anteprima dati estratti:', response.data.slice(0, 3));
      }
      
      document.getElementById('csvBtn').disabled = false;
      document.getElementById('jsonBtn').disabled = false;
      document.getElementById('svgBtn').disabled = false;
    } else {
      statusEl.textContent = '❌ Errore durante l\'estrazione. Controlla la console.';
      statusEl.className = 'error';
    }
  } catch (err) {
    let msg = err.message || 'Errore sconosciuto';
    if (msg.includes('Receiving end does not exist') || msg.includes('Could not establish connection')) {
      msg = 'Impossibile comunicare con la pagina. Assicurati di essere su un sito web (non su chrome://, file://, ecc.) e ricarica la scheda.';
    }
    statusEl.textContent = `❌ ${msg}`;
    statusEl.className = 'error';
    console.error('Errore completo:', err);
  } finally {
    btn.disabled = false;
  }
});

// === DOWNLOAD (invariato) ===
document.getElementById('csvBtn').addEventListener('click', () => {
  const data = window.scrapedData || [];
  const headers = data.length > 0 ? Object.keys(data[0]) : ["Nessun dato"];
  
  let csv = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
  
  if (data.length > 0) {
    data.forEach(row => {
      const values = headers.map(h => {
        const val = String(row[h] || '').replace(/"/g, '""');
        return `"${val}"`;
      });
      csv += values.join(',') + '\n';
    });
  }

  download(csv, 'dati_estratti.csv', 'text/csv;charset=utf-8');
});

document.getElementById('jsonBtn').addEventListener('click', () => {
  const data = window.scrapedData || [];
  download(JSON.stringify(data, null, 2), 'dati_estratti.json', 'application/json');
});

document.getElementById('svgBtn').addEventListener('click', () => {
  const data = window.scrapedData || [];
  const headers = data.length > 0 ? Object.keys(data[0]) : ["Nessun dato"];
  const lineHeight = 22;
  const rowHeight = lineHeight * (headers.length + 1);
  const itemHeight = 30 + rowHeight;
  const totalHeight = 70 + (data.length || 1) * itemHeight;

  let itemsSvg = '';
  if (data.length > 0) {
    data.forEach((row, i) => {
      let y = 70 + i * itemHeight;
      itemsSvg += `<text x="20" y="${y}" font-weight="bold" font-size="14">Riga ${i + 1}</text>`;
      headers.forEach((h, j) => {
        const val = (row[h] || '').substring(0, 60);
        itemsSvg += `<text x="20" y="${y + (j + 1) * lineHeight}" font-size="12">${h}: ${val}</text>`;
      });
    });
  } else {
    itemsSvg = `<text x="20" y="70" font-size="14">Nessun dato estratto</text>`;
  }

  const svg = `<svg width="600" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
    <style>
      text { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; dominant-baseline: hanging; }
    </style>
    <rect width="100%" height="100%" fill="#ffffff"/>
    <text x="20" y="40" font-size="18" fill="#2c3e50" font-weight="bold">
      Dati estratti (${data.length} righe)
    </text>
    ${itemsSvg}
  </svg>`;

  download(svg, 'dati_estratti.svg', 'image/svg+xml');
});