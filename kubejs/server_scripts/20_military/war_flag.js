// priority: 48
// =============================================================================
// Third World Server Script - Moteur de Capture The Flag (Autels & Étendards)
// =============================================================================

var ALTARS_FILE = 'altars.json'
var ALTARS_CACHE = null

/**
 * Charge le registre des autels nationaux
 */
function loadAltarsData() {
    if (ALTARS_CACHE !== null) return ALTARS_CACHE
    var fileData = (typeof readJsonData === 'function') ? readJsonData(ALTARS_FILE) : null
    if (fileData) {
        ALTARS_CACHE = (typeof toJsObject === 'function') ? toJsObject(fileData) : fileData
        return ALTARS_CACHE
    }
    ALTARS_CACHE = {}
    return ALTARS_CACHE
}

/**
 * Sauvegarde le registre des autels nationaux
 */
function saveAltarsData(data) {
    ALTARS_CACHE = data || {}
    if (typeof writeJsonData === 'function') {
        writeJsonData(ALTARS_FILE, ALTARS_CACHE)
    }
}

/**
 * Récupère l'autel national d'une équipe
 */
function getNationAltar(teamId) {
    if (!teamId) return null
    var altars = loadAltarsData()
    var sId = teamId.toString()
    return altars[sId] || null
}

/**
 * Vérifie si une nation a configuré son autel
 */
function hasNationAltar(teamId) {
    var altar = getNationAltar(teamId)
    return altar !== null && typeof altar === 'object' && altar.x !== undefined
}

/**
 * Réinitialise l'autel d'une nation à son état sécurisé à la base
 */
function resetNationAltarFlag(server, teamId) {
    if (!teamId) return
    var altars = loadAltarsData()
    var sId = teamId.toString()
    if (altars[sId]) {
        altars[sId].status = 'AT_BASE'
        altars[sId].carrierUuid = null
        altars[sId].carrierName = null
        altars[sId].dropPos = null
        altars[sId].updatedAt = Date.now()
        saveAltarsData(altars)
    }
}

/**
 * Génère l'item Étendard National (Bannière customisée avec NBT)
 */
function createFlagItem(defendingTeamId, defendingTeamName, conflictId) {
    var defName = defendingTeamName || 'Nation'
    return Item.of('minecraft:black_banner', {
        display: {
            Name: '{"text":"Étendard National : ' + defName + '","color":"gold","bold":true}',
            Lore: [
                '{"text":"Drapeau officiel - À livrer UNIQUEMENT au Hub de l\'ONU","color":"yellow"}',
                '{"text":"Téléportations, Ender Pearls et Stockage STRICTEMENT INTERDITS","color":"red"}'
            ]
        },
        NationFlag: true,
        DefendingTeam: String(defendingTeamId),
        ConflictId: String(conflictId || '')
    })
}

/**
 * Vérifie si un joueur possède un Étendard National dans son inventaire
 */
function hasPlayerNationFlag(player) {
    if (!player) return false
    try {
        var inv = player.getInventory()
        if (!inv) return false
        var size = inv.getContainerSize ? inv.getContainerSize() : 36
        for (var i = 0; i < size; i++) {
            var item = inv.getItem(i)
            if (item && !item.isEmpty()) {
                var nbt = item.getNbt ? item.getNbt() : item.nbt
                if (nbt) {
                    if (nbt.NationFlag === true || nbt.NationFlag === 1 || nbt.contains('NationFlag')) {
                        return true
                    }
                }
            }
        }
    } catch (e) {}
    return false
}

/**
 * Récupère l'item Étendard porté par le joueur
 */
function getPlayerNationFlagItem(player) {
    if (!player) return null
    try {
        var inv = player.getInventory()
        if (!inv) return null
        var size = inv.getContainerSize ? inv.getContainerSize() : 36
        for (var i = 0; i < size; i++) {
            var item = inv.getItem(i)
            if (item && !item.isEmpty()) {
                var nbt = item.getNbt ? item.getNbt() : item.nbt
                if (nbt && (nbt.NationFlag === true || nbt.NationFlag === 1 || nbt.contains('NationFlag'))) {
                    return item
                }
            }
        }
    } catch (e) {}
    return null
}

