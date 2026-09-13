// priority: 40
// =============================================================================
// Third World Server Script - Bourse & Marché Mondial de l'ONU
// =============================================================================
// Système de shop serveur physique au Hub de l'ONU (0,0) avec cotations
// dynamiques selon l'offre et la demande (AMM), stocks finis, rééquilibrage
// périodique et intégration stricte des devises physiques (Lightman's Currency).
// =============================================================================

var ONU_MARKET_CONFIG = {
    hubX: (typeof TW_CONFIG !== 'undefined' && TW_CONFIG.general && TW_CONFIG.general.onu) ? TW_CONFIG.general.onu.hub.x : -204,
    hubZ: (typeof TW_CONFIG !== 'undefined' && TW_CONFIG.general && TW_CONFIG.general.onu) ? TW_CONFIG.general.onu.hub.z : -172,
    maxDistance: (typeof TW_CONFIG !== 'undefined' && TW_CONFIG.market && TW_CONFIG.market.market_settings) ? TW_CONFIG.market.market_settings.max_distance : 200,
    rebalanceIntervalTicks: (typeof TW_CONFIG !== 'undefined' && TW_CONFIG.market && TW_CONFIG.market.market_settings) ? TW_CONFIG.market.market_settings.rebalance_interval_ticks : 36000,
    spreadPercent: (typeof TW_CONFIG !== 'undefined' && TW_CONFIG.market && TW_CONFIG.market.market_settings) ? TW_CONFIG.market.market_settings.spread_percent : 30,
    rebalanceRate: (typeof TW_CONFIG !== 'undefined' && TW_CONFIG.market && TW_CONFIG.market.market_settings) ? TW_CONFIG.market.market_settings.rebalance_rate : 0.15
}

var ONU_NOTE_VALUES = (typeof TW_CONFIG !== 'undefined' && TW_CONFIG.general && TW_CONFIG.general.currency) ? TW_CONFIG.general.currency.notes : {
    'kubejs:billet_1': 1,
    'kubejs:billet_5': 5,
    'kubejs:billet_20': 20,
    'kubejs:billet_100': 100
}

