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
    ALL, TABLES, FILTER_KEYS,
    getFilterOptions, filterOptionsByQuery, buildActions,
  } = window.LCSE;
  const {
    renderEmptyState, renderCard, renderCombo, comboOptionsHtml, renderModal,
  } = window.LCSE;

  const state = {
    region: ALL,
    dept: ALL,
    fede: ALL,
    club: ALL,
    openActionId: null,
    sent: false,
    submitting: false,
    submitError: "",
    // Filtres repliés d'emblée sur petit écran (ils y prennent toute la
    // hauteur visible), dépliés sur grand écran où la place ne manque pas.
    filtersOpen: !(typeof window !== "undefined" && window.matchMedia
      && window.matchMedia("(max-width: 680px)").matches),
  };

  // État transitoire des combobox de recherche des filtres (texte tapé,
  // liste ouverte/fermée) — distinct de `state`, qui ne garde que la valeur
  // retenue pour chaque filtre.
  const combo = {
    region: { open: false, query: "" },
    dept: { open: false, query: "" },
    fede: { open: false, query: "" },
    club: { open: false, query: "" },
  };

  let actions = []; // liste jointe et prête à l'affichage
  let loaded = false;
  let loadError = "";

  const app = document.getElementById("app");

  // ---------------------------------------------------------------------
  // Chargement des données
  // ---------------------------------------------------------------------

  async function fetchAll() {
    const [actionsT, drT, ddT, agencesT, structuresT, federationsT, cofinT, attachToken] = await Promise.all([
      grist.docApi.fetchTable(TABLES.actions),
      grist.docApi.fetchTable(TABLES.dr),
      grist.docApi.fetchTable(TABLES.dd),
      grist.docApi.fetchTable(TABLES.agences),
      grist.docApi.fetchTable(TABLES.structures),
      grist.docApi.fetchTable(TABLES.federations),
      grist.docApi.fetchTable(TABLES.cofinancements),
      grist.docApi.getAccessToken({ readOnly: true }).catch(() => null),
    ]);

    actions = buildActions(
      { actionsT, drT, ddT, agencesT, structuresT, federationsT, cofinT },
      attachToken
    );

    loaded = true;
    loadError = "";
  }

  // ---------------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------------

  function render() {
    if (loadError) {
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

    const inRegion = state.region === ALL ? actions : actions.filter((a) => a.regionLabel === state.region);
    const list = inRegion.filter((a) =>
      (state.dept === ALL || a.deptLabel === state.dept) &&
      (state.fede === ALL || a.federationLabel === state.fede) &&
      (state.club === ALL || a.clubLabel === state.club)
    );

    const options = getFilterOptions(actions, state);

    const countLabel = list.length === 0
      ? "Aucune action ouverte au soutien"
      : list.length === 1
        ? "1 action ouverte au soutien"
        : `${list.length} actions ouvertes au soutien`;

    const openAction = actions.find((a) => a.id === state.openActionId) || null;

    app.innerHTML = `
    <div class="lcse-title-row">
      <div class="lcse-title-bar"></div>
      <h1 class="lcse-title">Soutenez les clubs sportifs engagés pour l'insertion par le sport</h1>
    </div>

    <section class="lcse-filters">
      <div class="lcse-filters-head">
        <button type="button" class="lcse-filters-toggle" data-action="toggle-filters" aria-expanded="${state.filtersOpen ? "true" : "false"}">
          <span class="lcse-filters-toggle-chevron ${state.filtersOpen ? "is-open" : ""}" aria-hidden="true"></span>
          <h2 class="lcse-filters-title">Filtres</h2>
        </button>
        <button type="button" class="lcse-reset-btn" data-action="reset">Réinitialiser</button>
      </div>
      <div class="lcse-filters-grid ${state.filtersOpen ? "" : "lcse-hidden"}">
        ${renderCombo("region", "Région", options.region, state.region, combo.region)}
        ${renderCombo("dept", "Département", options.dept, state.dept, combo.dept)}
        ${renderCombo("fede", "Fédération", options.fede, state.fede, combo.fede)}
        ${renderCombo("club", "Club", options.club, state.club, combo.club)}
      </div>
    </section>

    <p class="lcse-count">${countLabel}</p>

    ${list.length === 0 ? renderEmptyState() : `<div class="lcse-grid">${list.map(renderCard).join("")}</div>`}

    ${renderModal(openAction, state)}
  `;

    bindEvents();
  }

  // ---------------------------------------------------------------------
  // Événements
  // ---------------------------------------------------------------------

  function bindEvents() {
    app.querySelectorAll("[data-filter]").forEach((el) => {
      const key = el.getAttribute("data-filter");

      el.addEventListener("focus", () => {
        combo[key].open = true;
        combo[key].query = "";
        el.select();
        updateComboList(key);
      });

      el.addEventListener("input", () => {
        combo[key].query = el.value;
        updateComboList(key);
      });

      el.addEventListener("blur", () => {
        setTimeout(() => {
          combo[key].open = false;
          combo[key].query = "";
          render();
        }, 100);
      });

      el.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          combo[key].open = false;
          combo[key].query = "";
          el.blur();
        } else if (e.key === "Enter") {
          e.preventDefault();
          const options = getFilterOptions(actions, state)[key];
          const [first] = filterOptionsByQuery(options, combo[key].query);
          if (first !== undefined) selectFilterValue(key, first);
        }
      });
    });

    app.querySelectorAll("[data-combo-list]").forEach((listEl) => {
      const key = listEl.getAttribute("data-combo-list");
      // Empêche l'input de perdre le focus (et donc la liste de se fermer)
      // avant que le clic sur une option n'ait pu être traité.
      listEl.addEventListener("mousedown", (e) => e.preventDefault());
      listEl.addEventListener("click", (e) => {
        const li = e.target.closest("[data-value]");
        if (!li) return;
        selectFilterValue(key, li.getAttribute("data-value"));
      });
    });

    app.querySelectorAll('[data-action="reset"]').forEach((el) => {
      el.addEventListener("click", () => {
        state.region = ALL; state.dept = ALL; state.fede = ALL; state.club = ALL;
        FILTER_KEYS.forEach((key) => { combo[key].open = false; combo[key].query = ""; });
        render();
      });
    });

    app.querySelectorAll('[data-action="toggle-filters"]').forEach((el) => {
      el.addEventListener("click", () => {
        state.filtersOpen = !state.filtersOpen;
        render();
      });
    });

    app.querySelectorAll('[data-action="support"]').forEach((el) => {
      el.addEventListener("click", () => {
        state.openActionId = Number(el.getAttribute("data-id"));
        state.sent = false;
        state.submitError = "";
        render();
      });
    });

    app.querySelectorAll('[data-action="close"]').forEach((el) => {
      el.addEventListener("click", () => {
        state.openActionId = null;
        state.sent = false;
        state.submitError = "";
        render();
      });
    });

    const modalContent = app.querySelector(".modal-content");
    if (modalContent) modalContent.addEventListener("click", (e) => e.stopPropagation());

    const form = document.getElementById("lcse-support-form");
    if (form) form.addEventListener("submit", onSubmitForm);
  }

  // Ne met à jour que la liste déroulante d'un combobox (pas tout `app`),
  // pour ne pas faire perdre le focus/curseur de l'input pendant la frappe.
  function updateComboList(key) {
    const listEl = app.querySelector(`[data-combo-list="${key}"]`);
    const inputEl = document.getElementById(`lcse-filter-${key}`);
    if (!listEl || !inputEl) return;
    const options = getFilterOptions(actions, state)[key];
    listEl.innerHTML = comboOptionsHtml(options, combo[key].query, state[key]);
    listEl.classList.toggle("lcse-hidden", !combo[key].open);
    inputEl.setAttribute("aria-expanded", combo[key].open ? "true" : "false");
  }

  function selectFilterValue(key, value) {
    state[key] = value;
    if (key === "region") state.dept = ALL;
    combo[key].open = false;
    combo[key].query = "";
    render();
  }

  async function onSubmitForm(e) {
    e.preventDefault();
    const action = actions.find((a) => a.id === state.openActionId);
    if (!action) return;

    const data = new FormData(e.target);
    const montantRaw = data.get("montant");

    state.submitting = true;
    state.submitError = "";
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
          Montant: montantRaw ? Number(montantRaw) : null,
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
