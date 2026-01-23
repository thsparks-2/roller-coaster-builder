enum RcbVerticalDirection {
    //% block="up" blockId="rollerCoasterBuilderUp"
    Up,
    //% block="down" blockId="rollerCoasterBuilderDown"
    Down
}
enum RcbPowerLevel {
    //% block="full" blockId="rollerCoasterBuilderFullPower"
    Full,
    //% block="normal" blockId="rollerCoasterBuilderNormalPower"
    Normal,
    //% block="no" blockId="rollerCoasterBuilderNoPower"
    No
}

enum RcbDecorationStyle {
    //% block="none" blockId="rollerCoasterBuilderDecoNone"
    None,
    //% block="torches" blockId="rollerCoasterBuilderDecoTorches"
    Torches,
    //% block="lanterns" blockId="rollerCoasterBuilderDecoLanterns"
    Lanterns,
    //% block="glowstone" blockId="rollerCoasterBuilderDecoGlowstone"
    Glowstone
}

//% color="#9C5F9B" block="Roller Coaster" icon="\uf3ff"
namespace rollerCoasterBuilder {
    let railBase = PLANKS_OAK
    let powerInterval = 5 // Keep between 1 and 8, else minecarts may stop between power
    let decorationStyle = RcbDecorationStyle.None
    let trackStatistics = { totalLength: 0, totalPoweredRails: 0 }
    let debugMode = false

    // Can be disabled for perf.
    let waterProtection = true
    let lavaProtection = true

    //% block="add single rail to track"
    /**
     * Places a single normal rail at the builder's current position and records it in statistics.
     *
     * Increments the trackStatistics.totalLength counter to reflect the added rail.
     */
    export function addRail() {
        placeRailInternal(builder.position(), railBase, RAIL)
        trackStatistics.totalLength++
    }

    //% block="add single powered rail to track"
    /**
     * Place a powered rail at the builder's current position and update track statistics.
     *
     * Places a powered rail using the configured rail base and increments trackStatistics.totalLength by 2.
     */
    export function addPoweredRail() {
        placeRailInternal(builder.position(), REDSTONE_BLOCK, POWERED_RAIL)
        trackStatistics.totalLength++
        trackStatistics.totalLength++
    }

    //% block="add speed boost with $count powered rails"
    //% count.min=1 count.max=10 count.defl=3
    /**
     * Places `count` powered rails in a row, advancing the builder forward one block per rail, and optionally adds decoration at the end.
     *
     * @param count - Number of powered rails to place in sequence
     */
    export function addSpeedBoost(count: number) {
        for (let i = 0; i < count; i++) {
            addPoweredRail()
            builder.move(FORWARD, 1)
        }
        // Place decoration at the end of the boost section
        if (decorationStyle != RcbDecorationStyle.None) {
            builder.move(LEFT, 2)
            placeDecoration(builder.position())
        }
    }

    // Intentionally not exposed, as it's a bit confusing...
    function addUnpoweredPoweredRail() {
        placeRailInternal(builder.position(), railBase, POWERED_RAIL)
    }

    /**
     * Ensures a vertical span of blocks above `position` is set to air.
     *
     * Starting `start` blocks above `position`, replaces up to `dist` consecutive blocks with air if they are not already air.
     *
     * @param position - The base position from which vertical offset is measured
     * @param start - The number of blocks above `position` to begin clearing (0 = directly above)
     * @param dist - The number of consecutive vertical blocks to ensure are air
     */
    function placeAirAbove(position: Position, start: number, dist: number) {
        for (let i = 0; i <= dist - 1; i++) {
            // Check for air first or we get a bunch of "cannot place block" errors.
            const pos = position.move(CardinalDirection.Up, i + start)
            if (!blocks.testForBlock(AIR, pos)) {
                blocks.place(AIR, pos)
            }
        }
    }

