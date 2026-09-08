/*
 * Fabriques de HTML (chaînes de caractères) pour le widget. Fonctions
 * pures : elles reçoivent en paramètre tout ce dont elles ont besoin
 * (données + état d'affichage) et ne lisent aucune variable globale — donc
 * testables sous Node (test/render.test.js) en comparant simplement les
 * chaînes produites.
 *
 * Même mécanique de chargement isomorphe que logic.js : global
 * `window.LCSE` dans le navigateur, `module.exports` sous Node.
 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(require("./logic.js"));
  } else {
    root.LCSE = Object.assign(root.LCSE || {}, factory(root.LCSE));
  }
})(typeof window !== "undefined" ? window : globalThis, function (logic) {
  "use strict";

  const { escapeHtml, filterOptionsByQuery } = logic;

  function renderEmptyState() {
    return `
    <div class="alert alert-info" role="status">
      <div class="alert-body">
        <p class="alert-title">Aucune action sur ce périmètre</p>
        <p class="alert-content">Élargissez la sélection pour voir les actions des territoires voisins.</p>
      </div>
    </div>`;
  }

  function renderCard(a) {
    return `
    <article class="lcse-card">
      <div class="lcse-card-body">
        <div class="lcse-card-top">
          <div class="lcse-card-heading">
            <p class="lcse-card-date">${escapeHtml(a.dateLabel)}</p>
            <h2 class="lcse-card-title">${escapeHtml(a.intitule)}</h2>
          </div>
          ${a.photoUrl ? `<div class="lcse-card-photo"><img src="${escapeHtml(a.photoUrl)}" alt="" loading="lazy" decoding="async" onerror="this.closest('.lcse-card-photo').remove()"></div>` : ""}
        </div>

        <p class="lcse-card-club">${escapeHtml(a.clubLabel)}</p>

        <dl class="lcse-card-meta">
          <div>
            <dt>Ville</dt>
            <dd>${escapeHtml(a.villeLabel)}</dd>
          </div>
          <div>
            <dt>Fédération</dt>
            <dd>${escapeHtml(a.federationLabel)}</dd>
          </div>
          <div>
            <dt>Participants</dt>
            <dd>${escapeHtml(a.participantsLabel)}</dd>
          </div>
          <div>
            <dt>Public</dt>
            <dd>${escapeHtml(a.publicLabel)}</dd>
          </div>
        </dl>

        <div class="lcse-card-footer">
          <div class="lcse-card-progress">
            <p class="progress-label"><span>${escapeHtml(a.collecteLabel)}</span></p>
            <div class="progress"><div class="progress-bar" style="width:${a.pct}%"></div></div>
          </div>
          ${a.financee
            // Proposer de cofinancer une action déjà bouclée n'a pas de
            // sens : le bouton laisse place à la mention du résultat.
            ? `<p class="lcse-card-financed">Financée à 100 %</p>`
            // Libellé court pour laisser la place à la jauge ; aria-label
            // redonne le contexte aux lecteurs d'écran, qui annoncent
            // souvent les boutons hors de leur carte.
            : `<button type="button" class="btn btn-primary" data-action="support" data-id="${a.id}" aria-label="Soutenir cette action : ${escapeHtml(a.intitule)}">Soutenir</button>`}
        </div>
      </div>
    </article>`;
  }

  /**
   * Les deux onglets, avec le nombre d'actions que chacun contient sous
   * les filtres courants — pour qu'on sache ce qu'on trouvera en face
   * avant de cliquer.
   *
   * Classes du Design System France Travail (.nav-tabs/.nav-item/.nav-link),
   * dont l'état actif s'accroche à [aria-current=page]. On garde en plus le
   * couple role="tab"/aria-selected, sémantiquement correct pour des
   * onglets qui filtrent une liste en place sans navigation : aria-current
   * ne sert ici qu'à déclencher l'apparence du Design System.
   *
   * @param {Array<{key:string,label:string}>} tabs
   * @param {string} activeKey
   * @param {Object<string,number>} counts nombre d'actions par clé d'onglet.
   */
  function renderTabs(tabs, activeKey, counts) {
    const items = tabs.map((t) => {
      const active = t.key === activeKey;
      const n = counts[t.key] || 0;
      return `
        <li class="nav-item" role="presentation">
          <button
            type="button"
            class="nav-link"
            role="tab"
            data-tab="${escapeHtml(t.key)}"
            aria-selected="${active ? "true" : "false"}"
            ${active ? 'aria-current="page"' : ""}
          >
            <span class="nav-link-text">${escapeHtml(t.label)} (${n})</span>
          </button>
        </li>`;
    }).join("");

    return `<ul class="nav-tabs lcse-tabs" role="tablist">${items}</ul>`;
  }

  /**
   * Pied de liste : rappel du nombre d'actions affichées et bouton
   * d'ajout du lot suivant. Rien n'est rendu quand tout est déjà affiché.
   *
   * @param {{shown:number, total:number, remaining:number, nextBatch:number}} p
   *   tel que renvoyé par logic.paginate.
   */
  function renderLoadMore(p) {
    if (p.remaining <= 0) return "";
    const actionsWord = p.nextBatch === 1 ? "action" : "actions";
    return `
    <div class="lcse-more">
      <p class="lcse-more-info">${p.shown} actions affichées sur ${p.total}</p>
      <button type="button" class="btn btn-secondary" data-action="load-more">
        Charger ${p.nextBatch} ${actionsWord} de plus
      </button>
    </div>`;
  }

  // combo: { open: boolean, query: string } — état transitoire du champ de
  // recherche (voir main.js). selectedValue: la valeur retenue pour ce filtre.
  function comboOptionsHtml(options, query, selectedValue) {
    const filtered = filterOptionsByQuery(options, query);
    if (!filtered.length) {
      return `<li class="lcse-combo-empty" role="presentation">Aucun résultat</li>`;
    }
    return filtered
      .map((opt) => `<li role="option" data-value="${escapeHtml(opt)}" class="lcse-combo-option ${opt === selectedValue ? "is-selected" : ""}">${escapeHtml(opt)}</li>`)
      .join("");
  }

  function renderCombo(key, label, options, selectedValue, combo) {
    const query = combo.open ? combo.query : "";
    return `
    <div class="form-group lcse-combo">
      <label class="form-label" for="lcse-filter-${key}">${label}</label>
      <div class="lcse-combo-wrap">
        <input
          id="lcse-filter-${key}"
          class="form-control"
          type="text"
          autocomplete="off"
          role="combobox"
          aria-expanded="${combo.open ? "true" : "false"}"
          aria-autocomplete="list"
          data-filter="${key}"
          value="${escapeHtml(combo.open ? combo.query : selectedValue)}"
        >
        <ul class="lcse-combo-list ${combo.open ? "" : "lcse-hidden"}" data-combo-list="${key}" role="listbox">
          ${comboOptionsHtml(options, query, selectedValue)}
        </ul>
      </div>
    </div>`;
  }

  function renderSentPanel(action) {
    return `
    <div class="modal-body lcse-sent-body">
      <h3>Demande transmise</h3>
      <p>La structure porteuse de « ${escapeHtml(action.intitule)} » vous répondra sous cinq jours ouvrés. Une copie de votre demande a été adressée au référent France Travail du territoire.</p>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" data-action="close">Fermer</button>
    </div>`;
  }

  // uiState: { submitting: boolean, submitError: string }
  function renderFormPanel(action, uiState) {
    return `
    <div class="lcse-modal-header">
      <p class="lcse-modal-kicker">Soutenir une action</p>
      <h3 class="modal-title">${escapeHtml(action.intitule)}</h3>
      <p class="lcse-modal-meta">${escapeHtml(action.villeLabel)} · ${escapeHtml(action.federationLabel)}</p>
    </div>
    <form id="lcse-support-form">
      <div class="modal-body lcse-form-body">
        ${uiState.submitError ? `<div class="alert alert-error" role="alert"><div class="alert-body"><p class="alert-content">${escapeHtml(uiState.submitError)}</p></div></div>` : ""}
        <div class="form-group">
          <label class="form-label" for="f-organisation">Organisation</label>
          <input id="f-organisation" name="organisation" class="form-control" placeholder="Nom du financeur" required>
        </div>
        <div class="lcse-modal-row">
          <div class="form-group">
            <label class="form-label" for="f-prenom">Prénom</label>
            <input id="f-prenom" name="prenom" class="form-control" placeholder="Prénom" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="f-nom">Nom</label>
            <input id="f-nom" name="nom" class="form-control" placeholder="Nom" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="f-email">Adresse électronique</label>
          <input id="f-email" name="email" type="email" class="form-control" placeholder="nom@organisation.fr" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="f-telephone">Téléphone</label>
          <input id="f-telephone" name="telephone" type="tel" class="form-control" placeholder="06 12 34 56 78">
        </div>
        <div class="form-group">
          <label class="form-label" for="f-montant">Montant envisagé (facultatif)</label>
          <input id="f-montant" name="montant" type="number" min="0" step="1" class="form-control" placeholder="en euros">
        </div>
        <div class="form-group">
          <label class="form-label" for="f-message">Message</label>
          <textarea id="f-message" name="message" class="form-control" rows="4" placeholder="Précisez la nature du soutien : financement, matériel, mécénat de compétences."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-action="close">Annuler</button>
        <button type="submit" class="btn btn-primary" ${uiState.submitting ? "disabled" : ""}>${uiState.submitting ? "Envoi…" : "Envoyer"}</button>
      </div>
    </form>`;
  }

  // action: l'action ouverte, ou null si la modale est fermée.
  function renderModal(action, uiState) {
    const open = !!action;
    return `
    <div class="modal-backdrop ${open ? "show" : ""}" data-action="close" ${open ? "" : "hidden"}></div>
    <div class="modal lcse-modal ${open ? "show" : ""}" tabindex="-1" ${open ? "" : "hidden"}>
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
        <div class="modal-content">
          ${!open ? "" : uiState.sent ? renderSentPanel(action) : renderFormPanel(action, uiState)}
        </div>
      </div>
    </div>`;
  }

  return {
    renderEmptyState,
    renderCard,
    renderTabs,
    renderLoadMore,
    renderCombo,
    comboOptionsHtml,
    renderModal,
    renderSentPanel,
    renderFormPanel,
  };
});
