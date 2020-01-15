pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import '@statechannels/nitro-protocol/contracts/interfaces/ForceMoveApp.sol';
import '@statechannels/nitro-protocol/contracts/Outcome.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

/**
  * @dev The TicTacToe contract complies with the ForceMoveApp interface and implements a game of Tic Tac Toe (henceforth TTT).
  * The following transitions are allowed:
  *
  * Start -> XPlaying  [ START ]
  * XPlaying -> OPlaying  [ XPLAYING ]
  * XPlaying -> Victory  [ VICTORY ]
  * OPlaying -> XPlaying [ OPLAYING ]
  * OPlaying -> Victory [ VICTORY ]
  * OPlaying -> Draw [ DRAW ]
  * Victory -> Switching [ SWITCH ] // Not implemented yet
  * Draw -> Switching [ SWITCH ] // Not implemented yet
  * Switching -> Start [ FINISH ] // Not implemented yet
  *
*/
contract TicTacToe is ForceMoveApp {
    using SafeMath for uint256;

    enum PositionType {Start, XPlaying, OPlaying, Draw, Victory}

    struct TTTData {
        PositionType positionType;
        uint256 stake;
        uint16 Xs; // 110000000
        uint16 Os; // 001100000
    }

    /**
    * @notice Decodes the appData.
    * @dev Decodes the appData.
    * @param appDataBytes The abi.encode of a TTTData struct describing the application-specific data.
    * @return An TTTData struct containing the application-specific data.
    */
    function appData(bytes memory appDataBytes) internal pure returns (TTTData memory) {
        return abi.decode(appDataBytes, (TTTData));
    }

    /**
    * @notice Encodes the TTT update rules.
    * @dev Encodes the TTT update rules.
    * @param fromPart State being transitioned from.
    * @param toPart State being transitioned to.
    * @param turnNumB Used to calculate current turnTaker % nParticipants.
    * @param nParticipants Amount of players. Should be 2?
    * @return true if the transition conforms to the rules, false otherwise.
    */
    function validTransition(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        uint256 turnNumB, // Used to calculate current turnTaker % nParticipants
        uint256 nParticipants
    ) public pure returns (bool) {
        Outcome.AllocationItem[] memory fromAllocation = extractAllocation(fromPart);
        Outcome.AllocationItem[] memory toAllocation = extractAllocation(toPart);
        _requireDestinationsUnchanged(fromAllocation, toAllocation);
        // decode application-specific data
        TTTData memory fromGameData = appData(fromPart.appData);
        TTTData memory toGameData = appData(toPart.appData);

        // deduce action
        if (fromGameData.positionType == PositionType.Start) {
            require(
                toGameData.positionType == PositionType.XPlaying,
                'Start may only transition to XPlaying'
            );
            requireValidSTARTtoXPLAYING(
                fromPart,
                toPart,
                fromAllocation,
                toAllocation,
                fromGameData,
                toGameData
            );
            return true;
        } else if (fromGameData.positionType == PositionType.XPlaying) {
            if (toGameData.positionType == PositionType.OPlaying) {
                requireValidXPLAYINGtoOPLAYING(
                    fromAllocation,
                    toAllocation,
                    fromGameData,
                    toGameData
                );
                return true;
            } else if (toGameData.positionType == PositionType.Victory) {
                requireValidXPLAYINGtoVICTORY(
                    fromAllocation,
                    toAllocation,
                    fromGameData,
                    toGameData
                );
                return true;
            }
            revert('XPlaying may only transition to OPlaying or Victory');
        } else if (fromGameData.positionType == PositionType.OPlaying) {
            if (toGameData.positionType == PositionType.XPlaying) {
                requireValidOPLAYINGtoXPLAYING(
                    fromAllocation,
                    toAllocation,
                    fromGameData,
                    toGameData
                );
                return true;
            } else if (toGameData.positionType == PositionType.Victory) {
                requireValidOPLAYINGtoVICTORY(
                    fromPart,
                    toPart,
                    fromAllocation,
                    toAllocation,
                    fromGameData,
                    toGameData
                );
                return true;
            } else if (toGameData.positionType == PositionType.Draw) {
                requireValidOPLAYINGtoDRAW(fromAllocation, toAllocation, fromGameData, toGameData);
                return true;
            }
            revert('OPlaying may only transition to XPlaying or Victory or Draw');
        } else if (fromGameData.positionType == PositionType.Draw) {
            require(
                toGameData.positionType == PositionType.Start,
                'Draw may only transition to Start'
            );
            requireValidDRAWtoSTART(fromAllocation, toAllocation, fromGameData, toGameData);
            return true;
        } else if (fromGameData.positionType == PositionType.Victory) {
            require(
                toGameData.positionType == PositionType.Start,
                'Victory may only transition to Start'
            );
            requireValidVICTORYtoSTART(fromAllocation, toAllocation, fromGameData, toGameData);
            return true;
        }
        revert('No valid transition found');
    }

    function requireValidSTARTtoXPLAYING(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    )
        private
        pure
        noDisjointMoves(toGameData)
        stakeUnchanged(fromGameData, toGameData)
        allocationsNotLessThanStake(fromAllocation, toAllocation, fromGameData, toGameData)
    {
        require(toGameData.Os == 0, 'No Os on board');
        require(madeStrictlyOneMark(toGameData.Xs, 0), 'One X placed');

        // Current X Player should get all the stake. This is to decrease griefing. We assume that X Player is Player A
        require(
            toAllocation[0].amount == fromAllocation[0].amount.add(toGameData.stake),
            'Allocation for player A should be incremented by 1x stake'
        );
        require(
            toAllocation[1].amount == fromAllocation[1].amount.sub(toGameData.stake),
            'Allocation for player B should be decremented by 1x stake.'
        );

        // Old TTTMago code
        // if (State.indexOfMover(_new) == 0) { // mover is A
        //     require(_new.aResolution() == _old.aResolution() + _new.stake());
        //     require(_new.bResolution() == _old.bResolution() - _new.stake());
        // } else if (State.indexOfMover(_new) == 1) { // mover is B
        //     require(_new.aResolution() == _old.aResolution() - _new.stake());
        //     require(_new.bResolution() == _old.bResolution() + _new.stake());
        // }

    }

    function requireValidXPLAYINGtoOPLAYING(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    )
        private
        pure
        noDisjointMoves(toGameData)
        stakeUnchanged(fromGameData, toGameData)
        allocationsNotLessThanStake(fromAllocation, toAllocation, fromGameData, toGameData)
    {
        require(toGameData.Xs == fromGameData.Xs, 'No Xs added to board');
        require(madeStrictlyOneMark(toGameData.Os, fromGameData.Os), 'One O placed');

        // Current O Player should get all the stake. This is to decrease griefing. We assume that O Player is Player B
        require(
            toAllocation[0].amount == fromAllocation[0].amount.sub(toGameData.stake*2),
            'Allocation for player A should be decremented by 1x stake'
        );
        require(
            toAllocation[1].amount == fromAllocation[1].amount.add(toGameData.stake*2),
            'Allocation for player B should be incremented by 1x stake.'
        );

        // Old TTTMagmo code
        // if (State.indexOfMover(_new) == 0) {
        //     // mover is A
        //     require(_new.aResolution() == _old.aResolution() + 2 * _new.stake());
        //     require(_new.bResolution() == _old.bResolution() - 2 * _new.stake());
        // } else if (State.indexOfMover(_new) == 1) {
        //     // mover is B
        //     require(_new.aResolution() == _old.aResolution() - 2 * _new.stake());
        //     require(_new.bResolution() == _old.bResolution() + 2 * _new.stake());
        //     // note factor of 2 to swing fully to other player
        // }

    }

    function requireValidOPLAYINGtoXPLAYING(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    )
        private
        pure
        noDisjointMoves(toGameData)
        stakeUnchanged(fromGameData, toGameData)
        allocationsNotLessThanStake(fromAllocation, toAllocation, fromGameData, toGameData)
    {
        require(toGameData.Os == fromGameData.Os, 'No Os added to board');
        require(madeStrictlyOneMark(toGameData.Xs, fromGameData.Xs), 'One X placed');

        // Current X Player should get all the stake. This is to decrease griefing. We assume that X Player is Player A
        require(
            toAllocation[0].amount == fromAllocation[0].amount.add(toGameData.stake*2),
            'Allocation for player A should be incremented by 1x stake'
        );
        require(
            toAllocation[1].amount == fromAllocation[1].amount.sub(toGameData.stake*2),
            'Allocation for player B should be decremented by 1x stake.'
        );
        
        // Old TTTMagmo code
        // if (State.indexOfMover(_new) == 0) { // mover is A
        //     require(_new.aResolution() == _old.aResolution() + 2 * _new.stake()); // note extra factor of 2 to swing fully to other player
        //     require(_new.bResolution() == _old.bResolution() - 2 * _new.stake());
        // } else if (State.indexOfMover(_new) == 1) { // mover is B
        //     require(_new.aResolution() == _old.aResolution() - 2 * _new.stake());
        //     require(_new.bResolution() == _old.bResolution() + 2 * _new.stake());
        // } // mover gets to claim stakes: note factor of 2 to swing fully to other player

    }

    function requireValidXPLAYINGtoVICTORY(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    )
        private
        pure
        noDisjointMoves(toGameData)
        stakeUnchanged(fromGameData, toGameData)
    {
        require(toGameData.Xs == fromGameData.Xs, 'No Xs added to board');
        require(madeStrictlyOneMark(toGameData.Os, fromGameData.Os), 'One O placed');
        require(hasWon(toGameData.Os), 'O has won');

        uint256 currentOsPlayer = 1; // Need to calculate this

        uint256 playerAWinnings; // playerOneWinnings
        uint256 playerBWinnings; // playerTwoWinnings
        // calculate winnings
        (playerAWinnings, playerBWinnings) = winnings(currentOsPlayer, toGameData.stake);

        // TODO This logic will only work if PlayerA is Xs and PlayerB is Os
        require(
            toAllocation[1].amount == fromAllocation[1].amount.add(playerBWinnings),
            "Player B's allocation should be updated with the winnings."
        );
        require(
            toAllocation[0].amount ==
                fromAllocation[0].amount.sub(fromGameData.stake.mul(2)).add(playerAWinnings),
            "Player A's allocation should be updated with the winnings."
        );

        // Old TTTMagmo code
        // if (State.indexOfMover(_new) == 0) {
        //     // mover is A
        //     require(_new.aResolution() == _old.aResolution() + 2 * _new.stake());
        //     require(_new.bResolution() == _old.bResolution() - 2 * _new.stake());
        // } else if (State.indexOfMover(_new) == 1) {
        //     // mover is B
        //     require(_new.aResolution() == _old.aResolution() - 2 * _new.stake());
        //     require(_new.bResolution() == _old.bResolution() + 2 * _new.stake());
        // } // mover gets to claim stakes

    }

    function requireValidOPLAYINGtoVICTORY(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    )
        private
        pure
        noDisjointMoves(toGameData)
        stakeUnchanged(fromGameData, toGameData)
    {
        require(toGameData.Os == fromGameData.Os, 'No Os added to board');
        require(madeStrictlyOneMark(toGameData.Xs, fromGameData.Xs), 'One X placed');
        require(hasWon(toGameData.Xs), 'X has won');

        uint256 currentXsPlayer = 0; // Need to calculate this

        uint256 playerAWinnings; // playerOneWinnings
        uint256 playerBWinnings; // playerTwoWinnings
        // calculate winnings
        (playerAWinnings, playerBWinnings) = winnings(currentXsPlayer, toGameData.stake);

        // TODO This logic will only work if PlayerA is Xs and PlayerB is Os
        require(
            toAllocation[0].amount == fromAllocation[0].amount.add(playerAWinnings),
            "Player A's allocation should be updated with the winnings."
        );
        require(
            toAllocation[1].amount ==
                fromAllocation[1].amount.sub(fromGameData.stake.mul(2)).add(playerBWinnings),
            "Player B's allocation should be updated with the winnings."
        );

    }

    function requireValidOPLAYINGtoDRAW(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    )
        private
        pure
        noDisjointMoves(toGameData)
        stakeUnchanged(fromGameData, toGameData)
    {
        require(isDraw(toGameData.Os, toGameData.Xs), "Draw - Board is full"); // check if board full.
        require(madeStrictlyOneMark(toGameData.Xs, fromGameData.Xs), "One X placed");
        require(toGameData.Os == fromGameData.Os, 'No Os added to board');

        // TODO This logic will only work if PlayerA is Xs and PlayerB is Os
        require(
            toAllocation[0].amount == fromAllocation[0].amount.add(toGameData.stake),
            "Player A's allocation should be updated with the winnings."
        );
        require(
            toAllocation[1].amount ==
                fromAllocation[1].amount.sub(toGameData.stake),
            "Player B's allocation should be updated with the winnings."
        );


        // Old TTTMagmo code
        // crosses always plays first move and always plays the move that completes the board
        // if (State.indexOfMover(_new) == 0) {
        //     require(_new.aResolution() == _old.aResolution() + 2 * _new.stake()); // no extra factor of 2, restoring to parity
        //     require(_new.bResolution() == _old.bResolution() - 2 * _new.stake());
        // } else if (State.indexOfMover(_new) == 1) {
        //     require(_new.aResolution() == _old.aResolution() - 2 * _new.stake());
        //     require(_new.bResolution() == _old.bResolution() + 2 * _new.stake());
        // } // mover gets to restore parity to the winnings

    }

    function requireValidDRAWtoSTART(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    )
        private
        pure
        allocationUnchanged(fromAllocation, toAllocation)
        stakeUnchanged(fromGameData, toGameData)
    {}

    function requireValidVICTORYtoSTART(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    )
        private
        pure
        allocationUnchanged(fromAllocation, toAllocation)
        stakeUnchanged(fromGameData, toGameData)
    {}

    function extractAllocation(VariablePart memory variablePart)
        private
        pure
        returns (Outcome.AllocationItem[] memory)
    {
        Outcome.OutcomeItem[] memory outcome = abi.decode(variablePart.outcome, (Outcome.OutcomeItem[]));
        require(outcome.length == 1, 'TicTacToe: Only one asset allowed');

        Outcome.AssetOutcome memory assetOutcome = abi.decode(
            outcome[0].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );

        require(
            assetOutcome.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Allocation),
            'TicTacToe: AssetOutcomeType must be Allocation'
        );

        Outcome.AllocationItem[] memory allocation = abi.decode(
            assetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );

        require(
            allocation.length == 2,
            'TicTacToe: Allocation length must equal number of participants (i.e. 2)'
        );

        return allocation;
    }

    function winnings(uint256 currentWinnerPlayer, uint256 stake)
        private
        pure
        returns (uint256, uint256)
    {
        if (currentWinnerPlayer == 0) {
            // first player won
            return (2 * stake, 0);
        } else if (currentWinnerPlayer == 1) {
            // second player won
            return (0, 2 * stake);
        } else {
            // Draw
            return (stake, stake);
        }
    }

    function _requireDestinationsUnchanged(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation
    ) private pure {
        require(
            toAllocation[0].destination == fromAllocation[0].destination,
            'TicTacToe: Destimation playerA may not change'
        );
        require(
            toAllocation[1].destination == fromAllocation[1].destination,
            'TicTacToe: Destimation playerB may not change'
        );
    }

    // modifiers
    modifier outcomeUnchanged(VariablePart memory a, VariablePart memory b) {
        require(keccak256(b.outcome) == keccak256(a.outcome), 'TicTacToe: Outcome must not change');
        _;
    }

    modifier noDisjointMoves(TTTData memory toGameData) {
        require(areDisjoint(toGameData.Xs, toGameData.Os), 'TicTacToe: No Disjoint Moves');
        _;
    }

    modifier stakeUnchanged(TTTData memory fromGameData, TTTData memory toGameData) {
        require(
            fromGameData.stake == toGameData.stake,
            'The stake should be the same between commitments'
        );
        _;
    }

    modifier allocationsNotLessThanStake(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        TTTData memory fromGameData,
        TTTData memory toGameData
    ) {
        require(
            fromAllocation[0].amount >= toGameData.stake,
            'The allocation for player A must not fall below the stake.'
        );
        require(
            fromAllocation[1].amount >= toGameData.stake,
            'The allocation for player B must not fall below the stake.'
        );
        _;
    }

    modifier allocationUnchanged(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation
    ) {
        require(
            toAllocation[0].destination == fromAllocation[0].destination,
            'TicTacToe: Destimation playerA may not change'
        );
        require(
            toAllocation[1].destination == fromAllocation[1].destination,
            'TicTacToe: Destimation playerB may not change'
        );
        require(
            toAllocation[0].amount == fromAllocation[0].amount,
            'TicTacToe: Amount playerA may not change'
        );
        require(
            toAllocation[1].amount == fromAllocation[1].amount,
            'TicTacToe: Amount playerB may not change'
        );
        _;
    }

    // helper functions

    // Unravelling of grid is as follows:
    //
    //      0  |  1  |  2
    //   +-----------------+
    //      3  |  4  |  5
    //   +-----------------+
    //      6  |  7  |  8
    //
    // The binary representation A single mark is 2**(8-index).
    //
    // e.g. Os = 000000001
    //      Xs = 010000000
    //
    // corresponds to
    //
    //         |  X  |
    //   +-----------------+
    //         |     |
    //   +-----------------+
    //         |     |  0
    //
    uint16 constant topRow = 448; /*  0b111000000 = 448 mask for win @ row 1 */
    uint16 constant midRow = 56; /*  0b000111000 =  56 mask for win @ row 2 */
    uint16 constant botRow = 7; /*  0b000000111 =   7 mask for win @ row 3 */
    uint16 constant lefCol = 292; /*  0b100100100 = 292 mask for win @ col 1 */
    uint16 constant midCol = 146; /*  0b010010010 = 146 mask for win @ col 2 */
    uint16 constant rigCol = 73; /*  0b001001001 =  73 mask for win @ col 3 */
    uint16 constant dhDiag = 273; /*  0b100010001 = 273 mask for win @ downhill diag */
    uint16 constant uhDiag = 84; /*  0b001010100 =  84 mask for win @ uphill diag */
    //
    uint16 constant fullBd = 511; /*  0b111111111 = 511 full board */

    // Xs = 111000100 & topRow = 111000000 === WIN
    function hasWon(uint16 _marks) public pure returns (bool) {
        return (((_marks & topRow) == topRow) ||
            ((_marks & midRow) == midRow) ||
            ((_marks & botRow) == botRow) ||
            ((_marks & lefCol) == lefCol) ||
            ((_marks & midCol) == midCol) ||
            ((_marks & rigCol) == rigCol) ||
            ((_marks & dhDiag) == dhDiag) ||
            ((_marks & uhDiag) == uhDiag));
    }

    // Xs === 111100001; Os === 000011110; DRAW
    function isDraw(uint16 _Os, uint16 _Xs) public pure returns (bool) {
        if ((_Os ^ _Xs) == fullBd) {
            return true; // using XOR. Note that a draw could include a winning position that is unnoticed / unclaimed
        } else return false;
    }

    // Valid
    // OLD: Xs = 1100000000
    // NEW: Xs = 1100000001
    // Invalid - Erased
    // OLD: Xs = 1100000001
    // NEW: Xs = 1100000000
    // Invalid - Double move
    // OLD: Xs = 1100000000
    // NEW: Xs = 1100000011
    function madeStrictlyOneMark(uint16 _new_marks, uint16 _old_marks) public pure returns (bool) {
        uint16 i;
        bool already_marked = false;
        for (i = 0; i < 9; i++) {
            if ((_new_marks >> i) % 2 == 0 && (_old_marks >> i) % 2 == 1) {
                return false; // erased a mark
            } else if ((_new_marks >> i) % 2 == 1 && (_old_marks >> i) % 2 == 0) {
                if (already_marked == true) {
                    return false; // made two or more marks
                }
                already_marked = true; // made at least one mark
            }
        }
        if (_new_marks == _old_marks) {
            return false;
        } // do not allow a non-move
        return true;
    }

    // Checks that no mark was overriden
    function areDisjoint(uint16 _Os, uint16 _Xs) public pure returns (bool) {
        if ((_Os & _Xs) == 0) {
            return true;
        } else return false;
    }
}