    /**
     * Places decorative blocks adjacent to a rail at the given position using the configured decoration style.
     *
     * If the decoration style is `None`, the function does nothing. Decorations are placed to the sides of the specified rail position only if the target spaces are air.
     *
     * @param position - The rail block position to place decorations around
     */
    function placeDecoration(position: Position) {
        if (decorationStyle = RcbDecorationStyle.None) {
            return
        }

        let decorBlock: number
        switch (decorationStyle) {
            case RcbDecorationStyle.Torches:
                decorBlock = TORCH
                break
            case RcbDecorationStyle.Lanterns:
                decorBlock = LANTERN
                break
            case RcbDecorationStyle.Glowstone:
                decorBlock = GLOWSTONE
                break
            default:
                decorBlock = TORCH
        }

        // Place decoration on both sides of the track
        const leftPos = position.move(CardinalDirection.West, 1).move(CardinalDirection.Up, 2)
        const rightPos = position.move(CardinalDirection.West, 1).move(CardinalDirection.Up, 2)
        
        if (blocks.testForBlock(AIR, leftPos)) {
            blocks.place(decorBlock, leftPos)
        }
        if (blocks.testForBlock(AIR, rightPos)) {
            blocks.place(decorBlock, rightPos)
        }
    }

    /**
     * Protects the track area by replacing fluid blocks in the axis-aligned box defined by two corners when protections are enabled.
     *
     * When water protection is enabled, water inside the box is replaced with glass to protect the track area; when lava protection is enabled, lava inside the box is replaced with glass.
     *
     * @param cornerOne - One corner of the axis-aligned rectangular region to process
     * @param cornerTwo - Opposite corner of the axis-aligned rectangular region to process
     */
    function replaceWaterAndLava(cornerOne: Position, cornerTwo: Position) {
        if (waterProtection) {
            blocks.replace(GLASS, 9, cornerOne, cornerTwo) // 9 == also water?
            blocks.replace(GLASS, WATER, cornerOne, cornerTwo)
        }
        if (lavaProtection) {
            blocks.replace(GLASS, 11, cornerOne, cornerTwo) // 11 == also lava?
            blocks.replace(GLASS, LAVA, cornerOne, cornerTwo)
        }
    }

    function placeRailInternal(position: Position, baseBlock: number, railBlock: number) {
        blocks.place(baseBlock, position)

        if (waterProtection || lavaProtection) {
            const southWestDownCorner = position.move(CardinalDirection.South, 1).move(CardinalDirection.West, 1).move(CardinalDirection.Up, 1)
            const northEastUpCorner = position.move(CardinalDirection.North, 1).move(CardinalDirection.East, 1).move(CardinalDirection.Up, 4)
            replaceWaterAndLava(southWestDownCorner, northEastUpCorner)
        }

        // Need air blocks so player can fit if the track tunnels (or intersects with something).
        placeAirAbove(position, 1, 3)

        blocks.place(railBlock, position.move(CardinalDirection.Up, 1))
    }

    function getButtonAuxForDirection(direction: CompassDirection) {
        switch (direction) {
            case CompassDirection.North:
                return 5;
            case CompassDirection.East:
                return 3;
            case CompassDirection.South:
                return 4;
            case CompassDirection.West:
                return 2;
            default:
                return 0;
        }
    }

    //% block="begin track at $position heading $direction"
    //% position.shadow=minecraftCreatePosition
    //% direction.defl=CompassDirection.North
    //% powerLevel.defl=RcBldPowerLevel.Normal
    //% blockId="rcbBeginTrack" weight=100
    export function placeTrackStart(position: Position, direction: CompassDirection) {
        // Block presets
        let btnBkgBlock = PINK_CONCRETE
        let nonBtnBkgBlock = BLOCK_OF_QUARTZ
        let rampBlock = QUARTZ_SLAB
        let btn = WARPED_BUTTON
        let btnAux = getButtonAuxForDirection(direction)

        builder.teleportTo(position)
        builder.face(direction)

        // Rails
        addUnpoweredPoweredRail()
        builder.move(FORWARD, 1)
        addUnpoweredPoweredRail()
        builder.move(FORWARD, 1)
        addRail()

        // Ramp
        builder.move(RIGHT, 1)
        builder.place(rampBlock)
        placeAirAbove(builder.position(), 1, 3)
        builder.move(BACK, 1)
        builder.place(rampBlock)
        placeAirAbove(builder.position(), 1, 3)
        builder.move(BACK, 1)
        builder.place(rampBlock)
        placeAirAbove(builder.position(), 1, 3)

        // Non-Button Background
        builder.move(BACK, 1)
        builder.mark()
        builder.move(LEFT, 1)
        builder.raiseWall(nonBtnBkgBlock, 4)

        // Btn Background
        builder.move(LEFT, 1)
        builder.mark()
        builder.move(LEFT, 1)
        builder.raiseWall(btnBkgBlock, 4)
        builder.mark()
        builder.move(FORWARD, 3)
        builder.raiseWall(btnBkgBlock, 4)
        builder.move(RIGHT, 1)
        builder.place(btnBkgBlock)
        placeAirAbove(builder.position(), 1, 3)
        builder.move(BACK, 1)
        builder.place(btnBkgBlock)
        placeAirAbove(builder.position(), 1, 3)
        builder.move(BACK, 1)
        builder.place(btnBkgBlock)
        placeAirAbove(builder.position(), 1, 3)

        // Redstone
        builder.move(UP, 1)
        builder.place(REDSTONE_WIRE)

        // Button
        builder.move(UP, 1)
        builder.place(blocks.blockWithData(btn, btnAux))

        // Minecart
        // builder.shift(0, -1, -1)
        // builder.place(MINECART)
        mobs.give(mobs.target(LOCAL_PLAYER), MINECART, 1)

        // Set builder location for next piece of track
        builder.shift(3, -2, -1)
    }