// -----------------------------------------------------------------------------
// CATALOGUE OFFICIEL DES MATIÈRES PREMIÈRES ET RESSOURCES RARES (VIA CONFIG)
// -----------------------------------------------------------------------------
var ONU_MARKET_CATALOG = (typeof TW_CONFIG !== 'undefined' && TW_CONFIG.market && TW_CONFIG.market.catalog && TW_CONFIG.market.catalog.length > 0)
    ? TW_CONFIG.market.catalog
    : [

    // --- Ligne 1 : Minerais, Poudres et Roches de Base ---
    {
        id: 'minecraft:sand',
        name: 'Sable Fin',
        desc: 'Essentiel pour le verre et le béton, gisement non renouvelable.',
        targetStock: 1024,
        currentStock: 1024,
        basePrice: 2,
        minPrice: 1,
        maxPrice: 6,
        lotSize: 32,
        slotCol: 1,
        slotRow: 1
    },
    {
        id: 'minecraft:clay_ball',
        name: 'Boule d\'Argile',
        desc: 'Matériau de construction pour briques, céramiques et terracottas.',
        targetStock: 512,
        currentStock: 512,
        basePrice: 3,
        minPrice: 1,
        maxPrice: 8,
        lotSize: 16,
        slotCol: 2,
        slotRow: 1
    },
    {
        id: 'minecraft:quartz',
        name: 'Quartz du Nether',
        desc: 'Composant électronique pour comparateurs, capteurs et finitions.',
        targetStock: 512,
        currentStock: 512,
        basePrice: 5,
        minPrice: 2,
        maxPrice: 15,
        lotSize: 16,
        slotCol: 3,
        slotRow: 1
    },
    {
        id: 'minecraft:raw_iron',
        name: 'Fer Brut',
        desc: 'Métal industriel fondamental pour rails, machines et armatures.',
        targetStock: 512,
        currentStock: 512,
        basePrice: 4,
        minPrice: 2,
        maxPrice: 12,
        lotSize: 16,
        slotCol: 4,
        slotRow: 1
    },
    {
        id: 'minecraft:raw_copper',
        name: 'Cuivre Brut',
        desc: 'Conducteur électrique et composant pour alliages de laiton.',
        targetStock: 512,
        currentStock: 512,
        basePrice: 3,
        minPrice: 1,
        maxPrice: 8,
        lotSize: 16,
        slotCol: 5,
        slotRow: 1
    },
    {
        id: 'minecraft:coal',
        name: 'Charbon Minéral',
        desc: 'Combustible fossile standard pour hauts fourneaux et chaudières.',
        targetStock: 512,
        currentStock: 512,
        basePrice: 2,
        minPrice: 1,
        maxPrice: 6,
        lotSize: 16,
        slotCol: 6,
        slotRow: 1
    },
    {
        id: 'minecraft:redstone',
        name: 'Poudre de Redstone',
        desc: 'Matière conductrice pour l\'automatisation et signaux logiques.',
        targetStock: 512,
        currentStock: 512,
        basePrice: 3,
        minPrice: 1,
        maxPrice: 9,
        lotSize: 16,
        slotCol: 7,
        slotRow: 1
    },

    // --- Ligne 2 : Composants Rares & Produits Avancés ---
    {
        id: 'minecraft:glowstone_dust',
        name: 'Poudre de Glowstone',
        desc: 'Poudre luminescente pour câblages d\'énergie et optiques.',
        targetStock: 384,
        currentStock: 384,
        basePrice: 4,
        minPrice: 2,
        maxPrice: 12,
        lotSize: 16,
        slotCol: 1,
        slotRow: 2
    },
    {
        id: 'minecraft:obsidian',
        name: 'Roche d\'Obsidienne',
        desc: 'Matériau ignifugé à haute densité résistant aux explosions.',
        targetStock: 256,
        currentStock: 256,
        basePrice: 8,
        minPrice: 4,
        maxPrice: 24,
        lotSize: 8,
        slotCol: 2,
        slotRow: 2
    },
    {
        id: 'minecraft:leather',
        name: 'Cuir Tanné',
        desc: 'Matière première d\'équipement, sacs et harnachements.',
        targetStock: 256,
        currentStock: 256,
        basePrice: 6,
        minPrice: 2,
        maxPrice: 18,
        lotSize: 16,
        slotCol: 3,
        slotRow: 2
    },
    {
        id: 'minecraft:slime_ball',
        name: 'Boule de Slime',
        desc: 'Polymère visqueux pour pistons collants et colle mécanique.',
        targetStock: 256,
        currentStock: 256,
        basePrice: 8,
        minPrice: 3,
        maxPrice: 25,
        lotSize: 8,
        slotCol: 4,
        slotRow: 2
    },
    {
        id: 'minecraft:ender_pearl',
        name: 'Perle de l\'Ender',
        desc: 'Artefact dimensionnel pour propulsion et téléportation tactique.',
        targetStock: 128,
        currentStock: 128,
        basePrice: 15,
        minPrice: 5,
        maxPrice: 45,
        lotSize: 4,
        slotCol: 5,
        slotRow: 2
    },
    {
        id: 'minecraft:blaze_rod',
        name: 'Bâton de Blaze',
        desc: 'Source d\'énergie thermique extrême pour alchimie et générateurs.',
        targetStock: 128,
        currentStock: 128,
        basePrice: 20,
        minPrice: 8,
        maxPrice: 60,
        lotSize: 4,
        slotCol: 6,
        slotRow: 2
    },
    {
        id: 'minecraft:ghast_tear',
        name: 'Larme de Ghast',
        desc: 'Composant alchimique rare à haute régénération vitale.',
        targetStock: 64,
        currentStock: 64,
        basePrice: 45,
        minPrice: 18,
        maxPrice: 120,
        lotSize: 2,
        slotCol: 7,
        slotRow: 2
    },

    // --- Ligne 3 : Exclusivité Stratégique de l'ONU (Inobtenable autrement) ---
    {
        id: 'minecraft:netherite_upgrade_smithing_template',
        name: '🌟 Modèle de Forge Netherite',
        desc: 'Technologie d\'alliage Netherite scellée par l\'ONU. Inobtenable sur la carte.',
        targetStock: 4,
        currentStock: 4,
        basePrice: 2500,
        minPrice: 1500,
        maxPrice: 6000,
        lotSize: 1,
        slotCol: 4,
        slotRow: 3
    }
]

