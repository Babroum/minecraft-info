// priority: 70
// =============================================================================
// Third World UI - Écran : Bourse & Marché Mondial de l'ONU
// =============================================================================
// Interface financière officielle : cotations AMM en direct, filtration par
// commodités, distinction stricte entre terminaux informatifs et ordres d'exécution.
// =============================================================================

var ThirdWorldUI = ThirdWorldUI || {};

(function () {
    var ButtonClass = Java.loadClass('dev.ftb.mods.ftblibrary.ui.Button');
    var WidgetTypeClass = Java.loadClass('dev.ftb.mods.ftblibrary.ui.WidgetType');
    var CursorTypeClass = Java.loadClass('dev.ftb.mods.ftblibrary.ui.CursorType');
    var ContextMenuItemClass = Java.loadClass('dev.ftb.mods.ftblibrary.ui.ContextMenuItem');
    var ArrayListClass = Java.loadClass('java.util.ArrayList');
    var ComponentClass = Java.loadClass('net.minecraft.network.chat.Component');
    var MinecraftClass = Java.loadClass('net.minecraft.client.Minecraft');

    var BuiltInRegistriesClass = null;
    try {
        BuiltInRegistriesClass = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');
    } catch (e) { }

    // Catégories officielles des commodités
    var CATEGORIES = [
        { id: 'all', label: 'Toutes les commodités (15)', icon: 'minecraft:compass' },
        { id: 'minerals', label: 'Minerais & Matières Premières (7)', icon: 'minecraft:raw_iron' },
        { id: 'rares', label: 'Composants Avancés & Rares (7)', icon: 'minecraft:blaze_rod' },
        { id: 'strategic', label: 'Exclusivité Stratégique ONU (1)', icon: 'minecraft:netherite_upgrade_smithing_template' }
    ];

    var MINERAL_IDS = [
        'minecraft:sand',
        'minecraft:clay_ball',
        'minecraft:quartz',
        'minecraft:raw_iron',
        'minecraft:raw_copper',
        'minecraft:coal',
        'minecraft:redstone'
    ];

    var RARE_IDS = [
        'minecraft:glowstone_dust',
        'minecraft:obsidian',
        'minecraft:leather',
        'minecraft:slime_ball',
        'minecraft:ender_pearl',
        'minecraft:blaze_rod',
        'minecraft:ghast_tear'
    ];

    var STRATEGIC_IDS = [
        'minecraft:netherite_upgrade_smithing_template'
    ];

    /**
     * Compte le nombre d'unités d'un article dans l'inventaire du joueur local
     */
    function getPlayerItemCount(itemId) {
        try {
            var mc = MinecraftClass.getInstance();
            if (!mc || !mc.player) return 0;
            var inv = mc.player.getInventory ? mc.player.getInventory() : mc.player.inventory;
            if (!inv) return 0;

            var total = 0;
            var size = inv.getContainerSize ? inv.getContainerSize() : 36;
            for (var i = 0; i < size; i++) {
                var stack = inv.getItem(i);
                if (stack && !stack.isEmpty()) {
                    var sId = '';
                    if (BuiltInRegistriesClass && BuiltInRegistriesClass.ITEM && stack.getItem) {
                        var rl = BuiltInRegistriesClass.ITEM.getKey(stack.getItem());
                        sId = rl ? rl.toString() : '';
                    } else if (stack.getId) {
                        sId = String(stack.getId());
                    } else if (stack.id) {
                        sId = String(stack.id);
                    }
                    if (sId === itemId) {
                        var c = stack.getCount ? stack.getCount() : stack.count;
                        total += (c || 0);
                    }
                }
            }
            return total;
        } catch (e) {
            return 0;
        }
    }

    /**
     * Carte de commodité interactive sur-mesure (hauteur 28px, 2 lignes, bordures dynamiques)
     */
    function createCommodityCard(panel, item, inZone, onTrade) {
        var Colors = ThirdWorldUI.Theme.Colors;
        var isPrecious = (item.id.indexOf('netherite') !== -1 || item.id.indexOf('diamond') !== -1);
        var isOutOfStock = (item.currentStock <= 0);

        var nameColor = isPrecious ? '§6§l' : '§f§l';
        var itemIcon = ThirdWorldUI.Theme.resolveIcon(item.id);

        // Indicateur de tendance financier
        var cur = item.currentStock;
        var tgt = item.targetStock || cur;
        var trendBadge = '§e▬ Neutre';
        if (cur < tgt) {
            trendBadge = '§c▲ Forte demande';
        } else if (cur > tgt) {
            trendBadge = '§a▼ Excédent';
        }

        // Statut du stock
        var stockText = isOutOfStock
            ? '§4§l[RUPTURE]'
            : ('§7Stock : §f' + cur + '§8/§7' + tgt);

        var titleComp = ComponentClass.literal(nameColor + item.name + '   §8|   ' + trendBadge + '   §8|   ' + stockText);

        // Ligne de cotation
        var pricesComp = ComponentClass.literal(
            '§aAchat : §2§l' + item.buyPrice + ' R§7/u   §8|   §cVente : §4§l' + item.sellPrice + ' R§7/u   §8|   §7Lot : §f' + (item.lotSize || 16) + 'u'
        );

        var actionComp = ComponentClass.literal(inZone ? '§b[ Négocier ▶ ]' : '§8[ Consultation ]');
        var actionCompHover = ComponentClass.literal(inZone ? '§f§l[ Négocier ▶ ]' : '§7[ Consultation ]');

        try {
            var card = new JavaAdapter(ButtonClass, {
                onClicked: function (mBtn) {
                    if (onTrade) onTrade();
                },
                mousePressed: function (mBtn) {
                    if (this.isMouseOver()) {
                        this.playClickSound();
                        if (onTrade) onTrade();
                        return true;
                    }
                    return false;
                },
                getWidgetType: function () {
                    return this.isMouseOver() ? WidgetTypeClass.MOUSE_OVER : WidgetTypeClass.NORMAL;
                },
                getCursor: function () {
                    return inZone ? CursorTypeClass.HAND : CursorTypeClass.DEFAULT;
                },
                addMouseOverText: function (tooltipList) {
                    tooltipList.add(ComponentClass.literal((isPrecious ? '§6§l' : '§f§l') + item.name));
                    if (item.desc) {
                        tooltipList.add(ComponentClass.literal('§7' + item.desc));
                    }
                    tooltipList.add(ComponentClass.literal('§8──────────────────────────────'));
                    tooltipList.add(ComponentClass.literal('§a▲ Ordre d\'Achat : §2' + item.buyPrice + ' R §7par unité'));
                    tooltipList.add(ComponentClass.literal('§c▼ Ordre de Vente : §4' + item.sellPrice + ' R §7par unité'));
                    tooltipList.add(ComponentClass.literal('§7Taille standard de lot : §f' + (item.lotSize || 16) + ' unités'));
                    tooltipList.add(ComponentClass.literal('§7Réserve ONU : §f' + item.currentStock + ' §7sur §f' + item.targetStock + ' u (AMM)'));

                    var invCount = getPlayerItemCount(item.id);
                    tooltipList.add(ComponentClass.literal('§8──────────────────────────────'));
                    tooltipList.add(ComponentClass.literal('§eInventaire personnel : §f' + invCount + ' unité(s)'));

                    if (inZone) {
                        tooltipList.add(ComponentClass.literal('§b▶ Clic gauche pour émettre un ordre'));
                    } else {
                        tooltipList.add(ComponentClass.literal('§c✘ Négociation requise au complexe ONU (-204, -172)'));
                    }
                },
                draw: function (graphics, theme, x, y, w, h) {
                    var hovered = this.isMouseOver();

                    // Fond de la carte
                    var bg = hovered ? Colors.BG_CARD_HOVER : Colors.BG_CARD;
                    var border = hovered
                        ? (isPrecious ? Colors.BORDER_GOLD : Colors.BORDER_FOCUSED)
                        : (isPrecious ? Colors.BORDER_GOLD : Colors.DIVIDER);

                    bg.draw(graphics, x, y, w, h);
                    border.draw(graphics, x, y, w, 1);
                    border.draw(graphics, x, y + h - 1, w, 1);
                    border.draw(graphics, x, y + 1, 1, h - 2);
                    border.draw(graphics, x + w - 1, y + 1, 1, h - 2);

                    // Icône de l'article centrée verticalement
                    if (itemIcon && !itemIcon.isEmpty()) {
                        itemIcon.draw(graphics, x + 6, y + Math.floor((h - 16) / 2), 16, 16);
                    }

                    // Ligne 1 : Nom et badges
                    theme.drawString(graphics, titleComp, x + 28, y + 4);

                    // Ligne 2 : Cotations chiffrées
                    theme.drawString(graphics, pricesComp, x + 28, y + 15);

                    // Indicateur d'action à droite
                    var act = hovered ? actionCompHover : actionComp;
                    var actW = theme.getStringWidth(act);
                    theme.drawString(graphics, act, x + w - actW - 8, y + Math.floor((h - theme.getFontHeight()) / 2));
                }
            }, panel, titleComp, itemIcon);

            card.setHeight(28);
            card.customFilterText = item.name + ' ' + item.id + ' ' + (item.desc || '');
            return card;
        } catch (e) {
            console.error('[ThirdWorld UI] Erreur creation commodity card: ' + e);
            return null;
        }
    }

    /**
     * Ouvre l'écran principal de la Bourse
     */
    function openMarketScreen(marketData) {
        var screen = ThirdWorldUI.BaseScreen.create({
            id: 'onu_market',
            title: '🏛 BOURSE MONDIALE DE L\'ONU — COMMODITÉS',
            hasSearch: true,
            widthRatio: 0.85,
            heightRatio: 0.88,
            initialState: {
                data: marketData || {},
                selectedCategory: 'all'
            },
            populate: function (panel, self, state) {
                var payload = state.data || {};
                var inZone = (payload.inZone !== false);
                var cash = payload.playerCash || 0;
                var items = payload.items || [];
                var activeCat = state.selectedCategory || 'all';

                // =============================================================
                // 1. BANNIÈRE SUPÉRIEURE : TERMINAL OFFICIEL & SOLDE (NON-CLIQUABLE)
                // =============================================================
                var terminalTitle = inZone
                    ? '§a● TERMINAL OPÉRATIONNEL §8| §7Hub Central ONU §8(-204, -172) §8| §aOrdres autorisés'
                    : '§e● MODE CONSULTATION DISTANTE §8| §cTransactions désactivées hors Hub ONU';

                var terminalSubtitle = '§7Liquidités : §6§l' + ThirdWorldUI.Theme.formatCurrency(cash) +
                    '   §8|   §7Régulation : §fAMM Automatisée (Marge régulatrice 30%)';

                var banner = ThirdWorldUI.Widgets.banner(
                    panel,
                    terminalTitle,
                    terminalSubtitle,
                    inZone ? 'minecraft:lodestone' : 'minecraft:beacon',
                    inZone ? ThirdWorldUI.Theme.Colors.ACCENT_GREEN : ThirdWorldUI.Theme.Colors.ACCENT_ORANGE
                );
                if (banner) panel.add(banner);

                // =============================================================
                // 2. SÉLECTEUR DE CATÉGORIE INTERACTIF (BOUTON DE FILTRATION)
                // =============================================================
                var currentCatObj = CATEGORIES[0];
                for (var c = 0; c < CATEGORIES.length; c++) {
                    if (CATEGORIES[c].id === activeCat) {
                        currentCatObj = CATEGORIES[c];
                        break;
                    }
                }

                var catFilterBtn = ThirdWorldUI.Widgets.button(
                    panel,
                    '§7Catégorie affichée : §b§l' + currentCatObj.label + ' §8[ Clic pour filtrer ▾ ]',
                    currentCatObj.icon,
                    function () {
                        openCategoryMenu(self);
                    }
                );
                if (catFilterBtn) {
                    catFilterBtn.isPermanentHeader = true;
                    panel.add(catFilterBtn);
                }

                // =============================================================
                // 3. LISTE DES COMMODITÉS PAR CATÉGORIE
                // =============================================================
                var renderList = function (title, listItems) {
                    if (!listItems || listItems.length === 0) return;

                    if (activeCat === 'all') {
                        var div = ThirdWorldUI.Widgets.sectionDivider(panel, title);
                        if (div) panel.add(div);
                    }

                    for (var i = 0; i < listItems.length; i++) {
                        (function (item) {
                            var card = createCommodityCard(panel, item, inZone, function () {
                                openTransactionMenu(self, item, inZone);
                            });
                            if (card) panel.add(card);
                        })(listItems[i]);
                    }
                };

                // Tri des articles selon les 3 registres officiels
                var mineralItems = [];
                var rareItems = [];
                var strategicItems = [];

                for (var i = 0; i < items.length; i++) {
                    var it = items[i];
                    if (STRATEGIC_IDS.indexOf(it.id) !== -1) {
                        strategicItems.push(it);
                    } else if (RARE_IDS.indexOf(it.id) !== -1) {
                        rareItems.push(it);
                    } else {
                        mineralItems.push(it);
                    }
                }

                if (activeCat === 'all' || activeCat === 'minerals') {
                    renderList('§bMINERAIS & MATIÈRES PREMIÈRES (' + mineralItems.length + ')', mineralItems);
                }
                if (activeCat === 'all' || activeCat === 'rares') {
                    renderList('§dCOMPOSANTS AVANCÉS & ALCHIMIE (' + rareItems.length + ')', rareItems);
                }
                if (activeCat === 'all' || activeCat === 'strategic') {
                    renderList('§6EXCLUSIVITÉ SCELLÉE DE L\'ONU (' + strategicItems.length + ')', strategicItems);
                }
            }
        });

        if (screen) {
            screen.open();
        }
    }

    /**
     * Menu contextuel de sélection de catégorie
     */
    function openCategoryMenu(screen) {
        try {
            var menuItems = new ArrayListClass();
            for (var i = 0; i < CATEGORIES.length; i++) {
                (function (cat) {
                    menuItems.add(new ContextMenuItemClass(
                        ComponentClass.literal('§f' + cat.label),
                        ThirdWorldUI.Theme.resolveIcon(cat.icon),
                        function () {
                            screen.currentState.selectedCategory = cat.id;
                            screen.refreshUI();
                        }
                    ));
                })(CATEGORIES[i]);
            }
            screen.openContextMenu(menuItems);
        } catch (eCat) {
            console.error('[ThirdWorld UI] Erreur menu categories: ' + eCat);
        }
    }

    /**
     * Menu contextuel d'ordres de bourse (Achat / Vente avec quantités calculées)
     */
    function openTransactionMenu(screen, item, inZone) {
        if (!inZone) {
            ThirdWorldUI.Router.showToast('Accès Restreint', 'Présence requise au Hub ONU (-204, -172) pour commercer.', true);
            return;
        }

        try {
            var menuItems = new ArrayListClass();
            var stock = item.currentStock || 0;
            var lot = item.lotSize || 16;
            var invCount = getPlayerItemCount(item.id);

            // =============================================================
            // SECTION ACHAT
            // =============================================================
            if (stock <= 0) {
                menuItems.add(new ContextMenuItemClass(
                    ComponentClass.literal('§8[Rupture de Stock à l\'Achat]'),
                    ThirdWorldUI.Theme.resolveIcon('minecraft:barrier'),
                    function () { }
                ));
            } else {
                // Acheter 1x
                menuItems.add(new ContextMenuItemClass(
                    ComponentClass.literal('§a§l🛒 Acheter 1x §8(§f' + item.buyPrice + ' R§8)'),
                    ThirdWorldUI.Theme.resolveIcon(item.id),
                    function () {
                        ThirdWorldUI.Router.sendAction('action_onu_market', { action: 'buy', itemId: item.id, amount: 1 });
                    }
                ));

                // Acheter 1 Lot si applicable
                if (lot > 1 && stock >= lot) {
                    menuItems.add(new ContextMenuItemClass(
                        ComponentClass.literal('§a§l🛒 Acheter ' + lot + 'x §7(1 Lot) §8(§f' + (item.buyPrice * lot) + ' R§8)'),
                        ThirdWorldUI.Theme.resolveIcon(item.id),
                        function () {
                            ThirdWorldUI.Router.sendAction('action_onu_market', { action: 'buy', itemId: item.id, amount: lot });
                        }
                    ));
                }

                // Acheter 1 Pile (64x) si applicable
                if (stock >= 64 && lot !== 64) {
                    menuItems.add(new ContextMenuItemClass(
                        ComponentClass.literal('§a§l🛒 Acheter 64x §7(1 Pile) §8(§f' + (item.buyPrice * 64) + ' R§8)'),
                        ThirdWorldUI.Theme.resolveIcon(item.id),
                        function () {
                            ThirdWorldUI.Router.sendAction('action_onu_market', { action: 'buy', itemId: item.id, amount: 64 });
                        }
                    ));
                }
            }

            // =============================================================
            // SECTION VENTE
            // =============================================================
            // Vendre 1x
            var sell1Text = (invCount >= 1)
                ? ('§c§l📦 Vendre 1x §8(§a+' + item.sellPrice + ' R§8)')
                : ('§8📦 Vendre 1x (Aucun en inventaire)');

            menuItems.add(new ContextMenuItemClass(
                ComponentClass.literal(sell1Text),
                ThirdWorldUI.Theme.resolveIcon('minecraft:chest'),
                function () {
                    ThirdWorldUI.Router.sendAction('action_onu_market', { action: 'sell', itemId: item.id, amount: 1 });
                }
            ));

            // Vendre 1 Lot si applicable
            if (lot > 1) {
                var sellLotText = (invCount >= lot)
                    ? ('§c§l📦 Vendre ' + lot + 'x §7(1 Lot) §8(§a+' + (item.sellPrice * lot) + ' R§8)')
                    : ('§8📦 Vendre ' + lot + 'x (Lot incomplet : ' + invCount + '/' + lot + ')');

                menuItems.add(new ContextMenuItemClass(
                    ComponentClass.literal(sellLotText),
                    ThirdWorldUI.Theme.resolveIcon('minecraft:chest'),
                    function () {
                        ThirdWorldUI.Router.sendAction('action_onu_market', { action: 'sell', itemId: item.id, amount: lot });
                    }
                ));
            }

            // Vendre 64x si le joueur en a au moins 64
            if (invCount >= 64) {
                menuItems.add(new ContextMenuItemClass(
                    ComponentClass.literal('§c§l📦 Vendre 64x §7(1 Pile) §8(§a+' + (item.sellPrice * 64) + ' R§8)'),
                    ThirdWorldUI.Theme.resolveIcon('minecraft:chest'),
                    function () {
                        ThirdWorldUI.Router.sendAction('action_onu_market', { action: 'sell', itemId: item.id, amount: 64 });
                    }
                ));
            }

            // Vendre TOUT l'inventaire
            if (invCount > 1 && invCount !== lot && invCount !== 64) {
                menuItems.add(new ContextMenuItemClass(
                    ComponentClass.literal('§6§l📦 Vendre Tout §7(' + invCount + 'x) §8(§a+' + (item.sellPrice * invCount) + ' R§8)'),
                    ThirdWorldUI.Theme.resolveIcon('minecraft:chest'),
                    function () {
                        ThirdWorldUI.Router.sendAction('action_onu_market', { action: 'sell', itemId: item.id, amount: invCount });
                    }
                ));
            }

            screen.openContextMenu(menuItems);
        } catch (eCtx) {
            console.error('[ThirdWorld UI] Erreur ouverture ordres: ' + eCtx);
        }
    }

    /**
     * Écouteur réseau pour l'ouverture initiale et les rafraîchissements après transactions
     */
    function handleMarketPacket(event) {
        try {
            var data = event.data || event.getData();
            var jsonStr = data.getString ? data.getString('json') : String(data.get('json'));
            var payload = JSON.parse(jsonStr);

            var active = ThirdWorldUI.Router.getActiveScreen();
            if (active && active.type === 'onu_market' && active.instance) {
                // Mise à jour fluide en direct (stocks, cours, liquidités)
                active.instance.updateState({ data: payload });
            } else {
                openMarketScreen(payload);
            }
        } catch (e) {
            console.error('[ThirdWorld UI] Erreur réception paquet onu_market: ' + e);
        }
    }

    NetworkEvents.dataReceived('open_onu_market', handleMarketPacket);
    NetworkEvents.dataReceived('update_onu_market', handleMarketPacket);

    ThirdWorldUI.Screens = ThirdWorldUI.Screens || {};
    ThirdWorldUI.Screens.openMarketScreen = openMarketScreen;

    console.info('[ThirdWorld UI] Écran Bourse de l\'ONU (Version Formelle Propre) initialisé.');
})();
