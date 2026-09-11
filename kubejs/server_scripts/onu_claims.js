// priority: 55
// =============================================================================
// Third World Server Script - Protection Territoriale & Anti-Grief du Hub ONU
// =============================================================================

var ONU_HUB_CONFIG = {
    x: -204,
    z: -172,
    radius: 200
}

var cachedOnuTeam = null

/**
 * Message d'alerte territorial ONU pour le joueur
 */
function sendClaimMsg(player, text, color) {
    if (!player) return
    try {
        var col = color || '§c'
        player.tell(Text.of('§8[§bONU§8] ' + col + text))
    } catch (e) {}
}

/**
 * Calcule si un chunk (chunkX, chunkZ) touche le périmètre des 200 blocs de l'ONU (-204, -172)
 */
function isChunkInOnu200Radius(chunkX, chunkZ) {
    var minX = chunkX * 16
    var maxX = minX + 15
    var minZ = chunkZ * 16
    var maxZ = minZ + 15

    var hx = ONU_HUB_CONFIG.x
    var hz = ONU_HUB_CONFIG.z

    var closestX = hx
    if (minX > hx) closestX = minX
    else if (maxX < hx) closestX = maxX

    var closestZ = hz
    if (minZ > hz) closestZ = minZ
    else if (maxZ < hz) closestZ = maxZ

    var dx = closestX - hx
    var dz = closestZ - hz
    var distSq = dx * dx + dz * dz
    if (distSq <= 40000) return true
    if (Math.abs(dx) <= 200 && Math.abs(dz) <= 200) return true
    return false
}

/**
 * Vérifie si une coordonnée (blockX, blockZ) se situe STRICTEMENT dans un chunk officiel de l'ONU
 */
function isPositionInOnuClaim(level, blockX, blockZ) {
    try {
        if (level) {
            var dim = (typeof level.dimension === 'function') ? level.dimension() : level.dimension
            var loc = dim ? ((typeof dim.location === 'function') ? dim.location() : dim.location) : ''
            var dimStr = String(loc || '').toLowerCase()
            if (dimStr && dimStr.indexOf('overworld') === -1) return false
        }

        var bx = Math.floor(blockX)
        var bz = Math.floor(blockZ)
        var chunkX = bx >> 4
        var chunkZ = bz >> 4

        // 1. Vérification dynamique via FTB Chunks (priorité absolue)
        try {
            var chunksApi = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksAPI').api()
            if (chunksApi && chunksApi.isManagerLoaded()) {
                var chunkMgr = chunksApi.getManager()
                if (chunkMgr) {
                    var LevelClass = Java.loadClass('net.minecraft.world.level.Level')
                    var dimKey = LevelClass.OVERWORLD
                    try {
                        if (level && typeof level.dimension === 'function') dimKey = level.dimension()
                        else if (level && level.dimension) dimKey = level.dimension
                    } catch (dErr) {}

                    var ChunkDimPosClass = Java.loadClass('dev.ftb.mods.ftblibrary.math.ChunkDimPos')
                    var pos = new ChunkDimPosClass(dimKey, chunkX, chunkZ)
                    var claim = chunkMgr.getChunk(pos)
                    if (claim && claim.getTeamData()) {
                        var team = claim.getTeamData().getTeam()
                        if (team) {
                            var sName = team.getShortName() ? String(team.getShortName()).toLowerCase() : ''
                            if (sName === 'onu') return true
                            if (cachedOnuTeam && team.getId().equals(cachedOnuTeam.getId())) return true
                            var teamIdStr = String(team.getId())
                            if (teamIdStr === 'cb440140-1d45-4eff-9b10-2bab3d457d63') return true
                        }
                    }
                    // Si le chunk est sauvage ou appartient à une autre nation, ce n'est PAS l'ONU
                    return false
                }
            }
        } catch (apiErr) {}

        // 2. Cache de secours (uniquement pour les 16 chunks officiels de l'ONU : cx -14..-11, cz -12..-9)
        if (chunkX >= -14 && chunkX <= -11 && chunkZ >= -12 && chunkZ <= -9) {
            return true
        }
    } catch (e) {}
    return false
}

/**
 * Vérifie si un bloc se situe dans les territoires du Hub de l'ONU
 */
function isBlockInOnuHub(level, blockX, blockZ) {
    return isPositionInOnuClaim(level, blockX, blockZ)
}

