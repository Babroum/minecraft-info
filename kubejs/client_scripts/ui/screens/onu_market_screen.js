// priority: 70
// =============================================================================
// Third World UI - Écran : Bourse & Marché Mondial de l'ONU
// =============================================================================

var ThirdWorldUI = ThirdWorldUI || {};

(function () {
    var ContextMenuItemClass = Java.loadClass('dev.ftb.mods.ftblibrary.ui.ContextMenuItem');
    var ArrayListClass = Java.loadClass('java.util.ArrayList');
    var ComponentClass = Java.loadClass('net.minecraft.network.chat.Component');

    var currentScreenInstance = null;

    function openMarketScreen(marketData) {
        var screen = ThirdWorldUI.BaseScreen.create({
            id: 'onu_market',
            title: '🏛 Bourse & Marché Mondial de l\'ONU',
            hasSearch: true,
            initialState: marketData || {},
            populate: function (panel, self, state) {
                currentScreenInstance = self;

                // 1. STATUT CONNEXION AU HUB ONU
                var inZone = (state && state.inZone !== false);
                if (inZone) {
                    var hubHeader = ThirdWorldUI.Widgets.button(
                        panel,
                        '§a§l✔ Connecté au Hub Central §7(-204, -172) | Transactions Immédiates',
                        'minecraft:lodestone',
                        function () { }
                    );
                    if (hubHeader) panel.add(hubHeader);
                } else {
                    var warnHeader = ThirdWorldUI.Widgets.button(
                        panel,
                        '§e§l📡 Mode Consultation Distante §7(Transactions requises au Hub -204, -172)',
                        'minecraft:beacon',
                        function () { }
                    );
                    if (warnHeader) panel.add(warnHeader);
                }

                // 2. PORTEFEUILLE DU JOUEUR
                var cash = (state && state.playerCash) || 0;
                var walletTitle = '§6§l💰 Portefeuille : §a§l' + ThirdWorldUI.Theme.formatCurrency(cash) + ' §7(Liquidités disponibles)';
                var walletBtn = ThirdWorldUI.Widgets.button(
                    panel,
                    walletTitle,
                    'minecraft:gold_ingot',
                    function () { }
                );
                if (walletBtn) panel.add(walletBtn);

                // 3. EN-TÊTE DU CATALOGUE
                var catHeader = ThirdWorldUI.Widgets.header(
                    panel,
                    'COURS DES COMMODITÉS MONDIALES',
                    'Clic gauche pour négocier un ordre',
                    'minecraft:compass'
                );
                if (catHeader) panel.add(catHeader);

                // 4. LISTE DES ARTICLES EN BOURSE
                var items = (state && state.items) || [];
                for (var i = 0; i < items.length; i++) {
                    (function (item) {
                        var isOutOfStock = (item.currentStock <= 0);
                        var isPrecious = (item.id.indexOf('netherite') !== -1 || item.id.indexOf('diamond') !== -1);

                        var titleColor = isPrecious ? '§6§l' : '§b§l';
                        var stockBadge = isOutOfStock
                            ? '§c[RUPTURE] '
                            : '§7(Stock: ' + item.currentStock + ') ';

                        var trendIndicator = (item.trendColor || '§7') + (item.trendText ? item.trendText.split(' ')[0] : '●') + ' ';
                        var pricesText = '§a▲ ' + item.buyPrice + ' R §8| §c▼ ' + item.sellPrice + ' R';

                        var fullTitle = titleColor + item.name + ' ' + stockBadge + '§8| ' + trendIndicator + pricesText;
                        var subtitle = 'Achat: §a' + item.buyPrice + ' R§7/u  -  Vente: §c' + item.sellPrice + ' R§7/u  -  Tendance: ' + (item.trendText || 'Stable');

                        var itemBtn = ThirdWorldUI.Widgets.card(
                            panel,
                            fullTitle,
                            subtitle,
                            item.id,
                            function (mouseBtn) {
                                openTransactionMenu(self, item, inZone);
                            }
                        );
                        if (itemBtn) panel.add(itemBtn);
                    })(items[i]);
                }
            }
        });

        if (screen) {
            screen.open();
        }
    }

    /**
     * Menu contextuel moderne d'achat et de vente d'un article
     */
    function openTransactionMenu(screen, item, inZone) {
        if (!inZone) {
            ThirdWorldUI.Router.showToast('Bourse ONU', 'Rendez-vous au Hub (-204, -172) pour commercer.', true);
            return;
        }

        try {
            var menuItems = new ArrayListClass();

            // Ordres d'achat
            menuItems.add(new ContextMenuItemClass(
                ComponentClass.literal('§a§l🛒 Acheter 1x §7(' + item.buyPrice + ' R)'),
                ThirdWorldUI.Theme.resolveIcon(item.id),
                function () {
                    ThirdWorldUI.Router.sendAction('action_onu_market', { action: 'buy', itemId: item.id, amount: 1 });
                }
            ));

            menuItems.add(new ContextMenuItemClass(
                ComponentClass.literal('§a§l🛒 Acheter 16x §7(' + (item.buyPrice * 16) + ' R)'),
                ThirdWorldUI.Theme.resolveIcon(item.id),
                function () {
                    ThirdWorldUI.Router.sendAction('action_onu_market', { action: 'buy', itemId: item.id, amount: 16 });
                }
            ));

            menuItems.add(new ContextMenuItemClass(
                ComponentClass.literal('§a§l🛒 Acheter 64x §7(' + (item.buyPrice * 64) + ' R)'),
                ThirdWorldUI.Theme.resolveIcon(item.id),
                function () {
                    ThirdWorldUI.Router.sendAction('action_onu_market', { action: 'buy', itemId: item.id, amount: 64 });
                }
            ));

            // Ordres de vente
            menuItems.add(new ContextMenuItemClass(
                ComponentClass.literal('§c§l📦 Vendre 1x §7(+' + item.sellPrice + ' R)'),
                ThirdWorldUI.Theme.resolveIcon('minecraft:chest'),
                function () {
                    ThirdWorldUI.Router.sendAction('action_onu_market', { action: 'sell', itemId: item.id, amount: 1 });
                }
            ));

            menuItems.add(new ContextMenuItemClass(
                ComponentClass.literal('§c§l📦 Vendre 16x §7(+' + (item.sellPrice * 16) + ' R)'),
                ThirdWorldUI.Theme.resolveIcon('minecraft:chest'),
                function () {
                    ThirdWorldUI.Router.sendAction('action_onu_market', { action: 'sell', itemId: item.id, amount: 16 });
                }
            ));

            menuItems.add(new ContextMenuItemClass(
                ComponentClass.literal('§c§l📦 Vendre 64x §7(+' + (item.sellPrice * 64) + ' R)'),
                ThirdWorldUI.Theme.resolveIcon('minecraft:chest'),
                function () {
                    ThirdWorldUI.Router.sendAction('action_onu_market', { action: 'sell', itemId: item.id, amount: 64 });
                }
            ));

            screen.openContextMenu(menuItems);
        } catch (eCtx) {
            console.error('[ThirdWorld UI] Erreur ouverture menu contextuel: ' + eCtx);
        }
    }

    // Écouteur réseau pour l'ouverture / rafraîchissement
    NetworkEvents.dataReceived('open_onu_market', function (event) {
        try {
            var data = event.data || event.getData();
            var jsonStr = data.getString ? data.getString('json') : String(data.get('json'));
            var payload = JSON.parse(jsonStr);

            var active = ThirdWorldUI.Router.getActiveScreen();
            if (active && active.type === 'onu_market' && active.instance) {
                // Mise à jour en direct sans clignotement
                active.instance.updateState(payload);
            } else {
                openMarketScreen(payload);
            }
        } catch (e) {
            console.error('[ThirdWorld UI] Erreur réception open_onu_market: ' + e);
        }
    });

    ThirdWorldUI.Screens = ThirdWorldUI.Screens || {};
    ThirdWorldUI.Screens.openMarketScreen = openMarketScreen;

    console.info('[ThirdWorld UI] Écran Bourse de l\'ONU initialisé.');
})();
