// priority: 48
// =============================================================================
// Third World Server Script - Gestion des Sanctuaires Anti-Explosions
// =============================================================================

var SANCTUARIES_CACHE = null
var SANCTUARIES_INDEX = null // Index en mémoire O(1) : { "dim#x#z": sanctuaryObj }

/**
 * Normalise l'identifiant de dimension sous forme de chaîne canonique
 */
function normalizeDimensionId(dimOrLevel) {
    if (!dimOrLevel) return 'minecraft:overworld'
    try {
        // Si c'est déjà une chaîne
        if (typeof dimOrLevel === 'string') {
            var s = dimOrLevel.trim().toLowerCase()
            if (s.indexOf('overworld') !== -1) return 'minecraft:overworld'
            if (s.indexOf('the_nether') !== -1 || s === 'nether') return 'minecraft:the_nether'
            if (s.indexOf('the_end') !== -1 || s === 'end') return 'minecraft:the_end'
            return s
        }

        // Si c'est un objet Level ou LevelEvent
        var lvl = null
        if (typeof dimOrLevel.getLevel === 'function') lvl = dimOrLevel.getLevel()
        else if (typeof dimOrLevel.level === 'function') lvl = dimOrLevel.level()
        else if (dimOrLevel.level) lvl = dimOrLevel.level
        else lvl = dimOrLevel

        if (lvl) {
            var d = null
            if (typeof lvl.dimension === 'function') d = lvl.dimension()
            else if (lvl.dimension) d = lvl.dimension

            if (d) {
                if (typeof d.location === 'function') return String(d.location()).toLowerCase()
                if (d.location) return String(d.location).toLowerCase()
                var str = String(d).toLowerCase()
                if (str.indexOf('overworld') !== -1) return 'minecraft:overworld'
                if (str.indexOf('the_nether') !== -1) return 'minecraft:the_nether'
                if (str.indexOf('the_end') !== -1) return 'minecraft:the_end'
                return str
            }
        }
    } catch (e) {}
    return 'minecraft:overworld'
}

/**
 * Génère la clé de hachage unique pour un chunk
 */
function getSanctuaryKey(dim, chunkX, chunkZ) {
    return normalizeDimensionId(dim) + '#' + Number(chunkX) + '#' + Number(chunkZ)
}

/**
 * Charge les données des sanctuaires depuis le disque
 */
function loadSanctuariesData() {
    if (SANCTUARIES_CACHE !== null) return SANCTUARIES_CACHE
    var data = (typeof readJsonData === 'function') ? readJsonData('sanctuaries.json') : null
    if (data && typeof data === 'object') {
        if (!Array.isArray(data.sanctuary_chunks)) {
            data.sanctuary_chunks = []
        }
        SANCTUARIES_CACHE = data
    } else {
        SANCTUARIES_CACHE = { sanctuary_chunks: [] }
    }
    rebuildSanctuaryIndex()
    return SANCTUARIES_CACHE
}

/**
 * Reconstruit l'index de hachage O(1) en mémoire
 */
function rebuildSanctuaryIndex() {
    SANCTUARIES_INDEX = {}
    if (!SANCTUARIES_CACHE || !Array.isArray(SANCTUARIES_CACHE.sanctuary_chunks)) return
    var list = SANCTUARIES_CACHE.sanctuary_chunks
    for (var i = 0; i < list.length; i++) {
        var entry = list[i]
        if (entry && entry.x !== undefined && entry.z !== undefined) {
            var key = getSanctuaryKey(entry.dimension, entry.x, entry.z)
            SANCTUARIES_INDEX[key] = entry
        }
    }
}

/**
 * Sauvegarde les sanctuaires sur disque et met à jour l'index
 */
function saveSanctuariesData(data) {
    SANCTUARIES_CACHE = data || { sanctuary_chunks: [] }
    rebuildSanctuaryIndex()
    if (typeof writeJsonData === 'function') {
        writeJsonData('sanctuaries.json', SANCTUARIES_CACHE)
    }
}

/**
 * Vérifie instantanément (O(1)) si un chunk est sanctuarisé
 */
function isSanctuaryChunk(dimOrLevel, chunkX, chunkZ) {
    if (SANCTUARIES_INDEX === null) {
        loadSanctuariesData()
    }
    var key = getSanctuaryKey(dimOrLevel, chunkX, chunkZ)
    return (SANCTUARIES_INDEX && SANCTUARIES_INDEX[key] !== undefined)
}