/**
 * Configure les propriétés FTB Chunks de l'ONU pour autoriser les interactions PNJ
 * et interdire le PVP et les explosions
 */
function configureOnuTeamProperties(server, onuTeam) {
    if (!onuTeam) return
    try {
        var FTBChunksProperties = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksProperties')
        var PrivacyMode = Java.loadClass('dev.ftb.mods.ftbteams.api.property.PrivacyMode')
        if (FTBChunksProperties && PrivacyMode) {
            try { onuTeam.setProperty(FTBChunksProperties.ENTITY_INTERACT_MODE, PrivacyMode.PUBLIC) } catch (e1) {}
            try { onuTeam.setProperty(FTBChunksProperties.BLOCK_INTERACT_MODE, PrivacyMode.PUBLIC) } catch (e2) {}
            try { onuTeam.setProperty(FTBChunksProperties.ALLOW_PVP, false) } catch (e3) {}
            try { onuTeam.setProperty(FTBChunksProperties.ALLOW_EXPLOSIONS, false) } catch (e4) {}
            try { onuTeam.setProperty(FTBChunksProperties.ALLOW_MOB_GRIEFING, false) } catch (e5) {}
        }
    } catch (e) {
        console.error('[ONU Claims] Erreur configuration FTB properties : ' + e)
    }

    if (server) {
        try {
            server.runCommandSilent('ftbteams server settings onu ftbchunks:entity_interact_mode public')
            server.runCommandSilent('ftbteams server settings onu ftbchunks:block_interact_mode public')
            server.runCommandSilent('ftbteams server settings onu ftbchunks:allow_pvp false')
            server.runCommandSilent('ftbteams server settings onu ftbchunks:allow_explosions false')
            server.runCommandSilent('ftbteams server settings onu ftbchunks:allow_mob_griefing false')
        } catch (ce) {}
    }
}

/**
 * Récupère ou instancie l'Équipe Serveur officielle de l'ONU
 */
function getOrCreateOnuTeam(server) {
    if (cachedOnuTeam) return cachedOnuTeam
    if (!server) return null
    try {
        var teamsApi = Java.loadClass('dev.ftb.mods.ftbteams.api.FTBTeamsAPI').api()
        if (!teamsApi || !teamsApi.isManagerLoaded()) return null
        var teamMgr = teamsApi.getManager()
        if (!teamMgr) return null

        // 1. Recherche par nom direct
        var opt = teamMgr.getTeamByName('onu')
        if (opt && opt.isPresent()) {
            cachedOnuTeam = opt.get()
            configureOnuTeamProperties(server, cachedOnuTeam)
            return cachedOnuTeam
        }

        // 2. Recherche parmi toutes les équipes existantes
        var teams = teamMgr.getTeams()
        if (teams) {
            var it = teams.iterator()
            while (it.hasNext()) {
                var t = it.next()
                if (t) {
                    var sName = t.getShortName() ? String(t.getShortName()).toLowerCase() : ''
                    var fName = t.getName() ? String(t.getName().getString()).toLowerCase() : ''
                    if (sName === 'onu' || fName.indexOf('onu') !== -1 || fName.indexOf('nations unies') !== -1) {
                        cachedOnuTeam = t
                        configureOnuTeamProperties(server, cachedOnuTeam)
                        return cachedOnuTeam
                    }
                }
            }
        }

        // 3. Création sécurisée via l'API FTB Teams
        var Color4I = Java.loadClass('dev.ftb.mods.ftblibrary.icon.Color4I')
        var onuBlue = Color4I.BLUE
        if (Color4I.fromString) {
            try {
                var parsedColor = Color4I.fromString('#0088FF')
                if (parsedColor) onuBlue = parsedColor
            } catch (ce) {}
        }

        var src = server.createCommandSourceStack()
        try {
            var created = teamMgr.createServerTeam(src, 'onu', 'Organisation des Nations Unies', onuBlue)
            if (created) {
                var TeamProperties = Java.loadClass('dev.ftb.mods.ftbteams.api.property.TeamProperties')
                if (TeamProperties && TeamProperties.DESCRIPTION) {
                    try { created.setProperty(TeamProperties.DESCRIPTION, "Zone Neutre Internationale & Hub ONU") } catch (de) {}
                }
                cachedOnuTeam = created
                configureOnuTeamProperties(server, cachedOnuTeam)
                return cachedOnuTeam
            }
        } catch (createErr) {
            console.warn('[ONU Claims] teamMgr.createServerTeam : ' + createErr)
            server.runCommandSilent('ftbteams server create onu "Organisation des Nations Unies"')
        }

        opt = teamMgr.getTeamByName('onu')
        if (opt && opt.isPresent()) {
            cachedOnuTeam = opt.get()
            configureOnuTeamProperties(server, cachedOnuTeam)
            return cachedOnuTeam
        }
    } catch (e) {
        console.error('[ONU Claims] Erreur getOrCreateOnuTeam : ' + e)
    }
    return null
}

