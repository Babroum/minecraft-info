// priority: 50
// =============================================================================
// NationGlory Server Script - Verrouillage Industriel et Militaire
// NeoForge 1.21.1 / KubeJS 7
// =============================================================================

ServerEvents.recipes(event => {
    // -------------------------------------------------------------------------
    // 1. Suppression des recettes militaires basiques (Ballistix & Big Cannons)
    // -------------------------------------------------------------------------
    
    // Suppression des recettes de base des missiles et ogives Ballistix
    const ballistixToRemove = [
        'ballistix:missile_tier1_electro',
        'ballistix:missile_tier1_noelectro',
        'ballistix:missile_tier2_electro',
        'ballistix:missile_tier2_noelectro',
        'ballistix:missile_tier3_electro',
        'ballistix:missile_tier3_noelectro',
        'ballistix:explosive_nuclear_electro',
        'ballistix:explosive_nuclear_noelectro',
        'ballistix:explosive_antimatter_electro',
        'ballistix:explosive_antimatter_noelectro',
        'ballistix:explosive_antimatterlarge_electro',
        'ballistix:explosive_antimatterlarge_noelectro',
        'ballistix:explosive_darkmatter_electro',
        'ballistix:explosive_darkmatter_noelectro',
        'ballistix:explosive_thermobaric',
        'ballistix:explosive_hypersonic',
        'ballistix:explosive_emp_electro',
        'ballistix:explosive_emp_noelectro'
    ]

    ballistixToRemove.forEach(recipeId => {
        event.remove({ id: recipeId })
    })

    // Suppression des obus lourds et culasses de Create Big Cannons
    const bigCannonsToRemove = [
        'createbigcannons:he_shell',
        'createbigcannons:shrapnel_shell',
        'createbigcannons:drop_mortar_shell',
        'createbigcannons:fluid_shell',
        'createbigcannons:solid_shot',
        'createbigcannons:steel_screw_lock',
        'createbigcannons:steel_sliding_breechblock',
        'createbigcannons:nethersteel_screw_lock'
    ]

    bigCannonsToRemove.forEach(recipeId => {
        event.remove({ id: recipeId })
    })

    // -------------------------------------------------------------------------
    // 2. Réingénierie : Missiles Stratégiques Ballistix
    // -------------------------------------------------------------------------

    // Missile Tier 1 (Tactique courte portée)
    // Exige précision Create + électronique de base Mekanism
    event.shaped('ballistix:missiletier1', [
        ' P ',
        'ACA',
        'SGS'
    ], {
        P: 'create:precision_mechanism',
        A: 'mekanism:alloy_infused',
        C: 'mekanism:basic_control_circuit',
        S: 'mekanism:ingot_steel',
        G: 'minecraft:gunpowder'
    })

    // Missile Tier 2 (Portée intermédiaire)
    // Intègre le premier niveau d'enrichissement militaire
    event.shaped('ballistix:missiletier2', [
        ' U ',
        'RMR',
        'ECE'
    ], {
        U: 'kubejs:lingot_uranium_militaire',
        R: 'mekanism:alloy_reinforced',
        M: 'ballistix:missiletier1',
        C: 'mekanism:advanced_control_circuit',
        E: 'create:electron_tube'
    })

    // Missile Tier 3 (Intercontinental ICBM)
    // Complexe militaro-industriel complet
    event.shaped('ballistix:missiletier3', [
        ' U ',
        'AMA',
        'CPC'
    ], {
        U: 'kubejs:lingot_uranium_militaire',
        A: 'mekanism:alloy_atomic',
        M: 'ballistix:missiletier2',
        C: 'mekanism:elite_control_circuit',
        P: 'create:precision_mechanism'
    })

    // -------------------------------------------------------------------------
    // 3. Réingénierie : Ogives de Destruction Massive Ballistix
    // -------------------------------------------------------------------------

    // Ogive Nucléaire (Enrichissement militaire massif)
    event.shaped('ballistix:nuclear', [
        'ACA',
        'UXU',
        'ACA'
    ], {
        A: 'mekanism:alloy_reinforced',
        C: 'mekanism:elite_control_circuit',
        U: 'kubejs:lingot_uranium_militaire',
        X: 'mekanism:steel_casing'
    })

    // Ogive Antimatière (Ultime technologie géopolitique)
    event.shaped('ballistix:antimatter', [
        'ACA',
        'UXU',
        'ACA'
    ], {
        A: 'mekanism:alloy_atomic',
        C: 'mekanism:ultimate_control_circuit',
        U: 'kubejs:lingot_uranium_militaire',
        X: 'minecraft:nether_star'
    })

    // Ogive Thermobarique (Pression mécanique Create + circuits avancés)
    event.shaped('ballistix:thermobaric', [
        ' P ',
        'CFC',
        'APA'
    ], {
        P: 'create:precision_mechanism',
        C: 'mekanism:advanced_control_circuit',
        F: 'minecraft:tnt',
        A: 'mekanism:alloy_reinforced'
    })

    // Ogive IEM / EMP (Brouillage électronique Mekanism)
    event.shaped('ballistix:emp', [
        ' C ',
        'RXR',
        ' C '
    ], {
        C: 'mekanism:advanced_control_circuit',
        R: 'create:electron_tube',
        X: 'mekanism:steel_casing'
    })

    // -------------------------------------------------------------------------
    // 4. Réingénierie : Artillerie Lourde Create Big Cannons
    // -------------------------------------------------------------------------

    // Obus Explosif Lourd (HE Shell - Haute performance)
    event.shaped('createbigcannons:he_shell', [
        ' P ',
        'AUA',
        ' S '
    ], {
        P: 'create:precision_mechanism',
        A: 'mekanism:alloy_infused',
        U: 'kubejs:lingot_uranium_militaire',
        S: 'createbigcannons:solid_shot'
    })

    // Obus Perforant Blindé (Solid Shot Militaire)
    event.shaped('createbigcannons:solid_shot', [
        ' S ',
        'SUS',
        ' S '
    ], {
        S: 'mekanism:ingot_steel',
        U: 'kubejs:lingot_uranium_militaire'
    })

    // Obus Shrapnel Avancé
    event.shaped('createbigcannons:shrapnel_shell', [
        ' P ',
        'ASA',
        ' T '
    ], {
        P: 'create:precision_mechanism',
        A: 'createbigcannons:shot_balls',
        S: 'mekanism:steel_casing',
        T: 'minecraft:tnt'
    })

    // Culasses de précision en acier pour canons lourds
    event.shaped('createbigcannons:steel_screw_lock', [
        ' S ',
        'MPM',
        ' S '
    ], {
        S: 'mekanism:ingot_steel',
        M: 'mekanism:alloy_reinforced',
        P: 'create:precision_mechanism'
    })

    event.shaped('createbigcannons:steel_sliding_breechblock', [
        'SMS',
        ' P ',
        'SMS'
    ], {
        S: 'mekanism:ingot_steel',
        M: 'mekanism:alloy_reinforced',
        P: 'create:precision_mechanism'
    })
})