/**
 * Retire tous les drapeaux d'État de l'inventaire d'un joueur
 */
function removePlayerNationFlag(player) {
    if (!player) return
    try {
        var inv = player.getInventory()
        if (!inv) return
        var size = inv.getContainerSize ? inv.getContainerSize() : 36
        for (var i = 0; i < size; i++) {
            var item = inv.getItem(i)
            if (item && !item.isEmpty()) {
                var nbt = item.getNbt ? item.getNbt() : item.nbt
                if (nbt && (nbt.NationFlag === true || nbt.NationFlag === 1 || nbt.contains('NationFlag'))) {
                    inv.setItem(i, Item.empty)
                }
            }
        }
    } catch (e) {}
}

/**
 * Purge tous les items drapeaux liés à un conflit chez tous les joueurs
 */
function removeAllConflictFlags(server, conflictId) {
    if (!server) return
    try {
        var players = server.getPlayerList().getPlayers()
        for (var i = 0; i < players.size(); i++) {
            var p = players.get(i)
            if (p && hasPlayerNationFlag(p)) {
                removePlayerNationFlag(p)
            }
        }
    } catch (e) {}
}

/**
 * Commande /nation setaltar : Définit le bloc ciblé comme Autel National
 */
function handleNationSetAltar(player) {
    if (!player) return 0
    var server = player.server
    var team = (typeof getPlayerNationTeam === 'function') ? getPlayerNationTeam(player) : null
    if (!team) {
        sendMsg(player, 'Autel National', 'Vous devez appartenir à une nation pour poser un Autel National.', '§c')
        return 0
    }

    // 1. Droit hiérarchique (Leader ou Officier)
    if (typeof canManageNation === 'function' && !canManageNation(team, player)) {
        sendMsg(player, 'Autel National', 'Seuls les dirigeants et officiers peuvent enregistrer l\'Autel National.', '§c')
        return 0
    }

    // 2. Vérification territoriale (dans un chunk claimé de sa nation)
    if (typeof checkClaimForHome === 'function') {
        var claimCheck = checkClaimForHome(team, player)
        if (!claimCheck.allowed) {
            sendMsg(player, 'Autel National', claimCheck.reason || 'Vous devez impérativement vous trouver dans un claim de votre nation !', '§c')
            return 0
        }
    }

    // 3. Interdiction de modifier l'autel en affrontement actif
    if (typeof getTeamActiveWars === 'function') {
        var activeWars = getTeamActiveWars(server, team.getId())
        if (activeWars && activeWars.length > 0) {
            sendMsg(player, 'Autel National', 'Impossible de modifier ou déplacer l\'Autel National en période d\'affrontement actif !', '§c')
            return 0
        }
    }

    // 4. Ciblage du bloc regardé ou position actuelle
    var targetPos = null
    var blockId = 'minecraft:lodestone'
    try {
        var hit = player.rayTrace(5.0)
        if (hit && hit.block) {
            targetPos = { x: hit.block.x, y: hit.block.y, z: hit.block.z }
            blockId = hit.block.id
        }
    } catch (e) {}
    if (!targetPos) {
        targetPos = { x: Math.floor(player.x), y: Math.floor(player.y), z: Math.floor(player.z) }
    }

    var dimId = (typeof getEntityDimensionId === 'function') ? getEntityDimensionId(player) : 'minecraft:overworld'
    var altars = loadAltarsData()
    var teamIdStr = team.getId().toString()

    altars[teamIdStr] = {
        teamId: teamIdStr,
        teamName: team.getName().getString(),
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        dimension: dimId,
        blockId: blockId,
        status: 'AT_BASE',
        carrierUuid: null,
        carrierName: null,
        dropPos: null,
        updatedAt: Date.now()
    }
    saveAltarsData(altars)

    sendMsg(player, 'Autel National', '§aAutel National configuré avec succès en §eX: ' + targetPos.x + ', Y: ' + targetPos.y + ', Z: ' + targetPos.z + ' §7(Bloc: ' + blockId + ') !', '§a')
    notifyTeam(team, 'Autel National', 'Le dirigeant a enregistré l\'Autel National en X: ' + targetPos.x + ', Y: ' + targetPos.y + ', Z: ' + targetPos.z + ' !', '§a')
    return 1
}

