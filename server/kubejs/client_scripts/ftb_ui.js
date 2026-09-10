// priority: 50
// =============================================================================
// Third World Client Script - Suite d'Écrans Graphiques Modernes FTB Library
// =============================================================================
// Interface client pour Bourse ONU, Nation, Banque, Alliances, Guerres et Contrats.
// =============================================================================

var ComponentClass = Java.loadClass('net.minecraft.network.chat.Component')
var ButtonListBaseScreenClass = Java.loadClass('dev.ftb.mods.ftblibrary.ui.misc.ButtonListBaseScreen')
var SimpleTextButtonClass = Java.loadClass('dev.ftb.mods.ftblibrary.ui.SimpleTextButton')
var SimpleButtonClass = Java.loadClass('dev.ftb.mods.ftblibrary.ui.SimpleButton')
var ItemIconClass = Java.loadClass('dev.ftb.mods.ftblibrary.icon.ItemIcon')
var IconClass = Java.loadClass('dev.ftb.mods.ftblibrary.icon.Icon')
var ContextMenuItemClass = Java.loadClass('dev.ftb.mods.ftblibrary.ui.ContextMenuItem')
var SimpleToastClass = Java.loadClass('dev.ftb.mods.ftblibrary.ui.misc.SimpleToast')
var MinecraftClass = Java.loadClass('net.minecraft.client.Minecraft')

var ResourceLocationClass = null
var BuiltInRegistriesClass = null
var ArrayListClass = Java.loadClass('java.util.ArrayList')
try {
    ResourceLocationClass = Java.loadClass('net.minecraft.resources.ResourceLocation')
} catch (eRL) {
    console.warn('[FTB Client UI] Impossible de charger ResourceLocationClass: ' + eRL)
}

try {
    BuiltInRegistriesClass = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
} catch (eReg) {
    console.warn('[FTB Client UI] Impossible de charger BuiltInRegistriesClass: ' + eReg)
}

console.info('[FTB Client UI] Initialisation du script client FTB Library...')
console.info('[FTB Client UI] typeof JavaAdapter = ' + (typeof JavaAdapter))

ClientEvents.lang('fr_fr', function(event) {
    event.add('sidebar_button.kubejs.onu_market', "Bourse & Marché de l'ONU")
    event.add('sidebar_button.kubejs.onu_market.tooltip', "Accéder aux cours et à l'économie du serveur")
    event.add('sidebar_button.kubejs.nation', "Nation & Banque")
    event.add('sidebar_button.kubejs.nation.tooltip', "Tableau de bord de votre nation et trésorerie")
    event.add('sidebar_button.kubejs.war', "Registre de Guerre & Sièges")
    event.add('sidebar_button.kubejs.war.tooltip', "Consulter les conflits et assauts en cours")
    event.add('sidebar_button.kubejs.onu_contract', "Marchés Publics de l'ONU")
    event.add('sidebar_button.kubejs.onu_contract.tooltip', "Consulter l'approvisionnement mondial actif")
})

ClientEvents.lang('en_us', function(event) {
    event.add('sidebar_button.kubejs.onu_market', "UN Global Market")
    event.add('sidebar_button.kubejs.onu_market.tooltip', "Access server exchange and stock prices")
    event.add('sidebar_button.kubejs.nation', "Nation & Bank")
    event.add('sidebar_button.kubejs.nation.tooltip', "Nation dashboard and treasury")
    event.add('sidebar_button.kubejs.war', "War & Siege Registry")
    event.add('sidebar_button.kubejs.war.tooltip', "View active military conflicts")
    event.add('sidebar_button.kubejs.onu_contract', "UN Public Contracts")
    event.add('sidebar_button.kubejs.onu_contract.tooltip', "View active global procurement contract")
})

var activeMarketScreenInstance = null
var currentMarketData = null

/**
 * Envoi d'un paquet d'action client vers le serveur
 */
