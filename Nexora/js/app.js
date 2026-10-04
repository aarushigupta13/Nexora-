/* NEXORA APPLICATION MAIN ORCHESTRATOR */

class NexoraApp {
  constructor() {
    this.compassEngine = null;
    this.recalculator = null;
    this.compareManager = null;
    this.viewRenderers = null;
    this.insightsManager = null;

    this.activeProgrammeLevel = 'All';
    this.activeRouteMode = 'career';

    // Stable Wishlist Data Model: { universities: [...], programmes: [...] }
    let savedWishlist = { universities: [], programmes: [] };
    try {
      const raw = localStorage.getItem('nexora_wishlist') || localStorage.getItem('nexora_shortlist');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(item => {
            const id = item.id || item;
            const isUniv = NEXORA_DATA.universities.some(u => u.id === id);
            if (isUniv && !savedWishlist.universities.includes(id)) {
              savedWishlist.universities.push(id);
            } else if (!savedWishlist.programmes.includes(id)) {
              savedWishlist.programmes.push(id);
            }
          });
        } else if (parsed && typeof parsed === 'object') {
          savedWishlist.universities = parsed.universities || [];
          savedWishlist.programmes = parsed.programmes || [];
        }
      }
    } catch(e) {}
    
    this.wishlist = savedWishlist;
    this.inPageWizardState = { step: 1, interest: 'Business', level: 'Postgraduate', priority: 'Career Outcome', role: 'Digital Marketing Manager', mode: 'Online' };

    // Single source of truth for Homepage Search State
    this.currentHomepageSearchQuery = '';
    this.submittedHomepageSearchQuery = '';
    this.homepageSearchRequestId = 0;
    this.homepageSearchTimeout = null;

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  normalizeSearchQuery(raw) {
    if (!raw) return '';
    return raw.trim().replace(/\s+/g, ' ');
  }

  init() {
    // 1. Initialize Sub-modules safely
    try { this.compassEngine = new DegreeCompassEngine(); } catch(e) { console.warn('CompassEngine init error:', e); }
    try { this.initCompassIntro(); } catch(e) { console.warn('CompassIntro error:', e); }
    try { this.recalculator = new RouteRecalculator(); } catch(e) { console.warn('RouteRecalculator init error:', e); }
    try { this.compareManager = new CompareManager(); } catch(e) { console.warn('CompareManager init error:', e); }
    try { this.viewRenderers = new ViewRenderers(); } catch(e) { console.warn('ViewRenderers init error:', e); }
    try { this.customMajorNavigator = new CustomMajorNavigator(); } catch(e) { console.warn('CustomMajorNavigator init error:', e); }

    try {
      if (window.ExternalUniversityDiscovery) {
        this.discoveryEngine = new window.ExternalUniversityDiscovery();
      }
      this.discoveredUniversities = {};
      this.discoveredProgrammes = {};
      this.showAllProgrammes = false;
      this.loadDiscoveredFromStorage();
    } catch(e) { console.warn('DiscoveryEngine init error:', e); }

    // 2. Render Initial Homepage Components safely
    try { this.renderCareerCards(); } catch(e) { console.warn('renderCareerCards error:', e); }
    try { this.initCareerCardsAutoScroll(); } catch(e) { console.warn('initCareerCardsAutoScroll error:', e); }
    try { this.initCareerTabsAutoScroll(); } catch(e) { console.warn('initCareerTabsAutoScroll error:', e); }
    
    // Core Homepage Universal Search System
    try { this.initPredictiveSearch(); } catch(e) { console.error('initPredictiveSearch error:', e); }

    // Dedicated Programmes Page Universal Search System
    try { this.initAllProgPredictiveSearch(); } catch(e) { console.error('initAllProgPredictiveSearch error:', e); }

    try { this.applyProgrammeFilters(); } catch(e) { console.warn('applyProgrammeFilters error:', e); }
    try { this.initProgrammeCardsAutoScroll(); } catch(e) { console.warn('initProgrammeCardsAutoScroll error:', e); }
    try { this.initProgrammeTabsAutoScroll(); } catch(e) { console.warn('initProgrammeTabsAutoScroll error:', e); }
    try { this.renderUniversityCards(); } catch(e) { console.warn('renderUniversityCards error:', e); }
    try { this.renderInsightsCards(); } catch(e) { console.warn('renderInsightsCards error:', e); }
    try { this.renderFAQAccordions(); } catch(e) { console.warn('renderFAQAccordions error:', e); }
    try { this.initWaypoints(); } catch(e) { console.warn('initWaypoints error:', e); }
    try { this.initStackSpreadGallery(); } catch(e) { console.warn('initStackSpreadGallery error:', e); }
    try { this.initRouteExplainerAnimation(); } catch(e) { console.warn('initRouteExplainerAnimation error:', e); }
    try { this.initGlobalEvents(); } catch(e) { console.warn('initGlobalEvents error:', e); }

    // 3. Render In-Page Wizard Initial View
    try { this.initInPageWizard(); } catch(e) { console.warn('initInPageWizard error:', e); }

    // 4. Sync UI State
    try { this.updateWishlistUI(); } catch(e) { console.warn('updateWishlistUI error:', e); }

    // 5. Evaluate Route & Display Correct Page View
    try { this.handleRoute(); } catch(e) { console.warn('handleRoute error:', e); }

    console.log("NEXORA — Complete Education Discovery & Comparison Platform Initialized.");
  }

  /* ---------------------------------------------------- */
  /* SPA VIEW NAVIGATION & MASTER ROUTE MODE SWITCHER     */
  /* ---------------------------------------------------- */
  handleRoute() {
    const hash = window.location.hash || '';
    const path = window.location.pathname;

    if (hash === '#programmes' || path.endsWith('/programmes')) {
      this.navigateToProgrammesPage(false);
    } else if (hash === '#universities' || path.endsWith('/universities')) {
      this.navigateToUniversitiesPage(false);
    } else if (hash.startsWith('#university/')) {
      const univId = hash.replace('#university/', '');
      this.navigateToUniversity(univId, false);
    } else if (hash.startsWith('#programme/')) {
      const progId = hash.replace('#programme/', '');
      this.navigateToProgramme(progId, false);
    } else if (hash === '#compare' || hash.startsWith('#compare') || path.endsWith('/compare')) {
      this.navigateToComparePage(false);
    } else if (hash === '#insights' || path.endsWith('/insights')) {
      this.navigateToInsightsPage(false);
    } else {
      this.navigateToHome(null, false);
    }
  }

  initCompassIntro() {
    const overlay = document.getElementById('compassIntroOverlay');
    const backdrop = document.getElementById('introBackdrop');
    const compassWrapper = document.getElementById('compassWrapper');
    const compassHeroCard = document.getElementById('compassHeroCard');
    const brandTitle = document.querySelector('.intro-brand-title');
    const tagline = document.querySelector('.intro-tagline-text');
    const skipBtn = document.getElementById('introSkipBtn');

    if (!overlay || !compassWrapper || !compassHeroCard) return;

    // Check if directly navigating to a subpage via hash (e.g. #compare, #university/)
    const hash = window.location.hash || '';
    if (hash && hash !== '#home' && hash !== '#' && hash !== '#top') {
      if (backdrop) { backdrop.style.display = 'none'; backdrop.style.pointerEvents = 'none'; }
      overlay.style.display = 'none';
      overlay.style.pointerEvents = 'none';
      document.body.classList.remove('compass-intro-running', 'compass-intro-settling');
      document.body.classList.add('compass-intro-settled');
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const forceFrame = urlParams.get('intro');

    let isCompleted = false;

    const completeIntro = () => {
      if (isCompleted) return;
      isCompleted = true;

      // Lock homeView to prevent .page-view fadeInView re-animation during class swap
      const homeView = document.getElementById('homeView');
      if (homeView) {
        homeView.style.animation = 'none';
        homeView.style.opacity = '1';
        homeView.style.visibility = 'visible';
        homeView.style.display = 'block';
      }

      if (backdrop) {
        backdrop.classList.add('fade-out');
        backdrop.style.opacity = '0';
        backdrop.style.visibility = 'hidden';
        backdrop.style.pointerEvents = 'none';
        backdrop.style.display = 'none';
      }

      if (overlay) {
        overlay.classList.add('fade-out');
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
        overlay.style.pointerEvents = 'none';
        overlay.style.display = 'none';
      }

      document.body.classList.remove('compass-intro-running', 'compass-intro-settling');
      document.body.classList.add('compass-intro-settled');

      compassWrapper.style.transition = 'none';
      compassWrapper.style.transform = 'none';
      compassWrapper.classList.remove('compass-intro-active');

      const compassDisc = document.getElementById('compassContainer');
      if (compassDisc) {
        compassDisc.style.transition = '';
        compassDisc.style.transform = '';
      }
    };

    if (forceFrame === 'settled' || forceFrame === 'none' || forceFrame === 'skip') {
      completeIntro();
      return;
    }

    this.playCompassIntro = () => {
      isCompleted = false;
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

      if (backdrop) {
        backdrop.style.display = 'block';
        backdrop.classList.remove('fade-out');
        backdrop.style.opacity = '1';
        backdrop.style.visibility = 'visible';
        backdrop.style.pointerEvents = 'auto';
      }

      overlay.style.display = 'flex';
      overlay.classList.remove('fade-out');
      overlay.style.opacity = '1';
      overlay.style.visibility = 'visible';
      overlay.style.pointerEvents = 'auto';

      if (brandTitle) { brandTitle.style.opacity = '1'; brandTitle.style.transform = 'translateY(0)'; }
      if (tagline) { tagline.style.opacity = '1'; tagline.style.transform = 'translateY(0)'; }
      if (skipBtn) { skipBtn.style.opacity = '1'; }

      document.body.classList.remove('compass-intro-settled', 'compass-intro-settling');
      document.body.classList.add('compass-intro-running');

      // Safety timeout: auto dismiss after 2.2 seconds max
      setTimeout(() => {
        completeIntro();
      }, 2200);

      requestAnimationFrame(() => {
        const finalRect = compassWrapper.getBoundingClientRect();
        const finalCenterX = finalRect.left + finalRect.width / 2;
        const finalCenterY = finalRect.top + finalRect.height / 2;

        const vpCenterX = window.innerWidth / 2;
        const vpCenterY = window.innerHeight / 2;

        const deltaX = vpCenterX - finalCenterX;
        const deltaY = vpCenterY - finalCenterY;

        compassWrapper.classList.add('compass-intro-active');
        compassWrapper.style.transition = 'none';
        compassWrapper.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.05)`;

        const compassDisc = document.getElementById('compassContainer');
        if (compassDisc) {
          compassDisc.style.transition = 'none';
          compassDisc.style.transform = 'rotate(0deg)';
        }

        setTimeout(() => {
          if (isCompleted) return;
          compassWrapper.style.transition = 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)';
          compassWrapper.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.15)`;

          if (compassDisc) {
            compassDisc.style.transition = 'transform 1.0s cubic-bezier(0.22, 1, 0.36, 1)';
            compassDisc.style.transform = 'rotate(360deg)';
          }
        }, 200);

        // Begin smooth page fade-in while compass rotation is in active motion (no lag/dead pause)
        setTimeout(() => {
          if (isCompleted) return;
          document.body.classList.remove('compass-intro-running');
          document.body.classList.add('compass-intro-settling');
          if (overlay) overlay.style.opacity = '0';
          if (backdrop) backdrop.style.opacity = '0';
        }, 800);

        setTimeout(() => {
          if (isCompleted) return;
          completeIntro();
        }, 1300);
      });
    };

    // INSTANT DISMISS ON ANY USER INTERACTION (SKIP BTN, OVERLAY CLICK, ESC KEY, TAP, SCROLL)
    if (skipBtn) {
      skipBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        completeIntro();
      });
    }

    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      completeIntro();
    });

    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        e.stopPropagation();
        completeIntro();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (!isCompleted) completeIntro();
    });

    window.addEventListener('wheel', () => {
      if (!isCompleted) completeIntro();
    }, { passive: true });

    window.addEventListener('touchstart', () => {
      if (!isCompleted) completeIntro();
    }, { passive: true });

    // Start intro sequence on load
    this.playCompassIntro();
  }

  showView(viewId) {
    const views = document.querySelectorAll('.page-view');
    views.forEach(v => {
      v.style.display = 'none';
      v.classList.remove('active');
    });

    const target = document.getElementById(viewId);
    if (target) {
      target.style.display = 'block';
      target.classList.add('active');
    }

    // Update navbar active state
    const navLinks = document.querySelectorAll('.nav-links .nav-link');
    navLinks.forEach(l => l.classList.remove('active'));
    if (viewId === 'allProgrammesView') {
      const progNavBtn = document.querySelector('.nav-links a[onclick*="navigateToProgrammesPage"]');
      if (progNavBtn) progNavBtn.classList.add('active');
    } else if (viewId === 'allUniversitiesView') {
      const univNavBtn = document.querySelector('.nav-links a[onclick*="navigateToUniversitiesPage"]');
      if (univNavBtn) univNavBtn.classList.add('active');
    } else if (viewId === 'compareView') {
      const compareNavBtn = document.querySelector('.nav-links a[onclick*="navigateToComparePage"]');
      if (compareNavBtn) compareNavBtn.classList.add('active');
    } else if (viewId === 'insightsView') {
      const insightsNavBtn = document.querySelector('.nav-links a[onclick*="navigateToInsightsPage"]');
      if (insightsNavBtn) insightsNavBtn.classList.add('active');
    } else if (viewId === 'homeView') {
      const homeNavBtn = document.querySelector('.nav-links a[onclick*="navigateToHome()"]');
      if (homeNavBtn) homeNavBtn.classList.add('active');
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  navigateToHome(sectionId, updateHistory = true) {
    if (sectionId === 'compare') {
      this.navigateToComparePage(updateHistory);
      return;
    }
    if (sectionId === 'programmes') {
      this.navigateToProgrammesPage(updateHistory);
      return;
    }
    if (sectionId === 'universities') {
      this.navigateToUniversitiesPage(updateHistory);
      return;
    }
    if (sectionId === 'insights') {
      this.navigateToInsightsPage(updateHistory);
      return;
    }
    this.showView('homeView');
    if (updateHistory) {
      const targetHash = sectionId ? `#${sectionId}` : '#home';
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    }
    if (sectionId) {
      setTimeout(() => this.scrollToSection(sectionId), 50);
    }
  }

  navigateToProgrammesPage(updateHistory = true) {
    this.showView('allProgrammesView');
    this.applyProgrammeFilters();
    try { this.initAllProgPredictiveSearch(); } catch(e) {}
    if (updateHistory) {
      if (window.location.hash !== '#programmes') {
        window.location.hash = '#programmes';
      }
    }
  }

  navigateToProgrammesForUniversity(univId) {
    this.activeUniversityFilter = univId;
    const selectEl = document.getElementById('progUniversityFilter');
    if (selectEl) selectEl.value = univId;
    this.navigateToProgrammesPage(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  clearUniversityFilter() {
    this.activeUniversityFilter = 'ALL';
    const selectEl = document.getElementById('progUniversityFilter');
    if (selectEl) selectEl.value = 'ALL';
    this.applyProgrammeFilters();
  }

  handleProgUniversitySelectChange(val) {
    this.activeUniversityFilter = val;
    this.applyProgrammeFilters();
  }

  navigateToUniversitiesPage(updateHistory = true) {
    this.showView('allUniversitiesView');
    this.filterUniversityCards();
    if (updateHistory) {
      if (window.location.hash !== '#universities') {
        window.location.hash = '#universities';
      }
    }
  }

  navigateToInsightsPage(updateHistory = true) {
    this.showView('insightsView');
    this.renderFullInsightsPage();
    if (updateHistory) {
      if (window.location.hash !== '#insights') {
        window.location.hash = '#insights';
      }
    }
  }

  /* ---------------------------------------------------- */
  /* DEDICATED COMPARE PAGE (#compareView) MANAGEMENT     */
  /* ---------------------------------------------------- */
  navigateToComparePage(updateHistory = true) {
    this.showView('compareView');
    this.renderComparePage();
    if (updateHistory) {
      if (window.location.hash !== '#compare') {
        window.location.hash = '#compare';
      }
    }
  }

  onCompareItemsChanged() {
    const compareView = document.getElementById('compareView');
    if (compareView && compareView.classList.contains('active')) {
      this.renderComparePage();
    }
  }

  switchComparePageTab(tabName) {
    this.comparePageTab = tabName;
    this.renderComparePage();
  }

  renderComparePage() {
    const container = document.getElementById('compareView');
    if (!container) return;

    const selectedUnivIds = (this.compareManager && Array.isArray(this.compareManager.selectedUniversities))
      ? this.compareManager.selectedUniversities : [];
    const selectedProgIds = (this.compareManager && Array.isArray(this.compareManager.selectedProgrammes))
      ? this.compareManager.selectedProgrammes : [];
    const totalCount = selectedUnivIds.length + selectedProgIds.length;

    if (totalCount === 0) {
      container.innerHTML = this.renderCompareEmptyState();
    } else {
      container.innerHTML = this.renderCompareActiveState(selectedUnivIds, selectedProgIds);
    }
  }

  renderCompareEmptyState() {
    return `
      <!-- TOP BREADCRUMB NAV -->
      <div class="page-view-header">
        <div class="container" style="max-width: 1280px;">
          <div class="page-breadcrumb-nav">
            <button class="back-link-btn" onclick="app.navigateToHome()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              <span>Back to Home</span>
            </button>
            <div class="breadcrumb-trail">
              <span class="crumb" onclick="app.navigateToHome()">Home</span>
              <span class="crumb-sep">/</span>
              <span class="crumb active">Compare</span>
            </div>
          </div>
        </div>
      </div>

      <!-- EMPTY STATE PRESENTATION CARD -->
      <section class="compare-empty-wrapper">
        <div class="compare-empty-card">
          <!-- Icon Badge -->
          <div class="compare-empty-icon-badge">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--navy)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="3" x2="12" y2="21" />
              <path d="M4 7l8-4 8 4" />
              <path d="M4 7l-2 6a4 4 0 0 0 8 0L8 7" />
              <path d="M16 7l-2 6a4 4 0 0 0 8 0L20 7" />
              <line x1="8" y1="21" x2="16" y2="21" />
            </svg>
          </div>

          <div class="compare-empty-eyebrow">
            SIDE-BY-SIDE EVALUATION
          </div>

          <!-- Main heading requested by user: "Start Comparing Now" -->
          <h1 class="compare-empty-title">
            Start Comparing Now
          </h1>

          <p class="compare-empty-subtitle">
            You haven't added any universities or programmes to your compare list yet. Select up to 3 options to evaluate eligibility, fee breakdowns, NAAC accreditations, and curriculum side-by-side.
          </p>

          <!-- Two buttons requested by user: "Explore universities" and "Explore Programmes" -->
          <div class="compare-empty-actions">
            <button class="btn btn-navy btn-lg" type="button" onclick="app.navigateToUniversitiesPage();">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/></svg>
              <span>Explore universities</span>
            </button>

            <button class="btn btn-primary btn-lg" type="button" onclick="app.navigateToProgrammesPage();">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              <span>Explore Programmes</span>
            </button>
          </div>

          <!-- 3-Step Quick Guide Cards -->
          <div class="compare-steps-grid">
            <div class="compare-step-card">
              <div class="compare-step-num">1</div>
              <div class="compare-step-title">Browse Institutions</div>
              <div class="compare-step-desc">Search vetted universities or filter by degree level, online delivery, and NAAC status.</div>
            </div>
            <div class="compare-step-card">
              <div class="compare-step-num">2</div>
              <div class="compare-step-title">Click "+ Add to Compare"</div>
              <div class="compare-step-desc">Add up to 3 universities or programmes to your compare list from any card or detail page.</div>
            </div>
            <div class="compare-step-card">
              <div class="compare-step-num">3</div>
              <div class="compare-step-title">Compare &amp; Decide</div>
              <div class="compare-step-desc">View high-contrast side-by-side matrices comparing fees, semester breakdowns, and approvals.</div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  renderCompareActiveState(selectedUnivIds, selectedProgIds) {
    const totalCount = selectedUnivIds.length + selectedProgIds.length;

    // Resolve active tab
    if (!this.comparePageTab) {
      this.comparePageTab = selectedUnivIds.length > 0 ? 'universities' : 'programmes';
    } else {
      if (this.comparePageTab === 'universities' && selectedUnivIds.length === 0) {
        this.comparePageTab = 'programmes';
      } else if (this.comparePageTab === 'programmes' && selectedProgIds.length === 0) {
        this.comparePageTab = 'universities';
      }
    }

    const activeTab = this.comparePageTab;

    // Load universities data
    const universities = selectedUnivIds
      .map(id => this.getUniversityById(id))
      .filter(Boolean);

    // Load programmes data
    const programmes = selectedProgIds
      .map(id => this.getProgrammeById(id))
      .filter(Boolean);

    // Build ribbon pills
    let pillsHtml = '';
    universities.forEach(u => {
      pillsHtml += `
        <div class="compare-page-pill">
          <span>🏛️ ${u.shortName}</span>
          <span class="remove-pill-btn" title="Remove from comparison" onclick="app.compareManager.removeUniversity('${u.id}')">&times;</span>
        </div>
      `;
    });
    programmes.forEach(p => {
      pillsHtml += `
        <div class="compare-page-pill">
          <span>🎓 ${p.shortDegree || p.name} (${p.universityName})</span>
          <span class="remove-pill-btn" title="Remove from comparison" onclick="app.compareManager.removeProgramme('${p.id}')">&times;</span>
        </div>
      `;
    });

    let matrixHtml = '';
    if (activeTab === 'universities') {
      matrixHtml = this.renderUniversitiesMatrixTable(universities);
    } else {
      matrixHtml = this.renderProgrammesMatrixTable(programmes);
    }

    return `
      <!-- TOP BREADCRUMB NAV -->
      <div class="page-view-header">
        <div class="container" style="max-width: 1280px;">
          <div class="page-breadcrumb-nav">
            <button class="back-link-btn" onclick="app.navigateToHome()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              <span>Back to Home</span>
            </button>
            <div class="breadcrumb-trail">
              <span class="crumb" onclick="app.navigateToHome()">Home</span>
              <span class="crumb-sep">/</span>
              <span class="crumb active">Compare</span>
            </div>
          </div>
        </div>
      </div>

      <!-- MAIN COMPARE CONTENT SECTION -->
      <section class="section-padding bg-pure-white" style="padding-top: 36px; padding-bottom: 70px;">
        <div class="container" style="max-width: 1280px;">

          <!-- SECTION HEADER -->
          <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
            <div>
              <span class="section-eyebrow">VERIFIED SIDE-BY-SIDE MATRIX</span>
              <h1 class="section-title" style="font-size: 2.2rem; margin-bottom: 6px;">Compare Your Selected Options</h1>
              <p class="section-subtitle" style="margin-bottom: 0;">Side-by-side evaluation of UGC-DEB recognition, fee structures, duration, and career services.</p>
            </div>
          </div>

          <!-- ACTIVE SELECTION RIBBON -->
          <div class="compare-active-ribbon">
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <span style="font-size: 0.85rem; font-weight: 750; color: var(--navy);">In Compare List (${totalCount}/3):</span>
              <div class="compare-pills-list">
                ${pillsHtml}
              </div>
            </div>

            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              ${selectedUnivIds.length < 3 ? `
                <button class="btn btn-secondary btn-sm" onclick="app.navigateToUniversitiesPage()">
                  + Add University
                </button>
              ` : ''}
              ${selectedProgIds.length < 3 ? `
                <button class="btn btn-secondary btn-sm" onclick="app.navigateToProgrammesPage()">
                  + Add Programme
                </button>
              ` : ''}
              <button class="btn btn-secondary btn-sm" style="color: #DC2626; border-color: rgba(220,38,38,0.3);" onclick="app.compareManager.clearAll()">
                Clear All
              </button>
            </div>
          </div>

          <!-- TABS (Universities vs Programmes) -->
          <div class="compare-tabs-bar">
            <button class="btn ${activeTab === 'universities' ? 'btn-primary' : 'btn-secondary'}" onclick="app.switchComparePageTab('universities')">
              🏛️ Universities (${universities.length})
            </button>
            <button class="btn ${activeTab === 'programmes' ? 'btn-primary' : 'btn-secondary'}" onclick="app.switchComparePageTab('programmes')">
              🎓 Programmes (${programmes.length})
            </button>
          </div>

          <!-- COMPARISON MATRIX TABLE -->
          ${matrixHtml}

        </div>
      </section>
    `;
  }

  renderUniversitiesMatrixTable(universities) {
    if (!universities || universities.length === 0) {
      return `
        <div style="background: #FFFFFF; border: 1.5px solid var(--border-grey); border-radius: 16px; padding: 48px 24px; text-align: center; margin-top: 20px;">
          <div style="font-size: 2.2rem; margin-bottom: 12px;">🏛️</div>
          <h3 style="font-size: 1.3rem; color: var(--navy); font-weight: 800; margin-bottom: 8px;">No Universities in Compare List</h3>
          <p style="color: var(--charcoal-muted); font-size: 0.95rem; max-width: 480px; margin: 0 auto 20px auto;">
            Add up to 3 universities to compare NIRF rankings, approvals, annual fees, and learning portals side-by-side.
          </p>
          <button class="btn btn-navy btn-md" onclick="app.navigateToUniversitiesPage()">
            Explore Universities
          </button>
        </div>
      `;
    }

    const hasSlot = universities.length < 3;

    return `
      <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin-top: 10px; border-radius: 14px; box-shadow: 0 4px 20px rgba(0,27,102,0.06);">
        <table class="compare-matrix-table" style="width: 100%; min-width: 720px;">
          <thead>
            <tr>
              <th class="compare-param-th">Decision Parameter</th>
              ${universities.map(u => `
                <th class="compare-col-th">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div>
                      <div style="font-size: 0.75rem; color: #86EFAC; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">${u.location}</div>
                      <div style="font-size: 1.15rem; font-weight: 850; color: #FFFFFF; margin-top: 4px; line-height: 1.3;">${u.name}</div>
                    </div>
                    <button type="button" title="Remove university" onclick="app.compareManager.removeUniversity('${u.id}')" style="background: rgba(255,255,255,0.15); border: none; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(220,38,38,0.8)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">&times;</button>
                  </div>
                  <div style="margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                    <span class="badge" style="background: rgba(255,255,255,0.2); color: #fff; font-size: 0.72rem;">Est. ${u.established}</span>
                    <span class="badge" style="background: #005A2B; color: #86EFAC; font-size: 0.72rem; font-weight: 700;">★ ${u.rating} / 5.0</span>
                  </div>
                </th>
              `).join('')}
              ${hasSlot ? `
                <th class="compare-add-slot-th">
                  <div style="padding: 16px 8px;">
                    <div style="font-size: 1.6rem; margin-bottom: 6px;">🏛️</div>
                    <div style="font-weight: 750; color: var(--navy); font-size: 0.95rem; margin-bottom: 8px;">Add University</div>
                    <button class="btn btn-navy btn-sm" onclick="app.navigateToUniversitiesPage()">+ Select</button>
                  </div>
                </th>
              ` : ''}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="compare-field-label">Recognition &amp; Approvals</td>
              ${universities.map(u => `
                <td>
                  <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                    ${(u.approvals || []).map(a => `<span class="badge badge-trust" style="font-size: 0.75rem;">${a}</span>`).join('')}
                  </div>
                </td>
              `).join('')}
              ${hasSlot ? `<td class="compare-add-slot-td"></td>` : ''}
            </tr>
            <tr>
              <td class="compare-field-label">Accreditation &amp; Autonomy</td>
              ${universities.map(u => `
                <td>
                  <strong style="color: var(--navy);">${(u.accreditationDetails && u.accreditationDetails.naacGrade) || 'NAAC Accredited'}</strong>
                  <div style="font-size: 0.8rem; color: var(--charcoal-muted); margin-top: 3px;">
                    ${(u.accreditationDetails && u.accreditationDetails.autonomy) || 'UGC Entitled University'}
                  </div>
                </td>
              `).join('')}
              ${hasSlot ? `<td class="compare-add-slot-td"></td>` : ''}
            </tr>
            <tr>
              <td class="compare-field-label">Degrees Offered</td>
              ${universities.map(u => `
                <td>
                  <strong style="font-size: 1.05rem; color: var(--navy);">${u.totalProgrammes}+ Degrees</strong>
                  <div style="font-size: 0.78rem; color: var(--charcoal-muted); margin-top: 2px;">UG &amp; PG Entitled</div>
                </td>
              `).join('')}
              ${hasSlot ? `<td class="compare-add-slot-td"></td>` : ''}
            </tr>
            <tr>
              <td class="compare-field-label">Starting Fee Range</td>
              ${universities.map(u => `
                <td>
                  <div style="font-size: 1.1rem; font-weight: 850; color: var(--trust-green);">${u.startingFee}</div>
                  <div style="font-size: 0.78rem; color: var(--charcoal-muted); margin-top: 2px;">Semester installment plans available</div>
                </td>
              `).join('')}
              ${hasSlot ? `<td class="compare-add-slot-td"></td>` : ''}
            </tr>
            <tr>
              <td class="compare-field-label">Delivery Mode &amp; LMS</td>
              ${universities.map(u => `
                <td>
                  <div style="font-weight: 700; color: var(--navy); font-size: 0.88rem;">${(u.learningExperience && u.learningExperience.lmsApp) || 'Mobile & Web LMS Portal'}</div>
                  <div style="font-size: 0.8rem; color: var(--charcoal-muted); margin-top: 4px;">Live weekend classes, recorded video archives &amp; digital library.</div>
                </td>
              `).join('')}
              ${hasSlot ? `<td class="compare-add-slot-td"></td>` : ''}
            </tr>
            <tr>
              <td class="compare-field-label">Examination Mode</td>
              ${universities.map(u => `
                <td>
                  <strong style="color: var(--navy); font-size: 0.88rem;">100% Online Proctored</strong>
                  <div style="font-size: 0.8rem; color: var(--charcoal-muted); margin-top: 2px;">Computer-based remote proctored exams from home.</div>
                </td>
              `).join('')}
              ${hasSlot ? `<td class="compare-add-slot-td"></td>` : ''}
            </tr>
            <tr>
              <td class="compare-field-label">Academic Eligibility</td>
              ${universities.map(u => `
                <td style="font-size: 0.85rem; color: var(--charcoal);">
                  Graduation in any stream (50% min) for PG; 10+2 from recognized board for UG.
                </td>
              `).join('')}
              ${hasSlot ? `<td class="compare-add-slot-td"></td>` : ''}
            </tr>
            <tr>
              <td class="compare-field-label">Career Enablement</td>
              ${universities.map(u => `
                <td>
                  <div style="font-size: 0.85rem; color: var(--charcoal); margin-bottom: 6px;">
                    ${(u.careerSupport && u.careerSupport.services) || 'Resume workshops, interview preparation & career guidance.'}
                  </div>
                  ${(u.careerSupport && u.careerSupport.partners) ? `
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                      ${u.careerSupport.partners.slice(0, 4).map(p => `<span class="badge badge-grey" style="font-size: 0.72rem;">${p}</span>`).join('')}
                    </div>
                  ` : ''}
                </td>
              `).join('')}
              ${hasSlot ? `<td class="compare-add-slot-td"></td>` : ''}
            </tr>
            <tr>
              <td class="compare-field-label">Student Rating &amp; Reviews</td>
              ${universities.map(u => `
                <td>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-weight: 800; color: var(--navy); font-size: 1.05rem;">★ ${u.rating}</span>
                    <span style="font-size: 0.8rem; color: var(--charcoal-muted);">(${u.reviewCount} reviews)</span>
                  </div>
                </td>
              `).join('')}
              ${hasSlot ? `<td class="compare-add-slot-td"></td>` : ''}
            </tr>
            <tr>
              <td class="compare-field-label">Actions</td>
              ${universities.map(u => `
                <td>
                  <button class="btn btn-navy btn-sm" style="width: 100%; margin-bottom: 8px;" onclick="app.navigateToUniversity('${u.id}')">
                    View University Page
                  </button>
                  <button class="btn btn-primary btn-sm" style="width: 100%; margin-bottom: 8px;" onclick="app.openInfoRequestModal('${u.name}', 'University Packet')">
                    Get Info Packet
                  </button>
                  <button class="btn btn-secondary btn-sm" style="width: 100%; font-size: 0.8rem; color: #DC2626; border-color: rgba(220,38,38,0.25);" onclick="app.compareManager.removeUniversity('${u.id}')">
                    Remove
                  </button>
                </td>
              `).join('')}
              ${hasSlot ? `<td class="compare-add-slot-td"></td>` : ''}
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  renderProgrammesMatrixTable(programmes) {
    if (!programmes || programmes.length === 0) {
      return `
        <div style="background: #FFFFFF; border: 1.5px solid var(--border-grey); border-radius: 16px; padding: 48px 24px; text-align: center; margin-top: 20px;">
          <div style="font-size: 2.2rem; margin-bottom: 12px;">🎓</div>
          <h3 style="font-size: 1.3rem; color: var(--navy); font-weight: 800; margin-bottom: 8px;">No Programmes in Compare List</h3>
          <p style="color: var(--charcoal-muted); font-size: 0.95rem; max-width: 480px; margin: 0 auto 20px auto;">
            Add up to 3 online degree programmes to compare specialisations, fees, semester structures, and career outcomes side-by-side.
          </p>
          <button class="btn btn-primary btn-md" onclick="app.navigateToProgrammesPage()">
            Explore Programmes
          </button>
        </div>
      `;
    }

    const hasSlot = programmes.length < 3;

    return `
      <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin-top: 10px; border-radius: 14px; box-shadow: 0 4px 20px rgba(0,27,102,0.06);">
        <table class="compare-matrix-table" style="width: 100%; min-width: 720px;">
          <thead>
            <tr>
              <th class="compare-param-th">Degree Parameter</th>
              ${programmes.map(p => `
                <th class="compare-col-th">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div>
                      <div style="font-size: 0.75rem; color: #86EFAC; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">${p.universityName}</div>
                      <div style="font-size: 1.15rem; font-weight: 850; color: #FFFFFF; margin-top: 4px; line-height: 1.3;">${p.name}</div>
                    </div>
                    <button type="button" title="Remove programme" onclick="app.compareManager.removeProgramme('${p.id}')" style="background: rgba(255,255,255,0.15); border: none; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(220,38,38,0.8)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">&times;</button>
                  </div>
                  <div style="margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                    <span class="badge" style="background: rgba(255,255,255,0.2); color: #fff; font-size: 0.72rem;">${p.level} Degree</span>
                    <span class="badge" style="background: #005A2B; color: #86EFAC; font-size: 0.72rem; font-weight: 700;">★ ${p.rating} / 5.0</span>
                  </div>
                </th>
              `).join('')}
              ${hasSlot ? `
                <th class="compare-add-slot-th">
                  <div style="padding: 16px 8px;">
                    <div style="font-size: 1.6rem; margin-bottom: 6px;">🎓</div>
                    <div style="font-weight: 750; color: var(--navy); font-size: 0.95rem; margin-bottom: 8px;">Add Programme</div>
                    <button class="btn btn-primary btn-sm" onclick="app.navigateToProgrammesPage()">+ Select</button>
                  </div>
                </th>
              ` : ''}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="compare-field-label">Parent University</td>
              ${programmes.map(p => `
                <td>
                  <strong style="color: var(--navy); cursor: pointer;" onclick="app.navigateToUniversity('${p.universityId}')">🏛️ ${p.universityName}</strong>
                  <div style="font-size: 0.78rem; color: var(--charcoal-muted); margin-top: 2px;">Click to view full campus profile</div>
                </td>
              `).join('')}
              ${hasSlot ? `<td class="compare-add-slot-td"></td>` : ''}
            </tr>
            <tr>
              <td class="compare-field-label">Level &amp; Duration</td>
              ${programmes.map(p => `
                <td>
                  <strong style="color: var(--navy); font-size: 0.92rem;">${p.level} Degree</strong>
                  <div style="font-size: 0.85rem; color: var(--charcoal); margin-top: 2px;">${p.duration}</div>
                </td>
              `).join('')}
              ${hasSlot ? `<td class="compare-add-slot-td"></td>` : ''}
            </tr>
            <tr>
              <td class="compare-field-label">Fee Breakdown</td>
              ${programmes.map(p => `
                <td>
                  <div style="font-size: 1.15rem; font-weight: 850; color: var(--trust-green);">${p.totalFee} Total</div>
                  <div style="font-size: 0.82rem; color: var(--charcoal-muted); margin-top: 2px;">${p.semesterFee}</div>
                  <div style="font-size: 0.76rem; color: var(--trust-green); font-weight: 700; margin-top: 4px;">
                    ${p.emiAvailable ? '✓ Zero-Cost EMI Available' : 'Standard Installments'}
                  </div>
                </td>
              `).join('')}
              ${hasSlot ? `<td class="compare-add-slot-td"></td>` : ''}
            </tr>
            <tr>
              <td class="compare-field-label">Academic Eligibility</td>
              ${programmes.map(p => `
                <td style="font-size: 0.85rem; color: var(--charcoal); line-height: 1.5;">
                  ${p.eligibility}
                </td>
              `).join('')}
              ${hasSlot ? `<td class="compare-add-slot-td"></td>` : ''}
            </tr>
            <tr>
              <td class="compare-field-label">Delivery &amp; Exams</td>
              ${programmes.map(p => `
                <td>
                  <strong style="color: var(--navy); font-size: 0.88rem;">${p.mode}</strong>
                  <div style="font-size: 0.8rem; color: var(--charcoal-muted); margin-top: 2px;">Online proctored exams with flexible slot selection.</div>
                </td>
              `).join('')}
              ${hasSlot ? `<td class="compare-add-slot-td"></td>` : ''}
            </tr>
            <tr>
              <td class="compare-field-label">Specialisations Offered</td>
              ${programmes.map(p => `
                <td>
                  <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                    ${(p.specialisations || []).map(s => `<span class="badge badge-grey" style="font-size: 0.74rem;">${s}</span>`).join('')}
                  </div>
                </td>
              `).join('')}
              ${hasSlot ? `<td class="compare-add-slot-td"></td>` : ''}
            </tr>
            <tr>
              <td class="compare-field-label">Target Career Paths</td>
              ${programmes.map(p => `
                <td>
                  <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                    ${(p.careerPaths || []).map(c => `<span class="badge badge-trust" style="font-size: 0.74rem;">${c}</span>`).join('')}
                  </div>
                </td>
              `).join('')}
              ${hasSlot ? `<td class="compare-add-slot-td"></td>` : ''}
            </tr>
            <tr>
              <td class="compare-field-label">Student Rating &amp; Reviews</td>
              ${programmes.map(p => `
                <td>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-weight: 800; color: var(--navy); font-size: 1.05rem;">★ ${p.rating}</span>
                    <span style="font-size: 0.8rem; color: var(--charcoal-muted);">(${p.reviewCount} evaluations)</span>
                  </div>
                </td>
              `).join('')}
              ${hasSlot ? `<td class="compare-add-slot-td"></td>` : ''}
            </tr>
            <tr>
              <td class="compare-field-label">Actions</td>
              ${programmes.map(p => `
                <td>
                  <button class="btn btn-navy btn-sm" style="width: 100%; margin-bottom: 8px;" onclick="app.navigateToProgramme('${p.id}')">
                    View Programme Page
                  </button>
                  <button class="btn btn-primary btn-sm" style="width: 100%; margin-bottom: 8px;" onclick="app.openInfoRequestModal('${p.name}', 'Programme Packet')">
                    Get Info Packet
                  </button>
                  <button class="btn btn-secondary btn-sm" style="width: 100%; font-size: 0.8rem; color: #DC2626; border-color: rgba(220,38,38,0.25);" onclick="app.compareManager.removeProgramme('${p.id}')">
                    Remove
                  </button>
                </td>
              `).join('')}
              ${hasSlot ? `<td class="compare-add-slot-td"></td>` : ''}
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  navigateToUniversity(univId, updateHistory = true) {
    const container = document.getElementById('universityView');
    if (container && this.viewRenderers) {
      this.viewRenderers.renderFullUniversityPage(univId, container);
      this.showView('universityView');
      setTimeout(() => {
        this.initStatsCounters();
        this.triggerRapidRollingNumbers(container);
      }, 60);
      if (updateHistory) {
        const targetHash = `#university/${univId}`;
        if (window.location.hash !== targetHash) {
          window.location.hash = targetHash;
        }
      }
    }
  }

  initStatsCounters() {
    const counterElements = document.querySelectorAll('.univ-stat-number');
    if (!counterElements.length) return;

    const animateElement = (el, index = 0) => {
      const rawTarget = el.getAttribute('data-target');
      const targetVal = parseFloat(rawTarget);
      const prefix = el.getAttribute('data-prefix') || '';
      const suffix = el.getAttribute('data-suffix') || '';

      if (isNaN(targetVal)) return;

      const startVal = targetVal > 1900 ? Math.max(1900, targetVal - 50) : 0;
      const duration = 850;
      const staggerDelay = index * 70;

      setTimeout(() => {
        const startTime = performance.now();
        const updateCounter = (currentTime) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeProgress = 1 - Math.pow(1 - progress, 3);
          const currentVal = Math.floor(startVal + (targetVal - startVal) * easeProgress);

          el.textContent = `${prefix}${currentVal}${suffix}`;

          if (progress < 1) {
            requestAnimationFrame(updateCounter);
          } else {
            el.textContent = `${prefix}${targetVal}${suffix}`;
          }
        };
        requestAnimationFrame(updateCounter);
      }, staggerDelay);
    };

    counterElements.forEach((el, index) => {
      animateElement(el, index);
    });
  }

  selectProgrammeSpecialisation(specName, btn, progId) {
    const parent = btn ? btn.closest('.specialisation-chips-grid') : null;
    if (parent) {
      parent.querySelectorAll('.spec-chip-card').forEach(c => c.classList.remove('active'));
      if (btn) btn.classList.add('active');
    }

    const detailBox = document.getElementById('progSpecDetailBox');
    if (!detailBox) return;

    const prog = progId ? (this.getProgrammeById ? this.getProgrammeById(progId) : (NEXORA_DATA.programmes || []).find(p => p.id === progId)) : null;
    const univName = prog ? (prog.universityName || '') : '';
    const progName = prog ? (prog.name || '') : '';
    const careers = (prog && prog.careerPaths) ? prog.careerPaths.slice(0, 3) : ['Senior Specialist', 'Strategy Consultant', 'Domain Lead'];

    detailBox.innerHTML = `
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 12px;">
        <div>
          <div style="font-size: 0.74rem; font-weight: 800; color: var(--trust-green); text-transform: uppercase; letter-spacing: 0.5px;">ACTIVE SPECIALISATION ELECTIVE</div>
          <h3 style="font-size: 1.25rem; font-weight: 850; color: var(--navy); margin: 4px 0 0 0;">${specName}</h3>
        </div>
        <button class="btn btn-primary btn-sm" onclick="app.openInfoRequestModal('${progName.replace(/'/g, "\\'")} (${specName.replace(/'/g, "\\'")})', '${univName.replace(/'/g, "\\'")}')" style="border-radius: 50px; font-weight: 750;">
          Inquire About Track →
        </button>
      </div>

      <p style="color: #334155; font-size: 0.92rem; line-height: 1.6; margin-bottom: 14px;">
        The <strong>${specName}</strong> track equips students with targeted domain expertise, advanced specialized projects, and high-demand competencies aligned directly with corporate hiring requirements.
      </p>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px;">
        <div>
          <div style="font-size: 0.72rem; font-weight: 750; color: #64748B; text-transform: uppercase;">Aligned Industry Career Roles</div>
          <div style="font-size: 0.88rem; font-weight: 750; color: var(--navy); margin-top: 4px;">${careers.join(' • ')}</div>
        </div>
        <div>
          <div style="font-size: 0.72rem; font-weight: 750; color: #64748B; text-transform: uppercase;">Curriculum Integration</div>
          <div style="font-size: 0.88rem; font-weight: 750; color: var(--trust-green); margin-top: 4px;">Dedicated Core &amp; Elective Modules</div>
        </div>
      </div>
    `;
  }

  navigateToProgramme(progId, updateHistory = true) {
    const container = document.getElementById('programmeView');
    if (container && this.viewRenderers) {
      this.viewRenderers.renderFullProgrammePage(progId, container);
      this.showView('programmeView');
      if (updateHistory) {
        const targetHash = `#programme/${progId}`;
        if (window.location.hash !== targetHash) {
          window.location.hash = targetHash;
        }
      }
    }
  }

  navigateToPersonalizedRoute() {
    if (this.currentView !== 'homeView') {
      this.showView('homeView');
      if (window.location.hash !== '' && window.location.hash !== '#home') {
        history.pushState(null, null, window.location.pathname);
      }
    }

    this.switchRouteMode('personalized');
  }

  /* MASTER ROUTE MODE SWITCHER (Career-First / Study-First / Personalized) */
  switchRouteMode(mode) {
    if (this.currentView !== 'homeView') {
      this.showView('homeView');
    }

    this.activeRouteMode = mode;

    const tabs = document.querySelectorAll('.route-mode-tab');
    tabs.forEach(t => {
      if (t.getAttribute('data-mode') === mode) {
        t.classList.add('active', 'btn-primary');
        t.classList.remove('btn-secondary');
      } else {
        t.classList.remove('active', 'btn-primary');
        t.classList.add('btn-secondary');
      }
    });

    const cModule = document.getElementById('careerFirstModule');
    const sModule = document.getElementById('studyFirstModule');
    const pModule = document.getElementById('personalizedModule');

    if (cModule) cModule.style.display = mode === 'career' ? 'block' : 'none';
    if (sModule) sModule.style.display = mode === 'study' ? 'block' : 'none';
    if (pModule) pModule.style.display = mode === 'personalized' ? 'block' : 'none';

    if (mode === 'personalized') {
      this.initInPageWizard();
      this.scrollToSection('routeModeSwitcherBar');
    } else {
      this.scrollToSection('careerRouteSection');
    }
  }

  /* ---------------------------------------------------- */
  /* PERSONALIZED IN-PAGE 5-STEP WIZARD ASSESSMENT        */
  /* ---------------------------------------------------- */
  initInPageWizard() {
    const container = document.getElementById('personalizedWizardContainer');
    if (!container) return;

    this.renderInPageWizardStep(this.inPageWizardState.step);
  }

  setInPageWizardChoice(key, value, nextStep) {
    this.inPageWizardState[key] = value;
    this.inPageWizardState.step = nextStep;
    this.renderInPageWizardStep(nextStep);
  }

  renderInPageWizardStep(step) {
    const container = document.getElementById('personalizedWizardContainer');
    if (!container) return;

    if (step === 1) {
      container.innerHTML = `
        <div class="wizard-step-container">
          <div class="wizard-progress"><span style="width: 20%;">Step 1 of 5</span></div>
          <h2 style="font-size: 1.4rem; color: var(--navy); margin-bottom: 8px;">Step 1: What area are you most interested in?</h2>
          <p style="color: var(--charcoal-muted); font-size: 0.9rem; margin-bottom: 24px;">Select your core domain of interest to anchor your personalized education route.</p>

          <div class="wizard-options-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
            <div class="wizard-opt-card" onclick="app.setInPageWizardChoice('interest', 'Business & Operations', 2)">
              <div class="opt-icon" style="font-size: 1.5rem; margin-bottom: 6px;">💼</div>
              <h3 style="font-size: 1rem; font-weight: 750; color: var(--navy);">Business & Management</h3>
            </div>
            <div class="wizard-opt-card" onclick="app.setInPageWizardChoice('interest', 'Technology & Cloud', 2)">
              <div class="opt-icon" style="font-size: 1.5rem; margin-bottom: 6px;">💻</div>
              <h3 style="font-size: 1rem; font-weight: 750; color: var(--navy);">Technology & Software</h3>
            </div>
            <div class="wizard-opt-card" onclick="app.setInPageWizardChoice('interest', 'Data Science & AI', 2)">
              <div class="opt-icon" style="font-size: 1.5rem; margin-bottom: 6px;">📊</div>
              <h3 style="font-size: 1rem; font-weight: 750; color: var(--navy);">Data Science & AI</h3>
            </div>
            <div class="wizard-opt-card" onclick="app.setInPageWizardChoice('interest', 'Marketing & Digital', 2)">
              <div class="opt-icon" style="font-size: 1.5rem; margin-bottom: 6px;">🚀</div>
              <h3 style="font-size: 1rem; font-weight: 750; color: var(--navy);">Marketing & Growth</h3>
            </div>
            <div class="wizard-opt-card" onclick="app.setInPageWizardChoice('interest', 'Finance & Accounting', 2)">
              <div class="opt-icon" style="font-size: 1.5rem; margin-bottom: 6px;">📈</div>
              <h3 style="font-size: 1rem; font-weight: 750; color: var(--navy);">Finance & Banking</h3>
            </div>
            <div class="wizard-opt-card" onclick="app.setInPageWizardChoice('interest', 'Healthcare Management', 2)">
              <div class="opt-icon" style="font-size: 1.5rem; margin-bottom: 6px;">🏥</div>
              <h3 style="font-size: 1rem; font-weight: 750; color: var(--navy);">Healthcare & Biotech</h3>
            </div>
          </div>
        </div>
      `;
    } else if (step === 2) {
      container.innerHTML = `
        <div class="wizard-step-container">
          <div class="wizard-progress"><span style="width: 40%;">Step 2 of 5</span></div>
          <h2 style="font-size: 1.4rem; color: var(--navy); margin-bottom: 8px;">Step 2: What degree level are you seeking?</h2>
          <p style="color: var(--charcoal-muted); font-size: 0.9rem; margin-bottom: 24px;">Selected Domain: <strong>${this.inPageWizardState.interest}</strong></p>

          <div class="wizard-options-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <div class="wizard-opt-card" onclick="app.setInPageWizardChoice('level', 'Undergraduate (UG)', 3)">
              <div class="opt-icon" style="font-size: 1.5rem; margin-bottom: 6px;">🎓</div>
              <h3 style="font-size: 1rem; font-weight: 750; color: var(--navy);">Undergraduate (BBA / BCA)</h3>
              <p style="font-size: 0.8rem; color: var(--charcoal-muted); margin-top: 4px;">After Class 12 / Diploma</p>
            </div>
            <div class="wizard-opt-card" onclick="app.setInPageWizardChoice('level', 'Postgraduate (PG)', 3)">
              <div class="opt-icon" style="font-size: 1.5rem; margin-bottom: 6px;">🏆</div>
              <h3 style="font-size: 1rem; font-weight: 750; color: var(--navy);">Postgraduate (MBA / MCA / M.Com)</h3>
              <p style="font-size: 0.8rem; color: var(--charcoal-muted); margin-top: 4px;">Graduate / Working Professional</p>
            </div>
            <div class="wizard-opt-card" onclick="app.setInPageWizardChoice('level', 'Flexible / Not Sure', 3)">
              <div class="opt-icon" style="font-size: 1.5rem; margin-bottom: 6px;">💡</div>
              <h3 style="font-size: 1rem; font-weight: 750; color: var(--navy);">Help Me Recommend</h3>
              <p style="font-size: 0.8rem; color: var(--charcoal-muted); margin-top: 4px;">Explore both UG and PG options</p>
            </div>
          </div>
        </div>
      `;
    } else if (step === 3) {
      container.innerHTML = `
        <div class="wizard-step-container">
          <div class="wizard-progress"><span style="width: 60%;">Step 3 of 5</span></div>
          <h2 style="font-size: 1.4rem; color: var(--navy); margin-bottom: 8px;">Step 3: What matters most to you?</h2>
          <p style="color: var(--charcoal-muted); font-size: 0.9rem; margin-bottom: 24px;">Domain: <strong>${this.inPageWizardState.interest}</strong> • Level: <strong>${this.inPageWizardState.level}</strong></p>

          <div class="wizard-options-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <div class="wizard-opt-card" onclick="app.setInPageWizardChoice('priority', 'Career Growth & Salary', 4)">
              <div class="opt-icon" style="font-size: 1.5rem; margin-bottom: 6px;">🚀</div>
              <h3 style="font-size: 1rem; font-weight: 750; color: var(--navy);">Career Growth & Placements</h3>
            </div>
            <div class="wizard-opt-card" onclick="app.setInPageWizardChoice('priority', 'Affordability & EMIs', 4)">
              <div class="opt-icon" style="font-size: 1.5rem; margin-bottom: 6px;">💰</div>
              <h3 style="font-size: 1rem; font-weight: 750; color: var(--navy);">Affordable Fees & Easy EMIs</h3>
            </div>
            <div class="wizard-opt-card" onclick="app.setInPageWizardChoice('priority', 'Reputation & NAAC A+', 4)">
              <div class="opt-icon" style="font-size: 1.5rem; margin-bottom: 6px;">🏛️</div>
              <h3 style="font-size: 1rem; font-weight: 750; color: var(--navy);">Top University Accreditation</h3>
            </div>
            <div class="wizard-opt-card" onclick="app.setInPageWizardChoice('priority', 'Flexibility & Online LMS', 4)">
              <div class="opt-icon" style="font-size: 1.5rem; margin-bottom: 6px;">⏱️</div>
              <h3 style="font-size: 1rem; font-weight: 750; color: var(--navy);">Maximum Schedule Flexibility</h3>
            </div>
          </div>
        </div>
      `;
    } else if (step === 4) {
      container.innerHTML = `
        <div class="wizard-step-container">
          <div class="wizard-progress"><span style="width: 80%;">Step 4 of 5</span></div>
          <h2 style="font-size: 1.4rem; color: var(--navy); margin-bottom: 8px;">Step 4: Do you already have a target role in mind?</h2>
          <p style="color: var(--charcoal-muted); font-size: 0.9rem; margin-bottom: 24px;">Prioritizing: <strong>${this.inPageWizardState.priority}</strong></p>

          <div class="wizard-options-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <div class="wizard-opt-card" onclick="app.setInPageWizardChoice('role', 'Digital Marketing Manager', 5)">
              <div class="opt-icon" style="font-size: 1.5rem; margin-bottom: 6px;">🎯</div>
              <h3 style="font-size: 1rem; font-weight: 750; color: var(--navy);">Yes, I have a role in mind</h3>
            </div>
            <div class="wizard-opt-card" onclick="app.setInPageWizardChoice('role', 'Data Science / Management Track', 5)">
              <div class="opt-icon" style="font-size: 1.5rem; margin-bottom: 6px;">🔍</div>
              <h3 style="font-size: 1rem; font-weight: 750; color: var(--navy);">No, help me discover options</h3>
            </div>
          </div>
        </div>
      `;
    } else if (step === 5) {
      this.finishInPageWizard();
    }
  }

  finishInPageWizard() {
    const container = document.getElementById('personalizedWizardContainer');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align: center; padding: 12px 0;">
        <span class="badge badge-trust" style="margin-bottom: 12px;">YOUR NEXORA CAREER ROUTE</span>
        <h2 style="font-size: 1.75rem; font-weight: 850; color: var(--navy); margin-bottom: 8px;">Personalized Route Generated!</h2>
        <p style="color: var(--charcoal-muted); font-size: 0.95rem; margin-bottom: 28px;">Based on your domain (<strong>${this.inPageWizardState.interest}</strong>), level (<strong>${this.inPageWizardState.level}</strong>), and priorities (<strong>${this.inPageWizardState.priority}</strong>).</p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; text-align: left; margin-bottom: 28px;">
          <div style="background: #fff; padding: 18px; border-radius: 12px; border: 1px solid var(--border-grey);">
            <div style="font-size: 0.72rem; font-weight: 800; color: var(--trust-green); text-transform: uppercase;">Target Role</div>
            <div style="font-size: 1rem; font-weight: 800; color: var(--navy); margin-top: 4px;">Digital Marketing / Product Lead</div>
            <div style="font-size: 0.8rem; color: var(--charcoal-muted); margin-top: 2px;">Benchmark: ₹8.5L - ₹18LPA</div>
          </div>

          <div style="background: #fff; padding: 18px; border-radius: 12px; border: 1px solid var(--border-grey);">
            <div style="font-size: 0.72rem; font-weight: 800; color: var(--trust-green); text-transform: uppercase;">Essential Skills</div>
            <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
              <span class="badge badge-sage">SEO/SEM</span>
              <span class="badge badge-sage">Analytics</span>
              <span class="badge badge-sage">Growth Tech</span>
            </div>
          </div>

          <div style="background: #fff; padding: 18px; border-radius: 12px; border: 1px solid var(--border-grey);">
            <div style="font-size: 0.72rem; font-weight: 800; color: var(--trust-green); text-transform: uppercase;">Matching Degrees</div>
            <div style="font-size: 1rem; font-weight: 800; color: var(--navy); margin-top: 4px;">Online MBA / Online BBA</div>
            <div style="font-size: 0.8rem; color: var(--sage-green); margin-top: 2px;">8 Programmes</div>
          </div>

          <div style="background: #fff; padding: 18px; border-radius: 12px; border: 1px solid var(--border-grey);">
            <div style="font-size: 0.72rem; font-weight: 800; color: var(--trust-green); text-transform: uppercase;">Matching Universities</div>
            <div style="font-size: 1rem; font-weight: 800; color: var(--navy); margin-top: 4px;">5 Partner Institutions</div>
            <div style="font-size: 0.8rem; color: var(--sage-green); margin-top: 2px;">UGC-DEB Entitled</div>
          </div>
        </div>

        <div style="display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;">
          <button class="btn btn-primary btn-lg" onclick="app.scrollToSection('programmes')">
            Explore My Matches ➔
          </button>
          <button class="btn btn-secondary btn-lg" onclick="app.compareManager.openCompareModal('spring')">
            Compare Options Side-by-Side
          </button>
          <button class="btn btn-outline-navy" onclick="app.inPageWizardState.step = 1; app.renderInPageWizardStep(1);">
            🔄 Restart Assessment
          </button>
        </div>
      </div>
    `;
  }

  /* ---------------------------------------------------- */
  /* WISHLIST MANAGER (PERSISTED UNIQUE ID MODEL)         */
  /* ---------------------------------------------------- */
  isWishlisted(id, type) {
    if (type === 'university') {
      return this.wishlist.universities.includes(id);
    } else if (type === 'programme') {
      return this.wishlist.programmes.includes(id);
    }
    return this.wishlist.universities.includes(id) || this.wishlist.programmes.includes(id);
  }

  isShortlisted(id, type) {
    return this.isWishlisted(id, type);
  }

  toggleWishlist(id, type) {
    if (!type) {
      const isUniv = NEXORA_DATA.universities.some(u => u.id === id);
      type = isUniv ? 'university' : 'programme';
    }

    if (type === 'university') {
      const index = this.wishlist.universities.indexOf(id);
      if (index > -1) {
        this.wishlist.universities.splice(index, 1);
      } else {
        this.wishlist.universities.push(id);
      }
    } else {
      const index = this.wishlist.programmes.indexOf(id);
      if (index > -1) {
        this.wishlist.programmes.splice(index, 1);
      } else {
        this.wishlist.programmes.push(id);
      }
    }

    localStorage.setItem('nexora_wishlist', JSON.stringify(this.wishlist));
    this.updateWishlistUI();
  }

  toggleShortlist(id, type) {
    this.toggleWishlist(id, type);
  }

  updateWishlistUI() {
    const totalCount = (this.wishlist.universities || []).length + (this.wishlist.programmes || []).length;
    const countSpan = document.getElementById('shortlistCount');
    if (countSpan) {
      countSpan.textContent = totalCount;
    }

    const buttons = document.querySelectorAll('.shortlist-toggle-btn');
    buttons.forEach(btn => {
      const id = btn.getAttribute('data-shortlist-id') || btn.onclick?.toString().match(/'([^']+)'/)?.[1];
      if (id) {
        const isUniv = NEXORA_DATA.universities.some(u => u.id === id);
        const saved = this.isWishlisted(id, isUniv ? 'university' : 'programme');

        if (saved) {
          btn.classList.add('saved');
          btn.innerHTML = '♥ Wishlisted';
        } else {
          btn.classList.remove('saved');
          btn.innerHTML = '♡ Save';
        }
      }
    });
  }

  updateShortlistUI() {
    this.updateWishlistUI();
  }

  openWishlistModal(activeTab = 'universities') {
    if (this.viewRenderers) {
      this.viewRenderers.renderWishlistModal(activeTab);
    }
  }

  openShortlistModal(activeTab = 'universities') {
    this.openWishlistModal(activeTab);
  }

  switchWishlistTab(tabName) {
    this.openWishlistModal(tabName);
  }

  openWizardModal() {
    this.switchRouteMode('personalized');
  }

  openInfoRequestModal(title, targetName) {
    if (this.viewRenderers) {
      this.viewRenderers.renderInfoRequestModal(title, targetName);
    }
  }

  handleInfoRequestSubmit(form, title = 'Information Packet') {
    if (!form) return;

    const rawName = (form.name && form.name.value) ? form.name.value.trim() : 'Applicant';
    const email = (form.email && form.email.value) ? form.email.value.trim() : 'your registered email';
    const phone = (form.phone && form.phone.value) ? form.phone.value.trim() : '';
    const qualification = (form.qualification && form.qualification.value) ? form.qualification.value.trim() : '';

    const firstName = rawName.split(' ')[0] || '';
    const cleanName = firstName ? (firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()) : '';

    // Trigger local download backup
    try {
      const packetContent = 
        `===================================================\n` +
        `NEXORA VERIFIED INFORMATION DOSSIER\n` +
        `Document: ${title}\n` +
        `Prepared For: ${rawName} (${email})\n` +
        `Date Generated: ${new Date().toLocaleDateString()}\n` +
        `Regulatory Status: UGC-DEB Entitled & Verified\n` +
        `===================================================\n\n` +
        `CONTENTS SUMMARY:\n` +
        `1. Official Semester-by-Semester Curriculum\n` +
        `2. Full Fee Schedule & Installment Breakdown\n` +
        `3. Statutory Recognition Proof (UGC-DEB, AICTE, NAAC)\n` +
        `4. Flexible Online Examination Guidelines\n\n` +
        `For 1-on-1 counseling, visit NEXORA Navigation Platforms.\n`;

      const blob = new Blob([packetContent], { type: 'text/plain;charset=utf-8' });
      const downloadUrl = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = downloadUrl;
      downloadAnchor.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_Verified_Packet.txt`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 2500);
    } catch (e) {
      console.warn('Packet download error:', e);
    }

    const modalBody = document.getElementById('modalBodyContent');
    const modalTitle = document.getElementById('modalTitleText');

    if (modalTitle) {
      modalTitle.textContent = "Information Packet Dispatched";
    }

    if (modalBody) {
      modalBody.innerHTML = `
        <div style="text-align: center; padding: 20px 8px; max-width: 500px; margin: 0 auto;">
          <!-- Success Checkmark Badge -->
          <div style="width: 76px; height: 76px; border-radius: 50%; background: rgba(0, 90, 43, 0.1); border: 2.5px solid var(--trust-green, #005A2B); color: var(--trust-green, #005A2B); display: flex; align-items: center; justify-content: center; margin: 0 auto 18px auto; font-size: 2.2rem; box-shadow: 0 8px 24px rgba(0, 90, 43, 0.15);">
            ✓
          </div>

          <!-- PRIMARY PHRASE REQUIRED BY USER -->
          <h2 style="font-size: 1.65rem; font-weight: 850; color: var(--navy, #001B66); margin-bottom: 10px; letter-spacing: -0.01em; line-height: 1.3;">
            The file has been sent to your registered email
          </h2>

          <p style="font-size: 0.95rem; color: var(--charcoal-muted, #64748B); line-height: 1.6; margin-bottom: 22px;">
            ${cleanName ? `Thank you, <strong>${cleanName}</strong>! ` : ''}The verified information packet for <strong>${title}</strong> has been generated and dispatched.
          </p>

          <!-- Registered Email Delivery Confirmation Box -->
          <div style="background: rgba(0, 90, 43, 0.05); border: 1.5px solid rgba(0, 90, 43, 0.2); border-radius: 12px; padding: 16px 20px; text-align: left; margin-bottom: 22px;">
            <div style="font-size: 0.75rem; font-weight: 800; color: var(--trust-green, #005A2B); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">
              REGISTERED EMAIL DESTINATION
            </div>
            <div style="display: flex; align-items: center; gap: 10px; font-size: 1.05rem; font-weight: 750; color: var(--navy, #001B66); word-break: break-all;">
              <span>📧</span>
              <span>${email}</span>
            </div>
            <div style="font-size: 0.8rem; color: var(--charcoal-muted, #64748B); margin-top: 6px;">
              Please check your inbox (and spam/promotions folder just in case). A local copy has also been initiated for your convenience.
            </div>
          </div>

          <!-- Included Contents Checklist -->
          <div style="background: var(--soft-white, #F8FAFC); border: 1px solid var(--border-grey, #E2E8F0); border-radius: 12px; padding: 16px; text-align: left; margin-bottom: 24px; font-size: 0.85rem; color: #334155;">
            <div style="font-weight: 750; color: var(--navy, #001B66); margin-bottom: 8px;">Packet Contents:</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div>✓ Official 2026 Semester-by-Semester Curriculum</div>
              <div>✓ Statutory UGC-DEB &amp; AICTE Entitlement Proof</div>
              <div>✓ Transparent Fee Schedule &amp; No-Cost EMI Breakdown</div>
              <div>✓ Direct University Admission &amp; Examination Guidelines</div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary btn-md" onclick="app.closeModal();">
              Done
            </button>
            <button class="btn btn-secondary btn-md" onclick="app.closeModal(); app.navigateToProgrammesPage();">
              Explore More Programmes
            </button>
          </div>
        </div>
      `;
    }
  }

  openPoliciesModal(activeTab = 'privacy') {
    if (this.viewRenderers) {
      this.viewRenderers.renderPoliciesModal(activeTab);
    }
  }

  openTermsModal() {
    this.openPoliciesModal('terms');
  }

  openPrivacyModal() {
    this.openPoliciesModal('privacy');
  }

  openUgcDisclaimerModal() {
    this.openPoliciesModal('ugc');
  }

  /* ---------------------------------------------------- */
  /* NEED HELP CTA MODAL & PERSONALIZED REPLY HANDLER    */
  /* ---------------------------------------------------- */
  openNeedHelpModal() {
    const modalBody = document.getElementById('modalBodyContent');
    const modalTitle = document.getElementById('modalTitleText');
    const backdrop = document.getElementById('globalModalBackdrop');

    if (!modalBody || !backdrop) return;

    if (modalTitle) {
      modalTitle.textContent = "Talk to an Academic Advisor — Free Advisory";
    }

    modalBody.innerHTML = `
      <div class="need-help-modal-content">
        <div style="background: linear-gradient(135deg, rgba(0, 27, 102, 0.04) 0%, rgba(0, 90, 43, 0.08) 100%); border: 1.5px solid rgba(0, 90, 43, 0.18); border-radius: 14px; padding: 18px 20px; margin-bottom: 22px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <span style="font-size: 1.3rem;">🎓</span>
            <strong style="color: var(--navy); font-size: 1.05rem; font-weight: 800;">Need Help Choosing the Right Path?</strong>
          </div>
          <p style="font-size: 0.86rem; color: var(--charcoal-muted); line-height: 1.5; margin: 0;">
            Share your profile details below. Our certified education counselors provide 100% unbiased guidance on UGC-DEB entitled degrees, fee structures, and career trajectories.
          </p>
        </div>

        <form id="needHelpForm" onsubmit="event.preventDefault(); app.handleNeedHelpSubmit(this);" style="display: flex; flex-direction: column; gap: 16px;">
          <!-- 1. FULL NAME -->
          <div>
            <label style="font-size: 0.85rem; font-weight: 750; color: var(--navy); display: block; margin-bottom: 6px;">
              Full Name <span style="color: #DC2626;">*</span>
            </label>
            <input type="text" id="helpFullName" name="name" required placeholder="e.g. Aarushi Sharma"
              style="width: 100%; padding: 11px 14px; border: 1.5px solid var(--border-grey, #CBD5E1); border-radius: 8px; font-size: 0.95rem; color: var(--navy); font-weight: 500; outline: none; transition: border-color 0.2s;"
              onfocus="this.style.borderColor='var(--trust-green)'" onblur="this.style.borderColor='var(--border-grey, #CBD5E1)'">
          </div>

          <!-- 2. CURRENT QUALIFICATION -->
          <div>
            <label style="font-size: 0.85rem; font-weight: 750; color: var(--navy); display: block; margin-bottom: 6px;">
              Current Qualification <span style="color: #DC2626;">*</span>
            </label>
            <select id="helpQualification" name="qualification" required
              style="width: 100%; padding: 11px 14px; border: 1.5px solid var(--border-grey, #CBD5E1); border-radius: 8px; font-size: 0.95rem; color: var(--navy); font-weight: 500; outline: none; background: #fff;">
              <option value="" disabled selected>Select your current education level...</option>
              <option value="Class 12th / High School (10+2)">Class 12th / High School (10+2)</option>
              <option value="Undergraduate Student (Pursuing Bachelor's)">Undergraduate Student (Pursuing Bachelor's)</option>
              <option value="Bachelor's Degree Graduate (B.Com / BBA / BCA / B.Sc / BA)">Bachelor's Degree Graduate (B.Com / BBA / BCA / B.Sc / BA)</option>
              <option value="B.Tech / B.E. Graduate">B.Tech / B.E. Graduate</option>
              <option value="Postgraduate Degree (MBA / MCA / M.Com / M.Sc)">Postgraduate Degree (MBA / MCA / M.Com / M.Sc)</option>
              <option value="Diploma / Polytechnic Holder">Diploma / Polytechnic Holder</option>
              <option value="Working Professional (1-3 Years Experience)">Working Professional (1-3 Years Experience)</option>
              <option value="Senior Working Professional (3+ Years Experience)">Senior Working Professional (3+ Years Experience)</option>
            </select>
          </div>

          <!-- 3. EMAIL ADDRESS -->
          <div>
            <label style="font-size: 0.85rem; font-weight: 750; color: var(--navy); display: block; margin-bottom: 6px;">
              Email Address <span style="color: #DC2626;">*</span>
            </label>
            <input type="email" id="helpEmail" name="email" required placeholder="e.g. aarushi@example.com"
              style="width: 100%; padding: 11px 14px; border: 1.5px solid var(--border-grey, #CBD5E1); border-radius: 8px; font-size: 0.95rem; color: var(--navy); font-weight: 500; outline: none; transition: border-color 0.2s;"
              onfocus="this.style.borderColor='var(--trust-green)'" onblur="this.style.borderColor='var(--border-grey, #CBD5E1)'">
          </div>

          <!-- 4. STATE WITH CITY -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div>
              <label style="font-size: 0.85rem; font-weight: 750; color: var(--navy); display: block; margin-bottom: 6px;">
                State <span style="color: #DC2626;">*</span>
              </label>
              <select id="helpState" name="state" required
                style="width: 100%; padding: 11px 12px; border: 1.5px solid var(--border-grey, #CBD5E1); border-radius: 8px; font-size: 0.92rem; color: var(--navy); font-weight: 500; outline: none; background: #fff;">
                <option value="" disabled selected>Select State...</option>
                <option value="Delhi NCR">Delhi NCR</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Telangana">Telangana</option>
                <option value="Gujarat">Gujarat</option>
                <option value="West Bengal">West Bengal</option>
                <option value="Punjab">Punjab</option>
                <option value="Haryana">Haryana</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Bihar">Bihar</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Kerala">Kerala</option>
                <option value="Odisha">Odisha</option>
                <option value="Jharkhand">Jharkhand</option>
                <option value="Assam">Assam</option>
                <option value="Chandigarh">Chandigarh</option>
                <option value="Uttarakhand">Uttarakhand</option>
                <option value="Himachal Pradesh">Himachal Pradesh</option>
                <option value="Goa">Goa</option>
                <option value="Other">Other State / UT</option>
              </select>
            </div>

            <div>
              <label style="font-size: 0.85rem; font-weight: 750; color: var(--navy); display: block; margin-bottom: 6px;">
                City <span style="color: #DC2626;">*</span>
              </label>
              <input type="text" id="helpCity" name="city" required placeholder="e.g. Mumbai, Bengaluru"
                style="width: 100%; padding: 11px 14px; border: 1.5px solid var(--border-grey, #CBD5E1); border-radius: 8px; font-size: 0.95rem; color: var(--navy); font-weight: 500; outline: none; transition: border-color 0.2s;"
                onfocus="this.style.borderColor='var(--trust-green)'" onblur="this.style.borderColor='var(--border-grey, #CBD5E1)'">
            </div>
          </div>

          <!-- OPTIONAL PHONE -->
          <div>
            <label style="font-size: 0.85rem; font-weight: 750; color: var(--navy); display: block; margin-bottom: 6px;">
              Contact Number (Optional)
            </label>
            <input type="tel" id="helpPhone" name="phone" placeholder="e.g. +91 98765 43210 (For quick WhatsApp update)"
              style="width: 100%; padding: 11px 14px; border: 1.5px solid var(--border-grey, #CBD5E1); border-radius: 8px; font-size: 0.95rem; color: var(--navy); font-weight: 500; outline: none; transition: border-color 0.2s;"
              onfocus="this.style.borderColor='var(--trust-green)'" onblur="this.style.borderColor='var(--border-grey, #CBD5E1)'">
          </div>

          <!-- SUBMIT CTA BUTTON -->
          <button class="btn btn-primary btn-lg" type="submit" style="margin-top: 10px; width: 100%; font-size: 1rem; font-weight: 750; padding: 13px 20px; border-radius: 8px; box-shadow: 0 4px 16px rgba(0, 90, 43, 0.25);">
            Submit &amp; Get Personalized Guidance →
          </button>

          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.78rem; color: var(--charcoal-muted); margin-top: 4px;">
            <span>🔒 100% Free Advisory</span>
            <span>•</span>
            <span>Zero Spam Guarantee</span>
            <span>•</span>
            <span>UGC Regulatory Compliance</span>
          </div>
        </form>
      </div>
    `;

    backdrop.classList.add('active');
  }

  handleNeedHelpSubmit(form) {
    if (!form) return;

    const rawName = (form.name && form.name.value ? form.name.value.trim() : 'Friend');
    const qualification = (form.qualification && form.qualification.value ? form.qualification.value.trim() : 'Graduate');
    const email = (form.email && form.email.value ? form.email.value.trim() : '');
    const state = (form.state && form.state.value ? form.state.value.trim() : 'India');
    const city = (form.city && form.city.value ? form.city.value.trim() : 'City');
    const phone = (form.phone && form.phone.value ? form.phone.value.trim() : '');

    // Clean and extract first name for personalization (e.g. "aarushi" -> "Aarushi")
    const firstName = rawName.split(' ')[0] || 'Friend';
    const lowerName = firstName.toLowerCase();
    const displayName = lowerName.charAt(0).toUpperCase() + lowerName.slice(1);

    const ticketId = 'NX-ADV-' + Math.floor(1000 + Math.random() * 9000);

    const modalBody = document.getElementById('modalBodyContent');
    const modalTitle = document.getElementById('modalTitleText');

    if (modalTitle) {
      modalTitle.textContent = "Personalized Advisory Confirmation";
    }

    if (modalBody) {
      modalBody.innerHTML = `
        <div class="need-help-success-view">
          <!-- Success Icon -->
          <div style="width: 76px; height: 76px; border-radius: 50%; background: rgba(0, 90, 43, 0.1); border: 2.5px solid var(--trust-green); color: var(--trust-green); display: flex; align-items: center; justify-content: center; margin: 0 auto 18px auto; font-size: 2.2rem; box-shadow: 0 8px 24px rgba(0, 90, 43, 0.15);">
            ✓
          </div>

          <!-- EXACT PERSONALIZED GREETING REQUESTED BY USER -->
          <h2 style="font-size: 1.7rem; font-weight: 850; color: var(--navy); margin-bottom: 10px; letter-spacing: -0.02em;">
            Thank you reaching us ${displayName}.....
          </h2>

          <p style="font-size: 0.98rem; color: var(--charcoal-muted); line-height: 1.6; margin-bottom: 24px; max-width: 480px; margin-left: auto; margin-right: auto;">
            We have successfully received your guidance request. Our senior academic advisor has been assigned to prepare your tailored degree &amp; university comparison roadmap.
          </p>

          <!-- PERSONALIZED PROFILE SUMMARY CARD -->
          <div style="background: var(--soft-white, #F8FAFC); border: 1.5px solid var(--border-grey, #E2E8F0); border-radius: 14px; padding: 20px; text-align: left; margin-bottom: 22px;">
            <div style="font-size: 0.75rem; font-weight: 800; color: var(--trust-green); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px;">
              YOUR ADVISORY PROFILE
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 0.88rem;">
              <div>
                <div style="color: var(--charcoal-muted); font-size: 0.76rem; font-weight: 600;">Applicant Name</div>
                <div style="font-weight: 800; color: var(--navy); font-size: 0.95rem; margin-top: 2px;">${rawName}</div>
              </div>
              <div>
                <div style="color: var(--charcoal-muted); font-size: 0.76rem; font-weight: 600;">Education Level</div>
                <div style="font-weight: 800; color: var(--navy); font-size: 0.95rem; margin-top: 2px;">${qualification}</div>
              </div>
              <div>
                <div style="color: var(--charcoal-muted); font-size: 0.76rem; font-weight: 600;">Location</div>
                <div style="font-weight: 800; color: var(--navy); font-size: 0.95rem; margin-top: 2px;">${city}, ${state}</div>
              </div>
              <div>
                <div style="color: var(--charcoal-muted); font-size: 0.76rem; font-weight: 600;">Advisory Ticket ID</div>
                <div style="font-weight: 800; color: var(--trust-green); font-size: 0.95rem; margin-top: 2px;">${ticketId}</div>
              </div>
            </div>

            <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-grey, #E2E8F0); font-size: 0.84rem; color: var(--charcoal); display: flex; align-items: center; gap: 8px;">
              <span>📧</span>
              <span>Personalized university shortlist &amp; fee guide queued for <strong>${email}</strong></span>
            </div>
          </div>

          <!-- NEXT STEPS GUIDANCE -->
          <div style="background: rgba(0, 90, 43, 0.04); border: 1px solid rgba(0, 90, 43, 0.15); border-radius: 12px; padding: 14px 18px; margin-bottom: 24px; text-align: left; display: flex; align-items: flex-start; gap: 12px;">
            <span style="font-size: 1.3rem;">📞</span>
            <div style="font-size: 0.84rem; color: var(--charcoal); line-height: 1.5;">
              <strong>What to expect next?</strong> An expert education advisor will reach out to you within 24 hours to clarify UGC-DEB entitlements, scholarship waivers, and help finalize your university applications.
            </div>
          </div>

          <!-- ACTION BUTTONS -->
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary btn-md" onclick="app.closeModal(); app.navigateToProgrammesPage();">
              Explore Programmes
            </button>
            <button class="btn btn-secondary btn-md" onclick="app.closeModal();">
              Done
            </button>
          </div>
        </div>
      `;
    }
  }

  /* ---------------------------------------------------- */
  /* CAREER DESTINATIONS & TAB FILTER RENDERER            */
  /* ---------------------------------------------------- */
  getCareerDestinationImage(dest, dirKey) {
    const title = ((dest && dest.title) || '').toLowerCase().trim();
    
    // Hand-curated, authentic, non-AI professional photography
    const photoMap = {
      // Marketing & Growth
      "digital marketing manager": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
      "growth marketing lead": "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80",
      "brand strategy director": "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=600&q=80",
      "performance ads specialist": "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80",

      // Business & Management
      "business analyst": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80",
      "product manager": "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80",
      "operations manager": "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=600&q=80",
      "tech entrepreneur": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80",

      // Software & Technology
      "full stack engineer": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80",
      "cloud solutions architect": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
      "devops & sre lead": "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&w=600&q=80",
      "cybersecurity analyst": "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80",

      // Data & AI Intelligence
      "data analyst": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80",
      "data scientist": "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=600&q=80",
      "bi & analytics manager": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
      "machine learning engineer": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",

      // Finance & Accounting
      "financial analyst": "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80",
      "investment banking associate": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
      "corporate risk specialist": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",

      // Design & User Experience
      "ui/ux designer": "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=600&q=80",
      "product lead designer": "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=600&q=80",
      "brand identity strategist": "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=600&q=80",

      // Healthcare & Pharmacy
      "hospital operations manager": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80",
      "clinical research associate": "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80",
      "pharmaceutical product lead": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80",

      // Media & Digital Journalism
      "digital content producer": "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=600&q=80",
      "pr & corporate comms lead": "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80",

      // Corporate Law & Legal Practice
      "corporate lawyer": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
      "in-house legal counsel": "https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&w=600&q=80",
      "regulatory & compliance officer": "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80",
      "commercial litigation associate": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80"
    };

    if (photoMap[title]) return photoMap[title];

    const dirFallbacks = {
      MARKETING: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
      BUSINESS: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=600&q=80",
      TECHNOLOGY: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80",
      DATA: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80",
      FINANCE: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80",
      DESIGN: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=600&q=80",
      HEALTHCARE: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80",
      MEDIA: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=600&q=80",
      LEGAL: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80"
    };

    return dirFallbacks[dirKey] || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80";
  }

  renderCareerCards(filterDirKey = 'ALL') {
    const container = document.getElementById('careerCardsGrid');
    if (!container) return;

    let html = '';
    const keys = Object.keys(NEXORA_DATA.directions);
    let cardCount = 0;

    keys.forEach(key => {
      if (filterDirKey !== 'ALL' && key !== filterDirKey) return;

      const dir = NEXORA_DATA.directions[key];
      dir.destinations.forEach(dest => {
        cardCount++;
        const delay = Math.min(cardCount * 0.04, 0.4);
        const bgImg = this.getCareerDestinationImage(dest, key);

        html += `
          <div class="career-card" style="animation-delay: ${delay}s;" onclick="app.openRouteModal('${key}')">
            <div class="career-card-hero">
              <img src="${bgImg}" alt="${dest.title}" class="career-card-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80'" />
              <div class="career-card-hero-overlay"></div>
              <div class="career-card-top-badges">
                <span class="career-card-category-pill">${dir.name}</span>
                <span class="career-card-badge">${dest.demand}</span>
              </div>
            </div>

            <div class="career-card-content">
              <div class="career-card-body">
                <h3 class="career-card-role">${dest.title}</h3>
                <div class="career-card-salary-row">
                  <span class="salary-label">Benchmark:</span>
                  <span class="salary-value">${dest.avgSalary}</span>
                </div>
              </div>

              <div class="career-card-footer">
                <button class="btn btn-primary btn-sm career-details-btn" style="width: 100%;" type="button" onclick="event.stopPropagation(); app.openRouteModal('${key}')">
                  <span>Explore Route</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </div>
            </div>
          </div>
        `;
      });
    });

    container.innerHTML = html;
    const cardsViewport = document.getElementById('careerCardsViewport');
    if (cardsViewport) cardsViewport.scrollLeft = 0;
  }

  scrollCareerCards(direction) {
    const viewport = document.getElementById('careerCardsViewport');
    if (!viewport) return;

    const scrollAmount = 300;
    if (direction === 'left') {
      viewport.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      viewport.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  initCareerCardsAutoScroll() {
    const viewport = document.getElementById('careerCardsViewport');
    if (!viewport) return;

    this.isCareerCardsPaused = false;
    const scrollSpeed = 0.5;

    const animateCards = () => {
      if (!this.isCareerCardsPaused && viewport) {
        viewport.scrollLeft += scrollSpeed;
        if (viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 2) {
          viewport.scrollLeft = 0;
        }
      }
      requestAnimationFrame(animateCards);
    };

    viewport.addEventListener('mouseenter', () => this.isCareerCardsPaused = true);
    viewport.addEventListener('mouseleave', () => this.isCareerCardsPaused = false);

    requestAnimationFrame(animateCards);
  }

  filterCareers(key, btnEl) {
    const tabs = document.querySelectorAll('.career-tab-btn');
    tabs.forEach(t => {
      if (t.getAttribute('data-key') === key) {
        t.classList.add('active', 'btn-primary');
        t.classList.remove('btn-secondary');
      } else {
        t.classList.remove('active', 'btn-primary');
        t.classList.add('btn-secondary');
      }
    });

    this.renderCareerCards(key);
  }

  scrollCareerTabs(direction) {
    const viewport = document.getElementById('careerTabsViewport');
    if (!viewport) return;

    const scrollAmount = 220;
    if (direction === 'left') {
      viewport.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      viewport.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  initCareerTabsAutoScroll() {
    const viewport = document.getElementById('careerTabsViewport');
    if (!viewport) return;

    this.isCareerTabsPaused = false;
    const scrollSpeed = 0.6;

    const animate = () => {
      if (!this.isCareerTabsPaused && viewport) {
        viewport.scrollLeft += scrollSpeed;
        if (viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 2) {
          viewport.scrollLeft = 0;
        }
      }
      requestAnimationFrame(animate);
    };

    viewport.addEventListener('mouseenter', () => this.isCareerTabsPaused = true);
    viewport.addEventListener('mouseleave', () => this.isCareerTabsPaused = false);

    requestAnimationFrame(animate);
  }

  /* ---------------------------------------------------- */
  /* UNIVERSAL CATEGORIZED PREDICTIVE SEARCH SYSTEM        */
  /* ---------------------------------------------------- */
  clearHomepageSearch() {
    const input = document.getElementById('careerSearchInput');
    const ghost = document.getElementById('careerSearchGhost');
    const dropdown = document.getElementById('careerSearchDropdown');
    const suggestionsContainer = document.getElementById('careerSearchSuggestions');
    const clearBtn = document.getElementById('careerSearchClearBtn');

    if (input) input.value = '';
    this.currentHomepageSearchQuery = '';
    this.submittedHomepageSearchQuery = '';
    this.homepageSearchRequestId++;

    if (this.homepageSearchTimeout) {
      clearTimeout(this.homepageSearchTimeout);
      this.homepageSearchTimeout = null;
    }

    if (ghost) ghost.textContent = '';
    if (dropdown) dropdown.style.display = 'none';
    if (suggestionsContainer) suggestionsContainer.innerHTML = '';
    if (clearBtn) clearBtn.style.display = 'none';
  }

  closeSearchDropdown() {
    const dropdown = document.getElementById('careerSearchDropdown');
    if (dropdown) dropdown.style.display = 'none';
    const ghost = document.getElementById('careerSearchGhost');
    if (ghost) ghost.textContent = '';
  }

  setHomepageSearch(query) {
    const input = document.getElementById('careerSearchInput');
    if (input) {
      input.value = query;
      input.focus();
      this.handlePredictiveSearchInput(query);
    }
  }

  handlePredictiveSearchInput(val) {
    const input = document.getElementById('careerSearchInput');
    if (input && val !== undefined && input.value !== val) {
      input.value = val;
    }
    if (typeof this.updateHomepageSearchMatches === 'function') {
      this.updateHomepageSearchMatches();
    }
  }

  classifyHomepageSearchQuery(rawQuery) {
    if (!rawQuery) return { intent: 'general', cleanQuery: '', isCommand: false, raw: '' };
    const raw = rawQuery.trim();
    const lower = raw.toLowerCase();

    // 1. Explicit Slash Commands
    if (/^\/(role|career|job)\b/i.test(lower)) {
      return {
        intent: 'role',
        cleanQuery: raw.replace(/^\/(role|career|job)\s*/i, '').trim(),
        isCommand: true,
        raw
      };
    }
    if (/^\/(univ|university|college|inst|institution)\b/i.test(lower)) {
      return {
        intent: 'university',
        cleanQuery: raw.replace(/^\/(univ|university|college|inst|institution)\s*/i, '').trim(),
        isCommand: true,
        raw
      };
    }
    if (/^\/(course|prog|programme|degree)\b/i.test(lower)) {
      return {
        intent: 'course',
        cleanQuery: raw.replace(/^\/(course|prog|programme|degree)\s*/i, '').trim(),
        isCommand: true,
        raw
      };
    }

    // 2. Implicit Detection
    // Check if query contains role terms or matches career paths/destinations
    const roleKeywords = [
      'lawyer', 'corporate lawyer', 'advocate', 'counsel', 'attorney', 'legal', 'jurist', 'judge', 'solicitor', 'paralegal',
      'expert', 'manager', 'lead', 'director', 'specialist', 'analyst', 'engineer',
      'scientist', 'developer', 'architect', 'designer', 'producer', 'strategist',
      'consultant', 'marketer', 'associate', 'trainee', 'officer', 'head', 'vp',
      'growth', 'digital marketing', 'founder', 'entrepreneur', 'administrator',
      'executive', 'accountant', 'auditor', 'banker', 'trader', 'recruiter', 'hr',
      'coordinator', 'operator', 'instructor', 'educator', 'researcher', 'writer',
      'journalist', 'editor', 'reporter', 'doctor', 'physician', 'pharmacist',
      'therapist', 'nurse', 'product manager', 'project manager', 'scrum master'
    ];

    let matchesRoleDestination = false;
    let matchedDestinationTitle = '';
    if (NEXORA_DATA && NEXORA_DATA.directions) {
      Object.values(NEXORA_DATA.directions).forEach(dir => {
        if (dir && Array.isArray(dir.destinations)) {
          dir.destinations.forEach(dest => {
            if (dest && dest.title) {
              const dLower = dest.title.toLowerCase();
              if (lower.includes(dLower) || dLower.includes(lower)) {
                matchesRoleDestination = true;
                matchedDestinationTitle = dest.title;
              }
            }
          });
        }
      });
    }

    const hasRoleKeyword = roleKeywords.some(rk => {
      const reg = new RegExp(`\\b${rk.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      return reg.test(lower) || lower.includes(rk);
    });

    // Check University Name / ShortName / Alias / Institution terms
    let matchesUniversity = false;
    let matchedUnivObj = null;
    const allUnivs = [
      ...(NEXORA_DATA.universities || []),
      ...(window.AUTHENTIC_EXTERNAL_REGISTRY || [])
    ];
    for (const u of allUnivs) {
      const uName = (u.name || '').toLowerCase();
      const uShort = (u.shortName || '').toLowerCase();
      if ((uShort && (lower === uShort || lower.includes(uShort))) ||
          (uName && (lower.includes(uName) || uName.includes(lower)))) {
        matchesUniversity = true;
        matchedUnivObj = u;
        break;
      }
      if (Array.isArray(u.aliases) && u.aliases.some(a => a && (lower === a.toLowerCase() || lower.includes(a.toLowerCase())))) {
        matchesUniversity = true;
        matchedUnivObj = u;
        break;
      }
    }

    const univKeywords = [
      'university', 'univ', 'campus', 'college', 'institute', 'institution',
      'academy', 'vidyapeeth', 'vishwavidyalaya', 'deemed'
    ];
    const hasUnivKeyword = univKeywords.some(uk => {
      const reg = new RegExp(`\\b${uk}\\b`, 'i');
      return reg.test(lower);
    });

    // Check Course / Degree
    const courseKeywords = [
      'mba', 'mca', 'bba', 'bca', 'b.com', 'm.com', 'bcom', 'mcom',
      'b.sc', 'm.sc', 'bsc', 'msc', 'b.tech', 'm.tech', 'btech', 'mtech',
      'ba', 'ma', 'll.b', 'llb', 'll.m', 'llm', 'bba ll.b', 'bba llb', 'ba ll.b', 'ba llb',
      'master', 'bachelor', 'degree', 'pgdm', 'data science',
      'business analytics', 'artificial intelligence', 'machine learning',
      'cloud computing', 'cyber security', 'cybersecurity', 'journalism'
    ];
    const isCourseMatch = courseKeywords.some(ck => {
      const regex = new RegExp(`\\b${ck.replace('.', '\\.')}\\b`, 'i');
      return regex.test(lower) || lower.includes(ck);
    });

    // Priority 1: If query has role terms and is NOT explicitly named after a university -> ROLE
    if ((hasRoleKeyword || matchesRoleDestination) && !hasUnivKeyword) {
      return {
        intent: 'role',
        cleanQuery: raw,
        isCommand: false,
        raw,
        matchedRoleHint: matchedDestinationTitle
      };
    }

    // Priority 2: University match or university keyword
    if (matchesUniversity || hasUnivKeyword) {
      return {
        intent: 'university',
        cleanQuery: raw,
        isCommand: false,
        raw,
        matchedUniv: matchedUnivObj
      };
    }

    // Priority 3: Course match
    if (isCourseMatch) {
      return {
        intent: 'course',
        cleanQuery: raw,
        isCommand: false,
        raw
      };
    }

    // Fallback: If role keyword found even with university keyword
    if (hasRoleKeyword || matchesRoleDestination) {
      return {
        intent: 'role',
        cleanQuery: raw,
        isCommand: false,
        raw,
        matchedRoleHint: matchedDestinationTitle
      };
    }

    return {
      intent: 'general',
      cleanQuery: raw,
      isCommand: false,
      raw
    };
  }

  searchEntitiesByIntent(classification, query) {
    const qLower = (classification.cleanQuery || query || '').toLowerCase().trim();
    const intent = classification.intent || 'general';

    // Aggregate all internal & external programmes
    const allProgs = [...(NEXORA_DATA.programmes || [])];
    if (window.AUTHENTIC_EXTERNAL_REGISTRY) {
      window.AUTHENTIC_EXTERNAL_REGISTRY.forEach(reg => {
        if (Array.isArray(reg.programmes)) {
          reg.programmes.forEach(p => {
            if (!allProgs.some(ap => ap.id === p.id)) {
              allProgs.push(p);
            }
          });
        }
      });
    }

    // Aggregate all universities
    const allUnivs = [
      ...(NEXORA_DATA.universities || []),
      ...(window.AUTHENTIC_EXTERNAL_REGISTRY || [])
    ];
    if (this.discoveredUniversities) {
      Object.values(this.discoveredUniversities).forEach(du => {
        if (du && !allUnivs.some(u => u.id === du.id)) {
          allUnivs.push(du);
        }
      });
    }

    // ==========================================
    // CASE 1: ROLE SEARCH
    // ==========================================
    if (intent === 'role') {
      const stopWords = ['expert', 'specialist', 'lead', 'manager', 'director', 'professional', 'associate', 'role', 'job', 'career', 'in', 'for', 'the', 'a', 'an', 'looking'];
      const rawTokens = qLower.split(/\s+/).filter(t => t.length > 1);
      const coreTokens = rawTokens.filter(t => !stopWords.includes(t));
      const searchTokens = coreTokens.length > 0 ? coreTokens : rawTokens;

      // Find matching programmes
      const matchedProgrammes = [];
      allProgs.forEach(p => {
        if (!p) return;
        let matchScore = 0;
        let matchedReason = '';

        // A. Match against careerPaths
        if (Array.isArray(p.careerPaths)) {
          for (const cp of p.careerPaths) {
            const cpLower = cp.toLowerCase();
            if (qLower && cpLower.includes(qLower)) {
              matchScore += 100;
              matchedReason = `Prepares for: ${cp}`;
              break;
            }
            if (searchTokens.length > 0 && searchTokens.every(tok => cpLower.includes(tok))) {
              matchScore += 80;
              matchedReason = `Prepares for: ${cp}`;
              break;
            }
            if (searchTokens.some(tok => cpLower.includes(tok))) {
              matchScore += 40;
              if (!matchedReason) matchedReason = `Role alignment: ${cp}`;
            }
          }
        }

        // B. Match against specialisations
        if (Array.isArray(p.specialisations)) {
          for (const sp of p.specialisations) {
            const spLower = sp.toLowerCase();
            if (qLower && spLower.includes(qLower)) {
              matchScore += 70;
              if (!matchedReason) matchedReason = `Specialisation: ${sp}`;
              break;
            }
            if (searchTokens.length > 0 && searchTokens.every(tok => spLower.includes(tok))) {
              matchScore += 60;
              if (!matchedReason) matchedReason = `Specialisation: ${sp}`;
              break;
            }
          }
        }

        // C. Match programme name
        if (p.name) {
          const nameLower = p.name.toLowerCase();
          if (searchTokens.length > 0 && searchTokens.every(tok => nameLower.includes(tok))) {
            matchScore += 50;
            if (!matchedReason) matchedReason = 'Curriculum Specialisation';
          }
        }

        // D. Check Directions mapping
        if (NEXORA_DATA.directions) {
          Object.values(NEXORA_DATA.directions).forEach(dir => {
            if (dir && Array.isArray(dir.programmeIds) && dir.programmeIds.includes(p.id)) {
              if (dir.destinations && dir.destinations.some(d => d.title && searchTokens.some(tok => d.title.toLowerCase().includes(tok)))) {
                matchScore += 30;
                if (!matchedReason) matchedReason = `${dir.name} Route`;
              }
            }
          });
        }

        if (matchScore > 0) {
          matchedProgrammes.push({
            ...p,
            matchScore,
            matchedRoleReason: matchedReason || 'Career Role Track'
          });
        }
      });

      matchedProgrammes.sort((a, b) => b.matchScore - a.matchScore);

      // Find matching Career Destination
      let matchedCareer = null;
      let matchedSkills = [];
      if (NEXORA_DATA.directions) {
        let bestScore = 0;
        Object.keys(NEXORA_DATA.directions).forEach(dirKey => {
          const dir = NEXORA_DATA.directions[dirKey];
          if (dir && Array.isArray(dir.destinations)) {
            dir.destinations.forEach(dest => {
              if (dest && dest.title) {
                const titleLower = dest.title.toLowerCase();
                let score = 0;
                if (titleLower.includes(qLower)) score += 100;
                else if (searchTokens.length > 0 && searchTokens.every(t => titleLower.includes(t))) score += 80;
                else if (searchTokens.some(t => titleLower.includes(t))) score += 40;

                if (score > bestScore) {
                  bestScore = score;
                  matchedCareer = { ...dest, dirKey, dirName: dir.name, skills: dir.skills || [] };
                }
              }
            });
          }
          if (dir && Array.isArray(dir.skills)) {
            dir.skills.forEach(skill => {
              if (searchTokens.some(t => skill.toLowerCase().includes(t)) && !matchedSkills.includes(skill)) {
                matchedSkills.push(skill);
              }
            });
          }
        });
      }

      // If user typed empty /role
      if (!qLower) {
        const sampleProgs = allProgs.slice(0, 5).map(p => ({
          ...p,
          matchedRoleReason: (p.careerPaths && p.careerPaths[0]) ? `Prepares for: ${p.careerPaths[0]}` : 'Career Track'
        }));
        return {
          intent: 'role',
          roleDisplayName: 'Trending Roles',
          matchedProgrammes: sampleProgs,
          matchedCareer: {
            title: 'Digital Marketing Manager',
            avgSalary: '₹8.5 - ₹16 LPA',
            demand: 'High Growth',
            dirKey: 'MARKETING',
            skills: ['SEO & SEM', 'Paid Ads', 'Analytics']
          },
          matchedSkills: ['SEO & SEM', 'Python', 'Product Strategy']
        };
      }

      const roleDisplayName = classification.matchedRoleHint || classification.cleanQuery || query;
      return {
        intent: 'role',
        roleDisplayName,
        matchedProgrammes: matchedProgrammes.slice(0, 6),
        matchedCareer,
        matchedSkills
      };
    }

    // ==========================================
    // CASE 2: UNIVERSITY SEARCH
    // ==========================================
    if (intent === 'university') {
      const matchedUniversities = [];
      allUnivs.forEach(u => {
        if (!u) return;
        const uName = (u.name || '').toLowerCase();
        const uShort = (u.shortName || '').toLowerCase();
        const uLoc = (u.location || '').toLowerCase();
        const isAlias = Array.isArray(u.aliases) && u.aliases.some(a => a && a.toLowerCase().includes(qLower));

        if (!qLower || uName.includes(qLower) || uShort.includes(qLower) || uLoc.includes(qLower) || isAlias) {
          // Find programmes offered by this university
          const offeredProgrammes = allProgs.filter(p => {
            if (!p) return false;
            const matchesId = p.universityId === u.id;
            const matchesName = p.universityName && u.name && p.universityName.toLowerCase().includes(u.name.toLowerCase());
            const matchesShort = p.universityName && u.shortName && p.universityName.toLowerCase().includes(u.shortName.toLowerCase());
            return matchesId || matchesName || matchesShort;
          });

          matchedUniversities.push({
            ...u,
            offeredProgrammes
          });
        }
      });

      return {
        intent: 'university',
        universityDisplayName: classification.cleanQuery || query || 'Accredited Universities',
        matchedUniversities: matchedUniversities.slice(0, 3)
      };
    }

    // ==========================================
    // CASE 3: COURSE / DEGREE SEARCH
    // ==========================================
    if (intent === 'course') {
      const matchedProgrammes = allProgs.filter(p => {
        if (!p) return false;
        if (!qLower) return true;
        const nameMatch = p.name && p.name.toLowerCase().includes(qLower);
        const specMatch = Array.isArray(p.specialisations) && p.specialisations.some(s => s && s.toLowerCase().includes(qLower));
        const levelMatch = p.level && p.level.toLowerCase() === qLower;
        return nameMatch || specMatch || levelMatch;
      });

      // Extract universities offering this course
      const universitiesOffering = [];
      const seenUnivKeys = new Set();

      matchedProgrammes.forEach(prog => {
        const uId = prog.universityId;
        let univ = allUnivs.find(u => u.id === uId);
        if (!univ && prog.universityName) {
          univ = allUnivs.find(u => {
            const un = (u.name || '').toLowerCase();
            const us = (u.shortName || '').toLowerCase();
            const pn = prog.universityName.toLowerCase();
            return un.includes(pn) || us.includes(pn) || pn.includes(us);
          });
        }
        if (!univ) {
          univ = {
            id: prog.universityId || `univ-${prog.id}`,
            name: prog.universityName || 'Accredited University',
            shortName: prog.universityName || 'Accredited University',
            location: 'India',
            approvals: ['UGC-DEB Approved', 'NAAC Accredited']
          };
        }

        const key = univ.id || univ.name;
        if (!seenUnivKeys.has(key)) {
          seenUnivKeys.add(key);
          universitiesOffering.push({
            university: univ,
            course: prog,
            fee: prog.totalFee,
            duration: prog.duration
          });
        }
      });

      return {
        intent: 'course',
        courseDisplayName: classification.cleanQuery || query || 'Online Degrees',
        universitiesOffering: universitiesOffering.slice(0, 5),
        matchedProgrammes: matchedProgrammes.slice(0, 6)
      };
    }

    // ==========================================
    // CASE 4: GENERAL / HYBRID SEARCH
    // ==========================================
    const matchedProgrammes = allProgs.filter(p => {
      if (!p) return false;
      const nameMatch = p.name && p.name.toLowerCase().includes(qLower);
      const univMatch = p.universityName && p.universityName.toLowerCase().includes(qLower);
      const specMatch = Array.isArray(p.specialisations) && p.specialisations.some(s => s && s.toLowerCase().includes(qLower));
      const careerMatch = Array.isArray(p.careerPaths) && p.careerPaths.some(c => c && c.toLowerCase().includes(qLower));
      return nameMatch || univMatch || specMatch || careerMatch;
    }).slice(0, 4);

    const matchedUniversities = allUnivs.filter(u => {
      if (!u) return false;
      const nameMatch = u.name && u.name.toLowerCase().includes(qLower);
      const shortMatch = u.shortName && u.shortName.toLowerCase().includes(qLower);
      const locMatch = u.location && u.location.toLowerCase().includes(qLower);
      return nameMatch || shortMatch || locMatch;
    }).slice(0, 3);

    const matchedCareers = [];
    const matchedSkills = [];
    if (NEXORA_DATA.directions) {
      Object.keys(NEXORA_DATA.directions).forEach(dirKey => {
        const dir = NEXORA_DATA.directions[dirKey];
        if (dir && Array.isArray(dir.destinations)) {
          dir.destinations.forEach(dest => {
            if (dest && dest.title && dest.title.toLowerCase().includes(qLower)) {
              matchedCareers.push({ ...dest, dirKey });
            }
          });
        }
        if (dir && Array.isArray(dir.skills)) {
          dir.skills.forEach(skill => {
            if (skill && skill.toLowerCase().includes(qLower) && !matchedSkills.includes(skill)) {
              matchedSkills.push({ skill, dirKey });
            }
          });
        }
      });
    }

    return {
      intent: 'general',
      matchedProgrammes,
      matchedUniversities,
      matchedCareers,
      matchedSkills
    };
  }

  initPredictiveSearch() {
    const input = document.getElementById('careerSearchInput');
    const ghost = document.getElementById('careerSearchGhost');
    const dropdown = document.getElementById('careerSearchDropdown');
    const suggestionsContainer = document.getElementById('careerSearchSuggestions');
    const clearBtn = document.getElementById('careerSearchClearBtn');
    const submitBtn = document.getElementById('careerSearchSubmitBtn');

    if (!input) return;

    const updateMatches = () => {
      try {
        const rawQuery = input ? input.value : '';
        const query = this.normalizeSearchQuery(rawQuery);
        this.currentHomepageSearchQuery = query;

        if (this.homepageSearchTimeout) {
          clearTimeout(this.homepageSearchTimeout);
          this.homepageSearchTimeout = null;
        }

        if (!query) {
          this.clearHomepageSearch();
          return;
        }

        if (clearBtn) clearBtn.style.display = 'flex';

        this.homepageSearchRequestId++;
        const currentRequestId = this.homepageSearchRequestId;

        // Classify and Search Entities
        const classification = this.classifyHomepageSearchQuery(query);
        const searchResults = this.searchEntitiesByIntent(classification, query);

        // Update Ghost Autocomplete
        if (ghost) {
          const lower = query.toLowerCase();
          let suggestion = '';
          if (lower.startsWith('/r')) suggestion = '/role digital marketing expert';
          else if (lower.startsWith('/u')) suggestion = '/university Manipal University';
          else if (lower.startsWith('/c')) suggestion = '/course Online MBA';
          else if ('digital marketing expert'.startsWith(lower)) suggestion = 'digital marketing expert';
          else if ('manipal university'.startsWith(lower)) suggestion = 'Manipal University';
          else if ('online mba'.startsWith(lower)) suggestion = 'Online MBA';

          if (suggestion && suggestion.toLowerCase() !== lower && suggestion.toLowerCase().startsWith(lower)) {
            ghost.textContent = query + suggestion.slice(query.length);
          } else {
            ghost.textContent = '';
          }
        }

        // Check if any results were found
        let hasMatches = false;
        if (searchResults.intent === 'role') {
          hasMatches = (searchResults.matchedProgrammes && searchResults.matchedProgrammes.length > 0) || !!searchResults.matchedCareer;
        } else if (searchResults.intent === 'university') {
          hasMatches = searchResults.matchedUniversities && searchResults.matchedUniversities.length > 0;
        } else if (searchResults.intent === 'course') {
          hasMatches = (searchResults.universitiesOffering && searchResults.universitiesOffering.length > 0) || (searchResults.matchedProgrammes && searchResults.matchedProgrammes.length > 0);
        } else {
          hasMatches = (searchResults.matchedProgrammes && searchResults.matchedProgrammes.length > 0) ||
                       (searchResults.matchedUniversities && searchResults.matchedUniversities.length > 0) ||
                       (searchResults.matchedCareers && searchResults.matchedCareers.length > 0);
        }

        if (!hasMatches) {
          if (ghost) ghost.textContent = '';

          // GUARD: Never trigger university discovery for role searches!
          if (searchResults.intent === 'role') {
            if (suggestionsContainer) {
              suggestionsContainer.innerHTML = `
                <div style="padding: 20px 16px; text-align: center;">
                  <div style="font-size: 0.95rem; font-weight: 850; color: var(--navy);">No direct career role matches found for "${query}"</div>
                  <div style="font-size: 0.8rem; color: var(--charcoal-muted); margin-top: 4px; margin-bottom: 12px;">Try searching for verified career roles:</div>
                  <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                    <button class="search-tag-chip" onclick="app.setHomepageSearch('Corporate Lawyer')">💼 Corporate Lawyer</button>
                    <button class="search-tag-chip" onclick="app.setHomepageSearch('/role digital marketing manager')">💼 Digital Marketing Manager</button>
                    <button class="search-tag-chip" onclick="app.setHomepageSearch('/role data scientist')">🧠 Data Scientist</button>
                    <button class="search-tag-chip" onclick="app.setHomepageSearch('/role full stack engineer')">⚙️ Full Stack Engineer</button>
                  </div>
                </div>
              `;
            }
            if (dropdown) dropdown.style.display = 'block';
            return;
          }

          // Only search external university registries if intent is university or query has university keywords
          const isUnivSearch = searchResults.intent === 'university' || /\b(univ|university|college|campus|institute|academy|vidyapeeth)\b/i.test(query);

          if (isUnivSearch) {
            if (suggestionsContainer) {
              suggestionsContainer.innerHTML = `
                <div style="padding: 20px 16px; text-align: center; color: var(--navy);">
                  <div style="width: 24px; height: 24px; border: 2.5px solid rgba(0,102,255,0.2); border-top-color: #0066FF; border-radius: 50%; animation: borderSpin 0.8s linear infinite; margin: 0 auto 10px auto;"></div>
                  <div style="font-weight: 750; font-size: 0.88rem; color: var(--navy);">Searching external university registries for "${query}"...</div>
                  <div style="font-size: 0.78rem; color: var(--charcoal-muted); margin-top: 4px;">Checking accredited statutory directories</div>
                </div>
              `;
            }
            if (dropdown) dropdown.style.display = 'block';

            this.homepageSearchTimeout = setTimeout(async () => {
              if (currentRequestId !== this.homepageSearchRequestId) return;
              if (this.normalizeSearchQuery(input ? input.value : '') !== query) return;

              if (!this.discoveryEngine && window.ExternalUniversityDiscovery) {
                this.discoveryEngine = new window.ExternalUniversityDiscovery();
              }
              if (!this.discoveryEngine) return;

              const res = await this.discoveryEngine.discover(query);

              if (currentRequestId !== this.homepageSearchRequestId) return;
              if (this.normalizeSearchQuery(input ? input.value : '') !== query) return;

              if ((res.status === 'success' && res.university) || (res.status === 'disambiguation' && res.matches)) {
                const discoveredList = res.university ? [res.university] : res.matches;
                discoveredList.forEach(m => this.registerDiscoveredUniversity(m));
                const updatedClassification = { intent: 'university', cleanQuery: query };
                const updatedResults = this.searchEntitiesByIntent(updatedClassification, query);
                this.renderCategorizedSearchResults(query, updatedResults, currentRequestId);
              } else {
                if (currentRequestId !== this.homepageSearchRequestId) return;
                if (this.normalizeSearchQuery(input ? input.value : '') !== query) return;

                if (suggestionsContainer) {
                  suggestionsContainer.innerHTML = `
                    <div style="padding: 20px 16px; text-align: center;">
                      <div style="font-size: 0.92rem; font-weight: 750; color: var(--navy);">No verified university found for "${query}"</div>
                      <div style="font-size: 0.8rem; color: var(--charcoal-muted); margin-top: 4px; margin-bottom: 12px;">Browse accredited partner institutions:</div>
                      <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                        <button class="search-tag-chip" onclick="app.setHomepageSearch('Manipal')">🏛️ Manipal</button>
                        <button class="search-tag-chip" onclick="app.setHomepageSearch('Amity')">🏛️ Amity</button>
                        <button class="search-tag-chip" onclick="app.setHomepageSearch('Bennett')">🏛️ Bennett</button>
                        <button class="search-tag-chip" onclick="app.setHomepageSearch('NMIMS')">🏛️ NMIMS</button>
                      </div>
                    </div>
                  `;
                }
              }
            }, 300);

            return;
          }

          // General not found
          if (suggestionsContainer) {
            suggestionsContainer.innerHTML = `
              <div style="padding: 20px 16px; text-align: center;">
                <div style="font-size: 0.92rem; font-weight: 750; color: var(--navy);">No direct matches found for "${query}"</div>
                <div style="font-size: 0.8rem; color: var(--charcoal-muted); margin-top: 4px; margin-bottom: 12px;">Try searching for a role, university, or course:</div>
                <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                  <button class="search-tag-chip" onclick="app.setHomepageSearch('Corporate Lawyer')">💼 Corporate Lawyer</button>
                  <button class="search-tag-chip" onclick="app.setHomepageSearch('/role digital marketing expert')">💼 /role digital marketing expert</button>
                  <button class="search-tag-chip" onclick="app.setHomepageSearch('Manipal')">🏛️ Manipal</button>
                  <button class="search-tag-chip" onclick="app.setHomepageSearch('MBA')">🎓 MBA</button>
                </div>
              </div>
            `;
          }
          if (dropdown) dropdown.style.display = 'block';
          return;
        }

        this.renderCategorizedSearchResults(query, searchResults, currentRequestId);
      } catch (err) {
        console.error('NEXORA Search updateMatches error:', err);
      }
    };

    this.updateHomepageSearchMatches = updateMatches;

    input.addEventListener('input', updateMatches);
    input.addEventListener('focus', () => {
      if (input.value && input.value.trim()) {
        updateMatches();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dropdown) {
        dropdown.style.display = 'none';
      } else if (e.key === 'Tab' || (e.key === 'ArrowRight' && ghost && ghost.textContent && input.selectionStart === input.value.length)) {
        if (ghost && ghost.textContent) {
          e.preventDefault();
          input.value = ghost.textContent;
          updateMatches();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.executeHomepageSearch(input.value);
      }
    });

    if (submitBtn) {
      submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.executeHomepageSearch(input.value);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearHomepageSearch();
        input.focus();
      });
    }

    document.addEventListener('click', (e) => {
      const box = document.getElementById('universalSearchBox');
      if (box && !box.contains(e.target) && dropdown && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  renderCategorizedSearchResults(query, searchData, requestId) {
    const input = document.getElementById('careerSearchInput');
    const dropdown = document.getElementById('careerSearchDropdown');
    const suggestionsContainer = document.getElementById('careerSearchSuggestions');
    if (!suggestionsContainer) return;

    if (requestId && requestId !== this.homepageSearchRequestId) return;
    if (input && this.normalizeSearchQuery(input.value) !== query) return;

    // Handle backward compatibility if called with legacy parameters
    let data = searchData;
    if (Array.isArray(searchData)) {
      const matchedProgrammes = arguments[1] || [];
      const matchedUniversities = arguments[2] || [];
      const matchedExternalUniversities = arguments[3] || [];
      const matchedCareers = arguments[4] || [];
      const matchedSkills = arguments[5] || [];
      data = {
        intent: 'general',
        matchedProgrammes,
        matchedUniversities: [...matchedUniversities, ...matchedExternalUniversities],
        matchedCareers,
        matchedSkills
      };
    }

    let html = '';

    // ==========================================
    // 1. RENDER ROLE INTENT RESULTS
    // ==========================================
    if (data.intent === 'role') {
      const roleName = data.roleDisplayName || query;

      // 1A. Programmes preparing for this role
      if (data.matchedProgrammes && data.matchedProgrammes.length > 0) {
        html += `
          <div class="search-category-header" style="background: rgba(0, 102, 255, 0.08); color: #0047B3; border-left: 4px solid #0066FF;">
            🎓 PROGRAMMES PREPARING FOR: ${roleName.toUpperCase()} (${data.matchedProgrammes.length} OPTIONS)
          </div>
        `;

        data.matchedProgrammes.forEach(p => {
          if (!p) return;
          html += `
            <div class="role-prog-item" onclick="app.navigateToProgramme('${p.id}'); app.closeSearchDropdown();">
              <div style="flex: 1; min-width: 0;">
                <div class="suggestion-title" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span>${p.name}</span>
                  <span class="suggestion-badge programme">${p.level || 'Degree'}</span>
                </div>
                <div class="suggestion-sub" style="margin-top: 4px; color: var(--charcoal-muted); font-size: 0.82rem;">
                  🏛️ ${p.universityName || 'Accredited University'} • ⏳ ${p.duration || 'Online'} • 💰 ${p.totalFee || 'Affordable'}
                </div>
                <div style="margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                  <span class="role-match-tag">
                    🎯 ${p.matchedRoleReason || 'Prepares for: ' + roleName}
                  </span>
                  ${p.specialisations && p.specialisations.length ? `<span style="font-size: 0.72rem; color: var(--charcoal-muted);">Tracks: ${p.specialisations.slice(0, 2).join(', ')}</span>` : ''}
                </div>
              </div>
              <button class="btn btn-navy btn-sm" style="flex-shrink: 0; padding: 6px 12px; font-size: 0.78rem;" onclick="event.stopPropagation(); app.navigateToProgramme('${p.id}'); app.closeSearchDropdown();">
                View Programme →
              </button>
            </div>
          `;
        });
      }

      // 1B. Career Roadmap Insight Card
      if (data.matchedCareer) {
        const c = data.matchedCareer;
        html += `
          <div class="search-category-header" style="background: rgba(255, 193, 7, 0.1); color: #8A6100; border-left: 4px solid #FFC107;">
            💼 CAREER ROLE ROADMAP & BENCHMARKS
          </div>
          <div class="career-insight-item" onclick="app.openRouteModal('${c.dirKey || 'MARKETING'}'); app.closeSearchDropdown();">
            <div style="flex: 1;">
              <div style="font-size: 1rem; font-weight: 850; color: var(--navy);">${c.title}</div>
              <div style="font-size: 0.82rem; color: var(--charcoal-muted); margin-top: 4px;">
                💰 Benchmark Salary: <strong style="color: #005A2B;">${c.avgSalary || '₹8.5 - ₹16 LPA'}</strong> • 📈 Market Demand: <strong>${c.demand || 'High Growth'}</strong>
              </div>
              ${c.skills && c.skills.length ? `
                <div style="margin-top: 6px; font-size: 0.76rem; color: var(--charcoal-muted);">
                  ⚡ In-Demand Skills: <strong>${c.skills.slice(0, 4).join(', ')}</strong>
                </div>
              ` : ''}
            </div>
            <button class="btn btn-secondary btn-sm" style="flex-shrink: 0; font-size: 0.78rem; padding: 6px 12px;" onclick="event.stopPropagation(); app.openRouteModal('${c.dirKey || 'MARKETING'}'); app.closeSearchDropdown();">
              Explore Route 🧭
            </button>
          </div>
        `;
      }
    }

    // ==========================================
    // 2. RENDER UNIVERSITY INTENT RESULTS
    // ==========================================
    else if (data.intent === 'university') {
      const univs = data.matchedUniversities || [];

      if (univs.length > 0) {
        html += `
          <div class="search-category-header" style="background: rgba(0, 90, 43, 0.08); color: var(--trust-green); border-left: 4px solid var(--trust-green);">
            🏛️ MATCHED UNIVERSITY PROFILE
          </div>
        `;

        univs.forEach(u => {
          if (!u) return;
          const isSaved = this.isWishlisted(u.id, 'university');
          const isCompared = (this.compareManager && typeof this.compareManager.hasItem === 'function')
            ? this.compareManager.hasItem(u.id)
            : (this.compareManager && Array.isArray(this.compareManager.selectedUniversities) && this.compareManager.selectedUniversities.includes(u.id));

          html += `
            <div class="suggestion-item" style="flex-direction: column; align-items: flex-start; gap: 10px; padding: 14px 18px; background: rgba(0, 90, 43, 0.02); border-bottom: 2px solid var(--grey-light);">
              <div style="display: flex; justify-content: space-between; width: 100%; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
                <div>
                  <div style="font-size: 1.08rem; font-weight: 850; color: var(--navy); line-height: 1.3;">${u.name}</div>
                  <div style="color: var(--charcoal-muted); font-size: 0.84rem; margin-top: 3px;">
                    📍 ${u.location || 'India'} • ⭐ ${u.rating || 4.8} (${u.reviewCount || 400}+ reviews) • 💰 Starts ${u.startingFee || 'Affordable'}
                  </div>
                  <div style="margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap;">
                    ${(u.approvals || ['UGC-DEB Approved', 'NAAC Accredited']).map(appr => `
                      <span style="background: rgba(0, 90, 43, 0.1); color: var(--trust-green); font-size: 0.7rem; font-weight: 800; padding: 2px 7px; border-radius: 4px;">
                        ✓ ${appr}
                      </span>
                    `).join('')}
                  </div>
                </div>
                <span class="suggestion-badge university" style="font-size: 0.72rem; padding: 4px 10px;">ACCREDITED UNIV</span>
              </div>

              <div style="display: flex; gap: 8px; margin-top: 6px; width: 100%; flex-wrap: wrap;" onclick="event.stopPropagation();">
                <button class="btn btn-navy btn-sm" style="padding: 6px 14px; font-size: 0.8rem; font-weight: 750;" onclick="app.navigateToUniversity('${u.id}'); app.closeSearchDropdown();">
                  Explore University Page →
                </button>
                <button class="btn btn-secondary btn-sm" style="padding: 6px 12px; font-size: 0.8rem; font-weight: 700;" onclick="app.toggleWishlist('${u.id}', 'university'); app.updateSearchWishlistBtn(this, '${u.id}');">
                  ${isSaved ? '♥ Saved' : '♡ Save'}
                </button>
                <button class="btn btn-secondary btn-sm" style="padding: 6px 12px; font-size: 0.8rem; font-weight: 700;" onclick="app.toggleCompare('${u.id}'); app.updateSearchCompareBtn(this, '${u.id}');">
                  ${isCompared ? '✓ Compared' : '+ Compare'}
                </button>
              </div>
            </div>
          `;

          // Programmes offered by this university
          if (u.offeredProgrammes && u.offeredProgrammes.length > 0) {
            html += `
              <div class="search-category-header" style="background: rgba(0, 27, 102, 0.05); color: var(--navy); border-left: 4px solid var(--navy);">
                🎓 PROGRAMMES OFFERED BY ${ (u.shortName || u.name).toUpperCase() } (${u.offeredProgrammes.length} DEGREES)
              </div>
            `;

            u.offeredProgrammes.slice(0, 5).forEach(p => {
              if (!p) return;
              html += `
                <div class="suggestion-item" onclick="app.navigateToProgramme('${p.id}'); app.closeSearchDropdown();">
                  <div style="flex: 1; min-width: 0;">
                    <div class="suggestion-title">${p.name}</div>
                    <div class="suggestion-sub" style="margin-top: 3px; font-size: 0.82rem; color: var(--charcoal-muted);">
                      ⏳ ${p.duration || 'Online'} • 💰 ${p.totalFee || 'Affordable'} • ${p.mode || '100% Online'}
                    </div>
                    ${p.specialisations && p.specialisations.length ? `
                      <div style="font-size: 0.72rem; color: var(--charcoal-muted); margin-top: 4px;">
                        Specialisations: ${p.specialisations.slice(0, 3).join(', ')}${p.specialisations.length > 3 ? '...' : ''}
                      </div>
                    ` : ''}
                  </div>
                  <button class="btn btn-navy btn-sm" style="flex-shrink: 0; padding: 6px 12px; font-size: 0.78rem;" onclick="event.stopPropagation(); app.navigateToProgramme('${p.id}'); app.closeSearchDropdown();">
                    View Degree →
                  </button>
                </div>
              `;
            });
          }
        });
      }
    }

    // ==========================================
    // 3. RENDER COURSE / DEGREE INTENT RESULTS
    // ==========================================
    else if (data.intent === 'course') {
      const courseTitle = data.courseDisplayName || query;

      // 3A. UNIVERSITIES OFFERING THIS COURSE
      if (data.universitiesOffering && data.universitiesOffering.length > 0) {
        html += `
          <div class="search-category-header" style="background: rgba(0, 90, 43, 0.08); color: var(--trust-green); border-left: 4px solid var(--trust-green);">
            🏛️ UNIVERSITIES OFFERING ${courseTitle.toUpperCase()} (${data.universitiesOffering.length} INSTITUTIONS)
          </div>
        `;

        data.universitiesOffering.forEach(item => {
          if (!item || !item.university) return;
          const u = item.university;
          const c = item.course;
          html += `
            <div class="univ-offering-course-item" onclick="app.navigateToProgramme('${c.id}'); app.closeSearchDropdown();">
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                  <div style="font-size: 0.98rem; font-weight: 850; color: var(--navy);">${u.name}</div>
                  <span class="suggestion-badge" style="background: rgba(0, 90, 43, 0.1); color: var(--trust-green); font-size: 0.7rem; font-weight: 800;">
                    ${u.approvals ? (u.approvals[0] || 'UGC-DEB') : 'UGC-DEB Approved'}
                  </span>
                </div>
                <div style="font-size: 0.85rem; font-weight: 750; color: var(--navy); margin-top: 5px;">
                  🎓 Degree: <span style="color: var(--trust-green);">${c.name}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--charcoal-muted); margin-top: 3px; display: flex; gap: 12px; flex-wrap: wrap;">
                  <span>📍 ${u.location || 'India'}</span>
                  <span>💰 Fee: <strong style="color: var(--navy);">${c.totalFee || 'Affordable'}</strong></span>
                  <span>⏳ ${c.duration || 'Online'}</span>
                </div>
              </div>
              <div style="display: flex; gap: 6px; flex-shrink: 0; align-items: center;" onclick="event.stopPropagation();">
                <button class="btn btn-navy btn-sm" style="padding: 6px 12px; font-size: 0.78rem;" onclick="app.navigateToProgramme('${c.id}'); app.closeSearchDropdown();">
                  View Course Details →
                </button>
                <button class="btn btn-secondary btn-sm" style="padding: 6px 10px; font-size: 0.78rem;" onclick="app.navigateToUniversity('${u.id}'); app.closeSearchDropdown();" title="View University Profile">
                  🏛️ Univ Page
                </button>
              </div>
            </div>
          `;
        });
      }

      // 3B. INDIVIDUAL MATCHED PROGRAMMES
      if (data.matchedProgrammes && data.matchedProgrammes.length > 0) {
        html += `
          <div class="search-category-header" style="background: rgba(0, 27, 102, 0.05); color: var(--navy); border-left: 4px solid var(--navy);">
            🎓 AVAILABLE ${courseTitle.toUpperCase()} DEGREE OPTIONS (${data.matchedProgrammes.length})
          </div>
        `;

        data.matchedProgrammes.forEach(p => {
          if (!p) return;
          html += `
            <div class="suggestion-item" onclick="app.navigateToProgramme('${p.id}'); app.closeSearchDropdown();">
              <div style="flex: 1; min-width: 0;">
                <div class="suggestion-title">${p.name}</div>
                <div class="suggestion-sub" style="margin-top: 3px;">
                  🏛️ ${p.universityName || 'Accredited University'} • ⏳ ${p.duration || 'Online'} • 💰 ${p.totalFee || 'Affordable'}
                </div>
              </div>
              <button class="btn btn-navy btn-sm" style="flex-shrink: 0; padding: 6px 12px; font-size: 0.78rem;" onclick="event.stopPropagation(); app.navigateToProgramme('${p.id}'); app.closeSearchDropdown();">
                View Programme →
              </button>
            </div>
          `;
        });
      }
    }

    // ==========================================
    // 4. GENERAL / HYBRID RESULTS
    // ==========================================
    else {
      const qClassification = this.classifyHomepageSearchQuery(query);
      const isRoleQuery = qClassification.intent === 'role';
      const isUnivQuery = qClassification.intent === 'university';

      // Universities (STRICTLY SUPPRESSED IF QUERY IS A ROLE)
      if (data.matchedUniversities && data.matchedUniversities.length > 0 && !isRoleQuery) {
        html += `<div class="search-category-header">🏛️ UNIVERSITIES</div>`;
        data.matchedUniversities.forEach(u => {
          if (!u) return;
          html += `
            <div class="suggestion-item" onclick="app.navigateToUniversity('${u.id}'); app.closeSearchDropdown();">
              <div>
                <div class="suggestion-title">${u.name}</div>
                <div class="suggestion-sub">📍 ${u.location || 'India'} • ${u.totalProgrammes || 'Verified'} Degrees Offered</div>
              </div>
              <span class="suggestion-badge university">UNIV</span>
            </div>
          `;
        });
      }

      // Programmes
      if (data.matchedProgrammes && data.matchedProgrammes.length > 0) {
        html += `<div class="search-category-header">${isRoleQuery ? '🎓 PROGRAMMES PREPARING FOR THIS ROLE' : '🎓 PROGRAMMES'}</div>`;
        data.matchedProgrammes.forEach(p => {
          if (!p) return;
          html += `
            <div class="suggestion-item" onclick="app.navigateToProgramme('${p.id}'); app.closeSearchDropdown();">
              <div>
                <div class="suggestion-title">${p.name}</div>
                <div class="suggestion-sub">${p.universityName || 'Accredited University'} • ${p.duration || 'Degree'}</div>
              </div>
              <span class="suggestion-badge programme">${p.level || 'Degree'}</span>
            </div>
          `;
        });
      }

      // Careers (STRICTLY SUPPRESSED IF QUERY IS A UNIVERSITY)
      if (data.matchedCareers && data.matchedCareers.length > 0 && !isUnivQuery) {
        html += `<div class="search-category-header">💼 CAREER PATHS</div>`;
        data.matchedCareers.slice(0, 3).forEach(c => {
          if (!c) return;
          html += `
            <div class="suggestion-item" onclick="app.openRouteModal('${c.dirKey}'); app.closeSearchDropdown();">
              <div>
                <div class="suggestion-title">${c.title}</div>
                <div class="suggestion-sub">Benchmark Salary: ${c.avgSalary || 'Competitive'}</div>
              </div>
              <span class="suggestion-badge career">CAREER</span>
            </div>
          `;
        });
      }

      // Skills (STRICTLY SUPPRESSED IF QUERY IS A UNIVERSITY)
      if (data.matchedSkills && data.matchedSkills.length > 0 && !isUnivQuery) {
        html += `<div class="search-category-header">⚡ SKILLS</div>`;
        data.matchedSkills.slice(0, 2).forEach(s => {
          if (!s) return;
          html += `
            <div class="suggestion-item" onclick="app.filterCareers('${s.dirKey}'); app.closeSearchDropdown();">
              <div>
                <div class="suggestion-title">${s.skill}</div>
                <div class="suggestion-sub">Filter career role routes</div>
              </div>
              <span class="suggestion-badge skill">SKILL</span>
            </div>
          `;
        });
      }
    }

    suggestionsContainer.innerHTML = html;
    if (dropdown) dropdown.style.display = 'block';
  }

  async executeHomepageSearch(submittedQuery) {
    const input = document.getElementById('careerSearchInput');

    const rawVal = submittedQuery !== undefined && typeof submittedQuery === 'string'
      ? submittedQuery
      : (input ? input.value : '');
    const query = this.normalizeSearchQuery(rawVal);

    if (!query) {
      this.clearHomepageSearch();
      if (input) input.focus();
      return;
    }

    this.submittedHomepageSearchQuery = query;
    this.currentHomepageSearchQuery = query;
    this.homepageSearchRequestId++;

    if (this.homepageSearchTimeout) {
      clearTimeout(this.homepageSearchTimeout);
      this.homepageSearchTimeout = null;
    }

    if (input) input.value = query;

    // Close the homepage predictive dropdown menu when search is submitted
    this.closeSearchDropdown();

    const classification = this.classifyHomepageSearchQuery(query);
    const searchResults = this.searchEntitiesByIntent(classification, query);

    // ==========================================
    // 1. UNIVERSITY INTENT
    // ==========================================
    if (searchResults.intent === 'university' || classification.intent === 'university') {
      const univs = searchResults.matchedUniversities || [];
      const cleanTerm = (classification.cleanQuery || query).toLowerCase().trim();

      // Check if there is an exact or unambiguous university match
      const exactMatch = univs.find(u => {
        const uName = (u.name || '').toLowerCase();
        const uShort = (u.shortName || '').toLowerCase();
        return uName === cleanTerm || uShort === cleanTerm || cleanTerm.includes(uShort) || uShort.includes(cleanTerm);
      });

      if (exactMatch) {
        this.navigateToUniversity(exactMatch.id);
        return;
      } else if (univs.length === 1) {
        this.navigateToUniversity(univs[0].id);
        return;
      } else {
        // Multiple universities or general institutional directory query -> Navigate to Universities Directory
        this.navigateToUniversitiesPage(true);
        const uInput = document.getElementById('univSearchInput');
        if (uInput) {
          uInput.value = classification.cleanQuery || query;
        }
        this.filterUniversityCards();
        setTimeout(() => {
          const uGrid = document.getElementById('allUniversitiesView');
          if (uGrid) uGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
        return;
      }
    }

    // ==========================================
    // 2. CAREER ROLE INTENT
    // ==========================================
    if (searchResults.intent === 'role' || classification.intent === 'role') {
      if (searchResults.matchedProgrammes && searchResults.matchedProgrammes.length > 0) {
        const roleClean = classification.cleanQuery || query;
        const allProgInput = document.getElementById('allProgSearchInput');
        if (allProgInput) {
          allProgInput.value = roleClean;
        }
        const allProgClear = document.getElementById('allProgSearchClearBtn');
        if (allProgClear) {
          allProgClear.style.display = 'flex';
        }
        const selectEl = document.getElementById('progDegreeFilter');
        if (selectEl) {
          selectEl.value = 'ALL';
        }
        this.activeProgrammeDegree = null;

        this.navigateToProgrammesPage(true);
        this.applyProgrammeFilters(true);

        setTimeout(() => {
          const target = document.getElementById('allProgSearchBox') || document.getElementById('programmesGrid');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
        return;
      } else if (searchResults.matchedCareer && searchResults.matchedCareer.dirKey) {
        this.openRouteModal(searchResults.matchedCareer.dirKey);
        return;
      }
    }

    // ==========================================
    // 3. COURSE / DEGREE / GENERAL SEARCH INTENT (e.g. MBA, BBA, Data Science, etc.)
    // ==========================================
    const progSearchTerm = classification.cleanQuery || query;
    const allProgInput = document.getElementById('allProgSearchInput');
    if (allProgInput) {
      allProgInput.value = progSearchTerm;
    }
    const allProgClear = document.getElementById('allProgSearchClearBtn');
    if (allProgClear) {
      allProgClear.style.display = 'flex';
    }
    const selectEl = document.getElementById('progDegreeFilter');
    if (selectEl) {
      selectEl.value = 'ALL';
    }
    this.activeProgrammeDegree = null;

    this.navigateToProgrammesPage(true);
    this.applyProgrammeFilters(true);

    setTimeout(() => {
      const target = document.getElementById('allProgSearchBox') || document.getElementById('programmesGrid');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  }

  updateSearchWishlistBtn(btnEl, univId) {
    if (!btnEl) return;
    const isSaved = this.isWishlisted(univId, 'university');
    btnEl.textContent = isSaved ? '♥ Saved' : '♡ Save';
    btnEl.classList.toggle('btn-primary', isSaved);
    btnEl.classList.toggle('btn-secondary', !isSaved);
  }

  updateSearchCompareBtn(btnEl, univId) {
    if (!btnEl) return;
    const isCompared = (this.compareManager && typeof this.compareManager.hasItem === 'function')
      ? this.compareManager.hasItem(univId)
      : (this.compareManager && Array.isArray(this.compareManager.selectedUniversities) && this.compareManager.selectedUniversities.includes(univId));
    btnEl.textContent = isCompared ? '✓ Compared' : '+ Compare';
    btnEl.classList.toggle('btn-primary', isCompared);
    btnEl.classList.toggle('btn-secondary', !isCompared);
  }

  openRouteModal(directionKey) {
    const backdrop = document.getElementById('globalModalBackdrop');
    const titleEl = document.getElementById('modalTitleText');
    const bodyEl = document.getElementById('modalBodyContent');
    const closeBtn = document.getElementById('modalCloseBtn');

    if (!backdrop || !bodyEl) return;

    // Resolve direction data
    let dirData = null;
    if (directionKey && NEXORA_DATA.directions[directionKey]) {
      dirData = NEXORA_DATA.directions[directionKey];
    } else if (directionKey) {
      const keys = Object.keys(NEXORA_DATA.directions);
      for (const k of keys) {
        const d = NEXORA_DATA.directions[k];
        if (d.id === directionKey || d.name.toLowerCase().includes(directionKey.toLowerCase())) {
          dirData = d;
          break;
        }
        if (d.destinations.some(dest => dest.id === directionKey || dest.title.toLowerCase().includes(directionKey.toLowerCase()))) {
          dirData = d;
          break;
        }
      }
    }

    if (!dirData) {
      dirData = NEXORA_DATA.directions.MARKETING;
    }

    if (titleEl) {
      titleEl.textContent = `Intelligent Career Route: ${dirData.name}`;
    }

    const matchingProgs = (dirData.programmeIds || []).map(id => 
      NEXORA_DATA.programmes.find(p => p.id === id)
    ).filter(Boolean);

    const matchingUnivs = (dirData.universityIds || []).map(id =>
      NEXORA_DATA.universities.find(u => u.id === id)
    ).filter(Boolean);

    bodyEl.innerHTML = `
      <div style="padding: 4px 0;">
        <div style="background: linear-gradient(135deg, #001B66 0%, #00103D 100%); border-radius: 16px; padding: 24px; color: #fff; margin-bottom: 24px; box-shadow: 0 10px 30px rgba(0, 27, 102, 0.2);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
            <div>
              <span class="badge" style="background: rgba(0, 255, 135, 0.15); color: #00FF87; border: 1px solid rgba(0, 255, 135, 0.3); font-size: 0.72rem; padding: 4px 10px;">CAREER PATHWAY BREAKDOWN</span>
              <h2 style="font-size: 1.5rem; font-weight: 850; color: #fff; margin-top: 8px;">${dirData.name}</h2>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.75rem; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.08em;">Active Waypoints</div>
              <div style="font-size: 1.1rem; font-weight: 850; color: #60A5FA;">5-Step Roadmap</div>
            </div>
          </div>
          <p style="color: rgba(255, 255, 255, 0.85); font-size: 0.92rem; line-height: 1.5; margin: 0;">Intelligent mapping connects target career destinations to required skill prerequisites, accredited degree options, and UGC-entitled universities.</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 20px;">
          <!-- WAYPOINT 1: CAREER DESTINATIONS -->
          <div style="background: var(--pure-white); border: 1px solid var(--professional-grey); border-radius: 14px; padding: 20px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
              <span style="width: 28px; height: 28px; border-radius: 50%; background: rgba(0, 90, 43, 0.1); color: var(--trust-green); display: flex; align-items: center; justify-content: center; font-weight: 850; font-size: 0.85rem;">1</span>
              <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--navy); margin: 0;">Target Career Roles &amp; Benchmark Compensation</h4>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
              ${dirData.destinations.map(d => `
                <div style="background: var(--soft-white); border: 1px solid var(--grey-light); border-radius: 10px; padding: 14px;">
                  <div style="font-size: 0.95rem; font-weight: 800; color: var(--navy); margin-bottom: 4px;">${d.title}</div>
                  <div style="font-size: 0.85rem; font-weight: 750; color: var(--trust-green);">${d.avgSalary}</div>
                  <div style="font-size: 0.75rem; color: var(--charcoal-muted); margin-top: 4px;">Demand: ${d.demand}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- WAYPOINT 2: REQUIRED SKILLS -->
          <div style="background: var(--pure-white); border: 1px solid var(--professional-grey); border-radius: 14px; padding: 20px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
              <span style="width: 28px; height: 28px; border-radius: 50%; background: rgba(0, 102, 255, 0.1); color: #0066FF; display: flex; align-items: center; justify-content: center; font-weight: 850; font-size: 0.85rem;">2</span>
              <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--navy); margin: 0;">Required Industry Skills &amp; Competencies</h4>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${dirData.skills.map(s => `<span class="badge badge-sage" style="font-size: 0.82rem; padding: 6px 12px;">⚡ ${s}</span>`).join('')}
            </div>
          </div>

          <!-- WAYPOINT 3: RECOMMENDED DEGREES -->
          <div style="background: var(--pure-white); border: 1px solid var(--professional-grey); border-radius: 14px; padding: 20px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
              <span style="width: 28px; height: 28px; border-radius: 50%; background: rgba(95, 132, 77, 0.1); color: var(--sage-green); display: flex; align-items: center; justify-content: center; font-weight: 850; font-size: 0.85rem;">3</span>
              <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--navy); margin: 0;">Recommended Degree Pathways</h4>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${dirData.degrees.map(deg => `<span class="badge badge-trust" style="font-size: 0.82rem; padding: 6px 12px;">🎓 ${deg}</span>`).join('')}
            </div>
          </div>

          <!-- WAYPOINT 4 & 5: PROGRAMMES & UNIVERSITIES -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
            <div style="background: var(--pure-white); border: 1px solid var(--professional-grey); border-radius: 14px; padding: 20px;">
              <div style="font-size: 0.95rem; font-weight: 800; color: var(--navy); margin-bottom: 12px;">Top Matched Programmes</div>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${matchingProgs.length > 0 ? matchingProgs.map(p => `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--soft-white); border-radius: 8px;">
                    <div>
                      <div style="font-size: 0.88rem; font-weight: 750; color: var(--navy);">${p.name}</div>
                      <div style="font-size: 0.78rem; color: var(--charcoal-muted);">${p.universityName} • ${p.duration}</div>
                    </div>
                    <button class="btn btn-navy btn-sm" onclick="app.navigateToProgramme('${p.id}'); document.getElementById('globalModalBackdrop').classList.remove('active');" style="padding: 4px 10px; font-size: 0.75rem;">View</button>
                  </div>
                `).join('') : '<div style="font-size:0.85rem; color:var(--charcoal-muted);">Explore degree directory for matching options.</div>'}
              </div>
            </div>

            <div style="background: var(--pure-white); border: 1px solid var(--professional-grey); border-radius: 14px; padding: 20px;">
              <div style="font-size: 0.95rem; font-weight: 800; color: var(--navy); margin-bottom: 12px;">Top Accredited Universities</div>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${matchingUnivs.length > 0 ? matchingUnivs.map(u => `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--soft-white); border-radius: 8px;">
                    <div>
                      <div style="font-size: 0.88rem; font-weight: 750; color: var(--navy);">${u.name}</div>
                      <div style="font-size: 0.78rem; color: var(--charcoal-muted);">📍 ${u.location}</div>
                    </div>
                    <button class="btn btn-navy btn-sm" onclick="app.navigateToUniversity('${u.id}'); document.getElementById('globalModalBackdrop').classList.remove('active');" style="padding: 4px 10px; font-size: 0.75rem;">Explore</button>
                  </div>
                `).join('') : '<div style="font-size:0.85rem; color:var(--charcoal-muted);">Explore university directory for matching options.</div>'}
              </div>
            </div>
          </div>
        </div>

        <div style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--professional-grey); padding-top: 16px;">
          <button class="btn btn-secondary btn-md" onclick="document.getElementById('globalModalBackdrop').classList.remove('active');">Close</button>
          <button class="btn btn-primary btn-md" onclick="app.navigateToProgrammesPage(); document.getElementById('globalModalBackdrop').classList.remove('active');">Explore All Degree Options</button>
        </div>
      </div>
    `;

    backdrop.classList.add('active');

    const handleClose = () => {
      backdrop.classList.remove('active');
    };

    if (closeBtn) {
      closeBtn.onclick = handleClose;
    }
  }

  /* ---------------------------------------------------- */
  /* PROGRAMME DISCOVERY & FILTER RENDERER                */
  /* ---------------------------------------------------- */
  filterProgrammesDegree(degree, btnEl) {
    this.showAllProgrammes = false;
    this.activeProgrammeDegree = degree;
    this.activeProgrammeLevel = 'ALL';

    const tabs = document.querySelectorAll('.programme-tab-btn');
    tabs.forEach(b => {
      b.classList.remove('active', 'btn-primary');
      b.classList.add('btn-secondary');
    });

    if (btnEl) {
      btnEl.classList.add('active', 'btn-primary');
      btnEl.classList.remove('btn-secondary');
    }

    const selectEl = document.getElementById('progDegreeFilter');
    if (selectEl) {
      const exists = Array.from(selectEl.options).some(o => o.value.toLowerCase() === (degree || '').toLowerCase());
      selectEl.value = exists ? degree : 'ALL';
    }

    this.applyProgrammeFilters();
  }

  handleProgDegreeSelectChange(val) {
    this.showAllProgrammes = false;
    this.activeProgrammeDegree = val;
    this.activeProgrammeLevel = 'ALL';

    const tabs = document.querySelectorAll('.programme-tab-btn');
    tabs.forEach(b => {
      if ((b.dataset.degree || '').toLowerCase() === (val || '').toLowerCase()) {
        b.classList.add('active', 'btn-primary');
        b.classList.remove('btn-secondary');
      } else {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-secondary');
      }
    });

    this.applyProgrammeFilters();
  }

  filterProgrammesLevel(level, btnEl) {
    this.showAllProgrammes = false;
    this.activeProgrammeLevel = level;
    this.activeProgrammeDegree = 'ALL';

    const tabs = document.querySelectorAll('.programme-tab-btn');
    tabs.forEach(b => {
      b.classList.remove('active', 'btn-primary');
      b.classList.add('btn-secondary');
    });

    if (btnEl) {
      btnEl.classList.add('active', 'btn-primary');
      btnEl.classList.remove('btn-secondary');
    }

    const selectEl = document.getElementById('progDegreeFilter');
    if (selectEl) {
      selectEl.value = 'ALL';
    }

    this.applyProgrammeFilters();
  }

  getDegreeBadgeLabel(p) {
    if (p.shortDegree) return p.shortDegree;
    const name = p.name || '';
    const isOffline = p.mode && (p.mode.toLowerCase().includes('offline') || p.mode.toLowerCase().includes('campus') || p.mode.toLowerCase().includes('residential'));
    const modeTag = isOffline ? 'On-Campus' : 'Online';

    if (name.includes('B.Tech') || name.includes('Bachelor of Technology') || name.includes('B.E.')) return `${modeTag} B.Tech`;
    if (name.includes('B.Des') || name.includes('Bachelor of Design')) return `${modeTag} B.Des`;
    if (name.includes('B.Pharm') || name.includes('Bachelor of Pharmacy')) return `${modeTag} B.Pharm`;
    if (name.includes('MBA') || name.includes('Master of Business Administration')) return `${modeTag} MBA`;
    if (name.includes('BBA') || name.includes('Bachelor of Business Administration')) return `${modeTag} BBA`;
    if (name.includes('MCA') || name.includes('Master of Computer Applications')) return `${modeTag} MCA`;
    if (name.includes('BCA') || name.includes('Bachelor of Computer Applications')) return `${modeTag} BCA`;
    if (name.includes('M.Com') || name.includes('Master of Commerce')) return `${modeTag} M.Com`;
    if (name.includes('B.Com') || name.includes('Bachelor of Commerce')) return `${modeTag} B.Com`;
    if (name.includes('M.Sc') || name.includes('Master of Science')) return `${modeTag} M.Sc`;
    if (name.includes('B.Sc') || name.includes('Bachelor of Science')) return `${modeTag} B.Sc`;
    if (name.includes('M.Tech') || name.includes('Master of Technology')) return `${modeTag} M.Tech`;
    if (name.includes('BA') || name.includes('Bachelor of Arts')) return `${modeTag} BA`;
    if (name.includes('Data Science')) return `${modeTag} Data Science`;
    return isOffline ? 'On-Campus Degree' : 'Online Degree';
  }

  registerDiscoveredProgramme(prog) {
    if (!prog || !prog.id) return;
    this.discoveredProgrammes[prog.id] = prog;
    if (!NEXORA_DATA.programmes.some(p => p.id === prog.id)) {
      NEXORA_DATA.programmes.push(prog);
    }
    try {
      const raw = localStorage.getItem('nexora_discovered_progs');
      const store = raw ? JSON.parse(raw) : {};
      store[prog.id] = prog;
      localStorage.setItem('nexora_discovered_progs', JSON.stringify(store));
    } catch(e) {}
  }

  /* ---------------------------------------------------- */
  /* PROGRAMMES PAGE DEDICATED PREDICTIVE SEARCH SYSTEM   */
  /* ---------------------------------------------------- */
  clearAllProgSearch() {
    const input = document.getElementById('allProgSearchInput');
    const ghost = document.getElementById('allProgSearchGhost');
    const dropdown = document.getElementById('allProgSearchDropdown');
    const suggestionsContainer = document.getElementById('allProgSearchSuggestions');
    const clearBtn = document.getElementById('allProgSearchClearBtn');

    if (input) input.value = '';
    this.currentAllProgSearchQuery = '';
    this.allProgSearchRequestId = (this.allProgSearchRequestId || 0) + 1;

    if (this.allProgSearchTimeout) {
      clearTimeout(this.allProgSearchTimeout);
      this.allProgSearchTimeout = null;
    }

    if (ghost) ghost.textContent = '';
    if (dropdown) dropdown.style.display = 'none';
    if (suggestionsContainer) suggestionsContainer.innerHTML = '';
    if (clearBtn) clearBtn.style.display = 'none';

    const selectEl = document.getElementById('progDegreeFilter');
    if (selectEl) selectEl.value = 'ALL';
    const modeEl = document.getElementById('progModeFilter');
    if (modeEl) modeEl.value = 'ALL';
    const durEl = document.getElementById('progDurationFilter');
    if (durEl) durEl.value = 'ALL';
    const eligEl = document.getElementById('progEligibilityFilter');
    if (eligEl) eligEl.value = 'ALL';
    const scholEl = document.getElementById('progScholarshipFilter');
    if (scholEl) scholEl.value = 'ALL';
    this.activeProgrammeDegree = 'ALL';
    this.activeProgrammeLevel = 'ALL';

    const tabs = document.querySelectorAll('.programme-tab-btn');
    tabs.forEach(b => {
      if (b.getAttribute('data-degree') === 'ALL') {
        b.classList.add('active', 'btn-primary');
        b.classList.remove('btn-secondary');
      } else {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-secondary');
      }
    });

    this.applyProgrammeFilters(true);
  }

  clearProgrammeSearch() {
    this.clearAllProgSearch();
  }

  handleAllProgSearchInput(val) {
    const input = document.getElementById('allProgSearchInput');
    if (input && val !== undefined && input.value !== val) {
      input.value = val;
    }
    if (typeof this.updateAllProgSearchMatches === 'function') {
      this.updateAllProgSearchMatches();
    }
    if (typeof this.applyProgrammeFilters === 'function') {
      this.applyProgrammeFilters(false);
    }
  }

  initAllProgPredictiveSearch() {
    const input = document.getElementById('allProgSearchInput');
    const ghost = document.getElementById('allProgSearchGhost');
    const dropdown = document.getElementById('allProgSearchDropdown');
    const suggestionsContainer = document.getElementById('allProgSearchSuggestions');
    const clearBtn = document.getElementById('allProgSearchClearBtn');
    const submitBtn = document.getElementById('allProgSearchSubmitBtn');

    if (!input) return;

    const updateMatches = () => {
      try {
        const rawQuery = input ? input.value : '';
        const query = this.normalizeSearchQuery(rawQuery);
        this.currentAllProgSearchQuery = query;

        if (this.allProgSearchTimeout) {
          clearTimeout(this.allProgSearchTimeout);
          this.allProgSearchTimeout = null;
        }

        if (!query) {
          if (ghost) ghost.textContent = '';
          if (dropdown) dropdown.style.display = 'none';
          if (suggestionsContainer) suggestionsContainer.innerHTML = '';
          if (clearBtn) clearBtn.style.display = 'none';
          return;
        }

        if (clearBtn) clearBtn.style.display = 'flex';

        this.allProgSearchRequestId = (this.allProgSearchRequestId || 0) + 1;
        const currentRequestId = this.allProgSearchRequestId;
        const qLower = query.toLowerCase();

        const classification = this.classifyHomepageSearchQuery(query);
        const isRoleQuery = classification.intent === 'role';

        // 1. Internal Programmes
        const matchedProgrammes = (NEXORA_DATA.programmes || []).filter(p => {
          if (!p) return false;
          const nameMatch = p.name && p.name.toLowerCase().includes(qLower);
          const univMatch = p.universityName && p.universityName.toLowerCase().includes(qLower);
          const degMatch = this.getDegreeBadgeLabel(p).toLowerCase().includes(qLower);
          const levelMatch = p.level && p.level.toLowerCase().includes(qLower);
          const specMatch = Array.isArray(p.specialisations) && p.specialisations.some(s => s && s.toLowerCase().includes(qLower));
          const careerMatch = Array.isArray(p.careerPaths) && p.careerPaths.some(c => c && c.toLowerCase().includes(qLower));
          return nameMatch || univMatch || degMatch || levelMatch || specMatch || careerMatch;
        }).slice(0, 6);

        // 1b. External Registry Programmes
        if (window.AUTHENTIC_EXTERNAL_REGISTRY) {
          window.AUTHENTIC_EXTERNAL_REGISTRY.forEach(reg => {
            if (reg.programmes && Array.isArray(reg.programmes)) {
              reg.programmes.forEach(p => {
                if (matchedProgrammes.length >= 8) return;
                const nameMatch = p.name && p.name.toLowerCase().includes(qLower);
                const univMatch = (p.universityName && p.universityName.toLowerCase().includes(qLower)) || (reg.name && reg.name.toLowerCase().includes(qLower));
                const degMatch = (p.shortDegree || '').toLowerCase().includes(qLower);
                const specMatch = Array.isArray(p.specialisations) && p.specialisations.some(s => s && s.toLowerCase().includes(qLower));
                const careerMatch = Array.isArray(p.careerPaths) && p.careerPaths.some(c => c && c.toLowerCase().includes(qLower));
                if (nameMatch || univMatch || degMatch || specMatch || careerMatch) {
                  if (!matchedProgrammes.some(mp => mp.id === p.id)) {
                    matchedProgrammes.push(p);
                  }
                }
              });
            }
          });
        }

        // 1c. Stored Discovered Programmes
        if (this.discoveredProgrammes) {
          Object.values(this.discoveredProgrammes).forEach(dp => {
            if (matchedProgrammes.length >= 8) return;
            const nameMatch = dp.name && dp.name.toLowerCase().includes(qLower);
            const univMatch = dp.universityName && dp.universityName.toLowerCase().includes(qLower);
            const degMatch = (dp.shortDegree || '').toLowerCase().includes(qLower);
            const specMatch = Array.isArray(dp.specialisations) && dp.specialisations.some(s => s && s.toLowerCase().includes(qLower));
            const careerMatch = Array.isArray(dp.careerPaths) && dp.careerPaths.some(c => c && c.toLowerCase().includes(qLower));
            if (nameMatch || univMatch || degMatch || specMatch || careerMatch) {
              if (!matchedProgrammes.some(mp => mp.id === dp.id)) {
                matchedProgrammes.push(dp);
              }
            }
          });
        }

        // 2. Internal Universities (ONLY when NOT a role search!)
        let matchedUniversities = [];
        let matchedExternalUniversities = [];

        if (!isRoleQuery) {
          matchedUniversities = (NEXORA_DATA.universities || []).filter(u => {
            if (!u) return false;
            const nameMatch = u.name && u.name.toLowerCase().includes(qLower);
            const shortMatch = u.shortName && u.shortName.toLowerCase().includes(qLower);
            const locMatch = u.location && u.location.toLowerCase().includes(qLower);
            return nameMatch || shortMatch || locMatch;
          }).slice(0, 3);

          // 3. External Discovered & Registry Universities
          const registeredIds = matchedUniversities.map(u => u.id);

          if (window.AUTHENTIC_EXTERNAL_REGISTRY) {
            window.AUTHENTIC_EXTERNAL_REGISTRY.forEach(reg => {
              if (registeredIds.includes(reg.id)) return;
              const normName = (reg.name || '').toLowerCase();
              const normShort = (reg.shortName || '').toLowerCase();
              const normLoc = (reg.location || '').toLowerCase();
              const isAlias = Array.isArray(reg.aliases) && reg.aliases.some(a => a && (a.toLowerCase().includes(qLower) || qLower.includes(a.toLowerCase())));
              if (normName.includes(qLower) || normShort.includes(qLower) || normLoc.includes(qLower) || isAlias) {
                matchedExternalUniversities.push(reg);
                registeredIds.push(reg.id);
              }
            });
          }

          if (this.discoveredUniversities) {
            Object.values(this.discoveredUniversities).forEach(dUniv => {
              if (!dUniv || registeredIds.includes(dUniv.id)) return;
              const normName = (dUniv.name || '').toLowerCase();
              const normShort = (dUniv.shortName || '').toLowerCase();
              if (normName.includes(qLower) || normShort.includes(qLower)) {
                matchedExternalUniversities.push(dUniv);
                registeredIds.push(dUniv.id);
              }
            });
          }
        }

        // Inline Ghost Text Autocomplete
        if (ghost) {
          const firstProg = matchedProgrammes[0];
          const firstUniv = matchedUniversities[0] || matchedExternalUniversities[0];
          let completion = '';
          if (firstProg && firstProg.name.toLowerCase().startsWith(qLower)) {
            completion = rawQuery + firstProg.name.slice(rawQuery.length);
          } else if (firstUniv && firstUniv.name.toLowerCase().startsWith(qLower)) {
            completion = rawQuery + firstUniv.name.slice(rawQuery.length);
          }
          ghost.textContent = completion;
        }

        const totalMatches = matchedProgrammes.length + matchedUniversities.length + matchedExternalUniversities.length;

        // If no immediate local/registry matches, trigger async external discovery
        if (totalMatches === 0) {
          if (isRoleQuery) {
            if (suggestionsContainer) {
              suggestionsContainer.innerHTML = `
                <div style="padding: 18px 16px; text-align: center; color: var(--charcoal-muted); font-size: 0.9rem;">
                  No degree programmes found preparing for role "${query}".
                </div>
              `;
            }
            if (dropdown) dropdown.style.display = 'block';
            return;
          }

          if (suggestionsContainer) {
            suggestionsContainer.innerHTML = `
              <div style="padding: 20px 16px; text-align: center; color: var(--navy);">
                <div style="width: 24px; height: 24px; border: 2.5px solid rgba(0,102,255,0.2); border-top-color: #0066FF; border-radius: 50%; animation: borderSpin 0.8s linear infinite; margin: 0 auto 10px auto;"></div>
                <div style="font-weight: 750; font-size: 0.88rem; color: var(--navy);">Searching accredited universities &amp; programmes for "${query}"...</div>
                <div style="font-size: 0.78rem; color: var(--charcoal-muted); margin-top: 4px;">Checking UGC-DEB entitled programmes &amp; directories</div>
              </div>
            `;
          }
          if (dropdown) dropdown.style.display = 'block';

          this.allProgSearchTimeout = setTimeout(async () => {
            if (currentRequestId !== this.allProgSearchRequestId) return;
            if (this.normalizeSearchQuery(input ? input.value : '') !== query) return;

            if (!this.discoveryEngine && window.ExternalUniversityDiscovery) {
              this.discoveryEngine = new window.ExternalUniversityDiscovery();
            }
            if (!this.discoveryEngine) return;

            const [extProgs, univRes] = await Promise.all([
              this.discoveryEngine.discoverProgrammes(query, { level: this.activeProgrammeLevel, degreeFilter: this.activeProgrammeDegree }),
              this.discoveryEngine.discover(query)
            ]);

            if (currentRequestId !== this.allProgSearchRequestId) return;
            if (this.normalizeSearchQuery(input ? input.value : '') !== query) return;

            const discoveredList = [];
            if (univRes && ((univRes.status === 'success' && univRes.university) || (univRes.status === 'disambiguation' && univRes.matches))) {
              const uList = univRes.university ? [univRes.university] : univRes.matches;
              uList.forEach(m => {
                this.registerDiscoveredUniversity(m);
                discoveredList.push(m);
              });
            }

            if (extProgs && extProgs.length > 0) {
              extProgs.forEach(p => this.registerDiscoveredProgramme(p));
            }

            if ((extProgs && extProgs.length > 0) || discoveredList.length > 0) {
              this.renderAllProgCategorizedSearchResults(query, extProgs || [], [], discoveredList, currentRequestId);
              if (extProgs && extProgs.length > 0) {
                const countEl = document.getElementById('progCountDisplay');
                if (countEl) countEl.innerHTML = `<span style="font-weight: 800; color: var(--navy);">EXTERNAL DISCOVERY RESULTS (${extProgs.length})</span>`;
                this.renderProgrammeCardsList(extProgs);
              }
            } else {
              if (suggestionsContainer) {
                suggestionsContainer.innerHTML = `
                  <div style="padding: 18px 16px; text-align: center; color: var(--charcoal-muted); font-size: 0.9rem;">
                    No matching programmes or universities found for "${query}".
                  </div>
                `;
              }
            }
          }, 300);

          return;
        }

        this.renderAllProgCategorizedSearchResults(query, matchedProgrammes, matchedUniversities, matchedExternalUniversities, currentRequestId);
      } catch (err) {
        console.error('NEXORA Programmes Search updateMatches error:', err);
      }
    };

    this.updateAllProgSearchMatches = updateMatches;

    input.addEventListener('input', updateMatches);
    input.addEventListener('focus', () => {
      if (input.value && input.value.trim()) {
        updateMatches();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dropdown) {
        dropdown.style.display = 'none';
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.executeAllProgSearch(input.value);
      } else if (e.key === 'Tab' || e.key === 'ArrowRight') {
        if (ghost && ghost.textContent && ghost.textContent.length > input.value.length) {
          e.preventDefault();
          input.value = ghost.textContent;
          updateMatches();
          this.applyProgrammeFilters(false);
        }
      }
    });

    if (submitBtn) {
      submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.executeAllProgSearch(input.value);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearAllProgSearch();
        input.focus();
      });
    }

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && dropdown && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  renderAllProgCategorizedSearchResults(query, matchedProgrammes, matchedUniversities, matchedExternalUniversities, requestId) {
    const input = document.getElementById('allProgSearchInput');
    const dropdown = document.getElementById('allProgSearchDropdown');
    const suggestionsContainer = document.getElementById('allProgSearchSuggestions');
    if (!suggestionsContainer) return;

    if (requestId && requestId !== this.allProgSearchRequestId) return;
    if (input && this.normalizeSearchQuery(input.value) !== query) return;

    const isRole = this.classifyHomepageSearchQuery(query).intent === 'role';
    let html = '';

    // 1. PROGRAMMES
    if (matchedProgrammes && matchedProgrammes.length > 0) {
      html += `<div class="search-category-header">${isRole ? '🎓 PROGRAMMES PREPARING FOR: ' + query.toUpperCase() : '🎓 PROGRAMMES'}</div>`;
      matchedProgrammes.forEach(p => {
        if (!p) return;
        const isExternal = p.sourceType === 'external' || (p.id && p.id.startsWith('ext-'));
        const degreeBadge = p.shortDegree || p.level || 'Degree';
        html += `
          <div class="suggestion-item" onclick="app.navigateToProgramme('${p.id}'); if(document.getElementById('allProgSearchDropdown')) document.getElementById('allProgSearchDropdown').style.display='none';">
            <div>
              <div class="suggestion-title">${p.name}</div>
              <div class="suggestion-sub">${p.universityName || 'Accredited University'} • ${p.duration || 'Degree'} ${p.totalFee ? '• ' + p.totalFee : ''}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              ${isExternal ? `<span class="suggestion-badge" style="background: rgba(0, 102, 255, 0.12); color: #0066FF; border: 1px solid rgba(0, 102, 255, 0.3); font-size: 0.68rem; font-weight: 850; padding: 2px 8px; border-radius: 20px;">EXTERNAL</span>` : ''}
              <span class="suggestion-badge programme">${degreeBadge}</span>
            </div>
          </div>
        `;
      });
    }

    // 2. UNIVERSITIES (STRICTLY SUPPRESSED IF SEARCHING FOR A ROLE)
    const allUniversities = isRole ? [] : [...(matchedUniversities || []), ...(matchedExternalUniversities || [])];

    if (allUniversities.length > 0) {
      html += `<div class="search-category-header">🏛️ UNIVERSITIES</div>`;
      allUniversities.forEach(u => {
        if (!u) return;
        const isExternal = u.sourceType === 'external' || (u.id && u.id.startsWith('ext-'));
        const isSaved = this.isWishlisted(u.id, 'university');
        const isCompared = (this.compareManager && typeof this.compareManager.hasItem === 'function')
          ? this.compareManager.hasItem(u.id)
          : (this.compareManager && Array.isArray(this.compareManager.selectedUniversities) && this.compareManager.selectedUniversities.includes(u.id));

        if (isExternal) {
          html += `
            <div class="suggestion-item external-discovery-item" style="flex-direction: column; align-items: flex-start; gap: 10px; padding: 14px 16px; background: rgba(0, 102, 255, 0.03); border: 1px solid rgba(0, 102, 255, 0.18); border-left: 4px solid #0066FF; border-radius: 12px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; width: 100%; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
                <div>
                  <div style="font-size: 1.05rem; font-weight: 850; color: var(--navy); line-height: 1.3;">${u.name}</div>
                  <div style="color: var(--charcoal-muted); font-size: 0.85rem; margin-top: 3px;">📍 ${u.location || 'India'}</div>
                </div>
                <span class="suggestion-badge" style="background: rgba(0, 102, 255, 0.12); color: #0066FF; border: 1px solid rgba(0, 102, 255, 0.3); font-size: 0.68rem; font-weight: 850; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px;">DISCOVERED OUTSIDE NEXORA</span>
              </div>

              <div class="external-actions-flex" style="display: flex; gap: 8px; margin-top: 4px; width: 100%; flex-wrap: wrap;" onclick="event.stopPropagation();">
                <button class="btn btn-navy btn-sm" style="padding: 6px 14px; font-size: 0.8rem; font-weight: 750;" onclick="app.registerDiscoveredUniversity('${u.id}'); app.navigateToUniversity('${u.id}'); if(document.getElementById('allProgSearchDropdown')) document.getElementById('allProgSearchDropdown').style.display='none';">Explore University</button>
                <button class="btn btn-secondary btn-sm" style="padding: 6px 12px; font-size: 0.8rem; font-weight: 700;" onclick="app.registerDiscoveredUniversity('${u.id}'); app.toggleWishlist('${u.id}', 'university'); app.updateSearchWishlistBtn(this, '${u.id}');">${isSaved ? '♥ Saved' : '♡ Save'}</button>
                <button class="btn btn-secondary btn-sm" style="padding: 6px 12px; font-size: 0.8rem; font-weight: 700;" onclick="app.registerDiscoveredUniversity('${u.id}'); app.toggleCompare('${u.id}'); app.updateSearchCompareBtn(this, '${u.id}');">${isCompared ? '✓ Compared' : '+ Compare'}</button>
              </div>
            </div>
          `;
        } else {
          html += `
            <div class="suggestion-item" onclick="app.navigateToUniversity('${u.id}'); if(document.getElementById('allProgSearchDropdown')) document.getElementById('allProgSearchDropdown').style.display='none';">
              <div>
                <div class="suggestion-title">${u.name}</div>
                <div class="suggestion-sub">📍 ${u.location || 'India'} • ${u.totalProgrammes || 'Verified'} Degrees Offered</div>
              </div>
              <span class="suggestion-badge university">UNIV</span>
            </div>
          `;
        }
      });
    }

    suggestionsContainer.innerHTML = html;
    if (dropdown) dropdown.style.display = 'block';
  }

  async executeAllProgSearch(submittedQuery) {
    const input = document.getElementById('allProgSearchInput');
    const dropdown = document.getElementById('allProgSearchDropdown');
    const rawVal = submittedQuery !== undefined && typeof submittedQuery === 'string'
      ? submittedQuery
      : (input ? input.value : '');
    const query = this.normalizeSearchQuery(rawVal);

    if (!query) {
      this.clearAllProgSearch();
      return;
    }

    if (input) input.value = query;
    if (dropdown) dropdown.style.display = 'none';

    this.applyProgrammeFilters(true);
  }

  /* ---------------------------------------------------- */
  /* REUSABLE NEXORA NUMBER COUNT-UP UTILITY              */
  /* ---------------------------------------------------- */
  triggerRapidRollingNumbers(container = document) {
    this.initGlobalNumberCounters(container);
  }

  initGlobalNumberCounters(root = document) {
    if (!root) return;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.querySelectorAll('.univ-stat-number, .stat-val, .stat-number, .rolling-number, [data-roll-target], [data-target]').forEach(el => {
        const raw = el.getAttribute('data-roll-target') || el.getAttribute('data-target') || el.textContent;
        if (raw) el.textContent = raw;
      });
      return;
    }

    const elements = root.querySelectorAll('.univ-stat-number, .stat-val, .stat-number, .rolling-number, [data-roll-target], [data-target]');
    if (!elements.length) return;

    const animateEl = (el) => {
      if (el.dataset.counterAnimated === 'true') return;

      // Exclude static UI step numbers (01, 02, 03) and phone numbers/dates
      if (el.closest('.univ-step-num-badge, .univ-step-tag, .route-step-label, .nav-links, .pagination') || el.classList.contains('no-count')) {
        return;
      }

      const raw = el.getAttribute('data-roll-target') || el.getAttribute('data-target') || el.textContent.trim();
      if (!raw) return;

      const numMatch = raw.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
      if (!numMatch) return;

      const targetVal = parseFloat(numMatch[0]);
      if (isNaN(targetVal)) return;

      // Do not animate pure 4-digit years (1950-2030) unless explicitly tagged with data-target or stats class
      if (targetVal >= 1950 && targetVal <= 2030 && !el.hasAttribute('data-target') && !el.classList.contains('univ-stat-number') && !el.classList.contains('rolling-number')) {
        return;
      }

      el.dataset.counterAnimated = 'true';

      const isFloat = numMatch[0].includes('.');
      const decimals = isFloat ? (numMatch[0].split('.')[1]?.length || 1) : 0;

      const numPos = raw.indexOf(numMatch[0]);
      const prefix = el.getAttribute('data-prefix') || (numPos > 0 ? raw.substring(0, numPos) : (raw.match(/^[\#₹\$]+/)?.[0] || ''));
      const suffix = el.getAttribute('data-suffix') || (numPos >= 0 ? raw.substring(numPos + numMatch[0].length) : '');

      el.classList.add('rolling-active');
      const duration = 1200; // 1.2s smooth count-up duration
      const startTime = performance.now();

      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // smooth ease-out cubic
        const currentVal = targetVal * ease;

        const formatted = decimals > 0 
          ? currentVal.toFixed(decimals) 
          : Math.floor(currentVal).toLocaleString('en-IN');

        el.textContent = `${prefix}${formatted}${suffix}`;

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          const finalFormatted = decimals > 0 
            ? targetVal.toFixed(decimals) 
            : targetVal.toLocaleString('en-IN');
          el.textContent = `${prefix}${finalFormatted}${suffix}`;
          el.classList.remove('rolling-active');
          el.classList.add('rolling-complete');
        }
      };

      requestAnimationFrame(step);
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateEl(entry.target);
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });

      elements.forEach(el => observer.observe(el));
    } else {
      elements.forEach(el => animateEl(el));
    }
  }

  /* ---------------------------------------------------- */
  /* REDIRECT TO OFFICIAL UNIVERSITY WEBSITE PORTAL       */
  /* ---------------------------------------------------- */
  navigateToProgrammesForUniversity(univId) {
    const univ = this.getUniversityById(univId);
    if (univ && univ.websiteUrl) {
      window.open(univ.websiteUrl, '_blank', 'noopener,noreferrer');
    } else {
      this.activeUniversityFilter = univId;
      this.navigateToProgrammesPage();
    }
  }

  /* ---------------------------------------------------- */
  /* REFINED FACETED PROGRAMME FILTER SYSTEM              */
  /* ---------------------------------------------------- */
  handleFeeSliderChange(val) {
    const display = document.getElementById('progFeeRangeValueDisplay');
    if (display) {
      const lakhs = (val / 100000).toFixed(1);
      display.textContent = `Up to ₹${lakhs} Lakhs`;
    }
    this.applyProgrammeFilters();
  }

  resetFeeFilter() {
    const slider = document.getElementById('progFeeRangeSlider');
    if (slider) slider.value = 1500000;
    this.handleFeeSliderChange(1500000);
  }

  resetModeFilter() {
    document.querySelectorAll('.prog-mode-checkbox, .prog-level-checkbox').forEach(cb => cb.checked = false);
    this.activeProgrammeLevel = 'ALL';
    this.applyProgrammeFilters();
  }

  resetUniversityFilter() {
    document.querySelectorAll('.prog-univ-checkbox').forEach(cb => cb.checked = false);
    this.activeUniversityFilter = 'ALL';
    const univSelect = document.getElementById('progUniversityFilter');
    if (univSelect) univSelect.value = 'ALL';
    this.applyProgrammeFilters();
  }

  resetDegreeFilter() {
    document.querySelectorAll('.prog-degree-checkbox').forEach(cb => cb.checked = false);
    this.activeProgrammeDegree = 'ALL';
    const degreeSelect = document.getElementById('progDegreeFilter');
    if (degreeSelect) degreeSelect.value = 'ALL';
    
    document.querySelectorAll('.programme-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-degree') === 'ALL');
    });
    this.applyProgrammeFilters();
  }

  clearAllProgrammeFilters() {
    const searchInput = document.getElementById('allProgSearchInput');
    if (searchInput) searchInput.value = '';

    const univSearch = document.getElementById('progFilterUnivSearch');
    if (univSearch) {
      univSearch.value = '';
      this.filterUnivCheckboxList('');
    }

    document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);

    const slider = document.getElementById('progFeeRangeSlider');
    if (slider) slider.value = 1500000;
    const feeDisplay = document.getElementById('progFeeRangeValueDisplay');
    if (feeDisplay) feeDisplay.textContent = 'Up to ₹15.0 Lakhs';

    this.activeProgrammeDegree = 'ALL';
    this.activeProgrammeLevel = 'ALL';
    this.activeUniversityFilter = 'ALL';

    const univSelect = document.getElementById('progUniversityFilter');
    if (univSelect) univSelect.value = 'ALL';
    const degreeSelect = document.getElementById('progDegreeFilter');
    if (degreeSelect) degreeSelect.value = 'ALL';

    document.querySelectorAll('.programme-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-degree') === 'ALL');
    });

    this.applyProgrammeFilters();
  }

  filterUnivCheckboxList(query) {
    const q = (query || '').toLowerCase().trim();
    document.querySelectorAll('.univ-filter-item').forEach(item => {
      const name = (item.getAttribute('data-name') || '').toLowerCase();
      item.style.display = (!q || name.includes(q)) ? 'flex' : 'none';
    });
  }

  applyProgrammeFilters(immediate = false) {
    const searchVal = document.getElementById('allProgSearchInput')?.value?.trim()?.toLowerCase() || '';
    const feeSliderVal = parseInt(document.getElementById('progFeeRangeSlider')?.value || 1500000);
    const sortVal = document.getElementById('progSortSelect')?.value || 'relevance';

    // Get checked checkboxes
    const checkedModes = Array.from(document.querySelectorAll('.prog-mode-checkbox:checked')).map(cb => cb.value);
    const checkedLevels = Array.from(document.querySelectorAll('.prog-level-checkbox:checked')).map(cb => cb.value);
    const checkedUnivs = Array.from(document.querySelectorAll('.prog-univ-checkbox:checked')).map(cb => cb.value);
    const checkedDegrees = Array.from(document.querySelectorAll('.prog-degree-checkbox:checked')).map(cb => cb.value);

    let progs = [...NEXORA_DATA.programmes];

    // DYNAMIC COUNTS COMPUTATION FOR CHECKBOX BADGES
    this.updateFacetedFilterCounts(progs);

    // 1. FEE FILTER
    if (feeSliderVal < 1500000) {
      progs = progs.filter(p => {
        const feeNum = parseInt((p.totalFee || '').replace(/[^0-9]/g, '')) || 0;
        return feeNum > 0 ? feeNum <= feeSliderVal : true;
      });
    }

    // 2. UNIVERSITY FILTER
    if (checkedUnivs.length > 0) {
      progs = progs.filter(p => checkedUnivs.includes(p.universityId));
    } else if (this.activeUniversityFilter && this.activeUniversityFilter !== 'ALL') {
      progs = progs.filter(p => p.universityId === this.activeUniversityFilter);
    }

    // UPDATE ACTIVE UNIVERSITY BANNER
    const banner = document.getElementById('progUniversityActiveBanner');
    const bannerText = document.getElementById('progUniversityActiveText');
    if (banner && bannerText) {
      if (this.activeUniversityFilter && this.activeUniversityFilter !== 'ALL') {
        const univ = this.getUniversityById(this.activeUniversityFilter);
        const uName = univ ? (univ.shortName || univ.name) : this.activeUniversityFilter;
        bannerText.textContent = `Showing programmes offered by ${uName}`;
        banner.style.display = 'flex';
      } else {
        banner.style.display = 'none';
      }
    }

    // 3. MODE FILTER
    if (checkedModes.length > 0) {
      progs = progs.filter(p => {
        const m = (p.mode || '').toLowerCase();
        return checkedModes.some(cm => {
          if (cm === 'Online') return m.includes('online') && !m.includes('offline');
          if (cm === 'Offline') return m.includes('offline') || m.includes('campus');
          return true;
        });
      });
    }

    // 4. LEVEL FILTER
    if (checkedLevels.length > 0) {
      progs = progs.filter(p => checkedLevels.includes(p.level));
    } else if (this.activeProgrammeLevel === 'PG') {
      progs = progs.filter(p => p.level === 'PG');
    } else if (this.activeProgrammeLevel === 'UG') {
      progs = progs.filter(p => p.level === 'UG');
    } else if (this.activeProgrammeLevel === 'POPULAR') {
      progs = progs.filter(p => parseFloat(p.rating) >= 4.8);
    }

    // 5. DEGREE FILTER
    if (checkedDegrees.length > 0) {
      progs = progs.filter(p => {
        return checkedDegrees.some(cd => {
          const dLower = cd.toLowerCase();
          const nameLower = (p.name || '').toLowerCase();
          const badgeLower = this.getDegreeBadgeLabel(p).toLowerCase();
          const specMatch = p.specialisations && p.specialisations.some(s => s.toLowerCase().includes(dLower));
          return nameLower.includes(dLower) || badgeLower.includes(dLower) || specMatch;
        });
      });
    } else if (this.activeProgrammeDegree && this.activeProgrammeDegree !== 'ALL') {
      const dLower = this.activeProgrammeDegree.toLowerCase();
      if (dLower === 'offline' || dLower === 'campus' || dLower === 'on-campus') {
        progs = progs.filter(p => (p.mode || '').toLowerCase().includes('offline') || (p.mode || '').toLowerCase().includes('campus'));
      } else if (dLower === 'online' || dLower === '100% online') {
        progs = progs.filter(p => (p.mode || '').toLowerCase().startsWith('online') || (p.mode || '').toLowerCase() === 'online');
      } else {
        progs = progs.filter(p => {
          const nameLower = (p.name || '').toLowerCase();
          const badgeLower = this.getDegreeBadgeLabel(p).toLowerCase();
          const specMatch = p.specialisations && p.specialisations.some(s => s.toLowerCase().includes(dLower));
          return nameLower.includes(dLower) || badgeLower.includes(dLower) || specMatch;
        });
      }
    }

    // 6. SEARCH QUERY FILTER
    if (searchVal) {
      progs = progs.filter(p =>
        (p.name || '').toLowerCase().includes(searchVal) ||
        (p.universityName || '').toLowerCase().includes(searchVal) ||
        (p.level || '').toLowerCase().includes(searchVal) ||
        (p.mode || '').toLowerCase().includes(searchVal) ||
        this.getDegreeBadgeLabel(p).toLowerCase().includes(searchVal) ||
        (p.specialisations && p.specialisations.some(s => s.toLowerCase().includes(searchVal))) ||
        (p.careerPaths && p.careerPaths.some(s => s.toLowerCase().includes(searchVal)))
      );
    }

    // SORTING
    if (sortVal === 'fee_asc') {
      progs.sort((a, b) => (parseInt((a.totalFee || '').replace(/[^0-9]/g, '')) || 0) - (parseInt((b.totalFee || '').replace(/[^0-9]/g, '')) || 0));
    } else if (sortVal === 'fee_desc') {
      progs.sort((a, b) => (parseInt((b.totalFee || '').replace(/[^0-9]/g, '')) || 0) - (parseInt((a.totalFee || '').replace(/[^0-9]/g, '')) || 0));
    } else if (sortVal === 'rating') {
      progs.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
    }

    // UPDATE ACTIVE PILL BADGES
    this.updateActiveFilterPills(checkedModes, checkedLevels, checkedUnivs, checkedDegrees, feeSliderVal, searchVal);

    if (progs.length > 0) {
      if (this.progDiscoveryTimer) clearTimeout(this.progDiscoveryTimer);
      const countEl = document.getElementById('progCountDisplay');
      if (countEl) {
        countEl.textContent = `${progs.length} Programme${progs.length === 1 ? '' : 's'}`;
      }
      this.renderProgrammeCardsList(progs);
      return;
    }

    // EXTERNAL DISCOVERY FALLBACK
    if (searchVal) {
      this.progSearchRequestId = (this.progSearchRequestId || 0) + 1;
      if (immediate) {
        if (this.progDiscoveryTimer) clearTimeout(this.progDiscoveryTimer);
        this.runExternalProgrammeDiscovery(searchVal, { level: this.activeProgrammeLevel, sortVal });
      } else {
        if (this.progDiscoveryTimer) clearTimeout(this.progDiscoveryTimer);
        this.progDiscoveryTimer = setTimeout(() => {
          this.runExternalProgrammeDiscovery(searchVal, { level: this.activeProgrammeLevel, sortVal });
        }, 400);
      }
      return;
    }

    // 3. NO MATCHES & NO SEARCH QUERY
    const countEl = document.getElementById('progCountDisplay');
    if (countEl) {
      countEl.textContent = `0 Programmes`;
    }
    this.renderProgrammeCardsList([]);
  }

  updateFacetedFilterCounts(allProgs) {
    const setEl = (id, count) => {
      const el = document.getElementById(id);
      if (el) el.textContent = count;
    };

    setEl('countModeOnline', allProgs.filter(p => (p.mode || '').toLowerCase().includes('online') && !(p.mode || '').toLowerCase().includes('offline')).length);
    setEl('countModeOffline', allProgs.filter(p => (p.mode || '').toLowerCase().includes('offline') || (p.mode || '').toLowerCase().includes('campus')).length);
    setEl('countLevelPG', allProgs.filter(p => p.level === 'PG').length);
    setEl('countLevelUG', allProgs.filter(p => p.level === 'UG').length);

    ['univ-1', 'univ-2', 'univ-3', 'univ-4', 'univ-5', 'univ-6', 'univ-7', 'univ-8', 'univ-9'].forEach(uId => {
      setEl(`countUniv_${uId}`, allProgs.filter(p => p.universityId === uId).length);
    });

    ['MBA', 'B.Tech', 'BBA', 'MCA', 'BCA', 'B.Des', 'Data Science'].forEach(deg => {
      const dLower = deg.toLowerCase();
      const c = allProgs.filter(p => {
        const nameLower = (p.name || '').toLowerCase();
        const badgeLower = this.getDegreeBadgeLabel(p).toLowerCase();
        return nameLower.includes(dLower) || badgeLower.includes(dLower);
      }).length;
      setEl(`countDegree${deg.replace(/[^a-zA-Z]/g, '')}`, c);
    });
  }

  updateActiveFilterPills(modes, levels, univs, degrees, feeVal, searchVal) {
    const container = document.getElementById('progActivePillsContainer');
    const hint = document.getElementById('progNoActivePillsHint');
    if (!container) return;

    const pills = [];

    modes.forEach(m => pills.push({ label: `Mode: ${m}`, action: () => { const cb = document.querySelector(`.prog-mode-checkbox[value="${m}"]`); if (cb) cb.checked = false; this.applyProgrammeFilters(); } }));
    levels.forEach(l => pills.push({ label: `Level: ${l}`, action: () => { const cb = document.querySelector(`.prog-level-checkbox[value="${l}"]`); if (cb) cb.checked = false; this.applyProgrammeFilters(); } }));
    univs.forEach(uId => {
      const univ = this.getUniversityById(uId);
      const name = univ ? (univ.shortName || univ.name) : uId;
      pills.push({ label: `Univ: ${name}`, action: () => { const cb = document.querySelector(`.prog-univ-checkbox[value="${uId}"]`); if (cb) cb.checked = false; this.applyProgrammeFilters(); } });
    });
    degrees.forEach(d => pills.push({ label: `Degree: ${d}`, action: () => { const cb = document.querySelector(`.prog-degree-checkbox[value="${d}"]`); if (cb) cb.checked = false; this.applyProgrammeFilters(); } }));

    if (feeVal < 1500000) {
      pills.push({ label: `Max Fee: ₹${(feeVal/100000).toFixed(1)}L`, action: () => this.resetFeeFilter() });
    }
    if (searchVal) {
      pills.push({ label: `Search: "${searchVal}"`, action: () => { const inp = document.getElementById('allProgSearchInput'); if (inp) inp.value = ''; this.applyProgrammeFilters(); } });
    }

    if (pills.length === 0) {
      container.innerHTML = '';
      if (hint) hint.style.display = 'inline';
      return;
    }

    if (hint) hint.style.display = 'none';
    container.innerHTML = pills.map((p, idx) => `
      <span class="filter-active-pill" data-pill-idx="${idx}">
        ${p.label}
        <span class="filter-active-pill-remove" onclick="app.removePillAt(${idx})">✕</span>
      </span>
    `).join('');

    this._activePillActions = pills.map(p => p.action);
  }

  removePillAt(index) {
    if (this._activePillActions && this._activePillActions[index]) {
      this._activePillActions[index]();
    }
  }

  async runExternalProgrammeDiscovery(searchVal, options = {}) {
    const currentReqId = ++this.progSearchRequestId;
    const countEl = document.getElementById('progCountDisplay');
    const container = document.getElementById('programmesGrid');

    if (countEl) {
      countEl.innerHTML = `<span style="color: var(--gold, #d97706); font-weight: 750; letter-spacing: 0.5px; display: inline-flex; align-items: center; gap: 8px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> SEARCHING BEYOND NEXORA...</span>`;
    }

    if (container) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; padding: 60px 20px; text-align: center; color: var(--navy);">
          <div style="font-size: 2.2rem; margin-bottom: 12px; opacity: 0.85;">🌐</div>
          <h3 style="font-size: 1.15rem; font-weight: 750; color: var(--navy); margin-bottom: 6px;">SEARCHING BEYOND NEXORA</h3>
          <p style="font-size: 0.9rem; color: var(--charcoal-muted); max-width: 480px; margin: 0 auto;">Looking for verified programme information across accredited institutions and regulatory directories...</p>
        </div>
      `;
    }

    let externalProgs = [];
    if (window.ExternalUniversityDiscovery) {
      const discovery = new window.ExternalUniversityDiscovery();
      externalProgs = await discovery.discoverProgrammes(searchVal, options);
    }

    // Stale Request Protection
    if (currentReqId !== this.progSearchRequestId) return;
    const activeSearch = document.getElementById('allProgSearchInput')?.value?.trim()?.toLowerCase() || '';
    if (activeSearch !== searchVal) return;

    if (externalProgs.length > 0) {
      externalProgs.forEach(p => this.registerDiscoveredProgramme(p));

      if (countEl) {
        countEl.innerHTML = `<span style="font-weight: 800; color: var(--navy);">EXTERNAL DISCOVERY RESULTS (${externalProgs.length})</span>`;
      }
      this.renderProgrammeCardsList(externalProgs);
    } else {
      if (countEl) {
        countEl.innerHTML = `<span style="font-weight: 800; color: #dc2626;">NO VERIFIED PROGRAMMES FOUND</span>`;
      }
      if (container) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; padding: 50px 20px; text-align: center; color: var(--navy);">
            <div style="font-size: 2.2rem; margin-bottom: 12px;">🔍</div>
            <h3 style="font-size: 1.25rem; font-weight: 750; color: var(--navy); margin-bottom: 6px;">No verified programmes found</h3>
            <p style="font-size: 0.92rem; color: var(--charcoal-muted); max-width: 480px; margin: 0 auto 20px auto;">We couldn't find enough verified programme information for this search.</p>
            <button class="btn btn-secondary btn-sm" onclick="app.clearProgrammeSearch()">Clear Search</button>
          </div>
        `;
      }
    }
  }

  openCompareMatrix(activeTab = null) {
    if (activeTab) {
      this.comparePageTab = activeTab;
    }
    this.navigateToComparePage();
  }

  getProgrammeImage(p) {
    if (p && p.image) return p.image;
    const name = ((p && p.name) || '').toLowerCase();
    const spec = (p && p.specialisations && Array.isArray(p.specialisations) ? p.specialisations.join(' ') : '').toLowerCase();
    const career = (p && p.careerPaths && Array.isArray(p.careerPaths) ? p.careerPaths.join(' ') : '').toLowerCase();

    // 1. Law & Legal Studies (BBA LL.B, BA LL.B, Corporate & Commercial Law)
    if (name.includes('ll.b') || name.includes('llb') || name.includes('law') || name.includes('legal') || spec.includes('law') || spec.includes('litigation') || career.includes('lawyer')) {
      return "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=700&q=80";
    }

    // 2. UX / UI Design / Product Design / Interaction Design / B.Des UX
    if (name.includes('ux') || name.includes('ui') || name.includes('user experience') || name.includes('interaction design') || spec.includes('user experience') || spec.includes('prototyping') || career.includes('ux designer')) {
      return "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=700&q=80";
    }

    // 3. Fashion & Multimedia Design
    if (name.includes('fashion') || name.includes('textile')) {
      return "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=700&q=80";
    }
    if (name.includes('animation') || name.includes('vfx') || name.includes('gaming') || name.includes('game design')) {
      return "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=700&q=80";
    }
    if (name.includes('design') || name.includes('b.des') || name.includes('m.des')) {
      return "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=700&q=80";
    }

    // 4. Pharmacy, Pharmaceutical Sciences & Clinical Research
    if (name.includes('pharm') || name.includes('pharmacy') || name.includes('clinical') || name.includes('drug') || name.includes('biotech') || spec.includes('pharmaceutics') || spec.includes('pharmacology')) {
      return "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=700&q=80";
    }
    if (name.includes('health') || name.includes('hospital') || name.includes('medical') || name.includes('nursing') || spec.includes('hospital management')) {
      return "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=700&q=80";
    }

    // 5. Data Science, Artificial Intelligence, Machine Learning & Analytics
    if (name.includes('data science') || name.includes('machine learning') || name.includes(' ai') || name.includes('ai ') || name.includes('(ai') || name.includes('analytics') || spec.includes('machine learning') || spec.includes('artificial intelligence') || spec.includes('data analytics')) {
      return "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=700&q=80";
    }

    // 6. Computer Science, Software Engineering, B.Tech CSE, B.Tech IT
    if (name.includes('b.tech') || name.includes('btech') || name.includes('computer science') || name.includes('information technology') || name.includes('cse') || name.includes('software engineering')) {
      return "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=700&q=80";
    }

    // 7. BCA, MCA, Cloud Computing, Cyber Security, Full Stack Coding
    if (name.includes('bca') || name.includes('mca') || name.includes('computer applications') || name.includes('full stack') || name.includes('cloud') || name.includes('cyber') || name.includes('devops') || spec.includes('cloud') || spec.includes('cyber')) {
      return "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=700&q=80";
    }

    // 8. Finance, Banking, Accounting, B.Com, M.Com, ACCA, Investment
    if (name.includes('b.com') || name.includes('m.com') || name.includes('commerce') || name.includes('banking') || name.includes('finance') || name.includes('accounting') || name.includes('acca') || spec.includes('financial') || spec.includes('banking')) {
      return "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=700&q=80";
    }

    // 9. MBA, Executive MBA, Leadership & Strategic Management
    if (name.includes('mba') || name.includes('executive mba') || name.includes('management') || name.includes('leadership')) {
      return "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=700&q=80";
    }

    // 10. BBA, Digital Marketing, Growth & Business Administration
    if (name.includes('marketing') || spec.includes('marketing') || career.includes('marketing')) {
      return "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=700&q=80";
    }
    if (name.includes('bba') || name.includes('business administration')) {
      return "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=700&q=80";
    }

    // 11. Journalism, Mass Communication, Digital Media, BA JMC
    if (name.includes('journalism') || name.includes('mass comm') || name.includes('jmc') || name.includes('media') || name.includes('broadcast') || name.includes('communication')) {
      return "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=700&q=80";
    }

    // 12. Psychology, Behavioral Sciences, Human Resource
    if (name.includes('psychology') || name.includes('counseling') || name.includes('behavioral')) {
      return "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=700&q=80";
    }

    // 13. Architecture, Civil & Construction
    if (name.includes('arch') || name.includes('civil') || name.includes('construction')) {
      return "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=700&q=80";
    }

    // Fallback verified campus academic image
    return "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=700&q=80";
  }

  toggleShowAllProgrammes() {
    this.showAllProgrammes = !this.showAllProgrammes;
    if (this.lastFilteredProgrammes) {
      this.renderProgrammeCardsList(this.lastFilteredProgrammes);
      if (!this.showAllProgrammes) {
        const grid = document.getElementById('programmesGrid');
        if (grid) {
          grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  }

  renderProgrammeCardsList(programmes) {
    const container = document.getElementById('programmesGrid');
    const viewMoreContainer = document.getElementById('programmesViewMoreContainer');
    const viewMoreBtn = document.getElementById('programmesViewMoreBtn');
    const countEl = document.getElementById('progCountDisplay');
    if (!container) return;

    this.lastFilteredProgrammes = programmes || [];

    if (!programmes || programmes.length === 0) {
      if (viewMoreContainer) viewMoreContainer.style.display = 'none';
      if (countEl) countEl.textContent = '0 Programmes';
      container.innerHTML = `
        <div style="grid-column: 1/-1; padding: 50px 20px; text-align: center; color: var(--navy);">
          <div style="font-size: 2.2rem; margin-bottom: 12px;">🔍</div>
          <h3 style="font-size: 1.25rem; font-weight: 750; color: var(--navy); margin-bottom: 6px;">No programmes match the selected filters</h3>
          <p style="font-size: 0.92rem; color: var(--charcoal-muted); max-width: 480px; margin: 0 auto 20px auto;">Try clearing filters or searching for another programme.</p>
          <button class="btn btn-secondary btn-sm" onclick="app.clearProgrammeSearch()">Clear Filters</button>
        </div>
      `;
      return;
    }

    const totalCount = programmes.length;
    let progsToRender = programmes;

    if (totalCount > 6) {
      if (viewMoreContainer) {
        viewMoreContainer.style.display = 'flex';
        viewMoreContainer.style.justifyContent = 'center';
      }
      if (viewMoreBtn) {
        if (!this.showAllProgrammes) {
          progsToRender = programmes.slice(0, 6);
          viewMoreBtn.innerHTML = `
            <span>View More</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          `;
          if (countEl) countEl.textContent = `Showing 6 of ${totalCount} Programmes`;
        } else {
          progsToRender = programmes;
          viewMoreBtn.innerHTML = `
            <span>Show Less</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
          `;
          if (countEl) countEl.textContent = `Showing all ${totalCount} Programmes`;
        }
      }
    } else {
      if (viewMoreContainer) viewMoreContainer.style.display = 'none';
      if (countEl) countEl.textContent = `${totalCount} Programme${totalCount === 1 ? '' : 's'}`;
    }

    container.innerHTML = progsToRender.map(p => {
      const isSaved = this.isWishlisted(p.id, 'programme');
      const degreeBadge = this.getDegreeBadgeLabel(p);
      const isExternal = p.sourceType === 'external';
      const progImage = this.getProgrammeImage(p);

      const feeDisplay = (p.totalFee && p.totalFee !== 'Fee Details on Request') ? p.totalFee : 'Fee on Request';
      const semFeeDisplay = p.semesterFee ? `<div class="programme-fee-sem">${p.semesterFee} ${p.emiAvailable ? '• EMI Avail.' : ''}</div>` : '';

      return `
        <div class="programme-card">
          <!-- 1. HIGH-IMPACT PROGRAMME HERO IMAGE BANNER -->
          <div class="programme-card-hero">
            <img src="${progImage}" alt="${p.name}" class="programme-card-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=700&q=80'" />
            <div class="programme-card-gradient"></div>
            
            <div class="programme-card-top-badges">
              <span class="programme-card-degree-badge">🎓 ${degreeBadge}</span>
              <button class="shortlist-toggle-btn ${isSaved ? 'saved' : ''}" data-shortlist-id="${p.id}" onclick="event.stopPropagation(); app.toggleWishlist('${p.id}', 'programme')" title="Save to Wishlist">
                ${isSaved ? '♥ Saved' : '♡ Save'}
              </button>
            </div>

            <div class="programme-card-hero-bottom">
              <div class="programme-card-univ-pill" onclick="event.stopPropagation(); app.navigateToUniversity('${p.universityId}')" title="${p.universityName}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                <span>${p.universityName}</span>
              </div>
              ${isExternal ? `<span class="programme-card-ext-badge">🌐 EXTERNAL</span>` : ''}
            </div>
          </div>

          <!-- 2. PROGRAMME CARD CONTENT BODY -->
          <div class="programme-card-body">
            <h3 class="programme-card-title" onclick="app.navigateToProgramme('${p.id}')" title="${p.name}">${p.name}</h3>

            <div class="programme-meta-grid">
              <div class="meta-item">
                <div class="meta-item-label">Degree Level</div>
                <div class="meta-item-value">${p.level} Degree</div>
              </div>
              <div class="meta-item">
                <div class="meta-item-label">Duration</div>
                <div class="meta-item-value">${p.duration || '2 Years'}</div>
              </div>
              <div class="meta-item">
                <div class="meta-item-label">Mode</div>
                <div class="meta-item-value">${p.mode || '100% Online'}</div>
              </div>
              <div class="meta-item">
                <div class="meta-item-label">Rating</div>
                <div class="meta-item-value"><span style="color: #F59E0B;">★</span> ${p.rating || '4.8'} <span style="font-weight: 500; font-size: 0.72rem; color: var(--charcoal-muted);">(${p.reviewCount || '200+'})</span></div>
              </div>
            </div>

            <!-- Specialisations -->
            <div class="programme-card-specialisations">
              <div class="specialisations-header">SPECIALISATIONS:</div>
              <div class="specialisations-pills">
                ${(p.specialisations || []).slice(0, 3).map(s => `<span class="spec-pill">${s}</span>`).join('')}
                ${(p.specialisations || []).length > 3 ? `<span class="spec-pill more">+${p.specialisations.length - 3} more</span>` : ''}
              </div>
            </div>

            <!-- Fee & Actions Footer -->
            <div class="programme-card-footer">
              <div class="programme-fee-box">
                <div class="programme-fee-main">${feeDisplay}</div>
                ${semFeeDisplay}
              </div>

              <div class="programme-card-actions">
                <button class="btn btn-navy btn-sm" onclick="app.navigateToProgramme('${p.id}')">
                  <span>View Details</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
                <button class="btn btn-secondary btn-sm" data-compare-id="${p.id}" onclick="app.compareManager.toggleCompareProgramme('${p.id}')">+ Compare</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (this.compareManager) {
      this.compareManager.updateCardButtons();
    }
  }

  scrollProgrammeCards(direction) {
    const viewport = document.getElementById('programmeCardsViewport');
    if (!viewport) return;

    const scrollAmount = 350;
    if (direction === 'left') {
      viewport.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      viewport.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  initProgrammeCardsAutoScroll() {
    const viewport = document.getElementById('programmeCardsViewport');
    if (!viewport) return;

    this.isProgrammeCardsPaused = false;
    const scrollSpeed = 0.5;

    const animateCards = () => {
      if (!this.isProgrammeCardsPaused && viewport) {
        viewport.scrollLeft += scrollSpeed;
        if (viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 2) {
          viewport.scrollLeft = 0;
        }
      }
      requestAnimationFrame(animateCards);
    };

    viewport.addEventListener('mouseenter', () => this.isProgrammeCardsPaused = true);
    viewport.addEventListener('mouseleave', () => this.isProgrammeCardsPaused = false);

    requestAnimationFrame(animateCards);
  }

  scrollProgrammeTabs(direction) {
    const viewport = document.getElementById('programmeTabsViewport');
    if (!viewport) return;

    const scrollAmount = 220;
    if (direction === 'left') {
      viewport.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      viewport.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  initProgrammeTabsAutoScroll() {
    const viewport = document.getElementById('programmeTabsViewport');
    if (!viewport) return;

    this.isProgrammeTabsPaused = false;
    const scrollSpeed = 0.6;

    const animate = () => {
      if (!this.isProgrammeTabsPaused && viewport) {
        viewport.scrollLeft += scrollSpeed;
        if (viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 2) {
          viewport.scrollLeft = 0;
        }
      }
      requestAnimationFrame(animate);
    };

    viewport.addEventListener('mouseenter', () => this.isProgrammeTabsPaused = true);
    viewport.addEventListener('mouseleave', () => this.isProgrammeTabsPaused = false);

    requestAnimationFrame(animate);
  }

  /* ---------------------------------------------------- */
  /* UNIFIED DATA ACCESSORS FOR INTERNAL & EXTERNAL DATA   */
  /* ---------------------------------------------------- */
  getUniversityById(id) {
    if (!id) return null;
    const internal = NEXORA_DATA.universities.find(u => u.id === id);
    if (internal) return internal;
    if (this.discoveredUniversities[id]) return this.discoveredUniversities[id];
    
    try {
      const raw = localStorage.getItem('nexora_discovered_store');
      if (raw) {
        const store = JSON.parse(raw);
        if (store[id]) {
          this.discoveredUniversities[id] = store[id];
          return store[id];
        }
      }
    } catch (e) {}

    if (window.AUTHENTIC_EXTERNAL_REGISTRY) {
      const found = window.AUTHENTIC_EXTERNAL_REGISTRY.find(r => r.id === id);
      if (found) {
        this.registerDiscoveredUniversity(found);
        return found;
      }
    }
    return null;
  }

  getProgrammeById(id) {
    if (!id) return null;
    const internal = NEXORA_DATA.programmes.find(p => p.id === id);
    if (internal) return internal;
    if (this.discoveredProgrammes[id]) return this.discoveredProgrammes[id];

    for (const univId in this.discoveredUniversities) {
      const u = this.discoveredUniversities[univId];
      if (u && u.programmes) {
        const p = u.programmes.find(prog => prog.id === id);
        if (p) return p;
      }
    }

    if (window.AUTHENTIC_EXTERNAL_REGISTRY) {
      for (const reg of window.AUTHENTIC_EXTERNAL_REGISTRY) {
        if (reg.programmes && Array.isArray(reg.programmes)) {
          const p = reg.programmes.find(prog => prog.id === id);
          if (p) {
            this.registerDiscoveredUniversity(reg);
            return p;
          }
        }
      }
    }
    return null;
  }

  getProgrammesForUniversity(univId) {
    const internalProgs = NEXORA_DATA.programmes.filter(p => p.universityId === univId);
    if (internalProgs.length > 0) return internalProgs;
    const univ = this.getUniversityById(univId);
    if (univ && univ.programmes) return univ.programmes;
    return [];
  }

  filterUnivProgs(level, btn, univId) {
    if (btn && btn.parentElement) {
      btn.parentElement.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }

    const container = document.getElementById('univProgsContainer');
    if (!container) return;

    let progs = this.getProgrammesForUniversity(univId) || [];
    if (level === 'PG') {
      progs = progs.filter(p => p.level === 'PG' || (p.name && (p.name.includes('MBA') || p.name.includes('MCA') || p.name.includes('M.'))));
    } else if (level === 'UG') {
      progs = progs.filter(p => p.level === 'UG' || (p.name && (p.name.includes('BBA') || p.name.includes('BCA') || p.name.includes('B.'))));
    }

    if (progs.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 32px 16px; background: #FAFBFD; border-radius: 12px; border: 1.5px dashed var(--border-grey);">
          <p style="color: var(--charcoal-muted); margin: 0; font-size: 0.92rem;">No ${level} degree programmes currently listed for this institution.</p>
        </div>
      `;
      return;
    }

    if (this.viewRenderers && typeof this.viewRenderers.createProgrammeCardHTML === 'function') {
      container.innerHTML = progs.slice(0, 5).map(p => this.viewRenderers.createProgrammeCardHTML(p)).join('');
    }
  }

  registerDiscoveredUniversity(univ) {
    if (!univ) return;
    if (typeof univ === 'string') {
      const found = (window.AUTHENTIC_EXTERNAL_REGISTRY && window.AUTHENTIC_EXTERNAL_REGISTRY.find(r => r.id === univ)) || (this.discoveredUniversities && this.discoveredUniversities[univ]);
      if (found) {
        univ = found;
      } else {
        return;
      }
    }
    if (!univ || !univ.id) return;
    this.discoveredUniversities[univ.id] = univ;
    if (univ.programmes && Array.isArray(univ.programmes)) {
      univ.programmes.forEach(p => {
        this.discoveredProgrammes[p.id] = p;
      });
    }
    try {
      const raw = localStorage.getItem('nexora_discovered_store');
      const store = raw ? JSON.parse(raw) : {};
      store[univ.id] = univ;
      localStorage.setItem('nexora_discovered_store', JSON.stringify(store));
    } catch(e) {}
  }

  loadDiscoveredFromStorage() {
    try {
      const raw = localStorage.getItem('nexora_discovered_store');
      if (raw) {
        const store = JSON.parse(raw);
        for (const key in store) {
          this.discoveredUniversities[key] = store[key];
          if (store[key].programmes) {
            store[key].programmes.forEach(p => {
              this.discoveredProgrammes[p.id] = p;
              if (!NEXORA_DATA.programmes.some(dp => dp.id === p.id)) {
                NEXORA_DATA.programmes.push(p);
              }
            });
          }
        }
      }
      const rawProgs = localStorage.getItem('nexora_discovered_progs');
      if (rawProgs) {
        const progStore = JSON.parse(rawProgs);
        for (const pid in progStore) {
          const prog = progStore[pid];
          this.discoveredProgrammes[pid] = prog;
          if (!NEXORA_DATA.programmes.some(dp => dp.id === pid)) {
            NEXORA_DATA.programmes.push(prog);
          }
        }
      }
    } catch(e) {}
  }

  filterUniversityByTag(tag) {
    const input = document.getElementById('univSearchInput');
    if (!input) return;

    const currentVal = input.value.trim().toLowerCase();
    const targetVal = (tag || '').trim().toLowerCase();

    // Toggle: if already active, clear and show all universities
    if (currentVal === targetVal) {
      input.value = '';
    } else {
      input.value = tag;
    }

    this.filterUniversityCards();
  }

  /* ---------------------------------------------------- */
  /* TWO-STAGE UNIVERSITY DISCOVERY & FILTER RENDERER     */
  /* ---------------------------------------------------- */
  filterUniversityCards() {
    if (this.univSearchTimeout) clearTimeout(this.univSearchTimeout);

    const query = document.getElementById('univSearchInput')?.value || '';
    const trimmed = query.trim().toLowerCase();

    // Sync active state on popular pills
    document.querySelectorAll('.univ-popular-pill').forEach(pill => {
      const pillTag = (pill.getAttribute('data-tag') || '').toLowerCase();
      if (trimmed && (pillTag === trimmed || trimmed.includes(pillTag) || pillTag.includes(trimmed))) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    // Stage 1: Local Search
    if (!trimmed) {
      this.renderUniversityCards('');
      return;
    }

    const internalMatches = NEXORA_DATA.universities.filter(u =>
      u.name.toLowerCase().includes(trimmed) ||
      u.shortName.toLowerCase().includes(trimmed) ||
      u.location.toLowerCase().includes(trimmed) ||
      (u.approvals && u.approvals.some(a => a.toLowerCase().includes(trimmed))) ||
      (u.accreditation && u.accreditation.toLowerCase().includes(trimmed)) ||
      (u.ranking && u.ranking.toLowerCase().includes(trimmed))
    );

    if (internalMatches.length > 0) {
      this.renderUniversityCards(query);
      return;
    }

    // Also check if previously discovered in storage/registry
    if (window.AUTHENTIC_EXTERNAL_REGISTRY) {
      const regMatch = window.AUTHENTIC_EXTERNAL_REGISTRY.find(r => 
        r.name.toLowerCase().includes(trimmed) ||
        r.shortName.toLowerCase().includes(trimmed) ||
        (r.aliases && r.aliases.some(a => a.toLowerCase() === trimmed))
      );
      if (regMatch) {
        this.registerDiscoveredUniversity(regMatch);
      }
    }

    // Stage 2: Debounced External Search Loading State
    const container = document.getElementById('universitiesGrid');
    if (container) {
      container.innerHTML = `
        <div class="external-search-loading" style="grid-column: 1 / -1; text-align: center; padding: 48px 24px; background: #FAFBFD; border-radius: 16px; border: 1.5px solid var(--border-grey);">
          <div style="width: 44px; height: 44px; border: 3.5px solid rgba(0,90,43,0.15); border-top-color: var(--trust-green); border-radius: 50%; animation: borderSpin 0.8s linear infinite; margin: 0 auto 16px auto;"></div>
          <span style="font-size: 0.8rem; font-weight: 800; letter-spacing: 0.12em; color: var(--trust-green); text-transform: uppercase;">SEARCHING BEYOND NEXORA DIRECTORY</span>
          <h3 style="font-size: 1.25rem; font-weight: 850; color: var(--navy); margin-top: 6px;">Looking for verified information about "${query}"...</h3>
          <p style="font-size: 0.9rem; color: var(--charcoal-muted); margin-top: 8px;">Searching official educational registers and regulatory databases</p>
        </div>
      `;
    }

    this.univSearchTimeout = setTimeout(async () => {
      await this.performExternalUniversityDiscovery(query);
    }, 400);
  }

  async performExternalUniversityDiscovery(query) {
    const container = document.getElementById('universitiesGrid');
    if (!container) return;

    if (!this.discoveryEngine && window.ExternalUniversityDiscovery) {
      this.discoveryEngine = new window.ExternalUniversityDiscovery();
    }

    if (!this.discoveryEngine) return;

    const res = await this.discoveryEngine.discover(query);

    if (res.status === 'success' && res.university) {
      this.registerDiscoveredUniversity(res.university);
      this.renderSingleDiscoveredUniversityCard(res.university, container);
    } else if (res.status === 'disambiguation' && res.matches) {
      res.matches.forEach(m => this.registerDiscoveredUniversity(m));
      this.renderDisambiguationUniversityCards(res.matches, container, query);
    } else {
      // Clean Unverified State (No Fake Data!)
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 24px; background: #FAFBFD; border-radius: 16px; border: 1.5px dashed var(--border-grey);">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">🔍</div>
          <span style="font-size: 0.78rem; font-weight: 800; letter-spacing: 0.1em; color: var(--navy); text-transform: uppercase;">UNVERIFIED INSTITUTION</span>
          <h3 style="font-size: 1.25rem; font-weight: 850; color: var(--navy); margin-top: 6px; margin-bottom: 8px;">We couldn't find enough verified information for "${query}"</h3>
          <p style="color: var(--charcoal-muted); max-width: 500px; margin: 0 auto 20px auto; font-size: 0.92rem; line-height: 1.6;">
            NEXORA adheres to strict verification guidelines and does not generate synthetic university profiles. Please try searching with a different spelling or browse accredited options.
          </p>
          <button class="btn btn-primary btn-sm" onclick="if(document.getElementById('univSearchInput')) document.getElementById('univSearchInput').value=''; app.filterUniversityCards();">
            Try Another Search or View Directory
          </button>
        </div>
      `;
    }
  }

  renderSingleDiscoveredUniversityCard(u, container) {
    const isSaved = this.isWishlisted(u.id, 'university');

    container.innerHTML = `
      <div style="grid-column: 1 / -1; margin-bottom: 12px;">
        <div style="background: rgba(0, 90, 43, 0.05); border: 1px solid rgba(0, 90, 43, 0.18); border-radius: 10px; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 0.88rem; color: var(--trust-green); font-weight: 700;">
            <span>🌐</span>
            <span>FOUND OUTSIDE NEXORA'S CURRENT DIRECTORY</span>
          </div>
          <span style="font-size: 0.8rem; color: var(--charcoal-muted);">Verified External Result for "${u.name}"</span>
        </div>
      </div>

      <div class="university-card" style="grid-column: span 2;">
        <div class="university-card-hero">
          <img src="${u.image}" alt="${u.name} Campus" class="university-card-img" onerror="this.src='assets/campus.jpg'" />
          <div class="university-logo-badge">
            <img src="${u.logo}" alt="${u.name} Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 6px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
            <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center; font-weight:850; font-size:0.75rem; color:var(--navy); text-align:center;">${u.shortName.substring(0,3)}</div>
          </div>
          <button class="shortlist-toggle-btn university-hero-save-btn ${isSaved ? 'saved' : ''}" data-shortlist-id="${u.id}" onclick="app.toggleWishlist('${u.id}', 'university')" title="Save University">
            ${isSaved ? '♥ Wishlisted' : '♡ Save'}
          </button>
        </div>

        <div class="university-card-body">
          <div style="margin-bottom: 6px;">
            <span class="badge" style="background: rgba(0, 102, 255, 0.08); color: #0066FF; border: 1px solid rgba(0, 102, 255, 0.25); font-weight: 800; font-size: 0.68rem; letter-spacing: 0.05em; text-transform: uppercase; padding: 3px 8px; border-radius: 4px;">DISCOVERED OUTSIDE NEXORA</span>
          </div>

          <div class="university-title-container">
            <h3 class="university-card-title" onclick="app.navigateToUniversity('${u.id}')" style="cursor: pointer;">${u.name}</h3>
            <div class="university-location">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              ${u.location}
            </div>
          </div>

          <div class="university-approvals-wrapper">
            ${u.approvals.map(a => `<span class="badge badge-trust">${a}</span>`).join('')}
          </div>

          <div class="university-fee-row">
            <span>${u.totalProgrammes} Programmes</span>
            <strong style="color: var(--trust-green); font-size: 0.95rem;">${u.startingFee}</strong>
          </div>

          <div class="university-actions-grid">
            <button class="btn btn-navy btn-sm" onclick="app.navigateToUniversity('${u.id}')">
              Explore University →
            </button>
            <button class="btn btn-secondary btn-sm" data-compare-id="${u.id}" onclick="app.compareManager.toggleCompareUniversity('${u.id}')">
              + Compare
            </button>
          </div>
        </div>
      </div>
    `;

    this.compareManager.updateCardButtons();
  }

  renderDisambiguationUniversityCards(matches, container, query) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; margin-bottom: 12px;">
        <div style="background: #FFF8E6; border: 1px solid #FFE58F; border-radius: 10px; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          <div style="font-size: 0.9rem; color: #8C6B00; font-weight: 700;">
            <span>🤔</span> Which university did you mean for "${query}"? Select one to explore:
          </div>
        </div>
      </div>
      ${matches.map(u => {
        const isSaved = this.isWishlisted(u.id, 'university');
        return `
          <div class="university-card">
            <div class="university-card-hero">
              <img src="${u.image}" alt="${u.name} Campus" class="university-card-img" onerror="this.src='assets/campus.jpg'" />
              <div class="university-logo-badge">
                <img src="${u.logo}" alt="${u.name} Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 6px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center; font-weight:850; font-size:0.75rem; color:var(--navy); text-align:center;">${u.shortName.substring(0,3)}</div>
              </div>
              <button class="shortlist-toggle-btn university-hero-save-btn ${isSaved ? 'saved' : ''}" data-shortlist-id="${u.id}" onclick="app.toggleWishlist('${u.id}', 'university')" title="Save University">
                ${isSaved ? '♥ Wishlisted' : '♡ Save'}
              </button>
            </div>
            <div class="university-card-body">
              <span class="badge" style="background: rgba(0, 102, 255, 0.08); color: #0066FF; border: 1px solid rgba(0, 102, 255, 0.25); font-weight: 800; font-size: 0.68rem; padding: 2px 6px; margin-bottom: 4px;">EXTERNAL DISCOVERY</span>
              <h3 class="university-card-title" onclick="app.navigateToUniversity('${u.id}')" style="cursor: pointer;">${u.name}</h3>
              <div class="university-location">${u.location}</div>
              <div class="university-actions-grid" style="margin-top: 12px;">
                <button class="btn btn-navy btn-sm" onclick="app.navigateToUniversity('${u.id}')">Explore University</button>
                <button class="btn btn-secondary btn-sm" onclick="app.compareManager.toggleCompareUniversity('${u.id}')">+ Compare</button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    `;
    this.compareManager.updateCardButtons();
  }

  renderUniversityCards(filterQuery = '') {
    const container = document.getElementById('universitiesGrid');
    if (!container) return;

    const qInput = document.getElementById('univSearchInput');
    const q = (filterQuery || (qInput ? qInput.value : '')).trim().toLowerCase();

    const modeVal = document.getElementById('univModeFilterSelect')?.value || 'ALL';
    const accredVal = document.getElementById('univAccredFilterSelect')?.value || 'ALL';
    const scholarshipOnly = document.getElementById('univScholarshipOnlyCheckbox')?.checked || false;

    let univs = NEXORA_DATA.universities || [];

    // 1. Search Query Filter
    if (q) {
      univs = univs.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.shortName.toLowerCase().includes(q) ||
        u.location.toLowerCase().includes(q) ||
        (u.approvals && u.approvals.some(a => a.toLowerCase().includes(q))) ||
        (u.accreditationDetails && JSON.stringify(u.accreditationDetails).toLowerCase().includes(q))
      );
    }

    // 2. Study Mode Filter
    if (modeVal !== 'ALL') {
      univs = univs.filter(u => {
        const m = (u.mode || '').toLowerCase();
        if (modeVal === 'Online') return m.includes('online');
        if (modeVal === 'Offline') return m.includes('offline') || m.includes('campus');
        return true;
      });
    }

    // 3. Accreditation Filter
    if (accredVal !== 'ALL') {
      univs = univs.filter(u => {
        const apps = (u.approvals || []).join(' ').toLowerCase();
        const accDet = JSON.stringify(u.accreditationDetails || {}).toLowerCase();
        const target = accredVal.toLowerCase();
        return apps.includes(target) || accDet.includes(target);
      });
    }

    // 4. Scholarship Only Filter
    if (scholarshipOnly) {
      univs = univs.filter(u => !!u.scholarshipInfo);
    }

    // Update Result Count Badge
    const countEl = document.getElementById('univCountDisplay');
    if (countEl) {
      countEl.textContent = `${univs.length} Accredited Institution${univs.length === 1 ? '' : 's'}`;
    }

    if (univs.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 24px; background: #FAFBFD; border-radius: 16px; border: 1.5px dashed var(--border-grey);">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">🏛️</div>
          <h3 style="font-size: 1.25rem; color: var(--navy); margin-bottom: 8px;">No Universities Match Your Filters</h3>
          <p style="color: var(--charcoal-muted); max-width: 500px; margin: 0 auto 20px auto; font-size: 0.92rem; line-height: 1.6;">
            Try adjusting your search query, mode selection, or scholarship filters to browse institutions.
          </p>
          <button class="btn btn-primary btn-sm" onclick="app.resetUniversityFilters()">
            Reset All University Filters
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = univs.map(u => {
      const isSaved = this.isWishlisted(u.id, 'university');

      return `
        <div class="university-card">
          <div class="university-card-hero">
            <img src="${u.image}" alt="${u.name} Campus" class="university-card-img" onerror="this.src='assets/campus.jpg'" />
            <div class="university-logo-badge">
              <img src="${u.logo}" alt="${u.name} Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 6px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
              <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center; font-weight:850; font-size:0.75rem; color:var(--navy); text-align:center;">${u.shortName.split(' ')[0]}</div>
            </div>
            <button class="shortlist-toggle-btn university-hero-save-btn ${isSaved ? 'saved' : ''}" data-shortlist-id="${u.id}" onclick="app.toggleWishlist('${u.id}', 'university')" title="Save University">
              ${isSaved ? '♥ Wishlisted' : '♡ Save'}
            </button>
          </div>

          <div class="university-card-body">
            <div class="university-title-container">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                <h3 class="university-card-title" onclick="app.navigateToUniversity('${u.id}')" style="cursor: pointer; margin: 0;">${u.name}</h3>
                ${u.scholarshipInfo ? `
                  <span class="badge badge-scholarship" onclick="event.stopPropagation(); app.openScholarshipModal('${u.id}')" style="cursor: pointer; background: rgba(217, 119, 6, 0.1); color: #d97706; border: 1px solid rgba(217, 119, 6, 0.3); font-weight: 750; font-size: 0.72rem; padding: 3px 10px; border-radius: 50px; display: inline-flex; align-items: center; gap: 4px;" title="Click for Scholarship Details">
                    🎓 Scholarships Available
                  </span>
                ` : ''}
              </div>
              <div class="university-location" style="margin-top: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                ${u.location}
              </div>
            </div>

            <div class="university-approvals-wrapper" style="margin-top: 10px;">
              ${u.approvals.map(a => `<span class="badge badge-trust">${a}</span>`).join('')}
            </div>

            <div class="university-fee-row">
              <span>${u.totalProgrammes} UG + PG Degree Programmes</span>
              <strong style="color: var(--trust-green); font-size: 0.95rem;">From ${u.startingFee}</strong>
            </div>

            <div class="university-actions-grid">
              <button class="btn btn-navy btn-sm" onclick="app.navigateToUniversity('${u.id}')">
                View University Page
              </button>
              <button class="btn btn-secondary btn-sm" data-compare-id="${u.id}" onclick="app.compareManager.toggleCompareUniversity('${u.id}')">
                + Compare
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.compareManager.updateCardButtons();
    this.initGlobalNumberCounters(container);
  }

  resetUniversityFilters() {
    const qInp = document.getElementById('univSearchInput');
    const modeSel = document.getElementById('univModeFilterSelect');
    const accredSel = document.getElementById('univAccredFilterSelect');
    const scholCb = document.getElementById('univScholarshipOnlyCheckbox');

    if (qInp) qInp.value = '';
    if (modeSel) modeSel.value = 'ALL';
    if (accredSel) accredSel.value = 'ALL';
    if (scholCb) scholCb.checked = false;

    this.filterUniversityCards();
  }

  openScholarshipModal(univId) {
    const univ = this.getUniversityById(univId);
    if (!univ || !univ.scholarshipInfo) return;

    let backdrop = document.getElementById('nexoraModalBackdrop');
    let modal = document.getElementById('nexoraGenericModal');
    if (!backdrop || !modal) return;

    modal.innerHTML = `
      <div style="padding: 28px 32px;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #E2E8F0; padding-bottom: 16px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 1.6rem;">🎓</div>
            <div>
              <span style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 800; color: #d97706;">SCHOLARSHIP ADVISORY</span>
              <h3 style="margin: 0; font-size: 1.3rem; color: var(--navy); font-weight: 850;">${univ.name}</h3>
            </div>
          </div>
          <button type="button" onclick="app.closeModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748B;">✕</button>
        </div>

        <div style="background: rgba(217, 119, 6, 0.06); border: 1.5px solid rgba(217, 119, 6, 0.2); border-radius: 14px; padding: 18px 22px; margin-bottom: 20px;">
          <h4 style="font-size: 0.95rem; font-weight: 800; color: #b45309; margin-top: 0; margin-bottom: 8px;">Available Scholarship & Fee Concession Details:</h4>
          <p style="font-size: 0.92rem; color: #334155; line-height: 1.6; margin: 0;">${univ.scholarshipInfo}</p>
        </div>

        <div style="font-size: 0.82rem; color: #64748B; line-height: 1.5; margin-bottom: 24px;">
          * Scholarship entitlement criteria and fee waivers are evaluated during official registrar document verification.
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button class="btn btn-secondary btn-sm" onclick="app.closeModal()">Close</button>
          <button class="btn btn-primary btn-sm" onclick="app.closeModal(); app.openInfoRequestModal('${univ.name}', 'Scholarship Application Packet');">Apply / Enquire for Scholarship →</button>
        </div>
      </div>
    `;

    backdrop.style.display = 'flex';
    backdrop.classList.add('active');
  }

  showAllUnivProgs(univId) {
    const container = document.getElementById('univProgsContainer');
    const footerControls = document.getElementById('univProgsFooterControls');
    if (!container) return;

    const progs = this.getProgrammesForUniversity(univId) || [];
    if (this.viewRenderers && typeof this.viewRenderers.createProgrammeCardHTML === 'function') {
      container.innerHTML = progs.map(p => this.viewRenderers.createProgrammeCardHTML(p)).join('');
    }

    const btn = document.getElementById('univViewMoreProgsBtn');
    if (btn) btn.style.display = 'none';

    this.initGlobalNumberCounters(container);
  }

  /* ---------------------------------------------------- */
  /* INSIGHTS EDITORIAL RENDERER                          */
  /* ---------------------------------------------------- */
  renderInsightsCards() {
    if (!this.insightsManager && window.InsightsManager) {
      this.insightsManager = new InsightsManager();
    }
    if (this.insightsManager) {
      this.insightsManager.init();
    }
    this.renderHomeInsights();
    this.renderFullInsightsPage();
  }

  renderHomeInsights() {
    const container = document.getElementById('homeInsightsGrid');
    if (!container || typeof NEXORA_DATA === 'undefined' || !NEXORA_DATA.insights) return;

    // Display 6 curated blogs on the home page with modern blog aesthetic
    const sixArticles = NEXORA_DATA.insights.slice(0, 6);

    container.innerHTML = sixArticles.map(art => `
      <div class="blog-grid-card" onclick="app.insightsManager ? app.insightsManager.openInsightArticle('${art.id}') : null">
        <div class="blog-grid-card-img-wrap">
          <img src="${art.coverImage}" alt="${art.title}" class="blog-grid-card-img" loading="lazy">
        </div>
        <div class="blog-grid-card-body">
          <div style="margin-bottom: 8px;">
            <span class="blog-pill-tag" style="margin-bottom: 0;">
              <span class="blog-pill-dot"></span>
              <span>${art.category}</span>
            </span>
          </div>
          <h3 class="blog-grid-card-title">${art.title}</h3>
          <p class="blog-grid-card-desc">${art.summary}</p>
          <div class="blog-grid-card-meta">
            <span>${art.date} • ${art.readTime}</span>
            <span style="font-weight: 750; color: var(--navy); display: inline-flex; align-items: center; gap: 4px;">Read ↗</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  renderFullInsightsPage() {
    const mainContainer = document.getElementById('insightsMainContainer') || document.getElementById('fullInsightsGrid');
    if (!mainContainer || typeof NEXORA_DATA === 'undefined' || !NEXORA_DATA.insights) return;

    const allArticles = NEXORA_DATA.insights;
    if (allArticles.length === 0) return;

    // Featured hero article
    const heroArticle = allArticles[0];
    // Latest post downward scrolling ticker: take articles 1 to 9 and duplicate for seamless looping
    const latestArticlesBase = allArticles.slice(1, 9);
    const scrollableLatestArticles = [...latestArticlesBase, ...latestArticlesBase];
    // Remaining articles for the carousel / grid section below
    const carouselArticles = allArticles.slice(5);

    // Extract unique categories for filter pills
    const categories = ['All', ...new Set(allArticles.map(a => a.category))];

    mainContainer.innerHTML = `
      <!-- TOP SHOWCASE: FEATURED HERO + LATEST POST SIDEBAR -->
      <div class="blog-showcase-grid">
        <!-- LEFT: LARGE FEATURED HERO POST -->
        <div class="blog-hero-card" onclick="app.insightsManager ? app.insightsManager.openInsightArticle('${heroArticle.id}') : null">
          <img src="${heroArticle.coverImage}" alt="${heroArticle.title}" class="blog-hero-bg" loading="lazy">
          <div class="blog-hero-overlay">
            <div class="blog-pill-tag">
              <span class="blog-pill-dot"></span>
              <span>${heroArticle.category}</span>
            </div>
            <h2 class="blog-hero-title">${heroArticle.title}</h2>
            <div class="blog-hero-meta">${heroArticle.date} • ${heroArticle.readTime} • Comprehensive 1000-Word Report</div>
          </div>
        </div>

        <!-- RIGHT: LATEST POST SIDEBAR (DOWNWARD SCROLLING TICKER) -->
        <div class="blog-latest-col">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;">
            <h3 class="blog-sidebar-header">Latest post</h3>
            <span class="blog-latest-live-badge">
              <span class="blog-latest-pulse-dot"></span>
              Live Feed
            </span>
          </div>

          <div class="blog-latest-scroll-viewport">
            <div class="blog-latest-track">
              ${scrollableLatestArticles.map(art => `
                <div class="blog-latest-item" onclick="app.insightsManager ? app.insightsManager.openInsightArticle('${art.id}') : null">
                  <img src="${art.coverImage}" alt="${art.title}" class="blog-latest-thumb" loading="lazy">
                  <div class="blog-latest-info">
                    <h4 class="blog-latest-item-title">${art.title}</h4>
                    <div class="blog-latest-item-meta">${art.date} • ${art.readTime}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- BOTTOM SECTION: FOUNDERS CORNER & ADVISORY GUIDES -->
      <div class="blog-bottom-section">
        <div class="blog-bottom-header">
          <div>
            <h2 class="blog-bottom-title">Founders corner</h2>
            <p style="font-size: 0.9rem; color: var(--charcoal-muted); margin: 4px 0 0 0;">Curated regulatory audits, decision matrices, and degree ROI frameworks.</p>
          </div>
          <div class="blog-nav-arrows">
            <button class="blog-nav-arrow-btn" type="button" aria-label="Previous articles" onclick="app.scrollBlogCarousel('left')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <button class="blog-nav-arrow-btn" type="button" aria-label="Next articles" onclick="app.scrollBlogCarousel('right')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>

        <!-- CATEGORY FILTER PILLS -->
        <div class="blog-category-filter-row">
          ${categories.map((cat, idx) => `
            <button class="blog-filter-btn ${idx === 0 ? 'active' : ''}" type="button" onclick="app.filterBlogCategory('${cat}', this)">
              ${cat === 'All' ? 'All Guides' : cat}
            </button>
          `).join('')}
        </div>

        <!-- CARDS CAROUSEL TRACK -->
        <div class="blog-cards-carousel" id="blogCarouselTrack">
          ${carouselArticles.map(art => this.renderBlogGridCard(art)).join('')}
        </div>
      </div>
    `;
  }

  renderBlogGridCard(art) {
    return `
      <div class="blog-grid-card" onclick="app.insightsManager ? app.insightsManager.openInsightArticle('${art.id}') : null">
        <div class="blog-grid-card-img-wrap">
          <img src="${art.coverImage}" alt="${art.title}" class="blog-grid-card-img" loading="lazy">
        </div>
        <div class="blog-grid-card-body">
          <div style="margin-bottom: 8px;">
            <span class="blog-pill-tag" style="margin-bottom: 0;">
              <span class="blog-pill-dot"></span>
              <span>${art.category}</span>
            </span>
          </div>
          <h3 class="blog-grid-card-title">${art.title}</h3>
          <p class="blog-grid-card-desc">${art.summary}</p>
          <div class="blog-grid-card-meta">
            <span>${art.date} • ${art.readTime}</span>
            <span style="font-weight: 750; color: var(--navy); display: inline-flex; align-items: center; gap: 4px;">Read ↗</span>
          </div>
        </div>
      </div>
    `;
  }

  scrollBlogCarousel(direction) {
    const track = document.getElementById('blogCarouselTrack');
    if (!track) return;
    const scrollAmount = track.clientWidth * 0.75;
    track.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  }

  filterBlogCategory(category, btnEl) {
    document.querySelectorAll('.blog-filter-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    const track = document.getElementById('blogCarouselTrack');
    if (!track || typeof NEXORA_DATA === 'undefined') return;

    let filtered = NEXORA_DATA.insights;
    if (category !== 'All') {
      filtered = filtered.filter(a => a.category === category);
    } else {
      filtered = NEXORA_DATA.insights.slice(5);
      if (filtered.length === 0) filtered = NEXORA_DATA.insights;
    }

    track.innerHTML = filtered.map(art => this.renderBlogGridCard(art)).join('');
  }

  /* ---------------------------------------------------- */
  /* 3D COVER FLOW FAQ CAROUSEL & POP-UP CONTROLLER       */
  /* ---------------------------------------------------- */
  activeFAQIndex = 0;
  activePopupIndex = 0;
  faqTouchStartX = 0;
  faqTouchEndX = 0;

  getFAQs() {
    if (typeof NEXORA_DATA !== 'undefined' && NEXORA_DATA && NEXORA_DATA.faqs) {
      return NEXORA_DATA.faqs;
    }
    if (window.NEXORA_DATA && window.NEXORA_DATA.faqs) {
      return window.NEXORA_DATA.faqs;
    }
    return [];
  }

  renderFAQAccordions() {
    this.init3DFAQDeck();
  }

  init3DFAQDeck() {
    const stage = document.getElementById('faqStage');
    const dotsContainer = document.getElementById('faqDeckDots');
    if (!stage) return;

    const faqs = this.getFAQs();
    if (!faqs.length) return;

    // Render 3D Cards
    stage.innerHTML = faqs.map((faq, idx) => {
      const numStr = (idx + 1).toString().padStart(2, '0');
      const cat = faq.category || 'Platform Guidance';
      const iconSvg = this.getFAQIconSvg(idx);
      const plainAnswer = faq.answer.replace(/<[^>]+>/g, '');
      const preview = plainAnswer.length > 95 ? plainAnswer.slice(0, 95) + '...' : plainAnswer;

      return `
        <div class="faq-3d-card" id="faqCard-${idx}" data-index="${idx}" onclick="app.handleFAQCardClick(${idx})" role="button" tabindex="0" aria-label="FAQ Question: ${faq.question}">
          <div class="faq-card-inner card-theme-${idx % 9}">
            <div class="faq-card-glow"></div>
            <div class="faq-card-decor-num">${numStr}</div>

            <div class="faq-card-top">
              <span class="faq-card-num-pill">FAQ ${numStr}</span>
              <span class="faq-card-cat-pill">${cat}</span>
            </div>

            <div class="faq-card-icon-wrap">
              ${iconSvg}
            </div>

            <div class="faq-card-content">
              <h3 class="faq-card-question">${faq.question}</h3>
              <p class="faq-card-snippet">${preview}</p>
            </div>

            <div class="faq-card-bottom">
              <div class="faq-card-click-hint">
                <span>View Full Answer</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Render Navigation Dots
    if (dotsContainer) {
      dotsContainer.innerHTML = faqs.map((_, idx) => `
        <button type="button" class="faq-deck-dot ${idx === this.activeFAQIndex ? 'active' : ''}" 
                onclick="app.setActiveFAQCard(${idx})" 
                aria-label="Go to Question ${idx + 1}">
        </button>
      `).join('');
    }

    // Touch swipe support on wrapper
    const wrapper = document.getElementById('faqStageWrapper');
    if (wrapper && !wrapper.dataset.touchBound) {
      wrapper.dataset.touchBound = 'true';
      wrapper.addEventListener('touchstart', (e) => {
        this.faqTouchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      wrapper.addEventListener('touchend', (e) => {
        this.faqTouchEndX = e.changedTouches[0].screenX;
        const diff = this.faqTouchStartX - this.faqTouchEndX;
        if (Math.abs(diff) > 40) {
          if (diff > 0) this.nextFAQCard();
          else this.prevFAQCard();
        }
      }, { passive: true });
    }

    // Window resize handler for fluid 3D adjustments
    if (!window._faqResizeBound) {
      window._faqResizeBound = true;
      window.addEventListener('resize', () => {
        if (window.app && app.update3DDeckPositions) {
          app.update3DDeckPositions();
        }
      });
    }

    // Global keyboard listener for carousel and modal
    if (!window._faqKeyBound) {
      window._faqKeyBound = true;
      window.addEventListener('keydown', (e) => {
        const overlay = document.getElementById('faqPopupOverlay');
        if (overlay && overlay.classList.contains('active')) {
          if (e.key === 'Escape') app.closeFAQPopup();
          if (e.key === 'ArrowRight') app.popupNavigate(1);
          if (e.key === 'ArrowLeft') app.popupNavigate(-1);
          return;
        }

        const faqSection = document.getElementById('faq');
        if (!faqSection) return;
        const rect = faqSection.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom > 0;
        if (isInView) {
          if (e.key === 'ArrowRight') app.nextFAQCard();
          if (e.key === 'ArrowLeft') app.prevFAQCard();
        }
      });
    }

    this.update3DDeckPositions();
  }

  update3DDeckPositions() {
    const faqs = this.getFAQs();
    const total = faqs.length;
    if (!total) return;

    const cards = document.querySelectorAll('.faq-3d-card');
    const isMobile = window.innerWidth < 640;
    const isTablet = window.innerWidth >= 640 && window.innerWidth < 1024;

    const xStep1 = isMobile ? 120 : isTablet ? 175 : 220;
    const xStep2 = isMobile ? 190 : isTablet ? 290 : 380;
    const xStepFar = isMobile ? 260 : isTablet ? 380 : 510;

    cards.forEach((card, idx) => {
      let diff = idx - this.activeFAQIndex;
      // Circular wrap diff so cards loop endlessly
      if (diff > total / 2) diff -= total;
      else if (diff < -total / 2) diff += total;

      card.classList.remove('card-active', 'card-left-1', 'card-right-1', 'card-left-2', 'card-right-2', 'card-hidden');

      if (diff === 0) {
        card.classList.add('card-active');
        card.style.transform = 'translateX(0px) translateZ(0px) rotateY(0deg) scale(1)';
        card.style.zIndex = '15';
        card.style.opacity = '1';
        card.style.pointerEvents = 'auto';
        card.style.filter = 'none';
      } else if (diff === -1) {
        card.classList.add('card-left-1');
        card.style.transform = `translateX(-${xStep1}px) translateZ(-65px) rotateY(28deg) scale(0.88)`;
        card.style.zIndex = '10';
        card.style.opacity = '0.92';
        card.style.pointerEvents = 'auto';
        card.style.filter = 'brightness(0.92)';
      } else if (diff === 1) {
        card.classList.add('card-right-1');
        card.style.transform = `translateX(${xStep1}px) translateZ(-65px) rotateY(-28deg) scale(0.88)`;
        card.style.zIndex = '10';
        card.style.opacity = '0.92';
        card.style.pointerEvents = 'auto';
        card.style.filter = 'brightness(0.92)';
      } else if (diff === -2) {
        card.classList.add('card-left-2');
        card.style.transform = `translateX(-${xStep2}px) translateZ(-130px) rotateY(38deg) scale(0.76)`;
        card.style.zIndex = '6';
        card.style.opacity = isMobile ? '0' : '0.72';
        card.style.pointerEvents = isMobile ? 'none' : 'auto';
        card.style.filter = 'brightness(0.82)';
      } else if (diff === 2) {
        card.classList.add('card-right-2');
        card.style.transform = `translateX(${xStep2}px) translateZ(-130px) rotateY(-38deg) scale(0.76)`;
        card.style.zIndex = '6';
        card.style.opacity = isMobile ? '0' : '0.72';
        card.style.pointerEvents = isMobile ? 'none' : 'auto';
        card.style.filter = 'brightness(0.82)';
      } else {
        card.classList.add('card-hidden');
        const dir = diff > 0 ? 1 : -1;
        card.style.transform = `translateX(${dir * xStepFar}px) translateZ(-200px) rotateY(${-dir * 46}deg) scale(0.62)`;
        card.style.zIndex = '1';
        card.style.opacity = '0';
        card.style.pointerEvents = 'none';
      }
    });

    // Update active top header
    const currentFAQ = faqs[this.activeFAQIndex];
    if (currentFAQ) {
      const titleEl = document.getElementById('faqActiveTitle');
      const subEl = document.getElementById('faqActiveSubtitle');
      if (titleEl) {
        titleEl.style.opacity = '0';
        setTimeout(() => {
          titleEl.textContent = currentFAQ.question;
          titleEl.style.opacity = '1';
        }, 150);
      }
      if (subEl) {
        subEl.textContent = `Click the center card to pop up the verified answer • Question ${this.activeFAQIndex + 1} of ${total}`;
      }
    }

    // Update navigation dots
    const dots = document.querySelectorAll('.faq-deck-dot');
    dots.forEach((dot, dIdx) => {
      dot.classList.toggle('active', dIdx === this.activeFAQIndex);
    });
  }

  handleFAQCardClick(idx) {
    if (idx === this.activeFAQIndex) {
      this.openFAQPopup(idx);
    } else {
      this.setActiveFAQCard(idx);
    }
  }

  setActiveFAQCard(idx) {
    const faqs = this.getFAQs();
    if (!faqs.length) return;
    if (idx < 0) idx = faqs.length - 1;
    if (idx >= faqs.length) idx = 0;
    this.activeFAQIndex = idx;
    this.update3DDeckPositions();
  }

  nextFAQCard() {
    const faqs = this.getFAQs();
    if (!faqs.length) return;
    this.setActiveFAQCard((this.activeFAQIndex + 1) % faqs.length);
  }

  prevFAQCard() {
    const faqs = this.getFAQs();
    if (!faqs.length) return;
    this.setActiveFAQCard((this.activeFAQIndex - 1 + faqs.length) % faqs.length);
  }

  openFAQPopup(idx) {
    const faqs = this.getFAQs();
    const faq = faqs[idx];
    if (!faq) return;

    this.activePopupIndex = idx;
    const overlay = document.getElementById('faqPopupOverlay');
    const badge = document.getElementById('faqPopupBadge');
    const category = document.getElementById('faqPopupCategory');
    const question = document.getElementById('faqPopupQuestion');
    const answer = document.getElementById('faqPopupAnswer');

    if (badge) badge.textContent = `QUESTION ${(idx + 1).toString().padStart(2, '0')}`;
    if (category) category.textContent = faq.category || 'Platform Guidance';
    if (question) question.textContent = faq.question;
    if (answer) answer.innerHTML = faq.answer;

    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeFAQPopup() {
    const overlay = document.getElementById('faqPopupOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  closeFAQPopupOnBackdrop(e) {
    if (e.target && e.target.id === 'faqPopupOverlay') {
      this.closeFAQPopup();
    }
  }

  popupNavigate(direction) {
    const faqs = this.getFAQs();
    if (!faqs.length) return;
    let nextIdx = (this.activePopupIndex + direction + faqs.length) % faqs.length;
    this.setActiveFAQCard(nextIdx);
    this.openFAQPopup(nextIdx);
  }

  getFAQIconSvg(idx) {
    const icons = [
      // 0: Navigation (compass/waypoint)
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
      // 1: Wizard / Personalization (stars/magic)
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/><path d="M5 3v4"/><path d="M3 5h4"/></svg>',
      // 2: Comparison Tray (scales/balance)
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>',
      // 3: Discovery Engine (radar/globe)
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
      // 4: Statutory Validity / UGC (shield check)
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>',
      // 5: Brochures & Syllabi (curriculum doc)
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
      // 6: 100% Free Platform (heart/sparkle)
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      // 7: EMI & Scholarships (award/badge)
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>',
      // 8: UGC Compliance (verified seal)
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/></svg>'
    ];
    return icons[idx % icons.length];
  }

  toggleFAQ(headerEl) {
    if (!headerEl) return;
    const item = headerEl.parentElement;
    if (item) item.classList.toggle('active');
  }

  /* ---------------------------------------------------- */
  /* ---------------------------------------------------- */
  /* ---------------------------------------------------- */
  /* STATIC ROUTE EXPLAINER ENTRANCE ANIMATION             */
  /* Triggered once via IntersectionObserver (~25% in view) */
  /* ---------------------------------------------------- */
  initRouteExplainerAnimation() {
    const section = document.getElementById('routeExplainerSection');
    if (!section) return;

    // Accessibility: Check prefers-reduced-motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      section.classList.add('route-anim-active');
      return;
    }

    // Set pre-entrance ready state (keeps cards/strip primed before viewport intersection)
    section.classList.add('route-anim-ready');

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            section.classList.add('route-anim-active');
            observer.unobserve(section);
          }
        });
      }, {
        threshold: 0.25 // Trigger once when 20-30% of section enters viewport
      });
      observer.observe(section);
    } else {
      // Fallback if IntersectionObserver is unavailable
      section.classList.add('route-anim-active');
    }
  }

  initWaypoints() {
    // Route explainer is completely static as per design specification
  }

  getPipelineStageData(stageIdx) {
    return { step: "", title: "", desc: "" };
  }

  selectPipelineStage(stageIndex) {
    // Completely static visual explainer - no dynamic mutation
  }

  autoMapPipeline(destId, animate = true) {
    // Completely static visual explainer - no activity tracking or animation
  }

  /* ---------------------------------------------------- */
  /* GLOBAL MODAL & EVENT LISTENERS                       */
  /* ---------------------------------------------------- */
  initGlobalEvents() {
    const backdrop = document.getElementById('globalModalBackdrop');
    const closeBtn = document.getElementById('modalCloseBtn');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.closeModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });

    const mobileToggle = document.getElementById('mobileMenuToggle');
    const navLinks = document.getElementById('navLinks');

    if (mobileToggle && navLinks) {
      mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('mobile-open');
      });
    }

    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('popstate', () => this.handleRoute());
  }

  closeModal() {
    const backdrop = document.getElementById('globalModalBackdrop');
    if (backdrop) backdrop.classList.remove('active');
  }

  /* MODAL SHORTCUT DELEGATES */
  openUniversityModal(id) {
    this.navigateToUniversity(id);
  }

  openProgrammeModal(id) {
    this.navigateToProgramme(id);
  }

  openCompareMatrix(activeTab = null) {
    if (activeTab) {
      this.comparePageTab = activeTab;
    }
    this.navigateToComparePage();
  }

  scrollToSection(id) {
    if (this.currentView !== 'homeView') {
      this.showView('homeView');
    }

    setTimeout(() => {
      const section = document.getElementById(id);
      if (section) {
        const navHeight = document.getElementById('mainHeader')?.offsetHeight || 72;
        const targetTop = section.getBoundingClientRect().top + window.pageYOffset - navHeight - 16;
        window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      }
    }, 50);
  }

  /* ==========================================================================
     STACK SPREAD IMAGE GALLERY (SCROLL INTERPOLATION & POINTER PARALLAX)
     ========================================================================== */
  initStackSpreadGallery() {
    const gallerySection = document.getElementById('imageGallery');
    const track = document.getElementById('nexoraGalleryTrack');
    const stage = document.getElementById('nexoraGalleryStage');
    const cardsWrap = document.getElementById('nexoraGalleryCardsWrap');
    const scrollHint = document.getElementById('nexoraGalleryScrollHint');

    if (!gallerySection || !track || !stage || !cardsWrap) return;

    const cards = Array.from(cardsWrap.querySelectorAll('.nexora-gallery-card'));
    if (!cards.length) return;

    // Card configurations: initial stack offsets vs spread coordinates
    const cardConfigs = [
      // 0: Campus Architecture (Top Left)
      {
        initial: { x: 0, y: 0, rot: -2.5, scale: 0.96, z: 7 },
        spreadDesktop: { x: -390, y: -120, rot: -2, scale: 1.0 },
        spreadTablet:  { x: -240, y: -90,  rot: -2, scale: 0.95 },
        spreadMobile:  { x: -70,  y: -100, rot: -3, scale: 0.88 },
        depth: 6
      },
      // 1: Central Library (Top Mid-Left)
      {
        initial: { x: -25, y: -32, rot: -6.5, scale: 0.93, z: 6 },
        spreadDesktop: { x: -130, y: -155, rot: 1.5, scale: 0.98 },
        spreadTablet:  { x: -80,  y: -115, rot: 1.5, scale: 0.92 },
        spreadMobile:  { x: 70,   y: -105, rot: 3,  scale: 0.88 },
        depth: 5
      },
      // 2: Robotics AI Lab (Top Mid-Right)
      {
        initial: { x: 28, y: -26, rot: 5.5, scale: 0.94, z: 5 },
        spreadDesktop: { x: 135, y: -150, rot: -1.5, scale: 1.0 },
        spreadTablet:  { x: 80,  y: -110, rot: -1.5, scale: 0.94 },
        spreadMobile:  { x: -80, y: 0,    rot: -2, scale: 0.88 },
        depth: 5
      },
      // 3: Students Quad (Top Right)
      {
        initial: { x: -32, y: 22, rot: 4.0, scale: 0.92, z: 4 },
        spreadDesktop: { x: 400, y: -115, rot: 2.5, scale: 0.98 },
        spreadTablet:  { x: 240, y: -85,  rot: 2,   scale: 0.92 },
        spreadMobile:  { x: 80,  y: 5,    rot: 2,   scale: 0.88 },
        depth: 7
      },
      // 4: Academic Auditorium (Bottom Left)
      {
        initial: { x: 30, y: 28, rot: -4.5, scale: 0.93, z: 3 },
        spreadDesktop: { x: -320, y: 135, rot: 1.5, scale: 1.02 },
        spreadTablet:  { x: -195, y: 105, rot: 1.5, scale: 0.96 },
        spreadMobile:  { x: -70,  y: 105, rot: 2,   scale: 0.88 },
        depth: 6
      },
      // 5: Convocation (Bottom Center)
      {
        initial: { x: -12, y: 8, rot: 2.8, scale: 0.95, z: 2 },
        spreadDesktop: { x: 0,   y: 160, rot: -1.0, scale: 1.05 },
        spreadTablet:  { x: 0,   y: 125, rot: -1.0, scale: 1.0 },
        spreadMobile:  { x: 70,  y: 110, rot: -2,  scale: 0.88 },
        depth: 4
      },
      // 6: University Campus Complex (Bottom Right)
      {
        initial: { x: 18, y: -8, rot: -3.5, scale: 0.91, z: 1 },
        spreadDesktop: { x: 330, y: 135, rot: -2.0, scale: 0.98 },
        spreadTablet:  { x: 195, y: 105, rot: -1.5, scale: 0.94 },
        spreadMobile:  { x: 0,   y: 0,   rot: 0,    scale: 0.92 },
        depth: 7
      }
    ];

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Animation State
    let targetProgress = 0;
    let currentProgress = 0;
    let mouseTargetX = 0;
    let mouseTargetY = 0;
    let mouseCurrentX = 0;
    let mouseCurrentY = 0;
    let isMouseOver = false;
    let rafId = null;

    // Cubic easing function for smooth natural interpolation
    const easeInOutCubic = (t) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    // Calculate Scroll Progress
    const calculateProgress = () => {
      if (prefersReducedMotion.matches) return;
      const rect = track.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const totalScrollable = rect.height - windowHeight;

      if (totalScrollable <= 0) {
        targetProgress = 0;
        return;
      }

      // 0 when track top hits top of viewport, 1 when track bottom reaches bottom of viewport
      const scrolled = -rect.top;
      const rawProgress = scrolled / totalScrollable;
      targetProgress = Math.max(0, Math.min(1, rawProgress));
    };

    // Render Frame Loop
    const updateGalleryFrame = () => {
      if (prefersReducedMotion.matches) {
        cards.forEach(card => {
          card.style.transform = '';
          card.style.zIndex = '';
        });
        return;
      }

      // Smooth lerping
      currentProgress += (targetProgress - currentProgress) * 0.12;
      if (Math.abs(targetProgress - currentProgress) < 0.0005) {
        currentProgress = targetProgress;
      }

      mouseCurrentX += (mouseTargetX - mouseCurrentX) * 0.08;
      mouseCurrentY += (mouseTargetY - mouseCurrentY) * 0.08;

      const eased = easeInOutCubic(currentProgress);
      const width = window.innerWidth;
      const isMobile = width <= 768;
      const isTablet = width > 768 && width <= 1024;

      // Update Scroll Hint visibility
      if (scrollHint) {
        const hintOpacity = Math.max(0, 1 - currentProgress * 4.5);
        scrollHint.style.opacity = hintOpacity.toFixed(3);
        scrollHint.style.pointerEvents = hintOpacity <= 0.05 ? 'none' : 'auto';
      }

      // Transform each card smoothly
      cards.forEach((card, idx) => {
        const cfg = cardConfigs[idx] || cardConfigs[0];
        const spread = isMobile ? cfg.spreadMobile : (isTablet ? cfg.spreadTablet : cfg.spreadDesktop);

        // Interpolate Position
        const curX = cfg.initial.x + (spread.x - cfg.initial.x) * eased;
        const curY = cfg.initial.y + (spread.y - cfg.initial.y) * eased;

        // Subtle desktop pointer parallax
        const parallaxFactor = (isMobile || !isMouseOver) ? 0 : (1 - eased * 0.25);
        const pX = mouseCurrentX * (cfg.depth || 5) * parallaxFactor;
        const pY = mouseCurrentY * (cfg.depth || 5) * parallaxFactor;

        // Interpolate Rotation & Scale
        const curRot = cfg.initial.rot + (spread.rot - cfg.initial.rot) * eased;
        const curScale = cfg.initial.scale + (spread.scale - cfg.initial.scale) * eased;

        card.style.transform = `translate3d(${(curX + pX).toFixed(2)}px, ${(curY + pY).toFixed(2)}px, 0px) rotate(${curRot.toFixed(2)}deg) scale(${curScale.toFixed(3)})`;
        card.style.zIndex = cfg.initial.z;
      });

      rafId = requestAnimationFrame(updateGalleryFrame);
    };

    // Pointer Parallax Event Handlers
    const onMouseMove = (e) => {
      if (window.innerWidth <= 768 || prefersReducedMotion.matches) return;
      const rect = stage.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;

      if (rect.top < windowHeight && rect.bottom > 0) {
        isMouseOver = true;
        const normX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const normY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        mouseTargetX = Math.max(-1, Math.min(1, normX));
        mouseTargetY = Math.max(-1, Math.min(1, normY));
      } else {
        isMouseOver = false;
        mouseTargetX = 0;
        mouseTargetY = 0;
      }
    };

    const onMouseLeave = () => {
      isMouseOver = false;
      mouseTargetX = 0;
      mouseTargetY = 0;
    };

    // Attach Listeners
    window.addEventListener('scroll', calculateProgress, { passive: true });
    window.addEventListener('resize', calculateProgress, { passive: true });
    stage.addEventListener('mousemove', onMouseMove, { passive: true });
    stage.addEventListener('mouseleave', onMouseLeave, { passive: true });

    // Initial calculation & kickstart RAF
    calculateProgress();
    currentProgress = targetProgress;
    rafId = requestAnimationFrame(updateGalleryFrame);
  }
}

// Instantiate App Global Instance
window.app = new NexoraApp();
