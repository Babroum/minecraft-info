// priority: 50
// =============================================================================
// Third World Server Script - Marché Mondial de l'ONU & Appels d'Offres d'État
// =============================================================================

var ONU_HUB_CONFIG = {
    x: -204,
    z: -172,
    interactionRadius: 50,     // Rayon d'interaction physique avec le guichet de l'ONU (50 blocs)
    restrictedRadius: 200      // Rayon d'interdiction de téléportation
}

// -----------------------------------------------------------------------------
// CONFIGURATION DES APPELS D'OFFRES RÉGULIERS (CYCLE 3 HEURES)
// -----------------------------------------------------------------------------
var DEFAULT_REGULAR_CONFIG = {
    cooldownMinutes: 180,
    interactionRadius: 50,
    rerollImmediatelyOnCompletion: false,
    contracts: [
        {
            id: 'CT-METALLURGIE-1',
            title: 'Programme Ferroviaire Transcontinental',
            lore: 'L\'ONU requiert des aciers lourds et rails pour relier les continents.',
            reward: 3200,
            driverCutPercent: 10,
            items: [
                { id: 'mekanism:ingot_steel', count: 128, name: "Lingot d'Acier" },
                { id: 'create:track', count: 64, name: "Voie Ferrée Create" }
            ]
        },
        {
            id: 'CT-MECANIQUE-1',
            title: 'Modernisation Industrielle & Automates',
            lore: 'Fourniture de mécanismes de haute précision pour les centrales publiques.',
            reward: 3800,
            driverCutPercent: 10,
            items: [
                { id: 'create:precision_mechanism', count: 32, name: "Mécanisme de Précision" },
                { id: 'create:brass_sheet', count: 64, name: "Plaque de Laiton" }
            ]
        },
        {
            id: 'CT-AGRO-1',
            title: 'Aide Alimentaire Humanitaire',
            lore: 'Constitution de réserves d\'urgence en vivres compressées.',
            reward: 2600,
            driverCutPercent: 15,
            items: [
                { id: 'farmersdelight:rice_bag', count: 32, name: "Sac de Riz" },
                { id: 'farmersdelight:tomato_crate', count: 32, name: "Caisse de Tomates" },
                { id: 'farmersdelight:onion_crate', count: 32, name: "Caisse d'Oignons" }
            ]
        },
        {
            id: 'CT-METALLURGIE-2',
            title: 'Développement Électronique & Réseaux',
            lore: 'Achat de circuits électroniques et métaux rares.',
            reward: 4200,
            driverCutPercent: 10,
            items: [
                { id: 'mekanism:basic_control_circuit', count: 32, name: "Circuit de Contrôle de Base" },
                { id: 'mekanism:ingot_osmium', count: 64, name: "Lingot d'Osmium" }
            ]
        },
        {
            id: 'CT-AGRO-2',
            title: 'Plan Mondial Contre la Famine',
            lore: 'Approvisionnement massif en féculents et légumes de conservation.',
            reward: 2500,
            driverCutPercent: 15,
            items: [
                { id: 'farmersdelight:potato_crate', count: 32, name: "Caisse de Pommes de Terre" },
                { id: 'farmersdelight:carrot_crate', count: 32, name: "Caisse de Carottes" },
                { id: 'farmersdelight:cabbage_crate', count: 32, name: "Caisse de Choux" }
            ]
        },
        {
            id: 'CT-DEFENSE-1',
            title: 'Blindage des Zones Sécurisées',
            lore: 'Laminage de tôles blindées pour la fortification des bases neutres.',
            reward: 4500,
            driverCutPercent: 10,
            items: [
                { id: 'create:sturdy_sheet', count: 48, name: "Tôle d'Obsidienne Robuste" },
                { id: 'mekanism:ingot_steel', count: 96, name: "Lingot d'Acier" }
            ]
        },
        {
            id: 'CT-ENERGIE-1',
            title: 'Infrastructure Électrique Haute Tension',
            lore: 'Achat massif de cuivre raffiné pour les transformateurs mondiaux.',
            reward: 3600,
            driverCutPercent: 10,
            items: [
                { id: 'minecraft:copper_block', count: 64, name: "Bloc de Cuivre" },
                { id: 'mekanism:alloy_infused', count: 32, name: "Alliage Imprégné" }
            ]
        }
    ]
}

function loadRegularConfig() {
    var cfg = readJsonData('onu_regular_config.json')
    if (cfg && cfg.contracts && Array.isArray(cfg.contracts) && cfg.contracts.length > 0) {
        return cfg
    }
    writeJsonData('onu_regular_config.json', DEFAULT_REGULAR_CONFIG)
    return DEFAULT_REGULAR_CONFIG
}

function loadActiveContract() {
    var data = readJsonData('active_onu_contract.json')
    if (data && typeof data === 'object' && data.id) {
        return data
    }
    return {}
}

function saveActiveContract(data) {
    writeJsonData('active_onu_contract.json', data || {})
}

function pickRegularContract(cfg, previousId) {
    var list = (cfg && cfg.contracts) ? cfg.contracts : DEFAULT_REGULAR_CONFIG.contracts
    if (!list || list.length === 0) return null
    if (list.length === 1) return list[0]
    var candidates = []
    for (var i = 0; i < list.length; i++) {
        if (list[i].id !== previousId) candidates.push(list[i])
    }
    if (candidates.length === 0) candidates = list
    var idx = Math.floor(Math.random() * candidates.length)
    return candidates[idx]
}

/**
 * Lance un nouveau contrat d'État régulier au hasard (cycle de 3 heures)
 */
function rollNewOnuContract(server, announce) {
    var cfg = loadRegularConfig()
    var current = loadActiveContract()
    var prevId = current.templateId || current.id
    var template = pickRegularContract(cfg, prevId)
    if (!template) return null

    var now = Date.now()
    var cooldownMs = (cfg.cooldownMinutes || 180) * 60 * 1000

    var newContract = {
        id: template.id + '-' + Math.floor(Math.random() * 900 + 100),
        templateId: template.id,
        title: template.title,
        lore: template.lore,
        items: template.items,
        reward: template.reward,
        driverCutPercent: template.driverCutPercent !== undefined ? template.driverCutPercent : 10,
        openedAt: now,
        expiresAt: now + cooldownMs,
        status: 'OPEN',
        completedByPlayer: null,
        completedByTeam: null,
        completedAt: null
    }

    saveActiveContract(newContract)

    if (announce && server) {
        broadcastMsg(server, 'ONU', '§6[ONU] §aNouvel appel d\'offres mondial ouvert : §e' + newContract.title + ' §f(Prime : §a' + newContract.reward + ' R§f) !', '§9')
        broadcastMsg(server, 'ONU', '§7Durée : §e' + Math.round((cfg.cooldownMinutes || 180) / 60) + ' heures §7| Détails avec §f/onu contrat §7ou au Hub ONU (X: -204, Z: -172).', '§7')
    }
    return newContract
}