/**
 * Récupère les métadonnées d'un chunk sanctuaire (ou null)
 */
function getSanctuaryEntry(dimOrLevel, chunkX, chunkZ) {
    if (SANCTUARIES_INDEX === null) {
        loadSanctuariesData()
    }
    var key = getSanctuaryKey(dimOrLevel, chunkX, chunkZ)
    return (SANCTUARIES_INDEX && SANCTUARIES_INDEX[key]) ? SANCTUARIES_INDEX[key] : null
}

/**
 * Ajoute un chunk à la liste des sanctuaires protégés
 */
function addSanctuaryChunk(server, player, dim, chunkX, chunkZ, label) {
    var data = loadSanctuariesData()
    var normDim = normalizeDimensionId(dim)
    var cx = Number(chunkX)
    var cz = Number(chunkZ)
    var key = getSanctuaryKey(normDim, cx, cz)

    if (SANCTUARIES_INDEX && SANCTUARIES_INDEX[key]) {
        var existing = SANCTUARIES_INDEX[key]
        if (label && label.trim() !== '') {
            existing.label = label.trim()
            saveSanctuariesData(data)
            if (player) {
                sendMsg(player, 'Sanctuaire', 'Label du sanctuaire mis à jour en [' + cx + ', ' + cz + '] : §e' + existing.label, '§a')
            }
            return 1
        }
        if (player) {
            sendMsg(player, 'Sanctuaire', 'Le chunk [' + cx + ', ' + cz + '] est déjà sanctuarisé (§e' + (existing.label || 'Sans label') + '§c) !', '§e')
        }
        return 0
    }

    // Détection automatique de la nation propriétaire du chunk
    var teamId = null
    var teamName = 'Zone Sauvage'
    try {
        var level = (player && player.level) ? player.level : (server ? server.getLevel(normDim) : null)
        if (level && typeof getChunkOwningTeam === 'function') {
            var team = getChunkOwningTeam(level, (cx << 4) + 8, (cz << 4) + 8)
            if (team) {
                teamId = team.getId ? team.getId().toString() : String(team.getId())
                teamName = team.getName ? team.getName().getString() : String(team.getName())
            }
        }
    } catch (te) {}

    var creatorName = player ? (player.getName ? player.getName().getString() : 'Staff') : 'Console'
    var cleanLabel = (label && label.trim() !== '') ? label.trim() : 'Monument Historique'

    var newEntry = {
        dimension: normDim,
        x: cx,
        z: cz,
        teamId: teamId,
        teamName: teamName,
        label: cleanLabel,
        createdAt: Date.now(),
        createdBy: creatorName
    }

    data.sanctuary_chunks.push(newEntry)
    saveSanctuariesData(data)

    if (player) {
        sendMsg(player, 'Sanctuaire', '§aChunk §e[' + cx + ', ' + cz + '] §asanctuarisé avec succès !', '§a')
        sendMsg(player, 'Détails', 'Nation : §6' + teamName + ' §f| Label : §b' + cleanLabel, '§7')
        try { player.playSound('minecraft:block.beacon.activate', 1.0, 1.2) } catch (se) {}
    }
    return 1
}

/**
 * Retire la protection sanctuaire d'un chunk
 */
function removeSanctuaryChunk(server, player, dim, chunkX, chunkZ) {
    var data = loadSanctuariesData()
    var normDim = normalizeDimensionId(dim)
    var cx = Number(chunkX)
    var cz = Number(chunkZ)
    var key = getSanctuaryKey(normDim, cx, cz)

    if (!SANCTUARIES_INDEX || !SANCTUARIES_INDEX[key]) {
        if (player) {
            sendMsg(player, 'Sanctuaire', 'Le chunk [' + cx + ', ' + cz + '] n\'est pas un sanctuaire.', '§c')
        }
        return 0
    }

    var removedLabel = SANCTUARIES_INDEX[key].label || ''
    var filtered = []
    for (var i = 0; i < data.sanctuary_chunks.length; i++) {
        var e = data.sanctuary_chunks[i]
        if (!(e.dimension === normDim && e.x === cx && e.z === cz)) {
            filtered.push(e)
        }
    }

    data.sanctuary_chunks = filtered
    saveSanctuariesData(data)

    if (player) {
        sendMsg(player, 'Sanctuaire', 'Protection sanctuaire retirée du chunk §e[' + cx + ', ' + cz + '] §7(' + removedLabel + ').', '§e')
        try { player.playSound('minecraft:block.beacon.deactivate', 1.0, 0.8) } catch (se) {}
    }
    return 1
}