// -----------------------------------------------------------------------------
// PERSISTANCE & GESTION DES DONNÉES
// -----------------------------------------------------------------------------
var MARKET_DATA_CACHE = null

function getMarketCatalogItem(itemId) {
    for (var i = 0; i < ONU_MARKET_CATALOG.length; i++) {
        if (ONU_MARKET_CATALOG[i].id === itemId) {
            return ONU_MARKET_CATALOG[i]
        }
    }
    return null
}

function loadMarketState() {
    if (MARKET_DATA_CACHE !== null) return MARKET_DATA_CACHE

    var data = null
    if (typeof readJsonData === 'function') {
        data = readJsonData('onu_market_data.json')
    }

    if (!data || typeof data !== 'object') {
        data = { stocks: {}, lastRebalance: Date.now() }
    }
    if (!data.stocks) data.stocks = {}

    // Synchroniser les stocks avec le catalogue en mémoire
    for (var i = 0; i < ONU_MARKET_CATALOG.length; i++) {
        var item = ONU_MARKET_CATALOG[i]
        if (typeof data.stocks[item.id] === 'number') {
            item.currentStock = Math.max(0, Math.floor(data.stocks[item.id]))
        } else {
            data.stocks[item.id] = item.targetStock
            item.currentStock = item.targetStock
        }
    }

    MARKET_DATA_CACHE = data
    return MARKET_DATA_CACHE
}

function saveMarketState() {
    if (!MARKET_DATA_CACHE) MARKET_DATA_CACHE = { stocks: {}, lastRebalance: Date.now() }
    if (!MARKET_DATA_CACHE.stocks) MARKET_DATA_CACHE.stocks = {}

    for (var i = 0; i < ONU_MARKET_CATALOG.length; i++) {
        var item = ONU_MARKET_CATALOG[i]
        MARKET_DATA_CACHE.stocks[item.id] = item.currentStock
    }

    if (typeof writeJsonData === 'function') {
        writeJsonData('onu_market_data.json', MARKET_DATA_CACHE)
    }
}

// -----------------------------------------------------------------------------
// MOTEUR ÉCONOMIQUE & CALCUL DYNAMIQUE DES COURS (AMM)
// -----------------------------------------------------------------------------
/**
 * Calcule le cours d'achat, de rachat et la tendance actuelle d'un article
 */
function getMarketItemPricing(itemId) {
    var item = getMarketCatalogItem(itemId)
    if (!item) return null

    loadMarketState()

    var cur = item.currentStock
    var tgt = item.targetStock
    var ratio = tgt / Math.max(1, cur)

    // Formule non-linéaire (AMM bornée) : P = P0 * (S0 / S)^0.75
    var rawBuy = Math.round(item.basePrice * Math.pow(ratio, 0.75))
    var buyPrice = Math.max(item.minPrice, Math.min(item.maxPrice, rawBuy))

    // Spread commercial (30% de marge de régulation)
    var spreadFactor = (100 - ONU_MARKET_CONFIG.spreadPercent) / 100
    var rawSell = Math.floor(buyPrice * spreadFactor)
    var sellPrice = Math.max(1, Math.min(buyPrice, rawSell))

    var trendText = '§e▬ Équilibré (Stable)'
    var trendColor = '§e'
    if (cur < tgt) {
        trendText = '§c▲ En hausse (Forte demande / Pénurie)'
        trendColor = '§c'
    } else if (cur > tgt) {
        trendText = '§a▼ En baisse (Excédent / Surproduction)'
        trendColor = '§a'
    }

    return {
        item: item,
        currentStock: cur,
        targetStock: tgt,
        buyPrice: buyPrice,
        sellPrice: sellPrice,
        trendText: trendText,
        trendColor: trendColor,
        lotSize: item.lotSize
    }
}