/**
 * Vérification périodique du cycle régulier de 3h (toutes les 60s et au démarrage)
 */
function checkRegularCycle(server) {
    if (!server) return
    var contract = loadActiveContract()
    var now = Date.now()

    if (!contract || !contract.id || !contract.expiresAt || now >= contract.expiresAt) {
        var announce = true
        if (contract && contract.status === 'OPEN' && contract.title) {
            broadcastMsg(server, 'ONU', '§c[ONU] L\'appel d\'offres §e' + contract.title + ' §ca expiré sans être honoré.', '§c')
        }
        rollNewOnuContract(server, announce)
    }
}

/**
 * Vérifie si le joueur est physiquement au guichet de l'ONU
 */
function isPlayerAtOnuCounter(player) {
    if (!player) return false
    try {
        var dimStr = String(getEntityDimensionId(player) || 'minecraft:overworld').toLowerCase()
        if (dimStr.indexOf('overworld') !== -1) {
            var px = Number(player.getX ? player.getX() : player.x)
            var pz = Number(player.getZ ? player.getZ() : player.z)
            var rad = ONU_HUB_CONFIG.interactionRadius || 50
            var distSq = (px - ONU_HUB_CONFIG.x) * (px - ONU_HUB_CONFIG.x) + (pz - ONU_HUB_CONFIG.z) * (pz - ONU_HUB_CONFIG.z)
            return distSq <= (rad * rad)
        }
    } catch (e) {
        console.error('[ONU Hub] Erreur distance guichet : ' + e)
    }
    return false
}

/**
 * Extrait l'identifiant registre de manière robuste
 */
