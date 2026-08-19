import { groupOf, droneCount, reorderWithinGroup, ownerColorOf, injuryOf } from '../helpers/combat-groups.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ApplicationV2 } = foundry.applications.api;

/**
 * Optional floating combat-order bar (see the `combatCarouselEnabled`
 * world setting): Marines act first and drag-reorder freely, unique
 * hostiles ("Others" — any non-XENO NPC) get their own card. The Xenos
 * faction sits in one divider block that mixes named types (Warrior,
 * Pretorian, Breeder, Alpha, Custom) as their own draggable cards alongside
 * one symbolic card for the anonymous Drone swarm with a live headcount.
 * Singleton at `xdz.apps.combatCarousel`, shown whenever `game.combat`
 * exists and the setting is on.
 */
export default class CombatCarousel extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'xdz-combat-carousel',
    classes: ['xdz', 'combat-carousel'],
    window: { frame: false, positioned: false },
    actions: {
      prev: CombatCarousel._onPrev,
      next: CombatCarousel._onNext,
    },
  };

  static PARTS = {
    carousel: { template: 'systems/xdz/templates/apps/combat-carousel.hbs' },
  };

  /** Open/close to match the setting + whether a combat is active. */
  syncVisibility(enabled = game.settings.get('xdz', 'combatCarouselEnabled')) {
    if (enabled && game.combat) return this.render(true);
    return this.close();
  }

  /** @override */
  async _prepareContext(options) {
    const combat = game.combat;
    if (!combat) return { hasCombat: false };

    const turns = combat.turns;
    const currentId = combat.combatant?.id;
    // `turns` is already clustered Marines -> Others -> named Xenos -> Drone
    // in manual-order (see XDZCombat#_sortCombatants), matching the carousel's
    // own group order 1:1 — so each combatant's index here doubles as its
    // position for "has this turn already happened this round" (index < the
    // active combatant's index).
    const currentTurn = combat.turn ?? 0;
    const turnIndexOf = new Map(turns.map((c, i) => [c.id, i]));
    const mapCard = (canDragFn) => (c) => ({
      id: c.id,
      name: c.name,
      img: c.img ?? c.actor?.img ?? 'icons/svg/mystery-man.svg',
      active: c.id === currentId,
      acted: turnIndexOf.get(c.id) < currentTurn,
      canDrag: canDragFn(c),
      ownerColor: ownerColorOf(c),
    });

    const marineCard = mapCard((c) => game.user.isGM || !!c.actor?.isOwner);
    const marines = turns
      .filter((c) => groupOf(c) === 'marines')
      .map((c) => ({ ...marineCard(c), injury: injuryOf(c) }));
    const others = turns.filter((c) => groupOf(c) === 'others').map(mapCard(() => game.user.isGM));
    const xenosUnique = turns.filter((c) => groupOf(c) === 'xenos-unique').map(mapCard(() => game.user.isGM));
    const droneCombatants = turns.filter((c) => groupOf(c) === 'xenos-drone');

    const gmOnly = game.settings.get('xdz', 'playWithGM');
    const position = game.settings.get('xdz', 'carouselPosition');
    const vertical = position === 'left' || position === 'right' || position === 'sidebar';
    const limit = vertical ? 10 : 15;
    // Vertical: every group (Marines, Others, Xenos) always splits into at
    // most 2 columns (however tall) so the strip stays narrow instead of
    // sprawling into 3+ thin columns, or one group towering over the rest.
    // Horizontal: Others + Xenos never wrap, so whatever's left of the
    // total cap is what Marines gets before it breaks a new row — that's
    // what makes the cap apply to the whole bar, not per group.
    const xenosReserved = xenosUnique.length + (droneCombatants.length ? 1 : 0);
    const marineLimit = vertical
      ? Math.max(1, Math.ceil(marines.length / 2))
      : Math.max(1, limit - others.length - xenosReserved);
    const otherLimit = vertical ? Math.max(1, Math.ceil(others.length / 2)) : others.length || 1;

    const xenosCards = [...xenosUnique];
    if (droneCombatants.length) {
      xenosCards.push({
        isDrone: true,
        active: droneCombatants.some((c) => c.id === currentId),
        // Block acts as one atomic turn (see _advance) — "acted" tracks off
        // its first member's index, same as everything else acting as a unit.
        acted: turnIndexOf.get(droneCombatants[0].id) < currentTurn,
        count: String(droneCount(combat)).padStart(3, '0'),
        img: droneCombatants[0]?.img ?? 'icons/svg/skull.svg',
      });
    }
    const xenosLimit = vertical ? Math.max(1, Math.ceil(xenosCards.length / 2)) : xenosCards.length || 1;

    return {
      hasCombat: true,
      marineRows: CombatCarousel._chunk(marines, marineLimit),
      otherRows: CombatCarousel._chunk(others, otherLimit),
      xenosRows: CombatCarousel._chunk(xenosCards, xenosLimit),
      hasXenosGroup: xenosCards.length > 0,
      canAdvance: game.user.isGM || !gmOnly,
      position,
      theme: game.settings.get('xdz', 'sheetTheme'),
    };
  }

  /** Split into rows/columns of at most `size` so a group only breaks a new line once it actually exceeds the view cap. */
  static _chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  /** Embed inside `#sidebar` when the position setting is `sidebar` instead of floating at the body level (default AppV2 behavior); moves back to `body` if the setting changes away from it. */
  async _insertElement(element, options) {
    const position = game.settings.get('xdz', 'carouselPosition');
    const target = (position === 'sidebar' && document.getElementById('sidebar')) || document.body;
    const existing = document.getElementById(element.id);
    if (existing && existing !== element) existing.replaceWith(element);
    if (element.parentElement !== target) target.append(element);
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this.element.dataset.position = context.position ?? 'bottom';
    this.element.dataset.theme = context.theme ?? 'green';
    if (context.position === 'right') {
      this._syncSidebarOffset();
      this._observeSidebar();
    }
    this.element.querySelectorAll('.xdz-carousel-card[draggable="true"]').forEach((card) => {
      card.addEventListener('dragstart', CombatCarousel._onDragStart);
      card.addEventListener('dragover', CombatCarousel._onDragOver);
      card.addEventListener('drop', CombatCarousel._onDrop);
    });
    this.element.querySelectorAll('.xdz-carousel-card[data-combatant-id]').forEach((card) => {
      card.addEventListener('click', CombatCarousel._onCardClick);
      card.addEventListener('dblclick', CombatCarousel._onCardDblClick);
    });
  }

  /** Watch the sidebar's own width so `right` anchoring tracks its collapsed/expanded state (and its collapse animation) live. */
  _observeSidebar() {
    if (this._sidebarObserver) return;
    const sidebar = document.querySelector('#sidebar');
    if (!sidebar) return;
    this._sidebarObserver = new ResizeObserver(() => this._syncSidebarOffset());
    this._sidebarObserver.observe(sidebar);
  }

  _syncSidebarOffset() {
    const sidebar = document.querySelector('#sidebar');
    const width = sidebar ? Math.ceil(sidebar.getBoundingClientRect().width) : 0;
    this.element.style.setProperty('--xdz-sidebar-offset', `${width + 12}px`);
  }

  /** @override */
  async close(options) {
    this._sidebarObserver?.disconnect();
    this._sidebarObserver = null;
    return super.close(options);
  }

  static _onDragStart(event) {
    event.dataTransfer.setData('text/plain', event.currentTarget.dataset.combatantId);
    event.dataTransfer.effectAllowed = 'move';
  }

  static _onDragOver(event) {
    if (!event.dataTransfer.types.includes('text/plain')) return;
    event.preventDefault();
  }

  static async _onDrop(event) {
    event.preventDefault();
    const card = event.currentTarget;
    const draggedId = event.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === card.dataset.combatantId) return;
    const position = card.closest('.xdz.combat-carousel')?.dataset.position ?? 'bottom';
    const vertical = position === 'left' || position === 'right' || position === 'sidebar';
    const rect = card.getBoundingClientRect();
    const placeAfter = vertical
      ? event.clientY - rect.top > rect.height / 2
      : event.clientX - rect.left > rect.width / 2;
    await reorderWithinGroup(game.combat, draggedId, card.dataset.combatantId, placeAfter);
  }

  /** Click a card to pan the canvas to its token and ping it (no permission gate — just a viewport aid). */
  static _onCardClick(event) {
    const combat = game.combat;
    if (!combat) return;
    const id = event.currentTarget.dataset.combatantId;
    const token = combat.combatants.get(id)?.token?.object;
    if (!token) return;
    canvas.animatePan({ x: token.center.x, y: token.center.y });
    canvas.ping({ x: token.center.x, y: token.center.y }, { style: 'pulse', size: 400, rings: 5, duration: 1600, color2: '#00faff' });
  }

  /** Double-click a card to jump the turn tracker straight to it (same permission as Prev/Next). */
  static async _onCardDblClick(event) {
    const combat = game.combat;
    if (!combat) return;
    const gmOnly = game.settings.get('xdz', 'playWithGM');
    if (gmOnly && !game.user.isGM) return;

    const id = event.currentTarget.dataset.combatantId;
    const index = combat.turns.findIndex((c) => c.id === id);
    if (index === -1 || index === combat.turn) return;
    await combat.update({ turn: index });
  }

  static async _onPrev() {
    await this._advance(-1);
  }

  static async _onNext() {
    await this._advance(1);
  }

  /** Step one turn; while sitting on the collapsed Drone swarm block, jump straight over/back the whole thing instead of per-Drone stepping. */
  async _advance(direction) {
    const combat = game.combat;
    if (!combat) return;
    const gmOnly = game.settings.get('xdz', 'playWithGM');
    if (gmOnly && !game.user.isGM) return;

    const current = combat.combatant;
    if (current && groupOf(current) === 'xenos-drone') {
      if (direction === 1) return combat.nextRound();
      return this._jumpToLastNonDroneTurn(combat);
    }
    return direction === 1 ? combat.nextTurn() : combat.previousTurn();
  }

  async _jumpToLastNonDroneTurn(combat) {
    const turns = combat.turns;
    for (let i = (combat.turn ?? 0) - 1; i >= 0; i--) {
      if (groupOf(turns[i]) !== 'xenos-drone') return combat.update({ turn: i });
    }
    return combat.previousRound();
  }
}