/**
 * Liste les chunks sanctuarisés (avec filtre optionnel par nation)
 */
function listSanctuaryChunks(player, nationFilter) {
    if (!player) return 0
    var data = loadSanctuariesData()
    var list = data.sanctuary_chunks || []

    var filter = (nationFilter && nationFilter.trim() !== '') ? nationFilter.toLowerCase().trim() : null
    var matching = []

    for (var i = 0; i < list.length; i++) {
        var entry = list[i]
        if (!filter) {
            matching.push(entry)
            continue
        }
        var tName = (entry.teamName || '').toLowerCase()
        var tId = (entry.teamId || '').toLowerCase()
        var lbl = (entry.label || '').toLowerCase()
        if (tName.indexOf(filter) !== -1 || tId === filter || lbl.indexOf(filter) !== -1) {
            matching.push(entry)
        }
    }

    sendMsg(player, 'Sanctuaire', '=== Registre des Chunks Sanctuaires (' + matching.length + '/' + list.length + ') ===', '§6')
    if (matching.length === 0) {
        sendMsg(player, 'Sanctuaire', 'Aucun sanctuaire trouvé pour ce critère.', '§7')
        return 1
    }

    for (var j = 0; j < matching.length; j++) {
        var s = matching[j]
        var blockMinX = s.x << 4
        var blockMinZ = s.z << 4
        var coords = 'Chunk [' + s.x + ', ' + s.z + '] §7(~ ' + blockMinX + ', ' + blockMinZ + ')'
        sendMsg(player, '• #' + (j + 1), '§e' + coords + ' §f| §6' + (s.teamName || 'Sans Nation') + ' §f| §b' + (s.label || 'Sans label'), '§f')
    }
    return 1
}

/**
 * Inspecte l'état sanctuaire du chunk où se tient le joueur
 */
function checkPlayerSanctuary(player) {
    if (!player) return 0
    var px = Math.floor(player.getX ? player.getX() : player.x)
    var pz = Math.floor(player.getZ ? player.getZ() : player.z)
    var cx = px >> 4
    var cz = pz >> 4
    var dim = (typeof getEntityDimensionId === 'function') ? getEntityDimensionId(player) : normalizeDimensionId(player)

    var entry = getSanctuaryEntry(dim, cx, cz)
    if (entry) {
        sendMsg(player, 'Sanctuaire', '§a§lZONE SANCTUAIRE ACTIVE !', '§a')
        sendMsg(player, 'Coordonnées', 'Chunk §e[' + cx + ', ' + cz + '] §7(Blocs: ' + (cx << 4) + '..' + ((cx << 4) + 15) + ', ' + (cz << 4) + '..' + ((cz << 4) + 15) + ')', '§7')
        sendMsg(player, 'Détails', 'Nation : §6' + (entry.teamName || 'Zone Sauvage') + ' §f| Label : §b' + (entry.label || 'Sans label'), '§f')
        sendMsg(player, 'Protection', '§2Explosions 100% désactivées §7(Casse manuelle à la pioche autorisée en guerre).', '§2')
        try { player.playSound('minecraft:block.amethyst_block.resonate', 1.0, 1.0) } catch (e) {}
    } else {
        sendMsg(player, 'Sanctuaire', 'Ce chunk §e[' + cx + ', ' + cz + '] §7n\'est pas sanctuarisé.', '§7')
        sendMsg(player, 'Conseil', 'Pour le protéger : §f/waradmin sanctuary add <label>', '§8')
    }
    return 1
}

/**
 * Purge tous les sanctuaires d'une nation (ex: nation dissoute)
 */
function clearNationSanctuaries(player, nationQuery) {
    if (!player || !nationQuery) return 0
    var q = nationQuery.toLowerCase().trim()
    var data = loadSanctuariesData()
    var list = data.sanctuary_chunks || []
    var kept = []
    var purgedCount = 0

    for (var i = 0; i < list.length; i++) {
        var s = list[i]
        var tName = (s.teamName || '').toLowerCase()
        var tId = (s.teamId || '').toLowerCase()
        if (tName === q || tId === q || tName.indexOf(q) !== -1) {
            purgedCount++
        } else {
            kept.push(s)
        }
    }

    if (purgedCount > 0) {
        data.sanctuary_chunks = kept
        saveSanctuariesData(data)
        sendMsg(player, 'Sanctuaire', '§a' + purgedCount + ' chunk(s) sanctuaire(s) supprimé(s) pour §e' + nationQuery + '§a.', '§a')
    } else {
        sendMsg(player, 'Sanctuaire', 'Aucun sanctuaire trouvé pour la nation §c' + nationQuery + '§7.', '§c')
    }
    return purgedCount
}