/**
 * Revendique et force-charge les 16 chunks du Hub de l'ONU
 * (4x4 chunks : cx: -2..1, cz: -2..1 autour de x:0, z:0)
 */
function claimOnuChunks(server) {
    if (!server) return
    try {
        var onuTeam = getOrCreateOnuTeam(server)
        if (!onuTeam) {
            console.error('[ONU Claims] Impossible d\'obtenir l\'équipe serveur ONU.')
            return
        }

        configureOnuTeamProperties(server, onuTeam)

        var chunksApi = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksAPI').api()
        if (!chunksApi || !chunksApi.isManagerLoaded()) return
        var chunkMgr = chunksApi.getManager()
        var teamData = chunkMgr.getOrCreateData(onuTeam)
        if (!teamData) return

        // Augmenter largement les quotas de l'ONU
        try { teamData.setExtraClaimChunks(100) } catch (eq) {}
        try { teamData.setExtraForceLoadChunks(100) } catch (ef) {}

        var Level = Java.loadClass('net.minecraft.world.level.Level')
        var ChunkDimPosClass = Java.loadClass('dev.ftb.mods.ftblibrary.math.ChunkDimPos')
        var overworldDim = Level.OVERWORLD
        // Libérer les anciens claims éventuels à (0, 0) si l'ONU les possédait
        for (var oldCx = -2; oldCx <= 1; oldCx++) {
            for (var oldCz = -2; oldCz <= 1; oldCz++) {
                var oldPos = new ChunkDimPosClass(overworldDim, oldCx, oldCz)
                var oldClaim = chunkMgr.getChunk(oldPos)
                if (oldClaim) {
                    var oldOwner = oldClaim.getTeamData().getTeam()
                    if (oldOwner && oldOwner.getId().equals(onuTeam.getId())) {
                        try { oldClaim.unclaim(src, false) } catch (uOld) {}
                    }
                }
            }
        }

        // Revendiquer les 16 chunks (4x4) centrés sur X: -204, Z: -172 (cx: -14..-11, cz: -12..-9)
        var claimedCount = 0
        for (var cx = -14; cx <= -11; cx++) {
            for (var cz = -12; cz <= -9; cz++) {
                var pos = new ChunkDimPosClass(overworldDim, cx, cz)
                var existingClaim = chunkMgr.getChunk(pos)

                if (existingClaim) {
                    var ownerTeam = existingClaim.getTeamData().getTeam()
                    if (ownerTeam && ownerTeam.getId().equals(onuTeam.getId())) {
                        if (!existingClaim.isActuallyForceLoaded()) {
                            try { teamData.forceLoad(src, pos, false, false) } catch (fe) {}
                        }
                        claimedCount++
                        continue
                    } else {
                        // Éjection de tout squat civil ou militaire dans le sanctuaire ONU
                        try { existingClaim.unclaim(src, false) } catch (ue) {}
                    }
                }

                try {
                    teamData.claim(src, pos, false)
                    try { teamData.forceLoad(src, pos, false, false) } catch (fle) {}
                    claimedCount++
                } catch (claimErr) {
                    console.error('[ONU Claims] Erreur claim (' + cx + ', ' + cz + ') : ' + claimErr)
                }
            }
        }
        console.info('[ONU Claims] ' + claimedCount + '/16 chunks du Hub ONU (-204, -172) revendiqués et sécurisés.')
    } catch (err) {
        console.error('[ONU Claims] Erreur claimOnuChunks : ' + err)
    }
}

/**
 * Libère tout chunk revendiqué par des joueurs/nations dans les 200 blocs de l'ONU
 */