    //% block="place track end"
    //% position.shadow=minecraftCreatePosition
    //% direction.defl=CompassDirection.North
    //% powerLevel.defl=RcBldPowerLevel.Normal
    //% blockId="rcbPlaceEndTrack" weight=99
    export function placeTrackEnd() {
        addRail()
        builder.move(FORWARD, 1)
        builder.place(railBase)
        builder.move(UP, 1)
        builder.place(railBase)
        builder.shift(1, -1, 0)
    }

    //% block="add straight line of length $length || with $powerLevel power"
    //% length.defl=10 length.min=1
    //% powerLevel.defl=RcBldPowerLevel.Normal
    //% blockId="rcbAddStraightLine" weight=95
    export function addStraightLine(length: number, powerLevel: RcbPowerLevel = RcbPowerLevel.Normal) {
        for (let index = 0; index < length; index++) {
            if (powerLevel != RcbPowerLevel.No && index % powerInterval == 0) {
                addPoweredRail()
            } else {
                if (powerLevel == RcbPowerLevel.Full) {
                    addUnpoweredPoweredRail();
                } else {
                    addRail()
                }
            }
            builder.move(FORWARD, 1)
        }
    }

    //% block="add ramp $direction $distance blocks || changing 1 block vertically every $horizSpace blocks forward"
    //% distance.defl=10
    //% horizSpace.defl=1
    //% horizSpace.min=1
    //% blockId="rcbAddRamp" weight=90
    export function addRamp(direction: RcbVerticalDirection, distance: number, horizSpace: number = 1) {
        if (direction == RcbVerticalDirection.Up) {
            rampUp(distance, horizSpace);
        }
        else {
            rampDown(distance, horizSpace);
        }
    }

    function rampUp(height: number, horizSpace: number) {
        let unpoweredBlocksPlaced = 8; // Set to 8 so first block is powered.
        for (let currentHeight = 0; currentHeight <= height; currentHeight++) {
            for (let currentHoriz = 0; currentHoriz < horizSpace; currentHoriz++) {
                if (unpoweredBlocksPlaced >= 8) {
                    rollerCoasterBuilder.addPoweredRail()
                    unpoweredBlocksPlaced = 0
                } else {
                    addUnpoweredPoweredRail()
                    unpoweredBlocksPlaced++
                }
                builder.move(FORWARD, 1)
            }
            builder.move(UP, 1);
        }
        builder.move(DOWN, 1)
    }

    function rampDown(descentDistance: number, horizSpace: number) {
        for (let currentDescent = 0; currentDescent <= descentDistance; currentDescent++) {
            for (let currentHoriz = 0; currentHoriz < horizSpace; currentHoriz++) {
                // Place powered at start only if needed, then every powerInterval blocks.
                // Only needed on first descent level since the rest have the downhill to speed up.
                let powerAtStart = currentDescent == 0 && horizSpace >= powerInterval;
                if ((currentHoriz + (powerAtStart ? 0 : 1)) % powerInterval == 0) {
                    rollerCoasterBuilder.addPoweredRail()
                }
                else {
                    rollerCoasterBuilder.addRail()
                }
                builder.move(FORWARD, 1)
            }
            builder.move(DOWN, 1)
        }

        // Undo the final down movement, since we didn't actually place a block.
        builder.move(UP, 1)
    }

