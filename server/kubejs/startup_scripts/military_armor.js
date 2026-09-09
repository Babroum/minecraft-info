// priority: 90
// =============================================================================
// NationGlory KubeJS Startup Script - Armures Tactiques et Matériaux de Blindage
// Version NeoForge 1.21.1 / KubeJS 7
// =============================================================================

StartupEvents.registry('armor_material', event => {
    // -------------------------------------------------------------------------
    // 1. Matériau : Composite Balistique (Palier 1 : Supérieur au Diamant)
    // Protection totale = 24 (Diamant = 20), Toughness = 3.5 (Totale = 14)
    // -------------------------------------------------------------------------
    event.create('composite')
        .defense({
            helmet: 4,
            chestplate: 9,
            leggings: 7,
            boots: 4,
            body: 9
        })
        .toughness(3.5)
        .knockbackResistance(0.2)
        .enchantmentValue(15)

    // -------------------------------------------------------------------------
    // 2. Matériau : Uranium Blindé Lourd / Juggernaut (Palier 2 : Ultime Géopolitique)
    // Protection totale = 30 (Netherite = 20), Toughness = 5.0 (Totale = 20)
    // Knockback resistance massive = 0.8 (Anti-stagger sous le feu nourri)
    // -------------------------------------------------------------------------
    event.create('uranium_juggernaut')
        .defense({
            helmet: 5,
            chestplate: 11,
            leggings: 9,
            boots: 5,
            body: 11
        })
        .toughness(5.0)
        .knockbackResistance(0.8)
        .enchantmentValue(20)
})

StartupEvents.registry('item', event => {
    // -------------------------------------------------------------------------
    // Matériaux de Blindage
    // -------------------------------------------------------------------------
    event.create('plaque_composite_balistique')
        .displayName('Plaque Composite Balistique')
        .maxStackSize(64)
        .rarity('uncommon')

    event.create('plaque_uranium_blinde')
        .displayName("Plaque d'Uranium Blindé")
        .maxStackSize(64)
        .rarity('epic')
        .fireResistant(true)

    // -------------------------------------------------------------------------
    // Set 1 : Armure Tactique Composite
    // -------------------------------------------------------------------------
    event.create('composite_helmet', 'helmet')
        .material('kubejs:composite')
        .displayName('Casque Tactique Composite')
        .rarity('uncommon')

    event.create('composite_chestplate', 'chestplate')
        .material('kubejs:composite')
        .displayName('Gilet Pare-Balles Tactique')
        .rarity('uncommon')

    event.create('composite_leggings', 'leggings')
        .material('kubejs:composite')
        .displayName('Jambières Tactiques Composites')
        .rarity('uncommon')

    event.create('composite_boots', 'boots')
        .material('kubejs:composite')
        .displayName('Rangers Tactiques Composites')
        .rarity('uncommon')

    // -------------------------------------------------------------------------
    // Set 2 : Exo-Armure en Uranium Blindé (Juggernaut)
    // -------------------------------------------------------------------------
    event.create('uranium_juggernaut_helmet', 'helmet')
        .material('kubejs:uranium_juggernaut')
        .displayName("Casque d'Assaut en Uranium Blindé")
        .rarity('epic')
        .fireResistant(true)

    event.create('uranium_juggernaut_chestplate', 'chestplate')
        .material('kubejs:uranium_juggernaut')
        .displayName("Cuirasse Juggernaut en Uranium Blindé")
        .rarity('epic')
        .fireResistant(true)

    event.create('uranium_juggernaut_leggings', 'leggings')
        .material('kubejs:uranium_juggernaut')
        .displayName("Jambières Lourdes en Uranium Blindé")
        .rarity('epic')
        .fireResistant(true)

    event.create('uranium_juggernaut_boots', 'boots')
        .material('kubejs:uranium_juggernaut')
        .displayName("Bottes Blindées en Uranium")
        .rarity('epic')
        .fireResistant(true)
})