function cleanupUnauthorizedOnuZoneClaims(server) {
    if (!server) return
    try {
        var onuTeam = getOrCreateOnuTeam(server)
        var onuTeamId = onuTeam ? onuTeam.getId() : null

        var chunksApi = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksAPI').api()
        if (!chunksApi || !chunksApi.isManagerLoaded()) return
        var chunkMgr = chunksApi.getManager()
        var allChunks = chunkMgr.getAllClaimedChunks()
        if (!allChunks) return

        var src = server.createCommandSourceStack()
        var it = allChunks.iterator()
        var toUnclaim = []

        while (it.hasNext()) {
            var c = it.next()
            if (!c) continue
            var pos = c.getPos()
            if (!pos) continue

            var dim = (typeof pos.dimension === 'function') ? pos.dimension() : pos.dimension
            var loc = dim ? ((typeof dim.location === 'function') ? dim.location() : dim.location) : ''
            var dimStr = String(loc).toLowerCase()
            if (dimStr.indexOf('overworld') === -1) continue

            var cx = pos.x()
            var cz = pos.z()

            if (isChunkInOnu200Radius(cx, cz)) {
                var owner = c.getTeamData().getTeam()
                if (onuTeamId && owner && owner.getId().equals(onuTeamId)) {
                    continue // Territoire officiel de l'ONU
                }
                var sName = (owner && owner.getShortName()) ? String(owner.getShortName()).toLowerCase() : ''
                if (sName === 'onu') {
                    continue
                }

                toUnclaim.push(c)
            }
        }

        var removed = 0
        for (var i = 0; i < toUnclaim.length; i++) {
            var targetChunk = toUnclaim[i]
            try {
                var tp = targetChunk.getPos()
                console.warn('[ONU Claims] Libération claim non autorisé en zone neutre : Chunk (' + tp.x() + ', ' + tp.z() + ')')
                targetChunk.unclaim(src, false)
                removed++
            } catch (ue) {
                console.error('[ONU Claims] Erreur unclaim : ' + ue)
            }
        }

        if (removed > 0) {
            console.info('[ONU Claims] ' + removed + ' claim(s) non autorisé(s) libéré(s) dans le périmètre de 200 blocs.')
        }
    } catch (e) {
        console.error('[ONU Claims] Erreur cleanupUnauthorizedOnuZoneClaims : ' + e)
    }
}

// -----------------------------------------------------------------------------
// 1. BLOCAGE STRICT DU CLAIM DANS LE RAYON DE 200 BLOCS (ClaimedChunkEvent)
// -----------------------------------------------------------------------------
try {
    var ClaimedChunkEvent = Java.loadClass('dev.ftb.mods.ftbchunks.api.event.ClaimedChunkEvent')
    var CompoundEventResult = Java.loadClass('dev.architectury.event.CompoundEventResult')
    var ClaimResult = Java.loadClass('dev.ftb.mods.ftbchunks.api.ClaimResult')

    if (ClaimedChunkEvent && ClaimedChunkEvent.BEFORE_CLAIM) {
        ClaimedChunkEvent.BEFORE_CLAIM.register(function(source, chunk) {
            try {
                if (!chunk) return CompoundEventResult.pass()
                var pos = chunk.getPos()
                if (!pos) return CompoundEventResult.pass()

                var dim = (typeof pos.dimension === 'function') ? pos.dimension() : pos.dimension
                var loc = dim ? ((typeof dim.location === 'function') ? dim.location() : dim.location) : ''
                var dimStr = String(loc).toLowerCase()
                if (dimStr.indexOf('overworld') === -1) return CompoundEventResult.pass()

                var cx = pos.x()
                var cz = pos.z()

                if (isChunkInOnu200Radius(cx, cz)) {
                    // Autoriser l'équipe serveur ONU
                    var chunkTeam = chunk.getTeamData().getTeam()
                    if (chunkTeam) {
                        var sName = chunkTeam.getShortName() ? String(chunkTeam.getShortName()).toLowerCase() : ''
                        var fName = chunkTeam.getName() ? String(chunkTeam.getName().getString()).toLowerCase() : ''
                        if (sName === 'onu' || fName.indexOf('onu') !== -1 || fName.indexOf('nations unies') !== -1) {
                            return CompoundEventResult.pass()
                        }
                        if (cachedOnuTeam && chunkTeam.getId().equals(cachedOnuTeam.getId())) {
                            return CompoundEventResult.pass()
                        }
                    }

                    // Refus catégorique pour les autres joueurs et nations
                    if (source) {
                        try {
                            var player = source.getPlayer()
                            if (player) {
                                sendClaimMsg(player, 'Zone Neutre Internationale : Les claims sont STRICTEMENT INTERDITS à moins de 200 blocs du Hub ONU (-204, -172) !', '§c')
                                try { player.playSound('minecraft:entity.villager.no', 1.0, 1.0) } catch (ve) {}
                            }
                        } catch (pe) {}
                    }

                    return CompoundEventResult.interruptFalse(ClaimResult.customProblem('Zone Internationale : Claim interdit à moins de 200 blocs de l\'ONU (-204, -172) !'))
                }
            } catch (err) {
                console.error('[ONU Claims] Erreur dans BEFORE_CLAIM : ' + err)
            }
            return CompoundEventResult.pass()
        })
    }

    if (ClaimedChunkEvent && ClaimedChunkEvent.BEFORE_UNCLAIM) {
        ClaimedChunkEvent.BEFORE_UNCLAIM.register(function(source, chunk) {
            try {
                if (!chunk) return CompoundEventResult.pass()
                var chunkTeam = chunk.getTeamData().getTeam()
                if (chunkTeam) {
                    var sName = chunkTeam.getShortName() ? String(chunkTeam.getShortName()).toLowerCase() : ''
                    if (sName === 'onu') {
                        if (!source.hasPermission(2)) {
                            return CompoundEventResult.interruptFalse(ClaimResult.customProblem('Les territoires de l\'ONU ne peuvent pas être dé-revendiqués !'))
                        }
                    }
                }
            } catch (ue) {}
            return CompoundEventResult.pass()
        })
    }
} catch (eventErr) {
    console.error('[ONU Claims] Impossible d\'enregistrer les hooks ClaimedChunkEvent : ' + eventErr)
}