/**
 * Commande /nation altar : Affiche la fiche de l'autel national et l'objectif en conflit
 */
function handleNationAltarInfo(player) {
    if (!player) return 0
    var server = player.server
    var team = (typeof getPlayerNationTeam === 'function') ? getPlayerNationTeam(player) : null
    if (!team) {
        sendMsg(player, 'Autel', 'Vous devez faire partie d\'une nation pour consulter l\'Autel.', '§c')
        return 0
    }

    var teamIdStr = team.getId().toString()
    var altar = getNationAltar(teamIdStr)

    sendMsg(player, 'Autel National', '--- État de l\'Autel National ---', '§6')
    if (!altar) {
        sendMsg(player, 'Autel National', 'Aucun Autel n\'a été configuré. Utilisez : §e/nation setaltar', '§c')
    } else {
        var statusFr = '§aÀ la base (Sécurisé)'
        if (altar.status === 'STOLEN') statusFr = '§c§lVOLÉ par ' + (altar.carrierName || 'un ennemi')
        else if (altar.status === 'DROPPED') statusFr = '§eAu sol en X: ' + (altar.dropPos ? altar.dropPos.x : '?') + ', Z: ' + (altar.dropPos ? altar.dropPos.z : '?')

        sendMsg(player, 'Autel National', 'Position : §eX: ' + altar.x + ', Y: ' + altar.y + ', Z: ' + altar.z + ' §7(' + altar.dimension + ')', '§7')
        sendMsg(player, 'Autel National', 'Bloc : §f' + (altar.blockId || 'standard') + ' §7| Statut : ' + statusFr, '§7')
    }

    // Si la nation est en conflit en tant qu'ATTAQUANT, afficher les coordonnées de la cible !
    var wars = (typeof loadWarsRegistry === 'function') ? loadWarsRegistry(server) : null
    if (wars) {
        for (var id in wars) {
            var w = (typeof getWar === 'function') ? getWar(wars, id) : wars[id]
            if (!w || w.type !== 'CONFLICT' || (w.status !== 'ACTIVE' && w.status !== 'COUNTDOWN')) continue

            var atkId = w.attackerTeamId || w.attackerLeader
            var defId = w.defenderTeamId || w.defenderLeader

            if (atkId === teamIdStr) {
                var defAltar = getNationAltar(defId)
                sendMsg(player, 'Mission Conflit #' + w.id, '--- OBJECTIF D\'ASSAUT ---', '§c')
                sendMsg(player, 'Mission Conflit #' + w.id, 'Nation à assiéger : §e' + (w.defenderName || 'Défenseur'), '§e')
                if (defAltar) {
                    sendMsg(player, 'Mission Conflit #' + w.id, 'Autel adverse : §eX: ' + defAltar.x + ', Y: ' + defAltar.y + ', Z: ' + defAltar.z + ' §7(' + defAltar.dimension + ')', '§c')
                    sendMsg(player, 'Mission Conflit #' + w.id, 'Statut de leur Étendard : §f' + defAltar.status, '§7')
                } else {
                    sendMsg(player, 'Mission Conflit #' + w.id, 'Autel adverse non détecté.', '§7')
                }
                sendMsg(player, 'Mission Conflit #' + w.id, '§7Objectif : Volez leur Étendard et ramenez-le au §bHub de l\'ONU (-204, -172) §7!', '§a')
                break
            } else if (defId === teamIdStr) {
                sendMsg(player, 'Défense Conflit #' + w.id, '§6Votre Étendard est ciblé par §e' + (w.attackerName || 'l\'attaquant') + ' §6! Tenez la position pendant 60 min pour remporter les 500 R !', '§6')
                break
            }
        }
    }

    return 1
}

/**
 * Validation de la capture au Hub de l'ONU (-204, -172)
 */
