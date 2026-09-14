// priority: 85
// =============================================================================
// Third World UI Framework - Reusable UI Components & Widgets
// =============================================================================

var ThirdWorldUI = ThirdWorldUI || {};

(function() {
    var SimpleTextButtonClass = Java.loadClass('dev.ftb.mods.ftblibrary.ui.SimpleTextButton');
    var SimpleButtonClass = Java.loadClass('dev.ftb.mods.ftblibrary.ui.SimpleButton');
    var ComponentClass = Java.loadClass('net.minecraft.network.chat.Component');

    /**
     * Bouton textuel FTB Library universel et ultra-robuste
     */
    function createButton(panel, title, icon, onClick) {
        var compTitle = (typeof title === 'string') ? ComponentClass.literal(title) : title;
        var btnIcon = ThirdWorldUI.Theme.resolveIcon(icon);

        var safeClick = function(mBtn) {
            try {
                if (onClick) onClick(mBtn);
            } catch (err) {
                console.error('[ThirdWorld UI Widget] Erreur clic bouton: ' + err);
            }
        };

        try {
            var btn = new JavaAdapter(SimpleTextButtonClass, {
                onClicked: function(mBtn) {
                    safeClick(mBtn);
                }
            }, panel, compTitle, btnIcon);
            if (btn) return btn;
        } catch (e1) {}

        try {
            var btn2 = new SimpleButtonClass(panel, compTitle, btnIcon, function(w, mBtn) {
                safeClick(mBtn);
            });
            if (btn2) return btn2;
        } catch (e2) {}

        return null;
    }

    /**
     * En-tête de section visuel avec séparateur
     */
    function createHeader(panel, title, subtitle, icon) {
        var subText = subtitle ? (' §7| ' + subtitle) : '';
        var fullTitle = '§6§l' + title + subText;
        return createButton(panel, fullTitle, icon || 'minecraft:nether_star', function() {});
    }

    var ButtonClass = Java.loadClass('dev.ftb.mods.ftblibrary.ui.Button');
    var WidgetTypeClass = Java.loadClass('dev.ftb.mods.ftblibrary.ui.WidgetType');
    var CursorTypeClass = Java.loadClass('dev.ftb.mods.ftblibrary.ui.CursorType');

    /**
     * Carte d'information interactive
     */
    function createCard(panel, title, description, icon, onClick) {
        var descText = description ? ('\n§7' + description) : '';
        var fullTitle = title + descText;
        return createButton(panel, fullTitle, icon, onClick);
    }

    /**
     * Bannière informative statique (non cliquable, distinction visuelle forte des boutons)
     */
    function createBanner(panel, title, subtitle, icon, accentColor) {
        var compTitle = (typeof title === 'string') ? ComponentClass.literal(title) : title;
        var btnIcon = ThirdWorldUI.Theme.resolveIcon(icon);
        var subComp = subtitle ? ((typeof subtitle === 'string') ? ComponentClass.literal(subtitle) : subtitle) : null;
        var acc = accentColor || ThirdWorldUI.Theme.Colors.ACCENT_BLUE;

        try {
            var banner = new JavaAdapter(ButtonClass, {
                onClicked: function(mBtn) {},
                mousePressed: function(mBtn) { return false; },
                getWidgetType: function() { return WidgetTypeClass.DISABLED; },
                getCursor: function() { return CursorTypeClass.DEFAULT; },
                draw: function(graphics, theme, x, y, w, h) {
                    // Fond sombre slate
                    ThirdWorldUI.Theme.Colors.BG_PANEL.draw(graphics, x, y, w, h);
                    // Bordure discrète
                    ThirdWorldUI.Theme.Colors.DIVIDER.draw(graphics, x, y, w, 1);
                    ThirdWorldUI.Theme.Colors.DIVIDER.draw(graphics, x, y + h - 1, w, 1);
                    ThirdWorldUI.Theme.Colors.DIVIDER.draw(graphics, x, y + 1, 1, h - 2);
                    ThirdWorldUI.Theme.Colors.DIVIDER.draw(graphics, x + w - 1, y + 1, 1, h - 2);
                    // Bandeau accentué sur la gauche
                    if (acc) {
                        acc.draw(graphics, x, y, 3, h);
                    }
                    // Icône
                    if (btnIcon && !btnIcon.isEmpty()) {
                        btnIcon.draw(graphics, x + 7, y + Math.floor((h - 16) / 2), 16, 16);
                    }
                    var textX = (btnIcon && !btnIcon.isEmpty()) ? (x + 28) : (x + 8);
                    if (subComp) {
                        theme.drawString(graphics, compTitle, textX, y + 4);
                        theme.drawString(graphics, subComp, textX, y + 15);
                    } else {
                        theme.drawString(graphics, compTitle, textX, y + Math.floor((h - theme.getFontHeight()) / 2));
                    }
                }
            }, panel, compTitle, btnIcon);

            banner.setHeight(subComp ? 28 : 20);
            banner.isPermanentHeader = true;
            return banner;
        } catch (e) {
            console.error('[ThirdWorld UI Widget] Erreur creation banner: ' + e);
            return createHeader(panel, title, subtitle, icon);
        }
    }

    /**
     * Séparateur visuel de section élégant
     */
    function createSectionDivider(panel, title) {
        var compTitle = (typeof title === 'string') ? ComponentClass.literal(title) : title;
        try {
            var div = new JavaAdapter(ButtonClass, {
                onClicked: function(mBtn) {},
                mousePressed: function(mBtn) { return false; },
                getWidgetType: function() { return WidgetTypeClass.DISABLED; },
                getCursor: function() { return CursorTypeClass.DEFAULT; },
                draw: function(graphics, theme, x, y, w, h) {
                    var midY = y + Math.floor(h / 2);
                    ThirdWorldUI.Theme.Colors.DIVIDER.draw(graphics, x, midY, w, 1);
                    var strW = theme.getStringWidth(compTitle);
                    var bgX = x + 10;
                    ThirdWorldUI.Theme.Colors.BG_OVERLAY.draw(graphics, bgX - 4, y, strW + 8, h);
                    theme.drawString(graphics, compTitle, bgX, y + Math.floor((h - theme.getFontHeight()) / 2));
                }
            }, panel, compTitle, ThirdWorldUI.Theme.resolveIcon(null));
            div.setHeight(16);
            div.isPermanentHeader = true;
            return div;
        } catch (e) {
            return null;
        }
    }

    /**
     * Barre d'onglets de navigation horizontale
     * tabs = [ { id: 'overview', label: 'Aperçu', icon: 'minecraft:compass' }, ... ]
     */
    function createTabBar(panel, tabs, activeTabId, onSelectTab) {
        for (var i = 0; i < tabs.length; i++) {
            (function(tab) {
                var isActive = (tab.id === activeTabId);
                var prefix = isActive ? '§a§l▶ §f§l[' : '§7[';
                var suffix = isActive ? '§a§l]' : '§7]';
                var label = prefix + tab.label + suffix;

                var btn = createButton(panel, label, tab.icon, function() {
                    if (!isActive && onSelectTab) {
                        onSelectTab(tab.id);
                    }
                });
                if (btn) panel.add(btn);
            })(tabs[i]);
        }
    }

    /**
     * Générateur de jauge de progression visuelle ASCII stylisée
     */
    function formatProgressBar(current, max, barLength) {
        var len = barLength || 15;
        var m = Math.max(1, max || 1);
        var c = Math.max(0, Math.min(current || 0, m));
        var ratio = c / m;
        var filled = Math.round(ratio * len);
        var empty = len - filled;

        var color = '§a';
        if (ratio < 0.25) color = '§c';
        else if (ratio < 0.6) color = '§e';

        var bar = color;
        for (var i = 0; i < filled; i++) bar += '█';
        bar += '§8';
        for (var j = 0; j < empty; j++) bar += '░';

        var pct = Math.round(ratio * 100);
        return bar + ' ' + color + pct + '% §7(' + c + '/' + m + ')';
    }

    /**
     * Badge textuel coloré
     */
    function badge(label, type) {
        var color = '§7';
        if (type === 'success' || type === 'peace') color = '§a§l';
        else if (type === 'danger' || type === 'war') color = '§c§l';
        else if (type === 'warning' || type === 'stock') color = '§e§l';
        else if (type === 'gold' || type === 'leader') color = '§6§l';
        else if (type === 'info' || type === 'minister') color = '§b§l';

        return color + '[' + label + ']§r';
    }

    ThirdWorldUI.Widgets = {
        button: createButton,
        header: createHeader,
        banner: createBanner,
        sectionDivider: createSectionDivider,
        card: createCard,
        tabBar: createTabBar,
        progressBar: formatProgressBar,
        badge: badge
    };

    console.info('[ThirdWorld UI] Composants & Widgets initialisés.');
})();