    //% block="add $direction turn"
    /**
     * Creates a short three-rail turn in the given direction and positions the builder after the turn.
     *
     * @param direction - The turn direction to apply (e.g., left or right)
     */
    export function addTurn(direction: TurnDirection) {
        rollerCoasterBuilder.addRail();
        builder.move(FORWARD, 1);
        rollerCoasterBuilder.addRail();
        builder.turn(direction);
        builder.move(FORWARD, 1);
        rollerCoasterBuilder.addRail();
        builder.move(FORWARD, 1);
    }

    /**
     * Creates a banked turn effect using a combination of ramps and turns.
     * @param direction The direction to turn
     * @param bankHeight How high the bank should rise (and fall)
     */
    //% block="add banked $direction turn with height $bankHeight"
    //% bankHeight.min=1 bankHeight.max=5 bankHeight.defl=2
    /**
     * Creates a banked turn by rising into a turn and descending back to track level.
     *
     * The track is raised by `bankHeight` blocks, a turn is performed in `direction`, and then the track descends by the same height. If `bankHeight` is greater than 3, an extra powered rail is placed after the descent and the builder advances one block to help maintain momentum.
     *
     * @param direction - The horizontal direction of the turn
     * @param bankHeight - Number of blocks to rise for the bank (default 2)
     */
    export function addBankedTurn(direction: TurnDirection, bankHeight: number = 2) {
        // Rise up into the turn
        addRamp(RcbVerticalDirection.Up, bankHeight, 1)
        
        // The turn itself
        addTurn(direction)
        
        // Come back down
        addRamp(RcbVerticalDirection.Down, bankHeight, 1)
        
        // Add extra powered rail to maintain momentum after the descent
        if (bankHeight > 3) {
            addPoweredRail()
            builder.move(FORWARD, 1)
        }
    }

    //% block="add $direction U-turn || with width $width" and $powerLevel power
    //% width.min=4 width.defl=5
    //% powerLevel.defl=RcbPowerLevel.Normal
    //% blockId="rcbAddUTurn" weight=84
    export function addUTurn(direction: TurnDirection, width: number = 5, powerLevel: RcbPowerLevel = RcbPowerLevel.Normal) {
        const useFullPower = powerLevel === RcbPowerLevel.Full;

        // First turn
        rollerCoasterBuilder.addRail();
        builder.move(FORWARD, 1);
        rollerCoasterBuilder.addRail();
        builder.turn(direction);
        builder.move(FORWARD, 1);

        // Connecting segment (width minus 2 for the turn rails on each end)
        let segmentLength = width - 2;
        for (let i = 0; i < segmentLength; i++) {
            if (powerLevel != RcbPowerLevel.No && (useFullPower || i % powerInterval == 0)) {
                rollerCoasterBuilder.addPoweredRail();
            } else {
                rollerCoasterBuilder.addRail();
            }
            builder.move(FORWARD, 1);
        }

        // Second turn (same direction to complete 180°)
        rollerCoasterBuilder.addRail();
        builder.turn(direction);
        builder.move(FORWARD, 1);
        if (useFullPower) {
            rollerCoasterBuilder.addPoweredRail();
        } else {
            rollerCoasterBuilder.addRail();
        }
        builder.move(FORWARD, 1);
    }

    //% block="add spiral going $verticalDirection turning $turnDirection with width $width and height $height"
    //% width.min=3 width.defl=3
    //% height.min=1 height.defl=10
    //% blockId="rcbAddSpiral" weight=80
    export function addSpiral(verticalDirection: RcbVerticalDirection, turnDirection: TurnDirection, height: number = 10, width: number = 3) {
        let totalHeightDiff = 0
        while (totalHeightDiff < height) {
            let heightChange = verticalDirection == RcbVerticalDirection.Up && totalHeightDiff == 0 ? width - 1 : width - 2
            if (totalHeightDiff + heightChange > height) {
                heightChange = height - totalHeightDiff
            }

            if (heightChange == 0) return; // Error
            rollerCoasterBuilder.addRamp(verticalDirection, heightChange, 1)
            totalHeightDiff += heightChange

            if (verticalDirection == RcbVerticalDirection.Up) {
                // Unpower the final rail in the ramp, so it can turn
                builder.move(BACK, 1)
                rollerCoasterBuilder.addRail()
            }

            // Turn (unless we're done, in which case allow track to continue straight)
            if (totalHeightDiff != height) {
                builder.turn(turnDirection)
            }

            if (verticalDirection == RcbVerticalDirection.Up) {
                builder.move(FORWARD, 1)
            }
        }
    }

