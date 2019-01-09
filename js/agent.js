// helper functions
function randomInt(n) {
    return Math.floor(Math.random() * n);
};

/**var brain = new AgentBrain(gameManager) */
function AgentBrain(gameEngine) {
    this.size = 4;
    this.previousState = gameEngine.grid.serialize();
    this.reset();
    this.score = 0;
};

AgentBrain.prototype.reset = function () {
    this.score = 0;
    this.grid = new Grid(this.previousState.size, this.previousState.cells);
};

/** Adds a tile in a random position*/
AgentBrain.prototype.addRandomTile = function () {
    if (this.grid.cellsAvailable()) {
        var value = Math.random() < 0.9 ? 2 : 4;
        var tile = new Tile(this.grid.randomAvailableCell(), value);

        this.grid.insertTile(tile);
    }
};

AgentBrain.prototype.moveTile = function (tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
AgentBrain.prototype.move = function (direction) {
    // 0: up, 1: right, 2: down, 3: left
    var self = this;

    var cell, tile;

    var vector = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved = false;

    // console.log(vector);

    //console.log(traversals);

    // Traverse the grid in the right direction and move tiles
    traversals.x.forEach(function (x) {
        traversals.y.forEach(function (y) {
            cell = { x: x, y: y };
            tile = self.grid.cellContent(cell);

            if (tile) {
                var positions = self.findFarthestPosition(cell, vector);
                var next = self.grid.cellContent(positions.next);

                // Only one merger per row traversal?
                if (next && next.value === tile.value && !next.mergedFrom) {
                    var merged = new Tile(positions.next, tile.value * 2);
                    merged.mergedFrom = [tile, next];

                    self.grid.insertTile(merged);
                    self.grid.removeTile(tile);

                    // Converge the two tiles' positions
                    tile.updatePosition(positions.next);

                    // Update the score
                    self.score += merged.value;

                } else {
                    self.moveTile(tile, positions.farthest);
                }

                if (!self.positionsEqual(cell, tile)) {
                    moved = true; // The tile moved from its original cell!
                }
            }
        });
    });
    // console.log(moved);
    // if (moved) {// add a random tile to the board after a move
    //     //  this.addRandomTile(); 
    // }
    return moved;
    };

// Get the vector representing the chosen direction
AgentBrain.prototype.getVector = function (direction) {
    // Vectors representing tile movement
    var map = {
        0: { x: 0, y: -1 }, // Up
        1: { x: 1, y: 0 },  // Right
        2: { x: 0, y: 1 },  // Down
        3: { x: -1, y: 0 }   // Left
    };

    return map[direction];
};

// Build a list of positions to traverse in the right order
AgentBrain.prototype.buildTraversals = function (vector) {
    var traversals = { x: [], y: [] };

    for (var pos = 0; pos < this.size; pos++) {
        traversals.x.push(pos);
        traversals.y.push(pos);
    }

    // Always traverse from the farthest cell in the chosen direction
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();

    return traversals;
};


AgentBrain.prototype.findFarthestPosition = function (cell, vector) {
    var previous;

    // Progress towards the vector direction until an obstacle is found
    do {
        previous = cell;
        cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) &&
             this.grid.cellAvailable(cell));

    return {
        farthest: previous,
        next: cell // Used to check if a merge is required
    };
};

AgentBrain.prototype.positionsEqual = function (first, second) {
    return first.x === second.x && first.y === second.y;
};


var PLAYER = 0;
var COMPUTER = 1;
function Agent() {
};

/**
 * @param {*} depth the recursive depth
 * @param {*} brain the game board state, a clone of a gameManager
 * @param {*} player the human or computer
 */
