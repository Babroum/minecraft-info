// priority: 100
// =============================================================================
// Third World UI Framework - Theme & Design System
// =============================================================================

var ThirdWorldUI = ThirdWorldUI || {};

(function() {
    var ComponentClass = Java.loadClass('net.minecraft.network.chat.Component');
    var Color4IClass = Java.loadClass('dev.ftb.mods.ftblibrary.icon.Color4I');
    var IconClass = Java.loadClass('dev.ftb.mods.ftblibrary.icon.Icon');
    var ItemIconClass = Java.loadClass('dev.ftb.mods.ftblibrary.icon.ItemIcon');
    var ResourceLocationClass = null;
    var BuiltInRegistriesClass = null;

    try {
        ResourceLocationClass = Java.loadClass('net.minecraft.resources.ResourceLocation');
        BuiltInRegistriesClass = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries');
    } catch (e) {}

    // Palette Néo-Tactique / Sombre Slate
    var Colors = {
        // Fonds
        BG_OVERLAY: Color4IClass.rgba(15, 15, 23, 215),       // Fond sombre transparent
        BG_PANEL: Color4IClass.rgba(24, 24, 37, 245),         // Fond conteneur principal
        BG_CARD: Color4IClass.rgba(30, 30, 46, 230),          // Fond de carte
        BG_CARD_HOVER: Color4IClass.rgba(49, 50, 68, 240),    // Fond de carte survolée
        BG_CARD_SELECTED: Color4IClass.rgba(69, 71, 90, 240), // Carte sélectionnée
        BG_INPUT: Color4IClass.rgba(17, 17, 27, 240),         // Champ de saisie ou boîte

        // Bordures & Séparateurs
        BORDER_LIGHT: Color4IClass.rgba(69, 71, 90, 180),     // Bordure subtile
        BORDER_FOCUSED: Color4IClass.rgba(137, 180, 250, 220),// Bordure active / focus
        BORDER_GOLD: Color4IClass.rgba(249, 226, 175, 200),   // Bordure dorée / prestige
        DIVIDER: Color4IClass.rgba(49, 50, 68, 160),

        // Accents & Statuts
        ACCENT_BLUE: Color4IClass.rgba(137, 180, 250, 255),
        ACCENT_CYAN: Color4IClass.rgba(148, 226, 213, 255),
        ACCENT_GOLD: Color4IClass.rgba(249, 226, 175, 255),
        ACCENT_GREEN: Color4IClass.rgba(166, 227, 161, 255),
        ACCENT_RED: Color4IClass.rgba(243, 139, 168, 255),
        ACCENT_ORANGE: Color4IClass.rgba(250, 179, 135, 255),
        ACCENT_PURPLE: Color4IClass.rgba(203, 166, 247, 255),

        // Texte
        TEXT_PRIMARY: Color4IClass.rgba(205, 214, 244, 255),
        TEXT_MUTED: Color4IClass.rgba(108, 112, 134, 255),
        TEXT_DARK: Color4IClass.rgba(24, 24, 37, 255),
        WHITE: Color4IClass.rgba(255, 255, 255, 255),
        BLACK: Color4IClass.rgba(0, 0, 0, 255)
    };

    /**
     * Résolution robuste d'icône d'item ou de ressource pour FTB Library
     */
    function resolveIcon(icon) {
        if (!icon) {
            try { return IconClass.empty(); } catch (e) { return null; }
        }
        if (typeof icon !== 'string') {
            return icon;
        }

        var str = String(icon).trim();
        if (!str || str.length === 0) {
            try { return IconClass.empty(); } catch (e) { return null; }
        }

        if (str.indexOf('item:') === 0) {
            try {
                var iconRes = IconClass.getIcon(str);
                if (iconRes) return iconRes;
            } catch (eItemStr) {}
        }

        var cleanId = (str.indexOf(':') === -1) ? ('minecraft:' + str) : str;
        if (cleanId.indexOf('item:') === 0) {
            cleanId = cleanId.substring(5);
        }

        try {
            if (BuiltInRegistriesClass && ResourceLocationClass) {
                var rl = new ResourceLocationClass(cleanId);
                var item = BuiltInRegistriesClass.ITEM.get(rl);
                if (item) {
                    var itemIcon = ItemIconClass.getItemIcon(item);
                    if (itemIcon) return itemIcon;
                }
            }
        } catch (eReg) {}

        try {
            if (typeof Item !== 'undefined' && Item.of) {
                var kStack = Item.of(cleanId);
                if (kStack && kStack.getItem) {
                    var itemObj = kStack.getItem();
                    if (itemObj) {
                        var itemIconKjs = ItemIconClass.getItemIcon(itemObj);
                        if (itemIconKjs) return itemIconKjs;
                    }
                }
            }
        } catch (eKjs) {}

        try {
            var ftbItemIcon = IconClass.getIcon('item:' + cleanId);
            if (ftbItemIcon) return ftbItemIcon;
        } catch (eIconFtb) {}

        try {
            var directIcon = IconClass.getIcon(str);
            if (directIcon) return directIcon;
        } catch (eDirect) {}

        try { return IconClass.empty(); } catch (eEmpty) { return null; }
    }

    /**
     * Formatage de montant monétaire 100% compatible Rhino (sans toLocaleString)
     */
    function formatCurrency(amount) {
        var n = Math.round(Number(amount) || 0);
        var s = String(n);
        var res = '';
        var count = 0;
        for (var i = s.length - 1; i >= 0; i--) {
            res = s.charAt(i) + res;
            count++;
            if (count % 3 === 0 && i > 0) {
                res = ' ' + res;
            }
        }
        return res + ' R';
    }

    /**
     * Composant texte Minecraft
     */
    function text(str) {
        return ComponentClass.literal(str || '');
    }

    ThirdWorldUI.Theme = {
        Colors: Colors,
        resolveIcon: resolveIcon,
        formatCurrency: formatCurrency,
        text: text,
        
        // Dimensions standard
        HEADER_HEIGHT: 28,
        FOOTER_HEIGHT: 24,
        TAB_HEIGHT: 24,
        PADDING: 8
    };

    console.info('[ThirdWorld UI] Theme & Design System initialisés.');
})();