function sendClientAction(channel, payload) {
    try {
        var jsonStr = JSON.stringify(payload)
        if (typeof Client !== 'undefined' && Client.sendData) {
            Client.sendData(channel, { json: jsonStr })
            return
        }
        var mc = MinecraftClass.getInstance()
        if (mc && mc.player) {
            if (mc.player.sendData) {
                mc.player.sendData(channel, { json: jsonStr })
            } else if (mc.player.kjs$sendData) {
                var CompoundTagClass = Java.loadClass('net.minecraft.nbt.CompoundTag')
                var tag = new CompoundTagClass()
                tag.putString('json', jsonStr)
                mc.player.kjs$sendData(channel, tag)
            }
        }
    } catch (e) {
        console.error('[FTB Client UI] Erreur envoi action ' + channel + ' : ' + e)
    }
}

/**
 * Résolution ultra-robuste d'icône pour FTB Library à partir d'un ID d'item ou d'une chaîne
 */
function resolveIcon(icon) {
    if (!icon) {
        try { return IconClass.empty() } catch (e) { return null }
    }
    if (typeof icon !== 'string') {
        return icon
    }

    var str = String(icon).trim()
    if (!str || str.length === 0) {
        try { return IconClass.empty() } catch (e) { return null }
    }

    // Si préfixé avec 'item:' (convention standard FTB Library)
    if (str.indexOf('item:') === 0) {
        try {
            var iconRes = IconClass.getIcon(str)
            if (iconRes) return iconRes
        } catch (eItemStr) {}
    }

    // Normalisation de l'ID d'item (ex: "gold_block" -> "minecraft:gold_block")
    var cleanId = (str.indexOf(':') === -1) ? ('minecraft:' + str) : str
    if (cleanId.indexOf('item:') === 0) {
        cleanId = cleanId.substring(5)
    }

    // 1. Registre Minecraft Java BuiltInRegistries.ITEM (fournit un net.minecraft.world.item.Item exact sans ambiguïté)
    try {
        if (BuiltInRegistriesClass && ResourceLocationClass) {
            var rl = new ResourceLocationClass(cleanId)
            var item = BuiltInRegistriesClass.ITEM.get(rl)
            if (item) {
                var itemIcon = ItemIconClass.getItemIcon(item)
                if (itemIcon) return itemIcon
            }
        }
    } catch (eReg) {}

    // 2. KubeJS Item.of(cleanId)
    try {
        if (typeof Item !== 'undefined' && Item.of) {
            var kStack = Item.of(cleanId)
            if (kStack && kStack.getItem) {
                var itemObj = kStack.getItem()
                if (itemObj) {
                    var itemIconKjs = ItemIconClass.getItemIcon(itemObj)
                    if (itemIconKjs) return itemIconKjs
                }
            }
        }
    } catch (eKjs) {}

    // 3. IconClass.getIcon('item:' + cleanId)
    try {
        var ftbItemIcon = IconClass.getIcon('item:' + cleanId)
        if (ftbItemIcon) return ftbItemIcon
    } catch (eIconFtb) {}

    // 4. IconClass.getIcon(str) brut (textures ou autres)
    try {
        var directIcon = IconClass.getIcon(str)
        if (directIcon) return directIcon
    } catch (eDirect) {}

    try {
        return IconClass.empty()
    } catch (eEmpty) {
        return null
    }
}

/**
 * Fabrique ultra-robuste de boutons de texte avec gestion de compatibilité FTB Library
 */
