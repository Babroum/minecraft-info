// priority: 60
// =============================================================================
// Third World Server Script - Téléportation au QG de l'ONU (/onu)
// =============================================================================
// Permet de se téléporter au siège de l'ONU. Par défaut réservé aux admins.
// Les administrateurs peuvent activer/désactiver l'accès pour tous les joueurs
// via /onu toggle ou /onu public <on|off> (ou /onupublic).
// =============================================================================

function loadOnuTeleportConfig() {
    var defaultCfg = {
        public_enabled: false,
        dim: 'minecraft:overworld',
        x: -204.5,
        y: 76.0,
        z: -172.5,
        yaw: 0.0,
        pitch: 0.0
    }
    try {
        if (typeof readJsonData === 'function') {
            var data = readJsonData('onu_teleport.json')
            if (data && typeof data === 'object') {
                return {
                    public_enabled: (data.public_enabled === true),
                    dim: data.dim || defaultCfg.dim,
                    x: (typeof data.x === 'number') ? data.x : defaultCfg.x,
                    y: (typeof data.y === 'number') ? data.y : defaultCfg.y,
                    z: (typeof data.z === 'number') ? data.z : defaultCfg.z,
                    yaw: (typeof data.yaw === 'number') ? data.yaw : defaultCfg.yaw,
                    pitch: (typeof data.pitch === 'number') ? data.pitch : defaultCfg.pitch
                }
            }
        }
    } catch (e) {
        console.error('[ONU Teleport] Erreur lecture config : ' + e)
    }
    return defaultCfg
}

function saveOnuTeleportConfig(config) {
    try {
        if (typeof writeJsonData === 'function') {
            writeJsonData('onu_teleport.json', config)
        }
    } catch (e) {
        console.error('[ONU Teleport] Erreur écriture config : ' + e)
    }
}

function isOnuPublicTeleportEnabled() {
    var cfg = loadOnuTeleportConfig()
    return cfg.public_enabled === true
}

function setOnuPublicTeleportEnabled(enabled) {
    var cfg = loadOnuTeleportConfig()
    cfg.public_enabled = !!enabled
    saveOnuTeleportConfig(cfg)
    return cfg.public_enabled
}

function teleportPlayerToOnu(player) {
    if (!player) return 0
    try {
        var isAdmin = player.hasPermissions ? player.hasPermissions(2) : false
        var isPublic = isOnuPublicTeleportEnabled()

        if (!isAdmin && !isPublic) {
            if (typeof sendMsg === 'function') {
                sendMsg(player, 'ONU', 'La téléportation vers le siège de l\'ONU est actuellement désactivée pour les citoyens (réservée aux administrateurs).', '§c')
            } else {
                player.tell(Text.of('§8[§bONU§8] §cLa téléportation vers le siège de l\'ONU est actuellement désactivée pour les citoyens (réservée aux administrateurs).'))
            }
            try { player.playSound('minecraft:entity.villager.no', 1.0, 1.0) } catch (ve) { }
            return 0
        }

        var cfg = loadOnuTeleportConfig()
        var pName = player.getName().getString()
        var cmd = 'execute in ' + cfg.dim + ' run tp ' + pName + ' ' + cfg.x + ' ' + cfg.y + ' ' + cfg.z + ' ' + cfg.yaw + ' ' + cfg.pitch
        player.server.runCommandSilent(cmd)

        if (typeof sendMsg === 'function') {
            sendMsg(player, 'ONU', '§aBienvenue au siège de l\'Organisation des Nations Unies !', '§a')
        } else {
            player.tell(Text.of('§8[§bONU§8] §aBienvenue au siège de l\'Organisation des Nations Unies !'))
        }

        try { player.playSound('minecraft:entity.enderman.teleport', 1.0, 1.0) } catch (te) { }
        return 1
    } catch (e) {
        console.error('[ONU Teleport] Erreur téléportation : ' + e)
        if (player) {
            try { player.tell(Text.of('§8[§bONU§8] §cImpossible de se téléporter : ' + e)) } catch (pe) { }
        }
    }
    return 0
}