// -----------------------------------------------------------------------------
// 2. DÉSACTIVATION STRICTE DU PVP & PVE (PROTECTION ABSOLUE DES PNJ ET JOUEURS)
// -----------------------------------------------------------------------------

// Blocage du coup/clic gauche sur les PNJ ou entre joueurs (AttackEntityEvent)
/**
 * Détecte de façon exhaustive les monstres et créatures hostiles
 */
function isHostileMob(entity) {
    if (!entity) return false
    try {
        var EnemyClass = Java.loadClass('net.minecraft.world.entity.monster.Enemy')
        if (EnemyClass && EnemyClass.isAssignableFrom(entity.getClass())) {
            return true
        }
    } catch (e) {}
    try {
        if (typeof entity.isEnemy === 'function' && entity.isEnemy()) return true
    } catch (e2) {}
    try {
        var typeStr = entity.getType ? String(entity.getType().toString()).toLowerCase() : ''
        if (typeStr.indexOf('zombie') !== -1 || typeStr.indexOf('skeleton') !== -1 || 
            typeStr.indexOf('creeper') !== -1 || typeStr.indexOf('spider') !== -1 || 
            typeStr.indexOf('slime') !== -1 || typeStr.indexOf('phantom') !== -1 || 
            typeStr.indexOf('witch') !== -1 || typeStr.indexOf('pillager') !== -1 || 
            typeStr.indexOf('vindicator') !== -1 || typeStr.indexOf('evoker') !== -1 || 
            typeStr.indexOf('ravager') !== -1 || typeStr.indexOf('enderman') !== -1 || 
            typeStr.indexOf('drowned') !== -1 || typeStr.indexOf('husk') !== -1 || 
            typeStr.indexOf('stray') !== -1 || typeStr.indexOf('silverfish') !== -1 ||
            typeStr.indexOf('blaze') !== -1 || typeStr.indexOf('ghast') !== -1 ||
            typeStr.indexOf('hoglin') !== -1 || typeStr.indexOf('piglin_brute') !== -1 ||
            typeStr.indexOf('warden') !== -1 || typeStr.indexOf('wither') !== -1 ||
            typeStr.indexOf('guardian') !== -1 || typeStr.indexOf('shulker') !== -1 ||
            typeStr.indexOf('monster') !== -1) {
            return true
        }
    } catch (e3) {}
    return false
}

// -----------------------------------------------------------------------------
// 2. DÉSACTIVATION DU PVP & PROTECTION DES PNJ DANS LES CLAIMS DE L'ONU
// (Les monstres hostiles PEUVENT être tués par les joueurs !)
// -----------------------------------------------------------------------------