function createTextButton(panel, title, icon, onClick) {
    try {
        var componentTitle = (typeof title === 'string') ? ComponentClass.literal(title) : title
        var btnIcon = resolveIcon(icon)
        var safeClick = function(mBtn) {
            try {
                if (onClick) onClick(mBtn)
            } catch (err) {
                console.error('[FTB Client UI] Erreur clic bouton: ' + err)
            }
        }

        // Méthode 1 : JavaAdapter sur SimpleTextButton avec surcharge de onClicked
        try {
            var btn1 = new JavaAdapter(SimpleTextButtonClass, {
                onClicked: function(mBtn) {
                    safeClick(mBtn)
                }
            }, panel, componentTitle, btnIcon)
            if (btn1) return btn1
        } catch (e1) {}

        // Méthode 2 : SimpleButton natif avec callback
        try {
            var btn2 = new SimpleButtonClass(panel, componentTitle, btnIcon, function(w, mBtn) {
                safeClick(mBtn)
            })
            if (btn2) return btn2
        } catch (e2) {}

        // Méthode 3 : SimpleTextButton.create direct
        try {
            var btn3 = SimpleTextButtonClass.create(panel, componentTitle, btnIcon, safeClick)
            if (btn3) return btn3
        } catch (e3) {}

        console.error('[FTB Client UI] Impossible de créer le bouton (' + title + ')')
        return null
    } catch (eGlobal) {
        console.error('[FTB Client UI] Exception dans createTextButton: ' + eGlobal)
        return null
    }
}

/**
 * Créateur universel d'écran ButtonListBaseScreen via JavaAdapter
 */
function createButtonListScreen(titleText, hasSearch, populateCallback) {
    try {
        console.info('[FTB Client UI] Création de l\'écran: ' + titleText)
        if (typeof JavaAdapter !== 'undefined') {
            var screen = new JavaAdapter(ButtonListBaseScreenClass, {
                addButtons: function(panel) {
                    try {
                        console.info('[FTB Client UI] addButtons démarré pour: ' + titleText)
                        populateCallback(panel, this)
                        var count = panel.getWidgets ? panel.getWidgets().size() : 'ok'
                        console.info('[FTB Client UI] addButtons terminé pour: ' + titleText + ', widgets: ' + count)
                    } catch (err) {
                        console.error('[FTB Client UI] ERREUR dans addButtons (' + titleText + ') : ' + err)
                    }
                }
            })
            screen.setTitle(ComponentClass.literal(titleText))
            screen.setHasSearchBox(hasSearch)
            screen.setBorder(10, 15, 10)
            console.info('[FTB Client UI] Écran créé avec succès via JavaAdapter !')
            return screen
        } else {
            console.error('[FTB Client UI] JavaAdapter n\'est pas disponible.')
            return null
        }
    } catch (e) {
        console.error('[FTB Client UI] Erreur creation ecran (' + titleText + ') : ' + e)
        return null
    }
}

// -----------------------------------------------------------------------------
// 1. ÉCRAN : BOURSE & MARCHÉ MONDIAL DE L'ONU
// -----------------------------------------------------------------------------
function openMarketScreen(marketData) {
    currentMarketData = marketData

    var screen = createButtonListScreen('🏛 Bourse & Marché Mondial de l\'ONU', true, function(panel, self) {
        // En-tête mode consultation si loin du Hub
        if (marketData && marketData.inZone === false) {
            var warnBtn = createTextButton(
                panel,
                '§e📡 Mode Consultation à Distance §7(Transactions au Hub -204, -172)',
                'minecraft:beacon',
                function(mBtn) {}
            )
            if (warnBtn) panel.add(warnBtn)
        } else {
            var hubBtn = createTextButton(
                panel,
                '§a🏢 Connecté au Hub de l\'ONU §7(-204, -172 - Transactions Autorisées)',
                'minecraft:lodestone',
                function(mBtn) {}
            )
            if (hubBtn) panel.add(hubBtn)
        }

        // Portefeuille du joueur
        var cash = (marketData && marketData.playerCash) || 0
        var walletTitle = '§6§l💰 Votre Portefeuille : §a§l' + cash + ' R §7(Liquidités disponibles)'
        var walletBtn = createTextButton(
            panel,
            walletTitle,
            'minecraft:gold_ingot',
            function(mBtn) {}
        )
        if (walletBtn) panel.add(walletBtn)

        // Liste des articles
        var items = (marketData && marketData.items) || []
        for (var i = 0; i < items.length; i++) {
            (function(item) {
                var isOutOfStock = item.currentStock <= 0
                var isNetherite = item.id.indexOf('netherite') !== -1

                var titleStr = (isNetherite ? '§6§l' : '§b§l') + item.name + ' '
                if (isOutOfStock) {
                    titleStr += '§c[RUPTURE] '
                } else {
                    titleStr += '§7(' + item.currentStock + ' en stock) '
                }
                titleStr += '§8| ' + item.trendColor + item.trendText.split(' ')[0] + ' '
                titleStr += '§a▲ ' + item.buyPrice + ' R §8/ §c▼ ' + item.sellPrice + ' R'

                var itemBtn = createTextButton(
                    panel,
                    titleStr,
                    item.id,
                    function(mouseBtn) {
                        showMarketItemContextMenu(self, item)
                    }
                )
                if (itemBtn) panel.add(itemBtn)
            })(items[i])
        }
    })

    if (screen) {
        activeMarketScreenInstance = screen
        screen.openGui()
    }
}