function getItemIdFromStack(stack) {
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

/**
 * Compte le nombre d'items d'un ID précis dans l'inventaire du joueur
 */
function countPlayerItem(player, itemId) {
    if (!player || !itemId) return 0
    var count = 0
    try {
        var inv = player.getInventory ? player.getInventory() : player.inventory
        if (!inv) return 0
        var size = inv.getContainerSize ? inv.getContainerSize() : 36
        for (var i = 0; i < size; i++) {
            var stack = inv.getItem(i)
            if (stack && !stack.isEmpty()) {
                var sId = getItemIdFromStack(stack)
                if (sId === itemId) {
                    var c = stack.getCount ? stack.getCount() : stack.count
                    count += (c || 0)
                }
            }
        }
    } catch (e) {
        console.error('[ONU Hub] Erreur comptage items: ' + e)
    }
    return count
}

/**
 * Retire un nombre précis d'items de l'inventaire du joueur
 */
function removePlayerItem(player, itemId, countToRemove) {
    if (!player || !itemId || countToRemove <= 0) return
    var remaining = countToRemove
    try {
        var inv = player.getInventory ? player.getInventory() : player.inventory
        if (!inv) return
        var size = inv.getContainerSize ? inv.getContainerSize() : 36
        for (var i = 0; i < size && remaining > 0; i++) {
            var stack = inv.getItem(i)
            if (stack && !stack.isEmpty()) {
                var sId = getItemIdFromStack(stack)
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
    } catch (e) {
        console.error('[ONU Hub] Erreur retrait items: ' + e)
    }
}

/**
 * Donne des billets de banque physiques au joueur
 */
function givePlayerBanknotes(player, amount) {
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

/**
 * Procédure de livraison et validation du contrat auprès de l'Intendant de l'ONU
 */
function deliverOnuContract(player) {
    if (!player) return 0
    var server = player.server

    // 1. Vérification de la présence physique au Hub ONU
    if (!isPlayerAtOnuCounter(player)) {
        var curX = Math.round(Number(player.getX ? player.getX() : player.x))
        var curZ = Math.round(Number(player.getZ ? player.getZ() : player.z))
        var rad = ONU_HUB_CONFIG.interactionRadius || 50
        sendMsg(player, 'ONU', 'Vous devez vous trouver physiquement au guichet de l\'ONU (X: -204, Z: -172) pour décharger votre marchandise.', '§c')
        sendMsg(player, 'Position', 'Votre position actuelle : §eX: ' + curX + ', Z: ' + curZ + ' §7(Rayon guichet: ' + rad + ' blocs)', '§7')
        return 0
    }

    // 2. Vérification de l'appartenance à une nation
    var team = getPlayerNationTeam(player)
    if (!team) {
        sendMsg(player, 'ONU', 'Accès refusé : Seules les Nations reconnues (FTB Teams) peuvent livrer des contrats d\'État.', '§c')
        sendMsg(player, 'Conseil', 'Fondez ou rejoignez une nation (touche O) avant de livrer.', '§7')
        return 0
    }

    var contract = loadActiveContract()
    var cfg = loadRegularConfig()

    if (!contract || !contract.id || !contract.expiresAt || Date.now() >= contract.expiresAt) {
        contract = rollNewOnuContract(server, true)
    }

    if (contract.status === 'COMPLETED') {
        sendMsg(player, 'ONU', 'Ce contrat a déjà été remporté par §6' + (contract.completedByTeam || 'une autre Nation') + ' §c! Attendez la prochaine rotation.', '§c')
        sendMsg(player, 'Chrono', 'Prochain appel d\'offres dans §e' + formatRemainingTime(contract.expiresAt) + '§7.', '§7')
        try { player.playSound('minecraft:block.chest.locked', 1.0, 1.0) } catch (s0) {}
        return 0
    }

    // 3. Inspection de la cargaison dans l'inventaire
    var missingItems = []
    for (var i = 0; i < contract.items.length; i++) {
        var req = contract.items[i]
        var current = countPlayerItem(player, req.id)
        if (current < req.count) {
            missingItems.push({
                name: req.name,
                missing: req.count - current,
                totalReq: req.count
            })
        }
    }

    if (missingItems.length > 0) {
        sendMsg(player, 'ONU', '§cCargaison incomplète pour l\'appel d\'offres §e' + contract.title + ' §c! Requis :', '§c')
        for (var j = 0; j < contract.items.length; j++) {
            var it = contract.items[j]
            var cur = countPlayerItem(player, it.id)
            var statusCol = cur >= it.count ? '§a✔ ' : '§c✘ '
            sendMsg(player, 'Douane', statusCol + cur + '/' + it.count + ' §f' + it.name, '§f')
        }
        sendMsg(player, 'Conseil', 'Placez les ressources nécessaires directement dans votre inventaire et réessayez.', '§7')
        try {
            player.playSound('minecraft:block.chest.locked', 1.0, 1.0)
        } catch (se) {}
        return 0
    }

    // 4. Déchargement et encaissement
    for (var k = 0; k < contract.items.length; k++) {
        var it2 = contract.items[k]
        removePlayerItem(player, it2.id, it2.count)
    }

    // Calcul de la répartition de la récompense
    var totalReward = contract.reward
    var driverCut = Math.floor(totalReward * (contract.driverCutPercent / 100))
    var nationReward = totalReward - driverCut

    // Versement au Trésor national
    if (typeof depositNationMoneyDirect === 'function') {
        depositNationMoneyDirect(team, nationReward)
    }

    // Versement de la prime du chauffeur en billets
    givePlayerBanknotes(player, driverCut)

    // Enregistrement des statistiques pour les Leaderboards mondiaux
    if (typeof TW_RecordOnuDelivery === 'function') {
        try {
            var pUuid = (player.getUuid ? player.getUuid() : (player.uuid ? player.uuid : null))
            TW_RecordOnuDelivery(team.getId().toString(), pUuid ? pUuid.toString() : null, player.getName().getString(), totalReward)
        } catch (eLb) {}
    }

    // Clôture du contrat
    contract.status = 'COMPLETED'
    contract.completedByPlayer = player.getName().getString()
    contract.completedByTeam = team.getName().getString()
    contract.completedAt = Date.now()
    saveActiveContract(contract)

    try {
        player.playSound('minecraft:entity.player.levelup', 1.0, 1.0)
    } catch (se2) {}

    // Annonce triomphale sur tout le serveur
    broadcastMsg(server, 'ONU', '§aL\'appel d\'offres régulier §e' + contract.title + ' §aa été remporté par §6' + team.getName().getString() + ' §a(livré par §e' + player.getName().getString() + '§a) !', '§2')
    broadcastMsg(server, 'ONU', '§aRémunération : §e' + nationReward + ' R §aversés au Trésor National + §e' + driverCut + ' R §ade prime chauffeur.', '§a')

    // Mise à jour immédiate des classements
    if (typeof TW_UpdateLeaderboards === 'function') {
        try { TW_UpdateLeaderboards(server) } catch (eUp) {}
    }

    // Si configuré pour relancer immédiatement, sinon attend la fin du timer de 3h
    if (cfg.rerollImmediatelyOnCompletion) {
        rollNewOnuContract(server, true)
    } else {
        broadcastMsg(server, 'ONU', '§7Prochain appel d\'offres dans §e' + formatRemainingTime(contract.expiresAt) + '§7.', '§7')
    }

    return 1
}

/**
 * Affiche les détails du contrat régulier (3 heures) en cours
 */
function showCurrentOnuContract(player) {
    if (!player) return 0
    var contract = loadActiveContract()

    if (!contract || !contract.id || !contract.expiresAt || Date.now() >= contract.expiresAt) {
        contract = rollNewOnuContract(player.server, true)
    }

    var timeLeft = formatRemainingTime(contract.expiresAt)
    var isCompleted = contract.status === 'COMPLETED'

    sendMsg(player, 'ONU', '§9§lAppel d\'Offres Régulier (3h) : §e' + contract.title, '§9')
    sendMsg(player, 'Contexte', contract.lore, '§7')

    var driverCut = Math.floor(contract.reward * (contract.driverCutPercent / 100))
    var nationReward = contract.reward - driverCut
    sendMsg(player, 'Prime', 'Trésor National : §a' + nationReward + ' R §f| Prime Livreur : §e' + driverCut + ' R', '§2')
    sendMsg(player, 'Échéance', '§fTemps restant : §e' + timeLeft + ' §7(Rotation automatique toutes les 3h)', '§b')

    if (isCompleted) {
        sendMsg(player, 'Statut', '§a✔ CONTRAT REMPORTÉ par §6' + (contract.completedByTeam || 'Une Nation') + ' §a(livré par §e' + (contract.completedByPlayer || 'Inconnu') + '§a) !', '§a')
        sendMsg(player, 'Info', '§7Prochain appel d\'offres dans §e' + timeLeft + '§7.', '§7')
    } else {
        sendMsg(player, 'Statut', '§eEN COURS - Première nation à livrer encaisse la prime !', '§e')
        sendMsg(player, 'Cargaison', 'Ressources requises à livrer en (X: -204, Z: -172) :', '§6')

        for (var i = 0; i < contract.items.length; i++) {
            var it = contract.items[i]
            var current = countPlayerItem(player, it.id)
            var statusCol = current >= it.count ? '§a✔ ' : '§c✘ '
            sendMsg(player, 'Item', statusCol + current + '/' + it.count + ' §f' + it.name, '§f')
        }

        sendMsg(player, 'Livraison', 'Interagissez avec le douanier au Hub ou tapez §e/onu livrer §fsur place.', '§b')
    }

    try {
        var itemsPayload = []
        for (var k = 0; k < contract.items.length; k++) {
            var reqItem = contract.items[k]
            itemsPayload.push({
                id: reqItem.id,
                name: reqItem.name,
                count: reqItem.count,
                current: countPlayerItem(player, reqItem.id)
            })
        }
        var payload = {
            id: contract.id,
            title: contract.title,
            lore: contract.lore,
            nationReward: nationReward,
            driverCut: driverCut,
            items: itemsPayload,
            timeLeft: timeLeft,
            status: contract.status
        }
        player.sendData('open_onu_contracts', { json: JSON.stringify(payload) })
    } catch (pe) {}

    return 1
}

NetworkEvents.dataReceived('action_onu_contract', function(event) {
    try {
        var player = event.player || event.getEntity()
        if (!player) return
        var data = event.data || event.getData()
        var raw = data.getString ? data.getString('json') : String(data.get('json'))
        if (!raw) return
        var action = JSON.parse(raw)
        if (action.action === 'deliver') {
            deliverOnuContract(player)
        }
    } catch (e) {}
})

/**
 * Détecte si une entité est un PNJ de l'ONU
 */
function isEntityOnuNpc(target) {
    if (!target) return false
    try {
        var cn = ''
        if (target.getCustomName && target.getCustomName()) {
            cn = target.getCustomName().getString().toLowerCase()
        }

        // Si c'est le PNJ de la Bourse ou du Marché, laisser onu_market.js s'en charger
        if (cn.indexOf('bourse') !== -1 || cn.indexOf('courtier') !== -1 || cn.indexOf('marche') !== -1 || cn.indexOf('marché') !== -1 || cn.indexOf('trader') !== -1 || cn.indexOf('shop') !== -1) {
            return false
        }
        if (target.getTags) {
            var tags = target.getTags()
            if (tags && (tags.contains('ONU_Bourse') || tags.contains('ONU_Marche') || tags.contains('bourse') || tags.contains('marche'))) {
                return false
            }
        }

        // 1. Détection par nom personnalisé explicite
        if (cn.indexOf('onu') !== -1 || cn.indexOf('intendant') !== -1 || cn.indexOf('douan') !== -1 || cn.indexOf('officier') !== -1) {
            return true
        }

        // 2. Détection par tags explicites
        if (target.getTags) {
            var tags2 = target.getTags()
            if (tags2 && (tags2.contains('ONU_Intendant') || tags2.contains('onu') || tags2.contains('intendant') || tags2.contains('douanier'))) {
                return true
            }
        }

        // 3. Si villageois sans tag situé dans le Hub immédiat (50 blocs de -204, -172)
        var typeStr = target.getType ? target.getType().toString().toLowerCase() : ''
        if (typeStr.indexOf('villager') !== -1) {
            var dimStr = String(getEntityDimensionId(target) || 'minecraft:overworld').toLowerCase()
            if (dimStr.indexOf('overworld') !== -1) {
                var tx = Number(target.getX ? target.getX() : target.x)
                var tz = Number(target.getZ ? target.getZ() : target.z)
                var dx = tx - ONU_HUB_CONFIG.x
                var dz = tz - ONU_HUB_CONFIG.z
                if ((dx * dx + dz * dz) <= 2500) {
                    return true
                }
            }
        }
    } catch (e) {}
    return false
}

// -----------------------------------------------------------------------------
// MODULE HEBDOMADAIRE : GRANDS CHANTIERS D'ÉTAT & QUOTAS COLLECTIFS
// -----------------------------------------------------------------------------

var DEFAULT_WEEKLY_CONFIG = {
    timezoneOffsetHours: 2,
    streakBonusPerWeek: 0.05,
    maxStreakBonus: 0.25,
    interactionRadius: 50,
    purgeInactiveWeeks: 4,
    contracts: [
        {
            id: 'HW-ENERGIE-1',
            title: 'Grand Réseau Énergétique Continental',
            lore: 'L\'ONU finance l\'électrification : fourniture massive de cuivre et composants électroniques.',
            baseReward: 6000,
            goals: [
                { id: 'minecraft:copper_block', target: 256, name: 'Blocs de Cuivre' },
                { id: 'mekanism:basic_control_circuit', target: 64, name: 'Circuits de Contrôle' }
            ]
        },
        {
            id: 'HW-FERROVIAIRE-1',
            title: 'Réseau Ferré Transcontinental',
            lore: 'Pose des grands axes ferroviaires inter-nations nécessitant acier et rails Create.',
            baseReward: 6500,
            goals: [
                { id: 'create:track', target: 384, name: 'Voies Ferrées Create' },
                { id: 'mekanism:ingot_steel', target: 192, name: 'Lingots d\'Acier' },
                { id: 'create:brass_sheet', target: 96, name: 'Plaques de Laiton' }
            ]
        },
        {
            id: 'HW-AGRO-1',
            title: 'Silos Stratégiques Internationaux',
            lore: 'Constitution des réserves alimentaires mondiales de sécurité.',
            baseReward: 5000,
            goals: [
                { id: 'farmersdelight:rice_bag', target: 128, name: 'Sacs de Riz' },
                { id: 'farmersdelight:potato_crate', target: 128, name: 'Caisses de Pommes de Terre' },
                { id: 'farmersdelight:onion_crate', target: 128, name: 'Caisses d\'Oignons' }
            ]
        },
        {
            id: 'HW-DEFENSE-1',
            title: 'Gros Œuvre & Armature Industrielle',
            lore: 'Fourniture de matériaux renforcés pour les infrastructures lourdes.',
            baseReward: 7000,
            goals: [
                { id: 'create:sturdy_sheet', target: 128, name: 'Tôles d\'Obsidienne Robuste' },
                { id: 'minecraft:iron_block', target: 64, name: 'Blocs de Fer' }
            ]
        },
        {
            id: 'HW-MECANIQUE-1',
            title: 'Modernisation & Automates de Précision',
            lore: 'Équipement des centrales publiques en automates avancés.',
            baseReward: 7500,
            goals: [
                { id: 'create:precision_mechanism', target: 64, name: 'Mécanismes de Précision' },
                { id: 'mekanism:alloy_infused', target: 64, name: 'Alliages Imprégnés' }
            ]
        }
    ]
}

function loadWeeklyConfig() {
    var cfg = readJsonData('onu_weekly_config.json')
    if (cfg && cfg.contracts && Array.isArray(cfg.contracts) && cfg.contracts.length > 0) {
        return cfg
    }
    writeJsonData('onu_weekly_config.json', DEFAULT_WEEKLY_CONFIG)
    return DEFAULT_WEEKLY_CONFIG
}

function loadWeeklyData() {
    var data = readJsonData('onu_weekly.json')
    if (data && typeof data === 'object' && data.progress !== undefined) {
        return data
    }
    var initial = {
        currentWeekId: '',
        expiresAt: 0,
        contract: null,
        progress: {}
    }
    writeJsonData('onu_weekly.json', initial)
    return initial
}

function saveWeeklyData(data) {
    writeJsonData('onu_weekly.json', data || {})
}

/**
 * Calcule l'expiration exacte du dimanche soir à 23h59:59.999 dans le fuseau horaire configuré
 */
function getNextSundayExpiration(offsetHours, customNow) {
    var now = customNow || Date.now()
    var offsetMs = (offsetHours !== undefined ? offsetHours : 2) * 3600000
    var localNow = new Date(now + offsetMs)
    var dayOfWeek = localNow.getUTCDay() // 0 = Dimanche, 1 = Lundi ... 6 = Samedi
    var daysUntilSunday = (7 - dayOfWeek) % 7
    var localYear = localNow.getUTCFullYear()
    var localMonth = localNow.getUTCMonth()
    var localDate = localNow.getUTCDate()
    var targetDate = localDate + daysUntilSunday
    var targetSundayUtc = Date.UTC(localYear, localMonth, targetDate, 23, 59, 59, 999)
    var realExpiration = targetSundayUtc - offsetMs

    // Si on est déjà passé après 23h59:59.999 le dimanche, viser le dimanche suivant
    if (realExpiration <= now) {
        targetSundayUtc = Date.UTC(localYear, localMonth, targetDate + 7, 23, 59, 59, 999)
        realExpiration = targetSundayUtc - offsetMs
    }
    return realExpiration
}

/**
 * Génère un identifiant de semaine conforme ISO (ex: 2026-W37)
 */
function getWeekIdentifier(timestamp, offsetHours) {
    var d = new Date((timestamp || Date.now()) + (offsetHours !== undefined ? offsetHours : 2) * 3600000)
    var target = new Date(d.valueOf())
    var dayNr = (d.getUTCDay() + 6) % 7
    target.setUTCDate(target.getUTCDate() - dayNr + 3)
    var firstThursday = target.valueOf()
    target.setUTCMonth(0, 1)
    if (target.getUTCDay() !== 4) {
        target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7)
    }
    var weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
    var year = d.getUTCFullYear()
    return year + '-W' + (weekNum < 10 ? '0' + weekNum : weekNum)
}

function formatRemainingTime(expiresAt) {
    var diffMs = (expiresAt || 0) - Date.now()
    if (diffMs <= 0) return '0m'
    var totalMinutes = Math.floor(diffMs / 60000)
    var days = Math.floor(totalMinutes / (24 * 60))
    var hours = Math.floor((totalMinutes % (24 * 60)) / 60)
    var mins = totalMinutes % 60
    if (days > 0) return days + 'j ' + hours + 'h ' + mins + 'm'
    if (hours > 0) return hours + 'h ' + mins + 'm'
    return mins + 'm'
}

function renderProgressBar(current, max, length) {
    var ratio = max > 0 ? Math.min(1.0, current / max) : 0
    var filled = Math.round(ratio * length)
    var bar = '§a'
    for (var i = 0; i < filled; i++) bar += '█'
    bar += '§7'
    for (var j = filled; j < length; j++) bar += '░'
    return '[' + bar + '§f]'
}

function pickWeeklyContract(cfg, previousContractId) {
    var list = (cfg && cfg.contracts) ? cfg.contracts : DEFAULT_WEEKLY_CONFIG.contracts
    if (!list || list.length === 0) return null
    if (list.length === 1) return list[0]
    var candidates = []
    for (var i = 0; i < list.length; i++) {
        if (list[i].id !== previousContractId) candidates.push(list[i])
    }
    if (candidates.length === 0) candidates = list
    var idx = Math.floor(Math.random() * candidates.length)
    return candidates[idx]
}

/**
 * Exécute le reset de fin de semaine avec évaluation des streaks et purge d'inactivité
 */
function triggerWeeklyReset(server, isCatchUp) {
    var cfg = loadWeeklyConfig()
    var weeklyData = loadWeeklyData()
    var prevContractId = weeklyData.contract ? weeklyData.contract.id : null
    var oldWeekId = weeklyData.currentWeekId
    var now = Date.now()

    var progress = weeklyData.progress || {}
    var teamKeys = Object.keys(progress)
    var maxInactiveMs = (cfg.purgeInactiveWeeks || 4) * 7 * 24 * 3600 * 1000

    for (var i = 0; i < teamKeys.length; i++) {
        var tid = teamKeys[i]
        var entry = progress[tid]
        if (!entry) continue

        // Purge d'inactivité prolongée
        var lastAct = entry.lastInteractionAt || entry.completedAt || 0
        if (lastAct > 0 && (now - lastAct) > maxInactiveMs) {
            delete progress[tid]
            continue
        }

        // Vérification de la série (Streak)
        if (entry.completed && entry.lastCompletedWeekId === oldWeekId) {
            // Série conservée
        } else {
            entry.streak = 0
        }

        // Remise à zéro des jauges de la semaine
        entry.itemsDelivered = {}
        entry.completed = false
        entry.completedAt = null
    }

    var offset = cfg.timezoneOffsetHours !== undefined ? cfg.timezoneOffsetHours : 2
    var nextExp = getNextSundayExpiration(offset, now)
    var newWeekId = getWeekIdentifier(now, offset)
    var newContract = pickWeeklyContract(cfg, prevContractId)

    weeklyData.currentWeekId = newWeekId
    weeklyData.expiresAt = nextExp
    weeklyData.contract = newContract
    weeklyData.progress = progress

    saveWeeklyData(weeklyData)

    if (server && newContract) {
        var prefix = isCatchUp ? '§6[ONU - Rattrapage] ' : '§6[ONU] '
        broadcastMsg(server, 'ONU', prefix + '§aLe Grand Chantier Hebdomadaire a été renouvelé !', '§2')
        broadcastMsg(server, 'ONU', '§eNouveau Projet : §f' + newContract.title + ' §7(Prime : §a' + newContract.baseReward + ' R§7)', '§6')
        broadcastMsg(server, 'ONU', '§7Tapez §e/onu hebdo §7ou visitez le Hub ONU (X: -204, Z: -172).', '§7')
    }

    return weeklyData
}

/**
 * Force le tirage d'un nouveau chantier hebdomadaire sans altérer les streaks
 */
function rollNewWeeklyContract(server, announce) {
    var cfg = loadWeeklyConfig()
    var weeklyData = loadWeeklyData()
    var prevId = weeklyData.contract ? weeklyData.contract.id : null
    var newContract = pickWeeklyContract(cfg, prevId)
    weeklyData.contract = newContract

    if (weeklyData.progress) {
        var keys = Object.keys(weeklyData.progress)
        for (var i = 0; i < keys.length; i++) {
            var ent = weeklyData.progress[keys[i]]
            if (ent) {
                ent.itemsDelivered = {}
                ent.completed = false
                ent.completedAt = null
            }
        }
    }

    saveWeeklyData(weeklyData)

    if (announce && server && newContract) {
        broadcastMsg(server, 'ONU', '§6[ONU] §aNouveau Grand Chantier Hebdomadaire assigné par l\'administration !', '§2')
        broadcastMsg(server, 'ONU', '§eProjet : §f' + newContract.title + ' §7(Prime : §a' + newContract.baseReward + ' R§7)', '§6')
    }
    return weeklyData
}

/**
 * Vérification périodique du cycle hebdomadaire (appelé toutes les 60s et au démarrage)
 */
function checkWeeklyCycle(server) {
    if (!server) return
    var weeklyData = loadWeeklyData()
    if (!weeklyData.expiresAt || !weeklyData.contract || Date.now() >= weeklyData.expiresAt) {
        triggerWeeklyReset(server, true)
    }
}

/**
 * Affiche l'état d'avancement de la nation du joueur sur le grand chantier hebdo
 */
function showWeeklyContractStatus(player) {
    if (!player) return 0
    var weeklyData = loadWeeklyData()
    var cfg = loadWeeklyConfig()

    if (!weeklyData.contract || !weeklyData.expiresAt || Date.now() >= weeklyData.expiresAt) {
        weeklyData = triggerWeeklyReset(player.server, true)
    }

    var contract = weeklyData.contract
    if (!contract) {
        sendMsg(player, 'ONU', 'Aucun contrat hebdomadaire actif en ce moment.', '§c')
        return 0
    }

    var team = getPlayerNationTeam(player)
    var teamId = team ? team.getId().toString() : null
    var teamName = team ? team.getName().getString() : 'Sans Nation'
    var entry = (teamId && weeklyData.progress && weeklyData.progress[teamId]) ? weeklyData.progress[teamId] : {
        itemsDelivered: {},
        completed: false,
        streak: 0
    }

    var streak = entry.streak || 0
    var streakBonus = Math.min(cfg.maxStreakBonus || 0.25, streak * (cfg.streakBonusPerWeek || 0.05))
    var streakPercent = Math.round(streakBonus * 100)
    var potentialReward = Math.floor(contract.baseReward * (1.0 + streakBonus))
    var timeLeft = formatRemainingTime(weeklyData.expiresAt)

    sendMsg(player, 'ONU', '§9§lGrand Chantier Hebdomadaire : §e' + contract.title, '§9')
    sendMsg(player, 'Contexte', contract.lore, '§7')
    sendMsg(player, 'Nation', '§fÉquipe : §6' + teamName + ' §f| Série : §e' + streak + ' sem. §7(Bonus : +' + streakPercent + '%)', '§f')
    sendMsg(player, 'Prime', '§fBase : §e' + contract.baseReward + ' R §f| Prime estimée : §a' + potentialReward + ' R §7(Versée à 100% au Trésor National)', '§2')
    sendMsg(player, 'Échéance', '§fClôture : Dimanche 23h59 §7(Temps restant : §e' + timeLeft + '§7)', '§b')
    sendMsg(player, 'Statut', entry.completed ? '§a✔ COMPLÉTÉ POUR CETTE SEMAINE ! Prime déjà versée.' : '§eEN COURS - Dépôts fractionnés acceptés', entry.completed ? '§a' : '§e')
    sendMsg(player, 'Jauges', 'Progression des ressources de votre Nation :', '§6')

    var goals = contract.goals || []
    for (var i = 0; i < goals.length; i++) {
        var g = goals[i]
        var delivered = (entry.itemsDelivered && entry.itemsDelivered[g.id]) ? entry.itemsDelivered[g.id] : 0
        var target = g.target
        var pct = Math.min(100, Math.floor((delivered / target) * 100))
        var bar = renderProgressBar(delivered, target, 10)
        var statusColor = delivered >= target ? '§a' : '§f'
        sendMsg(player, 'Quota', statusColor + bar + ' ' + pct + '% §f' + delivered + '/' + target + ' ' + g.name, '§f')
    }

    if (!entry.completed) {
        sendMsg(player, 'Action', 'Déposez vos ressources avec §e/onu hebdo livrer §fou directement au guichet de l\'ONU.', '§b')
    }

    return 1
}

/**
 * Réalise un dépôt fractionné pour le grand chantier hebdomadaire
 */
function depositWeeklyContract(player) {
    if (!player) return 0
    var server = player.server

    // 1. Vérification de la présence physique au Hub ONU
    if (!isPlayerAtOnuCounter(player)) {
        var curX = Math.round(Number(player.getX ? player.getX() : player.x))
        var curZ = Math.round(Number(player.getZ ? player.getZ() : player.z))
        var rad = ONU_HUB_CONFIG.interactionRadius || 50
        sendMsg(player, 'ONU', 'Vous devez vous trouver physiquement au guichet de l\'ONU (X: -204, Z: -172) pour livrer.', '§c')
        sendMsg(player, 'Position', 'Votre position actuelle : §eX: ' + curX + ', Z: ' + curZ + ' §7(Rayon guichet: ' + rad + ' blocs)', '§7')
        return 0
    }

    // 2. Vérification de l'appartenance à une nation
    var team = getPlayerNationTeam(player)
    if (!team) {
        sendMsg(player, 'ONU', 'Accès refusé : Seules les Nations reconnues (FTB Teams) peuvent contribuer aux chantiers d\'État.', '§c')
        sendMsg(player, 'Conseil', 'Fondez ou rejoignez une nation (touche O) avant de livrer.', '§7')
        return 0
    }

    var weeklyData = loadWeeklyData()
    var cfg = loadWeeklyConfig()

    if (!weeklyData.contract || !weeklyData.expiresAt || Date.now() >= weeklyData.expiresAt) {
        weeklyData = triggerWeeklyReset(server, true)
    }

    var contract = weeklyData.contract
    if (!contract) {
        sendMsg(player, 'ONU', 'Aucun contrat hebdomadaire actif en ce moment.', '§c')
        return 0
    }

    var teamId = team.getId().toString()
    if (!weeklyData.progress) weeklyData.progress = {}
    if (!weeklyData.progress[teamId]) {
        weeklyData.progress[teamId] = {
            teamName: team.getName().getString(),
            itemsDelivered: {},
            completed: false,
            completedAt: null,
            streak: 0,
            lastCompletedWeekId: null,
            lastInteractionAt: Date.now()
        }
    }

    var entry = weeklyData.progress[teamId]
    entry.teamName = team.getName().getString()
    entry.lastInteractionAt = Date.now()

    if (entry.completed) {
        sendMsg(player, 'ONU', 'Votre nation a déjà complété le Grand Chantier de la semaine ! Rendez-vous lundi pour le suivant.', '§a')
        try { player.playSound('minecraft:block.note_block.bell', 1.0, 1.0) } catch (s0) {}
        return 0
    }

    var goals = contract.goals || []
    var totalDepositedItems = 0
    var depositSummary = []

    for (var i = 0; i < goals.length; i++) {
        var g = goals[i]
        var currentDelivered = (entry.itemsDelivered && entry.itemsDelivered[g.id]) ? entry.itemsDelivered[g.id] : 0
        var remainingNeeded = g.target - currentDelivered

        if (remainingNeeded > 0) {
            var playerAmount = countPlayerItem(player, g.id)
            if (playerAmount > 0) {
                var take = Math.min(playerAmount, remainingNeeded)
                removePlayerItem(player, g.id, take)
                if (!entry.itemsDelivered) entry.itemsDelivered = {}
                entry.itemsDelivered[g.id] = currentDelivered + take
                totalDepositedItems += take
                depositSummary.push('§a+' + take + ' §f' + g.name + ' §7(' + (currentDelivered + take) + '/' + g.target + ')')
            }
        }
    }

    if (totalDepositedItems === 0) {
        sendMsg(player, 'ONU', 'Aucune ressource éligible à déposer dans votre inventaire pour ce chantier.', '§e')
        showWeeklyContractStatus(player)
        try { player.playSound('minecraft:block.chest.locked', 1.0, 1.0) } catch (se) {}
        return 0
    }

    // Feedback immédiat des dépôts effectués
    sendMsg(player, 'ONU', '§aDépôt fractionné effectué avec succès !', '§2')
    for (var d = 0; d < depositSummary.length; d++) {
        sendMsg(player, 'Cargaison', depositSummary[d], '§f')
    }

    // Vérifier si 100% de tous les objectifs sont atteints
    var isAllCompleted = true
    for (var j = 0; j < goals.length; j++) {
        var gCheck = goals[j]
        var delCheck = (entry.itemsDelivered && entry.itemsDelivered[gCheck.id]) ? entry.itemsDelivered[gCheck.id] : 0
        if (delCheck < gCheck.target) {
            isAllCompleted = false
            break
        }
    }

    if (isAllCompleted) {
        entry.completed = true
        entry.completedAt = Date.now()
        entry.streak = (entry.streak || 0) + 1
        entry.lastCompletedWeekId = weeklyData.currentWeekId

        var streakBonus = Math.min(cfg.maxStreakBonus || 0.25, (entry.streak - 1) * (cfg.streakBonusPerWeek || 0.05))
        var streakPercent = Math.round(streakBonus * 100)
        var finalReward = Math.floor(contract.baseReward * (1.0 + streakBonus))

        // Versement au Trésor national Lightman's Currency
        if (typeof depositNationMoneyDirect === 'function') {
            depositNationMoneyDirect(team, finalReward)
        }

        saveWeeklyData(weeklyData)

        broadcastMsg(server, 'ONU', '§6' + team.getName().getString() + ' §aa mené à bien le Grand Chantier Hebdomadaire §e' + contract.title + ' §a!', '§2')
        broadcastMsg(server, 'ONU', '§aPrime d\'État de §e' + finalReward + ' R §aversée au Trésor National ! §7(Série : §e' + entry.streak + ' sem. §7| Bonus : §a+' + streakPercent + '%§7)', '§a')

        try { player.playSound('minecraft:ui.toast.challenge_complete', 1.0, 1.0) } catch (s2) {}
    } else {
        saveWeeklyData(weeklyData)
        try { player.playSound('minecraft:entity.experience_orb.pickup', 1.0, 1.0) } catch (s3) {}
        sendMsg(player, 'Conseil', 'Tapez §e/onu hebdo §fpour suivre l\'avancement restant de votre Nation.', '§7')
    }

    return 1
}

/**
 * Affiche le tableau de bord récapitulatif de l'ONU (/onu)
 */
function showOnuDashboard(player) {
    if (!player) return 0
    var contract = loadActiveContract()
    var weeklyData = loadWeeklyData()

    sendMsg(player, 'ONU', '§9§l=== [ MARCHÉ MONDIAL DE L\'ONU ] ===', '§9')
    
    // Contrat régulier (3h)
    if (contract && contract.title) {
        var rExp = formatRemainingTime(contract.expiresAt)
        var rStatus = contract.status === 'COMPLETED' ? ('§a✔ Remporté par ' + (contract.completedByTeam || 'Une Nation')) : ('§eEn cours §7(Reste : §b' + rExp + '§7)')
        sendMsg(player, 'Sprint (3h)', '§e' + contract.title + ' §f(Prime : §a' + contract.reward + ' R§f) [' + rStatus + '§f] §7- §f/onu contrat', '§e')
    } else {
        sendMsg(player, 'Sprint (3h)', '§7Aucun appel d\'offres actif en ce moment.', '§7')
    }

    // Grand chantier hebdo
    if (weeklyData && weeklyData.contract) {
        var wTitle = weeklyData.contract.title
        var wExp = formatRemainingTime(weeklyData.expiresAt)
        var team = getPlayerNationTeam(player)
        var teamId = team ? team.getId().toString() : null
        var entry = (teamId && weeklyData.progress) ? weeklyData.progress[teamId] : null
        var pct = 0
        if (entry && weeklyData.contract.goals) {
            var goals = weeklyData.contract.goals
            var totalPct = 0
            for (var g = 0; g < goals.length; g++) {
                var del = (entry.itemsDelivered && entry.itemsDelivered[goals[g].id]) ? entry.itemsDelivered[goals[g].id] : 0
                totalPct += Math.min(1.0, del / goals[g].target)
            }
            pct = Math.floor((totalPct / goals.length) * 100)
        }
        var statusStr = (entry && entry.completed) ? '§a✔ Complété' : ('§e' + pct + '%')
        sendMsg(player, 'Hebdo', '§6' + wTitle + ' §7[' + statusStr + '§7] (Reste : §b' + wExp + '§7) §7- §f/onu hebdo', '§6')
    }

    sendMsg(player, 'Aide', '§fCommandes : §e/onu contrat §f| §e/onu livrer §f| §e/onu hebdo §f| §e/onu hebdo livrer', '§7')
    sendMsg(player, 'Guichet', '§7Rendez-vous au Hub ONU en Overworld : §eX: -204, Z: -172', '§7')
    return 1
}

/**
 * Gère l'interaction avec le guichet de l'ONU
 */
function handleOnuNpcInteraction(player) {
    if (!player) return
    var contract = loadActiveContract()
    if (!contract || !contract.id || !contract.expiresAt || Date.now() >= contract.expiresAt) {
        contract = rollNewOnuContract(player.server, true)
    }

    // Si sneak (accroupi), afficher les détails (régulier + hebdo)
    if (player.isShiftKeyDown && player.isShiftKeyDown()) {
        showCurrentOnuContract(player)
        showWeeklyContractStatus(player)
        return
    }

    // 1. Vérifier si le contrat régulier est OPEN et si la cargaison est prête
    if (contract.status === 'OPEN') {
        var hasMissingDaily = false
        for (var i = 0; i < contract.items.length; i++) {
            var req = contract.items[i]
            if (countPlayerItem(player, req.id) < req.count) {
                hasMissingDaily = true
                break
            }
        }

        if (!hasMissingDaily) {
            // Cargaison régulière complète : livrer en priorité
            deliverOnuContract(player)
            return
        }
    }

    // 2. Si le contrat régulier est déjà complété ou incomplet, vérifier si le joueur a des items pour le chantier hebdo
    var weeklyData = loadWeeklyData()
    if (weeklyData && weeklyData.contract && weeklyData.contract.goals) {
        var team = getPlayerNationTeam(player)
        var teamId = team ? team.getId().toString() : null
        var entry = (teamId && weeklyData.progress) ? weeklyData.progress[teamId] : null
        var isWeeklyCompleted = entry && entry.completed

        if (!isWeeklyCompleted) {
            var hasWeeklyItems = false
            for (var w = 0; w < weeklyData.contract.goals.length; w++) {
                var wg = weeklyData.contract.goals[w]
                var wDelivered = (entry && entry.itemsDelivered && entry.itemsDelivered[wg.id]) ? entry.itemsDelivered[wg.id] : 0
                if (wDelivered < wg.target && countPlayerItem(player, wg.id) > 0) {
                    hasWeeklyItems = true
                    break
                }
            }

            if (hasWeeklyItems) {
                depositWeeklyContract(player)
                return
            }
        }
    }

    // 3. Rien à livrer : afficher le contrat régulier et informer sur le contrat hebdo
    showCurrentOnuContract(player)
    sendMsg(player, 'ONU', '§7Accroupissez-vous (§eShift + Clic droit§7) ou tapez §e/onu hebdo §7pour voir le Grand Chantier.', '§7')
    try {
        player.playSound('minecraft:entity.villager.trade', 1.0, 1.0)
    } catch (s1) {}
}

// -----------------------------------------------------------------------------
// INTERACTION AVEC LE PNJ AU HUB (NativeEvents NeoForge)
// -----------------------------------------------------------------------------
try {
    NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$EntityInteract'), function(event) {
        try {
            var target = event.getTarget()
            var player = event.getEntity()
            if (!target || !player) return

            if (isEntityOnuNpc(target)) {
                // Annuler l'interaction vanilla du villageois pour bloquer le "non" et le menu trade
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
                    handleOnuNpcInteraction(player)
                }
            }
        } catch (err) {
            console.error('[ONU Hub] Erreur dans EntityInteract: ' + err)
        }
    })
} catch (nativeErr) {
    console.error('[ONU Hub] Impossible d\'enregistrer NativeEvents EntityInteract: ' + nativeErr)
}

