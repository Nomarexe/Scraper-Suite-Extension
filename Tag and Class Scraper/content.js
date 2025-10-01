// Rispondi a un "ping" per verificare che il content script sia attivo
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ping") {
    sendResponse({ alive: true });
    return;
  }

  if (request.action === "scrapeAuto") {
    const { columns } = request;
    const results = scrapeAuto(columns);
    sendResponse({ data: results });
    return;
  }
});

function scrapeAuto(columns) {
  // Se c'è solo una colonna, estrai TUTTI gli elementi
  if (columns.length === 1) {
    return scrapeSingleColumn(columns[0]);
  }
  
  // Se ci sono più colonne, usa la logica di allineamento
  return scrapeMultipleColumns(columns);
}

function scrapeSingleColumn(column) {
  try {
    const selector = column.selector.trim();
    if (!selector) return [];
    
    let finalSelector;
    
    if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(selector) && selector.length <= 10) {
      // Tag HTML - seleziona TUTTI i tag, non solo quelli diretti
      finalSelector = selector.toLowerCase();
    } else {
      // Classe CSS
      finalSelector = '.' + CSS.escape(selector);
    }
    
    console.log(`Selettore singolo per "${column.columnName}": ${finalSelector}`);
    const elements = document.querySelectorAll(finalSelector);
    console.log(`Trovati ${elements.length} elementi con selettore: ${finalSelector}`);
    
    // Debug: mostra il contenuto dei primi 3 elementi
    elements.forEach((el, index) => {
      if (index < 3) {
        console.log(`Elemento ${index + 1}:`, el.textContent?.trim().substring(0, 50) + '...');
      }
    });
    
    // Crea una riga per OGNI elemento trovato
    const rows = [];
    elements.forEach(element => {
      const row = {};
      const text = element.textContent?.trim() || '';
      row[column.columnName] = text;
      rows.push(row);
    });
    
    return rows;
    
  } catch (e) {
    console.error('Errore nel selettore:', e);
    return [];
  }
}

function scrapeMultipleColumns(columns) {
  const rows = [];
  let maxElements = 0;
  const allSelectorsData = [];

  // Raccogli tutti gli elementi per ogni colonna
  columns.forEach(col => {
    try {
      const selector = col.selector.trim();
      if (!selector) {
        allSelectorsData.push([]);
        return;
      }
      
      let finalSelector;
      
      if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(selector) && selector.length <= 10) {
        finalSelector = selector.toLowerCase();
      } else {
        finalSelector = '.' + CSS.escape(selector);
      }
      
      console.log(`Selettore per "${col.columnName}": ${finalSelector}`);
      const elements = Array.from(document.querySelectorAll(finalSelector));
      console.log(`Trovati ${elements.length} elementi`);
      
      allSelectorsData.push(elements);
      maxElements = Math.max(maxElements, elements.length);
    } catch (e) {
      console.error('Errore nel selettore:', e);
      allSelectorsData.push([]);
    }
  });

  console.log(`Numero massimo di elementi trovati: ${maxElements}`);

  if (maxElements === 0) {
    return [];
  }

  // Crea le righe allineando gli elementi per posizione
  for (let i = 0; i < maxElements; i++) {
    const row = {};
    columns.forEach((col, colIndex) => {
      const elements = allSelectorsData[colIndex];
      const element = elements[i];
      row[col.columnName] = element ? element.textContent?.trim() : '';
    });
    rows.push(row);
  }

  return rows;
}