/**
 * Menu contextuel élégant affiché au clic sur un article
 */
function showMarketItemContextMenu(screen, item) {
    try {
        var list = new ArrayListClass()

        list.add(ContextMenuItemClass.title(ComponentClass.literal('§9§l' + item.name)))
        list.add(ContextMenuItemClass.title(ComponentClass.literal('§7Stock restant : ' + (item.currentStock > 0 ? '§a' + item.currentStock : '§c0 (Épuisé)'))))
        list.add(ContextMenuItemClass.SEPARATOR)

    // Option Acheter 1
    if (item.currentStock > 0) {
        list.add(new ContextMenuItemClass(
            ComponentClass.literal('§a▲ Acheter 1 unité §a(' + item.buyPrice + ' R)'),
            resolveIcon(item.id),
            function() {
                sendClientAction('action_onu_market', { action: 'buy', itemId: item.id, count: 1 })
            }
        ))
    }

    // Option Acheter par Lot
    if (item.lotSize > 1 && item.currentStock >= item.lotSize) {
        var totalCost = item.buyPrice * item.lotSize
        list.add(new ContextMenuItemClass(
            ComponentClass.literal('§a▲ Acheter 1 Lot de ' + item.lotSize + ' §2(' + totalCost + ' R)'),
            resolveIcon(item.id),
            function() {
                sendClientAction('action_onu_market', { action: 'buy', itemId: item.id, count: item.lotSize })
            }
        ))
    }

    list.add(ContextMenuItemClass.SEPARATOR)

    // Option Vendre 1
    list.add(new ContextMenuItemClass(
        ComponentClass.literal('§c▼ Vendre 1 unité §c(+' + item.sellPrice + ' R)'),
        resolveIcon('minecraft:gold_nugget'),
        function() {
            sendClientAction('action_onu_market', { action: 'sell', itemId: item.id, count: 1 })
        }
    ))

    // Option Vendre par Lot
    if (item.lotSize > 1) {
        var totalEarnings = item.sellPrice * item.lotSize
        list.add(new ContextMenuItemClass(
            ComponentClass.literal('§c▼ Vendre 1 Lot de ' + item.lotSize + ' §c(+' + totalEarnings + ' R)'),
            resolveIcon('minecraft:gold_ingot'),
            function() {
                sendClientAction('action_onu_market', { action: 'sell', itemId: item.id, count: item.lotSize })
            }
        ))
    }

    screen.openContextMenu(list)
    } catch (errCtx) {
        console.error('[FTB Client UI] Erreur dans showMarketItemContextMenu: ' + errCtx)
    }
}