// Blocage du coup/clic gauche sur les PNJ ou entre joueurs (AttackEntityEvent)
try {
    NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.player.AttackEntityEvent'), function(event) {
        try {
            var target = event.getTarget()
            var player = event.getEntity()
            if (!target || !player) return

            var dimStr = String(getEntityDimensionId(target) || 'minecraft:overworld').toLowerCase()
            if (dimStr.indexOf('overworld') === -1) return

            var tx = Number(target.getX ? target.getX() : target.x)
            var tz = Number(target.getZ ? target.getZ() : target.z)
            var level = target.level ? (typeof target.level === 'function' ? target.level() : target.level) : null

            if (isPositionInOnuClaim(level, tx, tz)) {
                // 1. Autoriser d'attaquer et tuer les monstres / mobs hostiles
                if (isHostileMob(target)) {
                    return // Attaque permise !
                }

                // 2. PVP Désactivé
                if (target.isPlayer && target.isPlayer()) {
                    event.setCanceled(true)
                    sendClaimMsg(player, 'Zone Neutre : Le combat entre joueurs (PVP) est STRICTEMENT DÉSACTIVÉ dans les claims de l\'ONU !', '§c')
                    try { player.playSound('minecraft:entity.villager.no', 1.0, 1.0) } catch (ve) {}
                    return
                }

                // 3. PVE Pacifique / PNJ protégés
                event.setCanceled(true)
                sendClaimMsg(player, 'Zone Neutre : Les PNJ et animaux sont protégés dans les claims de l\'ONU !', '§c')
                try { player.playSound('minecraft:entity.villager.no', 1.0, 1.0) } catch (ve) {}
                return
            }
        } catch (ae) {}
    })
} catch (nativeAttackErr) {
    console.warn('[ONU Hub] Impossible d\'enregistrer AttackEntityEvent: ' + nativeAttackErr)
}

// Annulation absolue de toute source de dégâts (flèches, tirs, explosions, etc.)
try {
    NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent'), function(event) {
        try {
            var entity = event.getEntity()
            if (!entity) return

            var dimStr = String(getEntityDimensionId(entity) || 'minecraft:overworld').toLowerCase()
            if (dimStr.indexOf('overworld') === -1) return

            var ex = Number(entity.getX ? entity.getX() : entity.x)
            var ez = Number(entity.getZ ? entity.getZ() : entity.z)
            var level = entity.level ? (typeof entity.level === 'function' ? entity.level() : entity.level) : null

            var victimInOnu = isPositionInOnuClaim(level, ex, ez)

            var source = event.getSource()
            var attacker = source ? (source.getEntity ? source.getEntity() : (source.getDirectEntity ? source.getDirectEntity() : null)) : null
            var attackerInOnu = false
            if (attacker) {
                var ax = Number(attacker.getX ? attacker.getX() : attacker.x)
                var az = Number(attacker.getZ ? attacker.getZ() : attacker.z)
                attackerInOnu = isPositionInOnuClaim(level, ax, az)
            }

            if (victimInOnu || attackerInOnu) {
                // 1. Les monstres hostiles peuvent subir des dégâts et être tués
                if (isHostileMob(entity)) {
                    return // Dégâts autorisés sur les monstres !
                }

                // 2. Tir depuis l'intérieur des claims ONU vers l'extérieur : bloqué
                if (attackerInOnu && !victimInOnu) {
                    event.setCanceled(true)
                    event.setAmount(0)
                    return
                }

                // 3. Joueurs et PNJ protégés dans les claims ONU
                if (victimInOnu) {
                    event.setCanceled(true)
                    event.setAmount(0)
                    return
                }
            }
        } catch (de) {}
    })
} catch (nativeHurtErr) {
    console.warn('[ONU Hub] Impossible d\'enregistrer LivingIncomingDamageEvent: ' + nativeHurtErr)
}

// Double verrou KubeJS EntityEvents.beforeHurt
EntityEvents.beforeHurt(function(event) {
    try {
        var entity = event.getEntity()
        if (!entity) return

        var dimStr = String(getEntityDimensionId(entity) || 'minecraft:overworld').toLowerCase()
        if (dimStr.indexOf('overworld') === -1) return

        var ex = Number(entity.getX ? entity.getX() : entity.x)
        var ez = Number(entity.getZ ? entity.getZ() : entity.z)
        var level = entity.level ? (typeof entity.level === 'function' ? entity.level() : entity.level) : null

        var victimInOnu = isPositionInOnuClaim(level, ex, ez)

        var source = event.getSource()
        var attacker = source ? (source.getEntity ? source.getEntity() : null) : null
        var attackerInOnu = false
        if (attacker) {
            var ax = Number(attacker.getX ? attacker.getX() : attacker.x)
            var az = Number(attacker.getZ ? attacker.getZ() : attacker.z)
            attackerInOnu = isPositionInOnuClaim(level, ax, az)
        }

        if (victimInOnu || attackerInOnu) {
            if (isHostileMob(entity)) {
                return // Dégâts autorisés sur les monstres !
            }
            event.setDamage(0)
            event.cancel()
        }
    } catch (e) {}
})

