// priority: 70
// =============================================================================
// Third World UI - Écran : Marchés Publics & Approvisionnement Mondial ONU
// =============================================================================

var ThirdWorldUI = ThirdWorldUI || {};

(function() {
    function openContractsScreen(payload) {
        var screen = ThirdWorldUI.BaseScreen.create({
            id: 'onu_contracts',
            title: '🌐 Marchés Publics de l\'ONU',
            hasSearch: false,
            initialState: payload || {},
            populate: function(panel, self, state) {
                var contract = state || {};

                // 1. STATUT DU CONTRAT
                var isCompleted = (contract.status === 'COMPLETED');
                var statusBadge = isCompleted 
                    ? '§a§l✔ REMPORTÉ §7(Rotation dans: ' + (contract.timeLeft || 'bientôt') + ')' 
                    : '§e§l⏳ EN COURS §7(Temps restant: ' + (contract.timeLeft || '3h') + ')';

                var headerBtn = ThirdWorldUI.Widgets.button(
                    panel,
                    statusBadge,
                    isCompleted ? 'minecraft:emerald' : 'minecraft:clock',
                    function() {}
                );
                if (headerBtn) panel.add(headerBtn);

                // 2. CARTE PRINCIPALE DE L'APPEL D'OFFRES
                var mainTitle = '§6§l' + (contract.title || 'Plan Mondial d\'Approvisionnement');
                var totalReward = (contract.nationReward || 0) + (contract.driverCut || 0);
                var rewardsText = 'Prime Nation : §a' + ThirdWorldUI.Theme.formatCurrency(contract.nationReward || 0) + 
                    '  §8|  §ePrime Livreur : §f' + ThirdWorldUI.Theme.formatCurrency(contract.driverCut || 0) +
                    '\n§7Contexte : ' + (contract.lore || 'Approvisionnement stratégique requis.');

                var mainCard = ThirdWorldUI.Widgets.card(
                    panel,
                    mainTitle,
                    rewardsText,
                    'minecraft:writable_book',
                    function() {}
                );
                if (mainCard) panel.add(mainCard);

                // 3. CARGAISON REQUISE
                var itemsHeader = ThirdWorldUI.Widgets.header(
                    panel,
                    'CARGAISON REQUISE (LIVRAISON EN -204, -172)',
                    'Matériaux demandés pour honorer la commande',
                    'minecraft:chest'
                );
                if (itemsHeader) panel.add(itemsHeader);

                var items = contract.items || [];
                var allReady = true;

                if (items.length === 0) {
                    var noItem = ThirdWorldUI.Widgets.card(panel, '§7Aucun article spécifié', 'En attente de la prochaine rotation.', 'minecraft:barrier', function() {});
                    if (noItem) panel.add(noItem);
                } else {
                    for (var i = 0; i < items.length; i++) {
                        (function(it) {
                            var current = it.current || 0;
                            var needed = it.count || 1;
                            var isFull = (current >= needed);
                            if (!isFull) allReady = false;

                            var itemTitle = (isFull ? '§a✔ ' : '§c✘ ') + '§f§l' + it.name + ' §7(' + current + '/' + needed + ' dans votre sac)';
                            var progressBar = ThirdWorldUI.Widgets.progressBar(current, needed, 12);

                            var itemCard = ThirdWorldUI.Widgets.card(
                                panel,
                                itemTitle,
                                progressBar,
                                it.id,
                                function() {}
                            );
                            if (itemCard) panel.add(itemCard);
                        })(items[i]);
                    }
                }

                // 4. BOUTON D'ACTION DE LIVRAISON DIRECTE
                if (!isCompleted) {
                    var actHeader = ThirdWorldUI.Widgets.header(
                        panel,
                        'DOUANE & EXPÉDITION',
                        'Valider la livraison auprès des officiers',
                        'minecraft:hopper'
                    );
                    if (actHeader) panel.add(actHeader);

                    var deliverBtn = ThirdWorldUI.Widgets.button(
                        panel,
                        allReady ? '§a§l📦 LIVRER LA CARGAISON COMPLÈTE §7(Encaisser la prime)' : '§e§l📦 Tenter la livraison des marchandises',
                        'minecraft:ender_chest',
                        function() {
                            ThirdWorldUI.Router.sendAction('action_onu_contract', { action: 'deliver' });
                            screen.closeGui();
                        }
                    );
                    if (deliverBtn) panel.add(deliverBtn);
                }
            }
        });

        if (screen) {
            screen.open();
        }
    }

    NetworkEvents.dataReceived('open_onu_contracts', function(event) {
        try {
            var data = event.data || event.getData();
            var jsonStr = data.getString ? data.getString('json') : String(data.get('json'));
            var payload = JSON.parse(jsonStr);

            var active = ThirdWorldUI.Router.getActiveScreen();
            if (active && active.type === 'onu_contracts' && active.instance) {
                active.instance.updateState(payload);
            } else {
                openContractsScreen(payload);
            }
        } catch (e) {
            console.error('[ThirdWorld UI] Erreur réception open_onu_contracts: ' + e);
        }
    });

    ThirdWorldUI.Screens = ThirdWorldUI.Screens || {};
    ThirdWorldUI.Screens.openContractsScreen = openContractsScreen;

    console.info('[ThirdWorld UI] Écran Marchés Publics ONU initialisé.');
})();