/**
 * Rééquilibrage périodique automatique des stocks vers la cible
 */
function rebalanceMarketStocks(server, silent) {
    loadMarketState()
    var changes = 0

    for (var i = 0; i < ONU_MARKET_CATALOG.length; i++) {
        var it = ONU_MARKET_CATALOG[i]
        var diff = it.targetStock - it.currentStock
        if (diff !== 0) {
            var step = Math.round(diff * ONU_MARKET_CONFIG.rebalanceRate)
            if (diff > 0 && step === 0) step = 1
            if (diff < 0 && step === 0) step = -1
            it.currentStock += step
            changes++
        }
    }

    saveMarketState()

    if (!silent && server) {
        try {
            var ComponentClass = Java.loadClass('net.minecraft.network.chat.Component')
            var msg = ComponentClass.literal('§8[§bONU§8] §7La Bourse Centrale a actualisé ses cotations. Les stocks mondiaux ont été rééquilibrés.')
            server.getPlayerList().broadcastSystemMessage(msg, false)
        } catch (be) {}
    }
    return changes
}

// -----------------------------------------------------------------------------
// VÉRIFICATION D'ACCÈS PHYSIQUE AU HUB DE L'ONU
// -----------------------------------------------------------------------------
function isPlayerInOnuMarketZone(player) {
    if (!player) return false
    try {
        if (player.hasPermissions && player.hasPermissions(2)) return true
        if (player.hasPermission && player.hasPermission(2)) return true
        if (player.isCreative && player.isCreative()) return true

        var dimStr = 'minecraft:overworld'
        if (typeof getEntityDimensionId === 'function') {
            dimStr = String(getEntityDimensionId(player)).toLowerCase()
        } else {
            var lvl = player.level ? (typeof player.level === 'function' ? player.level() : player.level) : null
            if (lvl && lvl.dimension) {
                var d = typeof lvl.dimension === 'function' ? lvl.dimension() : lvl.dimension
                dimStr = String(d.location ? d.location() : d).toLowerCase()
            }
        }

        if (dimStr.indexOf('overworld') === -1) return false

        var px = Number(player.getX ? player.getX() : player.x)
        var pz = Number(player.getZ ? player.getZ() : player.z)
        var hx = (ONU_MARKET_CONFIG.hubX !== undefined) ? ONU_MARKET_CONFIG.hubX : -204
        var hz = (ONU_MARKET_CONFIG.hubZ !== undefined) ? ONU_MARKET_CONFIG.hubZ : -172
        var dx = px - hx
        var dz = pz - hz
        var maxD = ONU_MARKET_CONFIG.maxDistance || 200
        var distSq = dx * dx + dz * dz
        return distSq <= (maxD * maxD)
    } catch (e) {
        console.error('[ONU Market] Erreur verification zone: ' + e)
    }
    return false
}

// -----------------------------------------------------------------------------
// GESTION SÉCURISÉE DES BILLETS & INVENTAIRE DU JOUEUR
// -----------------------------------------------------------------------------
function getMarketItemIdFromStack(stack) {
    if (!stack || stack.isEmpty()) return ''
    try {
        if (stack.getId) return String(stack.getId())
        if (stack.id) return String(stack.id)
        if (stack.getItem) {
            var item = stack.getItem()
            if (item && item.kjs$getId) return String(item.kjs$getId())
            var BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
            if (BuiltInRegistries && BuiltInRegistries.ITEM) {
                return BuiltInRegistries.ITEM.getKey(item).toString()
            }
        }
    } catch (e) {}
    return ''
}

function marketCountPlayerItem(player, itemId) {
    if (!player || !itemId) return 0
    var count = 0
    try {
        var inv = player.getInventory ? player.getInventory() : player.inventory
        if (!inv) return 0
        var size = inv.getContainerSize ? inv.getContainerSize() : 36
        for (var i = 0; i < size; i++) {
            var stack = inv.getItem(i)
            if (stack && !stack.isEmpty()) {
                var sId = getMarketItemIdFromStack(stack)
                if (sId === itemId) {
                    var c = stack.getCount ? stack.getCount() : stack.count
                    count += (c || 0)
                }
            }
        }
    } catch (e) {}
    return count
}

