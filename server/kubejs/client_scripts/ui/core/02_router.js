// priority: 95
// =============================================================================
// Third World UI Framework - Network Router & Packet Dispatcher
// =============================================================================

var ThirdWorldUI = ThirdWorldUI || {};

(function() {
    var MinecraftClass = Java.loadClass('net.minecraft.client.Minecraft');
    var SimpleToastClass = Java.loadClass('dev.ftb.mods.ftblibrary.ui.misc.SimpleToast');
    var ComponentClass = Java.loadClass('net.minecraft.network.chat.Component');

    var activeScreenInstance = null;
    var activeScreenType = null;

    /**
     * Envoi sécurisé d'un paquet d'action client vers le serveur
     */
    function sendAction(channel, payload) {
        try {
            var jsonStr = JSON.stringify(payload || {});
            if (typeof Client !== 'undefined' && Client.sendData) {
                Client.sendData(channel, { json: jsonStr });
                return;
            }
            var mc = MinecraftClass.getInstance();
            if (mc && mc.player) {
                if (mc.player.sendData) {
                    mc.player.sendData(channel, { json: jsonStr });
                } else if (mc.player.kjs$sendData) {
                    var CompoundTagClass = Java.loadClass('net.minecraft.nbt.CompoundTag');
                    var tag = new CompoundTagClass();
                    tag.putString('json', jsonStr);
                    mc.player.kjs$sendData(channel, tag);
                }
            }
        } catch (e) {
            console.error('[ThirdWorld UI Router] Erreur lors de l\'envoi de ' + channel + ': ' + e);
        }
    }

    /**
     * Définit l'écran actuellement ouvert
     */
    function setActiveScreen(screenType, screenInstance) {
        activeScreenType = screenType;
        activeScreenInstance = screenInstance;
    }

    /**
     * Récupère l'écran actif
     */
    function getActiveScreen() {
        return {
            type: activeScreenType,
            instance: activeScreenInstance
        };
    }

    /**
     * Déclenche un toast visuel élégant
     */
    function showToast(title, message, isError) {
        try {
            var tComp = ComponentClass.literal(title || 'Information');
            var mComp = ComponentClass.literal(message || '');
            if (isError) {
                SimpleToastClass.error(tComp, mComp);
            } else {
                SimpleToastClass.info(tComp, mComp);
            }
        } catch (e) {
            console.warn('[ThirdWorld UI Router] Impossible d\'afficher le toast: ' + e);
        }
    }

    // Handlers pour les écrans enregistrés
    var screenHandlers = {};

    function registerScreenHandler(screenType, openCallback) {
        screenHandlers[screenType] = openCallback;
    }

    // Réception des paquets réseau
    NetworkEvents.dataReceived('show_toast', function(event) {
        try {
            var data = event.data || event.getData();
            var jsonStr = data.getString ? data.getString('json') : String(data.get('json'));
            var payload = JSON.parse(jsonStr);
            showToast(payload.title, payload.message, payload.type === 'error');
        } catch (e) {}
    });

    // Inscription aux langues des boutons sidebar FTB
    ClientEvents.lang('fr_fr', function(event) {
        event.add('sidebar_button.kubejs.onu_market', "Bourse & Marché de l'ONU");
        event.add('sidebar_button.kubejs.onu_market.tooltip', "Accéder aux cours et à l'économie mondiale");
        event.add('sidebar_button.kubejs.nation', "Nation & Trésorerie");
        event.add('sidebar_button.kubejs.nation.tooltip', "Tableau de bord de votre nation et banque");
        event.add('sidebar_button.kubejs.war', "Registre Militaire & Sièges");
        event.add('sidebar_button.kubejs.war.tooltip', "Consulter les conflits actifs et assauts");
        event.add('sidebar_button.kubejs.onu_contract', "Marchés Publics de l'ONU");
        event.add('sidebar_button.kubejs.onu_contract.tooltip', "Consulter l'approvisionnement mondial");
    });

    ClientEvents.lang('en_us', function(event) {
        event.add('sidebar_button.kubejs.onu_market', "UN Global Market");
        event.add('sidebar_button.kubejs.onu_market.tooltip', "Access global commodities and economy");
        event.add('sidebar_button.kubejs.nation', "Nation & Treasury");
        event.add('sidebar_button.kubejs.nation.tooltip', "Nation dashboard and central bank");
        event.add('sidebar_button.kubejs.war', "War & Siege Registry");
        event.add('sidebar_button.kubejs.war.tooltip', "View active conflicts and sieges");
        event.add('sidebar_button.kubejs.onu_contract', "UN Public Contracts");
        event.add('sidebar_button.kubejs.onu_contract.tooltip', "View active global procurement");
    });

    ThirdWorldUI.Router = {
        sendAction: sendAction,
        setActiveScreen: setActiveScreen,
        getActiveScreen: getActiveScreen,
        showToast: showToast,
        registerScreenHandler: registerScreenHandler,
        handlers: screenHandlers
    };

    console.info('[ThirdWorld UI] Network Router initialisé.');
})();