Agent.prototype.expectimax = function (depth, brain, turn) {
    var cloneBrain = new AgentBrain(brain);
    var legalMoves = this.getLegalMoves(cloneBrain);
    if (depth === 0 || (legalMoves.length === 0)) { //no leagal move or depth reach end
        return this.evaluateGrid(brain.grid);
    }
    
    if (turn === PLAYER) {
        var score = Number.MIN_VALUE;
        for (var i = 0; i < legalMoves.length; i++) {
            var clone = new AgentBrain(cloneBrain);
            clone.move(legalMoves[i]);
            var tempScore = this.expectimax(depth - 1, clone, COMPUTER);
            if (tempScore > score) {
                score = tempScore;
            }
            // cloneBrain.reset();
        }
        return score;

    } else if (turn === COMPUTER) {
        var emptyCells = brain.grid.availableCells();
        var score = 0;
        var emptyCellLength = emptyCells.length

        for (var i = 0; i < emptyCellLength; i++) {
            //insert 2 to grid and evaluate
            var clone = new AgentBrain(cloneBrain);
            var tile2 = new Tile(emptyCells[i], 2);
            this.insertTileToGrid(tile2, clone.grid);
            var tempScore2 = this.expectimax(depth - 1, clone, PLAYER);
            score += 0.9 * tempScore2;

            //insert 4 to grid and evaluate
            clone = new AgentBrain(cloneBrain);
            var tile4 = new Tile(emptyCells[i], 4);
            this.insertTileToGrid(tile4, clone.grid);
            var tempScore4 = this.expectimax(depth - 1, clone, PLAYER);
            score += 0.1 * tempScore4;
        }
        return score / emptyCellLength;
    }
    
}

Agent.prototype.getLegalMoves = function(brain) {
    var directions = [];
    for (var i = 0; i < 4; i++) {
        if (brain.move(i)) {
            directions.push(i);
        }
        brain.reset();
    }
    return directions;
}

Agent.prototype.insertTileToGrid = function(tile, grid) {
	grid.insertTile(tile);
}

/**
 * 7 games played in 1000007ms.
 * 2048: 5 4096: 5 8192: 1
 */
Agent.prototype.selectMove = function (gameManager) {
    var cloneBrain = new AgentBrain(gameManager);
    var score = Number.MIN_VALUE;
    var bestMove = 0;
    var legalMoves = this.getLegalMoves(cloneBrain);
    // var depth = cloneBrain.grid.availableCells().length > 4 ? 4:6;
    var depth = 4; // 6 will be very slow

    for (var i = 0; i < legalMoves.length; i++) {
        cloneBrain.move(legalMoves[i]);
        var tempScore = this.expectimax(depth, cloneBrain, COMPUTER);
        if (tempScore > score) {
            score = tempScore;
            bestMove = legalMoves[i];
        }
        cloneBrain.reset();
    }
    return bestMove;
};

//weight matrix from http://iamkush.me/an-artificial-intelligence-for-the-2048-game/
// var WEIGHT = [
//     [6, 5, 4, 1],
//     [5, 4, 1, 0],
//     [4, 1, 0, -1],
//     [1, 0, -1, -2]
// ];

/**weight matrix from https://codemyroad.wordpress.com/2014/05/14/2048-ai-the-intelligent-bot/
 * modify to a snake-shaped for better result.
 * */
var WEIGHT = [
    [0.135759, 0.121925, 0.102812, 0.099937],
    [0.0724143, 0.076711, 0.0888405,0.0997992],
    [0.060654, 0.0562579, 0.037116, 0.0161889],
    [0.00335193, 0.00575871, 0.00992495, 0.0125498]
];
/** calculate a score for the current grid configuration */
Agent.prototype.evaluateGrid = function (grid) {
    var size = grid.cells.length;
    var score = 0;
    //cell value * WEIGHT
    for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
            if (grid.cells[i][j] != null) {
                score += grid.cells[i][j].value * WEIGHT[i][j];
            }
        }
    }
    //give a penalty if neighbour's value > the cell on the neighbour' left.
    var penalty = 0;
    for (var i = 0; i < size - 1; i++) {
        for (var j = 0; j < size - 1; j++) {
            var cellValue = 0;
            var neighbourValue = 0;
            if (grid.cells[i][j] != null) {
                cellValue = grid.cells[i][j].value;
                if (grid.cells[i][j+1] != null) {
                    neighbourValue = grid.cells[i][j+1].value;
                }
                penalty += Math.abs(neighbourValue - cellValue);
            }
        }
    }
    //give a penalty if neighbour's value > the cell on the neighbour' top.
    for (var i = 0; i < size - 1; i++) {
        for (var j = 0; j < size - 1; j++) {
            var cellValue = 0;
            var neighbourValue = 0;
            if (grid.cells[j][i] != null) {
                cellValue = grid.cells[j][i].value;
                if (grid.cells[j][i+1] != null) {
                    neighbourValue = grid.cells[j][i+1].value;
                }
                penalty += Math.abs(neighbourValue - cellValue);
            }
        }
    }
    return score - penalty * 0.002;
};