function marketRemovePlayerItem(player, itemId, countToRemove) {
    if (!player || !itemId || countToRemove <= 0) return
    var remaining = countToRemove
    try {
        var inv = player.getInventory ? player.getInventory() : player.inventory
        if (!inv) return
        var size = inv.getContainerSize ? inv.getContainerSize() : 36
        for (var i = 0; i < size && remaining > 0; i++) {
            var stack = inv.getItem(i)
            if (stack && !stack.isEmpty()) {
                var sId = getMarketItemIdFromStack(stack)
                if (sId === itemId) {
                    var curCount = stack.getCount ? stack.getCount() : stack.count
                    var take = Math.min(curCount, remaining)
                    if (stack.shrink) {
                        stack.shrink(take)
                    } else if (stack.setCount) {
                        stack.setCount(curCount - take)
                    }
                    remaining -= take
                }
            }
        }
    } catch (e) {}
}

function marketCountPlayerCash(player) {
    if (!player) return 0
    var total = 0
    try {
        var inv = player.getInventory ? player.getInventory() : player.inventory
        if (!inv) return 0
        var size = inv.getContainerSize ? inv.getContainerSize() : 36
        for (var i = 0; i < size; i++) {
            var stack = inv.getItem(i)
            if (stack && !stack.isEmpty()) {
                var sId = getMarketItemIdFromStack(stack)
                var val = ONU_NOTE_VALUES[sId]
                if (val) {
                    var c = stack.getCount ? stack.getCount() : stack.count
                    total += (c || 0) * val
                }
            }
        }
    } catch (e) {}
    return total
}

function marketGiveBanknotes(player, amount) {
    if (!player || amount <= 0) return
    var rem = amount
    var n100 = Math.floor(rem / 100)
    rem %= 100
    var n20 = Math.floor(rem / 20)
    rem %= 20
    var n5 = Math.floor(rem / 5)
    rem %= 5
    var n1 = rem

    if (n100 > 0) player.give(Item.of('kubejs:billet_100', n100))
    if (n20 > 0) player.give(Item.of('kubejs:billet_20', n20))
    if (n5 > 0) player.give(Item.of('kubejs:billet_5', n5))
    if (n1 > 0) player.give(Item.of('kubejs:billet_1', n1))
}

function marketDeductPlayerCash(player, amount) {
    if (!player || amount <= 0) return true
    var currentCash = marketCountPlayerCash(player)
    if (currentCash < amount) return false

    var needed = amount
    var n1 = marketCountPlayerItem(player, 'kubejs:billet_1')
    var n5 = marketCountPlayerItem(player, 'kubejs:billet_5')
    var n20 = marketCountPlayerItem(player, 'kubejs:billet_20')
    var n100 = marketCountPlayerItem(player, 'kubejs:billet_100')

    var spend100 = Math.min(n100, Math.floor(needed / 100))
    needed -= spend100 * 100

    var spend20 = Math.min(n20, Math.floor(needed / 20))
    needed -= spend20 * 20

    var spend5 = Math.min(n5, Math.floor(needed / 5))
    needed -= spend5 * 5

    var spend1 = Math.min(n1, needed)
    needed -= spend1

    var changeToGive = 0
    if (needed > 0) {
        if (n5 > spend5 && (5 - needed) >= 0) {
            spend5++
            changeToGive = 5 - needed
            needed = 0
        } else if (n20 > spend20) {
            spend20++
            changeToGive = 20 - needed
            needed = 0
        } else if (n100 > spend100) {
            spend100++
            changeToGive = 100 - needed
            needed = 0
        } else {
            // Rachat global en dernier recours si combinaison atypique
            marketRemovePlayerItem(player, 'kubejs:billet_1', n1)
            marketRemovePlayerItem(player, 'kubejs:billet_5', n5)
            marketRemovePlayerItem(player, 'kubejs:billet_20', n20)
            marketRemovePlayerItem(player, 'kubejs:billet_100', n100)
            marketGiveBanknotes(player, currentCash - amount)
            return true
        }
    }

    if (spend100 > 0) marketRemovePlayerItem(player, 'kubejs:billet_100', spend100)
    if (spend20 > 0) marketRemovePlayerItem(player, 'kubejs:billet_20', spend20)
    if (spend5 > 0) marketRemovePlayerItem(player, 'kubejs:billet_5', spend5)
    if (spend1 > 0) marketRemovePlayerItem(player, 'kubejs:billet_1', spend1)

    if (changeToGive > 0) {
        marketGiveBanknotes(player, changeToGive)
    }
    return true
}

