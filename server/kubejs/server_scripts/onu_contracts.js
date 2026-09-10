// priority: 50
// =============================================================================
// Third World Server Script - Marché Mondial de l'ONU & Appels d'Offres d'État
// =============================================================================

var ONU_HUB_CONFIG = {
    x: -204,
    z: -172,
    interactionRadius: 50,     // Rayon d'interaction physique avec le guichet de l'ONU (50 blocs)
    restrictedRadius: 200,     // Rayon d'interdiction de téléportation
    contractCooldownTicks: 72000 // Nouveau contrat toutes les heures (72 000 ticks)
}

// -----------------------------------------------------------------------------
// CATALOGUE DES CONTRATS D'ÉTAT MONDIAUX (Anti-Hyperinflation & Raffiné)
// -----------------------------------------------------------------------------
var ONU_CONTRACT_CATALOG = [
    {
        id: 'CT-METALLURGIE-1',
        title: 'Programme Ferroviaire Transcontinental',
        lore: 'L\'ONU requiert des aciers lourds et rails pour relier les continents.',
        items: [
            { id: 'mekanism:ingot_steel', count: 128, name: "Lingot d'Acier" },
            { id: 'create:track', count: 64, name: "Voie Ferrée Create" }
        ],
        reward: 3200,
        driverCutPercent: 10
    },
    {
        id: 'CT-MECANIQUE-1',
        title: 'Modernisation Industrielle & Automates',
        lore: 'Fourniture de mécanismes de haute précision pour les centrales publiques.',
        items: [
            { id: 'create:precision_mechanism', count: 32, name: "Mécanisme de Précision" },
            { id: 'create:brass_sheet', count: 64, name: "Plaque de Laiton" }
        ],
        reward: 3800,
        driverCutPercent: 10
    },
    {
        id: 'CT-AGRO-1',
        title: 'Aide Alimentaire Humanitaire',
        lore: 'Constitution de réserves d\'urgence en vivres compressées.',
        items: [
            { id: 'farmersdelight:rice_bag', count: 32, name: "Sac de Riz" },
            { id: 'farmersdelight:tomato_crate', count: 32, name: "Caisse de Tomates" },
            { id: 'farmersdelight:onion_crate', count: 32, name: "Caisse d'Oignons" }
        ],
        reward: 2600,
        driverCutPercent: 15
    },
    {
        id: 'CT-METALLURGIE-2',
        title: 'Développement Électronique & Réseaux',
        lore: 'Achat de circuits électroniques et métaux rares.',
        items: [
            { id: 'mekanism:basic_control_circuit', count: 32, name: "Circuit de Contrôle de Base" },
            { id: 'mekanism:ingot_osmium', count: 64, name: "Lingot d'Osmium" }
        ],
        reward: 4200,
        driverCutPercent: 10
    },
    {
        id: 'CT-AGRO-2',
        title: 'Plan Mondial Contre la Famine',
        lore: 'Approvisionnement massif en féculents et légumes de conservation.',
        items: [
            { id: 'farmersdelight:potato_crate', count: 32, name: "Caisse de Pommes de Terre" },
            { id: 'farmersdelight:carrot_crate', count: 32, name: "Caisse de Carottes" },
            { id: 'farmersdelight:cabbage_crate', count: 32, name: "Caisse de Choux" }
        ],
        reward: 2500,
        driverCutPercent: 15
    },
    {
        id: 'CT-DEFENSE-1',
        title: 'Blindage des Zones Sécurisées',
        lore: 'Laminage de tôles blindées pour la fortification des bases neutres.',
        items: [
            { id: 'create:sturdy_sheet', count: 48, name: "Tôle d'Obsidienne Robuste" },
            { id: 'mekanism:ingot_steel', count: 96, name: "Lingot d'Acier" }
        ],
        reward: 4500,
        driverCutPercent: 10
    },
    {
        id: 'CT-ENERGIE-1',
        title: 'Infrastructure Électrique Haute Tension',
        lore: 'Achat massif de cuivre raffiné pour les transformateurs mondiaux.',
        items: [
            { id: 'minecraft:copper_block', count: 64, name: "Bloc de Cuivre" },
            { id: 'mekanism:alloy_infused', count: 32, name: "Alliage Imprégné" }
        ],
        reward: 3600,
        driverCutPercent: 10
    }
]

var ACTIVE_CONTRACT_CACHE = null

function loadActiveContract() {
    if (ACTIVE_CONTRACT_CACHE !== null) return ACTIVE_CONTRACT_CACHE
    var data = readJsonData('active_onu_contract.json')
    if (data && typeof data === 'object') {
        ACTIVE_CONTRACT_CACHE = data
        return ACTIVE_CONTRACT_CACHE
    }
    ACTIVE_CONTRACT_CACHE = {}
    return ACTIVE_CONTRACT_CACHE
}