function handleFlagCaptureAtOnu(player) {
    if (!player) return false
    var server = player.server
    if (!server) return false

    if (!hasPlayerNationFlag(player)) {
        sendMsg(player, 'ONU', 'Vous ne portez aucun Étendard National sur vous !', '§c')
        return false
    }

    var px = Math.floor(player.x)
    var pz = Math.floor(player.z)
    var dimStr = String((typeof getEntityDimensionId === 'function') ? getEntityDimensionId(player) : 'minecraft:overworld').toLowerCase()

    // Vérification de la zone du Hub ONU
    var inOnuZone = false
    if (dimStr.indexOf('overworld') !== -1) {
        var dx = Math.abs(px - (-204))
        var dz = Math.abs(pz - (-172))
        if (dx <= 60 && dz <= 60) {
            inOnuZone = true
        }
    }

    if (!inOnuZone) {
        sendMsg(player, 'ONU', 'La validation de capture se fait UNIQUEMENT au Hub de l\'ONU (-204, -172) !', '§c')
        return false
    }

    var playerTeam = (typeof getPlayerNationTeam === 'function') ? getPlayerNationTeam(player) : null
    if (!playerTeam) {
        sendMsg(player, 'ONU', 'Vous n\'appartenez à aucune nation reconnue.', '§c')
        return false
    }

    var playerTeamId = playerTeam.getId().toString()
    var wars = (typeof loadWarsRegistry === 'function') ? loadWarsRegistry(server) : null
    var activeConflict = null

    if (wars) {
        for (var id in wars) {
            var w = (typeof getWar === 'function') ? getWar(wars, id) : wars[id]
            if (!w || w.type !== 'CONFLICT' || w.status !== 'ACTIVE') continue

            var atkId = w.attackerTeamId || w.attackerLeader
            if (atkId === playerTeamId) {
                activeConflict = w
                break
            }
        }
    }

    if (!activeConflict) {
        sendMsg(player, 'ONU', 'Aucun Conflit actif n\'est en cours pour votre équipe en tant qu\'attaquant.', '§c')
        return false
    }

    // Validation de la victoire !
    removePlayerNationFlag(player)
    resetNationAltarFlag(server, activeConflict.defenderTeamId || activeConflict.defenderLeader)

    if (typeof resolveConflictVictory === 'function') {
        resolveConflictVictory(server, activeConflict.id, playerTeam.getId())
    }

    broadcastMsg(server, 'Victoire ONU', '§6' + player.getName().getString() + ' §aa livré l\'Étendard ennemi au Hub de l\'ONU ! §a§lCAPTURE VALIDÉE !', '§2')

    try {
        var pList = server.getPlayerList().getPlayers()
        for (var i = 0; i < pList.size(); i++) {
            var p = pList.get(i)
            if (p) p.playNotifySound('minecraft:ui.toast.challenge_complete', 'master', 1.0, 1.0)
        }
    } catch (e) {}

    return true
}

