// priority: 50
// =============================================================================
// Third World Server Script - Pénalité de Poids de l'Exo-Armure en Uranium
// NeoForge 1.21.1 / KubeJS 7
// =============================================================================

const ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
const AttributeModifier = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier')
const Attributes = Java.loadClass('net.minecraft.world.entity.ai.attributes.Attributes')
const Operation = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier$Operation')

const EXO_WEIGHT_ID = ResourceLocation.fromNamespaceAndPath('kubejs', 'exo_armor_weight')

if (typeof TW_Scheduler !== 'undefined' && TW_Scheduler.register) {
    TW_Scheduler.register('armor_weight', 40, function(server) {
        var players = server.getPlayerList().getPlayers()

    for (var i = 0; i < players.size(); i++) {
        var player = players.get(i)
        if (!player || player.isSpectator()) continue

        var count = 0
        var head = player.getInventory().getArmor(3)
        var chest = player.getInventory().getArmor(2)
        var legs = player.getInventory().getArmor(1)
        var feet = player.getInventory().getArmor(0)

        if (head && head.getId() === 'kubejs:uranium_juggernaut_helmet') count++
        if (chest && chest.getId() === 'kubejs:uranium_juggernaut_chestplate') count++
        if (legs && legs.getId() === 'kubejs:uranium_juggernaut_leggings') count++
        if (feet && feet.getId() === 'kubejs:uranium_juggernaut_boots') count++

        try {
            var speedAttr = player.getAttribute(Attributes.MOVEMENT_SPEED)
            if (!speedAttr) continue

            var safeRemove = function(mod) {
                try {
                    speedAttr['removeModifier(net.minecraft.resources.ResourceLocation)'](EXO_WEIGHT_ID)
                } catch (e1) {
                    try {
                        if (mod) speedAttr['removeModifier(net.minecraft.world.entity.ai.attributes.AttributeModifier)'](mod)
                    } catch (e2) {
                        try {
                            speedAttr.removeModifier(EXO_WEIGHT_ID)
                        } catch (e3) {}
                    }
                }
            }

            if (count > 0) {
                // Pénalité proportionnelle : 2.5% par pièce = 10% pour l'armure complète
                var penalty = -0.025 * count
                var currentMod = speedAttr.getModifier(EXO_WEIGHT_ID)
                if (currentMod) {
                    if (Math.abs(currentMod.amount() - penalty) > 0.001) {
                        safeRemove(currentMod)
                        speedAttr.addTransientModifier(new AttributeModifier(EXO_WEIGHT_ID, penalty, Operation.ADD_MULTIPLIED_BASE))
                    }
                } else {
                    speedAttr.addTransientModifier(new AttributeModifier(EXO_WEIGHT_ID, penalty, Operation.ADD_MULTIPLIED_BASE))
                }
            } else {
                var existingMod = speedAttr.getModifier(EXO_WEIGHT_ID)
                if (existingMod) {
                    safeRemove(existingMod)
                }
            }
        } catch (e) {
            console.error('[ExoArmorWeight] Erreur attribut : ' + e)
        }
    }
    })
}