// -----------------------------------------------------------------------------
// FEEDBACK SENSORIEL D'ABSORPTION D'EXPLOSION
// -----------------------------------------------------------------------------
var SANCTUARY_FEEDBACK_COOLDOWN = {}

/**
 * Déclenche un retour sonore et visuel lorsqu'une explosion est absorbée par un sanctuaire
 */
function triggerSanctuaryFeedback(level, expX, expY, expZ, chunkX, chunkZ, exploder) {
    if (!level) return
    var now = Date.now()
    var dimKey = normalizeDimensionId(level)
    var key = dimKey + '#' + chunkX + '#' + chunkZ

    // Limiter le feedback à 1 par seconde par chunk pour éviter le lag sur tirs de barrage
    var lastTime = SANCTUARY_FEEDBACK_COOLDOWN[key] || 0
    if (now - lastTime < 1000) return
    SANCTUARY_FEEDBACK_COOLDOWN[key] = now

    // 1. Son d'absorption divine
    try {
        var pX = Number(expX)
        var pY = Number(expY)
        var pZ = Number(expZ)
        if (level.playSound) {
            level.playSound(null, pX, pY, pZ, 'minecraft:block.amethyst_block.resonate', 'blocks', 1.5, 0.8)
            level.playSound(null, pX, pY, pZ, 'minecraft:block.beacon.ambient', 'blocks', 1.0, 1.4)
        }
    } catch (e1) {}

    // 2. Particules d'absorption
    try {
        if (level.spawnParticles) {
            level.spawnParticles('minecraft:enchant', true, expX, expY + 1.0, expZ, 0.5, 0.5, 0.5, 30, 0.2)
            level.spawnParticles('minecraft:totem_of_undying', true, expX, expY + 1.0, expZ, 0.3, 0.3, 0.3, 10, 0.1)
        }
    } catch (e2) {}

    // 3. Message d'avertissement au tireur
    try {
        var attackerPlayer = null
        if (exploder) {
            if (exploder.isPlayer && exploder.isPlayer()) {
                attackerPlayer = exploder
            } else if (exploder.getOwner && exploder.getOwner()) {
                var o = exploder.getOwner()
                if (o.isPlayer && o.isPlayer()) attackerPlayer = o
            }
        }
        if (attackerPlayer && typeof sendMsg === 'function') {
            var entry = getSanctuaryEntry(dimKey, chunkX, chunkZ)
            var labelStr = (entry && entry.label) ? (' (' + entry.label + ')') : ''
            sendMsg(attackerPlayer, 'Sanctuaire', '§6Ce monument est un Sanctuaire Administratif' + labelStr + ' ! Les explosions y sont 100% inefficaces.', '§e')
        }
    } catch (e3) {}
}

// -----------------------------------------------------------------------------
// INITIALISATION AU CHARGEMENT DU SERVEUR
// -----------------------------------------------------------------------------
ServerEvents.loaded(function(event) {
    loadSanctuariesData()
})

