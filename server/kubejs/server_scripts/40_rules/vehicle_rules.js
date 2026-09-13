// priority: 80
// =============================================================================
// Third World Server Script - Désactivation Totale des Élytres
// NeoForge 1.21.1 / KubeJS 7
// =============================================================================

const EquipmentSlot = Java.loadClass('net.minecraft.world.entity.EquipmentSlot')
const ItemStack = Java.loadClass('net.minecraft.world.item.ItemStack')

// Interdire le clic-droit pour équiper l'élytre ou un jetpack
BlockEvents.rightClicked(function(event) {
    if (!event.item) return
    var id = event.item.id
    if (id === 'minecraft:elytra' || id === 'mekanism:jetpack' || id === 'mekanism:jetpack_armored') {
        event.cancel()
        if (event.player) {
            event.player.tell('§c[Aviation] Le vol individuel (élytres, jetpacks) est strictement interdit sur le serveur. Utilisez les véhicules, trains ou aéronefs Create.')
        }
    }
})

// Suppression de toute recette d'élytre
ServerEvents.recipes(function(event) {
    event.remove({ output: 'minecraft:elytra' })
    event.remove({ id: 'minecraft:elytra' })
})

// Surveillance continue via Master Scheduler : déséquiper l'élytre et couper le vol
if (typeof TW_Scheduler !== 'undefined' && TW_Scheduler.register) {
    TW_Scheduler.register('vehicle_rules', 40, function(server) {
        try {
            var players = server.getPlayerList().getPlayers()

        for (var i = 0; i < players.size(); i++) {
            var player = players.get(i)
            if (!player || player.isSpectator()) continue

            var chest = player.getInventory().getArmor(2)
            if (chest) {
                var chestId = chest.getId()
                if (chestId === 'minecraft:elytra' || chestId === 'mekanism:jetpack' || chestId === 'mekanism:jetpack_armored') {
                    player.setItemSlot(EquipmentSlot.CHEST, ItemStack.EMPTY)

                    if (!player.getInventory().add(chest)) {
                        player.drop(chest, false)
                    }

                    if (player.isFallFlying()) {
                        player.stopFallFlying()
                    }

                    player.tell('§c[Aviation Civile & Militaire] Le vol individuel (élytres, jetpacks) est interdit. L\'équipement a été retiré de votre armure.')
                }
            }
        }
    } catch (e) {
        console.error('[ElytraDisabled] Erreur tick élytre : ' + e)
    }
    })
}

