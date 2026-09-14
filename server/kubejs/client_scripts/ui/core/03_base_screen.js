// priority: 90
// =============================================================================
// Third World UI Framework - Base Screen Factory & Lifecycle Manager
// =============================================================================

var ThirdWorldUI = ThirdWorldUI || {};

(function() {
    var ButtonListBaseScreenClass = Java.loadClass('dev.ftb.mods.ftblibrary.ui.misc.ButtonListBaseScreen');
    var ComponentClass = Java.loadClass('net.minecraft.network.chat.Component');
    var MinecraftClass = Java.loadClass('net.minecraft.client.Minecraft');

    /**
     * Fabrique un écran moderne à cycle de vie réactif basé sur FTB Library
     */
    function createScreen(config) {
        var screenId = config.id || 'tw_screen_' + Date.now();
        var titleText = config.title || 'Third World';
        var hasSearch = (config.hasSearch !== undefined) ? config.hasSearch : false;
        var populateFn = config.populate || function(panel, self) {};
        var initialState = config.initialState || {};

        var screen = null;

        try {
            screen = new JavaAdapter(ButtonListBaseScreenClass, {
                onInit: function() {
                    try {
                        var wRatio = (config.widthRatio !== undefined) ? config.widthRatio : 0.82;
                        var hRatio = (config.heightRatio !== undefined) ? config.heightRatio : 0.85;
                        this.setSizeProportional(wRatio, hRatio);
                    } catch (eInit) {
                        console.warn('[ThirdWorld UI] Impossible d\'appliquer setSizeProportional: ' + eInit);
                    }
                    return true;
                },
                getFilterText: function(widget) {
                    try {
                        if (widget && widget.isPermanentHeader) {
                            return (this.searchBox && this.searchBox.getText) ? this.searchBox.getText().toLowerCase() : '';
                        }
                        if (widget && widget.customFilterText) {
                            return String(widget.customFilterText).toLowerCase();
                        }
                        var title = widget ? widget.getTitle() : null;
                        return title ? title.getString().toLowerCase() : '';
                    } catch (eFilt) {
                        return '';
                    }
                },
                addButtons: function(panel) {
                    try {
                        this.screenPanel = panel;
                        populateFn(panel, this, this.currentState);
                    } catch (err) {
                        console.error('[ThirdWorld UI] Erreur dans addButtons (' + titleText + '): ' + err);
                    }
                },
                onClosed: function() {
                    try {
                        ThirdWorldUI.Router.setActiveScreen(null, null);
                        if (config.onClosed) {
                            config.onClosed(this);
                        }
                    } catch (errClosed) {}
                }
            });

            screen.screenId = screenId;
            screen.currentState = JSON.parse(JSON.stringify(initialState));
            screen.setTitle(ComponentClass.literal(titleText));
            screen.setHasSearchBox(hasSearch);
            // setBorder(borderH, borderV, itemSpacing) -> padding très compact (2px)
            screen.setBorder(
                config.borderH || 6,
                config.borderV || 4,
                (config.itemSpacing !== undefined) ? config.itemSpacing : 2
            );

            // Méthode de mise à jour réactive sans fermer l'écran
            screen.updateState = function(patch) {
                if (!patch) return;
                for (var key in patch) {
                    this.currentState[key] = patch[key];
                }
                this.refreshUI();
            };

            // Rafraîchissement des widgets
            screen.refreshUI = function() {
                try {
                    this.refreshWidgets();
                } catch (eRef) {
                    console.error('[ThirdWorld UI] Erreur lors du rafraîchissement des widgets: ' + eRef);
                }
            };

            // Ouverture enregistrée dans le router
            screen.open = function() {
                ThirdWorldUI.Router.setActiveScreen(screenId, this);
                this.openGui();
            };

            return screen;
        } catch (e) {
            console.error('[ThirdWorld UI] Impossible de créer l\'écran ' + titleText + ': ' + e);
            return null;
        }
    }

    ThirdWorldUI.BaseScreen = {
        create: createScreen
    };

    console.info('[ThirdWorld UI] Base Screen Factory initialisée.');
})();