// -----------------------------------------------------------------------------
// COMMANDES DÉDIÉES /sanctuary ET /warsanctuary (Alias Rapides Staff)
// -----------------------------------------------------------------------------
ServerEvents.commandRegistry(function(event) {
    var Commands = event.commands
    var StringArgumentType = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')
    var IntegerArgumentType = Java.loadClass('com.mojang.brigadier.arguments.IntegerArgumentType')

    function registerSanctuaryCommands(rootLiteral) {
        event.register(
            Commands.literal(rootLiteral)
                .requires(function(source) { return source.hasPermission(2) })
                .then(Commands.literal('add')
                    .executes(function(ctx) {
                        var p = ctx.source.player
                        if (!p) return 0
                        var cx = Math.floor(p.x) >> 4
                        var cz = Math.floor(p.z) >> 4
                        var dim = (typeof getEntityDimensionId === 'function') ? getEntityDimensionId(p) : 'minecraft:overworld'
                        return addSanctuaryChunk(ctx.source.server, p, dim, cx, cz, '')
                    })
                    .then(Commands.argument('label', StringArgumentType.greedyString())
                        .executes(function(ctx) {
                            var p = ctx.source.player
                            if (!p) return 0
                            var lbl = StringArgumentType.getString(ctx, 'label')
                            var cx = Math.floor(p.x) >> 4
                            var cz = Math.floor(p.z) >> 4
                            var dim = (typeof getEntityDimensionId === 'function') ? getEntityDimensionId(p) : 'minecraft:overworld'
                            return addSanctuaryChunk(ctx.source.server, p, dim, cx, cz, lbl)
                        })
                    )
                )
                .then(Commands.literal('addpos')
                    .then(Commands.argument('cx', IntegerArgumentType.integer())
                        .then(Commands.argument('cz', IntegerArgumentType.integer())
                            .executes(function(ctx) {
                                var p = ctx.source.player
                                var cx = IntegerArgumentType.getInteger(ctx, 'cx')
                                var cz = IntegerArgumentType.getInteger(ctx, 'cz')
                                var dim = p ? ((typeof getEntityDimensionId === 'function') ? getEntityDimensionId(p) : 'minecraft:overworld') : 'minecraft:overworld'
                                return addSanctuaryChunk(ctx.source.server, p, dim, cx, cz, '')
                            })
                            .then(Commands.argument('label', StringArgumentType.greedyString())
                                .executes(function(ctx) {
                                    var p = ctx.source.player
                                    var cx = IntegerArgumentType.getInteger(ctx, 'cx')
                                    var cz = IntegerArgumentType.getInteger(ctx, 'cz')
                                    var lbl = StringArgumentType.getString(ctx, 'label')
                                    var dim = p ? ((typeof getEntityDimensionId === 'function') ? getEntityDimensionId(p) : 'minecraft:overworld') : 'minecraft:overworld'
                                    return addSanctuaryChunk(ctx.source.server, p, dim, cx, cz, lbl)
                                })
                            )
                        )
                    )
                )
                .then(Commands.literal('remove')
                    .executes(function(ctx) {
                        var p = ctx.source.player
                        if (!p) return 0
                        var cx = Math.floor(p.x) >> 4
                        var cz = Math.floor(p.z) >> 4
                        var dim = (typeof getEntityDimensionId === 'function') ? getEntityDimensionId(p) : 'minecraft:overworld'
                        return removeSanctuaryChunk(ctx.source.server, p, dim, cx, cz)
                    })
                )
                .then(Commands.literal('removepos')
                    .then(Commands.argument('cx', IntegerArgumentType.integer())
                        .then(Commands.argument('cz', IntegerArgumentType.integer())
                            .executes(function(ctx) {
                                var p = ctx.source.player
                                var cx = IntegerArgumentType.getInteger(ctx, 'cx')
                                var cz = IntegerArgumentType.getInteger(ctx, 'cz')
                                var dim = p ? ((typeof getEntityDimensionId === 'function') ? getEntityDimensionId(p) : 'minecraft:overworld') : 'minecraft:overworld'
                                return removeSanctuaryChunk(ctx.source.server, p, dim, cx, cz)
                            })
                        )
                    )
                )
                .then(Commands.literal('list')
                    .executes(function(ctx) {
                        return listSanctuaryChunks(ctx.source.player, null)
                    })
                    .then(Commands.argument('nation', StringArgumentType.string())
                        .executes(function(ctx) {
                            var nation = StringArgumentType.getString(ctx, 'nation')
                            return listSanctuaryChunks(ctx.source.player, nation)
                        })
                    )
                )
                .then(Commands.literal('check')
                    .executes(function(ctx) {
                        return checkPlayerSanctuary(ctx.source.player)
                    })
                )
                .then(Commands.literal('info')
                    .executes(function(ctx) {
                        return checkPlayerSanctuary(ctx.source.player)
                    })
                )
                .then(Commands.literal('clear')
                    .then(Commands.argument('nation', StringArgumentType.string())
                        .executes(function(ctx) {
                            var nation = StringArgumentType.getString(ctx, 'nation')
                            return clearNationSanctuaries(ctx.source.player, nation)
                        })
                    )
                )
                .executes(function(ctx) {
                    return checkPlayerSanctuary(ctx.source.player)
                })
        )
    }

    registerSanctuaryCommands('sanctuary')
    registerSanctuaryCommands('warsanctuary')
})