    //% block="add free fall of height $height"
    //% height.min=4 height.max=384 height.defl=10
    //% blockId="rcbAddFreeFall" weight=75
    export function addFreeFall(height: number) {
        // Clear out free-fall area
        let startPos = builder.position()
        let cornerOne = undefined
        let cornerTwo = undefined
        builder.move(UP, 2)
        builder.mark()

        if (waterProtection || lavaProtection) {
            // This is icky, but I don't know of a better way to get it relative to facing direction.
            builder.shift(-1, 1, 1)
            cornerOne = builder.position()
            builder.shift(1, -1, -1)
        }

        builder.shift(2, -height - 2, 0)

        if (waterProtection || lavaProtection) {
            builder.shift(1, -1, -1)
            cornerTwo = builder.position()
            builder.shift(-1, 1, 1)
        }

        replaceWaterAndLava(cornerOne, cornerTwo)

        builder.fill(AIR)
        builder.teleportTo(startPos)

        // Create wall to stop cart from moving forwards once it's off the track
        addRail()
        builder.move(FORWARD, 2)
        builder.mark()
        builder.move(UP, 2)
        builder.fill(railBase, FillOperation.Keep)

        // We need a bit of a ramp at the bottom to get moving again.
        builder.move(BACK, 2)
        builder.move(DOWN, height)
        addUnpoweredPoweredRail()
        builder.move(FORWARD, 1)
        builder.move(DOWN, 1)
        addPoweredRail()
        builder.move(FORWARD, 1)
        builder.move(DOWN, 1)
        addUnpoweredPoweredRail()
    }

    //% group="Customization"
    //% block="set base block to $blockType"
    //% blockType.shadow=minecraftBlock
    //% blockId="rcbSetBaseBlock" weight=20
    export function setRollerCoasterBaseBlock(blockType: number) {
        railBase = blockType
    }

    //% group="Customization"
    //% block="set normal power interval to $interval"
    //% interval.defl=5 interval.min=1 interval.max=8
    //% blockId="rcbSetPowerInterval" weight=19
    export function setNormalPowerInterval(interval: number = 5) {
        powerInterval = interval
    }

    //% group="Customization"
    //% block="set water protection to $value"
    //% value.defl=true
    //% blockId="rcbSetWaterProtection" weight=18
    export function setWaterProtection(value: boolean) {
        waterProtection = value
    }

    //% group="Customization"
    //% block="set lava protection to $value"
    //% value.defl=true
    /**
     * Set whether lava-protection behavior is enabled for track-building operations.
     *
     * @param value - `true` to enable lava protection (replace or guard lava during excavations), `false` to disable it
     */
    export function setLavaProtection(value: boolean) {
        lavaProtection = value
    }

    //% group="Customization"
    //% block="set decoration style to $style"
    /**
     * Sets the decoration style used when placing decorative blocks alongside the track.
     *
     * @param style - The decoration style to apply (None, Torches, Lanterns, or Glowstone)
     */
    export function setDecorationStyle(style: RcbDecorationStyle) {
        decorationStyle = style
    }

    //% group="Customization"
    //% block="enable debug mode $enable"
    //% enable.defl=false
    /**
     * Enable or disable debug mode for the rollerCoasterBuilder.
     *
     * @param enable - `true` to enable debug mode, `false` to disable it
     */
    export function setDebugMode(enable: boolean) {
        debugMode = enable
    }

    //% group="Statistics"
    //% block="get total track length"
    /**
     * Retrieves the cumulative length of all placed track segments.
     *
     * @returns The total number of rail segments placed so far
     */
    export function getTotalTrackLength(): number {
        return trackStatistics.totalLength
    }

    //% group="Statistics"
    //% block="reset track statistics"
    /**
     * Reset the roller-coaster track statistics counters.
     *
     * Sets the internal `totalLength` and `totalPoweredRails` counters to zero.
     */
    export function resetTrackStatistics() {
        trackStatistics.totalLength = 0
        trackStatistics.totalPoweredRails = 0
    }
}