try {
    NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$EntityInteractSpecific'), function(event) {
        try {
            var target = event.getTarget()
            var player = event.getEntity()
            if (!target || !player) return

            if (isEntityOnuNpc(target)) {
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
                    handleOnuNpcInteraction(player)
                }
            }
        } catch (err) {}
    })
} catch (nativeErr2) {}

// Fallback pour interactions avec objets spécifiques
ItemEvents.entityInteracted(function(event) {
    try {
        var target = event.target
        var player = event.player
        if (!target || !player) return

        if (isEntityOnuNpc(target)) {
            event.cancel()
            handleOnuNpcInteraction(player)
        }
    } catch (e) {}
})

// Interaction complémentaire avec un pupitre, cloche ou coffre au Hub ONU (-204, -172)
BlockEvents.rightClicked(function(event) {
    try {
        var block = event.block
        var player = event.player
        if (!block || !player) return

        var bId = block.getId()
        if (bId === 'minecraft:lectern' || bId === 'minecraft:bell' || bId === 'minecraft:barrel' || bId === 'minecraft:trapped_chest') {
            var dimStr = String(getEntityDimensionId(player) || 'minecraft:overworld').toLowerCase()
            if (dimStr.indexOf('overworld') !== -1) {
                var dx = Math.abs(block.getX() - ONU_HUB_CONFIG.x)
                var dz = Math.abs(block.getZ() - ONU_HUB_CONFIG.z)
                if (dx <= 50 && dz <= 50) {
                    event.cancel()
                    handleOnuNpcInteraction(player)
                }
            }
        }
    } catch (e) {}
})

// -----------------------------------------------------------------------------
// CYCLE PÉRIODIQUE DES MARCHÉS PUBLICS (VIA MASTER SCHEDULER, 60 SECONDES)
// -----------------------------------------------------------------------------
if (typeof TW_Scheduler !== 'undefined' && TW_Scheduler.register) {
    TW_Scheduler.register('onu_contracts_cycle', 1200, function(server) {
        checkRegularCycle(server)
        checkWeeklyCycle(server)
    })
}

ServerEvents.loaded(function(event) {
    // Rattrapage ou initialisation automatique des deux marchés
    checkRegularCycle(event.server)
    checkWeeklyCycle(event.server)
})

