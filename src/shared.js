var SELECTED_PUZZLE_TYPE = "Squares";

var NODE_TYPE = {
    'NORMAL': 0,
    'START': 1,
    'REQUIRED': 2,
    'EXIT': 3,

    // Used in UI to loop around
    'LAST': 3
};

var EDGE_TYPE = {
    'NORMAL': 0,
    'REQUIRED': 1,
    'OBSTACLE': 2,

    // Used in UI to loop around
    'LAST': 2
};

var CELL_TYPE = {
    'NONE': 0,
    'SQUARE': 1,
    'TETRIS': 2,
    'TETRIS_ROTATED': 3,
    'SUN': 4,
    'CANCELLATION': 5,
    'TETRIS_HOLLOW': 6,
    'TRIANGLE': 7,
}

// Cycle through cells when you click behaviour
var PUZZLE_TYPES = {
    'Squares': [CELL_TYPE.NONE, CELL_TYPE.SQUARE],
    'Triangles': [CELL_TYPE.NONE, CELL_TYPE.TRIANGLE],
    'All': Object.values(CELL_TYPE)
}
// Drop-down default is Squares, so need to put Squares here
var CELL_TYPES_TO_CYCLE = PUZZLE_TYPES["Squares"]

function get_next_cell_type_in_cycle(current_type) {
    var current_stage_in_cycle = CELL_TYPES_TO_CYCLE.indexOf(current_type)
    var new_stage_in_cycle = current_stage_in_cycle + 1 % (CELL_TYPES_TO_CYCLE.length)
    return CELL_TYPES_TO_CYCLE[new_stage_in_cycle]
}


var BACKGROUND_COLOR = '#BBBBBB';
var BLACK = 0;
var WHITE = 1;
var GREEN = 2;
var PURPLE = 3;
var CELL_COLOR = {
    'BLACK': 0,
    'WHITE': 1,
    'GREEN': 2,
    'MAGENTA': 3,
    'YELLOW': 4,
    'RED': 5,
    'CYAN': 6,
    'BLUE': 7,
    'ORANGE': 8,

    'LAST': 8
};

var CELL_COLOR_STRINGS = [
    'black',
    'white',
    'green',
    'magenta',
    'yellow',
    'red',
    'cyan',
    'blue',
    'orange'
];

function getColorString(c) {
    return CELL_COLOR_STRINGS[c];
}

// Helpers
var ORIENTATION_TYPE = {
    'HOR': 0, // Horizontal
    'VER': 1  // Vertical
}

// Puzzle definition
var puzzle = {};

// Used for keeping track of visited points with a Set
// This requires that a given X,Y point is always the exact same JS object
var pointPool = [];

function point(x, y) {
    if (!pointPool[x]) pointPool[x] = [];
    if (!pointPool[x][y]) pointPool[x][y] = {x: x, y: y};

    return pointPool[x][y];
}

var edgePool = [];

// x and y are the left top point of a edge. ori is orientation
function edge(x, y, ori) {
    ori = ori == ORIENTATION_TYPE.HOR ? 0 : 1;
    if (!edgePool[x]) edgePool[x] = [];
    if (!edgePool[x][y]) edgePool[x][y] = {x: x, y: y};
    if (!edgePool[x][y][ori]) edgePool[x][y][ori] = {x: x, y: y, ori: ori};

    return edgePool[x][y][ori];
}

var cellPool = [];

function cell(x,y) {
    if (!cellPool[x]) cellPool[x] = [];
    if (!cellPool[x][y]) cellPool[x][y] = {x: x, y: y};

    return cellPool[x][y];
}

function create2DArray(w, h) {
    var arr = [];

    for (var x = 0; x < w; x++) {
        arr[x] = [];
        arr[x].length = h;
    }

    return arr;
}

// Set up default puzzle with all edges and no special nodes or cells
function initPuzzle(puzzle, width, height) {
    puzzle.width = width;
    puzzle.height = height;

    initNodes(puzzle);
    initCells(puzzle);
    initEdges(puzzle);

    // Update UI
    $('option[value="' + width + ',' + height + '"]').prop('selected', true);
    calculateMetrics();
}

