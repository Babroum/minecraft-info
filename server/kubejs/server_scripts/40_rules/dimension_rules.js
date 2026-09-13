// priority: 90
// =============================================================================
// Third World Server Script - Verrouillage du Nether et de l'End
// NeoForge 1.21.1 / KubeJS 7
// =============================================================================

// -----------------------------------------------------------------------------
// 1. Interdiction d'activation des portails du Nether et de l'End
// (IMPORTANT : Ne pas intercepter EventExit dans un try/catch pour que l'annulation fonctionne)
// -----------------------------------------------------------------------------
BlockEvents.rightClicked(function(event) {
    var player = event.player
    if (!player) return

    var item = event.item
    if (!item) return
    var itemId = item.id

    var block = event.block
    if (!block) return
    var blockId = block.id

    // 1.1 Allumage de portail du Nether sur l'Obsidienne (Briquet ou Boule de feu)
    if (itemId === 'minecraft:flint_and_steel' || itemId === 'minecraft:fire_charge') {
        if (blockId === 'minecraft:obsidian' || blockId === 'minecraft:crying_obsidian') {
            player.tell('§c[Traité International] L\'accès au Nether est scellé. L\'allumage de portails est prohibé.')
            event.cancel()
            return
        }
    }

    // 1.2 Insertion d'un œil de l'End dans un cadre de portail de l'End
    if (itemId === 'minecraft:ender_eye') {
        if (blockId === 'minecraft:end_portal_frame') {
            player.tell('§c[Traité International] La faille vers l\'End a été condamnée par l\'ONU. Les cadres sont verrouillés.')
            event.cancel()
            return
        }
    }

    // 1.3 Clic direct sur un portail résiduel : neutralisation immédiate
    if (blockId === 'minecraft:nether_portal' || blockId === 'minecraft:end_portal') {
        block.setBlock('minecraft:air')
        player.tell('§c[Sécurité] Faille dimensionnelle neutralisée.')
        event.cancel()
        return
    }
})

// -----------------------------------------------------------------------------
// 2. Sécurité continue via Master Scheduler (toutes les 40 ticks = 2s)
// -----------------------------------------------------------------------------
if (typeof TW_Scheduler !== 'undefined' && TW_Scheduler.register) {
    TW_Scheduler.register('dimension_rules', 40, function(server) {
        var players = server.getPlayerList().getPlayers()

    for (var i = 0; i < players.size(); i++) {
        var player = players.get(i)
        if (!player || player.isSpectator()) continue

        // 2.1 Rapatriement forcé si le joueur se trouve dans le Nether ou l'End
        var dimStr = ''
        try {
            var d = player.level.dimension
            if (typeof d === 'function') d = d()
            dimStr = String(d)
        } catch (de) {}

        if (dimStr.indexOf('the_nether') !== -1 || dimStr.indexOf('the_end') !== -1) {
            var pName = player.getName().getString()
            var spawnPos = event.server.overworld().getSharedSpawnPos()
            var sx = spawnPos.getX()
            var sy = spawnPos.getY()
            var sz = spawnPos.getZ()

            event.server.runCommandSilent('execute in minecraft:overworld run tp ' + pName + ' ' + sx + ' ' + (sy + 1) + ' ' + sz)
            player.tell('§c[Sécurité Dimensionnelle] Les dimensions extraterritoriales (Nether / End) sont interdites. Vous avez été rapatrié au Spawn Overworld.')
            continue
        }

        // 2.2 Neutralisation de tout bloc de portail touché par un joueur dans l'Overworld
        try {
            var currentBlock = player.block
            if (currentBlock) {
                var cId = currentBlock.getId()
                if (cId === 'minecraft:nether_portal' || cId === 'minecraft:end_portal' || cId === 'minecraft:end_gateway') {
                    currentBlock.setBlock('minecraft:air')
                    event.server.runCommandSilent('execute as ' + player.getName().getString() + ' at @s run tp @s ~ ~0.5 ~-1')
                    player.tell('§c[Sécurité] Bloc de portail neutralisé.')
                }
            }
        } catch (be) {}
    }
    })
}