// -----------------------------------------------------------------------------
// 1. INTERACTION AVEC L'AUTEL (BlockEvents.rightClicked)
// -----------------------------------------------------------------------------
BlockEvents.rightClicked(function(event) {
    try {
        var block = event.block
        var player = event.player
        if (!block || !player || player.isFake()) return
        var level = event.level
        if (!level || level.isClientSide()) return
        var server = level.server
        if (!server) return

        var bx = block.getX()
        var by = block.getY()
        var bz = block.getZ()
        var bDim = (typeof getLevelDimKey === 'function') ? String(getLevelDimKey(level)) : 'minecraft:overworld'

        // A. Clic au Hub ONU pour validation avec l'Étendard
        var bId = block.getId()
        if (bId === 'minecraft:lectern' || bId === 'minecraft:bell' || bId === 'minecraft:barrel' || bId === 'minecraft:lodestone') {
            if (hasPlayerNationFlag(player)) {
                var dx = Math.abs(bx - (-204))
                var dz = Math.abs(bz - (-172))
                if (dx <= 60 && dz <= 60) {
                    event.cancel()
                    handleFlagCaptureAtOnu(player)
                    return
                }
            }
        }

        // B. Clic sur un Autel National
        var altars = loadAltarsData()
        var hitTeamId = null
        var hitAltar = null

        for (var tId in altars) {
            var alt = altars[tId]
            if (!alt) continue
            if (alt.x === bx && alt.y === by && alt.z === bz) {
                hitTeamId = tId
                hitAltar = alt
                break
            }
        }

        if (!hitAltar) return // Ce n'est pas un autel

        var playerTeam = (typeof getPlayerNationTeam === 'function') ? getPlayerNationTeam(player) : null
        var pTeamId = playerTeam ? playerTeam.getId().toString() : null

        // 1. Clic sur son PROPRE autel national
        if (pTeamId && pTeamId === hitTeamId) {
            event.cancel()
            sendMsg(player, 'Autel National', 'Votre Étendard National est scellé à l\'autel pour le conflit. Vous devez le DÉFENDRE !', '§c')
            try { player.playSound('minecraft:block.beacon.ambient', 1.0, 1.0) } catch (se) {}
            return
        }

        // 2. Clic sur un autel adverse
        if (playerTeam) {
            // Vérifier s'il y a un conflit actif où playerTeam est ATTAQUANT et hitTeamId est DÉFENSEUR
            var wars = (typeof loadWarsRegistry === 'function') ? loadWarsRegistry(server) : null
            var conflict = null
            if (wars) {
                for (var id in wars) {
                    var w = (typeof getWar === 'function') ? getWar(wars, id) : wars[id]
                    if (!w || w.type !== 'CONFLICT') continue
                    if (w.status !== 'ACTIVE' && w.status !== 'COUNTDOWN') continue

                    var atkId = w.attackerTeamId || w.attackerLeader
                    var defId = w.defenderTeamId || w.defenderLeader

                    if (atkId === pTeamId && defId === hitTeamId) {
                        conflict = w
                        break
                    }
                }
            }

            if (conflict) {
                event.cancel()
                if (conflict.status === 'COUNTDOWN') {
                    sendMsg(player, 'Conflit', 'Le préavis est toujours en cours ! Début de l\'assaut dans quelques instants.', '§e')
                    return
                }

                if (conflict.status === 'ACTIVE') {
                    if (hitAltar.status === 'AT_BASE') {
                        // VOL RÉUSSI DU DRAPEAU !
                        var flagItem = createFlagItem(hitTeamId, hitAltar.teamName, conflict.id)
                        player.give(flagItem)

                        hitAltar.status = 'STOLEN'
                        hitAltar.carrierUuid = player.getStringUuid ? player.getStringUuid() : player.uuid.toString()
                        hitAltar.carrierName = player.getName().getString()
                        hitAltar.updatedAt = Date.now()
                        saveAltarsData(altars)

                        conflict.flagCarrierUuid = hitAltar.carrierUuid
                        conflict.carrierTeamId = pTeamId
                        if (typeof saveWarsRegistry === 'function') saveWarsRegistry(server, wars)

                        // Appliquer Glowing
                        try {
                            server.runCommandSilent('effect give ' + player.getName().getString() + ' minecraft:glowing 300 0 true')
                        } catch (ee) {}

                        broadcastMsg(server, 'ALERTE ÉTENDARD', '§c§l' + player.getName().getString() + ' §f(§6' + playerTeam.getName().getString() + '§f) a VOLÉ l\'Étendard de §6' + hitAltar.teamName + '§f ! Il tente de le ramener à l\'ONU !', '§4')

                        try {
                            var pList = server.getPlayerList().getPlayers()
                            for (var j = 0; j < pList.size(); j++) {
                                var op = pList.get(j)
                                if (op) op.playNotifySound('minecraft:entity.elder_guardian.curse', 'master', 0.8, 1.0)
                            }
                        } catch (se2) {}

                        return
                    } else if (hitAltar.status === 'STOLEN') {
                        sendMsg(player, 'Conflit', 'L\'Étendard a déjà été extrait par ' + (hitAltar.carrierName || 'un allié') + ' !', '§e')
                        return
                    } else if (hitAltar.status === 'DROPPED') {
                        sendMsg(player, 'Conflit', 'L\'Étendard est tombé au sol ! Retrouvez-le avant les défenseurs.', '§e')
                        return
                    }
                }
            } else {
                // Non concerné ou défenseur essayant de cliquer sur l'autel attaquant
                event.cancel()
                sendMsg(player, 'Autel', 'Cet Autel National n\'est pas accessible. Votre rôle est de défendre votre propre base !', '§7')
                return
            }
        }
    } catch (err) {
        console.error('[WarFlag] Erreur rightClicked autel : ' + err)
    }
})

