// priority: 70
// =============================================================================
// Third World UI - Écran : Registre de Guerre & Sièges Actifs
// =============================================================================

var ThirdWorldUI = ThirdWorldUI || {};

(function() {
    function openWarScreen(payload) {
        var screen = ThirdWorldUI.BaseScreen.create({
            id: 'war_registry',
            title: '⚔ Registre Militaire & Sièges',
            hasSearch: false,
            initialState: payload || {},
            populate: function(panel, self, state) {
                var wars = state.wars || [];
                var sieges = state.sieges || [];

                // 1. STATUT GÉNÉRAL
                var totalConflicts = wars.length + sieges.length;
                var globalStatus = (totalConflicts > 0)
                    ? '§c§lALERTE GUERRE : ' + totalConflicts + ' opération(s) militaire(s) active(s)'
                    : '§a§lPAIX MONDIALE : Aucun conflit armé officiel en cours';

                var headerBtn = ThirdWorldUI.Widgets.button(
                    panel,
                    globalStatus,
                    (totalConflicts > 0) ? 'minecraft:netherite_sword' : 'minecraft:shield',
                    function() {}
                );
                if (headerBtn) panel.add(headerBtn);

                // 2. SIÈGES ET ASSAUTS EN COURS
                var siegeHeader = ThirdWorldUI.Widgets.header(
                    panel,
                    'SIÈGES TERRITORIAUX EN COURS (' + sieges.length + ')',
                    'Points de capture et contrôle de zone',
                    'minecraft:tnt'
                );
                if (siegeHeader) panel.add(siegeHeader);

                if (sieges.length === 0) {
                    var noSiege = ThirdWorldUI.Widgets.card(panel, '§7Aucun siège actif', 'Toutes les forteresses et villes sont sécurisées.', 'minecraft:iron_bars', function() {});
                    if (noSiege) panel.add(noSiege);
                } else {
                    for (var s = 0; s < sieges.length; s++) {
                        (function(siege) {
                            var points = siege.points || 0;
                            var maxPoints = siege.maxPoints || 100;
                            var progressText = ThirdWorldUI.Widgets.progressBar(points, maxPoints, 12);
                            var timeLeft = siege.timeLeft || 'Inconnu';

                            var title = '§c§l' + (siege.attackerName || 'Attaquant') + ' §4⚔ §6§l' + (siege.defenderName || 'Défenseur');
                            var details = 'Zone: ' + (siege.zone || 'Inconnue') + ' | Fin: ' + timeLeft + '\nProgression: ' + progressText;

                            var siegeCard = ThirdWorldUI.Widgets.card(
                                panel,
                                title,
                                details,
                                'minecraft:crossbow',
                                function() {
                                    ThirdWorldUI.Router.sendAction('action_war', { action: 'siege_info', siegeId: siege.id });
                                }
                            );
                            if (siegeCard) panel.add(siegeCard);
                        })(sieges[s]);
                    }
                }

                // 3. GUERRES DÉCLARÉES
                var warHeader = ThirdWorldUI.Widgets.header(
                    panel,
                    'CONFLITS ARMÉS DÉCLARÉS (' + wars.length + ')',
                    'Hostilités diplomatiques ouvertes',
                    'minecraft:redstone_torch'
                );
                if (warHeader) panel.add(warHeader);

                if (wars.length === 0) {
                    var noWar = ThirdWorldUI.Widgets.card(panel, '§7Aucune guerre déclarée', 'Le droit international est actuellement respecté.', 'minecraft:oak_sapling', function() {});
                    if (noWar) panel.add(noWar);
                } else {
                    for (var w = 0; w < wars.length; w++) {
                        (function(war) {
                            var warTitle = '§c§l' + (war.attackerName || 'Belligérant 1') + ' §7vs §6§l' + (war.defenderName || 'Belligérant 2');
                            var warDetails = 'Déclarée le : ' + (war.date || 'Récemment') + ' | Statut : §eActif\n§7Motif : ' + (war.reason || 'Conflit frontalier');

                            var warCard = ThirdWorldUI.Widgets.card(
                                panel,
                                warTitle,
                                warDetails,
                                'minecraft:iron_sword',
                                function() {
                                    ThirdWorldUI.Router.sendAction('action_war', { action: 'war_details', warId: war.id });
                                }
                            );
                            if (warCard) panel.add(warCard);
                        })(wars[w]);
                    }
                }
            }
        });

        if (screen) {
            screen.open();
        }
    }

    NetworkEvents.dataReceived('open_war_registry', function(event) {
        try {
            var data = event.data || event.getData();
            var jsonStr = data.getString ? data.getString('json') : String(data.get('json'));
            var payload = JSON.parse(jsonStr);

            var active = ThirdWorldUI.Router.getActiveScreen();
            if (active && active.type === 'war_registry' && active.instance) {
                active.instance.updateState(payload);
            } else {
                openWarScreen(payload);
            }
        } catch (e) {
            console.error('[ThirdWorld UI] Erreur réception open_war_registry: ' + e);
        }
    });

    ThirdWorldUI.Screens = ThirdWorldUI.Screens || {};
    ThirdWorldUI.Screens.openWarScreen = openWarScreen;

    console.info('[ThirdWorld UI] Écran Registre de Guerre initialisé.');
})();