// -----------------------------------------------------------------------------
// 2. ÉCRAN : TABLEAU DE BORD NATIONAL & BANQUE
// -----------------------------------------------------------------------------
function openNationDashboardScreen(nationData) {
    if (!nationData || nationData.hasNation === false || !nationData.nationName) {
        var screenNoNation = createButtonListScreen('🌍 Statut : Citoyen Indépendant', false, function(panel, self) {
            var btn1 = createTextButton(
                panel,
                '§e🚩 Fonder ou Rejoindre une Nation (Appuyez sur O)',
                'minecraft:white_banner',
                function(mBtn) {}
            )
            if (btn1) panel.add(btn1)

            var btn2 = createTextButton(
                panel,
                '§b🗺 Ouvrir la Carte des Territoires & Chunks (Touche M)',
                'minecraft:filled_map',
                function(mBtn) {}
            )
            if (btn2) panel.add(btn2)

            var btn3 = createTextButton(
                panel,
                '§7ℹ Vous êtes actuellement sans nation. Rejoignez une nation pour accéder à la banque et au territoire.',
                'minecraft:oak_sign',
                function(mBtn) {}
            )
            if (btn3) panel.add(btn3)
        })
        if (screenNoNation) screenNoNation.openGui()
        return
    }

    var screen = createButtonListScreen('🌍 Nation : ' + (nationData.nationName || 'Sans Nation'), false, function(panel, self) {
        // 1. CARTE BANQUE & TRÉSOR NATIONAL
        var bankTitle = '§6§l💰 Trésor Public : §a§l' + (nationData.bankBalance || '0 R')
        var bankBtn = createTextButton(
            panel,
            bankTitle,
            'minecraft:gold_block',
            function(mBtn) {
                showBankContextMenu(self, nationData)
            }
        )
        if (bankBtn) panel.add(bankBtn)

        // 2. CARTE CHUNKS & FISCALITÉ
        var taxStr = '§e🚩 Territoire : §f' + (nationData.chunkCount || 0) + ' chunks §8| §7Statut : §f' + (nationData.warStatus || 'En Paix')
        var chunkBtn = createTextButton(
            panel,
            taxStr,
            'minecraft:filled_map',
            function(mBtn) {}
        )
        if (chunkBtn) panel.add(chunkBtn)

        // 3. ACTIONS RAPIDES DE TÉLÉPORTATION
        var homeBtn = createTextButton(
            panel,
            '§a🏠 Se Téléporter au Home National (/nation home)',
            'minecraft:compass',
            function(mBtn) {
                sendClientAction('action_nation', { action: 'home' })
            }
        )
        if (homeBtn) panel.add(homeBtn)

        var setHomeBtn = createTextButton(
            panel,
            '§b📍 Définir le Home National (/nation sethome)',
            'minecraft:redstone_torch',
            function(mBtn) {
                sendClientAction('action_nation', { action: 'sethome' })
            }
        )
        if (setHomeBtn) panel.add(setHomeBtn)

        // 4. MEMBRES ET CITOYENS
        var members = nationData.members || []
        for (var m = 0; m < members.length; m++) {
            (function(mem) {
                var memTitle = '§7• §f' + mem.name + ' §8[' + (mem.rank || 'Membre') + '] ' + (mem.online ? '§a● En ligne' : '§8○ Absent')
                var memBtn = createTextButton(
                    panel,
                    memTitle,
                    'minecraft:player_head',
                    function(mBtn) {}
                )
                if (memBtn) panel.add(memBtn)
            })(members[m])
        }
    })

    if (screen) {
        screen.openGui()
    }
}