ServerEvents.commandRegistry(function (event) {
    var Commands = event.commands
    var StringArgumentType = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')

    // 1. Commande principale : /onu
    event.register(
        Commands.literal('onu')
            // /onu -> Téléporte le joueur (si admin ou si public activé)
            .executes(function (ctx) {
                return teleportPlayerToOnu(ctx.source.player)
            })
            // /onu tp
            .then(Commands.literal('tp').executes(function (ctx) {
                return teleportPlayerToOnu(ctx.source.player)
            }))
            // /onu toggle (admin)
            .then(Commands.literal('toggle')
                .requires(function (source) { return source.hasPermission(2) })
                .executes(function (ctx) {
                    var current = isOnuPublicTeleportEnabled()
                    var newState = setOnuPublicTeleportEnabled(!current)
                    var player = ctx.source.player
                    var msg = newState
                        ? '§aACTIVÉE pour tous les joueurs !'
                        : '§cDÉSACTIVÉE (réservée aux administrateurs).'
                    if (player && typeof sendMsg === 'function') {
                        sendMsg(player, 'ONU Admin', 'Téléportation publique vers l\'ONU : ' + msg, '§e')
                    }
                    try {
                        ctx.source.server.tell(Text.of('§8[§bONU§8] §7La téléportation publique vers le siège de l\'ONU est désormais ' + (newState ? '§aouverte à tous (§e/onu§a)' : '§cfermée aux citoyens (§eréservée aux admins§c)') + '§7.'))
                    } catch (be) { }
                    return 1
                })
            )
            // /onu public [on|off] (admin)
            .then(Commands.literal('public')
                .requires(function (source) { return source.hasPermission(2) })
                .executes(function (ctx) {
                    var current = isOnuPublicTeleportEnabled()
                    var newState = setOnuPublicTeleportEnabled(!current)
                    var player = ctx.source.player
                    var msg = newState ? '§aACTIVÉE pour tous les joueurs !' : '§cDÉSACTIVÉE (réservée aux administrateurs).'
                    if (player && typeof sendMsg === 'function') {
                        sendMsg(player, 'ONU Admin', 'Téléportation publique : ' + msg, '§e')
                    }
                    try {
                        ctx.source.server.tell(Text.of('§8[§bONU§8] §7La téléportation publique vers le siège de l\'ONU est désormais ' + (newState ? '§aouverte à tous (§e/onu§a)' : '§cfermée aux citoyens (§eréservée aux admins§c)') + '§7.'))
                    } catch (be) { }
                    return 1
                })
                .then(Commands.argument('etat', StringArgumentType.string())
                    .executes(function (ctx) {
                        var val = StringArgumentType.getString(ctx, 'etat').toLowerCase()
                        var enable = (val === 'on' || val === 'true' || val === 'activer' || val === 'active' || val === '1' || val === 'oui')
                        var newState = setOnuPublicTeleportEnabled(enable)
                        var player = ctx.source.player
                        var msg = newState
                            ? '§aACTIVÉE pour tous les joueurs !'
                            : '§cDÉSACTIVÉE (réservée aux administrateurs).'
                        if (player && typeof sendMsg === 'function') {
                            sendMsg(player, 'ONU Admin', 'Téléportation publique vers l\'ONU : ' + msg, '§e')
                        }
                        try {
                            ctx.source.server.tell(Text.of('§8[§bONU§8] §7La téléportation publique vers le siège de l\'ONU est désormais ' + (newState ? '§aouverte à tous (§e/onu§a)' : '§cfermée aux citoyens (§eréservée aux admins§c)') + '§7.'))
                        } catch (be) { }
                        return 1
                    })
                )
            )
            // /onu status (admin)
            .then(Commands.literal('status')
                .requires(function (source) { return source.hasPermission(2) })
                .executes(function (ctx) {
                    var cfg = loadOnuTeleportConfig()
                    var player = ctx.source.player
                    var stateStr = cfg.public_enabled ? '§aACTIVÉE (Tous les joueurs)' : '§cRESTREINTE (Admins uniquement)'
                    if (player && typeof sendMsg === 'function') {
                        sendMsg(player, 'ONU Info', 'Téléportation publique : ' + stateStr, '§e')
                        sendMsg(player, 'ONU Info', 'Coordonnées : X=' + cfg.x + ', Y=' + cfg.y + ', Z=' + cfg.z + ' (' + cfg.dim + ')', '§7')
                        sendMsg(player, 'Commandes', '§f/onu toggle §7| §f/onu public <on|off> §7| §f/onu setpos', '§7')
                    }
                    return 1
                })
            )
            // /onu setpos (admin : définit le point de TP à l'endroit où se tient l'admin)
            .then(Commands.literal('setpos')
                .requires(function (source) { return source.hasPermission(2) })
                .executes(function (ctx) {
                    var player = ctx.source.player
                    if (!player) return 0
                    var px = Math.round(Number(player.getX ? player.getX() : player.x) * 10) / 10
                    var py = Math.round(Number(player.getY ? player.getY() : player.y) * 10) / 10
                    var pz = Math.round(Number(player.getZ ? player.getZ() : player.z) * 10) / 10
                    var pyaw = Math.round((player.getYRot ? player.getYRot() : (player.yaw || 0)) * 10) / 10
                    var ppitch = Math.round((player.getXRot ? player.getXRot() : (player.pitch || 0)) * 10) / 10
                    var dimStr = (typeof getEntityDimensionId === 'function') ? (getEntityDimensionId(player) || 'minecraft:overworld') : 'minecraft:overworld'

                    var cfg = loadOnuTeleportConfig()
                    cfg.dim = dimStr
                    cfg.x = px
                    cfg.y = py
                    cfg.z = pz
                    cfg.yaw = pyaw
                    cfg.pitch = ppitch
                    saveOnuTeleportConfig(cfg)

                    if (typeof sendMsg === 'function') {
                        sendMsg(player, 'ONU Admin', 'Point d\'arrivée /onu mis à jour : §eX: ' + px + ', Y: ' + py + ', Z: ' + pz + ' §a(' + dimStr + ')', '§a')
                    }
                    return 1
                })
            )
    )

    // 2. Alias de commande directe pour les administrateurs : /onupublic [on|off]
    event.register(
        Commands.literal('onupublic')
            .requires(function (source) { return source.hasPermission(2) })
            .executes(function (ctx) {
                var current = isOnuPublicTeleportEnabled()
                var newState = setOnuPublicTeleportEnabled(!current)
                var player = ctx.source.player
                var msg = newState ? '§aACTIVÉE pour tous les joueurs !' : '§cDÉSACTIVÉE (réservée aux administrateurs).'
                if (player && typeof sendMsg === 'function') {
                    sendMsg(player, 'ONU Admin', 'Téléportation publique : ' + msg, '§e')
                }
                try {
                    ctx.source.server.tell(Text.of('§8[§bONU§8] §7La téléportation publique vers le siège de l\'ONU est désormais ' + (newState ? '§aouverte à tous (§e/onu§a)' : '§cfermée aux citoyens (§eréservée aux admins§c)') + '§7.'))
                } catch (be) { }
                return 1
            })
            .then(Commands.argument('etat', StringArgumentType.string())
                .executes(function (ctx) {
                    var val = StringArgumentType.getString(ctx, 'etat').toLowerCase()
                    var enable = (val === 'on' || val === 'true' || val === 'activer' || val === 'active' || val === '1' || val === 'oui')
                    var newState = setOnuPublicTeleportEnabled(enable)
                    var player = ctx.source.player
                    var msg = newState ? '§aACTIVÉE pour tous les joueurs !' : '§cDÉSACTIVÉE (réservée aux administrateurs).'
                    if (player && typeof sendMsg === 'function') {
                        sendMsg(player, 'ONU Admin', 'Téléportation publique vers l\'ONU : ' + msg, '§e')
                    }
                    try {
                        ctx.source.server.tell(Text.of('§8[§bONU§8] §7La téléportation publique vers le siège de l\'ONU est désormais ' + (newState ? '§aouverte à tous (§e/onu§a)' : '§cfermée aux citoyens (§eréservée aux admins§c)') + '§7.'))
                    } catch (be) { }
                    return 1
                })
            )
    )
})