// -----------------------------------------------------------------------------
// TRANSACTIONS COMMERCIALES (ACHAT & VENTE)
// -----------------------------------------------------------------------------
function sendMarketUpdateToPlayer(player) {
    if (!player) return
    try {
        var catalogData = []
        for (var i = 0; i < ONU_MARKET_CATALOG.length; i++) {
            var it = ONU_MARKET_CATALOG[i]
            var pricing = getMarketItemPricing(it.id)
            catalogData.push({
                id: it.id,
                name: it.name,
                desc: it.desc,
                currentStock: it.currentStock,
                targetStock: it.targetStock,
                buyPrice: pricing.buyPrice,
                sellPrice: pricing.sellPrice,
                trendText: pricing.trendText,
                trendColor: pricing.trendColor,
                lotSize: it.lotSize
            })
        }

        var payload = {
            items: catalogData,
            playerCash: marketCountPlayerCash(player)
        }

        var jsonStr = JSON.stringify(payload)
        player.sendData('update_onu_market', { json: jsonStr })
    } catch (e) {
        console.error('[ONU Market] Erreur envoi mise a jour: ' + e)
    }
}

function executeMarketBuy(player, itemId, quantity) {
    if (!player) return
    if (!isPlayerInOnuMarketZone(player)) {
        player.tell(Text.of('§8[§bONU§8] §cAccès refusé : Le Marché et la Bourse Mondiale de l\'ONU sont situés physiquement au complexe de l\'ONU (-204, -172).'))
        player.tell(Text.of('§8[§bONU§8] §7Rendez-vous sur place pour négocier.'))
        try { player.playSound('minecraft:block.chest.locked', 1.0, 1.0) } catch (e) {}
        return
    }

    var pricing = getMarketItemPricing(itemId)
    if (!pricing) return

    var item = pricing.item
    if (item.currentStock < quantity) {
        player.tell(Text.of('§8[§bONU§8] §cStock insuffisant ! Il ne reste que §e' + item.currentStock + ' §cunité(s) disponible(s) en réserve.'))
        try {
            player.playSound('minecraft:block.chest.locked', 1.0, 1.0)
            player.sendData('show_toast', { json: JSON.stringify({ type: 'error', title: 'Stock Insuffisant', message: 'Il ne reste que ' + item.currentStock + ' unités.' }) })
        } catch (e2) {}
        return
    }

    var totalCost = pricing.buyPrice * quantity
    var playerCash = marketCountPlayerCash(player)
    if (playerCash < totalCost) {
        player.tell(Text.of('§8[§bONU§8] §cSolde insuffisant ! Requis : §e' + totalCost + ' R §c(Vous possédez : §e' + playerCash + ' R§c)'))
        try {
            player.playSound('minecraft:block.chest.locked', 1.0, 1.0)
            player.sendData('show_toast', { json: JSON.stringify({ type: 'error', title: 'Solde Insuffisant', message: 'Requis: ' + totalCost + ' R (Vous avez: ' + playerCash + ' R)' }) })
        } catch (e3) {}
        return
    }

    // Débit du cash et livraison de l'article
    marketDeductPlayerCash(player, totalCost)
    item.currentStock -= quantity
    saveMarketState()

    player.give(Item.of(itemId, quantity))
    try {
        player.playSound('minecraft:entity.experience_orb.pickup', 1.0, 1.2)
        player.sendData('show_toast', { json: JSON.stringify({ type: 'info', title: 'Achat Réussi', message: quantity + 'x ' + item.name + ' (' + totalCost + ' R)' }) })
    } catch (e4) {}

    var remainingCash = marketCountPlayerCash(player)
    player.tell(Text.of('§8[§bONU§8] §a✔ Achat effectué : §f' + quantity + 'x ' + item.name + ' §apour §e' + totalCost + ' R §7(Nouveau solde: §e' + remainingCash + ' R§7)'))

    sendMarketUpdateToPlayer(player)
}

