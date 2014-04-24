(function($){
	
$(document).ready(function(){
	Board = {};
	
	var console = window.console || {
		warn : function(){},
		info : function(){}
	};
	
	var container = $('#board');
	var resetingBoard = false;
	Board.dimension = parseInt(container.attr('data-dimension'));
	Board.menCount = (Board.dimension/2)*((Board.dimension-2)/2);
	Board.options = {
		canCaptureBackwards : true,
		kingCanCaptureBackwards : true
	};
	Board.men = [];
	Board.boxes = [];
	Board.state = new state.State();
	
	function capture(captureI, captureJ){
		var targetMan = Board.manAt(captureI, captureJ);
		Board.men[captureI*Board.dimension + captureJ] = null;
		targetMan.element.detach();
	}

	Board.move = function(i, j, man){
		
		if(!resetingBoard){
			var i0 = man.position.i;
			var j0 = man.position.j;
			
			var moveObj = Board.state.getMoveObject(i0, j0, i, j);
			if(typeof moveObj == "string"){
				var message = state.moveError[moveObj];
				console.warn(message);
				if(typeof Board.onInvalidMove == 'function'){
					Board.onInvalidMove(message);
				}
				return false;
			}
			if(moveObj.isCapture){ //If the game has capture moves
				var captureI = i0 +((i-i0)/Math.abs(i-i0));
				var captureJ = j0 +((j-j0)/Math.abs(j-j0));
				capture(captureI, captureJ);
			}
			
			this.men[i0*this.dimension + j0] = null;
		}
		
		
		this.men[i*this.dimension + j] = man;
		Board.boxAt(i, j).append(man.element);
		man.position.i = i;
		man.position.j = j;
		
		
		if(!resetingBoard){
			if(Board.state.turn == state.WHITE && i == 0 && !man.isKing) man.setKing(true);
			if(Board.state.turn == state.BLACK && i == (Board.dimension-1) && !man.isKing) man.setKing(true);
			
			Board.state.setMove({i0:i0, j0:j0, i:i, j:j}, moveObj.isCapture);
			
			if(typeof Board.onMove == 'function') Board.onMove();
		}
		return true;
	};
	Board.manAt = function(i, j){
		return this.men[i*this.dimension + j];
	};
	Board.boxAt = function(i, j){
		return this.boxes[i*this.dimension + j];
	};
	Board.reset = function(){
		resetingBoard = true;
		
		Board.state = new state.State();
		
		var d = Board.dimension*Board.dimension;
		var i;
		for(i = 0; i<d; i++){
			this.men[i] = null;
		}
		
		Board.state[state.WHITE] = [];
		Board.state[state.BLACK] = [];
		
		d = Board.dimension / 2;
		for(i = 0; i<Board.menCount; i++){
			var mi = Math.floor(i / d);
			var mjw = 2*(i % d);
			var mj = mjw+1;
			if(mi % 2 == 1) {
				mjw++;
				mj--;
			}
			
			
			recycler.allMen.black[i].setKing(false);
			recycler.allMen.white[i].setKing(false);
			
			recycler.allMen.black[i].moveTo(mi, mj);
			recycler.allMen.white[i].moveTo(Board.dimension -1 -mi, mjw);
			
			var man = new state.Man();
			man.i = recycler.allMen.black[i].position.i;
			man.j = recycler.allMen.black[i].position.j;
			Board.state[state.BLACK].push(man);
			
			man = new state.Man();
			man.i = recycler.allMen.white[i].position.i;
			man.j = recycler.allMen.white[i].position.j;
			Board.state[state.WHITE].push(man);
			
		}
		
		Board.state.turn = state.WHITE;
		d = Board.dimension*Board.dimension;
		for(i = 0; i<d; i++){
			
			if(this.men[i]){
				this.state.colorMatrix[i] = this.men[i].color;
			}else{
				this.state.colorMatrix[i] = state.NONE;
			}
			this.state.kingMatrix[i] = false;
		}
		resetingBoard = false;
	};
	Board.playerType = {};
	Board.playerType[state.WHITE] = 'human';
	Board.playerType[state.BLACK] = 'computer';
	
	Board.playerDifficulty = {};
	Board.playerDifficulty[state.WHITE] = 1;
	Board.playerDifficulty[state.BLACK] = 1;
	
	
	function boxClick(evt){
		if(Board.playerType[Board.state.turn] == 'computer') return;
		var i = evt.data.i, j = evt.data.j;
		var man = Board.manAt(i, j);
		if(!man){
			if(boxClick.currentMan){
				if(boxClick.currentMan.moveTo(i,j)){
					boxClick.currentMan = null;
					boxClick.currenBox.removeAttr('data-selected');
					boxClick.currenBox = null;
				}
			}
		}else{
			if(man.color == Board.state.turn){
				if(boxClick.currenBox){
					boxClick.currenBox.removeAttr('data-selected');
				}
				boxClick.currentMan = man;
				boxClick.currenBox = $(this);
				boxClick.currenBox.attr('data-selected', Board.state.turn == state.WHITE ? 'white' : 'black');
			}
		}
	}
	boxClick.currentMan = null;
	boxClick.currenBox = null;
		
	var recycler = {
		allMen : {
			white : [],
			black : []
		}
	};
	
	function Man(color){
		this.element = $('<div class="Checkers-Man"><div class="Checkers-KingTag"></div></div>');
		this.color = color;
		this.element.attr('data-color', color == state.WHITE ? 'white' : 'black');
		this.position = {
			i : 0,
			j : 0
		};
		this.king = false;
	}
	Man.prototype.moveTo = function(i, j){
		return Board.move(i, j, this);
	};
	Man.prototype.setKing = function(isKing){
		this.king == !!isKing;
		if(isKing) this.element.attr('data-king', 1);
		else this.element.removeAttr('data-king');
	};
	
	//Creating all the men necessary
	(function(){
		for(var i = 0; i<Board.menCount; i++){
			var w = new Man(state.WHITE);
			var b = new Man(state.BLACK);
			recycler.allMen.white.push(w);
			recycler.allMen.black.push(b);
		}
	})();
	
	//Creating board boxes
	(function(){
		var d = Board.dimension;
		for(var i = 0; i<d; i++){
			var $row = $('<div class="Checkers-Row"></div>');
			container.append($row);
			for(var j = 0; j<d; j++){
				var $box = $('<div class="Checkers-Box" data-color="' + ((i+j) % 2 == 1 ? 'black' : 'white') + '"></div>');
				$row.append($box);
				$box.bind('click', {i:i, j:j}, boxClick);
				Board.boxes[i*d + j] = $box;
				Board.men[i*d + j] = null;
			}
		}
	})();
	
	Board.reset();
	
	function computerMove(){
		var newState = Board.state.search(Board.playerDifficulty[Board.state.turn]);
		console.info(newState);
		console.info(newState.toString());
		Board.move(newState.move.i, newState.move.j, Board.manAt(newState.move.i0, newState.move.j0));
	}
	
	Board.onMove = function (){
		clearTimeout(Board.onMove.moveTimeoutId);
		
		if(typeof Board.onTurnEnd == 'function'){
			Board.onTurnEnd(state.opositeColor(Board.state.turn));
		}
		
		
		if(Board.state.getPossibleMoves().length == 0 && Board.state.captureMoves.length == 0){
			if(typeof Board.onFinish == 'function'){
				Board.onFinish(state.opositeColor(Board.state.turn));
			}
			return;
		}
		
		if(typeof Board.onTurnStart == 'function'){
			Board.onTurnStart(Board.state.turn);
		}
		
		if(Board.playerType[Board.state.turn] == 'computer'){
			Board.onMove.moveTimeoutId = setTimeout(computerMove, 500);
		}
	};
	Board.onMove.moveTimeoutId = null;
	
	Board.onFinish = null;
	
	Board.onTurnStart = null;
	
	Board.onTurnEnd = null;
	
	Board.onInvalidMove = null;
});

})(jQuery);