// -----------------------------------------------------------------------------
// 2. INTERACTION PNJ ONU AVEC LE DRAPEAU (ItemEvents.entityInteracted)
// -----------------------------------------------------------------------------
ItemEvents.entityInteracted(function(event) {
    try {
        var target = event.target
        var player = event.player
        if (!target || !player) return

        if (typeof isEntityOnuNpc === 'function' && isEntityOnuNpc(target)) {
            if (hasPlayerNationFlag(player)) {
                event.cancel()
                handleFlagCaptureAtOnu(player)
            }
        }
    } catch (e) {}
})

// -----------------------------------------------------------------------------
// 3. RESTRICTIONS STRICTES SUR LE PORTEUR DU DRAPEAU
// -----------------------------------------------------------------------------

// Interdiction du lancer d'Ender Pearl pour le porteur
ItemEvents.rightClicked('minecraft:ender_pearl', function(event) {
    try {
        var player = event.player
        if (player && hasPlayerNationFlag(player)) {
            event.cancel()
            sendMsg(player, 'Étendard', 'Téléportation interdite : Le lancer d\'Ender Pearl est bloqué pour le porteur du drapeau ! Rentrez à pied ou en véhicule !', '§c')
            try { player.playSound('minecraft:entity.villager.no', 1.0, 1.0) } catch (ve) {}
        }
    } catch (e) {}
})

// Interdiction d'ouvrir un sac à dos ou un coffre d'Ender
BlockEvents.rightClicked(function(event) {
    try {
        var player = event.player
        if (!player || player.isFake()) return
        if (!hasPlayerNationFlag(player)) return

        var bId = event.block.getId()
        if (bId === 'minecraft:ender_chest' || bId.includes('sophisticatedbackpacks') || bId.includes('backpack')) {
            event.cancel()
            sendMsg(player, 'Étendard', 'Interdiction de stocker l\'Étendard National dans un sac ou un coffre de l\'Ender !', '§c')
            try { player.playSound('minecraft:entity.villager.no', 1.0, 1.0) } catch (ve) {}
        }
    } catch (e) {}
})

// -----------------------------------------------------------------------------
// 4. MORT DU PORTEUR & CHUTE DU DRAPEAU (EntityEvents.death)
// -----------------------------------------------------------------------------
EntityEvents.death(function(event) {
    try {
        var entity = event.entity
        if (!entity || !entity.isPlayer()) return
        var player = entity
        if (!hasPlayerNationFlag(player)) return

        var level = player.level
        var server = player.server
        var px = Math.floor(player.x)
        var py = Math.floor(player.y)
        var pz = Math.floor(player.z)
        var pDim = (typeof getEntityDimensionId === 'function') ? getEntityDimensionId(player) : 'minecraft:overworld'

        var flagItem = getPlayerNationFlagItem(player)
        removePlayerNationFlag(player)

        // Trouver l'autel correspondant
        var altars = loadAltarsData()
        for (var tId in altars) {
            var alt = altars[tId]
            if (alt && alt.status === 'STOLEN' && alt.carrierUuid === (player.getStringUuid ? player.getStringUuid() : player.uuid.toString())) {
                alt.status = 'DROPPED'
                alt.carrierUuid = null
                alt.carrierName = null
                alt.dropPos = { x: px, y: py, z: pz, dim: pDim }
                alt.updatedAt = Date.now()
                saveAltarsData(altars)

                broadcastMsg(server, 'CHUTE ÉTENDARD', '§c§lLE PORTEUR EST TOMBÉ ! §fL\'Étendard de §6' + alt.teamName + ' §fgît au sol en §bX: ' + px + ', Y: ' + py + ', Z: ' + pz + ' §f!', '§4')
                break
            }
        }
    } catch (e) {
        console.error('[WarFlag] Erreur EntityEvents.death : ' + e)
    }
})