function saveActiveContract(data) {
    ACTIVE_CONTRACT_CACHE = data || {}
    writeJsonData('active_onu_contract.json', ACTIVE_CONTRACT_CACHE)
}

/**
 * Lance un nouveau contrat d'État au hasard
 */
function rollNewOnuContract(server, announce) {
    if (!server) return null
    var idx = Math.floor(Math.random() * ONU_CONTRACT_CATALOG.length)
    var template = ONU_CONTRACT_CATALOG[idx]

    var newContract = {
        id: template.id + '-' + Math.floor(Math.random() * 900 + 100),
        title: template.title,
        lore: template.lore,
        items: template.items,
        reward: template.reward,
        driverCutPercent: template.driverCutPercent,
        openedAt: Date.now(),
        status: 'OPEN'
    }

    saveActiveContract(newContract)

    if (announce) {
        broadcastMsg(server, 'ONU', 'Nouvel appel d\'offres mondial ouvert : §e' + newContract.title + ' §f(Prime: §a' + newContract.reward + ' R§f) !', '§9')
        broadcastMsg(server, 'ONU', 'Consultez les détails avec §f/onu contrat §fou rendez-vous au Hub ONU (X: -204, Z: -172).', '§7')
    }
    return newContract
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
        sendMsg(player, 'ONU', 'Vous devez vous trouver physiquement au guichet de l\'ONU (X: 0, Z: 0) pour décharger votre marchandise.', '§c')
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
    if (!contract || !contract.id || contract.status !== 'OPEN') {
        contract = rollNewOnuContract(server, true)
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
        sendMsg(player, 'ONU', '§cCargaison incomplète pour le contrat §e' + contract.title + ' §c! Requis :', '§c')
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
    broadcastMsg(server, 'ONU', '§aLe contrat mondial §e' + contract.title + ' §aa été honoré avec succès par §6' + team.getName().getString() + ' §a(livré par §e' + player.getName().getString() + '§a) !', '§2')
    broadcastMsg(server, 'ONU', '§aRémunération : §e' + nationReward + ' R §aversés au Trésor de l\'État + §e' + driverCut + ' R §ade prime au livreur.', '§a')

    // Nouveau contrat immédiatement disponible
    rollNewOnuContract(server, true)

    return 1
}

/**
 * Affiche les détails du contrat mondial en cours
 */
function showCurrentOnuContract(player) {
    if (!player) return 0
    var contract = loadActiveContract()

    if (!contract || !contract.id || contract.status !== 'OPEN') {
        contract = rollNewOnuContract(player.server, true)
    }

    sendMsg(player, 'ONU', '§9§lMarché Public Mondial : §e' + contract.title, '§9')
    sendMsg(player, 'Contexte', contract.lore, '§7')
    sendMsg(player, 'Prime', 'Trésor National : §a' + (contract.reward - Math.floor(contract.reward * (contract.driverCutPercent / 100))) + ' R §f| Prime Chauffeur : §e' + Math.floor(contract.reward * (contract.driverCutPercent / 100)) + ' R', '§2')
    sendMsg(player, 'Cargaison', 'Ressources requises à livrer en (X: -204, Z: -172) :', '§6')

    for (var i = 0; i < contract.items.length; i++) {
        var it = contract.items[i]
        var current = countPlayerItem(player, it.id)
        var statusCol = current >= it.count ? '§a✔ ' : '§c✘ '
        sendMsg(player, 'Item', statusCol + current + '/' + it.count + ' §f' + it.name, '§f')
    }

    sendMsg(player, 'Livraison', 'Interagissez avec le douanier au Hub ou tapez §e/onu livrer §fsur place.', '§b')

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
        var driverCut = Math.floor(contract.reward * (contract.driverCutPercent / 100))
        var nationReward = contract.reward - driverCut
        var payload = {
            id: contract.id,
            title: contract.title,
            lore: contract.lore,
            nationReward: nationReward,
            driverCut: driverCut,
            items: itemsPayload
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

/**
 * Gère l'interaction avec le guichet de l'ONU
 */
function handleOnuNpcInteraction(player) {
    if (!player) return
    var contract = loadActiveContract()
    if (!contract || !contract.id || contract.status !== 'OPEN') {
        contract = rollNewOnuContract(player.server, true)
    }

    // Si sneak (accroupi), afficher les détails du contrat
    if (player.isShiftKeyDown && player.isShiftKeyDown()) {
        showCurrentOnuContract(player)
        return
    }

    // Vérifier si la cargaison est prête
    var hasMissing = false
    for (var i = 0; i < contract.items.length; i++) {
        var req = contract.items[i]
        if (countPlayerItem(player, req.id) < req.count) {
            hasMissing = true
            break
        }
    }

    if (hasMissing) {
        // Cargaison incomplète : afficher la liste des composants requis
        showCurrentOnuContract(player)
        try {
            player.playSound('minecraft:entity.villager.trade', 1.0, 1.0)
        } catch (s1) {}
    } else {
        // Cargaison complète : valider la livraison
        deliverOnuContract(player)
    }
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
// COMMANDES CLI /onu
// -----------------------------------------------------------------------------
ServerEvents.commandRegistry(function(event) {
    var Commands = event.commands

    event.register(
        Commands.literal('onu')
            .then(Commands.literal('contrat').executes(function(ctx) {
                return showCurrentOnuContract(ctx.source.player)
            }))
            .then(Commands.literal('livrer').executes(function(ctx) {
                return deliverOnuContract(ctx.source.player)
            }))
            .then(Commands.literal('admin')
                .requires(function(source) { return source.hasPermission(2) })
                .then(Commands.literal('reroll').executes(function(ctx) {
                    var newC = rollNewOnuContract(ctx.source.server, true)
                    if (ctx.source.player) {
                        sendMsg(ctx.source.player, 'ONU', 'Nouveau contrat forcé : ' + (newC ? newC.title : 'Erreur'), '§a')
                    }
                    return 1
                }))
                .then(Commands.literal('claim').executes(function(ctx) {
                    var srv = ctx.source.server
                    var fnClaim = (typeof claimOnuChunks === 'function') ? claimOnuChunks : null
                    var fnClean = (typeof cleanupUnauthorizedOnuZoneClaims === 'function') ? cleanupUnauthorizedOnuZoneClaims : null
                    if (fnClaim) fnClaim(srv)
                    if (fnClean) fnClean(srv)
                    if (ctx.source.player) {
                        sendMsg(ctx.source.player, 'ONU', '16 Chunks du Hub ONU revendiqués et zone des 200 blocs assainie !', '§a')
                    }
                    return 1
                }))
            )
            .then(Commands.literal('claim')
                .requires(function(source) { return source.hasPermission(2) })
                .executes(function(ctx) {
                    var srv = ctx.source.server
                    var fnClaim = (typeof claimOnuChunks === 'function') ? claimOnuChunks : null
                    var fnClean = (typeof cleanupUnauthorizedOnuZoneClaims === 'function') ? cleanupUnauthorizedOnuZoneClaims : null
                    if (fnClaim) fnClaim(srv)
                    if (fnClean) fnClean(srv)
                    if (ctx.source.player) {
                        sendMsg(ctx.source.player, 'ONU', '16 Chunks du Hub ONU revendiqués et zone des 200 blocs assainie !', '§a')
                    }
                    return 1
                })
            )
            .executes(function(ctx) {
                return showCurrentOnuContract(ctx.source.player)
            })
    )

    // Commande raccourcie directe /onuclaim
    event.register(
        Commands.literal('onuclaim')
            .requires(function(source) { return source.hasPermission(2) })
            .executes(function(ctx) {
                var srv = ctx.source.server
                var fnClaim = (typeof claimOnuChunks === 'function') ? claimOnuChunks : null
                var fnClean = (typeof cleanupUnauthorizedOnuZoneClaims === 'function') ? cleanupUnauthorizedOnuZoneClaims : null
                if (fnClaim) fnClaim(srv)
                if (fnClean) fnClean(srv)
                if (ctx.source.player) {
                    sendMsg(ctx.source.player, 'ONU', '16 Chunks du Hub ONU revendiqués et zone des 200 blocs assainie !', '§a')
                }
                return 1
            })
    )
})

// -----------------------------------------------------------------------------
// CYCLE PÉRIODIQUE DES MARCHÉS PUBLICS
// -----------------------------------------------------------------------------
var onuContractTimer = 0

ServerEvents.tick(function(event) {
    onuContractTimer++
    if (onuContractTimer >= ONU_HUB_CONFIG.contractCooldownTicks) {
        onuContractTimer = 0
        var contract = loadActiveContract()
        if (!contract || !contract.id || contract.status === 'COMPLETED') {
            rollNewOnuContract(event.server, true)
        }
    }
})

ServerEvents.loaded(function(event) {
    var c = loadActiveContract()
    if (!c || !c.id) {
        rollNewOnuContract(event.server, false)
    }
})
