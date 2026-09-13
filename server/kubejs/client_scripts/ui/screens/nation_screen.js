// priority: 70
// =============================================================================
// Third World UI - Écran : Tableau de Bord Nation & Trésorerie Centrale
// =============================================================================

var ThirdWorldUI = ThirdWorldUI || {};

(function() {
    var ContextMenuItemClass = Java.loadClass('dev.ftb.mods.ftblibrary.ui.ContextMenuItem');
    var ArrayListClass = Java.loadClass('java.util.ArrayList');
    var ComponentClass = Java.loadClass('net.minecraft.network.chat.Component');

    var currentScreenInstance = null;

    var TABS = [
        { id: 'overview', label: 'Aperçu', icon: 'minecraft:compass' },
        { id: 'bank', label: 'Trésorerie', icon: 'minecraft:gold_block' },
        { id: 'members', label: 'Citoyens', icon: 'minecraft:player_head' },
        { id: 'diplomacy', label: 'Diplomatie', icon: 'minecraft:shield' }
    ];

    function openNationScreen(payload) {
        var screen = ThirdWorldUI.BaseScreen.create({
            id: 'nation_dashboard',
            title: payload.hasNation ? ('🏛 Nation : ' + payload.teamName) : '🏛 Registre des Nations',
            hasSearch: false,
            initialState: {
                data: payload,
                currentTab: 'overview'
            },
            populate: function(panel, self, state) {
                currentScreenInstance = self;
                var data = state.data || {};

                // CAS 1 : JOUEUR SANS NATION
                if (!data.hasNation) {
                    renderNoNationView(panel, self);
                    return;
                }

                // CAS 2 : JOUEUR AVEC NATION -> NAVIGATION PAR ONGLETS
                var activeTab = state.currentTab || 'overview';

                ThirdWorldUI.Widgets.tabBar(panel, TABS, activeTab, function(newTabId) {
                    self.currentState.currentTab = newTabId;
                    self.refreshUI();
                });

                // Rendu du contenu selon l'onglet actif
                if (activeTab === 'overview') {
                    renderOverviewTab(panel, self, data);
                } else if (activeTab === 'bank') {
                    renderBankTab(panel, self, data);
                } else if (activeTab === 'members') {
                    renderMembersTab(panel, self, data);
                } else if (activeTab === 'diplomacy') {
                    renderDiplomacyTab(panel, self, data);
                }
            }
        });

        if (screen) {
            screen.open();
        }
    }

    /**
     * Vue pour un joueur sans nation
     */
    function renderNoNationView(panel, screen) {
        var header = ThirdWorldUI.Widgets.button(
            panel,
            '§e§lStatut : Citoyen Indépendant (Sans Nation)',
            'minecraft:compass',
            function() {}
        );
        if (header) panel.add(header);

        var helpCard = ThirdWorldUI.Widgets.card(
            panel,
            '§f§lFonder ou Rejoindre une Nation',
            'Pour participer à la géopolitique, fondez une faction ou acceptez une invitation.\n§7Commandes : §e/ftbteams party create <nom> §7| §e/ftbteams party join <nom>',
            'minecraft:book',
            function() {}
        );
        if (helpCard) panel.add(helpCard);
    }

    /**
     * Onglet 1 : Aperçu Général
     */
    function renderOverviewTab(panel, screen, data) {
        var rankBadge = (data.rank === 'Leader') ? '§6★ Leader' : ((data.rank === 'Ministre') ? '§bMinistre' : '§7Citoyen');
        var warBadge = (data.warStatus && data.warStatus.indexOf('GUERRE') !== -1) ? '§c⚔ EN GUERRE' : '§a✔ EN PAIX';

        var identityCard = ThirdWorldUI.Widgets.card(
            panel,
            '§6§l' + data.teamName + '  §7[' + rankBadge + '§7]  [' + warBadge + '§7]',
            'Capitale : ' + (data.homeCoords || 'Non définie') + '  |  Trésor : §a' + (data.balance || '0 R'),
            'minecraft:lodestone',
            function() {}
        );
        if (identityCard) panel.add(identityCard);

        var actHeader = ThirdWorldUI.Widgets.header(panel, 'ACTIONS RAPIDES', 'Gestion territoriale', 'minecraft:nether_star');
        if (actHeader) panel.add(actHeader);

        // Bouton TP Home
        var homeBtn = ThirdWorldUI.Widgets.card(
            panel,
            '§a§l📍 Se Téléporter au QG National',
            'Exécute la téléportation instantanée vers le point de ralliement (/nation home)',
            'minecraft:ender_pearl',
            function() {
                ThirdWorldUI.Router.sendAction('action_nation', { action: 'home' });
                screen.closeGui();
            }
        );
        if (homeBtn) panel.add(homeBtn);

        // Si Leader ou Ministre : Définir le Home
        if (data.rank === 'Leader' || data.rank === 'Ministre') {
            var setHomeBtn = ThirdWorldUI.Widgets.card(
                panel,
                '§6§l🏛 Définir la Capitale / QG ici',
                'Fixe les coordonnées actuelles comme nouveau QG national (/nation sethome)',
                'minecraft:beacon',
                function() {
                    ThirdWorldUI.Router.sendAction('action_nation', { action: 'sethome' });
                    ThirdWorldUI.Router.showToast('Capitale', 'QG national actualisé avec succès.', false);
                }
            );
            if (setHomeBtn) panel.add(setHomeBtn);
        }
    }

    /**
     * Onglet 2 : Trésorerie & Banque Centrale
     */
    function renderBankTab(panel, screen, data) {
        var treasuryCard = ThirdWorldUI.Widgets.card(
            panel,
            '§6§l💰 Solde du Trésor National : §a§l' + (data.balance || '0 R'),
            'Fonds publics utilisés pour la diplomatie, les infrastructures et les taxes.',
            'minecraft:gold_block',
            function() {}
        );
        if (treasuryCard) panel.add(treasuryCard);

        var depHeader = ThirdWorldUI.Widgets.header(panel, 'DÉPÔTS AU TRÉSOR', 'Créditer la nation depuis votre compte', 'minecraft:gold_ingot');
        if (depHeader) panel.add(depHeader);

        // Boutons de dépôt rapide
        var deposits = [100, 1000, 10000];
        for (var d = 0; d < deposits.length; d++) {
            (function(amount) {
                var btn = ThirdWorldUI.Widgets.button(
                    panel,
                    '§a➕ Déposer ' + ThirdWorldUI.Theme.formatCurrency(amount),
                    'minecraft:gold_ingot',
                    function() {
                        ThirdWorldUI.Router.sendAction('action_nation_bank', { action: 'deposit', amount: amount });
                    }
                );
                if (btn) panel.add(btn);
            })(deposits[d]);
        }

        // Si Ministre ou Leader : Retraits et Fiscalité
        if (data.rank === 'Leader' || data.rank === 'Ministre') {
            var withHeader = ThirdWorldUI.Widgets.header(panel, 'RETRAITS OFFICIELS', 'Autorisation gouvernementale requise', 'minecraft:iron_ingot');
            if (withHeader) panel.add(withHeader);

            var withdrawals = [100, 1000, 10000];
            for (var w = 0; w < withdrawals.length; w++) {
                (function(amt) {
                    var wBtn = ThirdWorldUI.Widgets.button(
                        panel,
                        '§c➖ Retirer ' + ThirdWorldUI.Theme.formatCurrency(amt),
                        'minecraft:iron_ingot',
                        function() {
                            ThirdWorldUI.Router.sendAction('action_nation_bank', { action: 'withdraw', amount: amt });
                        }
                    );
                    if (wBtn) panel.add(wBtn);
                })(withdrawals[w]);
            }
        }
    }

    /**
     * Onglet 3 : Citoyens & Membres
     */
    function renderMembersTab(panel, screen, data) {
        var members = data.members || [];
        var memHeader = ThirdWorldUI.Widgets.header(
            panel,
            'REGISTRE DES CITOYENS (' + members.length + ')',
            'Membres enregistrés de la nation',
            'minecraft:player_head'
        );
        if (memHeader) panel.add(memHeader);

        for (var m = 0; m < members.length; m++) {
            (function(member) {
                var isOnline = member.online;
                var statusBullet = isOnline ? '§a● En ligne' : '§8○ Déconnecté';
                var rBadge = (member.rank === 'Leader') ? '§6★ Leader' : ((member.rank === 'Ministre') ? '§bMinistre' : '§7Citoyen');

                var card = ThirdWorldUI.Widgets.card(
                    panel,
                    '§f§l' + member.name + '  §7[' + rBadge + '§7]',
                    statusBullet,
                    'minecraft:player_head',
                    function() {}
                );
                if (card) panel.add(card);
            })(members[m]);
        }
    }

    /**
     * Onglet 4 : Diplomatie
     */
    function renderDiplomacyTab(panel, screen, data) {
        var dipHeader = ThirdWorldUI.Widgets.header(
            panel,
            'RELATIONS INTERNATIONALES',
            'Alliances & Pactes de défense',
            'minecraft:shield'
        );
        if (dipHeader) panel.add(dipHeader);

        var allies = data.allies || 'Aucune alliance active';
        var allyCard = ThirdWorldUI.Widgets.card(
            panel,
            '§b§lAlliances Actives',
            typeof allies === 'string' ? allies : JSON.stringify(allies),
            'minecraft:cyan_banner',
            function() {
                ThirdWorldUI.Router.sendAction('action_nation', { action: 'ally_list' });
            }
        );
        if (allyCard) panel.add(allyCard);
    }

    // Écouteur réseau pour open_nation_dashboard
    NetworkEvents.dataReceived('open_nation_dashboard', function(event) {
        try {
            var data = event.data || event.getData();
            var jsonStr = data.getString ? data.getString('json') : String(data.get('json'));
            var payload = JSON.parse(jsonStr);

            var active = ThirdWorldUI.Router.getActiveScreen();
            if (active && active.type === 'nation_dashboard' && active.instance) {
                active.instance.updateState({ data: payload });
            } else {
                openNationScreen(payload);
            }
        } catch (e) {
            console.error('[ThirdWorld UI] Erreur réception open_nation_dashboard: ' + e);
        }
    });

    ThirdWorldUI.Screens = ThirdWorldUI.Screens || {};
    ThirdWorldUI.Screens.openNationScreen = openNationScreen;

    console.info('[ThirdWorld UI] Écran Nation & Banque initialisé.');
})();