// -----------------------------------------------------------------------------
// 5. ANTI COMBAT-LOG (PlayerEvents.loggedOut)
// -----------------------------------------------------------------------------
PlayerEvents.loggedOut(function(event) {
    try {
        var player = event.player
        if (!player) return
        if (hasPlayerNationFlag(player)) {
            var px = Math.floor(player.x)
            var py = Math.floor(player.y)
            var pz = Math.floor(player.z)
            var pDim = (typeof getEntityDimensionId === 'function') ? getEntityDimensionId(player) : 'minecraft:overworld'
            var server = player.server

            var altars = loadAltarsData()
            for (var tId in altars) {
                var alt = altars[tId]
                if (alt && (alt.status === 'STOLEN' || alt.carrierUuid === (player.getStringUuid ? player.getStringUuid() : player.uuid.toString()))) {
                    alt.status = 'DROPPED'
                    alt.carrierUuid = null
                    alt.carrierName = null
                    alt.dropPos = { x: px, y: py, z: pz, dim: pDim }
                    alt.updatedAt = Date.now()
                    saveAltarsData(altars)

                    broadcastMsg(server, 'COMBAT-LOG', '§4§l[COMBAT-LOG DÉTECTÉ] §e' + player.getName().getString() + ' §cs\'est déconnecté avec l\'Étendard ! Le joueur a été exécuté et le drapeau est au sol en §bX: ' + px + ', Y: ' + py + ', Z: ' + pz + '§c.', '§4')
                    break
                }
            }

            try { player.kill() } catch (ke) {}
        }
    } catch (e) {}
})