function showBankContextMenu(screen, nationData) {
    try {
        var list = new ArrayListClass()
        list.add(ContextMenuItemClass.title(ComponentClass.literal('§6§lOpérations Bancaires Nationales')))
        list.add(ContextMenuItemClass.SEPARATOR)

    list.add(new ContextMenuItemClass(
        ComponentClass.literal('§a📥 Déposer tout le cash tenu en main'),
        resolveIcon('minecraft:emerald'),
        function() {
            sendClientAction('action_nation_bank', { action: 'deposit_held' })
        }
    ))

    list.add(new ContextMenuItemClass(
        ComponentClass.literal('§a📥 Déposer tous les billets de l\'inventaire'),
        resolveIcon('minecraft:emerald_block'),
        function() {
            sendClientAction('action_nation_bank', { action: 'deposit_all' })
        }
    ))

    if (nationData.isOfficer) {
        list.add(ContextMenuItemClass.SEPARATOR)
        list.add(new ContextMenuItemClass(
            ComponentClass.literal('§c📤 Retirer 100 R (Ministres/Leader)'),
            resolveIcon('minecraft:redstone'),
            function() {
                sendClientAction('action_nation_bank', { action: 'withdraw', amount: 100 })
            }
        ))
        list.add(new ContextMenuItemClass(
            ComponentClass.literal('§c📤 Retirer 500 R (Ministres/Leader)'),
            resolveIcon('minecraft:redstone_block'),
            function() {
                sendClientAction('action_nation_bank', { action: 'withdraw', amount: 500 })
            }
        ))
    }

    screen.openContextMenu(list)
    } catch (errBank) {
        console.error('[FTB Client UI] Erreur dans showBankContextMenu: ' + errBank)
    }
}

// -----------------------------------------------------------------------------
// 3. ÉCRAN : ÉTAT DE GUERRE & SIÈGES
// -----------------------------------------------------------------------------
function openWarScreen(warData) {
    var screen = createButtonListScreen('⚔️ Registre de Guerre & Conflits', false, function(panel, self) {
        // 1. CARTE HORAIRES DE SIÈGE (RAID HOURS)
        var raidStatus = (warData && warData.raidHoursActive) ? '§a§lACTIVES (Pillage & Explosions Autorisés)' : '§c§lINACTIVES (Claims Invulnérables)'
        var raidTitle = '§6§l🛡️ Horaires de Siège : ' + raidStatus
        var raidBtn = createTextButton(
            panel,
            raidTitle,
            'minecraft:clock',
            function(mBtn) {}
        )
        if (raidBtn) panel.add(raidBtn)

        // 2. CONFLITS EN COURS
        var wars = (warData && warData.activeWars) || []
        if (wars.length === 0) {
            var noWarBtn = createTextButton(
                panel,
                '§7🕊️ Aucune guerre active sur le serveur. La paix règne.',
                'minecraft:white_tulip',
                function(mBtn) {}
            )
            if (noWarBtn) panel.add(noWarBtn)
        } else {
            for (var w = 0; w < wars.length; w++) {
                (function(war) {
                    var warStr = '§c⚔ §f' + war.attacker + ' §cVS §f' + war.defender + ' §8| §7Coalitions: ' + war.coalitionCount
                    var warItemBtn = createTextButton(
                        panel,
                        warStr,
                        'minecraft:iron_sword',
                        function(mBtn) {
                            showWarContextMenu(self, war)
                        }
                    )
                    if (warItemBtn) panel.add(warItemBtn)
                })(wars[w])
            }
        }

        // 3. DÉCLARATION DE GUERRE
        var declareBtn = createTextButton(
            panel,
            '§4⚔ Déclarer une Guerre Officielle (/war declare)',
            'minecraft:netherite_sword',
            function(mBtn) {
                sendClientAction('action_war', { action: 'prompt_declare' })
            }
        )
        if (declareBtn) panel.add(declareBtn)
    })

    if (screen) {
        screen.openGui()
    }
}