function executeMarketSell(player, itemId, quantity) {
    if (!player) return
    if (!isPlayerInOnuMarketZone(player)) {
        player.tell(Text.of('§8[§bONU§8] §cAccès refusé : Le Marché et la Bourse Mondiale de l\'ONU sont situés physiquement au complexe de l\'ONU (-204, -172).'))
        player.tell(Text.of('§8[§bONU§8] §7Rendez-vous sur place pour négocier.'))
        try { player.playSound('minecraft:block.chest.locked', 1.0, 1.0) } catch (e) {}
        return
    }

    var pricing = getMarketItemPricing(itemId)
    if (!pricing) return

    var item = pricing.item
    var itemCount = marketCountPlayerItem(player, itemId)
    if (itemCount < quantity) {
        player.tell(Text.of('§8[§bONU§8] §cMarchandise manquante ! Vous n\'avez que §e' + itemCount + ' §csur les §e' + quantity + ' §crequis.'))
        try {
            player.playSound('minecraft:block.chest.locked', 1.0, 1.0)
            player.sendData('show_toast', { json: JSON.stringify({ type: 'error', title: 'Article Manquant', message: 'Requis: ' + quantity + ' (Vous avez: ' + itemCount + ')' }) })
        } catch (e2) {}
        return
    }

    var totalEarnings = pricing.sellPrice * quantity

    marketRemovePlayerItem(player, itemId, quantity)
    item.currentStock += quantity
    saveMarketState()

    marketGiveBanknotes(player, totalEarnings)
    try {
        player.playSound('minecraft:entity.experience_orb.pickup', 1.0, 0.9)
        player.sendData('show_toast', { json: JSON.stringify({ type: 'info', title: 'Vente Validée', message: '+' + totalEarnings + ' R (' + quantity + 'x ' + item.name + ')' }) })
    } catch (e3) {}

    var newCash = marketCountPlayerCash(player)
    player.tell(Text.of('§8[§bONU§8] §c✔ Vente validée : §f' + quantity + 'x ' + item.name + ' §crachetés par l\'ONU pour §a+' + totalEarnings + ' R §7(Nouveau solde: §e' + newCash + ' R§7)'))

    sendMarketUpdateToPlayer(player)
}

function openMarketGUI(player) {
    if (!player) return
    var inZone = isPlayerInOnuMarketZone(player)
    if (!inZone) {
        player.tell(Text.of('§8[§bONU§8] §eOuverture du Marché en Mode Consultation à Distance.'))
        player.tell(Text.of('§8[§bONU§8] §7Pour acheter ou vendre physiquement, rendez-vous au Hub ONU (-204, -172).'))
    }

    loadMarketState()

    var catalogData = []
    for (var i = 0; i < ONU_MARKET_CATALOG.length; i++) {
        var it = ONU_MARKET_CATALOG[i]
        var pricing = getMarketItemPricing(it.id)
        catalogData.push({
            id: it.id,
            name: it.name,
            desc: it.desc,
            currentStock: it.currentStock,
            targetStock: it.targetStock,
            buyPrice: pricing.buyPrice,
            sellPrice: pricing.sellPrice,
            trendText: pricing.trendText,
            trendColor: pricing.trendColor,
            lotSize: it.lotSize
        })
    }

    var payload = {
        inZone: inZone,
        items: catalogData,
        playerCash: marketCountPlayerCash(player),
        rebalanceRate: ONU_MARKET_CONFIG.rebalanceRate,
        spreadPercent: ONU_MARKET_CONFIG.spreadPercent
    }

    var jsonStr = JSON.stringify(payload)
    player.sendData('open_onu_market', { json: jsonStr })
    return 1
}