// -----------------------------------------------------------------------------
// 6. CADENCE DE TICK : GLOWING, RADAR & SÉCURISATION AU SOL (MASTER SCHEDULER)
// -----------------------------------------------------------------------------
if (typeof TW_Scheduler !== 'undefined' && TW_Scheduler.register) {
    TW_Scheduler.register('war_flag_tick', 10, function(server) {
        try {
            if (!server) return
            var tick = server.getTickCount()


        // Toutes les 10 ticks (0.5s) : Proximité du drapeau au sol & Glowing
        if (tick % 10 === 0) {
            var altars = loadAltarsData()
            var players = server.getPlayerList().getPlayers()

            // 1. Maintien de l'effet Glowing sur tout porteur
            for (var i = 0; i < players.size(); i++) {
                var p = players.get(i)
                if (p && hasPlayerNationFlag(p)) {
                    try {
                        server.runCommandSilent('effect give ' + p.getName().getString() + ' minecraft:glowing 5 0 true')
                    } catch (ge) {}
                }
            }

            // 2. Détection de joueurs proches d'un drapeau au sol (DROPPED)
            for (var teamId in altars) {
                var alt = altars[teamId]
                if (alt && alt.status === 'DROPPED' && alt.dropPos) {
                    var dxTarget = alt.dropPos.x
                    var dyTarget = alt.dropPos.y
                    var dzTarget = alt.dropPos.z
                    var dDim = alt.dropPos.dim

                    for (var j = 0; j < players.size(); j++) {
                        var nearP = players.get(j)
                        if (!nearP || nearP.isSpectator()) continue

                        var pDim = (typeof getEntityDimensionId === 'function') ? getEntityDimensionId(nearP) : 'minecraft:overworld'
                        if (pDim !== dDim) continue

                        var distSq = (nearP.x - dxTarget) * (nearP.x - dxTarget) + (nearP.y - dyTarget) * (nearP.y - dyTarget) + (nearP.z - dzTarget) * (nearP.z - dzTarget)
                        if (distSq <= 6.25) { // Dans un rayon de 2.5 blocs
                            var pTeam = (typeof getPlayerNationTeam === 'function') ? getPlayerNationTeam(nearP) : null
                            if (!pTeam) continue
                            var pTeamId = pTeam.getId().toString()

                            // Cas A : Le joueur est DÉFENSEUR (sa propre nation possède ce drapeau)
                            if (pTeamId === teamId) {
                                // SÉCURISATION TRIOMPHALE DU DRAPEAU !
                                alt.status = 'AT_BASE'
                                alt.carrierUuid = null
                                alt.carrierName = null
                                alt.dropPos = null
                                alt.updatedAt = Date.now()
                                saveAltarsData(altars)

                                broadcastMsg(server, 'DÉFENSE HÉROÏQUE', '§a§lDRAPEAU SÉCURISÉ ! §6' + nearP.getName().getString() + ' §aa touché leur Étendard au sol ! Il est immédiatement retourné à leur Autel National !', '§2')

                                try {
                                    var pList2 = server.getPlayerList().getPlayers()
                                    for (var k = 0; k < pList2.size(); k++) {
                                        var op2 = pList2.get(k)
                                        if (op2) op2.playNotifySound('minecraft:ui.toast.challenge_complete', 'master', 1.0, 1.0)
                                    }
                                } catch (se3) {}
                                break
                            }
                            // Cas B : Le joueur est ATTAQUANT
                            else {
                                var wars = (typeof loadWarsRegistry === 'function') ? loadWarsRegistry(server) : null
                                var isAttackerInConflict = false
                                var confId = null
                                if (wars) {
                                    for (var cId in wars) {
                                        var cw = (typeof getWar === 'function') ? getWar(wars, cId) : wars[cId]
                                        if (cw && cw.type === 'CONFLICT' && cw.status === 'ACTIVE') {
                                            if ((cw.attackerTeamId || cw.attackerLeader) === pTeamId && (cw.defenderTeamId || cw.defenderLeader) === teamId) {
                                                isAttackerInConflict = true
                                                confId = cw.id
                                                break
                                            }
                                        }
                                    }
                                }

                                if (isAttackerInConflict && !hasPlayerNationFlag(nearP)) {
                                    // REPRISE DU DRAPEAU !
                                    var fItem = createFlagItem(teamId, alt.teamName, confId)
                                    nearP.give(fItem)

                                    alt.status = 'STOLEN'
                                    alt.carrierUuid = nearP.getStringUuid ? nearP.getStringUuid() : nearP.uuid.toString()
                                    alt.carrierName = nearP.getName().getString()
                                    alt.dropPos = null
                                    alt.updatedAt = Date.now()
                                    saveAltarsData(altars)

                                    broadcastMsg(server, 'REPRISE DU DRAPEAU', '§e§l' + nearP.getName().getString() + ' §fa ramassé l\'Étendard au sol et fonce vers le Hub de l\'ONU !', '§e')
                                    break
                                }
                            }
                        }
                    }
                }
            }
        }

        // Toutes les 600 ticks (30s) : Radar traqueur du chat
        if (tick % 600 === 0) {
            var altarsRadar = loadAltarsData()
            for (var radTeamId in altarsRadar) {
                var radAlt = altarsRadar[radTeamId]
                if (radAlt && radAlt.status === 'STOLEN' && radAlt.carrierUuid) {
                    var carrierPlayer = server.getPlayerList().getPlayer(UUID.fromString(radAlt.carrierUuid))
                    if (carrierPlayer) {
                        var cx = Math.floor(carrierPlayer.x)
                        var cy = Math.floor(carrierPlayer.y)
                        var cz = Math.floor(carrierPlayer.z)
                        broadcastMsg(server, 'Radar ONU', '§eLe porteur de l\'Étendard de §6" + radAlt.teamName + " §f(§e" + carrierPlayer.getName().getString() + "§f) est repéré en §bX: ' + cx + ', Y: ' + cy + ', Z: ' + cz + ' §f!', '§e')
                    }
                }
            }
        }
    } catch (tickErr) {
        console.error('[WarFlag] Erreur tick : ' + tickErr)
    }
    })
}

