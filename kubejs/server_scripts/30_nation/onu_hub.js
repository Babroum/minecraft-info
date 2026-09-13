// priority: 60
// =============================================================================
// Third World Server Script - Téléportation au QG de l'ONU (/onu)
// =============================================================================
// Permet de se téléporter au siège de l'ONU. Par défaut réservé aux admins.
// Les administrateurs peuvent activer/désactiver l'accès pour tous les joueurs
// via /onu toggle ou /onu public <on|off> (ou /onupublic).
// =============================================================================

function loadOnuTeleportConfig() {
    var defaultCfg = (typeof TW_CONFIG !== 'undefined' && TW_CONFIG.general && TW_CONFIG.general.onu && TW_CONFIG.general.onu.teleport) ? TW_CONFIG.general.onu.teleport : {
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
        if (typeof hasPlayerNationFlag === 'function' && hasPlayerNationFlag(player)) {
            if (typeof sendMsg === 'function') {
                sendMsg(player, 'ONU', 'Interdit : Vous portez un Étendard National ! Vous devez vous rendre au Hub de l\'ONU à pied ou en véhicule.', '§c')
            } else {
                player.tell(Text.of('§8[§bONU§8] §cInterdit : Vous portez un Étendard National ! Vous devez vous rendre au Hub de l\'ONU à pied ou en véhicule.'))
            }
            try { player.playSound('minecraft:entity.villager.no', 1.0, 1.0) } catch (ve0) {}
            return 0
        }

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


function toggleOnuPublicTeleport(source) {
    var current = isOnuPublicTeleportEnabled();
    var newState = setOnuPublicTeleportEnabled(!current);
    var player = source ? source.player : null;
    var msg = newState ? '§aACTIVÉE pour tous les joueurs !' : '§cDÉSACTIVÉE (réservée aux administrateurs).';
    if (player && typeof sendMsg === 'function') {
        sendMsg(player, 'ONU Admin', "Téléportation publique vers l'ONU : " + msg, '§e');
    }
    try {
        if (source && source.server) {
            source.server.tell(Text.of("§8[§bONU§8] §7La téléportation publique vers le siège de l'ONU est désormais " + (newState ? "§aouverte à tous (§e/onu§a)" : "§cfermée aux citoyens (§eréservée aux admins§c)") + "§7."));
        }
    } catch (be) {}
    return 1;
}