// -----------------------------------------------------------------------------
// 3. ANTI-GRIEF DU HUB ONU (Destruction & Construction Interdites)
// -----------------------------------------------------------------------------
BlockEvents.broken(function(event) {
    try {
        var block = event.block
        if (!block) return
        var pos = block.getPos()
        var level = block.getLevel()

        if (isBlockInOnuHub(level, pos.getX(), pos.getZ())) {
            var player = event.player
            if (player && player.isCreative && player.isCreative()) {
                return // Seuls les administrateurs en mode Créatif peuvent modifier le Hub ONU
            }
            event.cancel()
            if (player) {
                sendClaimMsg(player, 'Zone Internationale : La destruction de blocs est strictement interdite dans le complexe de l\'ONU !', '§c')
                try { player.playSound('minecraft:entity.villager.no', 1.0, 1.0) } catch (ve) {}
            }
        }
    } catch (e) {
        if (String(e).indexOf('EventExit') === -1) {
            console.error('[ONU Anti-Grief] Erreur broken : ' + e)
        }
    }
})

BlockEvents.placed(function(event) {
    try {
        var block = event.block
        if (!block) return
        var pos = block.getPos()
        var level = block.getLevel()

        if (isBlockInOnuHub(level, pos.getX(), pos.getZ())) {
            var player = event.player
            if (player && player.isCreative && player.isCreative()) {
                return // Seuls les administrateurs en mode Créatif peuvent modifier le Hub ONU
            }
            event.cancel()
            if (player) {
                sendClaimMsg(player, 'Zone Internationale : La pose de blocs est strictement interdite dans le sanctuaire de l\'ONU !', '§c')
                try { player.playSound('minecraft:entity.villager.no', 1.0, 1.0) } catch (ve) {}
            }
        }
    } catch (e) {
        if (String(e).indexOf('EventExit') === -1) {
            console.error('[ONU Anti-Grief] Erreur placed : ' + e)
        }
    }
})

// Blocage de l'usage d'objets destructeurs (seaux de lave, briquets) dans le Hub ONU
ItemEvents.rightClicked(function(event) {
    try {
        var player = event.player
        if (!player || (player.isCreative && player.isCreative())) return
        var item = event.item
        if (!item || item.isEmpty()) return

        var iId = item.getId()
        if (iId.indexOf('lava_bucket') !== -1 || iId.indexOf('flint_and_steel') !== -1 || iId.indexOf('fire_charge') !== -1) {
            var px = Math.round(Number(player.getX ? player.getX() : player.x))
            var pz = Math.round(Number(player.getZ ? player.getZ() : player.z))
            var level = player.level ? (typeof player.level === 'function' ? player.level() : player.level) : null

            if (isBlockInOnuHub(level, px, pz)) {
                event.cancel()
                sendClaimMsg(player, 'Zone Internationale : L\'utilisation d\'objets destructeurs est interdite au Hub ONU !', '§c')
                try { player.playSound('minecraft:entity.villager.no', 1.0, 1.0) } catch (ve) {}
            }
        }
    } catch (e) {}
})

// Neutralisation absolue de toute explosion dans le complexe ONU (missiles, TNT, ballistix)
LevelEvents.beforeExplosion(function(event) {
    try {
        var level = event.level
        if (!level || level.isClientSide()) return
        var bx = Math.floor(event.x)
        var bz = Math.floor(event.z)
        if (isPositionInOnuClaim(level, bx, bz)) {
            event.cancel()
        }
    } catch (e) {}
})

// -----------------------------------------------------------------------------
// 4. INITIALISATION
// -----------------------------------------------------------------------------
ServerEvents.loaded(function(event) {
    claimOnuChunks(event.server)
    cleanupUnauthorizedOnuZoneClaims(event.server)
})
