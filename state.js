(function() {
	window.state = {};

	state.NONE = 0;
	state.WHITE = 1;
	state.BLACK = 2;

	state.opositeColor = function(color) {
		return color == state.WHITE ? state.BLACK : state.WHITE;
	};

	state.moveError = {
		INVALID_TURN: 'This is not your turn.',
		CAPTURE_REQUIRED: 'You have to make the capture.',
		OCCUPIED_SQUARE: 'Square is already occupied.',
		INVALID_SQUARE: 'Invalid square.',
		KING_MOVE: 'Only king can move backwards.'
	};

	/**
	 * @class State
	 */
	var State = state.State = function() {
		this[state.WHITE] = [];
		this[state.BLACK] = [];

		this.colorMatrix = [];
		this.kingMatrix = [];

		this.move = {
			i0: 0,
			j0: 0,
			i: 0,
			j: 0
		};

		this.captureMoves = [];

		/**
		 * This shows which player should make the next move.
		 * @type {Number}
		 */
		this.turn = state.WHITE;

		this.search.debug = false;
	};


	State.copy = function(s) {
		var newState = new State();
		newState.turn = s.turn;
		var i, list, newList;

		list = s[state.WHITE];
		newList = newState[state.WHITE];
		for (i = 0; i < list.length; i++) {
			newList[i] = Man.copy(list[i]);
		}

		list = s[state.BLACK];
		newList = newState[state.BLACK];
		for (i = 0; i < list.length; i++) {
			newList[i] = Man.copy(list[i]);
		}

		list = s.colorMatrix;
		newList = newState.colorMatrix;
		for (i = 0; i < list.length; i++) {
			newList[i] = list[i];
		}


		list = s.kingMatrix;
		newList = newState.kingMatrix;
		for (i = 0; i < list.length; i++) {
			newList[i] = list[i];
		}

		return newState;
	};

	State.prototype.colorAt = function(i, j) {
		return this.colorMatrix[i * Board.dimension + j];
	};

	State.prototype.setColorAt = function(color, i, j) {
		this.colorMatrix[i * Board.dimension + j] = color;
	};

	State.prototype.isKingAt = function(i, j) {
		return this.kingMatrix[i * Board.dimension + j];
	};

	State.prototype.setKingAt = function(isKing, i, j) {
		this.kingMatrix[i * Board.dimension + j] = !!isKing;
	};


	State.prototype.manAt = function(color, i, j) {
		var list = this[color];
		for (var k = 0; k < list.length; k++) {
			if (list[k].i == i && list[k].j == j)
				return list[k];
		}
		return null;
	};

	State.prototype.setMove = function(move, isCapture) {
		this.move = move;
		var turn = this.colorAt(move.i0, move.j0);
		var man = this.manAt(turn, move.i0, move.j0);
		var isKing = this.isKingAt(move.i0, move.j0);

		man.i = move.i;
		man.j = move.j;
		this.setColorAt(state.NONE, move.i0, move.j0);
		this.setKingAt(false, move.i0, move.j0);
		this.setColorAt(turn, move.i, move.j);

		if (turn == state.WHITE && move.i == 0 && !isKing)
			isKing = true;
		if (turn == state.BLACK && move.i == (Board.dimension - 1) && !isKing)
			isKing = true;
		this.setKingAt(isKing, move.i, move.j);


		var oppositeColor = state.opositeColor(turn);
		if (isCapture) {
			var captureI = move.i0 + ((move.i - move.i0) / Math.abs(move.i - move.i0));
			var captureJ = move.j0 + ((move.j - move.j0) / Math.abs(move.j - move.j0));

			var manList = this[oppositeColor];
			this.setColorAt(state.NONE, captureI, captureJ);
			for (var k = 0; k < manList.length; k++) {
				if (manList[k].i == captureI && manList[k].j == captureJ) {
					manList.splice(k, 1);
					break;
				}
			}

			var manCaptureMoves = [];
			this.manCaptureMoves(man, manCaptureMoves);
			if (manCaptureMoves.length == 0) {
				this.turn = oppositeColor;
				this.generateCaptureMoves();
			} else {
				this.captureMoves = manCaptureMoves;
			}
		} else {
			this.turn = oppositeColor;
			this.generateCaptureMoves();
		}
	};

	State.prototype.expand = function() {
		var stateList = [];
		var s;
		if (this.captureMoves.length > 0) {
			for (var k = 0; k < this.captureMoves.length; k++) {
				s = State.copy(this);
				s.setMove(this.captureMoves[k], true);
				stateList.push(s);
			}
		} else {
			var possibleMoves = this.getPossibleMoves();
			for (var k = 0; k < possibleMoves.length; k++) {
				s = State.copy(this);
				s.setMove(possibleMoves[k], false);
				stateList.push(s);
			}
		}
		return stateList;
	};

	State.prototype.getPossibleMoves = function() {
		var manList = this[this.turn];
		var moveList = [];
		for (var k = 0; k < manList.length; k++) {
			var di = this.turn == state.WHITE ? -1 : 1;
			var man = manList[k];
			var i0 = man.i;
			var j0 = man.j;
			var i = i0 + di;
			if (i >= 0 && i < Board.dimension) {
				var j = j0 + 1;
				if (j >= 0 && j < Board.dimension && this.colorAt(i, j) == state.NONE) {
					moveList.push({
						i0: i0,
						j0: j0,
						i: i,
						j: j
					});
				}
				j = j0 - 1;
				if (j >= 0 && j < Board.dimension && this.colorAt(i, j) == state.NONE) {
					moveList.push({
						i0: i0,
						j0: j0,
						i: i,
						j: j
					});
				}
			}

			var isKing = this.isKingAt(i0, j0);
			if (isKing) {
				di *= -1;
				i = i0 + di;
				if (i >= 0 && i < Board.dimension) {
					var j = j0 + 1;
					if (j >= 0 && j < Board.dimension && this.colorAt(i, j) == state.NONE) {
						moveList.push({
							i0: i0,
							j0: j0,
							i: i,
							j: j
						});
					}
					j = j0 - 1;
					if (j >= 0 && j < Board.dimension && this.colorAt(i, j) == state.NONE) {
						moveList.push({
							i0: i0,
							j0: j0,
							i: i,
							j: j
						});
					}
				}
			}
		}
		return moveList;
	};

	State.prototype.getMoveObject = function(i0, j0, i, j) {
		var color = this.colorAt(i0, j0);

		/* If it's not the correct turn */
		if (this.turn != color)
			return 'INVALID_TURN';

		/* If there's capture move */
		if (this.captureMoves.length > 0) {
			for (var k = 0; k < this.captureMoves.length; k++) {
				var cm = this.captureMoves[k];
				if (cm.i0 == i0 && cm.j0 == j0 && cm.i == i && cm.j == j) {
					return {isCapture: true};
				}
			}
			return 'CAPTURE_REQUIRED';//If this is not the capture move
		}

		/* If box is filled */
		if (this.colorAt(i, j) != state.NONE)
			return 'OCCUPIED_SQUARE';

		/* If the move crosses the edge */
		if (i < 0 || i >= Board.dimension || j < 0 || j >= Board.dimension)
			return 'INVALID_SQUARE';

		var di = i - i0;
		var dj = j - j0;
		var absDi = Math.abs(di);
		var absDj = Math.abs(dj);
		if (absDi != 1 || absDj != 1)
			return 'INVALID_SQUARE';
		if (color == state.WHITE) {
			di *= -1;
		}
		var isKing = this.isKingAt(i0, j0);
		if (!isKing && di < 0)
			return 'KING_MOVE';

		return {isCapture: false};
	};

	State.prototype.manCaptureMoves = function(man, captureMoves) {
		var i0 = man.i;
		var j0 = man.j;
		var manColor = this.colorAt(i0, j0);
		var di = this.turn == state.WHITE ? -1 : 1;
		var jumpJ;
		var jumpI = i0 + di * 2;
		var jumpColor;
		var targetColor;

		if (jumpI >= 0 && jumpI < Board.dimension) {
			jumpJ = j0 - 2;
			jumpColor = this.colorAt(jumpI, jumpJ);
			if (jumpJ >= 0 && jumpJ < Board.dimension && jumpColor == state.NONE) {
				targetColor = this.colorAt(jumpI - di, jumpJ + 1);
				if (targetColor && targetColor != manColor) {
					captureMoves.push({
						i0: i0,
						j0: j0,
						i: jumpI,
						j: jumpJ
					});
				}
			}

			jumpJ = j0 + 2;
			jumpColor = this.colorAt(jumpI, jumpJ);
			if (jumpJ >= 0 && jumpJ < Board.dimension && jumpColor == state.NONE) {
				targetColor = this.colorAt(jumpI - di, jumpJ - 1);
				if (targetColor && targetColor != manColor) {
					captureMoves.push({
						i0: i0,
						j0: j0,
						i: jumpI,
						j: jumpJ
					});
				}
			}
		}

		var isKing = this.isKingAt(i0, j0);
		if(!isKing && !Board.options.canCaptureBackwards) return;
		if(!Board.options.kingCanCaptureBackwards) return;

		di *= -1;
		jumpI = i0 + di * 2;

		if (jumpI >= 0 && jumpI < Board.dimension) {
			jumpJ = j0 - 2;
			jumpColor = this.colorAt(jumpI, jumpJ);
			if (jumpJ >= 0 && jumpJ < Board.dimension && jumpColor == state.NONE) {
				targetColor = this.colorAt(jumpI - di, jumpJ + 1);
				if (targetColor && targetColor != manColor) {
					captureMoves.push({
						i0: i0,
						j0: j0,
						i: jumpI,
						j: jumpJ
					});
				}
			}

			jumpJ = j0 + 2;
			jumpColor = this.colorAt(jumpI, jumpJ);
			if (jumpJ >= 0 && jumpJ < Board.dimension && jumpColor == state.NONE) {
				targetColor = this.colorAt(jumpI - di, jumpJ - 1);
				if (targetColor && targetColor != manColor) {
					captureMoves.push({
						i0: i0,
						j0: j0,
						i: jumpI,
						j: jumpJ
					});
				}
			}
		}
	};

	State.prototype.generateCaptureMoves = function() {
		this.captureMoves = [];
		var manList = this[this.turn];
		for (var i = 0; i < manList.length; i++) {
			this.manCaptureMoves(manList[i], this.captureMoves);
		}
	};

	State.prototype.getScore = function(myColor) {
		return {
			isOk: this[myColor].length > 0,
			points: this[myColor].length - this[state.opositeColor(myColor)].length
		};
	};

	State.prototype.searchEngine = function(myColor, level, limit, closedSet) {
		if (level == limit) {
			return this.getScore(myColor);
		}
		level++;

		var stateList = this.expand();
		if (stateList.length == 0) {
			return this.getScore(myColor);
		}

		var count = 0;
		var score = {
			isOk: this.turn == myColor ? false : true,
			points: 0
		};
		for (var i = 0; i < stateList.length; i++) {
			var s = stateList[i];
			for (var k = 0; k < closedSet.length; k++) {
				if (closedSet[k].equals(s))
					break;
			}
			if (k < closedSet.length)
				continue;

			count++;
			closedSet.push(s);
			var localScore = s.searchEngine(myColor, level, limit, closedSet);

			score.points += localScore.points;

			if (this.turn == myColor) { //If it's my turn!
				score.isOk = score.isOk || localScore.isOk;
			} else { //If it's my opponent's turn...
				score.isOk = score.isOk && localScore.isOk;
			}
		}
		if (count != 0) {
			score.points /= count;
		} else {
			score = this.getScore(myColor);
		}
		return score;
	};
	/**
	 * Looks for the best next state
	 * @returns {State}
	 */
	State.prototype.search = function(limit) {
		var t = new Date().getTime();
		var stateList = this.expand();
		if (stateList.length == 0)
			return null;
		var closedSet = [];
		var myColor = this.turn;
		var options = [];
		for (var i = 0; i < stateList.length; i++) {
			var s = stateList[i];
			var option = {
				state: s,
				score: s.searchEngine(myColor, 0, limit, closedSet)
			};
			options.push(option);
		}
		options.sort(function(a, b) {
			if (a.score.isOk == b.score.isOk) {
				return b.score.points - a.score.points;
			}
			if (a.score.isOk)
				return -1;
			return 1;
		});

		t = new Date().getTime() - t;

		if (options.length > 0) {
			option = options[0];
			option.time = t;
			return options[0].state;
		} else {
			return null;
		}
	};

	State.prototype.equals = function(s) {
		var d = Board.dimension * Board.dimension;
		for (var i = 0; i < d; i++) {
			if (s.colorMatrix[i] != this.colorMatrix[i])
				return false;
			if (s.kingMatrix[i] != this.kingMatrix[i])
				return false;
		}
		return true;
	};

	State.prototype.toString = function() {
		var output = "";
		for (var i = 0; i < Board.dimension; i++) {
			output += "|";
			for (var j = 0; j < Board.dimension; j++) {

				output += State.prototype.toString.characters[this.isKingAt(i, j)] + State.prototype.toString.characters[this.colorAt(i, j)];
			}
			output += "\n";
		}
		return output;
	};
	State.prototype.toString.characters = {};
	State.prototype.toString.characters[state.NONE] = " |";
	State.prototype.toString.characters[state.WHITE] = "W|";
	State.prototype.toString.characters[state.BLACK] = "B|";
	State.prototype.toString.characters[true] = "k";
	State.prototype.toString.characters[false] = " ";


	/**
	 * @class State.Man
	 */
	var Man = state.Man = function() {
		this.i = 0;
		this.j = 0;
	};

	Man.copy = function(man) {
		var newMan = new Man();
		newMan.i = man.i;
		newMan.j = man.j;
		return newMan;
	};

})();