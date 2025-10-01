// Rispondi a un "ping" per verificare che il content script sia attivo
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ping") {
    sendResponse({ alive: true });
    return;
  }

  if (request.action === "extractLinks") {
    const links = extractAllLinks();
    sendResponse({ links: links });
    return;
  }
});

function extractAllLinks() {
  console.log('Estrazione di tutti i link dalla pagina...');
  
  const links = [];
  const anchorElements = document.getElementsByTagName('a');
  
  console.log(`Trovati ${anchorElements.length} elementi <a> nella pagina`);
  
  // Usiamo un Set per evitare duplicati
  const seenUrls = new Set();
  
  for (let i = 0; i < anchorElements.length; i++) {
    const anchor = anchorElements[i];
    const href = anchor.href;
    
    // Salta link vuoti, javascript:, mailto:, tel:, etc.
    if (!href || 
        href.startsWith('javascript:') || 
        href.startsWith('mailto:') || 
        href.startsWith('tel:') ||
        href.startsWith('#')) {
      continue;
    }
    
    // Normalizza l'URL per evitare duplicati
    const normalizedUrl = href.split('#')[0]; // Rimuovi anchor
    const url = normalizedUrl.endsWith('/') ? normalizedUrl.slice(0, -1) : normalizedUrl;
    
    // Evita duplicati
    if (seenUrls.has(url)) {
      continue;
    }
    seenUrls.add(url);
    
    const linkData = {
      url: url,
      text: anchor.textContent?.trim() || '',
      title: anchor.title || '',
      target: anchor.target || '_self'
    };
    
    // Filtra link con testo troppo corto (probabilmente non significativi)
    if (linkData.text.length < 2 && !linkData.title) {
      continue;
    }
    
    links.push(linkData);
  }
  
  console.log(`Estratti ${links.length} link unici`);
  
  // Ordina i link alfabeticamente per URL
  links.sort((a, b) => a.url.localeCompare(b.url));
  
  return links;
}