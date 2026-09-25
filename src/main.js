/*
 * Point d'entrée du widget : câblage avec l'API Grist et le DOM. Tout ce
 * qui est calcul pur vit dans logic.js, tout ce qui est gabarit HTML vit
 * dans render.js — ce fichier ne fait que les appeler et gérer l'état
 * mutable (filtres, modale) et les événements DOM.
 *
 * Chargé après logic.js et render.js (voir index.html) : `LCSE` est déjà
 * peuplé quand ce script s'exécute.
 */
(function () {
  "use strict";

  const {
    ALL, TABLES, PAGE_SIZE, TABS, TAB_OPEN,
    getFilterOptions, buildActions, paginate, actionsForTab, countLabelFor,
    SUPPORT_FIELDS, parseMontant, validateSupportForm, FILTERS,
    filterSuggestions, activeFilterCount,
  } = window.LCSE;
  const {
    renderEmptyState, renderCard, renderTabs, renderTabPane, tabButtonId,
    renderLoadMore, renderFilters, renderFilterBadge, renderFilterOptions,
    renderModal,
  } = window.LCSE;

  // --- Accès aux pièces jointes (logos) ---------------------------------
  //
  // Les tables arrivent par l'API plugin, dans le contexte de la page
  // Grist : les règles d'accès y voient la clé de lien de l'URL et
  // laissent passer. Le logo, lui, est téléchargé par une requête HTTP
  // séparée depuis l'iframe du widget, qui ne connaît pas l'URL de la
  // page parente (origines différentes) — il faut donc lui redonner la
  // clé, sans quoi Grist répond 403 et la page publique perd ses logos.
  //
  // Cette clé n'est pas un secret : elle figure en clair dans l'URL
  // publique distribuée aux visiteurs (`?pp_=lcse-soutien`). Ce sont les
  // règles d'accès du document qui décident ce qu'elle ouvre.
  const PUBLIC_LINK_KEY = "lcse-soutien";
  // Repli quand getAccessToken n'aboutit pas (cas du visiteur anonyme) :
  // il faut bien une base d'URL. À faire évoluer en même temps que le
  // document servi par la page publique.
  const ATTACHMENTS_BASE_URL =
    "https://grist.aucarre.tech/o/docs/api/docs/79GCxUFdb7Py";

  const state = {
    // Onglet d'arrivée : les actions encore à financer, but du widget.
    tab: TAB_OPEN,
    region: ALL,
    dept: ALL,
    fede: ALL,
    club: ALL,
    openActionId: null,
    // Nombre d'actions rendues : on part d'un lot, puis le bouton
    // « Charger 24 actions de plus » l'augmente. Remis à PAGE_SIZE dès
    // que la liste filtrée change (choix de filtre, réinitialisation).
    visibleCount: PAGE_SIZE,
    sent: false,
    submitting: false,
    submitError: "",
    // Erreurs de saisie du formulaire de soutien, par nom de champ.
    fieldErrors: {},
    // Filtres repliés d'emblée sur petit écran (ils y prennent toute la
    // hauteur visible), dépliés sur grand écran où la place ne manque pas.
    // État initial seulement : ensuite, c'est la directive de repli du
    // Design System qui ouvre et ferme le bloc.
    filtersOpen: !(typeof window !== "undefined" && window.matchMedia
      && window.matchMedia("(max-width: 767.98px)").matches),
  };

  let actions = []; // liste jointe et prête à l'affichage
  let loaded = false;
  let loadError = "";

  const app = document.getElementById("app");
  // La modale est rendue hors de <main> (voir index.html) : sur iOS, une
  // zone qui défile devient le référentiel des éléments en position fixe,
  // et la modale se mettrait à défiler avec le contenu.
  const modalRoot = document.getElementById("lcse-modal-root");

  // ---------------------------------------------------------------------
  // Chargement des données
  // ---------------------------------------------------------------------

  async function fetchAll() {
    const [actionsT, drT, ddT, structuresT, federationsT, cofinT, attachToken] = await Promise.all([
      grist.docApi.fetchTable(TABLES.actions),
      grist.docApi.fetchTable(TABLES.dr),
      grist.docApi.fetchTable(TABLES.dd),
      grist.docApi.fetchTable(TABLES.structures),
      grist.docApi.fetchTable(TABLES.federations),
      grist.docApi.fetchTable(TABLES.cofinancements),
      grist.docApi.getAccessToken({ readOnly: true }).catch(() => null),
    ]);

    actions = buildActions(
      { actionsT, drT, ddT, structuresT, federationsT, cofinT },
      {
        // Le jeton, quand il existe, fournit surtout la bonne base d'URL
        // (elle porte l'identifiant du document) ; c'est la clé de lien
        // qui autorise réellement le téléchargement.
        baseUrl: (attachToken && attachToken.baseUrl) || ATTACHMENTS_BASE_URL,
        linkKey: PUBLIC_LINK_KEY,
        token: attachToken ? attachToken.token : null,
      }
    );

    loaded = true;
    loadError = "";
  }

  // ---------------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------------

  // Le titre et les filtres sont-ils déjà dans la page ? (voir render)
  let shellRendered = false;

  function render() {
    if (loadError) {
      shellRendered = false;
      app.innerHTML = `
      <div class="alert alert-error" role="alert">
        <div class="alert-body">
          <p class="alert-title">Impossible de charger les actions</p>
          <p class="alert-content">${window.LCSE.escapeHtml(loadError)}</p>
        </div>
      </div>`;
      return;
    }

    if (!loaded) {
      app.innerHTML = `<div class="lcse-loading"><p>Chargement des actions…</p></div>`;
      return;
    }

    // Les filtres s'appliquent avant la répartition par onglet : on peut
    // ainsi compter ce que contient chaque onglet sous les filtres courants
    // et l'afficher sur les deux, plutôt que de laisser cliquer à l'aveugle.
    const filtered = actions.filter((a) =>
      (state.region === ALL || a.regionLabel === state.region) &&
      (state.dept === ALL || a.deptLabel === state.dept) &&
      (state.fede === ALL || a.federationLabel === state.fede) &&
      (state.club === ALL || a.clubLabel === state.club)
    );

    const counts = {};
    for (const t of TABS) counts[t.key] = actionsForTab(filtered, t.key).length;

    const list = actionsForTab(filtered, state.tab);

    const pagination = paginate(list, state.visibleCount, PAGE_SIZE);

    const countLabel = countLabelFor(state.tab, list.length);

    const openAction = actions.find((a) => a.id === state.openActionId) || null;

    // Le titre et les filtres ne sont dessinés qu'une fois : les champs de
    // filtre (webcomponents Autocomplete) et le bloc repliable gardent ainsi
    // leur état et le focus. Seule la liste (onglets + panneau) est
    // redessinée à chaque changement.
    if (!shellRendered) {
      app.innerHTML = `
    <div class="lcse-title-row">
      <div class="lcse-title-bar"></div>
      <h1 class="lcse-title">Soutenez les clubs sportifs engagés pour l'insertion par le sport</h1>
    </div>
    ${renderFilters(FILTERS, state, activeFilterCount(state), state.filtersOpen, allFilterOptions())}
    <div id="lcse-results"></div>`;
      bindFilterEvents();
      shellRendered = true;
    }
    syncFilters();

    document.getElementById("lcse-results").innerHTML = `
    ${renderTabs(TABS, state.tab, counts)}
    ${renderTabPane(state.tab, `
      <p class="lcse-count">${countLabel}</p>
      ${list.length === 0 ? renderEmptyState() : `<div class="lcse-grid">${pagination.page.map(renderCard).join("")}</div>`}
      ${renderLoadMore(pagination)}
    `)}`;

    renderModalRoot(openAction);

    bindEvents();

    // render() recrée tous les boutons : sans cela, cliquer un onglet au
    // clavier renverrait le focus en haut du document (RGAA 12.8).
    if (pendingAppFocusId) {
      const el = document.getElementById(pendingAppFocusId);
      pendingAppFocusId = "";
      if (el) el.focus();
    }
  }

  // Élément de la page (hors modale) à refocaliser après le prochain rendu.
  let pendingAppFocusId = "";

  // --- Modale : rendu, focus, clavier ----------------------------------
  //
  // render() reconstruit tout le HTML à chaque changement d'état. Pour la
  // modale, cela ferait perdre à la fois les saisies (un échec d'envoi
  // viderait le formulaire) et le focus clavier. On les capture donc avant
  // le rendu et on les restaure après.

  // Id de l'action dont le bouton « Soutenir » a ouvert la modale : le
  // focus y revient à la fermeture (motif « dialog » d'ARIA, RGAA 12.8).
  let modalTriggerId = null;
  let modalWasOpen = false;
  // Champ à focaliser au prochain rendu de la modale (premier champ en
  // erreur après une tentative d'envoi), prioritaire sur le focus courant.
  let pendingFocusId = "";
  // Dernier message d'échec d'envoi déjà annoncé aux lecteurs d'écran.
  let announcedError = "";

  function renderModalRoot(openAction) {
    const oldForm = document.getElementById("lcse-support-form");
    const values = oldForm ? Object.fromEntries(new FormData(oldForm)) : null;
    const focused = modalRoot.contains(document.activeElement) ? document.activeElement.id : "";

    modalRoot.innerHTML = renderModal(openAction, state);

    const open = !!openAction;
    // Le reste de la page devient inerte derrière la modale : ni clic, ni
    // tabulation, ni lecture par les lecteurs d'écran.
    app.inert = open;
    const header = document.querySelector(".lcse-header");
    if (header) header.inert = open;

    const newForm = document.getElementById("lcse-support-form");
    if (newForm && values) {
      for (const [name, value] of Object.entries(values)) {
        const field = newForm.elements.namedItem(name);
        if (field) field.value = value;
      }
    }

    if (open) {
      // À l'ouverture, ou quand l'élément qui avait le focus a disparu
      // (passage au message de confirmation) : premier élément tabulable,
      // le bouton de fermeture en pratique.
      const wanted = pendingFocusId || focused;
      pendingFocusId = "";
      const target = (wanted && document.getElementById(wanted)) || focusableIn(modalRoot)[0];
      if (target) target.focus();

      // Alerte d'échec d'envoi : rendue masquée et vide, on n'y écrit le
      // message qu'une fois la zone en place, pour qu'il soit annoncé.
      // Un message déjà annoncé est réaffiché d'emblée lors des rendus
      // suivants, sans être relu.
      const alertEl = document.getElementById("lcse-submit-alert");
      const message = state.submitError;
      if (alertEl && message) {
        const show = () => {
          const text = document.getElementById("lcse-submit-alert-text");
          if (!text || !alertEl.isConnected) return;
          alertEl.hidden = false;
          text.textContent = message;
        };
        if (message === announcedError) show();
        else { announcedError = message; setTimeout(show, 100); }
      }
      if (!message) announcedError = "";
    } else if (modalWasOpen) {
      const trigger = app.querySelector(`[data-action="support"][data-id="${modalTriggerId}"]`);
      // Si le bouton n'existe plus, on se rabat sur le titre de la page.
      const fallback = app.querySelector("h1");
      if (trigger) trigger.focus();
      else if (fallback) { fallback.tabIndex = -1; fallback.focus(); }
    }
    modalWasOpen = open;
  }

  function focusableIn(root) {
    return Array.from(root.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((el) => el.offsetParent !== null || el === document.activeElement);
  }

  function openModal(actionId) {
    modalTriggerId = actionId;
    state.openActionId = actionId;
    state.sent = false;
    state.submitError = "";
    state.fieldErrors = {};
    render();
  }

  function closeModal() {
    state.openActionId = null;
    state.sent = false;
    state.submitError = "";
    state.fieldErrors = {};
    render();
  }

  // Retire l'erreur d'un champ sans re-rendre la modale (ce qui déplacerait
  // le curseur) : dès que la saisie devient valide, le message disparaît.
  function clearFieldError(name) {
    delete state.fieldErrors[name];
    const field = document.getElementById(`f-${name}`);
    if (!field) return;
    const group = field.closest(".form-group");
    if (group) group.classList.remove("has-error");
    field.classList.remove("is-invalid");
    field.removeAttribute("aria-invalid");
    const errorEl = document.getElementById(`error-f-${name}`);
    if (errorEl) errorEl.remove();
    const rest = (field.getAttribute("aria-describedby") || "")
      .split(" ").filter((id) => id && id !== `error-f-${name}`).join(" ");
    if (rest) field.setAttribute("aria-describedby", rest);
    else field.removeAttribute("aria-describedby");
  }

  // Écouteur unique (le document n'est jamais re-rendu) : Échap ferme la
  // modale, Tab et Maj+Tab bouclent à l'intérieur.
  document.addEventListener("keydown", (e) => {
    if (state.openActionId === null) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
      return;
    }
    if (e.key !== "Tab") return;
    const items = focusableIn(modalRoot);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !modalRoot.contains(document.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !modalRoot.contains(document.activeElement))) {
      e.preventDefault();
      first.focus();
    }
  });

  // ---------------------------------------------------------------------
  // Événements
  // ---------------------------------------------------------------------

  function bindEvents() {
    app.querySelectorAll("[data-tab]").forEach((el) => {
      el.addEventListener("click", () => {
        const tab = el.getAttribute("data-tab");
        if (tab === state.tab) return;
        state.tab = tab;
        pendingAppFocusId = tabButtonId(tab);
        // La pagination repart du premier lot : l'autre onglet n'a rien à
        // voir avec ce qui était déroulé ici.
        state.visibleCount = PAGE_SIZE;
        // Les filtres sont conservés : c'est justement l'intérêt de voir
        // les compteurs des deux onglets sur un même périmètre.
        render();
      });
    });

    // Lien d'évitement en fin de liste : un lien vers un bouton ne lui
    // donne pas le focus dans tous les navigateurs, on le fait nous-mêmes.
    app.querySelectorAll('[data-action="back-to-tab"]').forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const tabButton = document.getElementById(tabButtonId(state.tab));
        if (tabButton) tabButton.focus();
      });
    });

    app.querySelectorAll('[data-action="load-more"]').forEach((el) => {
      el.addEventListener("click", () => {
        const firstNew = state.visibleCount;
        state.visibleCount += PAGE_SIZE;
        // render() remplace la liste : on remet le défilement où il était,
        // sinon le clic renvoie en haut de page.
        const y = window.scrollY;
        render();
        window.scrollTo(0, y);
        // Le bouton a disparu avec la liste : le focus irait en haut du
        // document (RGAA 12.8). Il passe au titre de la première carte
        // ajoutée, là où la lecture reprend.
        const title = app.querySelectorAll(".lcse-grid .lcse-card-title")[firstNew];
        if (title) title.focus({ preventScroll: true });
      });
    });

    app.querySelectorAll('[data-action="support"]').forEach((el) => {
      el.addEventListener("click", () => openModal(Number(el.getAttribute("data-id"))));
    });

    modalRoot.querySelectorAll('[data-action="close"]').forEach((el) => {
      el.addEventListener("click", closeModal);
    });

    const modalContent = modalRoot.querySelector(".modal-content");
    if (modalContent) modalContent.addEventListener("click", (e) => e.stopPropagation());

    const form = document.getElementById("lcse-support-form");
    if (form) {
      form.addEventListener("submit", onSubmitForm);
      // On ne signale pas d'erreur pendant la frappe ; on retire seulement
      // celles qui viennent d'être corrigées.
      form.addEventListener("input", (e) => {
        const name = e.target && e.target.name;
        if (!name || !state.fieldErrors[name]) return;
        const errors = validateSupportForm(Object.fromEntries(new FormData(form)));
        if (!errors[name]) clearFieldError(name);
      });
    }
  }

  // --- Filtres ----------------------------------------------------------

  // Options d'un filtre. Elles ne listent que les valeurs présentes dans
  // l'onglet courant : proposer un club dont toutes les actions sont dans
  // l'autre onglet mènerait à une liste vide.
  function allFilterOptions() {
    return getFilterOptions(actionsForTab(actions, state.tab), state);
  }

  function filterOptions(key) {
    return allFilterOptions()[key] || [];
  }

  // Remet chaque filtre sur sa valeur retenue (après un choix, une
  // réinitialisation, ou le département remis à « Tous » par un changement
  // de région) et met à jour la pastille du nombre de filtres actifs. Les
  // listes déroulantes reçoivent aussi leurs options, qui dépendent de
  // l'onglet et de la région. Le champ de recherche où l'on est en train
  // de taper n'est pas touché.
  function syncFilters() {
    const options = allFilterOptions();
    for (const f of FILTERS) {
      const field = document.getElementById(`lcse-filter-${f.key}`);
      if (!field) continue;
      if (!f.search) {
        field.innerHTML = renderFilterOptions(options[f.key] || [], state[f.key]);
        field.value = state[f.key];
      } else if (field !== document.activeElement && field.value !== state[f.key]) {
        field.value = state[f.key];
      }
    }
    const badge = document.getElementById("lcse-filters-count");
    if (badge) badge.innerHTML = renderFilterBadge(activeFilterCount(state));
  }

  function selectFilterValue(key, value) {
    if (state[key] === value) return;
    state[key] = value;
    if (key === "region") state.dept = ALL;
    state.visibleCount = PAGE_SIZE;
    render();
  }

  // Événements des filtres, posés une seule fois (les filtres ne sont pas
  // redessinés).
  function bindFilterEvents() {
    app.querySelectorAll("ft-autocomplete").forEach((el) => {
      const input = document.getElementById(el.getAttribute("input-id"));
      const key = input && input.dataset.filter;
      if (!key) return;
      // Propriété posée avant même que le webcomponent soit chargé : elle
      // prime sur la méthode par défaut du composant.
      el.searchCallback = (text) => {
        const found = filterSuggestions(filterOptions(key), text, state[key]);
        return found.length ? found.map((name) => ({ name })) : ["empty"];
      };
    });

    app.addEventListener("ft-autocomplete-change", (e) => {
      const input = document.getElementById(e.target.getAttribute("input-id"));
      const key = input && input.dataset.filter;
      if (key && e.detail && e.detail.name) selectFilterValue(key, e.detail.name);
    });

    // Listes déroulantes : le choix s'applique dès qu'il change.
    app.addEventListener("change", (e) => {
      const el = e.target;
      if (el && el.tagName === "SELECT" && el.dataset.filter) selectFilterValue(el.dataset.filter, el.value);
    });

    // Champ de recherche, en le quittant : vidé, il revient à « Toutes » (le bouton
    // d'effacement du composant sert à cela) ; laissé sur une saisie
    // partielle, il réaffiche la valeur retenue.
    app.addEventListener("focusout", (e) => {
      const input = e.target;
      const key = input && input.tagName === "INPUT" && input.dataset.filter;
      if (!key) return;
      setTimeout(() => {
        if (document.activeElement === input) return;
        if (!input.value.trim()) selectFilterValue(key, ALL);
        else if (input.value !== state[key]) input.value = state[key];
      }, 150);
    });

    app.querySelectorAll('[data-action="reset"]').forEach((el) => {
      el.addEventListener("click", () => {
        state.region = ALL; state.dept = ALL; state.fede = ALL; state.club = ALL;
        state.visibleCount = PAGE_SIZE;
        // syncFilters épargne le champ de recherche qui a le focus : on le
        // vide ici explicitement, la réinitialisation vaut pour tous.
        FILTERS.filter((f) => f.search).forEach((f) => {
          const input = document.getElementById(`lcse-filter-${f.key}`);
          if (input) input.value = ALL;
        });
        // L'onglet n'est pas un filtre : "Réinitialiser" ne le change pas.
        render();
      });
    });
  }

  async function onSubmitForm(e) {
    e.preventDefault();
    // Le bouton d'envoi reste focalisable pendant l'envoi (aria-disabled
    // plutôt que disabled, qui lui ferait perdre le focus) : c'est ici
    // qu'on bloque un second envoi.
    if (state.submitting) return;
    const action = actions.find((a) => a.id === state.openActionId);
    if (!action) return;

    const data = new FormData(e.target);
    const errors = validateSupportForm(Object.fromEntries(data));
    const firstInvalid = SUPPORT_FIELDS.find((name) => errors[name]);
    state.fieldErrors = errors;
    state.submitError = "";
    if (firstInvalid) {
      // Focus sur le premier champ en erreur : son message est lu avec
      // lui (aria-describedby).
      pendingFocusId = `f-${firstInvalid}`;
      render();
      return;
    }

    state.submitting = true;
    render();

    try {
      await grist.docApi.applyUserActions([[
        "AddRecord",
        TABLES.soutiens,
        null,
        {
          Organisation: String(data.get("organisation") || "").trim(),
          Prenom: String(data.get("prenom") || "").trim(),
          Nom: String(data.get("nom") || "").trim(),
          Email: String(data.get("email") || "").trim(),
          Telephone: String(data.get("telephone") || "").trim(),
          Montant: parseMontant(data.get("montant")),
          Message: String(data.get("message") || "").trim(),
          Date: Math.floor(Date.now() / 1000),
          Action_financee: action.id,
        },
      ]]);
      state.submitting = false;
      state.sent = true;
      render();
    } catch (err) {
      state.submitting = false;
      state.submitError = "L'envoi a échoué : " + (err && err.message ? err.message : "erreur inconnue") + ". Réessayez.";
      render();
    }
  }

  // ---------------------------------------------------------------------
  // Démarrage
  // ---------------------------------------------------------------------

  grist.ready({ requiredAccess: "full" });

  render();

  fetchAll()
    .then(render)
    .catch((err) => {
      loaded = true;
      loadError = (err && err.message) ? err.message : "Erreur inconnue lors du chargement.";
      render();
    });
})();
