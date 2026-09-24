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

  // Id du bouton d'un onglet : sert au retour du focus après un rendu et
  // au lien d'évitement « Retour à l'onglet actif ».
  function tabButtonId(key) {
    return `lcse-tab-${key}`;
  }

  /**
   * Les deux onglets, avec le nombre d'actions que chacun contient sous
   * les filtres courants — pour qu'on sache ce qu'on trouvera en face
   * avant de cliquer.
   *
   * Balisage de l'exemple de code « Tabs · Défaut » du Design System :
   * une simple liste de boutons dans <nav role="presentation">, onglet
   * courant en .active + aria-current="true". Pas de role="tab" : ce motif
   * ARIA impose une navigation aux flèches que le DS ne prévoit pas, et le
   * déclarer sans elle trompe les lecteurs d'écran (RGAA 7.1).
   *
   * @param {Array<{key:string,label:string,shortLabel?:string}>} tabs
   * @param {string} activeKey
   * @param {Object<string,number>} counts nombre d'actions par clé d'onglet.
   */
  function renderTabs(tabs, activeKey, counts) {
    const items = tabs.map((t) => {
      const active = t.key === activeKey;
      const n = counts[t.key] || 0;
      return `
        <li class="nav-item">
          <button type="button" id="${tabButtonId(escapeHtml(t.key))}" class="nav-link${active ? " active" : ""}" data-tab="${escapeHtml(t.key)}"${active ? ' aria-current="true"' : ""}>
            <span class="nav-link-text">${t.shortLabel
              // Un seul des deux libellés est affiché (display), donc lu.
              ? `<span class="lcse-tab-label-long">${escapeHtml(t.label)}</span><span class="lcse-tab-label-short">${escapeHtml(t.shortLabel)}</span>`
              : escapeHtml(t.label)}&nbsp;(${n})</span>
          </button>
        </li>`;
    }).join("");

    return `
    <nav role="presentation" class="lcse-tabs">
      <ul class="nav nav-tabs">${items}
      </ul>
    </nav>`;
  }

  /**
   * Panneau de l'onglet actif (.tab-content > .tab-pane.active du DS). Un
   * seul panneau : son contenu est recalculé à chaque changement d'onglet.
   * Il se termine par le lien d'évitement de l'exemple de code du DS, qui
   * ramène le clavier à l'onglet actif après une longue liste.
   *
   * @param {string} activeKey
   * @param {string} contentHtml
   */
  function renderTabPane(activeKey, contentHtml) {
    const key = escapeHtml(activeKey);
    return `
    <div class="tab-content lcse-tab-content">
      <div class="tab-pane active" id="lcse-tab-${key}-content">
        ${contentHtml}
        <div class="position-relative">
          <a href="#${tabButtonId(key)}" class="skip-link sr-only sr-only-focusable" data-action="back-to-tab">Retour à l'onglet actif</a>
        </div>
      </div>
    </div>`;
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

  // Entête commune aux deux panneaux de la modale (formulaire, envoi
  // confirmé) : structure .modal-header du Design System, avec son bouton
  // de fermeture (présent sur toutes les démos Modal et Modal side du DS) :
  // on doit pouvoir quitter la modale autrement qu'en validant. Le titre
  // porte l'id visé par aria-labelledby.
  function renderModalHeader(title, kicker, meta) {
    return `
    <div class="modal-header lcse-modal-header">
      <div class="lcse-modal-heading">
        ${kicker ? `<p class="lcse-modal-kicker">${escapeHtml(kicker)}</p>` : ""}
        <h2 class="modal-title" id="lcse-modal-title">${escapeHtml(title)}</h2>
        ${meta ? `<p class="lcse-modal-meta">${escapeHtml(meta)}</p>` : ""}
      </div>
      <button type="button" id="lcse-modal-close" class="btn-ratio-square btn btn-reset close" data-action="close">
        <span aria-hidden="true" class="icon icon-close"></span>
        <span class="sr-only">Fermer la fenêtre</span>
      </button>
    </div>`;
  }

  function renderSentPanel(action) {
    return `
    ${renderModalHeader("Demande transmise")}
    <div class="modal-body lcse-sent-body">
      <p>La structure porteuse de « ${escapeHtml(action.intitule)} » vous répondra sous cinq jours ouvrés. Une copie de votre demande a été adressée au référent France Travail du territoire.</p>
    </div>
    <div class="modal-footer">
      <button type="button" id="lcse-sent-close" class="btn btn-secondary" data-action="close"><span class="btn-content">Fermer</span></button>
    </div>`;
  }

  // Champs du formulaire de soutien, dans l'ordre d'affichage (le même
  // que logic.SUPPORT_FIELDS). Balisage calqué sur les exemples de code
  // Input du Design System : Défaut, Aide (help), Erreur, Email, Téléphone,
  // Numérique et Append (unité accolée au champ).
  const SUPPORT_FORM_FIELDS = [
    { name: "prenom", label: "Prénom", required: true, attrs: 'autocomplete="given-name"' },
    { name: "nom", label: "Nom", required: true, attrs: 'autocomplete="family-name"' },
    { name: "organisation", label: "Organisation", required: true, attrs: 'autocomplete="organization"',
      help: "Entreprise, collectivité ou association qui apporte le soutien." },
    { name: "email", label: "Adresse électronique", required: true,
      attrs: 'type="email" autocomplete="email" autocapitalize="none" autocorrect="off"',
      help: "Exemple : nom@organisation.fr" },
    { name: "telephone", label: "Téléphone", attrs: 'type="tel" inputmode="tel" autocomplete="tel-national"',
      help: "Exemple : 0102030405" },
    { name: "montant", label: "Montant envisagé", unit: "€", unitSr: "en euros",
      attrs: 'type="text" inputmode="numeric"' },
    { name: "message", label: "Message", textarea: true, full: true,
      help: "Précisez la nature du soutien : financement, matériel, mécénat de compétences." },
  ];

  // Un champ du formulaire, avec son éventuel message d'erreur.
  //
  // Erreur (exemple Input · Erreur) : .has-error sur le groupe,
  // .is-invalid + aria-invalid sur le champ, message .invalid-feedback
  // préfixé de « Erreur : » pour les lecteurs d'écran, relié au champ par
  // aria-describedby — comme le message d'aide, qu'il précède.
  function renderSupportField(f, error) {
    const id = `f-${f.name}`;
    const errorId = `error-${id}`;
    const helpId = `help-${id}`;
    const describedBy = [error ? errorId : "", f.help ? helpId : ""].filter(Boolean).join(" ");
    const fieldAttrs = [
      `id="${id}"`,
      `name="${f.name}"`,
      `class="form-control${error ? " is-invalid" : ""}"`,
      f.attrs || "",
      f.required ? "required" : "",
      describedBy ? `aria-describedby="${describedBy}"` : "",
      error ? 'aria-invalid="true"' : "",
    ].filter(Boolean).join(" ");

    const control = f.textarea
      ? `<textarea ${fieldAttrs} rows="3"></textarea>`
      : `<input ${fieldAttrs}>`;

    return `
          <div class="form-group${f.full ? " lcse-form-full" : ""}${error ? " has-error" : ""}">
            <label class="form-label" for="${id}">${f.label}${f.unitSr ? `<span class="sr-only">&nbsp;${f.unitSr}</span>` : ""}${f.required ? '<span class="required">&nbsp;*</span>' : ""}</label>
            ${f.unit ? `<div class="input-group">
              ${control}
              <div class="input-group-append" aria-hidden="true"><span class="input-group-text">${f.unit}</span></div>
            </div>` : control}
            ${error ? `<p class="help-block invalid-feedback" id="${errorId}"><span class="sr-only">Erreur&nbsp;:&nbsp;</span>${escapeHtml(error)}</p>` : ""}
            ${f.help ? `<p class="help-block" id="${helpId}">${f.help}</p>` : ""}
          </div>`;
  }

  // uiState: { submitting: boolean, submitError: string,
  //            fieldErrors: { [champ]: message } }
  //
  // Les champs sont groupés par paires (.lcse-form-grid) : deux colonnes,
  // pour que la modale tienne sans ascenseur ; une seule sur mobile.
  // L'ordre du HTML reste l'ordre de lecture dans les deux cas.
  //
  // novalidate : les erreurs sont affichées par le widget au format du
  // Design System, pas par les bulles du navigateur. Les attributs
  // required restent, pour que les lecteurs d'écran annoncent le caractère
  // obligatoire.
  //
  // L'alerte d'échec d'envoi est toujours présente, masquée et vide : main.js
  // y écrit le message après le rendu. Une zone role="alert" créée avec son
  // texte déjà dedans n'est pas annoncée par tous les lecteurs d'écran.
  function renderFormPanel(action, uiState) {
    const fieldErrors = uiState.fieldErrors || {};
    return `
    ${renderModalHeader(action.intitule, "Soutenir une action", `${action.villeLabel} · ${action.federationLabel}`)}
    <form id="lcse-support-form" novalidate>
      <div class="modal-body lcse-form-body">
        <p class="lcse-form-note">Les champs marqués d'un <span class="required">*</span> sont obligatoires.</p>
        <div class="alert alert-error lcse-submit-alert" id="lcse-submit-alert" role="alert" hidden>
          <div class="alert-body"><p class="alert-content" id="lcse-submit-alert-text"></p></div>
        </div>
        <div class="lcse-form-grid">
          ${SUPPORT_FORM_FIELDS.map((f) => renderSupportField(f, fieldErrors[f.name])).join("")}
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" id="lcse-cancel" class="btn btn-secondary" data-action="close"><span class="btn-content">Annuler</span></button>
        ${uiState.submitting
          // Bouton avec spinner (exemple Button · Loader). aria-disabled
          // plutôt que disabled : le bouton garde le focus pendant l'envoi.
          ? `<button type="submit" id="lcse-submit" class="btn btn-primary" aria-disabled="true"><span class="btn-content">Envoi en cours</span><ft-spinner class="icon" label="Envoi en cours" size="xs"></ft-spinner></button>`
          : `<button type="submit" id="lcse-submit" class="btn btn-primary"><span class="btn-content">Envoyer</span></button>`}
      </div>
    </form>`;
  }

  // action: l'action ouverte, ou null si la modale est fermée.
  function renderModal(action, uiState) {
    const open = !!action;
    return `
    <div class="modal-backdrop ${open ? "show" : ""}" data-action="close" ${open ? "" : "hidden"}></div>
    <div class="modal lcse-modal ${open ? "show" : ""}" role="dialog" aria-modal="true" aria-labelledby="lcse-modal-title" tabindex="-1" ${open ? "" : "hidden"}>
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
    renderTabPane,
    tabButtonId,
    renderLoadMore,
    renderCombo,
    comboOptionsHtml,
    renderModal,
    renderSentPanel,
    renderFormPanel,
    renderSupportField,
    SUPPORT_FORM_FIELDS,
  };
});