// -----------------------------------------------------------------------------
// GESTION DES ACTIONS RÉSEAU DE LA BOURSE
// -----------------------------------------------------------------------------
NetworkEvents.dataReceived('action_onu_market', function(event) {
    try {
        var player = event.player || event.getEntity()
        if (!player) return

        var data = event.data || event.getData()
        var raw = data.getString ? data.getString('json') : String(data.get('json'))
        if (!raw) return
        var action = JSON.parse(raw)

        if (action.action === 'buy') {
            executeMarketBuy(player, action.itemId, action.count || 1)
        } else if (action.action === 'sell') {
            executeMarketSell(player, action.itemId, action.count || 1)
        }
    } catch (e) {
        console.error('[ONU Market] Erreur reception action: ' + e)
    }
})

// -----------------------------------------------------------------------------
// DÉTECTION PNJ MARCHÉ & BOURSE
// -----------------------------------------------------------------------------
function isEntityMarketNpc(target) {
    if (!target) return false
    try {
        var cn = ''
        if (target.getCustomName && target.getCustomName()) {
            cn = target.getCustomName().getString().toLowerCase()
        }
        if (cn.indexOf('bourse') !== -1 || cn.indexOf('courtier') !== -1 || cn.indexOf('march') !== -1 || cn.indexOf('trader') !== -1 || cn.indexOf('market') !== -1 || cn.indexOf('shop') !== -1) {
            return true
        }
        if (target.getTags) {
            var tags = target.getTags()
            if (tags && (tags.contains('ONU_Bourse') || tags.contains('ONU_Marche') || tags.contains('bourse') || tags.contains('marche'))) {
                return true
            }
        }
    } catch (e) {}
    return false
}

try {
    NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$EntityInteract'), function(event) {
        try {
            var target = event.getTarget()
            var player = event.getEntity()
            if (!target || !player) return

            if (isEntityMarketNpc(target)) {
                event.setCanceled(true)
                try {
                    var InteractionResult = Java.loadClass('net.minecraft.world.InteractionResult')
                    if (InteractionResult && InteractionResult.SUCCESS) {
                        event.setCancellationResult(InteractionResult.SUCCESS)
                    }
                } catch (re) {}

                var handStr = ''
                try {
                    if (event.getHand) handStr = event.getHand().name()
                } catch (he) {}

                if (handStr === 'MAIN_HAND' || handStr === '') {
                    openMarketGUI(player)
                }
            }
        } catch (err) {}
    })
} catch (ne) {}

try {
    NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$EntityInteractSpecific'), function(event) {
        try {
            var target = event.getTarget()
            var player = event.getEntity()
            if (!target || !player) return

            if (isEntityMarketNpc(target)) {
                event.setCanceled(true)
                try {
                    var InteractionResult = Java.loadClass('net.minecraft.world.InteractionResult')
                    if (InteractionResult && InteractionResult.SUCCESS) {
                        event.setCancellationResult(InteractionResult.SUCCESS)
                    }
                } catch (re) {}

                var handStr = ''
                try {
                    if (event.getHand) handStr = event.getHand().name()
                } catch (he) {}

                if (handStr === 'MAIN_HAND' || handStr === '') {
                    openMarketGUI(player)
                }
            }
        } catch (err) {}
    })
} catch (ne2) {}

ItemEvents.entityInteracted(function(event) {
    try {
        var target = event.target
        var player = event.player
        if (!target || !player) return

        if (isEntityMarketNpc(target)) {
            event.cancel()
            openMarketGUI(player)
        }
    } catch (e) {}
})

// -----------------------------------------------------------------------------
// CYCLE PÉRIODIQUE DE RÉÉQUILIBRAGE VIA MASTER SCHEDULER (30 MINUTES)
// -----------------------------------------------------------------------------
if (typeof TW_Scheduler !== 'undefined' && TW_Scheduler.register) {
    TW_Scheduler.register('onu_market_rebalance', ONU_MARKET_CONFIG.rebalanceIntervalTicks || 36000, function(server) {
        rebalanceMarketStocks(server, false)
    })
}

ServerEvents.loaded(function(event) {
    loadMarketState()
})

