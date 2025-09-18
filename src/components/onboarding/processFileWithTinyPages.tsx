// Solution de fallback avec pages très petites (10 lignes par page)
// À utiliser si les pages de 25 lignes causent encore des timeouts

export const processFileWithTinyPages = async (
  file: File,
  selectedGigId: string,
  abortControllerRef: React.MutableRefObject<AbortController | null>,
  processingRef: React.MutableRefObject<boolean>,
  updateRealProgress: (progress: number, status: string) => void,
  setParsedLeads: React.Dispatch<React.SetStateAction<any[]>>
): Promise<{leads: any[], validation: any}> => {
  try {
    if (!processingRef.current) {
      throw new Error('Processing cancelled by user');
    }
    
    abortControllerRef.current = new AbortController();

    const userId = Cookies.get('userId');
    const gigId = selectedGigId;
    const companyId = Cookies.get('companyId');

    console.log('🔄 Starting TINY pages processing (10 lines per call)...');

    if (!gigId || !userId || !companyId) {
      throw new Error('Missing required IDs');
    }

    updateRealProgress(5, 'Analyse du fichier avec pages très petites...');
    setParsedLeads([]); // Réinitialiser l'affichage

    // Premier appel avec pageSize = 10
    const firstFormData = new FormData();
    firstFormData.append('file', file);
    firstFormData.append('page', '1');
    firstFormData.append('pageSize', '10'); // TRÈS PETIT !

    const firstResponse = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/file-processing/process-paginated`, {
      method: 'POST',
      body: firstFormData,
      signal: abortControllerRef.current?.signal
    });

    if (!firstResponse.ok) {
      throw new Error(`First API call failed: ${firstResponse.status} ${firstResponse.statusText}`);
    }

    const firstData = await firstResponse.json();
    
    if (!firstData.success) {
      throw new Error(`First API call processing failed: ${firstData.error}`);
    }

    const { pagination } = firstData.data;
    const totalPages = pagination.totalPages;
    const totalRows = pagination.totalRows;

    console.log(`📊 TINY pages: ${totalRows} total rows, ${totalPages} pages (10 lines each)`);
    console.log(`🔢 Will make ${totalPages} TINY API calls...`);

    // Traiter la première page
    const firstPageLeadsWithIds = firstData.data.leads.map(lead => ({
      ...lead,
      userId: { $oid: userId },
      companyId: { $oid: companyId },
      gigId: { $oid: gigId }
    }));

    let allLeads: any[] = [...firstPageLeadsWithIds];
    setParsedLeads([...firstPageLeadsWithIds]);

    updateRealProgress(
      Math.round((1 / totalPages) * 90), 
      `TINY API Call 1/${totalPages} terminé - ${firstPageLeadsWithIds.length} leads ajoutés`
    );

    console.log(`✅ TINY API Call 1/${totalPages}: +${firstPageLeadsWithIds.length} leads`);

    // Appels suivants avec pages de 10 lignes
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3; // Plus strict avec tiny pages

    for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
      if (!processingRef.current) {
        throw new Error('Processing cancelled by user');
      }

      console.log(`📡 TINY API Call ${currentPage}: Processing page ${currentPage}/${totalPages}...`);

      let pageFormData = new FormData();
      pageFormData.append('file', file);
      pageFormData.append('page', currentPage.toString());
      pageFormData.append('pageSize', '10'); // TRÈS PETIT !

      updateRealProgress(
        Math.round((currentPage / totalPages) * 90), 
        `TINY API Call ${currentPage}/${totalPages} en cours...`
      );

      try {
        // Retry avec pages très petites
        let pageResponse;
        let retryCount = 0;
        const maxRetries = 1; // Moins de retry avec tiny pages

        while (retryCount <= maxRetries) {
          try {
            pageResponse = await fetch(`${import.meta.env.VITE_DASHBOARD_API}/file-processing/process-paginated`, {
              method: 'POST',
              body: pageFormData,
              signal: abortControllerRef.current?.signal
            });
            break;
          } catch (fetchError) {
            retryCount++;
            if (retryCount <= maxRetries) {
              console.warn(`⚠️ TINY API Call ${currentPage} attempt ${retryCount} failed, retrying in 1s...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              pageFormData = new FormData();
              pageFormData.append('file', file);
              pageFormData.append('page', currentPage.toString());
              pageFormData.append('pageSize', '10');
            } else {
              throw fetchError;
            }
          }
        }

        if (!pageResponse || !pageResponse.ok) {
          console.warn(`⚠️ TINY API Call ${currentPage} failed with status ${pageResponse?.status || 'unknown'}, skipping...`);
          continue;
        }

        const pageData = await pageResponse.json();
        
        if (!pageData.success) {
          console.warn(`⚠️ TINY API Call ${currentPage} processing failed: ${pageData.error}, skipping...`);
          continue;
        }

        // Traiter les leads de cette page
        const pageLeadsWithIds = pageData.data.leads.map(lead => ({
          ...lead,
          userId: { $oid: userId },
          companyId: { $oid: companyId },
          gigId: { $oid: gigId }
        }));

        allLeads = [...allLeads, ...pageLeadsWithIds];
        setParsedLeads(prevLeads => [...prevLeads, ...pageLeadsWithIds]);

        const progress = Math.round((currentPage / totalPages) * 90);
        updateRealProgress(
          progress, 
          `TINY API Call ${currentPage}/${totalPages} terminé - ${pageLeadsWithIds.length} leads ajoutés (Total: ${allLeads.length})`
        );

        console.log(`✅ TINY API Call ${currentPage}/${totalPages}: +${pageLeadsWithIds.length} leads (Total: ${allLeads.length})`);

        consecutiveFailures = 0;

        // Pause plus courte avec tiny pages
        if (currentPage < totalPages) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (pageError) {
        console.warn(`⚠️ Error in TINY API Call ${currentPage}:`, pageError);
        consecutiveFailures++;
        
        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.error(`❌ Stopping TINY processing after ${maxConsecutiveFailures} consecutive failures.`);
          updateRealProgress(
            Math.round((currentPage / totalPages) * 90), 
            `❌ Arrêt après ${maxConsecutiveFailures} échecs. ${allLeads.length} leads récupérés.`
          );
          break;
        }
        
        continue;
      }
    }

    updateRealProgress(100, `✅ ${totalPages} TINY appels API terminés ! ${allLeads.length} leads récupérés`);

    console.log(`🎉 TINY processing completed: ${totalPages} API calls made, ${allLeads.length} total leads`);

    return {
      leads: allLeads,
      validation: {
        totalRows,
        validRows: allLeads.length,
        invalidRows: Math.max(0, totalRows - allLeads.length),
        errors: []
      }
    };

  } catch (error) {
    console.error('❌ Error in processFileWithTinyPages:', error);
    throw error;
  }
};