function showWarContextMenu(screen, war) {
    try {
        var list = new ArrayListClass()
        list.add(ContextMenuItemClass.title(ComponentClass.literal('§c§lTraité de Paix & Diplomatie')))
        list.add(ContextMenuItemClass.SEPARATOR)

    list.add(new ContextMenuItemClass(
        ComponentClass.literal('§a🕊 Proposer un Traité de Paix Bilatéral'),
        resolveIcon('minecraft:feather'),
        function() {
            sendClientAction('action_war', { action: 'peace', warId: war.id })
        }
    ))

    screen.openContextMenu(list)
    } catch (errWar) {
        console.error('[FTB Client UI] Erreur dans showWarContextMenu: ' + errWar)
    }
}

// -----------------------------------------------------------------------------
// 4. ÉCRAN : CONTRATS D'ÉTAT & MARCHÉS PUBLICS ONU
// -----------------------------------------------------------------------------
function openContractsScreen(contractData) {
    var screen = createButtonListScreen('📦 Appels d\'Offres Mondiaux de l\'ONU', false, function(panel, self) {
        if (!contractData || !contractData.title) {
            var emptyBtn = createTextButton(
                panel,
                '§7Aucun appel d\'offres actif pour le moment.',
                'minecraft:barrier',
                function(mBtn) {}
            )
            if (emptyBtn) panel.add(emptyBtn)
            return
        }

        // 1. CARTE CONTEXTE ET TITRE
        var headerBtn = createTextButton(
            panel,
            '§9§lMarché Public : §e' + contractData.title,
            'minecraft:writable_book',
            function(mBtn) {}
        )
        if (headerBtn) panel.add(headerBtn)

        // 2. RÉCOMPENSES
        var rewStr = '§2Prime Trésor : §a' + (contractData.nationReward || 0) + ' R §f| §ePrime Livreur : §6' + (contractData.driverCut || 0) + ' R'
        var rewardBtn = createTextButton(
            panel,
            rewStr,
            'minecraft:gold_block',
            function(mBtn) {}
        )
        if (rewardBtn) panel.add(rewardBtn)

        // 3. CARGAISONS REQUISES
        var items = contractData.items || []
        for (var c = 0; c < items.length; c++) {
            (function(req) {
                var isOk = req.current >= req.count
                var line = (isOk ? '§a✔ ' : '§c✘ ') + req.current + '/' + req.count + ' §f' + req.name
                var reqBtn = createTextButton(
                    panel,
                    line,
                    req.id,
                    function(mBtn) {}
                )
                if (reqBtn) panel.add(reqBtn)
            })(items[c])
        }

        // 4. BOUTON DE LIVRAISON DIRECTE
        var deliverBtn = createTextButton(
            panel,
            '§a🚚 Décharger la Marchandise & Encaisser les Primes',
            'minecraft:chest_minecart',
            function(mBtn) {
                sendClientAction('action_onu_contract', { action: 'deliver' })
            }
        )
        if (deliverBtn) panel.add(deliverBtn)
    })

    if (screen) {
        screen.openGui()
    }
}

// -----------------------------------------------------------------------------
// RÉCEPTION DES PAQUETS RÉSEAU DU SERVEUR
// -----------------------------------------------------------------------------
NetworkEvents.dataReceived('open_onu_market', function(event) {
    try {
        console.info('[FTB Client UI] Réception paquet open_onu_market')
        var data = event.data || event.getData()
        var jsonStr = data.getString ? data.getString('json') : String(data.get('json'))
        var payload = JSON.parse(jsonStr)
        openMarketScreen(payload)
    } catch (e) {
        console.error('[FTB Client UI] Erreur ouverture marché: ' + e)
    }
})

NetworkEvents.dataReceived('update_onu_market', function(event) {
    try {
        var data = event.data || event.getData()
        var jsonStr = data.getString ? data.getString('json') : String(data.get('json'))
        var payload = JSON.parse(jsonStr)
        if (currentMarketData) {
            currentMarketData.items = payload.items
            currentMarketData.playerCash = payload.playerCash
            if (activeMarketScreenInstance) {
                activeMarketScreenInstance.refreshWidgets()
            }
        }
    } catch (e) {
        console.error('[FTB Client UI] Erreur mise à jour marché: ' + e)
    }
})