function initNodes(puzzle) {
    puzzle.nodes = create2DArray(puzzle.width, puzzle.height);

    for (var x = 0; x < puzzle.width; x++) {
        for (var y = 0; y < puzzle.height; y++) {
            puzzle.nodes[x][y] = {type: NODE_TYPE.NORMAL};
        }
    }
}

function initEdges(puzzle) {
    puzzle.horEdges = create2DArray(puzzle.width - 1, puzzle.height);

    for (var x = 0; x < puzzle.width - 1; x++) {
        for (var y = 0; y < puzzle.height; y++) {
            puzzle.horEdges[x][y] = EDGE_TYPE.NORMAL;
        }
    }

    puzzle.verEdges = create2DArray(puzzle.width, puzzle.height - 1);

    for (var x = 0; x < puzzle.width; x++) {
        for (var y = 0; y < puzzle.height - 1; y++) {
            puzzle.verEdges[x][y] = EDGE_TYPE.NORMAL;
        }
    }
}

function initCells(puzzle) {
    puzzle.cells = create2DArray(puzzle.width - 1, puzzle.height - 1);

    for (var x = 0; x < puzzle.width - 1; x++) {
        for (var y = 0; y < puzzle.height - 1; y++) {
            puzzle.cells[x][y] = {type: CELL_TYPE.NONE, color: CELL_COLOR.BLACK};

            initTetrisLayout(puzzle, x, y);
            initTriangleProperties(puzzle, x, y);
        }
    }
}

function initTetrisLayout(puzzle, x, y) {
    puzzle.cells[x][y].tetris = create2DArray(4, 4);

    for (var xx = 0; xx < 4; xx++) {
        for (var yy = 0; yy < 4; yy++) {
            puzzle.cells[x][y].tetris[xx][yy] = xx < 2 && yy < 2;
        }
    }

    updateTetrisLayoutProperties(x, y);
}

// Recalculate the area and top-left anchor of the tetris layout in cell (x, y)
function updateTetrisLayoutProperties(x, y) {
    puzzle.cells[x][y].tetrisArea = 0;
    puzzle.cells[x][y].tetrisBounds = [Number.MAX_VALUE, Number.MAX_VALUE, 0, 0];

    for (var xx = 0; xx < 4; xx++) {
        for (var yy = 0; yy < 4; yy++) {
            puzzle.cells[x][y].tetrisArea += +puzzle.cells[x][y].tetris[xx][yy];

            // Extend bounds
            if (puzzle.cells[x][y].tetris[xx][yy]) {
                puzzle.cells[x][y].tetrisBounds[0] = Math.min(puzzle.cells[x][y].tetrisBounds[0], xx);
                puzzle.cells[x][y].tetrisBounds[1] = Math.min(puzzle.cells[x][y].tetrisBounds[1], yy);
                puzzle.cells[x][y].tetrisBounds[2] = Math.max(puzzle.cells[x][y].tetrisBounds[2], xx);
                puzzle.cells[x][y].tetrisBounds[3] = Math.max(puzzle.cells[x][y].tetrisBounds[3], yy);
            }
        }
    }
}

function initTriangleProperties(puzzle, x, y) {
    puzzle.cells[x][y].triangleNum = 1
}

function horEdgeExists(x, y) {
    if (x < 0 || y < 0 || x >= puzzle.width - 1 || y >= puzzle.height) return false;
    return puzzle.horEdges[x][y] != EDGE_TYPE.OBSTACLE;
}

function verEdgeExists(x, y) {
    if (x < 0 || y < 0 || x >= puzzle.width || y >= puzzle.height - 1) return false;
    return puzzle.verEdges[x][y] != EDGE_TYPE.OBSTACLE;
}

function isEntireTetrisGridOff(x, y) {
    var tetris = puzzle.cells[x][y].tetris;
    for (var xx = 0; xx < 4; xx ++) {
        for (var yy = 0; yy < 4; yy ++) {
            if (tetris[xx][yy]) {
                return false;
            }
        }
    }
    return true;
}

function powerSet(list) {
    var set = [],
        listSize = list.length,
        combinationsCount = (1 << listSize),
        combination;

    for (var i = 0; i < combinationsCount ; i++ ){
        var combination = [];
        for (var j=0;j<listSize;j++){
            if ((i & (1 << j))){
                combination.push(list[j]);
            }
        }
        set.push(combination);
    }
    return set;
}
