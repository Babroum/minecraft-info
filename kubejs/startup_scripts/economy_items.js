// priority: 100
// =============================================================================
// Third World KubeJS Startup Script - Devises et Matériaux Stratégiques
// Version NeoForge 1.21.1 / KubeJS 7
// =============================================================================

StartupEvents.registry('item', event => {
    // -------------------------------------------------------------------------
    // 1. Déclaration des Coupures de Billets de Banque (Chaîne Monétaire d'État)
    // -------------------------------------------------------------------------

    // Billet de 1 Robert Coin (1 R)
    event.create('billet_1')
        .displayName('Billet de 1 Robert Coin')
        .maxStackSize(64)
        .rarity('common')

    // Billet de 5 Robert Coins (5 R)
    event.create('billet_5')
        .displayName('Billet de 5 Robert Coins')
        .maxStackSize(64)
        .rarity('common')

    // Billet de 20 Robert Coins (20 R)
    event.create('billet_20')
        .displayName('Billet de 20 Robert Coins')
        .maxStackSize(64)
        .rarity('uncommon')

    // Billet de 100 Robert Coins (100 R)
    event.create('billet_100')
        .displayName('Billet de 100 Robert Coins')
        .maxStackSize(64)
        .rarity('rare')

    // -------------------------------------------------------------------------
    // 2. Matériau Géopolitique Stratégique
    // -------------------------------------------------------------------------

    // Lingot d'Uranium Militaire Enrichi (Composant de haute technologie militaire)
    event.create('lingot_uranium_militaire')
        .displayName("Lingot d'Uranium Militaire")
        .maxStackSize(64)
        .rarity('epic')
        .fireResistant(true)
})