NetworkEvents.dataReceived('open_nation_dashboard', function(event) {
    try {
        console.info('[FTB Client UI] Réception paquet open_nation_dashboard')
        var data = event.data || event.getData()
        var jsonStr = data.getString ? data.getString('json') : String(data.get('json'))
        var payload = JSON.parse(jsonStr)
        openNationDashboardScreen(payload)
    } catch (e) {
        console.error('[FTB Client UI] Erreur ouverture nation: ' + e)
    }
})

NetworkEvents.dataReceived('open_war_registry', function(event) {
    try {
        console.info('[FTB Client UI] Réception paquet open_war_registry')
        var data = event.data || event.getData()
        var jsonStr = data.getString ? data.getString('json') : String(data.get('json'))
        var payload = JSON.parse(jsonStr)
        openWarScreen(payload)
    } catch (e) {
        console.error('[FTB Client UI] Erreur ouverture guerre: ' + e)
    }
})

NetworkEvents.dataReceived('open_onu_contracts', function(event) {
    try {
        console.info('[FTB Client UI] Réception paquet open_onu_contracts')
        var data = event.data || event.getData()
        var jsonStr = data.getString ? data.getString('json') : String(data.get('json'))
        var payload = JSON.parse(jsonStr)
        openContractsScreen(payload)
    } catch (e) {
        console.error('[FTB Client UI] Erreur ouverture contrats: ' + e)
    }
})

NetworkEvents.dataReceived('show_toast', function(event) {
    try {
        var data = event.data || event.getData()
        var jsonStr = data.getString ? data.getString('json') : String(data.get('json'))
        var payload = JSON.parse(jsonStr)
        var title = ComponentClass.literal(payload.title || 'Third World')
        var sub = ComponentClass.literal(payload.message || '')
        if (payload.type === 'error') {
            SimpleToastClass.error(title, sub)
        } else {
            SimpleToastClass.info(title, sub)
        }
    } catch (e) {}
})

// -----------------------------------------------------------------------------
// MASQUAGE DES INFOBULLES DE CONVERSION SUR LES BILLETS (Robert Coins)
// Désactive le message "5 of these are worth 1 billet de 20..." de Lightman's Currency
// -----------------------------------------------------------------------------
try {
    var ItemTooltipEventClass = Java.loadClass('net.neoforged.neoforge.event.entity.player.ItemTooltipEvent')
    var EventPriorityClass = Java.loadClass('net.neoforged.bus.api.EventPriority')
    NativeEvents.onEvent(EventPriorityClass.LOWEST, ItemTooltipEventClass, function(event) {
        try {
            var stack = event.getItemStack()
            if (!stack || stack.isEmpty()) return
            var item = stack.getItem()
            var id = item ? String(item.toString()) : ''
            if (id.indexOf('billet_') !== -1) {
                var tooltip = event.getToolTip()
                if (tooltip && tooltip.size() > 1) {
                    for (var i = tooltip.size() - 1; i >= 1; i--) {
                        var lineComp = tooltip.get(i)
                        var lineStr = lineComp ? lineComp.getString().toLowerCase() : ''
                        if (lineStr.indexOf('worth') !== -1 ||
                            lineStr.indexOf('vaut') !== -1 ||
                            lineStr.indexOf('valent') !== -1 ||
                            lineStr.indexOf('of these') !== -1 ||
                            lineStr.indexOf('objets') !== -1 ||
                            lineStr.indexOf('billet') !== -1) {
                            tooltip.remove(i)
                        }
                    }
                }
            }
        } catch (err) {}
    })
} catch (eTooltip) {
    console.error('[FTB Client UI] Erreur lors de l\'enregistrement du masqueur de tooltip: ' + eTooltip)
}

