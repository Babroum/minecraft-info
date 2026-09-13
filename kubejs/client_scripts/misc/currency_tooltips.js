// priority: 20
// =============================================================================
// Third World Client Script - Masquage des infobulles de conversion de monnaie
// =============================================================================
// Supprime les mentions automatiques "5 of these are worth 1 billet..." de Lightman's Currency

(function() {
    try {
        var ItemTooltipEventClass = Java.loadClass('net.neoforged.neoforge.event.entity.player.ItemTooltipEvent');
        var EventPriorityClass = Java.loadClass('net.neoforged.bus.api.EventPriority');

        NativeEvents.onEvent(EventPriorityClass.LOWEST, ItemTooltipEventClass, function(event) {
            try {
                var stack = event.getItemStack();
                if (!stack || stack.isEmpty()) return;
                var item = stack.getItem();
                var id = item ? String(item.toString()) : '';
                if (id.indexOf('billet_') !== -1) {
                    var tooltip = event.getToolTip();
                    if (tooltip && tooltip.size() > 1) {
                        for (var i = tooltip.size() - 1; i >= 1; i--) {
                            var lineComp = tooltip.get(i);
                            var lineStr = lineComp ? lineComp.getString().toLowerCase() : '';
                            if (lineStr.indexOf('worth') !== -1 ||
                                lineStr.indexOf('vaut') !== -1 ||
                                lineStr.indexOf('valent') !== -1 ||
                                lineStr.indexOf('of these') !== -1 ||
                                lineStr.indexOf('objets') !== -1 ||
                                lineStr.indexOf('billet') !== -1) {
                                tooltip.remove(i);
                            }
                        }
                    }
                }
            } catch (err) {}
        });
        console.info('[ThirdWorld Client] Masqueur d\'infobulles de devises initialisé.');
    } catch (eTooltip) {
        console.warn('[ThirdWorld Client] NativeEvents tooltip non disponible: ' + eTooltip);
    }
})();
